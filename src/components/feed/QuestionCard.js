import React, { useMemo, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Avatar from '../common/Avatar';
import CircleChip from '../circles/CircleChip';
import VerifiedBadge from '../common/VerifiedBadge';
import ExpertMarker from './ExpertMarker';
import QuestionCardPhotoThumb from './QuestionCardPhotoThumb';
import { useTheme } from '../../theme/ThemeContext';
import { timeAgo, compactNumber, displayAuthor } from '../../utils/format';
import { showsExpertBadge, displayProfessionLabel } from '../../utils/expertPost';
import { normalizeDisplayPhotoUrls } from '../../utils/photos';

function QuestionCard({
  question, author, circle, expert,
  onPress, onCirclePress, onAuthorPress,
  hideCircleChip = false,
  circleChipVariant = 'muted',
}) {
  const { colors, shadow, spacing, radius, font } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadow, spacing, radius, font), [colors, shadow, spacing, radius, font]);

  const a = displayAuthor(author, question.anonymous);
  const isExpertPost = showsExpertBadge(question, author);
  const profession = displayProfessionLabel(question, author);
  const hasExpertAnswer = !!expert;
  const rawAnswers = question.answers?.length || 0;
  const canOpenProfile = !!onAuthorPress && !question.anonymous && !a.anon;
  const skipCardPress = useRef(false);
  const hasPhotos = normalizeDisplayPhotoUrls(question.photos).length > 0;

  const handleCardPress = () => {
    if (skipCardPress.current) {
      skipCardPress.current = false;
      return;
    }
    onPress?.();
  };

  const openProfile = () => {
    if (!canOpenProfile) return;
    skipCardPress.current = true;
    onAuthorPress();
  };

  const openCircle = () => {
    if (!onCirclePress) return;
    skipCardPress.current = true;
    onCirclePress();
  };

  return (
    <Pressable
      onPress={handleCardPress}
      style={({ pressed }) => [
        styles.card,
        isExpertPost && styles.cardExpert,
        pressed && styles.pressed,
      ]}
    >
      {isExpertPost ? (
        <View style={styles.expertHeader}>
          <ExpertMarker compact mode="posted" />
          <Text style={styles.expertRole} numberOfLines={1}>{profession}</Text>
        </View>
      ) : null}

      <View style={styles.authorRow}>
        <Pressable
          onPress={openProfile}
          disabled={!canOpenProfile}
          style={styles.authorTap}
          hitSlop={4}
        >
          <Avatar name={a.name} photo={a.photo} anon={a.anon} size={isExpertPost ? 36 : 32} />
          <Text style={[styles.authorName, isExpertPost && styles.authorNameExpert]} numberOfLines={1}>
            {a.name}
          </Text>
        </Pressable>
        {isExpertPost ? <VerifiedBadge compact /> : null}
        {a.suburb ? (
          <>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaSuburb} numberOfLines={1}>{a.suburb}</Text>
          </>
        ) : null}
        <Text style={styles.metaDot}>·</Text>
        <Text style={styles.metaTime}>{timeAgo(question.createdAt)}</Text>
      </View>

      <View style={[styles.previewRow, isExpertPost && styles.previewRowExpert]}>
        <View style={styles.previewText}>
          <Text style={[styles.title, isExpertPost && styles.titleExpert]} numberOfLines={2}>
            {question.title}
          </Text>

          <Text style={[styles.body, isExpertPost && styles.bodyExpert]} numberOfLines={isExpertPost ? 2 : 1}>
            {question.body}
          </Text>
        </View>

        {hasPhotos ? <QuestionCardPhotoThumb photos={question.photos} /> : null}
      </View>

      {circle && !hideCircleChip ? (
        <View style={styles.chipRow}>
          <CircleChip circle={circle} compact variant={circleChipVariant} onPress={openCircle} />
        </View>
      ) : null}

      <Text style={[styles.footer, isExpertPost && styles.footerExpertPost]}>
        <Text style={[styles.footerStat, hasExpertAnswer && styles.footerExpert]}>
          {rawAnswers} {rawAnswers === 1 ? 'answer' : 'answers'}
          {hasExpertAnswer ? ' ✓' : ''}
        </Text>
        <Text style={styles.footerDot}> · </Text>
        <Text style={styles.footerStat}>{compactNumber(question.upvotes)} upvotes</Text>
        {question.editedAt ? (
          <Text style={styles.footerEdited}> · edited</Text>
        ) : null}
      </Text>
    </Pressable>
  );
}

const createStyles = (colors, shadow, spacing, radius, font) => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    paddingBottom: spacing.md + 2,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  cardExpert: {
    backgroundColor: colors.secondaryTint,
    borderColor: colors.expertCardBorder,
    borderWidth: 1.5,
    padding: spacing.lg,
    paddingBottom: spacing.lg + 2,
    marginBottom: spacing.lg + spacing.sm,
    marginTop: spacing.xs,
  },
  pressed: { opacity: 0.96 },

  expertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  expertRole: {
    flex: 1,
    textAlign: 'right',
    fontSize: font.tiny,
    fontWeight: '700',
    color: colors.secondaryDark,
    opacity: 0.9,
  },

  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  authorTap: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, maxWidth: '72%' },
  authorName: { fontWeight: '700', fontSize: font.caption, color: colors.text, flexShrink: 1 },
  authorNameExpert: { fontWeight: '800', fontSize: font.body },
  metaDot: { color: colors.textFaint, fontSize: font.tiny },
  metaSuburb: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '600', flexShrink: 1 },
  metaTime: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '600', flexShrink: 0 },

  previewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  previewRowExpert: {
    marginTop: spacing.md,
  },
  previewText: {
    flex: 1,
    minWidth: 0,
  },

  title: {
    fontSize: font.subtitle,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 23,
  },
  titleExpert: {
    lineHeight: 25,
  },

  body: {
    fontSize: font.caption,
    color: colors.textMuted,
    lineHeight: 20,
    marginTop: spacing.xs,
  },
  bodyExpert: {
    marginTop: spacing.sm,
    lineHeight: 21,
  },

  chipRow: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },

  footer: { marginTop: spacing.md, fontSize: font.caption, fontWeight: '700' },
  footerExpertPost: { marginTop: spacing.lg },
  footerStat: { color: colors.textMuted },
  footerExpert: { color: colors.secondaryDark },
  footerDot: { color: colors.textFaint },
  footerEdited: { color: colors.textFaint, fontWeight: '600' },
});

export default React.memo(QuestionCard);
