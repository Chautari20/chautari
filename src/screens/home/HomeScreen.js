import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, RefreshControl, Alert, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ShinyWordmark from '../../components/common/ShinyWordmark';
import QuestionFeedList from '../../components/feed/QuestionFeedList';
import CirclesRecommendRow from '../../components/feed/CirclesRecommendRow';
import ChecklistFeedCard from '../../components/feed/ChecklistFeedCard';
import FeedSortToggle from '../../components/feed/FeedSortToggle';
import Avatar from '../../components/common/Avatar';
import VerifiedBadge from '../../components/common/VerifiedBadge';
import FollowButton from '../../components/profile/FollowButton';
import { EmptyState, CountBadge } from '../../components/common/ui';
import { PulseDot } from '../../components/common/Motion';
import { QuestionCardSkeleton } from '../../components/common/Skeleton';
import { useData, useSelectors } from '../../data/store';
import { useNetwork } from '../../data/network';
import { useNavigationGuard, openExpertProfile } from '../../utils/navigation';
import { useForYouFeed } from '../../hooks/useForYouFeed';
import { useLiveDataRefresh } from '../../hooks/useLiveDataRefresh';
import { useTheme } from '../../theme/ThemeContext';
import { professionLabel } from '../../data/categories';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function HomeScreen({ navigation }) {
  const {
    userById, me, followingFeed, hasExpertAnswer, circleById, effectiveJoinedCircleIds,
    newTodayCount, suggestedExperts, canOpenComposerToday,
    canExpertPostProfessionalToday, canPostMemberToday,
    expertProfessionalPostsToday, expertDailyPostLimit,
    memberPostsToday, memberDailyPostLimit,
    checklistDoneCount, isNewcomerActive, unreadNotifs, state,
  } = useSelectors();
  const { dispatch } = useData();
  const { online } = useNetwork();
  const { navigate } = useNavigationGuard(navigation);
  const { colors, shadow, spacing, font, radius } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadow, spacing, font, radius), [colors, shadow, spacing, font, radius]);
  const [tab, setTab] = useState('foryou');
  const [refreshing, setRefreshing] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sheenKey, setSheenKey] = useState(0);
  const listRef = useRef(null);
  const refreshingRef = useRef(false);
  const refreshLiveData = useLiveDataRefresh({ onFocus: true });

  useFocusEffect(useCallback(() => {
    setSheenKey((k) => k + 1);
  }, []));

  const forYou = useForYouFeed({
    questions: state.questions,
    hasExpertAnswer,
    joinedCircleIds: effectiveJoinedCircleIds(),
    circleById,
    currentUserId: 'me',
  });

  useEffect(() => {
    let timeout;
    const idleId = requestIdleCallback(() => {
      timeout = setTimeout(() => setLoading(false), 500);
    });
    return () => {
      cancelIdleCallback(idleId);
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  const user = me();
  const data = tab === 'foryou' ? forYou.data : followingFeed();
  const newToday = newTodayCount();
  const composerBlocked = !canOpenComposerToday();
  const expertProAtLimit = user?.verified && !canExpertPostProfessionalToday();
  const memberAtLimit = !canPostMemberToday();

  const openAsk = () => {
    if (composerBlocked) {
      if (user?.verified) {
        Alert.alert(
          'Daily limit reached',
          expertProAtLimit && memberAtLimit
            ? `You've used ${expertProfessionalPostsToday()}/${expertDailyPostLimit} professional and ${memberPostsToday()}/${memberDailyPostLimit} member posts today. Try again tomorrow.`
            : memberAtLimit
              ? `You've used your ${memberDailyPostLimit} member posts today. Try again tomorrow.`
              : `You've used your ${expertDailyPostLimit} professional posts today. Try again tomorrow.`,
        );
      } else {
        Alert.alert(
          'Daily limit reached',
          `You've used your ${memberDailyPostLimit} posts today. Try again tomorrow.`,
        );
      }
      return;
    }
    navigate('AskComposer');
  };

  const onRefresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    try {
      await refreshLiveData();
      if (tab === 'foryou') forYou.refresh();
      setReplayKey((k) => k + 1);
      setSheenKey((k) => k + 1);
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
    }
  }, [tab, forYou, refreshLiveData]);

  useEffect(() => {
    return navigation.addListener('tabPress', () => {
      // tabPress can fire after Home is focused when switching from another tab.
      // Only scroll if Home is already the selected tab in the tab bar.
      const tabState = navigation.getState();
      if (tabState?.routes?.[tabState.index]?.name !== 'Home') return;
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
      onRefresh();
    });
  }, [navigation, onRefresh]);

  const onLoadMore = useCallback(() => {
    if (tab === 'foryou' && forYou.hasMore) forYou.loadMore();
  }, [tab, forYou]);

  const onSortChange = useCallback((mode) => {
    LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'));
    forYou.setSortMode(mode);
    setReplayKey((k) => k + 1);
  }, [forYou]);

  const showChecklistCard = tab === 'foryou' && isNewcomerActive() && !state.checklistCardDismissed;
  const unread = unreadNotifs();

  const header = (
    <View style={styles.headerBlock}>
      <View style={styles.segment}>
        {[['foryou', 'For You'], ['following', 'Following']].map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => {
              if (tab !== key) {
                setTab(key);
                setReplayKey((k) => k + 1);
              }
            }}
            style={[styles.segBtn, tab === key && styles.segBtnActive]}
          >
            <Text style={[styles.segText, tab === key && styles.segTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      {tab === 'foryou' && newToday > 0 && (
        <View style={styles.livePill}>
          <PulseDot size={7} color={colors.live} />
          <Text style={styles.liveText}>{newToday} new {newToday === 1 ? 'post' : 'posts'} today</Text>
        </View>
      )}
      {tab === 'foryou' ? (
        <FeedSortToggle mode={forYou.sortMode} onChange={onSortChange} />
      ) : null}
      {showChecklistCard ? (
        <ChecklistFeedCard
          doneCount={checklistDoneCount()}
          onOpen={() => navigate('ArrivalChecklist')}
          onDismiss={() => dispatch({ type: 'DISMISS_CHECKLIST_CARD' })}
        />
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topbar}>
        <View style={styles.brandWrap}>
          <ShinyWordmark style={styles.brand} variant="header" replayKey={sheenKey} />
          <View style={styles.brandDot} />
        </View>
        <View style={styles.topActions}>
          <Pressable onPress={() => navigate('Search', { reset: true })} hitSlop={10} style={styles.topBtn}>
            <Text style={styles.topIcon}>🔍</Text>
          </Pressable>
          <Pressable onPress={() => navigate('Notifications')} hitSlop={10} style={styles.topBtn}>
            <Text style={styles.topIcon}>🔔</Text>
            {unread > 0 ? (
              <View style={styles.bellBadge}>
                <CountBadge count={unread} />
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>

      {!online && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>✈️  You're offline — showing saved content. New posts need a connection.</Text>
        </View>
      )}

      {loading ? (
        <View style={{ paddingTop: spacing.md }}>
          {header}
          {[0, 1, 2, 3].map((i) => <QuestionCardSkeleton key={i} />)}
        </View>
      ) : (
        <QuestionFeedList
          listRef={listRef}
          data={data}
          navigation={navigation}
          replayKey={replayKey}
          ListHeaderComponent={header}
          insertAfterIndex={tab === 'foryou' && data.length > 5 ? 4 : null}
          InsertComponent={tab === 'foryou' ? () => <CirclesRecommendRow navigation={navigation} /> : null}
          onEndReached={tab === 'foryou' ? onLoadMore : undefined}
          hasMore={tab === 'foryou' ? forYou.hasMore : false}
          ListEmptyComponent={
            tab === 'following' ? (
              <FollowingEmpty experts={suggestedExperts(3)} navigate={navigate} userById={userById} navigation={navigation} authUserId={state.authUserId} />
            ) : (
              <EmptyState
                icon="🌱"
                title="The chautari is quiet"
                subtitle="Be the first to post. Someone in the community will know the answer."
                action={{ label: 'Create a post', onPress: openAsk }}
              />
            )
          }
          contentContainerStyle={{ paddingBottom: 110 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        />
      )}

      {composerBlocked ? (
        <View style={styles.fabLimitWrap}>
          <Text style={styles.fabLimitHint}>
            {user?.verified
              ? `${expertProfessionalPostsToday()}/${expertDailyPostLimit} professional · ${memberPostsToday()}/${memberDailyPostLimit} member today`
              : `${memberPostsToday()}/${memberDailyPostLimit} posts today`}
          </Text>
        </View>
      ) : null}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          composerBlocked && styles.fabMuted,
          pressed && { transform: [{ scale: 0.96 }] },
        ]}
        onPress={openAsk}
      >
        <Text style={[styles.fabPlus, composerBlocked && styles.fabTextMuted]}>＋</Text>
        <Text style={[styles.fabText, composerBlocked && styles.fabTextMuted]}>Post</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function FollowingEmpty({ experts, navigate, userById, navigation, authUserId }) {
  const { colors, shadow, spacing, font, radius } = useTheme();
  const styles = useMemo(() => createStyles(colors, shadow, spacing, font, radius), [colors, shadow, spacing, font, radius]);
  return (
    <View style={{ paddingHorizontal: spacing.lg }}>
      <EmptyState
        icon="🤝"
        title="Build your feed"
        subtitle="Follow experts and members to see their posts and answers here first."
      />
      {experts.length > 0 && (
        <View style={styles.suggestWrap}>
          <Text style={styles.suggestLabel}>SUGGESTED EXPERTS</Text>
          {experts.map((u) => (
            <View key={u.id} style={styles.suggestRow}>
              <Pressable
                style={styles.suggestInfo}
                onPress={() => openExpertProfile(navigation, { userId: u.id, title: u.name, authUserId, navigate })}
              >
                <Avatar name={u.name} photo={u.photo} size={42} />
                <View style={{ marginLeft: spacing.sm, flex: 1 }}>
                  <View style={styles.suggestNameRow}>
                    <Text style={styles.suggestName} numberOfLines={1}>{u.name}</Text>
                    <VerifiedBadge compact />
                  </View>
                  <Text style={styles.suggestMeta} numberOfLines={1}>
                    {professionLabel(u)} · {u.suburb}
                  </Text>
                </View>
              </Pressable>
              <FollowButton userId={u.id} size="sm" />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const createStyles = (colors, shadow, spacing, font, radius) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  brandWrap: { flexDirection: 'row', alignItems: 'flex-end' },
  brand: { fontSize: font.display, fontWeight: '800', color: colors.primary, letterSpacing: -0.5 },
  brandDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.secondary, marginLeft: 3, marginBottom: 8 },
  topActions: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  topBtn: { width: 38, height: 38, borderRadius: radius.pill, backgroundColor: colors.bgSunken, alignItems: 'center', justifyContent: 'center' },
  topIcon: { fontSize: 18 },
  bellBadge: { position: 'absolute', right: 2, top: 2 },

  offlineBanner: { backgroundColor: colors.offlineBanner, paddingVertical: 8, paddingHorizontal: spacing.lg },
  offlineText: { color: colors.onDark, fontSize: font.tiny, fontWeight: '700', textAlign: 'center' },
  headerBlock: { paddingTop: spacing.md },
  segment: { flexDirection: 'row', backgroundColor: colors.bgSunken, borderRadius: radius.pill, marginHorizontal: spacing.lg, padding: 4 },
  segBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: radius.pill },
  segBtnActive: { backgroundColor: colors.surface, ...shadow.card },
  segText: { fontWeight: '800', color: colors.textMuted, fontSize: font.caption },
  segTextActive: { color: colors.primary },

  livePill: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'center', marginTop: spacing.md, backgroundColor: colors.secondaryTint, paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.pill },
  liveText: { color: colors.secondaryDark, fontSize: font.tiny, fontWeight: '800', letterSpacing: 0.2 },

  fabLimitWrap: { position: 'absolute', right: spacing.lg, bottom: spacing.xl + 58, alignItems: 'flex-end' },
  fabLimitHint: { fontSize: font.tiny, fontWeight: '800', color: colors.danger, backgroundColor: colors.dangerTint, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, overflow: 'hidden' },
  fab: { position: 'absolute', right: spacing.lg, bottom: spacing.xl, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingLeft: 18, paddingRight: 22, paddingVertical: 14, borderRadius: radius.pill, ...shadow.floating },
  fabMuted: { backgroundColor: colors.borderStrong },
  fabPlus: { color: colors.onPrimary, fontWeight: '700', fontSize: 20, marginTop: -2 },
  fabText: { color: colors.onPrimary, fontWeight: '800', fontSize: font.bodyLg, letterSpacing: 0.3 },
  fabTextMuted: { color: colors.textMuted },

  suggestWrap: { marginTop: spacing.sm, marginBottom: spacing.xl },
  suggestLabel: { fontSize: font.tiny, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8, marginBottom: spacing.md, marginLeft: 4 },
  suggestRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm, ...shadow.card },
  suggestInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: spacing.sm },
  suggestNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  suggestName: { fontWeight: '800', fontSize: font.body, color: colors.text, flexShrink: 1 },
  suggestMeta: { color: colors.textMuted, fontSize: font.tiny, marginTop: 2, fontWeight: '600' },
});
