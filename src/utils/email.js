export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

export function maskEmail(email) {
  const value = normalizeEmail(email);
  const at = value.indexOf('@');
  if (at < 1) return '';
  return `${value[0]}•••@${value.slice(at + 1)}`;
}

export function isProfileComplete(row) {
  return !!row?.name?.trim() && !!row?.email_verified_at;
}

/** First unfinished onboarding screen. Fresh sign-ups still walk the full order. */
export function firstIncompleteOnboardingRoute({ hasName, emailVerified }) {
  if (!hasName) return 'ProfileName';
  if (!emailVerified) return 'Email';
  return 'ProfileSuburb';
}
