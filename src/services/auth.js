import { supabase, isSupabaseConfigured, isAuthDevMode } from '../lib/supabase';
import { AUTH_COPY } from '../utils/authCopy';
import { normalizeAuPhone } from '../utils/phone';
import { invokeFunction } from './emailRecovery';

const DEV_AUTH_PASSWORD = 'chautari-prototype';

/** 9 national digits (or any AU form) → +614XXXXXXXX. Returns '' if not an AU mobile. */
export function toE164Au(digits) {
  return normalizeAuPhone(digits) || '';
}

export function usesMockOtp() {
  return isAuthDevMode();
}

/** Synthetic identity used ONLY by dev Register (ensureSupabaseUserForPhone). */
function emailForPhone(phoneE164) {
  const digits = (normalizeAuPhone(phoneE164) || String(phoneE164)).replace(/\D/g, '');
  return `user+${digits}@chautari.app`;
}

/**
 * Friendly copy only; the raw provider error rides along in `devDetail`.
 * `kind`:
 *  - 'send-login'    sending an OTP to a number that should already exist
 *  - 'register'      sign-up / send for a new number
 *  - 'verify'        after the code — never maps to "no account"
 */
function mapAuthError(error, kind) {
  const raw = `${error?.message || ''} ${error?.code || ''}`;
  let friendly;
  if (/rate|too many/i.test(raw)) friendly = AUTH_COPY.tooMany;
  else if (kind === 'send-login' && /not found|signups not allowed|unable to find|user not found/i.test(raw)) {
    friendly = AUTH_COPY.noAccountPhone;
  } else if (kind === 'verify' && /invalid|otp|token|code|expired/i.test(raw)) friendly = AUTH_COPY.codeWrong;
  else friendly = kind === 'verify' ? AUTH_COPY.loginFailed : AUTH_COPY.unavailable;
  const err = new Error(friendly);
  const detail = [error?.code, error?.message, error?.status && `HTTP ${error.status}`].filter(Boolean).join(' · ');
  if (detail) err.devDetail = detail;
  return err;
}

/** Dev Register only: create (or re-enter) the synthetic email/password user. Never used for login. */
export async function ensureSupabaseUserForPhone(phoneE164) {
  if (!isSupabaseConfigured()) return null;
  const email = emailForPhone(phoneE164);
  const phone = normalizeAuPhone(phoneE164);

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

/**
 * Dev Login only (__DEV__ + mock OTP). Works for EVERY existing account however
 * it was created (real SMS, dev register, recovery) and never creates one.
 * Server side: `dev-login` edge function, which 404s unless AUTH_DEV_BYPASS is
 * set on the allow-listed project. Throws AUTH_COPY.noAccountPhone only when the
 * server says there is no account; any other failure keeps the raw error in devDetail.
 */
export async function signInDevForPhone(phoneE164) {
  if (!isSupabaseConfigured()) throw new Error(AUTH_COPY.unavailable);
  if (!(typeof __DEV__ !== 'undefined' && __DEV__)) throw new Error(AUTH_COPY.unavailable);
  const phone = normalizeAuPhone(phoneE164);
  if (!phone) throw new Error(AUTH_COPY.noAccountPhone);

  const data = await invokeFunction('dev-login', { phone });
  if (!data?.token_hash) {
    const err = new Error(AUTH_COPY.loginFailed);
    err.devDetail = 'dev-login returned no token_hash';
    throw err;
  }
  const { user } = await verifyEmailLoginToken(data.token_hash, data.type);
  return user;
}

export async function sendPhoneOtp(phoneE164, { createUser = false } = {}) {
  if (usesMockOtp()) return;
  if (!isSupabaseConfigured()) throw new Error(AUTH_COPY.unavailable);
  const { error } = await supabase.auth.signInWithOtp({
    phone: phoneE164,
    options: { shouldCreateUser: !!createUser },
  });
  if (error) throw mapAuthError(error, createUser ? 'register' : 'send-login');
}

export async function verifyPhoneOtp(phoneE164, token) {
  if (!isSupabaseConfigured()) throw new Error(AUTH_COPY.unavailable);
  const { data, error } = await supabase.auth.verifyOtp({
    phone: phoneE164,
    token,
    type: 'sms',
  });
  if (error) throw mapAuthError(error, 'verify');
  if (!data.user) throw new Error(AUTH_COPY.loginFailed);
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
  if (error) throw mapAuthError(error, 'verify');
  if (!data.user) throw new Error(AUTH_COPY.loginFailed);
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
