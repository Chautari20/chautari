import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  consumeEmailCode,
  createRecoverySession,
  issueEmailCode,
  serviceClient,
} from '../_shared/db.ts';
import { isValidEmail, maskEmail, normalizeEmail } from '../_shared/codes.ts';
import { fail, failLogged, MSG, ok, preflight } from '../_shared/http.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'POST') return fail(MSG.generic, 405);

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const url = Deno.env.get('SUPABASE_URL');
    const anon = Deno.env.get('SUPABASE_ANON_KEY');
    if (!url || !anon || !authHeader) return fail(MSG.unauthorized, 401);

    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    const user = userData?.user;
    if (userErr || !user) return fail(MSG.unauthorized, 401);

    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    const db = serviceClient();

    if (action === 'status') {
      const { data: profile } = await db
        .from('profiles')
        .select('email, email_verified_at')
        .eq('id', user.id)
        .maybeSingle();
      return ok({
        emailMasked: profile?.email ? maskEmail(profile.email) : '',
        email_verified_at: profile?.email_verified_at || null,
        verified: !!profile?.email_verified_at,
      });
    }

    if (action === 'send') {
      const purpose = body?.purpose;
      if (purpose === 'change_phone') {
        const { data: profile } = await db
          .from('profiles')
          .select('email, email_verified_at')
          .eq('id', user.id)
          .maybeSingle();
        if (!profile?.email || !profile.email_verified_at) return fail(MSG.noRecoveryEmail);
        const issued = await issueEmailCode(db, {
          email: profile.email,
          purpose: 'change_phone',
          userId: user.id,
        });
        if (issued instanceof Response) return issued;
        return ok({ message: 'We sent a code to your recovery email.' });
      }

      if (purpose !== 'verify_email') return fail(MSG.generic);
      const email = normalizeEmail(body?.email || '');
      if (!isValidEmail(email)) return fail(MSG.invalidEmail);

      const { data: taken } = await db
        .from('profiles')
        .select('id')
        .eq('email', email)
        .not('email_verified_at', 'is', null)
        .neq('id', user.id)
        .maybeSingle();
      if (taken) return fail(MSG.emailTaken);

      const issued = await issueEmailCode(db, {
        email,
        purpose: 'verify_email',
        userId: user.id,
      });
      if (issued instanceof Response) return issued;
      return ok({ message: 'We sent a code to your email.' });
    }

    if (action === 'verify') {
      const purpose = body?.purpose;
      const code = String(body?.code || '').replace(/\D/g, '');
      if (code.length !== 6) return fail(MSG.needCode);

      if (purpose === 'change_phone') {
        const { data: profile } = await db
          .from('profiles')
          .select('email')
          .eq('id', user.id)
          .maybeSingle();
        if (!profile?.email) return fail(MSG.noRecoveryEmail);
        const consumed = await consumeEmailCode(db, {
          email: profile.email,
          purpose: 'change_phone',
          code,
          userId: user.id,
        });
        if (consumed instanceof Response) return consumed;
        const session = await createRecoverySession(db, user.id);
        if (session instanceof Response) return session;
        return ok({ token: session.token });
      }

      if (purpose !== 'verify_email') return fail(MSG.generic);
      const email = normalizeEmail(body?.email || '');
      if (!isValidEmail(email)) return fail(MSG.invalidEmail);

      const consumed = await consumeEmailCode(db, {
        email,
        purpose: 'verify_email',
        code,
        userId: user.id,
      });
      if (consumed instanceof Response) return consumed;

      const { error: updateErr } = await db
        .from('profiles')
        .update({ email, email_verified_at: new Date().toISOString() })
        .eq('id', user.id);
      if (updateErr) {
        if (updateErr.code === '23505') return fail(MSG.emailTaken);
        return failLogged('email-verification.verify_email.update', updateErr);
      }

      const { error: authErr } = await db.auth.admin.updateUserById(user.id, {
        email,
        email_confirm: true,
      });
      if (authErr) {
        if (/already/i.test(authErr.message || '')) return fail(MSG.emailTaken);
        return failLogged('email-verification.verify_email.auth', authErr);
      }
      return ok({ verified: true });
    }

    return fail(MSG.generic);
  } catch (err) {
    return failLogged('email-verification.unhandled', err);
  }
});
