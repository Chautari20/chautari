import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { fail, failLogged, MSG } from './http.ts';

const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 10;

export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for') || '';
  const first = forwarded.split(',')[0]?.trim();
  if (first) return first.slice(0, 64);
  const cf = req.headers.get('cf-connecting-ip')?.trim();
  if (cf) return cf.slice(0, 64);
  return 'unknown';
}

/** 10 rows per IP per rolling minute. Call before any lookup. */
export async function rateLimitAuthChecks(
  db: SupabaseClient,
  ip: string,
): Promise<Response | null> {
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const { count, error: countErr } = await db
    .from('auth_checks')
    .select('id', { count: 'exact', head: true })
    .eq('ip', ip)
    .gte('created_at', since);
  if (countErr) return failLogged('auth_checks.count', countErr);
  if ((count ?? 0) >= MAX_PER_WINDOW) return fail(MSG.rateLimited, 429);

  const { error: insertErr } = await db.from('auth_checks').insert({ ip });
  if (insertErr) return failLogged('auth_checks.insert', insertErr);
  return null;
}
