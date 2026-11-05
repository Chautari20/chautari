export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function ok(body: Record<string, unknown> = {}): Response {
  return json({ ok: true, ...body });
}

export function fail(message: string, status = 400): Response {
  return json({ ok: false, error: message }, status);
}

export const MSG = {
  generic: 'Something went wrong. Try again.',
  unauthorized: 'Please sign in and try again.',
  invalidEmail: 'Enter a valid email address.',
  emailTaken: 'This email is already registered.',
  noRecoveryEmail: 'Add a recovery email first.',
  codeWrong: "That code isn't right. Try again.",
  codeExpired: 'That code has expired. Request a new one.',
  tooManyAttempts: 'Too many attempts. Please try again later.',
  rateLimited: 'Too many attempts. Please try again later.',
  noAccountEmail: 'No account is registered with this email.',
  noAccountPhone: 'No account is registered with this number.',
  phoneAlreadyRegistered: 'This number is already registered.',
  tooManySends: 'Please wait before requesting another code.',
  recoverySame: "If that email is on an account, we've sent a code.",
  invalidPhone: 'Enter a valid Australian mobile number.',
  phoneTaken: "That number can't be used. Try another.",
  invalidToken: 'This link has expired. Start again.',
  needCode: 'Enter the 6-digit code.',
};

function redact(value: string): string {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[phone]')
    .replace(/\b[a-f0-9]{32,}\b/gi, '[token]')
    .replace(/\b\d{6}\b/g, '[code]');
}

/** Log a failing step. Never writes codes, tokens, full emails, or phone numbers. */
export function logFail(step: string, err?: unknown): void {
  const parts: string[] = [];
  if (err instanceof Error) {
    parts.push(`${err.name}: ${redact(err.message)}`);
  } else if (err && typeof err === 'object') {
    const o = err as { code?: unknown; message?: unknown; details?: unknown };
    if (o.code != null) parts.push(`code=${String(o.code)}`);
    if (typeof o.message === 'string') parts.push(redact(o.message));
    if (typeof o.details === 'string') parts.push(redact(o.details));
  } else if (err != null) {
    parts.push(redact(String(err)));
  }
  console.error(`[${step}]${parts.length ? ` ${parts.join(' ')}` : ''}`);
}

export function failLogged(
  step: string,
  err?: unknown,
  message = MSG.generic,
  status = 500,
): Response {
  logFail(step, err);
  return fail(message, status);
}

export function preflight(): Response {
  return new Response('ok', { headers: corsHeaders });
}
