import { ensureProfilePhone, fetchProfile } from './profile';
import { firstIncompleteOnboardingRoute, isProfileComplete } from '../utils/email';

/** After a session exists: home if complete, else first unfinished onboarding step. */
export async function finishAuthNavigation({
  userId,
  phone = '',
  phoneE164 = '',
  navigation,
  dispatch,
}) {
  if (phoneE164) {
    try { await ensureProfilePhone(userId, phoneE164); } catch { /* onboarding can still continue */ }
  }
  const row = await fetchProfile(userId);
  const hasName = !!row?.name?.trim();
  const emailVerified = !!row?.email_verified_at;
  dispatch({
    type: 'SET_AUTH_PROFILE',
    hasName,
    emailVerified,
    name: row?.name || '',
  });
  if (isProfileComplete(row)) {
    dispatch({ type: 'RESTORE_SESSION', userId, profile: row });
    return;
  }
  dispatch({ type: 'SET_AUTH', userId });
  const next = firstIncompleteOnboardingRoute({ hasName, emailVerified });
  navigation.navigate(next, {
    name: row?.name?.trim() || '',
    phone,
    phoneE164,
  });
}
