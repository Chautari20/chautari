import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Linking } from 'react-native';
import Avatar from '../common/Avatar';
import VerifiedBadge from '../common/VerifiedBadge';
import KarmaBadge from '../common/KarmaBadge';
import FoundingMemberBadge from '../common/FoundingMemberBadge';
import Button from '../common/Button';
import QuestionCard from '../feed/QuestionCard';
import { EmptyState } from '../common/ui';
import { useSelectors } from '../../data/store';
import { useNavigationGuard, openAuthorProfile, resolveUserId } from '../../utils/navigation';
import { categoryName } from '../../data/categories';
import { compactNumber } from '../../utils/format';
import { useTheme } from '../../theme/ThemeContext';

// Shared profile layout for My / Other / Expert profiles.
// `actions` is rendered under the stats row; `mode` tweaks copy.
export default function ProfileView({ userId, navigation, actions, showFollowers }) {
  const { userById, circleById, questionsByAuthor, answerCount, state, expertAnswerOn, karmaFor } = useSelectors();
  const { navigate } = useNavigationGuard(navigation);
  const { colors, spacing, font } = useTheme();
  const styles = useMemo(() => createStyles(colors, spacing, font), [colors, spacing, font]);
  const resolvedUserId = resolveUserId(userId, state.authUserId);
  const user = userById(resolvedUserId);
  if (!user) return <EmptyState icon="👻" title="User not found" />;

  const posts = questionsByAuthor(resolvedUserId);
  const followingCount = resolvedUserId === 'me' ? state.following.length : Math.round((user.followers || 0) * 0.4);

  const header = (
    <View>
      <View style={styles.top}>
        <Avatar name={user.name} photo={user.photo} size={84} />
        <View style={styles.nameRow}>
          <Text style={styles.name}>{user.name}</Text>
          {user.verified ? <VerifiedBadge /> : null}
          {user.isFoundingMember ? <FoundingMemberBadge number={user.foundingMemberNumber} /> : null}
          <KarmaBadge karma={karmaFor(resolvedUserId)} />
        </View>
        {user.profession ? <Text style={styles.profession}>{user.profession}{user.verifiedCategory ? ` · ${categoryName(user.verifiedCategory)}` : ''}</Text> : null}
        {user.suburb ? <Text style={styles.suburb}>📍 {user.suburb}</Text> : null}
        {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{posts.length}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          {showFollowers !== false && (
            <View style={styles.stat}>
              <Text style={styles.statNum}>{compactNumber(user.followers || 0)}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
          )}
          <View style={styles.stat}>
            <Text style={styles.statNum}>{compactNumber(followingCount)}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>

        {user.verified && user.contact ? (
          <Button
            title="Contact"
            icon="✉️"
            variant="secondary"
            style={{ marginTop: spacing.md }}
            onPress={() => Linking.openURL(user.contact).catch(() => {})}
          />
        ) : null}

        {actions}
      </View>
      <Text style={styles.postsHeading}>{resolvedUserId === 'me' ? 'Your posts' : 'Posts'}</Text>
    </View>
  );

  const renderItem = useCallback(
    ({ item }) => (
      <QuestionCard
        question={item}
        author={user}
        circle={circleById(item.circleId)}
        answerCount={answerCount(item)}
        onCirclePress={() => navigate('CircleDetail', { circleId: item.circleId })}
        onAuthorPress={() => openAuthorProfile(navigate, userById, item.authorId, { anonymous: item.anonymous, authUserId: state.authUserId, navigation })}
        expert={expertAnswerOn(item)?.expert || null}
        onPress={() => navigate('QuestionDetail', { questionId: item.id })}
      />
    ),
    [user, userById, circleById, answerCount, expertAnswerOn, navigate],
  );

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      data={posts}
      keyExtractor={(q) => q.id}
      ListHeaderComponent={header}
      renderItem={renderItem}
      ListEmptyComponent={<EmptyState icon="📝" title="No posts yet" subtitle={resolvedUserId === 'me' ? 'Questions you post will show up here.' : 'This person has not posted publicly yet.'} />}
      contentContainerStyle={{ paddingBottom: 40 }}
      initialNumToRender={6}
      windowSize={7}
      removeClippedSubviews
    />
  );
}

const createStyles = (colors, spacing, font) => StyleSheet.create({
  top: { backgroundColor: colors.surface, alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.md, flexWrap: 'wrap', justifyContent: 'center' },
  name: { fontSize: font.h2, fontWeight: '800', color: colors.text },
  profession: { color: colors.primary, fontWeight: '700', fontSize: font.small, marginTop: 4 },
  suburb: { color: colors.textMuted, fontSize: font.small, marginTop: 4 },
  bio: { color: colors.text, fontSize: font.small, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20, paddingHorizontal: spacing.md },
  stats: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.lg },
  stat: { alignItems: 'center', minWidth: 64 },
  statNum: { fontSize: font.h3, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: font.tiny, color: colors.textMuted, marginTop: 2 },
  postsHeading: { fontSize: font.h3, fontWeight: '700', color: colors.text, padding: spacing.lg, paddingBottom: spacing.sm },
});
