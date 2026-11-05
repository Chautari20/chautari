const AU_MOBILE = /^\+614\d{8}$/;

export function normalizeAuPhone(input: string): string | null {
  if (!input) return null;
  const digits = String(input).replace(/\D/g, '');
  let e164 = null;
  if (digits.startsWith('61') && digits.length === 11) e164 = `+${digits}`;
  else if (digits.length === 9 && digits.startsWith('4')) e164 = `+61${digits}`;
  else if (digits.length === 10 && digits.startsWith('04')) e164 = `+61${digits.slice(1)}`;
  else if (String(input).startsWith('+') && digits.length >= 10) e164 = `+${digits}`;
  if (!e164) return null;
  return AU_MOBILE.test(e164) ? e164 : null;
}

export function isAuMobile(e164: string): boolean {
  return AU_MOBILE.test(e164);
}
