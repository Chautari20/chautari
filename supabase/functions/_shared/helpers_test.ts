import {
  attemptsExceeded,
  generateSixDigitCode,
  hashSecret,
  isExpired,
  isTestModeEmail,
  isValidEmail,
  maskEmail,
  MAX_ATTEMPTS,
  normalizeEmail,
  TEST_CODE,
  timingSafeEqual,
  tooManySends,
} from './codes.ts';
import { resolveOutboundCode } from './email.ts';
import { isAuMobile, normalizeAuPhone } from './phone.ts';
import { supabaseProjectRef } from './devBypass.ts';

Deno.test('generateSixDigitCode is six digits', () => {
  const code = generateSixDigitCode();
  if (!/^\d{6}$/.test(code)) throw new Error(`bad code shape`);
});

Deno.test('hashSecret is deterministic and pepper-sensitive', async () => {
  const a = await hashSecret('123456', 'pepper-a');
  const b = await hashSecret('123456', 'pepper-a');
  const c = await hashSecret('123456', 'pepper-b');
  if (a !== b) throw new Error('same inputs should match');
  if (a === c) throw new Error('different pepper must not match');
  if (a.length !== 64) throw new Error('sha256 hex length');
});

Deno.test('timingSafeEqual', () => {
  if (!timingSafeEqual('abcd', 'abcd')) throw new Error('equal failed');
  if (timingSafeEqual('abcd', 'abce')) throw new Error('unequal passed');
  if (timingSafeEqual('abc', 'abcd')) throw new Error('length mismatch passed');
});

Deno.test('expiry', () => {
  const now = new Date('2026-01-01T00:00:10Z');
  if (!isExpired('2026-01-01T00:00:00Z', now)) throw new Error('past should expire');
  if (isExpired('2026-01-01T00:00:20Z', now)) throw new Error('future should be valid');
});

Deno.test('attempts and send limits', () => {
  if (!attemptsExceeded(MAX_ATTEMPTS)) throw new Error('max attempts');
  if (attemptsExceeded(MAX_ATTEMPTS - 1)) throw new Error('under max');
  if (!tooManySends(3)) throw new Error('3 sends blocked');
  if (tooManySends(2)) throw new Error('2 sends allowed');
});

Deno.test('AU phone validation', () => {
  if (normalizeAuPhone('412345678') !== '+61412345678') throw new Error('9-digit');
  if (normalizeAuPhone('+61 412 345 678') !== '+61412345678') throw new Error('pretty');
  if (normalizeAuPhone('0412345678') !== '+61412345678') throw new Error('leading 0');
  if (normalizeAuPhone('+1 2025550123') !== null) throw new Error('US rejected');
  if (normalizeAuPhone('+61312345678') !== null) throw new Error('landline rejected');
  if (!isAuMobile('+61412345678')) throw new Error('valid e164');
  if (isAuMobile('+6141234567')) throw new Error('short rejected');
});

Deno.test('test-mode bypass only for @example.test', () => {
  const bypass = resolveOutboundCode('user@example.test', '999999', true);
  if (bypass.code !== TEST_CODE || bypass.send !== false) throw new Error('test address');

  const realWhileOn = resolveOutboundCode('user@gmail.com', '999999', true);
  if (realWhileOn.code !== '999999' || realWhileOn.send !== true) {
    throw new Error('real address must still send when test mode is on');
  }

  const off = resolveOutboundCode('user@example.test', '999999', false);
  if (off.code !== '999999' || off.send !== true) throw new Error('test mode off');

  if (!isTestModeEmail('A@Example.TEST', true)) throw new Error('case fold');
  if (isTestModeEmail('a@example.test', false)) throw new Error('flag off');
});

Deno.test('supabaseProjectRef parses hosted URL', () => {
  if (supabaseProjectRef('https://hlrvifbztfizncodlrru.supabase.co') !== 'hlrvifbztfizncodlrru') {
    throw new Error('hosted ref');
  }
  if (supabaseProjectRef('not-a-url') !== '') throw new Error('invalid url');
});

Deno.test('email helpers', () => {
  if (normalizeEmail('  A@Gmail.COM ') !== 'a@gmail.com') throw new Error('normalize');
  if (!isValidEmail('a@b.co')) throw new Error('valid');
  if (isValidEmail('not-an-email')) throw new Error('invalid');
  if (maskEmail('ashish@gmail.com') !== 'a•••@gmail.com') throw new Error('mask');
});
