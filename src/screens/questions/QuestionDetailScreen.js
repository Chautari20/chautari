import React, { useMemo, useState, useLayoutEffect, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Alert, Platform, Keyboard, Switch, RefreshControl } from 'react-native';
import MissingParamsFallback from '../../components/common/MissingParamsFallback';
import KeyboardScreen from '../../components/common/KeyboardScreen';
import Avatar from '../../components/common/Avatar';
import VerifiedBadge from '../../components/common/VerifiedBadge';
import UpvoteButton from '../../components/question/UpvoteButton';
import CircleChip from '../../components/circles/CircleChip';
import KarmaBadge from '../../components/common/KarmaBadge';
import ContentPhoto from '../../components/question/ContentPhoto';
import PhotoStrip from '../../components/question/PhotoStrip';
import PhotoSourceSheet from '../../components/question/PhotoSourceSheet';
import { CharCount } from '../../components/common/ui';
import { useToast } from '../../components/common/Toast';
import { useData, useSelectors } from '../../data/store';
import { useNetwork } from '../../data/network';
import ExpertPostModeToggle from '../../components/question/ExpertPostModeToggle';
import ExpertProfessionalConfirm from '../../components/question/ExpertProfessionalConfirm';
import { useNavigationGuard, runAfterAlert, openAuthorProfile } from '../../utils/navigation';
import { useAndroidBackHandler } from '../../hooks/useGoBack';
import { useFocusEffect } from '@react-navigation/native';
import { showsExpertBadge, displayProfessionLabel, hasExpertProfessionalProfile } from '../../utils/expertPost';
import { timeAgo, displayAuthor, compactNumber } from '../../utils/format';
import { useTheme } from '../../theme/ThemeContext';
import { useImagePicker } from '../../hooks/useImagePicker';
import { useLiveDataRefresh } from '../../hooks/useLiveDataRefresh';
import { isSupabaseConfigured } from '../../lib/supabase';
import { uploadAnswerPhoto, uploadReplyPhoto } from '../../services/mediaStorage';
import { normalizeDisplayPhotoUrls } from '../../utils/photos';
import { ENABLE_REPLY_PHOTOS } from '../../constants/media';

// User-facing model: Post → Answers → Replies to an answer (one layer).
// Internally a "post" is still a question row.
// Answers and replies accept any length — only an empty body is rejected.
const ANSWER_COMPOSER = '__answer__';

// Renders text with visually distinct links (links allowed in answers/replies).
function BodyText({ children, style, linkStyle }) {
  const parts = String(children).split(/(https?:\/\/[^\s]+)/g);
  return (
    <Text style={style}>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? <Text key={i} style={linkStyle}>{p}</Text> : p
      )}
    </Text>
  );
}

export default function QuestionDetailScreen({ navigation, route }) {
  const { questionId, justPosted } = route.params || {};
  const { dispatch } = useData();
  const { questionById, userById, circleById, karmaFor, hasUpvotedAnswer, hasUpvotedReply, hasUpvotedQuestion, isSaved, isCircleCreator, isQuestionOwner, state, me } = useSelectors();
  const showToast = useToast();
  const { online } = useNetwork();
  const { pickFromLibrary } = useImagePicker();
  const { navigate, goBack } = useNavigationGuard(navigation);
  useAndroidBackHandler(goBack);
  const { colors, spacing, font, radius, line, shadow } = useTheme();
  const styles = useMemo(() => createStyles(colors, spacing, font, radius, line, shadow), [colors, spacing, font, radius, line, shadow]);
  const question = questionById(questionId);
  const isMine = question && isQuestionOwner(question);
  const saved = isSaved(questionId);
  const qUpvoted = hasUpvotedQuestion(questionId);
  const [activeBottomComposer, setActiveBottomComposer] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyPhoto, setReplyPhoto] = useState(null);
  const [replyPickerOpen, setReplyPickerOpen] = useState(false);
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [replyPostMode, setReplyPostMode] = useState('member');
  const [answerText, setAnswerText] = useState('');
  const [answerPhoto, setAnswerPhoto] = useState(null);
  const [answerAnonymous, setAnswerAnonymous] = useState(false);
  const [answerPickerOpen, setAnswerPickerOpen] = useState(false);
  const [answerSubmitting, setAnswerSubmitting] = useState(false);
  const answerSelection = useRef({ start: 0, end: 0 });
  const [sort, setSort] = useState('top'); // 'top' | 'new' — for community answers
  const scrollRef = useRef(null);
  const answerOffsets = useRef({});
  const answersSectionY = useRef(0);
  const pendingProfessionalReply = useRef(false);
  const refreshLiveData = useLiveDataRefresh({ onFocus: true });
  const [detailRefreshing, setDetailRefreshing] = useState(false);

  const onDetailRefresh = useCallback(async () => {
    setDetailRefreshing(true);
    try {
      await refreshLiveData();
    } finally {
      setDetailRefreshing(false);
    }
  }, [refreshLiveData]);

  const scrollToAnswer = useCallback((answerId) => {
    const y = answerOffsets.current[answerId];
    if (y == null || !scrollRef.current) return;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
    });
  }, []);

  const scrollToAnswersSection = useCallback(() => {
    if (!scrollRef.current) return;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, answersSectionY.current - 12), animated: true });
    });
  }, []);

  const cancelBottomComposer = useCallback(() => {
    Keyboard.dismiss();
    setActiveBottomComposer(null);
    setReplyText('');
    setReplyPhoto(null);
    setReplyPostMode('member');
    setAnswerText('');
    setAnswerPhoto(null);
    setAnswerAnonymous(false);
  }, []);

  const openReply = useCallback((answerId) => {
    if (activeBottomComposer === answerId) {
      cancelBottomComposer();
      return;
    }
    setReplyText('');
    setReplyPhoto(null);
    setReplyPostMode('member');
    setAnswerText('');
    setAnswerPhoto(null);
    setAnswerAnonymous(false);
    setActiveBottomComposer(answerId);
    requestAnimationFrame(() => scrollToAnswer(answerId));
  }, [activeBottomComposer, cancelBottomComposer, scrollToAnswer]);

  const openAnswer = useCallback(() => {
    if (activeBottomComposer === ANSWER_COMPOSER) {
      cancelBottomComposer();
      return;
    }
    setReplyText('');
    setReplyPhoto(null);
    setReplyPostMode('member');
    setAnswerText('');
    setAnswerPhoto(null);
    setAnswerAnonymous(false);
    setActiveBottomComposer(ANSWER_COMPOSER);
    requestAnimationFrame(scrollToAnswersSection);
  }, [activeBottomComposer, cancelBottomComposer, scrollToAnswersSection]);

  useFocusEffect(useCallback(() => {
    const u = me();
    if (pendingProfessionalReply.current && hasExpertProfessionalProfile(u)) {
      pendingProfessionalReply.current = false;
      setReplyPostMode('professional');
    }
  }, [state.users]));

  useEffect(() => {
    if (!activeBottomComposer) return undefined;
    const event = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const sub = Keyboard.addListener(event, () => {
      if (activeBottomComposer === ANSWER_COMPOSER) scrollToAnswersSection();
      else scrollToAnswer(activeBottomComposer);
    });
    return () => sub.remove();
  }, [activeBottomComposer, scrollToAnswer, scrollToAnswersSection]);

  const openMenu = useCallback(() => {
    if (!question) return;
    const options = [];
    const circle = circleById(question.circleId);
    const canPin = isCircleCreator(question.circleId);
    if (canPin) {
      const pinned = circle?.pinnedQuestionId === questionId;
      options.push({
        text: pinned ? 'Unpin from circle' : 'Pin to circle',
        onPress: async () => {
          if (pinned) {
            const res = await dispatch({ type: 'UNPIN_QUESTION_FROM_CIRCLE', circleId: question.circleId, questionId });
            if (res?.ok === false) return;
            showToast('Unpinned from circle', { tone: 'default' });
          } else {
            const res = await dispatch({ type: 'PIN_QUESTION_TO_CIRCLE', circleId: question.circleId, questionId });
            if (res?.ok === false) return;
            showToast('Pinned to circle', { tone: 'success' });
          }
        },
      });
    }
    if (isMine) {
      options.push({
        text: 'Delete post',
        style: 'destructive',
        onPress: () => {
          runAfterAlert(async () => {
            goBack();
            try {
              const res = await dispatch({ type: 'DELETE_QUESTION', questionId });
              if (res?.ok === false) throw res.error || new Error('Could not delete');
              showToast('Post deleted', { tone: 'success' });
            } catch (e) {
              Alert.alert('Could not delete', e?.message || 'Try again.');
            }
          });
        },
      });
    } else {
      options.push({ text: 'Report post', style: 'destructive', onPress: () => navigate('Report', { kind: 'content', targetTitle: question.title }) });
    }
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert(isMine ? 'Your post' : 'Post options', null, options);
  }, [question, isMine, dispatch, questionId, showToast, navigate, goBack, circleById, isCircleCreator]);

  const toggleSave = useCallback(async () => {
    const wasSaved = isSaved(questionId);
    const res = await dispatch({ type: 'TOGGLE_SAVE_QUESTION', questionId });
    if (res?.ok === false) return;
    showToast(wasSaved ? 'Removed from saved' : 'Saved for later', { tone: wasSaved ? 'default' : 'success' });
  }, [dispatch, questionId, showToast, isSaved]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Pressable onPress={toggleSave} hitSlop={10}>
            <Text style={{ fontSize: 20, color: saved ? colors.primary : colors.textMuted }}>{saved ? '🔖' : '🔖'}</Text>
          </Pressable>
          <Pressable onPress={openMenu} hitSlop={10}>
            <Text style={{ fontSize: 20, color: colors.textMuted }}>⋯</Text>
          </Pressable>
        </View>
      ),
    });
  }, [navigation, question, isMine, saved, colors, toggleSave, openMenu]);

  // Split: verified-expert answers pinned to the top, community answers below.
  const { pinned, community } = useMemo(() => {
    if (!question) return { pinned: [], community: [] };
    const isExpert = (a) => !a.anonymous && userById(a.authorId)?.verified;
    const pin = question.answers.filter(isExpert).sort((a, b) => b.upvotes - a.upvotes || a.createdAt - b.createdAt);
    const com = question.answers.filter((a) => !isExpert(a));
    com.sort((a, b) => (sort === 'top' ? b.upvotes - a.upvotes || b.createdAt - a.createdAt : b.createdAt - a.createdAt));
    return { pinned: pin, community: com };
  }, [question, state.users, sort]);

  if (!questionId) {
    return (
      <MissingParamsFallback
        navigation={navigation}
        title="This post couldn't be loaded"
        message="The link may be incomplete or expired. Go back and try opening the post again."
      />
    );
  }

  if (!question) {
    return <View style={styles.container}><Text style={styles.missing}>This post is no longer available.</Text></View>;
  }

  const qAuthor = displayAuthor(userById(question.authorId), question.anonymous);
  const qAuthorUser = userById(question.authorId);
  const circle = circleById(question.circleId);
  const isExpertPost = showsExpertBadge(question, qAuthorUser);
  const questionProfession = displayProfessionLabel(question, qAuthorUser);
  const currentUser = me();
  const replyPostedAsExpert = replyPostMode === 'professional';
  const replyBadgeTitle = currentUser?.expertBadgeTitle?.trim() || null;
  const showReplyProConfirm = replyPostedAsExpert && hasExpertProfessionalProfile(currentUser);
  const totalAnswers = question.answers.length;

  const handleReplyPostModeChange = (mode) => {
    if (mode === 'professional') {
      if (!hasExpertProfessionalProfile(currentUser)) {
        pendingProfessionalReply.current = true;
        navigate('ExpertProfessionalSetup');
        return;
      }
      setReplyPostMode('professional');
      return;
    }
    setReplyPostMode('member');
  };

  const goToProfile = (authorId, anonymous) => {
    openAuthorProfile(navigate, userById, authorId, { anonymous, authUserId: state.authUserId, navigation });
  };

  const submitReply = async (answerId) => {
    if (!replyText.trim() || replySubmitting) return;
    if (replyPostedAsExpert && !hasExpertProfessionalProfile(currentUser)) {
      pendingProfessionalReply.current = true;
      navigate('ExpertProfessionalSetup');
      return;
    }
    if (replyPhoto?.uri && !online) {
      Alert.alert('No connection', 'Reconnect to upload your reply photo.');
      return;
    }

    const replyId = `r_${Date.now().toString(36)}`;
    setReplySubmitting(true);
    try {
      let photoUrlValue = null;
      if (ENABLE_REPLY_PHOTOS && replyPhoto?.uri) {
        if (!isSupabaseConfigured()) throw new Error('Photo upload requires Supabase — check your .env.');
        photoUrlValue = await uploadReplyPhoto(replyId, { uri: replyPhoto.uri });
      }
      const res = await dispatch({
        type: 'ADD_REPLY',
        questionId,
        answerId,
        id: replyId,
        body: replyText,
        anonymous: false,
        photoUrl: photoUrlValue,
        postedAsExpert: currentUser?.verified ? replyPostedAsExpert : undefined,
        professionLabel: currentUser?.verified && replyPostedAsExpert ? replyBadgeTitle : undefined,
      });
      if (res?.ok === false) throw res.error || new Error('Could not post reply');
      setReplyText('');
      setReplyPhoto(null);
      setReplyPostMode('member');
      setActiveBottomComposer(null);
      Keyboard.dismiss();
    } catch (e) {
      Alert.alert('Could not post reply', e?.message || 'Try again.');
    } finally {
      setReplySubmitting(false);
    }
  };

  const pickReplyPhoto = async (pickerFn) => {
    const picked = await pickerFn();
    if (picked) setReplyPhoto({ uri: picked.uri });
  };

  const pickAnswerPhoto = async (pickerFn) => {
    const picked = await pickerFn();
    if (picked) setAnswerPhoto({ uri: picked.uri });
  };

  const insertAnswerLink = () => {
    const url = 'https://';
    const pos = answerSelection.current.start;
    setAnswerText((b) => b.slice(0, pos) + url + b.slice(pos));
  };

  const submitAnswer = async () => {
    if (!answerText.trim() || answerSubmitting) return;
    if (!online) {
      Alert.alert('No connection', 'You’re offline. Reconnect to post your answer — your draft stays here.');
      return;
    }

    const answerId = `a_${Date.now().toString(36)}`;
    setAnswerSubmitting(true);
    try {
      let photoUrlValue = null;
      if (ENABLE_REPLY_PHOTOS && answerPhoto?.uri) {
        if (!isSupabaseConfigured()) throw new Error('Photo upload requires Supabase — check your .env.');
        photoUrlValue = await uploadAnswerPhoto(answerId, { uri: answerPhoto.uri });
      }
      const res = await dispatch({
        type: 'ADD_ANSWER',
        questionId,
        id: answerId,
        body: answerText,
        anonymous: answerAnonymous,
        photoUrl: photoUrlValue,
      });
      if (res?.ok === false) throw res.error || new Error('Could not post answer');
      setAnswerText('');
      setAnswerPhoto(null);
      setAnswerAnonymous(false);
      setActiveBottomComposer(null);
      Keyboard.dismiss();
      showToast('Answer posted', { tone: 'success' });
    } catch (e) {
      Alert.alert('Could not post answer', e?.message || 'Try again.');
    } finally {
      setAnswerSubmitting(false);
    }
  };

  const openPhotoViewer = (photos, index = 0) => {
    navigate('ImageViewer', { photos: normalizeDisplayPhotoUrls(photos), index });
  };

  const renderAnswer = (ans, isPinned) => {
    const aAuthor = displayAuthor(userById(ans.authorId), ans.anonymous);
    return (
      <View
        key={ans.id}
        style={[styles.answer, isPinned && styles.answerPinned]}
        onLayout={(e) => { answerOffsets.current[ans.id] = e.nativeEvent.layout.y; }}
      >
        {isPinned && (
          <View style={styles.pinnedBanner}>
            <Text style={styles.pinnedText}>✓ VERIFIED EXPERT ANSWER</Text>
          </View>
        )}
        <Pressable style={styles.authorRow} onPress={() => goToProfile(ans.authorId, ans.anonymous)}>
          <Avatar name={aAuthor.name} photo={aAuthor.photo} anon={aAuthor.anon} size={34} />
          <View style={{ marginLeft: spacing.sm, flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.answerAuthor}>{aAuthor.name}</Text>
              {aAuthor.verified ? <VerifiedBadge compact /> : null}
              <KarmaBadge karma={karmaFor(ans.authorId)} compact />
            </View>
            <Text style={styles.metaText}>{aAuthor.suburb ? `${aAuthor.suburb} · ` : ''}{timeAgo(ans.createdAt)}</Text>
          </View>
        </Pressable>

        <BodyText style={styles.answerBody} linkStyle={styles.link}>{ans.body}</BodyText>

        {ans.photo ? (
          <View style={styles.photoRow}>
            <ContentPhoto
              photo={ans.photo}
              onPress={() => openPhotoViewer([ans.photo], 0)}
            />
          </View>
        ) : null}

        <View style={styles.answerActions}>
          <UpvoteButton
            count={ans.upvotes}
            active={hasUpvotedAnswer(ans.id)}
            onToggle={() => dispatch({ type: 'TOGGLE_UPVOTE_ANSWER', answerId: ans.id })}
          />
          <Pressable onPress={() => openReply(ans.id)} hitSlop={6}>
            <Text style={styles.replyBtn}>↩ Reply</Text>
          </Pressable>
          <Pressable onPress={() => navigate('Report', { kind: 'content', targetTitle: 'this answer' })} hitSlop={6}>
            <Text style={styles.reportBtn}>Report</Text>
          </Pressable>
        </View>

        {(ans.replies || []).map((r) => {
          const rAuthorUser = userById(r.authorId);
          const rAuthor = displayAuthor(rAuthorUser, r.anonymous);
          const showReplyBadge = showsExpertBadge(r, rAuthorUser);
          const replyProfession = displayProfessionLabel(r, rAuthorUser);
          return (
            <View key={r.id} style={styles.reply}>
              <Pressable style={styles.replyHead} onPress={() => goToProfile(r.authorId, r.anonymous)}>
                <Avatar name={rAuthor.name} photo={rAuthor.photo} anon={rAuthor.anon} size={24} />
                <Text style={styles.replyAuthor}>{rAuthor.name}</Text>
                {showReplyBadge ? (
                  <>
                    <VerifiedBadge compact />
                    <Text style={styles.replyProfession} numberOfLines={1}>{replyProfession}</Text>
                  </>
                ) : null}
                <Text style={styles.metaTiny}>· {timeAgo(r.createdAt)}</Text>
              </Pressable>
              <BodyText style={styles.replyBody} linkStyle={styles.link}>{r.body}</BodyText>
              {r.photo ? (
                <View style={styles.photoRow}>
                  <ContentPhoto
                    photo={r.photo}
                    size={64}
                    onPress={() => openPhotoViewer([r.photo], 0)}
                  />
                </View>
              ) : null}
              <View style={{ alignSelf: 'flex-start', marginTop: 6 }}>
                <UpvoteButton size="sm" count={r.upvotes} active={hasUpvotedReply(r.id)} onToggle={() => dispatch({ type: 'TOGGLE_UPVOTE_REPLY', replyId: r.id })} />
              </View>
            </View>
          );
        })}

        {activeBottomComposer === ans.id ? (
          <Text style={styles.replyingHint}>Replying below…</Text>
        ) : null}
      </View>
    );
  };

  const renderBottomBar = () => {
    if (activeBottomComposer === ANSWER_COMPOSER) {
      const valid = answerText.trim().length > 0;
      return (
        <View style={styles.stickyBottom}>
          <View style={styles.composerToolbar}>
            <Pressable style={styles.toolBtn} onPress={insertAnswerLink}>
              <Text style={styles.toolBtnText}>🔗 Link</Text>
            </Pressable>
            <CharCount value={answerText} />
          </View>
          <View style={styles.replyComposer}>
            <TextInput
              style={styles.answerInputInline}
              placeholder="Share what you know from experience. Be kind and specific — links are welcome."
              placeholderTextColor={colors.textFaint}
              value={answerText}
              onChangeText={setAnswerText}
              onSelectionChange={(e) => { answerSelection.current = e.nativeEvent.selection; }}
              multiline
              autoFocus
              onFocus={scrollToAnswersSection}
            />
            <Pressable
              onPress={submitAnswer}
              disabled={!valid || answerSubmitting}
              style={[styles.replySend, (!valid || answerSubmitting) && styles.replySendDisabled]}
              accessibilityLabel="Send answer"
            >
              <Text style={styles.replySendText}>{answerSubmitting ? '…' : 'Send'}</Text>
            </Pressable>
          </View>
          <View style={styles.anonRowCompact}>
            <Text style={styles.anonLabelCompact}>Answer anonymously</Text>
            <Switch
              value={answerAnonymous}
              onValueChange={setAnswerAnonymous}
              trackColor={{ true: colors.primary, false: colors.borderStrong }}
              thumbColor={colors.onPrimary}
            />
          </View>
          {ENABLE_REPLY_PHOTOS ? (
            <PhotoStrip
              photos={answerPhoto ? [answerPhoto] : []}
              maxCount={1}
              onAdd={() => setAnswerPickerOpen(true)}
              onRemove={() => setAnswerPhoto(null)}
              tileSize={44}
            />
          ) : null}
          <Pressable onPress={cancelBottomComposer} style={styles.replyCancelBtn} hitSlop={8}>
            <Text style={styles.replyCancelText}>Cancel</Text>
          </Pressable>
        </View>
      );
    }

    if (activeBottomComposer) {
      return (
        <View style={styles.stickyBottom}>
          {currentUser?.verified ? (
            <ExpertPostModeToggle
              compact
              mode={replyPostMode}
              onChange={handleReplyPostModeChange}
            />
          ) : null}
          {showReplyProConfirm && replyBadgeTitle ? (
            <ExpertProfessionalConfirm badgeTitle={replyBadgeTitle} reply compact />
          ) : null}
          <View style={styles.replyComposer}>
            <TextInput
              style={styles.replyInput}
              placeholder="Write a reply…"
              placeholderTextColor={colors.textFaint}
              value={replyText}
              onChangeText={setReplyText}
              multiline
              autoFocus
              onFocus={() => scrollToAnswer(activeBottomComposer)}
            />
            {ENABLE_REPLY_PHOTOS ? (
              <PhotoStrip
                photos={replyPhoto ? [replyPhoto] : []}
                maxCount={1}
                onAdd={() => setReplyPickerOpen(true)}
                onRemove={() => setReplyPhoto(null)}
                tileSize={44}
              />
            ) : null}
            <Pressable
              onPress={() => submitReply(activeBottomComposer)}
              disabled={!replyText.trim() || replySubmitting}
              style={[styles.replySend, (!replyText.trim() || replySubmitting) && styles.replySendDisabled]}
              accessibilityLabel="Send reply"
            >
              <Text style={styles.replySendText}>{replySubmitting ? '…' : 'Send'}</Text>
            </Pressable>
          </View>
          <Pressable onPress={cancelBottomComposer} style={styles.replyCancelBtn} hitSlop={8}>
            <Text style={styles.replyCancelText}>Cancel reply</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.footer}>
        <Pressable style={({ pressed }) => [styles.answerCta, pressed && { opacity: 0.9 }]} onPress={openAnswer}>
          <Text style={styles.answerCtaText}>✍️  Write an answer</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <>
    <KeyboardScreen
      safe={false}
      style={styles.container}
      scrollStyle={styles.scroll}
      contentStyle={styles.scrollContent}
      scrollRef={scrollRef}
      footer={renderBottomBar()}
      refreshControl={(
        <RefreshControl
          refreshing={detailRefreshing}
          onRefresh={onDetailRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      )}
    >
        {justPosted && (
          <View style={styles.postedBanner}>
            <Text style={styles.postedText}>🌿 Your post is live — the community can answer it now.</Text>
          </View>
        )}

        {/* Post */}
        <View style={[styles.qBlock, isExpertPost && styles.qBlockExpert]}>
          {isExpertPost && (
            <View style={styles.expertPostBanner}>
              <Text style={styles.expertPostBannerText}>✓ VERIFIED EXPERT POST</Text>
              <Text style={styles.expertPostBannerSub}>{questionProfession}</Text>
            </View>
          )}
          {circle ? (
            <CircleChip
              circle={circle}
              showOfficial
              onPress={() => navigate('CircleDetail', { circleId: circle.id })}
            />
          ) : null}
          <Text style={styles.qTitle}>{question.title}</Text>

          <Pressable style={styles.authorRow} onPress={() => goToProfile(question.authorId, question.anonymous)}>
            <Avatar name={qAuthor.name} photo={qAuthor.photo} anon={qAuthor.anon} size={38} />
            <View style={{ marginLeft: spacing.sm, flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={styles.authorName}>{qAuthor.name}</Text>
                {isExpertPost ? <VerifiedBadge compact /> : null}
              </View>
              <Text style={styles.metaText}>{qAuthor.suburb ? `${qAuthor.suburb} · ` : ''}{timeAgo(question.createdAt)}</Text>
            </View>
          </Pressable>

          <BodyText style={styles.qBody} linkStyle={styles.link}>{question.body}</BodyText>

          {question.photos?.length > 0 && (
            <View style={styles.photoRow}>
              {normalizeDisplayPhotoUrls(question.photos).map((uri, i) => (
                <ContentPhoto
                  key={`${uri}-${i}`}
                  photo={uri}
                  onPress={() => openPhotoViewer(question.photos, i)}
                />
              ))}
            </View>
          )}

          <View style={styles.qActions}>
            <UpvoteButton
              count={question.upvotes}
              active={qUpvoted}
              onToggle={() => dispatch({ type: 'TOGGLE_UPVOTE_QUESTION', questionId })}
            />
            <Text style={styles.viewCount}>👁 {compactNumber(question.views)} views</Text>
          </View>

        </View>

        {/* Answers header + community sort */}
        <View
          style={styles.answersHeader}
          onLayout={(e) => { answersSectionY.current = e.nativeEvent.layout.y; }}
        >
          <Text style={styles.answersTitle}>{totalAnswers} {totalAnswers === 1 ? 'Answer' : 'Answers'}</Text>
          {activeBottomComposer === ANSWER_COMPOSER ? (
            <Text style={styles.replyingHint}>Writing below…</Text>
          ) : null}
          {community.length > 1 && (
            <View style={styles.sortToggle}>
              {[['top', 'Top'], ['new', 'Newest']].map(([k, lbl]) => (
                <Pressable key={k} onPress={() => setSort(k)} style={[styles.sortBtn, sort === k && styles.sortBtnActive]}>
                  <Text style={[styles.sortText, sort === k && styles.sortTextActive]}>{lbl}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {totalAnswers === 0 && (
          <View style={styles.noAnswers}>
            <Text style={styles.noAnswersText}>No answers yet — be the first to help.</Text>
          </View>
        )}

        {pinned.map((a) => renderAnswer(a, true))}
        {community.map((a) => renderAnswer(a, false))}
    </KeyboardScreen>

      {ENABLE_REPLY_PHOTOS ? (
        <PhotoSourceSheet
          visible={replyPickerOpen}
          onClose={() => setReplyPickerOpen(false)}
          title="Add reply photo"
          showRemove={!!replyPhoto}
          onLibrary={() => pickReplyPhoto(pickFromLibrary)}
          onRemove={() => setReplyPhoto(null)}
        />
      ) : null}
      {ENABLE_REPLY_PHOTOS ? (
        <PhotoSourceSheet
          visible={answerPickerOpen}
          onClose={() => setAnswerPickerOpen(false)}
          title="Add answer photo"
          showRemove={!!answerPhoto}
          onLibrary={() => pickAnswerPhoto(pickFromLibrary)}
          onRemove={() => setAnswerPhoto(null)}
        />
      ) : null}
    </>
  );
}

const createStyles = (colors, spacing, font, radius, line, shadow) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing.lg },
  missing: { padding: spacing.xl, color: colors.textMuted, textAlign: 'center', marginTop: 40 },

  postedBanner: { backgroundColor: colors.successTint, paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  postedText: { color: colors.success, fontWeight: '800', fontSize: font.caption, textAlign: 'center' },

  qBlock: { backgroundColor: colors.surface, padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  qBlockExpert: { borderBottomColor: colors.expertCardBorder, borderBottomWidth: 2 },
  expertPostBanner: {
    alignSelf: 'flex-start', backgroundColor: colors.secondaryTint,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.expertMarkerBorder,
  },
  expertPostBannerText: { color: colors.secondaryDark, fontWeight: '800', fontSize: font.tiny, letterSpacing: 0.5 },
  expertPostBannerSub: { color: colors.secondaryDark, fontSize: font.tiny, fontWeight: '600', marginTop: 2, opacity: 0.9 },
  qTitle: { fontSize: font.title, fontWeight: '800', color: colors.text, marginTop: spacing.sm, marginBottom: spacing.md, lineHeight: 28 },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  authorName: { fontWeight: '800', color: colors.text, fontSize: font.caption },
  metaText: { color: colors.textMuted, fontSize: font.tiny, marginTop: 1, fontWeight: '600' },
  metaTiny: { color: colors.textFaint, fontSize: font.tiny, fontWeight: '600' },
  qBody: { fontSize: font.bodyLg, color: colors.text, lineHeight: 25, marginTop: spacing.sm },
  link: { color: colors.primary, fontWeight: '700' },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  photoTile: { width: 72, height: 72, borderRadius: radius.md, backgroundColor: colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  qActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: spacing.lg },
  viewCount: { color: colors.textMuted, fontSize: font.caption, fontWeight: '600' },
  answersHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  answersTitle: { fontSize: font.subtitle, fontWeight: '800', color: colors.text },
  sortToggle: { flexDirection: 'row', backgroundColor: colors.bgSunken, borderRadius: radius.pill, padding: 3 },
  sortBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.pill },
  sortBtnActive: { backgroundColor: colors.surface, ...shadow.card },
  sortText: { fontSize: font.tiny, fontWeight: '800', color: colors.textMuted },
  sortTextActive: { color: colors.primary },

  noAnswers: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  noAnswersText: { color: colors.textMuted, fontSize: font.caption },

  answer: { backgroundColor: colors.surface, marginHorizontal: spacing.lg, marginBottom: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, ...shadow.card },
  answerPinned: { borderColor: colors.primary, borderWidth: 1.5, backgroundColor: colors.surface },
  pinnedBanner: { alignSelf: 'flex-start', backgroundColor: colors.primaryTint, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, marginBottom: spacing.md },
  pinnedText: { color: colors.primary, fontWeight: '800', fontSize: font.tiny, letterSpacing: 0.5 },
  answerAuthor: { fontWeight: '800', color: colors.text, fontSize: font.caption },
  answerBody: { fontSize: font.bodyLg, color: colors.text, lineHeight: 24, marginVertical: spacing.md },
  answerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  replyBtn: { color: colors.textMuted, fontWeight: '800', fontSize: font.caption },
  reportBtn: { color: colors.textFaint, fontSize: font.caption, fontWeight: '600' },

  reply: { marginTop: spacing.md, marginLeft: spacing.md, paddingLeft: spacing.md, borderLeftWidth: 2, borderLeftColor: colors.border },
  replyHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  replyAuthor: { fontWeight: '800', color: colors.text, fontSize: font.tiny },
  replyProfession: { fontWeight: '700', color: colors.secondaryDark, fontSize: font.tiny, flexShrink: 1, maxWidth: 120 },
  replyBody: { fontSize: font.caption, color: colors.text, lineHeight: 20, marginTop: 4 },

  replyComposer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  replyingHint: {
    marginTop: spacing.sm,
    fontSize: font.tiny,
    fontWeight: '700',
    color: colors.primary,
  },
  stickyBottom: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  replyCancelBtn: { alignSelf: 'center', marginTop: spacing.sm, paddingVertical: spacing.xs },
  replyCancelText: { color: colors.textMuted, fontWeight: '700', fontSize: font.caption },
  replyInput: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    padding: spacing.sm,
    minHeight: 42,
    maxHeight: 120,
    color: colors.text,
    backgroundColor: colors.bg,
  },
  replySend: {
    flexShrink: 0,
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: radius.md,
    minHeight: 42,
    justifyContent: 'center',
  },
  replySendDisabled: { opacity: 0.4 },
  replySendText: { color: colors.onPrimary, fontWeight: '800', fontSize: font.caption },

  composerToolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  toolBtn: { backgroundColor: colors.primaryTint, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill },
  toolBtnText: { color: colors.primary, fontWeight: '800', fontSize: font.tiny },
  answerInputInline: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    padding: spacing.sm,
    minHeight: 42,
    maxHeight: 120,
    color: colors.text,
    backgroundColor: colors.bg,
    fontSize: font.body,
  },
  anonRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  anonLabelCompact: { fontSize: font.caption, fontWeight: '700', color: colors.text },

  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  answerCta: { backgroundColor: colors.primary, paddingVertical: 15, borderRadius: radius.md, alignItems: 'center', ...shadow.card },
  answerCtaText: { color: colors.onPrimary, fontWeight: '800', fontSize: font.bodyLg },
});
