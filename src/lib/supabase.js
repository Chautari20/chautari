import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = () => !!(url && anonKey);

let warnedReleaseDevMode = false;

/**
 * Dev client: any 6-digit code, no SMS/email send.
 * Release builds always use the real path, even if EXPO_PUBLIC_AUTH_DEV_MODE is true.
 */
export function isAuthDevMode() {
  if (typeof __DEV__ !== 'undefined' && __DEV__) return true;
  if (process.env.EXPO_PUBLIC_AUTH_DEV_MODE === 'true' && !warnedReleaseDevMode) {
    warnedReleaseDevMode = true;
    console.error('[auth] EXPO_PUBLIC_AUTH_DEV_MODE is true in a release build — ignored');
  }
  return false;
}

export const supabase = isSupabaseConfigured()
  ? createClient(url, anonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
