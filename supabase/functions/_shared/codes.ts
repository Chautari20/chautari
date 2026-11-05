export const CODE_TTL_MS = 10 * 60 * 1000;
export const MAX_ATTEMPTS = 5;
export const MAX_SENDS_PER_HOUR = 3;
export const TOKEN_TTL_MS = 15 * 60 * 1000;
export const TEST_CODE = '123456';
export const TEST_EMAIL_SUFFIX = '@example.test';

export function generateSixDigitCode(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const n = new DataView(bytes.buffer).getUint32(0) % 1_000_000;
  return String(n).padStart(6, '0');
}

export function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashSecret(value: string, pepper: string): Promise<string> {
  return sha256Hex(`${value}${pepper}`);
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

export function isExpired(expiresAt: Date | string, now = new Date()): boolean {
  return new Date(expiresAt).getTime() <= now.getTime();
}

export function attemptsExceeded(attempts: number, max = MAX_ATTEMPTS): boolean {
  return attempts >= max;
}

export function tooManySends(sendCountLastHour: number, max = MAX_SENDS_PER_HOUR): boolean {
  return sendCountLastHour >= max;
}

export function isTestModeEmail(email: string, testMode: boolean): boolean {
  return testMode === true && String(email).toLowerCase().endsWith(TEST_EMAIL_SUFFIX);
}

export function normalizeEmail(email: string): string {
  return String(email || '').trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

export function maskEmail(email: string): string {
  const value = normalizeEmail(email);
  const at = value.indexOf('@');
  if (at < 1) return '';
  return `${value[0]}•••@${value.slice(at + 1)}`;
}
