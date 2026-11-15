export const AUTH_COPY = {
  noAccountPhone: 'No account is registered with this number.',
  noAccountEmail: 'No account is registered with this email.',
  phoneRegistered: 'This number is already registered.',
  emailRegistered: 'This email is already registered.',
  codeWrong: "That code isn't right. Try again.",
  tooMany: 'Too many attempts. Please try again later.',
  unavailable: 'Sign-in is not available right now.',
  loginFailed: "We couldn't log you in. Please try again.",
};

/** Messages that are safe to show verbatim after the code step. */
const KNOWN_AFTER_CODE = new Set([
  AUTH_COPY.noAccountPhone,
  AUTH_COPY.codeWrong,
  AUTH_COPY.tooMany,
]);

/**
 * After the code step, only "no account" (from lookup / server), "wrong code"
 * and "too many" are shown as-is. Everything else becomes loginFailed, with the
 * real error kept in devDetail so __DEV__ builds can show it underneath.
 */
export function toLoginError(e) {
  const message = String(e?.message || '');
  if (KNOWN_AFTER_CODE.has(message)) return e;
  const err = new Error(AUTH_COPY.loginFailed);
  const detail = [e?.devDetail, e?.code, message].filter(Boolean).join(' · ');
  if (detail) err.devDetail = detail;
  return err;
}

export function isEmailTakenMessage(message) {
  return String(message || '') === AUTH_COPY.emailRegistered
    || /already registered/i.test(String(message || ''));
}
