import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { mapQuestion, mapProfileRow, mapCircle } from './mappers';
import { PROFILE_PUBLIC_COLUMNS } from '../profile';
import { filterValidUuids, isValidUuid } from './ids';

const EMPTY_BUNDLE = {
  questions: [],
  users: [],
  circles: [],
  myUpvotes: { questions: [], answers: [], replies: [] },
  savedQuestions: [],
  following: [],
  joinedCircles: [],
  checklistDone: [],
};

function warnFetch(label, error) {
  console.warn(`[fetchLiveBundle] ${label}:`, error?.message || error);
}

/** Collect author UUIDs from post rows — skip any non-uuid id. */
function collectAuthorUuids(rows, into) {
  for (const q of rows || []) {
    if (isValidUuid(q.author_id)) into.add(q.author_id);
    for (const a of q.answers || []) {
      if (isValidUuid(a.author_id)) into.add(a.author_id);
      for (const r of a.replies || []) {
        if (isValidUuid(r.author_id)) into.add(r.author_id);
      }
    }
  }
}

export async function fetchLiveBundle(currentUserId) {
  if (!isSupabaseConfigured() || !currentUserId) {
    return { ...EMPTY_BUNDLE };
  }
  if (!isValidUuid(currentUserId)) {
    warnFetch('auth user id is not a UUID — skipping Supabase refresh', currentUserId);
    return { ...EMPTY_BUNDLE };
  }

  const [
    questionsRes,
    circlesRes,
    upvotesRes,
    savedRes,
    followsRes,
    membersRes,
    checklistRes,
  ] = await Promise.all([
    supabase
      .from('posts')
      .select('*, answers(*, replies(*))')
      .order('created_at', { ascending: false }),
    supabase
      .from('circles')
      .select('*')
      .eq('is_official', false)
      .order('created_at', { ascending: false }),
    supabase.from('upvotes').select('target_type, target_id').eq('user_id', currentUserId),
    supabase.from('saved_posts').select('post_id').eq('user_id', currentUserId),
    supabase.from('follows').select('following_id').eq('follower_id', currentUserId),
    supabase.from('circle_members').select('circle_id').eq('user_id', currentUserId),
    supabase.from('checklist_progress').select('item_id').eq('user_id', currentUserId),
  ]);

  if (questionsRes.error) {
    warnFetch('posts', questionsRes.error);
    throw questionsRes.error;
  }
  if (circlesRes.error) warnFetch('circles', circlesRes.error);
  if (upvotesRes.error) warnFetch('upvotes', upvotesRes.error);
  if (savedRes.error) warnFetch('saved_posts', savedRes.error);
  if (followsRes.error) warnFetch('follows', followsRes.error);
  if (membersRes.error) warnFetch('circle_members', membersRes.error);
  if (checklistRes.error) warnFetch('checklist_progress', checklistRes.error);

  const questions = (questionsRes.data || []).map((row) => mapQuestion(row, currentUserId));
  const circles = (circlesRes.data || [])
    .map((row) => mapCircle(row, currentUserId))
    .filter(Boolean);

  const profileIdSet = new Set([currentUserId]);
  for (const row of followsRes.data || []) {
    if (isValidUuid(row.following_id)) profileIdSet.add(row.following_id);
  }
  collectAuthorUuids(questionsRes.data, profileIdSet);

  let users = [];
  const profileIds = filterValidUuids([...profileIdSet]);
  if (profileIds.length > 0) {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select(PROFILE_PUBLIC_COLUMNS)
      .in('id', profileIds);
    if (error) {
      warnFetch('profiles', error);
    } else {
      users = (profiles || []).map((p) => mapProfileRow(p, currentUserId)).filter(Boolean);
    }
  }

  const myUpvotes = { questions: [], answers: [], replies: [] };
  for (const row of upvotesRes.data || []) {
    if (row.target_type === 'post') myUpvotes.questions.push(row.target_id);
    else if (row.target_type === 'answer') myUpvotes.answers.push(row.target_id);
    else if (row.target_type === 'reply') myUpvotes.replies.push(row.target_id);
  }

  return {
    questions,
    users,
    circles,
    myUpvotes,
    savedQuestions: (savedRes.data || []).map((r) => r.post_id),
    // Mock follows (u_*) may exist in follows.following_id (TEXT) — never merge those into state.
    following: (followsRes.data || [])
      .map((r) => r.following_id)
      .filter(isValidUuid),
    joinedCircles: (membersRes.data || []).map((r) => r.circle_id),
    checklistDone: (checklistRes.data || []).map((r) => r.item_id),
  };
}
