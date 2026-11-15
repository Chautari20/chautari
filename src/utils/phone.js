/**
 * One phone format everywhere: +614XXXXXXXX.
 * Mirrors supabase/functions/_shared/phone.ts and public.normalize_au_phone() (migration 015).
 */
const AU_MOBILE = /^\+614\d{8}$/;

/** AU mobile in any common form (04…, +61 4…, 61 4…, 4…) → +614XXXXXXXX, else null. */
export function normalizeAuPhone(input) {
  if (input == null) return null;
  const digits = String(input).replace(/\D/g, '');
  let e164 = null;
  if (digits.length === 11 && digits.startsWith('614')) e164 = `+${digits}`;
  else if (digits.length === 10 && digits.startsWith('04')) e164 = `+61${digits.slice(1)}`;
  else if (digits.length === 9 && digits.startsWith('4')) e164 = `+61${digits}`;
  return e164 && AU_MOBILE.test(e164) ? e164 : null;
}

export function isAuMobile(e164) {
  return AU_MOBILE.test(String(e164 || ''));
}

/** The 9 national digits (4XXXXXXXX) for display/prefill, or '' if not an AU mobile. */
export function auNationalDigits(input) {
  const e164 = normalizeAuPhone(input);
  return e164 ? e164.slice(3) : '';
}
