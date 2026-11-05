// Global app state for Chautari. Official circles locally + Supabase for live content.
import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { milestoneCrossed, startOfLocalDay } from '../utils/format';
import { resolveUserId } from '../utils/navigation';
import { computeKarmaForUser } from '../utils/karma';
import { slugify, isCircleNameTaken, buildOfficialCircles, officialCircleIds } from './circles';
import { verifiedCategoryFromCircle } from '../utils/expertPost';
import { sanitizePhotoUrlsForStorage, sanitizeProfilePhoto } from '../utils/photos';
import { NEWCOMER_WINDOW_MS } from '../constants/newcomer';
import { isSupabaseConfigured } from '../lib/supabase';
import { getSession, onAuthStateChange } from '../services/auth';
import { fetchProfile, profileMetaFromRow, profileRowToUser } from '../services/profile';
import { isProfileComplete } from '../utils/email';
import { fetchLiveBundle, persistAction, shouldSyncAction, isValidUuid } from '../services/liveData';
import { inflightKeyForAction } from '../utils/dispatchGuards';

export const EXPERT_DAILY_POST_LIMIT = 2;
export const MEMBER_DAILY_POST_LIMIT = 5;

const countPostsToday = (questions, userId, bucket) => {
  const dayStart = startOfLocalDay();
  return questions.filter((q) => {
    if (q.authorId !== userId || q.createdAt < dayStart) return false;
    if (bucket === 'professional') return q.postedAsExpert === true;
    return q.postedAsExpert !== true;
  }).length;
};

const STORAGE_KEY = 'chautari.state.v3';
const LEGACY_STORAGE_KEY = 'chautari.state.v2';
let dispatchErrorHandler = null;

/** Toast bridge — registered by DispatchErrorBridge inside ToastProvider. */
export function registerDispatchErrorHandler(handler) {
  dispatchErrorHandler = handler;
}

const DataContext = createContext(null);

let idCounter = 1;
const uid = (p = 'id') => `${p}_${Date.now().toString(36)}_${idCounter++}`;

const sortQuestions = (list) => [...list].sort((a, b) => b.createdAt - a.createdAt);

function normalizeQuestion(q) {
  const circleId = q.circleId || q.category;
  const base = circleId ? { ...q, circleId } : { ...q };
  return {
    ...base,
    photos: sanitizePhotoUrlsForStorage(base.photos),
  };
}

function mergeQuestions(persisted = []) {
  return sortQuestions((persisted || []).map(normalizeQuestion));
}

function mergeCircles(persisted = []) {
  const byId = new Map((persisted || []).map((c) => [c.id, c]));
  for (const oc of buildOfficialCircles()) {
    const existing = byId.get(oc.id);
    if (!existing) {
      byId.set(oc.id, oc);
    } else {
      byId.set(oc.id, {
        ...existing,
        isOfficial: true,
        name: oc.name,
        handle: oc.handle,
        description: oc.description,
        icon: oc.icon,
        accentId: existing.accentId || oc.accentId,
      });
    }
  }
  return [...byId.values()];
}

function defaultJoinedCircles() {
  return officialCircleIds();
}

/** Official circles are permanent membership — always treated as joined. */
function computeEffectiveJoinedCircleIds(state) {
  const ids = new Set(state.joinedCircles);
  for (const c of state.circles) {
    if (c.isOfficial) ids.add(c.id);
  }
  return [...ids];
}

function mergeUsers(persisted = []) {
  return (persisted || []).map((u) => ({
    ...u,
    photo: sanitizeProfilePhoto(u.photo),
  }));
}

function buildInitialState() {
  return {
    booted: false,
    authReady: !isSupabaseConfigured(),
    authUserId: null,
    currentUserId: null, // null = signed out
    authHasName: false,
    authEmailVerified: false,
    authProfileName: '',
    users: [],
    circles: buildOfficialCircles(),
    joinedCircles: defaultJoinedCircles(),
    questions: [],
    following: [], // ids the current user follows
    notifications: [],
    myUpvotes: { questions: [], answers: [], replies: [] },
    savedQuestions: [], // bookmarked question ids
    reports: [],
    expertApplication: null, // { category, customCategory, status }
    expertUpvoteBonuses: {},
    digestMode: 'daily', // 'daily' | 'weekly' | 'off'
    checklistDone: [],
    checklistCardDismissed: false,
    newcomer: false,
    newcomerSince: null,
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'HYDRATE': {
      const p = action.payload;
      return {
        ...state,
        ...p,
        booted: true,
        users: mergeUsers(p.users || []).map((u) => {
          const user = u.id === 'me' ? { ...u, isFoundingMember: u.isFoundingMember ?? true } : u;
          return { ...user, photo: sanitizeProfilePhoto(user.photo) };
        }),
        questions: mergeQuestions(p.questions || []),
        myUpvotes: {
          questions: [],
          answers: [],
          replies: [],
          ...(p.myUpvotes || {}),
        },
        savedQuestions: p.savedQuestions || [],
        circles: mergeCircles(p.circles || []),
        joinedCircles: p.joinedCircles?.length ? p.joinedCircles : defaultJoinedCircles(),
        expertUpvoteBonuses: p.expertUpvoteBonuses || {},
        digestMode: p.digestMode || 'daily',
        checklistDone: p.checklistDone || [],
        checklistCardDismissed: !!p.checklistCardDismissed,
        newcomer: p.newcomer ?? (p.currentUserId === 'me'),
        newcomerSince: p.newcomerSince ?? (p.currentUserId === 'me' ? Date.now() : null),
        authHasName: !!p.authHasName,
        authEmailVerified: !!p.authEmailVerified,
        authProfileName: p.authProfileName || '',
      };
    }
    case 'BOOTED':
      return { ...state, booted: true };

    case 'AUTH_READY':
      return { ...state, authReady: true };

    case 'SET_AUTH':
      return { ...state, authUserId: action.userId };

    case 'SET_AUTH_PROFILE':
      return {
        ...state,
        authHasName: !!action.hasName,
        authEmailVerified: !!action.emailVerified,
        authProfileName: action.name || state.authProfileName || '',
      };

    case 'CLEAR_AUTH':
      return { ...state, authUserId: null, authHasName: false, authEmailVerified: false, authProfileName: '' };

    case 'CLEAR_LOCAL_SESSION':
      return { ...state, currentUserId: null };

    case 'RESTORE_SESSION': {
      const me = { ...profileRowToUser(action.profile), id: 'me' };
      const meta = profileMetaFromRow(action.profile);
      return {
        ...state,
        authUserId: action.userId,
        currentUserId: 'me',
        authHasName: true,
        authEmailVerified: true,
        users: [me, ...state.users.filter((u) => u.id !== 'me' && u.id !== action.userId)],
        following: state.following || [],
        notifications: state.notifications || [],
        joinedCircles: state.joinedCircles?.length ? state.joinedCircles : defaultJoinedCircles(),
        newcomer: meta.newcomer ?? false,
        newcomerSince: meta.newcomerSince ?? null,
        digestMode: meta.digestMode || state.digestMode,
        checklistCardDismissed: meta.checklistCardDismissed ?? state.checklistCardDismissed,
      };
    }

    case 'SIGN_UP': {
      const me = {
        id: 'me',
        name: action.name,
        suburb: null,
        photo: null,
        bio: '',
        verified: false,
        followers: 0,
        createdAt: Date.now(),
        isFoundingMember: true,
      };
      return {
        ...state,
        authUserId: action.authUserId ?? state.authUserId,
        currentUserId: 'me',
        authHasName: true,
        authEmailVerified: true,
        users: [me, ...state.users.filter((u) => u.id !== 'me' && u.id !== action.authUserId)],
        following: state.following || [],
        notifications: state.notifications || [],
        joinedCircles: defaultJoinedCircles(),
        newcomer: !!action.newcomer,
        newcomerSince: action.newcomer ? Date.now() : null,
      };
    }

    case 'UPDATE_PROFILE':
      return {
        ...state,
        users: state.users.map((u) => {
          if (u.id !== 'me') return u;
          const next = { ...u, ...action.patch };
          if ('photo' in action.patch) next.photo = sanitizeProfilePhoto(action.patch.photo);
          return next;
        }),
      };

    case 'LOGOUT':
      return { ...state, currentUserId: null, authUserId: null, authHasName: false, authEmailVerified: false, authProfileName: '' };

    case 'DELETE_ACCOUNT': {
      return buildInitialState();
    }

    case 'ASK_QUESTION': {
      const author = state.users.find((u) => u.id === 'me');
      const postedAsExpert = !!(author?.verified && action.postedAsExpert);
      if (postedAsExpert) {
        const proCount = countPostsToday(state.questions, 'me', 'professional');
        if (proCount >= EXPERT_DAILY_POST_LIMIT) return state;
      } else {
        const memberCount = countPostsToday(state.questions, 'me', 'member');
        if (memberCount >= MEMBER_DAILY_POST_LIMIT) return state;
      }
      const anonymous = postedAsExpert ? false : !!action.anonymous;
      const circleId = postedAsExpert && author?.expertCircleId
        ? author.expertCircleId
        : action.circleId;
      const q = {
        id: action.id || uid('q'),
        authorId: 'me',
        anonymous,
        circleId,
        title: action.title.trim(),
        body: action.body.trim(),
        photos: sanitizePhotoUrlsForStorage(action.photos || []),
        createdAt: Date.now(),
        upvotes: 0,
        views: 0,
        answers: [],
        ...(author?.verified ? {
          postedAsExpert,
          professionLabel: postedAsExpert ? (action.professionLabel || null) : null,
        } : {}),
      };
      return { ...state, questions: [q, ...state.questions] };
    }

    case 'MERGE_LIVE_DATA': {
      const p = action.payload;
      const liveQuestions = p.questions || [];
      const liveById = new Map(liveQuestions.map((q) => [q.id, q]));

      // Local optimistic posts from me not yet returned by the server.
      const localPending = state.questions.filter(
        (q) => !liveById.has(q.id) && q.authorId === 'me',
      );
      const mergedQuestions = sortQuestions([
        ...localPending,
        ...liveQuestions,
      ]);
      const usersById = new Map(state.users.map((u) => [u.id, u]));
      for (const u of p.users || []) {
        if (u.id === 'me') {
          const meUser = usersById.get('me');
          if (meUser) usersById.set('me', { ...meUser, ...u, id: 'me' });
          continue;
        }
        if (state.authUserId && u.id === state.authUserId) {
          const meUser = usersById.get('me');
          if (meUser) usersById.set('me', { ...meUser, ...u, id: 'me' });
          continue;
        }
        const existing = usersById.get(u.id);
        usersById.set(u.id, existing ? { ...existing, ...u } : u);
      }
      const uniq = (a, b) => [...new Set([...(a || []), ...(b || [])])];

      const liveCircles = (p.circles || []).filter((c) => c?.id && !c.isOfficial);
      const circlesById = new Map(state.circles.map((c) => [c.id, c]));
      for (const live of liveCircles) {
        const existing = circlesById.get(live.id);
        circlesById.set(live.id, existing ? { ...existing, ...live } : live);
      }

      return {
        ...state,
        questions: mergedQuestions,
        users: [...usersById.values()],
        circles: mergeCircles([...circlesById.values()]),
        myUpvotes: {
          questions: uniq(state.myUpvotes.questions, p.myUpvotes?.questions),
          answers: uniq(state.myUpvotes.answers, p.myUpvotes?.answers),
          replies: uniq(state.myUpvotes.replies, p.myUpvotes?.replies),
        },
        savedQuestions: uniq(state.savedQuestions, p.savedQuestions),
        following: uniq(
          (state.following || []).filter(isValidUuid),
          (p.following || []).filter(isValidUuid),
        ),
        joinedCircles: p.joinedCircles?.length
          ? uniq(state.joinedCircles, p.joinedCircles)
          : state.joinedCircles,
        checklistDone: uniq(state.checklistDone, p.checklistDone),
      };
    }

    case 'ADD_ANSWER': {
      const answer = {
        id: action.id || uid('a'),
        authorId: 'me',
        anonymous: action.anonymous,
        body: action.body.trim(),
        photo: action.photoUrl || null,
        createdAt: Date.now(),
        upvotes: 0,
        replies: [],
      };
      return {
        ...state,
        questions: state.questions.map((q) =>
          q.id === action.questionId ? { ...q, answers: [...q.answers, answer] } : q
        ),
      };
    }

    case 'ADD_REPLY': {
      const author = state.users.find((u) => u.id === 'me');
      const postedAsExpert = !!(author?.verified && action.postedAsExpert);
      const reply = {
        id: action.id || uid('r'),
        authorId: 'me',
        anonymous: action.anonymous,
        body: action.body.trim(),
        photo: action.photoUrl || null,
        createdAt: Date.now(),
        upvotes: 0,
        ...(author?.verified ? {
          postedAsExpert,
          professionLabel: postedAsExpert ? (action.professionLabel || null) : null,
        } : {}),
      };
      return {
        ...state,
        questions: state.questions.map((q) =>
          q.id !== action.questionId
            ? q
            : {
                ...q,
                answers: q.answers.map((a) =>
                  a.id === action.answerId ? { ...a, replies: [...(a.replies || []), reply] } : a
                ),
              }
        ),
      };
    }

    case 'TOGGLE_UPVOTE_QUESTION': {
      const has = state.myUpvotes.questions.includes(action.questionId);
      const delta = has ? -1 : 1;
      return {
        ...state,
        myUpvotes: {
          ...state.myUpvotes,
          questions: has
            ? state.myUpvotes.questions.filter((id) => id !== action.questionId)
            : [...state.myUpvotes.questions, action.questionId],
        },
        questions: state.questions.map((q) =>
          q.id === action.questionId ? { ...q, upvotes: Math.max(0, q.upvotes + delta) } : q
        ),
      };
    }

    case 'TOGGLE_SAVE_QUESTION': {
      const has = state.savedQuestions.includes(action.questionId);
      return {
        ...state,
        savedQuestions: has
          ? state.savedQuestions.filter((id) => id !== action.questionId)
          : [...state.savedQuestions, action.questionId],
      };
    }

    case 'TOGGLE_UPVOTE_ANSWER': {
      const has = state.myUpvotes.answers.includes(action.answerId);
      const delta = has ? -1 : 1;
      const meUser = state.users.find((u) => u.id === 'me');
      let milestoneNote = null;
      let answerAuthorId = null;
      let questionIdForBonus = null;

      const questions = state.questions.map((q) => ({
        ...q,
        answers: q.answers.map((a) => {
          if (a.id !== action.answerId) return a;
          answerAuthorId = a.authorId;
          questionIdForBonus = q.id;
          const next = Math.max(0, a.upvotes + delta);
          const m = milestoneCrossed(a.upvotes, next);
          if (m) {
            milestoneNote = {
              id: uid('n'),
              type: 'milestone',
              questionId: q.id,
              milestone: m,
              text: `An answer you upvoted just hit ${m} upvotes 🎉`,
              createdAt: Date.now(),
              read: false,
            };
          }
          return { ...a, upvotes: next };
        }),
      }));

      let expertUpvoteBonuses = { ...state.expertUpvoteBonuses };
      if (!has && delta > 0 && meUser?.verified && answerAuthorId && answerAuthorId !== 'me') {
        expertUpvoteBonuses[answerAuthorId] = (expertUpvoteBonuses[answerAuthorId] || 0) + 1;
      } else if (has && meUser?.verified && answerAuthorId && answerAuthorId !== 'me') {
        expertUpvoteBonuses[answerAuthorId] = Math.max(0, (expertUpvoteBonuses[answerAuthorId] || 0) - 1);
      }

      const newNotifs = [milestoneNote].filter(Boolean);
      return {
        ...state,
        myUpvotes: {
          ...state.myUpvotes,
          answers: has
            ? state.myUpvotes.answers.filter((id) => id !== action.answerId)
            : [...state.myUpvotes.answers, action.answerId],
        },
        questions,
        expertUpvoteBonuses,
        notifications: newNotifs.length ? [...newNotifs, ...state.notifications] : state.notifications,
      };
    }

    case 'TOGGLE_UPVOTE_REPLY': {
      const has = state.myUpvotes.replies.includes(action.replyId);
      const delta = has ? -1 : 1;
      return {
        ...state,
        myUpvotes: {
          ...state.myUpvotes,
          replies: has
            ? state.myUpvotes.replies.filter((id) => id !== action.replyId)
            : [...state.myUpvotes.replies, action.replyId],
        },
        questions: state.questions.map((q) => ({
          ...q,
          answers: q.answers.map((a) => ({
            ...a,
            replies: (a.replies || []).map((r) =>
              r.id === action.replyId ? { ...r, upvotes: Math.max(0, r.upvotes + delta) } : r
            ),
          })),
        })),
      };
    }

    case 'TOGGLE_FOLLOW': {
      const userId = resolveUserId(action.userId, state.authUserId);
      if (userId === 'me') return state;
      const has = state.following.some((id) => resolveUserId(id, state.authUserId) === userId);
      return {
        ...state,
        following: has
          ? state.following.filter((id) => resolveUserId(id, state.authUserId) !== userId)
          : [...state.following.filter((id) => resolveUserId(id, state.authUserId) !== userId), userId],
        users: state.users.map((u) =>
          u.id === userId
            ? { ...u, followers: Math.max(0, (u.followers || 0) + (has ? -1 : 1)) }
            : u
        ),
      };
    }

    case 'DELETE_QUESTION':
      return { ...state, questions: state.questions.filter((q) => q.id !== action.questionId) };

    case 'MARK_NOTIFS_READ':
      return { ...state, notifications: state.notifications.map((n) => ({ ...n, read: true })) };

    case 'SUBMIT_EXPERT_APPLICATION':
      return {
        ...state,
        expertApplication: {
          expertBadgeTitle: action.expertBadgeTitle,
          expertCircleId: action.expertCircleId,
          credentialName: action.credentialName || null,
          credentialUrl: action.credentialUrl || null,
          status: action.status,
          submittedAt: Date.now(),
        },
        users:
          action.status === 'approved'
            ? state.users.map((u) =>
                u.id === 'me'
                  ? {
                      ...u,
                      verified: true,
                      verifiedCategory: verifiedCategoryFromCircle(action.expertCircleId),
                      profession: action.expertBadgeTitle,
                      expertBadgeTitle: action.expertBadgeTitle,
                      expertCircleId: action.expertCircleId,
                    }
                  : u
              )
            : state.users,
      };

    case 'SET_EXPERT_PROFESSIONAL_PROFILE': {
      const title = action.expertBadgeTitle?.trim();
      if (!title || !action.expertCircleId) return state;
      return {
        ...state,
        users: state.users.map((u) =>
          u.id === 'me'
            ? {
                ...u,
                expertBadgeTitle: title,
                expertCircleId: action.expertCircleId,
                profession: title,
                verifiedCategory: verifiedCategoryFromCircle(action.expertCircleId),
              }
            : u
        ),
      };
    }

    case 'ADD_REPORT':
      return { ...state, reports: [...state.reports, { id: uid('rep'), ...action.report, createdAt: Date.now() }] };

    case 'ADD_NOTIFICATION': {
      const n = { id: uid('n'), read: false, ...action.notification };
      return { ...state, notifications: [n, ...state.notifications] };
    }

    case 'CREATE_CIRCLE': {
      const name = action.name.trim();
      if (!name || isCircleNameTaken(name, state.circles)) return state;
      const id = action.id || action.circleId || uid('c');
      const circle = {
        id,
        name,
        handle: slugify(name),
        description: action.description.trim(),
        icon: action.icon,
        accentId: action.accentId,
        imageUrl: action.imageUrl || null,
        creatorId: 'me',
        memberCount: 1,
        createdAt: Date.now(),
        isOfficial: false,
      };
      return {
        ...state,
        circles: [circle, ...state.circles],
        joinedCircles: [...state.joinedCircles, id],
      };
    }

    case 'TOGGLE_JOIN_CIRCLE': {
      const { circleId } = action;
      const circle = state.circles.find((c) => c.id === circleId);
      if (circle?.isOfficial) return state;
      const has = state.joinedCircles.includes(circleId);
      const joinedCircles = has
        ? state.joinedCircles.filter((id) => id !== circleId)
        : [...state.joinedCircles, circleId];
      const delta = has ? -1 : 1;
      return {
        ...state,
        joinedCircles,
        circles: state.circles.map((c) =>
          c.id === circleId ? { ...c, memberCount: Math.max(0, (c.memberCount || 0) + delta) } : c
        ),
      };
    }

    case 'SET_DIGEST_MODE':
      return { ...state, digestMode: action.mode };

    case 'UPDATE_CIRCLE': {
      const circle = state.circles.find((c) => c.id === action.circleId);
      if (!circle || circle.isOfficial || circle.creatorId !== 'me') return state;
      const name = action.name?.trim();
      if (!name || isCircleNameTaken(name, state.circles, action.circleId)) return state;
      return {
        ...state,
        circles: state.circles.map((c) =>
          c.id === action.circleId
            ? {
                ...c,
                name,
                handle: slugify(name),
                description: action.description.trim(),
                accentId: action.accentId,
                ...(action.imageUrl !== undefined ? { imageUrl: action.imageUrl } : {}),
              }
            : c
        ),
      };
    }

    case 'PIN_QUESTION_TO_CIRCLE': {
      const circle = state.circles.find((c) => c.id === action.circleId);
      const question = state.questions.find((q) => q.id === action.questionId);
      if (!circle || circle.isOfficial || circle.creatorId !== 'me') return state;
      if (!question || question.circleId !== action.circleId) return state;
      return {
        ...state,
        circles: state.circles.map((c) =>
          c.id === action.circleId ? { ...c, pinnedQuestionId: action.questionId } : c
        ),
      };
    }

    case 'TOGGLE_CHECKLIST_ITEM': {
      const has = state.checklistDone.includes(action.itemId);
      return {
        ...state,
        checklistDone: has
          ? state.checklistDone.filter((id) => id !== action.itemId)
          : [...state.checklistDone, action.itemId],
      };
    }

    case 'DISMISS_CHECKLIST_CARD':
      return { ...state, checklistCardDismissed: true };

    case 'UNPIN_QUESTION_FROM_CIRCLE': {
      const circle = state.circles.find((c) => c.id === action.circleId);
      if (!circle || circle.isOfficial || circle.creatorId !== 'me') return state;
      if (circle.pinnedQuestionId !== action.questionId) return state;
      return {
        ...state,
        circles: state.circles.map((c) =>
          c.id === action.circleId ? { ...c, pinnedQuestionId: null } : c
        ),
      };
    }

    default:
      return state;
  }
}

export function DataProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, buildInitialState);
  const hydrated = useRef(false);
  const stateRef = useRef(state);
  const inFlightActions = useRef(new Set());
  stateRef.current = state;

  // Load persisted state, then reconcile Supabase auth session.
  useEffect(() => {
    let authSub;
    let mounted = true;
    (async () => {
      try {
        await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          try {
            dispatch({ type: 'HYDRATE', payload: JSON.parse(raw) });
          } catch (parseErr) {
            console.warn('[storage] Failed to parse persisted state — starting fresh:', parseErr?.message || parseErr);
            dispatch({ type: 'BOOTED' });
          }
        } else {
          dispatch({ type: 'BOOTED' });
        }
      } catch (e) {
        console.warn('[storage] Failed to read persisted state:', e?.message || e);
        dispatch({ type: 'BOOTED' });
      } finally {
        hydrated.current = true;
      }

      if (!isSupabaseConfigured()) {
        dispatch({ type: 'AUTH_READY' });
        return;
      }

      try {
        const session = await getSession();
        if (session?.user) {
          dispatch({ type: 'SET_AUTH', userId: session.user.id });
          const row = await fetchProfile(session.user.id);
          dispatch({
            type: 'SET_AUTH_PROFILE',
            hasName: !!row?.name?.trim(),
            emailVerified: !!row?.email_verified_at,
            name: row?.name || '',
          });
          if (isProfileComplete(row)) {
            dispatch({ type: 'RESTORE_SESSION', userId: session.user.id, profile: row });
          } else {
            dispatch({ type: 'CLEAR_LOCAL_SESSION' });
          }
        } else {
          dispatch({ type: 'CLEAR_LOCAL_SESSION' });
        }
      } catch (e) {
        console.warn('Supabase auth restore failed:', e?.message || e);
        dispatch({ type: 'CLEAR_LOCAL_SESSION' });
      } finally {
        dispatch({ type: 'AUTH_READY' });
      }

      if (mounted) {
        authSub = onAuthStateChange((event) => {
          if (event === 'SIGNED_OUT') {
            dispatch({ type: 'CLEAR_LOCAL_SESSION' });
            dispatch({ type: 'CLEAR_AUTH' });
          }
        });
      }
    })();
    return () => {
      mounted = false;
      authSub?.data?.subscription?.unsubscribe();
    };
  }, []);

  // Load Supabase Q&A + social state for signed-in user.
  useEffect(() => {
    if (!state.authUserId || !state.currentUserId || !state.authReady) return;
    if (!isSupabaseConfigured()) return;
    let cancelled = false;
    (async () => {
      try {
        const bundle = await fetchLiveBundle(state.authUserId);
        if (!cancelled) dispatch({ type: 'MERGE_LIVE_DATA', payload: bundle });
      } catch (e) {
        console.warn('Failed to load Supabase data:', e?.message || e);
      }
    })();
    return () => { cancelled = true; };
  }, [state.authUserId, state.currentUserId, state.authReady]);

  // Persist on change (after first hydration).
  useEffect(() => {
    if (!hydrated.current || !state.booted) return;
    const { booted, authReady, authUserId, ...toSave } = state;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toSave)).catch((e) => {
      console.warn('[storage] Failed to persist app state:', e?.message || e);
    });
  }, [state]);

  const syncDispatch = React.useCallback(async (action) => {
    const flightKey = inflightKeyForAction(action);
    if (flightKey) {
      if (inFlightActions.current.has(flightKey)) {
        return { ok: true, skipped: true };
      }
      inFlightActions.current.add(flightKey);
    }

    try {
      const snap = stateRef.current;
      let next = action;
      if (isSupabaseConfigured() && snap.authUserId && shouldSyncAction(action)) {
        next = await persistAction(action, snap, snap.authUserId);
      }
      dispatch(next);
      return { ok: true };
    } catch (e) {
      console.warn('[dispatch]', action?.type, e?.message || e);
      dispatchErrorHandler?.("Couldn't save — check your connection.");
      return { ok: false, error: e };
    } finally {
      if (flightKey) inFlightActions.current.delete(flightKey);
    }
  }, []);

  /** Re-query Supabase and merge into local state (uses raw dispatch, not syncDispatch). */
  const refreshFromServer = React.useCallback(async () => {
    const authUserId = stateRef.current.authUserId;
    if (!authUserId || !isSupabaseConfigured()) return null;
    const bundle = await fetchLiveBundle(authUserId);
    dispatch({ type: 'MERGE_LIVE_DATA', payload: bundle });
    return bundle;
  }, []);

  const value = useMemo(
    () => ({ state, dispatch: syncDispatch, refreshFromServer }),
    [state, syncDispatch, refreshFromServer],
  );
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}

// ---- Selectors / helpers (hook form) -----------------------------------
export function useSelectors() {
  const { state } = useData();
  const resolveId = (id) => resolveUserId(id, state.authUserId);
  const userById = (id) => {
    const resolved = resolveId(id);
    return state.users.find((u) => u.id === resolved) || null;
  };
  const me = () => userById('me');
  const isFollowing = (id) => {
    const resolved = resolveId(id);
    return state.following.includes(resolved) || state.following.includes(id);
  };
  const hasUpvotedQuestion = (id) => state.myUpvotes.questions.includes(id);
  const hasUpvotedAnswer = (id) => state.myUpvotes.answers.includes(id);
  const hasUpvotedReply = (id) => state.myUpvotes.replies.includes(id);
  const isSaved = (id) => state.savedQuestions.includes(id);
  const savedQuestionsList = () =>
    state.savedQuestions
      .map((id) => state.questions.find((q) => q.id === id))
      .filter(Boolean);
  const questionById = (id) => state.questions.find((q) => q.id === id) || null;

  const answerCount = (q) => (q.answers || []).reduce((n, a) => n + 1 + (a.replies?.length || 0), 0);

  // "Alive" signals --------------------------------------------------------
  // The earliest non-anonymous verified-expert answer on a question, if any.
  const expertAnswerOn = (q) => {
    const expert = (q.answers || [])
      .filter((a) => !a.anonymous && userById(a.authorId)?.verified)
      .sort((a, b) => a.createdAt - b.createdAt)[0];
    if (!expert) return null;
    return { answer: expert, expert: userById(expert.authorId) };
  };
  const hasExpertAnswer = (q) => !!expertAnswerOn(q);

  // Questions posted in the last 24h — drives the "X new today" live pill.
  const newTodayCount = () => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return state.questions.filter((q) => q.createdAt >= cutoff).length;
  };

  // Experts the signed-in user does not yet follow — for the empty Following tab
  // and discovery prompts.
  const suggestedExperts = (limit = 3) =>
    state.users
      .filter((u) => u.verified && u.id !== 'me' && !state.following.includes(u.id))
      .sort((a, b) => (b.followers || 0) - (a.followers || 0))
      .slice(0, limit);

  const circleById = (id) => state.circles.find((c) => c.id === id) || null;
  const isJoinedCircle = (id) => {
    const c = circleById(id);
    if (c?.isOfficial) return true;
    return state.joinedCircles.includes(id);
  };
  const effectiveJoinedCircleIds = () => computeEffectiveJoinedCircleIds(state);
  const joinedCirclesList = () =>
    computeEffectiveJoinedCircleIds(state).map((id) => circleById(id)).filter(Boolean);
  const joinedUserCirclesList = () =>
    state.joinedCircles
      .map((id) => circleById(id))
      .filter((c) => c && !c.isOfficial);
  const officialCircles = () => state.circles.filter((c) => c.isOfficial);
  const userCircles = () => state.circles.filter((c) => !c.isOfficial);

  const circleQuestionCount = (circleId) =>
    state.questions.filter((q) => q.circleId === circleId).length;

  const circleActivitySince = (circleId, sinceMs = 24 * 60 * 60 * 1000) => {
    const cutoff = Date.now() - sinceMs;
    return state.questions.filter((q) => q.circleId === circleId && q.createdAt >= cutoff).length;
  };

  const pinnedQuestionInCircle = (circleId) => {
    const circle = circleById(circleId);
    if (!circle?.pinnedQuestionId) return null;
    return questionById(circle.pinnedQuestionId);
  };

  const questionsInCircle = (circleId, { excludePinned = true } = {}) => {
    const circle = circleById(circleId);
    const pinned = excludePinned ? circle?.pinnedQuestionId : null;
    return sortQuestions(
      state.questions.filter((q) => q.circleId === circleId && q.id !== pinned),
    );
  };

  const expertsInCircle = (circleId) => {
    const expertIds = new Set();
    for (const q of state.questions) {
      if (q.circleId !== circleId) continue;
      for (const a of q.answers || []) {
        if (a.anonymous) continue;
        const u = userById(a.authorId);
        if (u?.verified) expertIds.add(u.id);
      }
    }
    return [...expertIds].map((id) => userById(id)).filter(Boolean);
  };

  const isCircleCreator = (circleId) => {
    const c = circleById(circleId);
    return !!c && !c.isOfficial && c.creatorId === 'me';
  };

  const recommendedCircles = (limit = 5) => {
    const joined = new Set(state.joinedCircles);
    const joinedWords = new Set();
    state.circles
      .filter((c) => joined.has(c.id))
      .forEach((c) => {
        `${c.name} ${c.description}`.toLowerCase().split(/\W+/).forEach((w) => {
          if (w.length > 3) joinedWords.add(w);
        });
      });
    return state.circles
      .filter((c) => !c.isOfficial && !joined.has(c.id))
      .map((c) => {
        let score = c.memberCount || 0;
        `${c.name} ${c.description}`.toLowerCase().split(/\W+/).forEach((w) => {
          if (joinedWords.has(w)) score += 45;
        });
        return { c, score };
      })
      .sort((a, b) => b.score - a.score || b.c.createdAt - a.c.createdAt)
      .slice(0, limit)
      .map((x) => x.c);
  };

  const feedQuestions = () => sortQuestions(state.questions);

  // For You: legacy selector — Home uses src/hooks/useForYouFeed.js + src/feed/* instead.
  const forYouFeed = () => {
    const joined = new Set(state.joinedCircles);
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return [...state.questions]
      .map((q) => {
        let score = (q.upvotes || 0) * 2 + (q.answers?.length || 0) * 4;
        if (joined.has(q.circleId)) score += 40;
        if (q.createdAt >= dayAgo) score += 25;
        score += q.createdAt / 1e12;
        return { q, score };
      })
      .sort((a, b) => b.score - a.score)
      .map((x) => x.q);
  };

  const followingFeed = () =>
    sortQuestions(
      state.questions.filter((q) => {
        if (state.following.includes(q.authorId)) return true;
        return (q.answers || []).some((a) => state.following.includes(a.authorId));
      }),
    );

  const karmaFor = (userId) => computeKarmaForUser(state, userId);

  const experts = () => {
    const authId = state.authUserId;
    const hasMe = state.users.some((u) => u.id === 'me');
    return state.users.filter((u) => {
      if (!u.verified) return false;
      if (hasMe && u.id === authId) return false;
      return true;
    });
  };
  const myQuestions = () => sortQuestions(state.questions.filter((q) => q.authorId === 'me'));
  const questionsByAuthor = (id) => {
    const resolved = resolveId(id);
    return sortQuestions(state.questions.filter((q) => resolveId(q.authorId) === resolved));
  };
  const expertAuthoredQuestions = () =>
    sortQuestions(
      state.questions.filter((q) => !q.anonymous && userById(q.authorId)?.verified),
    );

  const expertProfessionalPostsToday = (userId = 'me') =>
    countPostsToday(state.questions, userId, 'professional');
  const expertProfessionalPostsRemaining = (userId = 'me') =>
    Math.max(0, EXPERT_DAILY_POST_LIMIT - expertProfessionalPostsToday(userId));
  const canExpertPostProfessionalToday = () => {
    const user = me();
    if (!user?.verified) return true;
    return expertProfessionalPostsToday() < EXPERT_DAILY_POST_LIMIT;
  };

  const memberPostsToday = (userId = 'me') =>
    countPostsToday(state.questions, userId, 'member');
  const memberPostsRemaining = (userId = 'me') =>
    Math.max(0, MEMBER_DAILY_POST_LIMIT - memberPostsToday(userId));
  const canPostMemberToday = () => memberPostsToday() < MEMBER_DAILY_POST_LIMIT;

  const canOpenComposerToday = () => {
    const user = me();
    if (!user?.verified) return canPostMemberToday();
    return canExpertPostProfessionalToday() || canPostMemberToday();
  };

  // Legacy aliases — professional bucket only
  const expertPostsToday = expertProfessionalPostsToday;
  const expertPostsRemaining = expertProfessionalPostsRemaining;
  const canExpertPostToday = canExpertPostProfessionalToday;
  const unreadNotifs = () => state.notifications.filter((n) => !n.read).length;

  const isChecklistItemDone = (itemId) => state.checklistDone.includes(itemId);
  const checklistDoneCount = () => state.checklistDone.length;
  const isQuestionOwner = (q) => !!q && q.authorId === 'me';

  const isNewcomerActive = () =>
    !!state.newcomer
    && !!state.newcomerSince
    && Date.now() - state.newcomerSince < NEWCOMER_WINDOW_MS;

  return {
    state, userById, me, isFollowing,
    hasUpvotedQuestion, hasUpvotedAnswer, hasUpvotedReply, isSaved,
    questionById, answerCount, feedQuestions, forYouFeed, followingFeed, experts,
    myQuestions, questionsByAuthor, expertAuthoredQuestions, savedQuestionsList, unreadNotifs,
    expertAnswerOn, hasExpertAnswer, newTodayCount, suggestedExperts,
    expertPostsToday, expertPostsRemaining, canExpertPostToday, expertDailyPostLimit: EXPERT_DAILY_POST_LIMIT,
    expertProfessionalPostsToday, expertProfessionalPostsRemaining, canExpertPostProfessionalToday,
    memberPostsToday, memberPostsRemaining, canPostMemberToday, memberDailyPostLimit: MEMBER_DAILY_POST_LIMIT,
    canOpenComposerToday,
    circleById, isJoinedCircle, effectiveJoinedCircleIds, joinedCirclesList, joinedUserCirclesList, officialCircles, userCircles,
    circleQuestionCount, circleActivitySince, questionsInCircle, pinnedQuestionInCircle,
    expertsInCircle, isCircleCreator, recommendedCircles, karmaFor,
    isChecklistItemDone, checklistDoneCount, isQuestionOwner, isNewcomerActive,
  };
}
