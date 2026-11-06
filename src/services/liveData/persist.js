import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { slugify } from '../../data/circles';
import { sanitizePhotoUrlsForStorage } from '../../utils/photos';
import { makeId, isValidUuid } from './ids';
import { isBenignDuplicateError } from '../../utils/dispatchGuards';
import { verifiedCategoryFromCircle } from '../../utils/expertPost';

const SYNC_ACTIONS = new Set([
  'ASK_QUESTION', 'ADD_ANSWER', 'ADD_REPLY', 'DELETE_QUESTION',
  'TOGGLE_UPVOTE_QUESTION', 'TOGGLE_UPVOTE_ANSWER', 'TOGGLE_UPVOTE_REPLY',
  'TOGGLE_SAVE_QUESTION', 'TOGGLE_FOLLOW', 'TOGGLE_JOIN_CIRCLE',
  'CREATE_CIRCLE', 'UPDATE_CIRCLE', 'PIN_QUESTION_TO_CIRCLE', 'UNPIN_QUESTION_FROM_CIRCLE',
  'TOGGLE_CHECKLIST_ITEM', 'DISMISS_CHECKLIST_CARD', 'SET_DIGEST_MODE',
  'ADD_REPORT', 'SUBMIT_EXPERT_APPLICATION', 'SET_EXPERT_PROFESSIONAL_PROFILE',
]);

export function shouldSyncAction(action) {
  return isSupabaseConfigured() && SYNC_ACTIONS.has(action.type);
}

async function bumpVotes(table, id, delta) {
  const { data, error: fetchErr } = await supabase.from(table).select('upvotes').eq('id', id).maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!data) return;
  const next = Math.max(0, (data.upvotes || 0) + delta);
  const { error } = await supabase.from(table).update({ upvotes: next }).eq('id', id);
  if (error) throw error;
}

// DB upvote_target enum: 'post' | 'answer' | 'reply' (014 renamed 'question' → 'post')
const UPVOTE_TABLE = { post: 'posts', answer: 'answers', reply: 'replies' };

async function toggleUpvote(userId, targetType, targetId, hadVote) {
  const table = UPVOTE_TABLE[targetType];
  if (hadVote) {
    const { error } = await supabase.from('upvotes').delete()
      .eq('user_id', userId)
      .eq('target_type', targetType)
      .eq('target_id', targetId);
    if (error && !isBenignDuplicateError(error)) throw error;
    await bumpVotes(table, targetId, -1);
  } else {
    const { error } = await supabase.from('upvotes').insert({
      user_id: userId,
      target_type: targetType,
      target_id: targetId,
    });
    if (error && !isBenignDuplicateError(error)) throw error;
    await bumpVotes(table, targetId, 1);
  }
}

/** Returns augmented action (may add generated ids). Throws on hard failures. */
export async function persistAction(action, state, userId) {
  if (!shouldSyncAction(action)) return action;

  switch (action.type) {
    case 'ASK_QUESTION': {
      const postedAsExpert = !!action.postedAsExpert;
      const anonymous = postedAsExpert ? false : !!action.anonymous;
      const postRow = {
        id: action.id,
        circle_id: action.circleId,
        author_id: userId,
        anonymous,
        title: action.title.trim(),
        body: action.body.trim(),
        photos: sanitizePhotoUrlsForStorage(action.photos || []),
      };
      if (action.postedAsExpert != null) {
        postRow.posted_as_expert = !!action.postedAsExpert;
        postRow.profession_label = action.professionLabel || null;
      }
      const { error } = await supabase.from('posts').insert(postRow);
      if (error) throw error;
      return action;
    }

    case 'ADD_ANSWER': {
      const id = action.id || makeId('a');
      const { error } = await supabase.from('answers').insert({
        id,
        post_id: action.questionId,
        author_id: userId,
        anonymous: !!action.anonymous,
        body: action.body.trim(),
        photo_url: action.photoUrl || null,
      });
      if (error) throw error;
      return { ...action, id };
    }

    case 'ADD_REPLY': {
      const id = action.id || makeId('r');
      const replyRow = {
        id,
        answer_id: action.answerId,
        author_id: userId,
        anonymous: !!action.anonymous,
        body: action.body.trim(),
        photo_url: action.photoUrl || null,
      };
      if (action.postedAsExpert != null) {
        replyRow.posted_as_expert = !!action.postedAsExpert;
        replyRow.profession_label = action.professionLabel || null;
      }
      const { error } = await supabase.from('replies').insert(replyRow);
      if (error) throw error;
      return { ...action, id };
    }

    case 'DELETE_QUESTION': {
      const { error } = await supabase.from('posts').delete().eq('id', action.questionId).eq('author_id', userId);
      if (error) throw error;
      return action;
    }

    case 'TOGGLE_UPVOTE_QUESTION': {
      const had = state.myUpvotes.questions.includes(action.questionId);
      await toggleUpvote(userId, 'post', action.questionId, had);
      return action;
    }

    case 'TOGGLE_UPVOTE_ANSWER': {
      const parentQ = state.questions.find((q) =>
        (q.answers || []).some((a) => a.id === action.answerId),
      );
      if (!parentQ) return action;
      const had = state.myUpvotes.answers.includes(action.answerId);
      await toggleUpvote(userId, 'answer', action.answerId, had);
      return action;
    }

    case 'TOGGLE_UPVOTE_REPLY': {
      let parentQ = null;
      for (const q of state.questions) {
        for (const a of q.answers || []) {
          if ((a.replies || []).some((r) => r.id === action.replyId)) {
            parentQ = q;
            break;
          }
        }
        if (parentQ) break;
      }
      if (!parentQ) return action;
      const had = state.myUpvotes.replies.includes(action.replyId);
      await toggleUpvote(userId, 'reply', action.replyId, had);
      return action;
    }

    case 'TOGGLE_SAVE_QUESTION': {
      const had = state.savedQuestions.includes(action.questionId);
      if (had) {
        const { error } = await supabase.from('saved_posts').delete()
          .eq('user_id', userId).eq('post_id', action.questionId);
        if (error && !isBenignDuplicateError(error)) throw error;
      } else {
        const { error } = await supabase.from('saved_posts').insert({
          user_id: userId,
          post_id: action.questionId,
        });
        if (error && !isBenignDuplicateError(error)) throw error;
      }
      return action;
    }

    case 'TOGGLE_FOLLOW': {
      if (action.userId === 'me' || !isValidUuid(action.userId)) return action;
      const had = state.following.includes(action.userId);
      if (had) {
        const { error } = await supabase.from('follows').delete()
          .eq('follower_id', userId).eq('following_id', action.userId);
        if (error && !isBenignDuplicateError(error)) throw error;
      } else {
        const { error } = await supabase.from('follows').insert({
          follower_id: userId,
          following_id: action.userId,
        });
        if (error && !isBenignDuplicateError(error)) throw error;
      }
      return action;
    }

    case 'TOGGLE_JOIN_CIRCLE': {
      const had = state.joinedCircles.includes(action.circleId);
      if (had) {
        const { error } = await supabase.from('circle_members').delete()
          .eq('user_id', userId).eq('circle_id', action.circleId);
        if (error && !isBenignDuplicateError(error)) throw error;
      } else {
        const { error } = await supabase.from('circle_members').insert({
          user_id: userId,
          circle_id: action.circleId,
        });
        if (error && !isBenignDuplicateError(error)) throw error;
      }
      return action;
    }

    case 'CREATE_CIRCLE': {
      const id = action.id || makeId('c');
      const name = action.name.trim();
      const { error } = await supabase.from('circles').insert({
        id,
        name,
        handle: slugify(name),
        description: action.description.trim(),
        icon: action.icon,
        accent_id: action.accentId,
        image_url: action.imageUrl || null,
        creator_id: userId,
        is_official: false,
        member_count: 1,
      });
      if (error) throw error;
      const { error: memberErr } = await supabase.from('circle_members').insert({
        circle_id: id,
        user_id: userId,
      });
      if (memberErr) throw memberErr;
      return { ...action, id };
    }

    case 'UPDATE_CIRCLE': {
      const name = action.name?.trim();
      const updates = {
        name,
        handle: slugify(name),
        description: action.description.trim(),
        accent_id: action.accentId,
      };
      if (action.imageUrl !== undefined) updates.image_url = action.imageUrl;
      const { error } = await supabase.from('circles').update(updates)
        .eq('id', action.circleId).eq('creator_id', userId);
      if (error) throw error;
      return action;
    }

    case 'PIN_QUESTION_TO_CIRCLE': {
      const { error } = await supabase.from('circles').update({
        pinned_post_id: action.questionId,
      }).eq('id', action.circleId).eq('creator_id', userId);
      if (error) throw error;
      return action;
    }

    case 'UNPIN_QUESTION_FROM_CIRCLE': {
      const { error } = await supabase.from('circles').update({
        pinned_post_id: null,
      }).eq('id', action.circleId).eq('creator_id', userId);
      if (error) throw error;
      return action;
    }

    case 'TOGGLE_CHECKLIST_ITEM': {
      const had = state.checklistDone.includes(action.itemId);
      if (had) {
        const { error } = await supabase.from('checklist_progress').delete()
          .eq('user_id', userId).eq('item_id', action.itemId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('checklist_progress').insert({
          user_id: userId,
          item_id: action.itemId,
        });
        if (error) throw error;
      }
      return action;
    }

    case 'DISMISS_CHECKLIST_CARD': {
      const { error } = await supabase.from('profiles').update({
        checklist_card_dismissed: true,
      }).eq('id', userId);
      if (error) throw error;
      return action;
    }

    case 'SET_DIGEST_MODE': {
      const { error } = await supabase.from('profiles').update({
        digest_mode: action.mode,
      }).eq('id', userId);
      if (error) throw error;
      return action;
    }

    case 'ADD_REPORT': {
      const id = makeId('rep');
      const { error } = await supabase.from('reports').insert({
        id,
        reporter_id: userId,
        kind: action.report.kind,
        target_title: action.report.target,
        reason: action.report.reason,
        detail: action.report.detail || null,
      });
      if (error) throw error;
      return action;
    }

    case 'SUBMIT_EXPERT_APPLICATION': {
      const id = makeId('exapp');
      const { error } = await supabase.from('expert_applications').insert({
        id,
        user_id: userId,
        category: action.expertCircleId,
        custom_category: action.expertBadgeTitle,
        status: action.status,
      });
      if (error) throw error;
      if (action.status === 'approved') {
        const { error: profileErr } = await supabase.from('profiles').update({
          verified: true,
          verified_category: verifiedCategoryFromCircle(action.expertCircleId),
          profession: action.expertBadgeTitle,
          expert_badge_title: action.expertBadgeTitle,
          expert_circle_id: action.expertCircleId,
        }).eq('id', userId);
        if (profileErr) throw profileErr;
      }
      return action;
    }

    case 'SET_EXPERT_PROFESSIONAL_PROFILE': {
      const { error } = await supabase.from('profiles').update({
        expert_badge_title: action.expertBadgeTitle?.trim(),
        expert_circle_id: action.expertCircleId,
        profession: action.expertBadgeTitle?.trim(),
        verified_category: verifiedCategoryFromCircle(action.expertCircleId),
      }).eq('id', userId);
      if (error) throw error;
      return action;
    }

    default:
      return action;
  }
}
