import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import {
  CODE_TTL_MS,
  MAX_ATTEMPTS,
  TOKEN_TTL_MS,
  generateSixDigitCode,
  generateToken,
  hashSecret,
  isExpired,
  attemptsExceeded,
  tooManySends,
  timingSafeEqual,
} from './codes.ts';
import { resolveOutboundCode, sendCodeEmail } from './email.ts';
import { fail, failLogged, logFail, MSG } from './http.ts';
import { isAuthDevBypass, logDevBypass } from './devBypass.ts';

export type Purpose = 'verify_email' | 'recovery' | 'change_phone' | 'login';

export function serviceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('supabase_unconfigured');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function pepper(): string {
  const value = Deno.env.get('CODE_PEPPER');
  if (!value) throw new Error('pepper_unconfigured');
  return value;
}

export function testMode(): boolean {
  return Deno.env.get('EMAIL_TEST_MODE') === 'true';
}

export async function issueEmailCode(
  db: SupabaseClient,
  opts: { email: string; purpose: Purpose; userId?: string | null },
): Promise<Response | { ok: true }> {
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error: countErr } = await db
    .from('email_codes')
    .select('id', { count: 'exact', head: true })
    .eq('email', opts.email)
    .gte('created_at', hourAgo);
  if (countErr) return failLogged('issueEmailCode.count', countErr);
  if (tooManySends(count ?? 0)) return fail(MSG.tooManySends);

  const generated = generateSixDigitCode();
  const outbound = resolveOutboundCode(opts.email, generated, testMode());
  const codeHash = await hashSecret(outbound.code, pepper());

  await db
    .from('email_codes')
    .update({ consumed_at: new Date().toISOString() })
    .eq('email', opts.email)
    .eq('purpose', opts.purpose)
    .is('consumed_at', null);

  const { error: insertErr } = await db.from('email_codes').insert({
    user_id: opts.userId || null,
    email: opts.email,
    purpose: opts.purpose,
    code_hash: codeHash,
    expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
  });
  if (insertErr) return failLogged('issueEmailCode.insert', insertErr);

  const bypass = isAuthDevBypass();
  if (bypass) logDevBypass(`issueEmailCode.${opts.purpose}`);
  if (outbound.send && !bypass) {
    try {
      await sendCodeEmail(opts.email, outbound.code);
    } catch (err) {
      return failLogged('issueEmailCode.send', err);
    }
  }
  return { ok: true };
}

export async function consumeEmailCode(
  db: SupabaseClient,
  opts: { email: string; purpose: Purpose; code: string; userId?: string | null },
): Promise<Response | { row: { id: string; user_id: string | null } }> {
  if (isAuthDevBypass() && /^\d{6}$/.test(opts.code)) {
    logDevBypass(`consumeEmailCode.${opts.purpose}`);
    return { row: { id: 'bypass', user_id: opts.userId || null } };
  }

  let q = db
    .from('email_codes')
    .select('id, user_id, code_hash, expires_at, attempts, consumed_at')
    .eq('email', opts.email)
    .eq('purpose', opts.purpose)
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1);
  if (opts.userId) q = q.eq('user_id', opts.userId);

  const { data, error } = await q.maybeSingle();
  if (error) return failLogged('consumeEmailCode.lookup', error);

  if (!data) return fail(MSG.codeWrong);

  if (isExpired(data.expires_at)) {
    await db.from('email_codes').update({ consumed_at: new Date().toISOString() }).eq('id', data.id);
    return fail(MSG.codeExpired);
  }
  if (attemptsExceeded(data.attempts)) return fail(MSG.tooManyAttempts);

  const expected = await hashSecret(opts.code, pepper());
  if (!timingSafeEqual(expected, data.code_hash)) {
    const next = (data.attempts || 0) + 1;
    await db.from('email_codes').update({ attempts: next }).eq('id', data.id);
    if (attemptsExceeded(next)) return fail(MSG.tooManyAttempts);
    return fail(MSG.codeWrong);
  }

  await db.from('email_codes').update({ consumed_at: new Date().toISOString() }).eq('id', data.id);
  return { row: { id: data.id, user_id: data.user_id } };
}

export async function createRecoverySession(
  db: SupabaseClient,
  userId: string,
): Promise<Response | { token: string }> {
  const token = generateToken();
  const tokenHash = await hashSecret(token, pepper());
  const { error } = await db.from('recovery_sessions').insert({
    user_id: userId,
    token_hash: tokenHash,
    expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
  });
  if (error) return failLogged('createRecoverySession.insert', error);
  return { token };
}

export async function loadRecoverySession(db: SupabaseClient, token: string) {
  const tokenHash = await hashSecret(token, pepper());
  const { data, error } = await db
    .from('recovery_sessions')
    .select('id, user_id, expires_at, consumed_at, new_phone')
    .eq('token_hash', tokenHash)
    .maybeSingle();
  if (error) {
    logFail('loadRecoverySession.lookup', error);
    return null;
  }
  if (!data || data.consumed_at || isExpired(data.expires_at)) return null;
  return data;
}
