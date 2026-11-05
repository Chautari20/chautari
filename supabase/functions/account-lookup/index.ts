import { serviceClient } from '../_shared/db.ts';
import { isValidEmail, normalizeEmail } from '../_shared/codes.ts';
import { fail, failLogged, MSG, ok, preflight } from '../_shared/http.ts';
import { normalizeAuPhone } from '../_shared/phone.ts';
import { clientIp, rateLimitAuthChecks } from '../_shared/rateLimit.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return preflight();
  if (req.method !== 'POST') return fail(MSG.generic, 405);

  try {
    const db = serviceClient();
    const limited = await rateLimitAuthChecks(db, clientIp(req));
    if (limited) return limited;

    const body = await req.json().catch(() => ({}));
    const phoneRaw = body?.phone;
    const emailRaw = body?.email;

    if (phoneRaw) {
      const phone = normalizeAuPhone(String(phoneRaw));
      if (!phone) return fail(MSG.invalidPhone);
      const { data, error } = await db
        .from('profiles')
        .select('id')
        .eq('phone', phone)
        .limit(1)
        .maybeSingle();
      if (error) return failLogged('account-lookup.phone', error);
      return ok({ exists: !!data?.id });
    }

    if (emailRaw) {
      const email = normalizeEmail(String(emailRaw));
      if (!isValidEmail(email)) return fail(MSG.invalidEmail);
      const { data, error } = await db
        .from('profiles')
        .select('id')
        .eq('email', email)
        .not('email_verified_at', 'is', null)
        .limit(1)
        .maybeSingle();
      if (error) return failLogged('account-lookup.email', error);
      return ok({ exists: !!data?.id });
    }

    return fail(MSG.generic);
  } catch (err) {
    return failLogged('account-lookup.unhandled', err);
  }
});
