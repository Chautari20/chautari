import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { normalizeAuPhone } from '../utils/phone';

/** Public profile columns — never include email. Matches 012 GRANT SELECT. */
export const PROFILE_PUBLIC_COLUMNS = [
  'id', 'phone', 'name', 'suburb', 'photo_url', 'bio', 'verified', 'verified_category',
  'profession', 'contact', 'is_founding_member', 'newcomer', 'newcomer_since',
  'digest_mode', 'checklist_card_dismissed', 'followers_count', 'created_at',
  'updated_at', 'expert_badge_title', 'expert_circle_id', 'email_verified_at',
].join(', ');

export async function ensureProfilePhone(userId, phoneE164) {
  if (!isSupabaseConfigured() || !userId) return;
  const phone = normalizeAuPhone(phoneE164);
  if (!phone) return; // never write an un-normalised phone

  const tryUpdate = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .update({ phone })
      .eq('id', userId)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    return !!data;
  };

  if (await tryUpdate()) return;
  await new Promise((r) => setTimeout(r, 400));
  if (await tryUpdate()) return;

  const { error } = await supabase.from('profiles').insert({ id: userId, phone, name: '' });
  if (error && error.code !== '23505') throw error;
}

export function profileRowToUser(row) {
  if (!row) return null;
  return {
    id: 'me',
    name: row.name || '',
    suburb: row.suburb || null,
    photo: row.photo_url || null,
    bio: row.bio || '',
    verified: !!row.verified,
    verifiedCategory: row.verified_category || null,
    profession: row.profession || null,
    expertBadgeTitle: row.expert_badge_title || null,
    expertCircleId: row.expert_circle_id || null,
    contact: row.contact || null,
    isFoundingMember: !!row.is_founding_member,
    followers: row.followers_count ?? 0,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

export function profileMetaFromRow(row) {
  if (!row) return {};
  return {
    newcomer: !!row.newcomer,
    newcomerSince: row.newcomer_since ? new Date(row.newcomer_since).getTime() : null,
    digestMode: row.digest_mode || 'daily',
    checklistCardDismissed: !!row.checklist_card_dismissed,
  };
}

function patchToRow(patch) {
  const row = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.suburb !== undefined) row.suburb = patch.suburb;
  if (patch.photo !== undefined) row.photo_url = patch.photo;
  if (patch.bio !== undefined) row.bio = patch.bio;
  if (patch.newcomer !== undefined) {
    row.newcomer = patch.newcomer;
    row.newcomer_since = patch.newcomer ? new Date().toISOString() : null;
  }
  if (patch.isFoundingMember !== undefined) row.is_founding_member = patch.isFoundingMember;
  if (patch.digestMode !== undefined) row.digest_mode = patch.digestMode;
  if (patch.checklistCardDismissed !== undefined) {
    row.checklist_card_dismissed = patch.checklistCardDismissed;
  }
  if (patch.expertBadgeTitle !== undefined) row.expert_badge_title = patch.expertBadgeTitle;
  if (patch.expertCircleId !== undefined) row.expert_circle_id = patch.expertCircleId;
  if (patch.profession !== undefined) row.profession = patch.profession;
  if (patch.verifiedCategory !== undefined) row.verified_category = patch.verifiedCategory;
  return row;
}

export async function fetchProfile(userId) {
  if (!isSupabaseConfigured() || !userId) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_PUBLIC_COLUMNS)
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfile(patch) {
  if (!isSupabaseConfigured()) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { data, error } = await supabase
    .from('profiles')
    .update(patchToRow(patch))
    .eq('id', user.id)
    .select(PROFILE_PUBLIC_COLUMNS)
    .single();
  if (error) throw error;
  return data;
}

export async function completeOnboarding({ name, suburb, photo, newcomer, phone }) {
  if (!isSupabaseConfigured()) return null;

  // Onboarding always runs inside an existing session (OTP / dev login / email
  // login). Never create an account here — a missing session is an error.
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) {
    throw new Error('Your session has expired. Please log in again.');
  }

  const row = patchToRow({
    name,
    suburb: suburb || null,
    photo: photo || null,
    newcomer: !!newcomer,
    isFoundingMember: true,
  });
  const normalizedPhone = phone ? normalizeAuPhone(phone) : null;
  if (normalizedPhone) row.phone = normalizedPhone;

  const { error } = await supabase.from('profiles').update(row).eq('id', userId);
  if (error) throw error;
  return userId;
}
