export const AUTH_COPY = {
  noAccountPhone: 'No account is registered with this number.',
  noAccountEmail: 'No account is registered with this email.',
  phoneRegistered: 'This number is already registered.',
  emailRegistered: 'This email is already registered.',
  codeWrong: "That code isn't right. Try again.",
  tooMany: 'Too many attempts. Please try again later.',
  unavailable: 'Sign-in is not available right now.',
};

export function isEmailTakenMessage(message) {
  return String(message || '') === AUTH_COPY.emailRegistered
    || /already registered/i.test(String(message || ''));
}
