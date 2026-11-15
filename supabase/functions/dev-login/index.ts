// Dev-only phone login. Returns a one-time magic-link token for an EXISTING
// account so a __DEV__ build can log in without SMS. Never creates a user.
//
// Hard-gated by isAuthDevBypass(): AUTH_DEV_BYPASS=true AND SUPABASE_URL is the
// allow-listed project ref. On any other project, or when the secret is unset,
// every request is a 404 — the endpoint does not exist.
import { serviceClient } from '../_shared/db.ts';
import { isAuthDevBypass, logDevBypass } from '../_shared/devBypass.ts';
import { fail, failLogged, logFail, MSG, ok, preflight } from '../_shared/http.ts';
import { normalizeAuPhone } from '../_shared/phone.ts';
import { clientIp, rateLimitAuthChecks } from '../_shared/rateLimit.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight();
  if (!isAuthDevBypass()) return fail(MSG.generic, 404);
  if (req.method !== 'POST') return fail(MSG.generic, 405);

  try {
    const db = serviceClient();
    const limited = await rateLimitAuthChecks(db, clientIp(req));
    if (limited) return limited;

    const body = await req.json().catch(() => ({}));
    const phone = normalizeAuPhone(String(body?.phone || ''));
    if (!phone) return fail(MSG.invalidPhone);

    // Same source of truth as account-lookup: profiles.phone in +614XXXXXXXX form.
    // If a number is on more than one profile (legacy dev data), prefer the newest.
    const { data: profile, error: lookupErr } = await db
      .from('profiles')
      .select('id, email')
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lookupErr) return failLogged('dev-login.lookup', lookupErr);
    if (!profile?.id) return fail(MSG.noAccountPhone, 404);

    logDevBypass('dev-login');

    const { data: userData, error: userErr } = await db.auth.admin.getUserById(profile.id);
    if (userErr) return failLogged('dev-login.getUser', userErr);
    const authUser = userData?.user;
    if (!authUser) return fail(MSG.noAccountPhone, 404);

    // generateLink needs an email on auth.users. Real-SMS accounts have none, so
    // give them a confirmed placeholder (same approach email-login uses). A later
    // verified recovery email replaces it.
    let email = authUser.email || '';
    if (!email) {
      email = `dev-login+${authUser.id}@chautari.invalid`;
      const { error: setErr } = await db.auth.admin.updateUserById(authUser.id, {
        email,
        email_confirm: true,
      });
      if (setErr) return failLogged('dev-login.placeholder-email', setErr);
    }

    const { data: linkData, error: linkErr } = await db.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });
    if (linkErr) return failLogged('dev-login.generateLink', linkErr);

    const props = linkData?.properties as {
      hashed_token?: string;
      verification_type?: string;
    } | undefined;
    const tokenHash = props?.hashed_token;
    if (!tokenHash) {
      logFail('dev-login.no-token');
      return fail(MSG.generic, 500);
    }

    return ok({
      user_id: authUser.id,
      token_hash: tokenHash,
      type: props?.verification_type || 'magiclink',
    });
  } catch (err) {
    return failLogged('dev-login.unhandled', err);
  }
});
