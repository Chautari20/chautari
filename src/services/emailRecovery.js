import { supabase, isSupabaseConfigured } from '../lib/supabase';

const GENERIC = 'Something went wrong. Try again.';

function friendly(data) {
  if (data && typeof data.error === 'string' && data.error.trim()) return data.error;
  return GENERIC;
}

function invokeDevDetail(error) {
  if (!error) return '';
  const bits = [];
  if (error.name) bits.push(error.name);
  if (error.code) bits.push(String(error.code));
  if (error.message) bits.push(error.message);
  const status = error.context?.status ?? error.status;
  if (status) bits.push(`HTTP ${status}`);
  return bits.join(' · ');
}

function throwInvokeError(data, error) {
  const err = new Error(friendly(data));
  const detail = invokeDevDetail(error);
  if (detail) err.devDetail = detail;
  throw err;
}

async function invoke(name, body) {
  if (!isSupabaseConfigured()) throw new Error('Sign-in is not available right now.');
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (data?.ok === false) throwInvokeError(data, error);
  if (error) throwInvokeError(data, error);
  return data || {};
}

export function sendVerifyEmail(email) {
  return invoke('email-verification', { action: 'send', purpose: 'verify_email', email });
}

export function verifyEmailCode(email, code) {
  return invoke('email-verification', { action: 'verify', purpose: 'verify_email', email, code });
}

export function sendChangePhoneEmail() {
  return invoke('email-verification', { action: 'send', purpose: 'change_phone' });
}

export function verifyChangePhoneEmail(code) {
  return invoke('email-verification', { action: 'verify', purpose: 'change_phone', code });
}

export function recoveryEmailStatus() {
  return invoke('email-verification', { action: 'status' });
}

export function startAccountRecovery(email) {
  return invoke('account-recovery', { action: 'start', email });
}

export function verifyRecoveryEmail(email, code) {
  return invoke('account-recovery', { action: 'verify_email', email, code });
}

export function sendRecoveryPhoneCode(token, newPhone) {
  return invoke('account-recovery', { action: 'send_phone_code', token, newPhone });
}

export function completeAccountRecovery(token, code) {
  return invoke('account-recovery', { action: 'complete', token, code });
}

export async function lookupAccount({ phone, email }) {
  const data = await invoke('account-lookup', phone ? { phone } : { email });
  return !!data.exists;
}

export function sendEmailLogin(email) {
  return invoke('email-login', { action: 'send', email });
}

export function verifyEmailLoginCode(email, code) {
  return invoke('email-login', { action: 'verify', email, code });
}
