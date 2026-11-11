import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, Animated, Easing, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Avatar from '../../components/common/Avatar';
import KeyboardScreen from '../../components/common/KeyboardScreen';
import Button from '../../components/common/Button';
import PhotoStrip from '../../components/question/PhotoStrip';
import PhotoSourceSheet from '../../components/question/PhotoSourceSheet';
import { Field, Input, CharCount } from '../../components/common/ui';
import ExpertPostQuota from '../../components/question/ExpertPostQuota';
import ExpertPostModeToggle from '../../components/question/ExpertPostModeToggle';
import ExpertProfessionalConfirm from '../../components/question/ExpertProfessionalConfirm';
import CircleChip from '../../components/circles/CircleChip';
import { useData, useSelectors } from '../../data/store';
import { useNetwork } from '../../data/network';
import { useNavigationGuard } from '../../utils/navigation';
import { useTheme } from '../../theme/ThemeContext';
import { useImagePicker } from '../../hooks/useImagePicker';
import { isSupabaseConfigured } from '../../lib/supabase';
import { uploadQuestionPhotos } from '../../services/mediaStorage';
import { needsPhotoUpload, photoUrl } from '../../utils/photos';
import { MAX_QUESTION_PHOTOS } from '../../constants/media';
import {
  hasExpertProfessionalProfile,
} from '../../utils/expertPost';

const TITLE_MIN = 10, TITLE_MAX = 120, BODY_MIN = 10, BODY_MAX = 4000;

export default function AskComposerScreen({ navigation, route }) {
  const { colors, spacing, font, radius, shadow } = useTheme();
  const styles = useMemo(() => createStyles(colors, spacing, font, radius, shadow), [colors, spacing, font, radius, shadow]);

  const { dispatch } = useData();
  const {
    me,
    canExpertPostProfessionalToday,
    canPostMemberToday,
    expertDailyPostLimit,
    memberPostsToday,
    memberDailyPostLimit,
    joinedCirclesList,
    state,
    circleById,
    isJoinedCircle,
  } = useSelectors();
  const { online } = useNetwork();
  const { navigate } = useNavigationGuard(navigation);
  const { pickFromLibrary } = useImagePicker();
  const user = me();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [circleId, setCircleId] = useState(route.params?.circleId || null);
  const [circleQuery, setCircleQuery] = useState('');
  const [photos, setPhotos] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [postMode, setPostMode] = useState('member');
  const [touched, setTouched] = useState(false);
  const [posting, setPosting] = useState(false);
  const success = useRef(new Animated.Value(0)).current;
  const pendingProfessional = useRef(false);

  const postedAsExpert = postMode === 'professional';
  const expertCircle = postedAsExpert ? circleById(user?.expertCircleId) : null;
  const badgeTitle = user?.expertBadgeTitle?.trim() || null;
  const effectiveCircleId = postedAsExpert ? user?.expertCircleId : circleId;
  const selectedCircle = circleById(effectiveCircleId);
  const showProConfirm = postedAsExpert && hasExpertProfessionalProfile(user);

  const titleOk = title.trim().length >= TITLE_MIN && title.trim().length <= TITLE_MAX;
  const bodyOk = body.trim().length >= BODY_MIN && body.trim().length <= BODY_MAX;
  const atProfessionalLimit = user?.verified && !canExpertPostProfessionalToday();
  const atMemberLimit = !canPostMemberToday();
  const atCurrentModeLimit = postedAsExpert ? atProfessionalLimit : atMemberLimit;
  const circleOk = postedAsExpert ? hasExpertProfessionalProfile(user) : !!circleId;
  const valid = titleOk && bodyOk && circleOk && !atCurrentModeLimit;

  useEffect(() => {
    if (atProfessionalLimit && postMode === 'professional') {
      setPostMode('member');
    }
  }, [atProfessionalLimit, postMode]);

  const circleOptions = useMemo(() => {
    const joined = joinedCirclesList();
    const joinedIds = new Set(joined.map((c) => c.id));
    const rest = state.circles.filter((c) => !joinedIds.has(c.id));
    const q = circleQuery.trim().toLowerCase();
    const filter = (list) => (q ? list.filter((c) => c.name.toLowerCase().includes(q)) : list);
    return [...filter(joined), ...filter(rest)];
  }, [joinedCirclesList, state.circles, circleQuery]);

  useFocusEffect(useCallback(() => {
    const u = me();
    if (pendingProfessional.current && hasExpertProfessionalProfile(u)) {
      pendingProfessional.current = false;
      setPostMode('professional');
      setAnonymous(false);
    }
  }, [state.users]));

  const handlePostModeChange = (mode) => {
    if (mode === 'professional') {
      if (atProfessionalLimit) {
        Alert.alert(
          'Professional limit reached',
          `You've used your ${expertDailyPostLimit} professional posts today. Switch to Member to keep posting.`,
        );
        return;
      }
      if (!hasExpertProfessionalProfile(user)) {
        pendingProfessional.current = true;
        navigate('ExpertProfessionalSetup');
        return;
      }
      setPostMode('professional');
      setAnonymous(false);
      return;
    }
    if (atMemberLimit) {
      Alert.alert(
        'Member limit reached',
        `You've used your ${memberDailyPostLimit} member posts today. Try again tomorrow.`,
      );
      return;
    }
    setPostMode('member');
  };

  const handleAnonymousChange = (val) => {
    setAnonymous(val);
    if (val) setPostMode('member');
  };

  const addPickedPhoto = async (picked) => {
    if (!picked) return;
    const items = Array.isArray(picked) ? picked : [picked];
    const room = MAX_QUESTION_PHOTOS - photos.length;
    if (room <= 0) return;
    const toAdd = items.slice(0, room).map((item, i) => ({
      id: `ph_${Date.now()}_${i}`,
      uri: item.uri,
      base64: item.base64,
      mimeType: item.mimeType,
      width: item.width,
      height: item.height,
    }));
    if (toAdd.length) setPhotos((p) => [...p, ...toAdd]);
  };

  const pickQuestionPhotos = async () => {
    const remaining = MAX_QUESTION_PHOTOS - photos.length;
    if (remaining <= 0) return;
    await addPickedPhoto(await pickFromLibrary({
      allowsMultipleSelection: remaining > 1,
      selectionLimit: remaining,
    }));
  };

  const removePhoto = (id) => setPhotos((arr) => arr.filter((x) => x.id !== id));

  const uploadAllPhotos = async (questionId) => {
    const pending = photos.filter((p) => needsPhotoUpload(p));
    if (!pending.length) return photos.map(photoUrl).filter(Boolean);

    if (!isSupabaseConfigured()) {
      throw new Error('Photo upload requires Supabase — add your project keys to .env.');
    }

    setPhotos((arr) => arr.map((p) => (
      pending.some((x) => x.id === p.id) ? { ...p, uploading: true, error: null } : p
    )));

    try {
      const assets = pending.map((p) => ({
        uri: p.uri,
        base64: p.base64,
        mimeType: p.mimeType,
        width: p.width,
        height: p.height,
      }));
      const urls = await uploadQuestionPhotos(questionId, assets);
      let urlIdx = 0;
      const merged = photos.map((p) => {
        if (pending.some((x) => x.id === p.id)) {
          const url = urls[urlIdx];
          urlIdx += 1;
          return { ...p, url, uploading: false, error: null };
        }
        return photoUrl(p) ? p : p;
      });
      setPhotos(merged);
      return merged.map(photoUrl).filter(Boolean);
    } catch (e) {
      setPhotos((arr) => arr.map((p) => (
        pending.some((x) => x.id === p.id) ? { ...p, uploading: false, error: e?.message || 'Upload failed' } : p
      )));
      throw e;
    }
  };

  const submit = async () => {
    setTouched(true);
    if (atCurrentModeLimit) {
      Alert.alert(
        'Daily limit reached',
        postedAsExpert
          ? `You've used your ${expertDailyPostLimit} professional posts today. Your limit resets tomorrow.`
          : `You've used your ${memberDailyPostLimit} member posts today. Your limit resets tomorrow.`,
      );
      return;
    }
    if (postedAsExpert && !hasExpertProfessionalProfile(user)) {
      pendingProfessional.current = true;
      navigate('ExpertProfessionalSetup');
      return;
    }
    if (!valid || posting) return;
    if (!online) {
      Alert.alert('No connection', 'You’re offline. Reconnect to post your question — your draft stays here.');
      return;
    }
    if (photos.some((p) => p.uploading)) return;

    const id = `q_${Date.now().toString(36)}`;
    setPosting(true);
    try {
      let photoUrls = photos.map(photoUrl).filter(Boolean);
      if (photos.some((p) => needsPhotoUpload(p))) {
        photoUrls = await uploadAllPhotos(id);
      }
      const res = await dispatch({
        type: 'ASK_QUESTION',
        id,
        title,
        body,
        circleId: effectiveCircleId,
        anonymous,
        photos: photoUrls,
        postedAsExpert: user?.verified ? postedAsExpert : undefined,
        professionLabel: user?.verified && postedAsExpert ? badgeTitle : undefined,
      });
      if (res?.ok === false) throw res.error || new Error('Could not post question');
      Animated.timing(success, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      // Dismiss the composer modal, then push detail on the root stack.
      // `replace` from the modal group left a shallow/dead stack where back was a no-op.
      setTimeout(() => {
        const root = navigation.getParent() || navigation;
        if (navigation.canGoBack()) navigation.goBack();
        requestAnimationFrame(() => {
          root.navigate('QuestionDetail', { questionId: id, justPosted: true });
        });
      }, 850);
    } catch (e) {
      setPosting(false);
      Alert.alert('Could not post', e?.message || 'Check your connection and try again.');
    }
  };

  const previewName = anonymous ? 'Anonymous' : user?.name || 'You';
  const previewSuburb = anonymous ? null : user?.suburb;

  return (
    <View style={styles.wrap}>
      <KeyboardScreen
        safe={false}
        contentStyle={styles.body}
        footer={(
          <View style={styles.footer}>
            <Button
              title={atCurrentModeLimit ? 'Daily limit reached' : posting ? 'Posting…' : 'Post question'}
              icon="✍️"
              onPress={submit}
              disabled={atCurrentModeLimit || posting || (touched && !valid)}
            />
          </View>
        )}
      >
        <ExpertPostQuota variant="banner" />

        <Field
          label="Your question"
          error={touched && !titleOk ? `Keep the title between ${TITLE_MIN} and ${TITLE_MAX} characters.` : null}
        >
          <Input placeholder="e.g. Can I apply for a 485 visa before my results are out?" value={title} onChangeText={setTitle} maxLength={TITLE_MAX + 20} />
          <View style={styles.counterRow}><CharCount value={title} min={TITLE_MIN} max={TITLE_MAX} /></View>
          {title.trim().length > 0 && title.trim().length < TITLE_MIN ? (
            <Text style={styles.minHint}>{TITLE_MIN - title.trim().length} more character{TITLE_MIN - title.trim().length !== 1 ? 's' : ''} needed</Text>
          ) : null}
        </Field>

        <Field
          label="Add details"
          error={touched && !bodyOk ? `Add a bit more context (at least ${BODY_MIN} characters).` : null}
        >
          <Input placeholder="Share the context so people can give you a genuinely useful answer…" value={body} onChangeText={setBody} maxLength={BODY_MAX + 50} multiline />
          <View style={styles.counterRow}><CharCount value={body} min={BODY_MIN} max={BODY_MAX} /></View>
          {body.trim().length > 0 && body.trim().length < BODY_MIN ? (
            <Text style={styles.minHint}>{BODY_MIN - body.trim().length} more character{BODY_MIN - body.trim().length !== 1 ? 's' : ''} needed</Text>
          ) : null}
        </Field>

        {user?.verified ? (
          <ExpertPostModeToggle
            mode={postMode}
            onChange={handlePostModeChange}
            professionalDisabled={atProfessionalLimit}
            memberDisabled={atMemberLimit}
            professionalDisabledMessage={
              atProfessionalLimit
                ? `You've used your ${expertDailyPostLimit} professional posts today`
                : null
            }
            memberDisabledMessage={
              atMemberLimit
                ? `You've used your ${memberPostsToday()}/${memberDailyPostLimit} member posts today`
                : null
            }
          />
        ) : null}

        {showProConfirm ? (
          <ExpertProfessionalConfirm circleName={expertCircle?.name} badgeTitle={badgeTitle} />
        ) : null}

        {!postedAsExpert ? (
          <Field label="Circle" error={touched && !circleId ? 'Pick a circle for your question.' : null}>
            <Input
              placeholder="Search circles…"
              value={circleQuery}
              onChangeText={setCircleQuery}
              style={{ marginBottom: spacing.sm }}
            />
            <View style={styles.chips}>
              {circleOptions.map((c) => (
                <Pressable key={c.id} onPress={() => setCircleId(c.id)} style={{ marginBottom: spacing.sm }}>
                  <CircleChip
                    circle={c}
                    compact
                    showOfficial
                    onPress={() => setCircleId(c.id)}
                  />
                  {circleId === c.id ? <Text style={styles.selectedMark}>✓ selected</Text> : null}
                  {!isJoinedCircle(c.id) ? (
                    <Text style={styles.joinHint}>Not joined — you can still post here</Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          </Field>
        ) : null}

        <Field label={`Photos · optional · up to ${MAX_QUESTION_PHOTOS}`}>
          <PhotoStrip
            photos={photos}
            maxCount={MAX_QUESTION_PHOTOS}
            onAdd={() => setPickerOpen(true)}
            onRemove={removePhoto}
            onRetry={() => submit()}
          />
        </Field>

        <View style={[styles.anonCard, postedAsExpert && styles.anonCardDisabled]}>
          <View style={styles.anonHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.anonTitle}>Post anonymously</Text>
              <Text style={styles.anonSub}>
                {postedAsExpert
                  ? 'Not available when posting as a professional — your verified identity is shown.'
                  : 'Your name, photo and suburb stay hidden on this question.'}
              </Text>
            </View>
            <Switch
              value={anonymous}
              onValueChange={handleAnonymousChange}
              disabled={postedAsExpert}
              trackColor={{ true: colors.primary, false: colors.borderStrong }}
              thumbColor={colors.onPrimary}
            />
          </View>

          <View style={styles.previewLabelRow}>
            <Text style={styles.previewLabel}>HOW IT WILL APPEAR</Text>
          </View>
          <View style={[styles.previewRow, postedAsExpert && styles.previewRowExpert]}>
            <Avatar name={previewName} anon={anonymous} size={34} />
            <View style={{ marginLeft: spacing.sm, flex: 1 }}>
              <Text style={styles.previewName}>{previewName}</Text>
              {postedAsExpert && badgeTitle ? (
                <Text style={styles.previewProfession}>{badgeTitle}</Text>
              ) : null}
              <Text style={styles.previewMeta}>
                {previewSuburb ? `${previewSuburb} · ` : ''}just now{selectedCircle ? ` · ${selectedCircle.name}` : ''}
              </Text>
            </View>
            {postedAsExpert ? <Text style={styles.previewBadge}>✓</Text> : null}
          </View>
        </View>
      </KeyboardScreen>

      <PhotoSourceSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Add question photo"
        onLibrary={pickQuestionPhotos}
      />

      {posting && (
        <View style={styles.overlay} pointerEvents="none">
          <Animated.View style={[styles.successCard, { opacity: success, transform: [{ scale: success.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }] }]}>
            <Text style={styles.successCheck}>✓</Text>
            <Text style={styles.successText}>Posted — it's live!</Text>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors, spacing, font, radius, shadow) => StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  body: { padding: spacing.lg, paddingBottom: spacing.xl },
  counterRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 },
  minHint: { fontSize: font.tiny, color: colors.warning || '#F59E0B', marginTop: 4, textAlign: 'right', fontWeight: '600' },
  chips: { gap: spacing.xs },
  selectedMark: { fontSize: font.tiny, color: colors.primary, fontWeight: '800', marginTop: 4, marginLeft: 4 },
  joinHint: { fontSize: font.tiny, color: colors.textFaint, marginTop: 2, marginLeft: 4 },
  anonCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, ...shadow.card },
  anonCardDisabled: { opacity: 0.92 },
  anonHeader: { flexDirection: 'row', alignItems: 'center' },
  anonTitle: { fontWeight: '800', color: colors.text, fontSize: font.bodyLg },
  anonSub: { color: colors.textMuted, fontSize: font.caption, marginTop: 3, lineHeight: 18, paddingRight: spacing.md },
  previewLabelRow: { marginTop: spacing.lg, marginBottom: spacing.sm },
  previewLabel: { fontSize: font.tiny, fontWeight: '800', color: colors.textFaint, letterSpacing: 0.8 },
  previewRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgSunken, borderRadius: radius.md, padding: spacing.md },
  previewRowExpert: { backgroundColor: colors.secondaryTint, borderWidth: 1, borderColor: colors.expertMarkerBorder },
  previewName: { fontWeight: '800', color: colors.text, fontSize: font.caption },
  previewProfession: { fontWeight: '700', color: colors.secondaryDark, fontSize: font.tiny, marginTop: 2 },
  previewBadge: { fontSize: font.body, color: colors.secondaryDark, fontWeight: '900' },
  previewMeta: { color: colors.textMuted, fontSize: font.tiny, marginTop: 2 },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.overlay },
  successCard: { backgroundColor: colors.surface, borderRadius: radius.xl, paddingVertical: spacing.xl, paddingHorizontal: 40, alignItems: 'center', ...shadow.raised },
  successCheck: { fontSize: 44, color: colors.success, fontWeight: '900', marginBottom: spacing.sm },
  successText: { fontSize: font.subtitle, fontWeight: '800', color: colors.text },
});
