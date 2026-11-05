import { consumeEmailCode, issueEmailCode, serviceClient } from '../_shared/db.ts';
import { isValidEmail, normalizeEmail } from '../_shared/codes.ts';
import { fail, failLogged, logFail, MSG, ok, preflight } from '../_shared/http.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'POST') return fail(MSG.generic, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    const db = serviceClient();

    if (action === 'send') {
      const email = normalizeEmail(body?.email || '');
      if (!isValidEmail(email)) return fail(MSG.invalidEmail);

      const { data: profile, error } = await db
        .from('profiles')
        .select('id, email')
        .eq('email', email)
        .not('email_verified_at', 'is', null)
        .maybeSingle();
      if (error) return failLogged('email-login.send.lookup', error);
      if (!profile?.id) return fail(MSG.noAccountEmail);

      const issued = await issueEmailCode(db, {
        email,
        purpose: 'login',
        userId: profile.id,
      });
      if (issued instanceof Response) return issued;
      return ok({ message: 'We sent a code to your email.' });
    }

    if (action === 'verify') {
      const email = normalizeEmail(body?.email || '');
      const code = String(body?.code || '').replace(/\D/g, '');
      if (!isValidEmail(email)) return fail(MSG.invalidEmail);
      if (code.length !== 6) return fail(MSG.needCode);

      const { data: profile, error } = await db
        .from('profiles')
        .select('id, email')
        .eq('email', email)
        .not('email_verified_at', 'is', null)
        .maybeSingle();
      if (error) return failLogged('email-login.verify.lookup', error);
      if (!profile?.id) return fail(MSG.codeWrong);

      const consumed = await consumeEmailCode(db, {
        email,
        purpose: 'login',
        code,
        userId: profile.id,
      });
      if (consumed instanceof Response) return consumed;

      const { error: authErr } = await db.auth.admin.updateUserById(profile.id, {
        email: profile.email,
        email_confirm: true,
      });
      if (authErr && !/already/i.test(authErr.message || '')) {
        return failLogged('email-login.verify.auth-email', authErr);
      }

      const { data: linkData, error: linkErr } = await db.auth.admin.generateLink({
        type: 'magiclink',
        email: profile.email,
      });
      if (linkErr) return failLogged('email-login.verify.generateLink', linkErr);

      const props = linkData?.properties as {
        hashed_token?: string;
        verification_type?: string;
      } | undefined;
      const tokenHash = props?.hashed_token;
      if (!tokenHash) {
        logFail('email-login.verify.no-token');
        return fail(MSG.generic, 500);
      }

      return ok({
        token_hash: tokenHash,
        type: props?.verification_type || 'magiclink',
      });
    }

    return fail(MSG.generic);
  } catch (err) {
    return failLogged('email-login.unhandled', err);
  }
});
