import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, SectionList, Pressable } from 'react-native';
import Avatar from '../../components/common/Avatar';
import { EmptyState } from '../../components/common/ui';
import { useToast } from '../../components/common/Toast';
import { useData, useSelectors } from '../../data/store';
import { useNavigationGuard, openExpertProfile, navigateToMainTab } from '../../utils/navigation';
import { timeAgo } from '../../utils/format';
import { useTheme } from '../../theme/ThemeContext';

const ICONS = { answer: '💬', milestone: '🎉', follow: '➕', expert: '🎓', expert_answer: '✓', expert_karma: '🪔', digest: '📬' };
const DAY = 24 * 60 * 60 * 1000;

// Rich, grouped notifications. "An expert answered your post" is visually
// elevated above ordinary entries. Marks everything read shortly after view.
export default function NotificationsScreen({ navigation }) {
  const { colors, spacing, font, radius, shadow } = useTheme();
  const styles = useMemo(() => createStyles(colors, spacing, font, radius, shadow), [colors, spacing, font, radius, shadow]);

  const { dispatch } = useData();
  const { state, userById } = useSelectors();
  const showToast = useToast();
  const { navigate } = useNavigationGuard(navigation);

  useEffect(() => {
    const t = setTimeout(() => dispatch({ type: 'MARK_NOTIFS_READ' }), 900);
    return () => clearTimeout(t);
  }, []);

  const sections = useMemo(() => {
    const now = Date.now();
    const buckets = { Today: [], 'This week': [], Earlier: [] };
    [...state.notifications]
      .sort((a, b) => b.createdAt - a.createdAt)
      .forEach((n) => {
        const age = now - n.createdAt;
        if (age < DAY) buckets.Today.push(n);
        else if (age < 7 * DAY) buckets['This week'].push(n);
        else buckets.Earlier.push(n);
      });
    return Object.entries(buckets)
      .filter(([, data]) => data.length > 0)
      .map(([title, data]) => ({ title, data }));
  }, [state.notifications]);

  const open = (n) => {
    if (n.questionId) {
      navigate('QuestionDetail', { questionId: n.questionId });
    } else if (n.actorId) {
      const u = userById(n.actorId);
      if (u?.verified) {
        openExpertProfile(navigation, {
          userId: n.actorId,
          title: u.name,
          authUserId: state.authUserId,
          navigate,
        });
      } else {
        navigate('UserProfile', { userId: n.actorId, title: u?.name });
      }
    } else if (n.type === 'expert') {
      navigateToMainTab(navigation, 'Experts');
    } else if (n.type === 'digest') {
      navigateToMainTab(navigation, 'Circles');
    } else {
      showToast('Nothing more to see on this one');
    }
  };

  const renderItem = ({ item }) => {
    const actor = item.actorId ? userById(item.actorId) : null;
    const elevated = item.type === 'expert_answer' || item.type === 'expert_karma';
    return (
      <Pressable
        style={[styles.row, !item.read && styles.rowUnread, elevated && styles.rowElevated]}
        onPress={() => open(item)}
      >
        {actor ? (
          <Avatar name={actor.name} photo={actor.photo} size={42} />
        ) : (
          <View style={[styles.iconCircle, elevated && styles.iconCircleElevated]}>
            <Text style={[styles.iconText, elevated && { color: colors.primary }]}>{ICONS[item.type] || '🔔'}</Text>
          </View>
        )}
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          {elevated && (
            <View style={styles.elevatedTag}>
              <Text style={styles.elevatedTagText}>
                {item.type === 'expert_karma' ? 'EXPERT UPVOTE' : 'EXPERT ANSWER'}
              </Text>
            </View>
          )}
          <Text style={[styles.text, elevated && styles.textElevated]}>{item.text}</Text>
          <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
        </View>
        {!item.read && <View style={[styles.dot, elevated && { backgroundColor: colors.primary }]} />}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(n) => n.id}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={<EmptyState icon="🔔" title="You're all caught up" subtitle="Answers, follows and milestones will show up here as the community responds." />}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
      />
    </View>
  );
}

const createStyles = (colors, spacing, font, radius, shadow) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  sectionHeader: { fontSize: font.tiny, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.lg, marginBottom: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  rowUnread: { backgroundColor: colors.surfaceAlt },
  rowElevated: { borderColor: colors.primary, borderWidth: 1.5, ...shadow.card },
  iconCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.bgSunken, alignItems: 'center', justifyContent: 'center' },
  iconCircleElevated: { backgroundColor: colors.primaryTint },
  iconText: { fontSize: 19 },
  elevatedTag: { alignSelf: 'flex-start', backgroundColor: colors.primaryTint, paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.pill, marginBottom: 4 },
  elevatedTagText: { color: colors.primary, fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  text: { fontSize: font.caption, color: colors.text, lineHeight: 20 },
  textElevated: { fontWeight: '700' },
  time: { fontSize: font.tiny, color: colors.textMuted, marginTop: 3, fontWeight: '600' },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.secondary, marginLeft: spacing.sm },
});
