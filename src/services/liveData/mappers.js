import { sanitizePhotoUrlsForStorage } from '../../utils/photos';

export function authorToApp(authorId, currentUserId) {
  if (!authorId) return null;
  return authorId === currentUserId ? 'me' : authorId;
}

export function authorToDb(authorId, currentUserId) {
  if (authorId === 'me') return currentUserId;
  return authorId;
}

export function mapReply(row, currentUserId) {
  return {
    id: row.id,
    authorId: authorToApp(row.author_id, currentUserId),
    anonymous: row.anonymous,
    body: row.body,
    photo: row.photo_url || null,
    createdAt: new Date(row.created_at).getTime(),
    upvotes: row.upvotes ?? 0,
    ...(row.posted_as_expert != null ? { postedAsExpert: row.posted_as_expert } : {}),
    ...(row.profession_label ? { professionLabel: row.profession_label } : {}),
  };
}

export function mapAnswer(row, currentUserId) {
  const replies = (row.replies || [])
    .map((r) => mapReply(r, currentUserId))
    .sort((a, b) => a.createdAt - b.createdAt);
  return {
    id: row.id,
    authorId: authorToApp(row.author_id, currentUserId),
    anonymous: row.anonymous,
    body: row.body,
    photo: row.photo_url || null,
    createdAt: new Date(row.created_at).getTime(),
    upvotes: row.upvotes ?? 0,
    replies,
  };
}

export function mapQuestion(row, currentUserId) {
  const answers = (row.answers || [])
    .map((a) => mapAnswer(a, currentUserId))
    .sort((a, b) => a.createdAt - b.createdAt);
  return {
    id: row.id,
    authorId: authorToApp(row.author_id, currentUserId),
    anonymous: row.anonymous,
    circleId: row.circle_id,
    title: row.title,
    body: row.body,
    photos: sanitizePhotoUrlsForStorage(row.photos || []),
    createdAt: new Date(row.created_at).getTime(),
    upvotes: row.upvotes ?? 0,
    views: row.views ?? 0,
    answers,
    ...(row.posted_as_expert != null ? { postedAsExpert: row.posted_as_expert } : {}),
    ...(row.profession_label ? { professionLabel: row.profession_label } : {}),
  };
}

export function mapProfileRow(row, currentUserId) {
  if (!row) return null;
  const id = row.id === currentUserId ? 'me' : row.id;
  return {
    id,
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

export function mapCircle(row, currentUserId) {
  if (!row?.id) return null;
  return {
    id: row.id,
    name: row.name || '',
    handle: row.handle || row.id,
    description: row.description || '',
    icon: row.icon || '📌',
    accentId: row.accent_id || 'crimson',
    imageUrl: row.image_url || null,
    creatorId: authorToApp(row.creator_id, currentUserId),
    memberCount: row.member_count ?? 0,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    isOfficial: !!row.is_official,
    isPrivate: false,
    pinnedQuestionId: row.pinned_post_id || null,
  };
}
