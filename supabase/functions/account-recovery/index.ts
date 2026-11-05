import {
  consumeEmailCode,
  createRecoverySession,
  issueEmailCode,
  loadRecoverySession,
  serviceClient,
} from '../_shared/db.ts';
import { isValidEmail, normalizeEmail } from '../_shared/codes.ts';
import { sendPhoneChangedNotice } from '../_shared/email.ts';
import { fail, failLogged, logFail, MSG, ok, preflight } from '../_shared/http.ts';
import { normalizeAuPhone } from '../_shared/phone.ts';
import { checkSmsVerification, startSmsVerification } from '../_shared/twilio.ts';

const SAME = MSG.recoverySame;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'POST') return fail(MSG.generic, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    const db = serviceClient();

    if (action === 'start') {
      const email = normalizeEmail(body?.email || '');
      if (isValidEmail(email)) {
        const { data: profile } = await db
          .from('profiles')
          .select('id')
          .eq('email', email)
          .not('email_verified_at', 'is', null)
          .maybeSingle();
        if (profile?.id) {
          const issued = await issueEmailCode(db, {
            email,
            purpose: 'recovery',
            userId: profile.id,
          });
          if (issued instanceof Response) {
            // Still hide whether the account exists when rate-limited.
            return ok({ message: SAME });
          }
        }
      }
      return ok({ message: SAME });
    }

    if (action === 'verify_email') {
      const email = normalizeEmail(body?.email || '');
      const code = String(body?.code || '').replace(/\D/g, '');
      if (!isValidEmail(email) || code.length !== 6) return fail(MSG.codeWrong);
      const consumed = await consumeEmailCode(db, {
        email,
        purpose: 'recovery',
        code,
      });
      if (consumed instanceof Response) return consumed;
      if (!consumed.row.user_id) return fail(MSG.codeWrong);
      const session = await createRecoverySession(db, consumed.row.user_id);
      if (session instanceof Response) return session;
      return ok({ token: session.token });
    }

    if (action === 'send_phone_code') {
      const token = String(body?.token || '');
      const phone = normalizeAuPhone(body?.newPhone || '');
      if (!token) return fail(MSG.invalidToken);
      if (!phone) return fail(MSG.invalidPhone);

      const session = await loadRecoverySession(db, token);
      if (!session) return fail(MSG.invalidToken);

      const { data: taken } = await db
        .from('profiles')
        .select('id')
        .eq('phone', phone)
        .neq('id', session.user_id)
        .maybeSingle();
      if (taken) return fail(MSG.phoneTaken);

      try {
        await startSmsVerification(phone);
      } catch (err) {
        return failLogged('account-recovery.send_phone_code.twilio', err);
      }

      const { error } = await db
        .from('recovery_sessions')
        .update({ new_phone: phone })
        .eq('id', session.id);
      if (error) return failLogged('account-recovery.send_phone_code.session', error);
      return ok({ message: 'We sent a code to your new number.' });
    }

    if (action === 'complete') {
      const token = String(body?.token || '');
      const code = String(body?.code || '').replace(/\D/g, '');
      if (!token) return fail(MSG.invalidToken);
      if (code.length !== 6) return fail(MSG.needCode);

      const session = await loadRecoverySession(db, token);
      if (!session?.new_phone) return fail(MSG.invalidToken);

      let approved = false;
      try {
        approved = await checkSmsVerification(session.new_phone, code);
      } catch (err) {
        return failLogged('account-recovery.complete.twilio', err);
      }
      if (!approved) return fail(MSG.codeWrong);

      const { error: authErr } = await db.auth.admin.updateUserById(session.user_id, {
        phone: session.new_phone,
        phone_confirm: true,
      });
      if (authErr) {
        logFail('account-recovery.complete.auth', authErr);
        return fail(MSG.phoneTaken);
      }

      const { data: profile } = await db
        .from('profiles')
        .select('email')
        .eq('id', session.user_id)
        .maybeSingle();

      const { error: profileErr } = await db
        .from('profiles')
        .update({ phone: session.new_phone })
        .eq('id', session.user_id);
      if (profileErr) return failLogged('account-recovery.complete.profile', profileErr);

      await db
        .from('recovery_sessions')
        .update({ consumed_at: new Date().toISOString() })
        .eq('id', session.id);

      if (profile?.email) {
        try {
          await sendPhoneChangedNotice(profile.email);
        } catch (err) {
          logFail('account-recovery.complete.notice', err);
        }
      }

      return ok({ phone: session.new_phone });
    }

    return fail(MSG.generic);
  } catch (err) {
    return failLogged('account-recovery.unhandled', err);
  }
});
