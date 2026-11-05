import { supabase, isSupabaseConfigured, isAuthDevMode } from '../lib/supabase';
import { AUTH_COPY } from '../utils/authCopy';

const DEV_AUTH_PASSWORD = 'chautari-prototype';

function normalizePhoneE164(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('61') && digits.length === 11) return `+${digits}`;
  if (digits.length === 9 && digits.startsWith('4')) return `+61${digits}`;
  return phone.startsWith('+') ? phone : `+${digits}`;
}

export function toE164Au(digits) {
  const cleaned = String(digits).replace(/\D/g, '');
  return `+61${cleaned}`;
}

export function usesMockOtp() {
  return isAuthDevMode();
}

function emailForPhone(phoneE164) {
  const digits = normalizePhoneE164(phoneE164).replace(/\D/g, '');
  return `user+${digits}@chautari.app`;
}

function mapAuthError(error, kind) {
  const raw = `${error?.message || ''} ${error?.code || ''}`;
  if (/rate|too many/i.test(raw)) return new Error(AUTH_COPY.tooMany);
  if (kind === 'login' && /not found|signups not allowed|unable to find|user not found/i.test(raw)) {
    return new Error(AUTH_COPY.noAccountPhone);
  }
  if (/invalid|otp|token|code/i.test(raw)) return new Error(AUTH_COPY.codeWrong);
  return new Error(AUTH_COPY.unavailable);
}

/** Dev/register only: create or sign in the synthetic email/password user. Never used for login. */
export async function ensureSupabaseUserForPhone(phoneE164) {
  if (!isSupabaseConfigured()) return null;
  const email = emailForPhone(phoneE164);
  const phone = normalizePhoneE164(phoneE164);

  let { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: DEV_AUTH_PASSWORD,
  });
  if (!error && data.user) return data.user;

  ({ data, error } = await supabase.auth.signUp({
    email,
    password: DEV_AUTH_PASSWORD,
    options: { data: { phone } },
  }));
  if (error) throw mapAuthError(error, 'register');
  if (!data.user) throw new Error(AUTH_COPY.unavailable);
  return data.user;
}

/** Dev login only — never creates an account. */
export async function signInDevForPhone(phoneE164) {
  if (!isSupabaseConfigured()) throw new Error(AUTH_COPY.unavailable);
  const email = emailForPhone(phoneE164);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: DEV_AUTH_PASSWORD,
  });
  if (error || !data.user) throw new Error(AUTH_COPY.noAccountPhone);
  return data.user;
}

export async function sendPhoneOtp(phoneE164, { createUser = false } = {}) {
  if (usesMockOtp()) return;
  if (!isSupabaseConfigured()) throw new Error(AUTH_COPY.unavailable);
  const { error } = await supabase.auth.signInWithOtp({
    phone: phoneE164,
    options: { shouldCreateUser: !!createUser },
  });
  if (error) throw mapAuthError(error, createUser ? 'register' : 'login');
}

export async function verifyPhoneOtp(phoneE164, token) {
  if (!isSupabaseConfigured()) throw new Error(AUTH_COPY.unavailable);
  const { data, error } = await supabase.auth.verifyOtp({
    phone: phoneE164,
    token,
    type: 'sms',
  });
  if (error) throw mapAuthError(error, 'login');
  if (!data.user) throw new Error(AUTH_COPY.unavailable);
  return { user: data.user, session: data.session };
}

export async function verifyEmailLoginToken(tokenHash, type = 'magiclink') {
  if (!isSupabaseConfigured()) throw new Error(AUTH_COPY.unavailable);
  const tryType = async (otpType) => supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: otpType,
  });
  let { data, error } = await tryType(type || 'magiclink');
  if ((error || !data?.user) && type !== 'email') {
    const retry = await tryType('email');
    data = retry.data;
    error = retry.error;
  }
  if (error) throw mapAuthError(error, 'login');
  if (!data.user) throw new Error(AUTH_COPY.unavailable);
  return { user: data.user, session: data.session };
}

export async function getSession() {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function onAuthStateChange(callback) {
  if (!isSupabaseConfigured()) return { data: { subscription: { unsubscribe: () => {} } } };
  return supabase.auth.onAuthStateChange(callback);
}
