/** Only this hosted project may ever enable AUTH_DEV_BYPASS. */
const ALLOWED_PROJECT_REFS = new Set(['hlrvifbztfizncodlrru']);

export function supabaseProjectRef(url = Deno.env.get('SUPABASE_URL') || ''): string {
  try {
    const host = new URL(url).hostname;
    const ref = host.split('.')[0] || '';
    return /^[a-z0-9]+$/i.test(ref) ? ref.toLowerCase() : '';
  } catch {
    return '';
  }
}

/** True only when the secret is set AND SUPABASE_URL is the allow-listed project. */
export function isAuthDevBypass(): boolean {
  const flag = (Deno.env.get('AUTH_DEV_BYPASS') || '').trim().toLowerCase();
  if (flag !== 'true' && flag !== '1') return false;
  return ALLOWED_PROJECT_REFS.has(supabaseProjectRef());
}

export function logDevBypass(step: string): void {
  console.warn(`[auth-dev-bypass] ${step}`);
}
