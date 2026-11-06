import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';
import QuestionCard from '../../components/feed/QuestionCard';
import { Input, Chip, EmptyState } from '../../components/common/ui';
import { useSelectors } from '../../data/store';
import { useNavigationGuard, openAuthorProfile } from '../../utils/navigation';
import { SUBURBS } from '../../data/categories';
import CircleChip from '../../components/circles/CircleChip';
import { useTheme } from '../../theme/ThemeContext';

const DATE_RANGES = [
  { id: 'any', label: 'Any time', ms: Infinity },
  { id: '24h', label: 'Past 24h', ms: 24 * 60 * 60 * 1000 },
  { id: '7d', label: 'Past week', ms: 7 * 24 * 60 * 60 * 1000 },
  { id: '30d', label: 'Past month', ms: 30 * 24 * 60 * 60 * 1000 },
];

const LIST_PERF = {
  initialNumToRender: 8,
  maxToRenderPerBatch: 6,
  windowSize: 7,
  removeClippedSubviews: true,
};

// Search bar + filters (category, suburb, date range) with live results.
export default function SearchScreen({ navigation, route }) {
  const { colors, spacing, font } = useTheme();
  const styles = useMemo(() => createStyles(colors, spacing, font), [colors, spacing, font]);

  const { feedQuestions, userById, circleById, state, answerCount, expertAnswerOn } = useSelectors();
  const { navigate } = useNavigationGuard(navigation);
  const [query, setQuery] = useState('');
  const [circleFilter, setCircleFilter] = useState(null);
  const [suburb, setSuburb] = useState(null);
  const [range, setRange] = useState('any');
  const [showFilters, setShowFilters] = useState(true);

  // Reset only when Home explicitly requests a fresh search (avoids wiping state on back from detail).
  useFocusEffect(
    useCallback(() => {
      if (route.params?.reset) {
        setQuery('');
        setCircleFilter(null);
        setSuburb(null);
        setRange('any');
        navigation.setParams({ reset: undefined });
      }
    }, [route.params?.reset, navigation]),
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rangeMs = DATE_RANGES.find((r) => r.id === range)?.ms ?? Infinity;
    return feedQuestions().filter((item) => {
      if (q && !(item.title.toLowerCase().includes(q) || item.body.toLowerCase().includes(q))) return false;
      if (circleFilter && item.circleId !== circleFilter) return false;
      if (suburb) {
        const author = userById(item.authorId);
        if (item.anonymous || author?.suburb !== suburb) return false;
      }
      if (Date.now() - item.createdAt > rangeMs) return false;
      return true;
    });
  }, [query, circleFilter, suburb, range, feedQuestions, userById]);

  const activeFilters = (circleFilter ? 1 : 0) + (suburb ? 1 : 0) + (range !== 'any' ? 1 : 0);
  const headerHeight = useHeaderHeight();

  const renderItem = useCallback(
    ({ item }) => (
      <QuestionCard
        question={item}
        author={userById(item.authorId)}
        circle={circleById(item.circleId)}
        answerCount={answerCount(item)}
        onCirclePress={() => navigate('CircleDetail', { circleId: item.circleId })}
        onAuthorPress={() => openAuthorProfile(navigate, userById, item.authorId, { anonymous: item.anonymous, authUserId: state.authUserId, navigation })}
        expert={expertAnswerOn(item)?.expert || null}
        onPress={() => navigate('QuestionDetail', { questionId: item.id })}
      />
    ),
    [userById, circleById, answerCount, expertAnswerOn, navigate],
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
    >
      <View style={styles.searchBar}>
        <Input placeholder="Search posts…" value={query} onChangeText={setQuery} returnKeyType="search" style={{ flex: 1 }} />
      </View>

      <Pressable style={styles.filterToggle} onPress={() => setShowFilters((s) => !s)}>
        <Text style={styles.filterToggleText}>{showFilters ? '▾' : '▸'} Filters{activeFilters ? ` (${activeFilters})` : ''}</Text>
        {activeFilters > 0 && (
          <Pressable onPress={() => { setCircleFilter(null); setSuburb(null); setRange('any'); }}>
            <Text style={styles.clear}>Clear</Text>
          </Pressable>
        )}
      </Pressable>

      {showFilters && (
        <View style={styles.filters}>
          <Text style={styles.filterLabel}>Circle</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowChips}>
            {state.circles.map((c) => (
              <Pressable key={c.id} onPress={() => setCircleFilter(circleFilter === c.id ? null : c.id)} style={{ opacity: circleFilter && circleFilter !== c.id ? 0.55 : 1 }}>
                <CircleChip circle={c} compact showOfficial />
              </Pressable>
            ))}
          </ScrollView>
          <Text style={styles.filterLabel}>Suburb</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowChips}>
            {SUBURBS.map((s) => (
              <Chip key={s} label={s} active={suburb === s} onPress={() => setSuburb(suburb === s ? null : s)} />
            ))}
          </ScrollView>
          <Text style={styles.filterLabel}>Date</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowChips}>
            {DATE_RANGES.map((r) => (
              <Chip key={r.id} label={r.label} active={range === r.id} onPress={() => setRange(r.id)} />
            ))}
          </ScrollView>
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={(q) => q.id}
        ListHeaderComponent={<Text style={styles.resultCount}>{results.length} result{results.length === 1 ? '' : 's'}</Text>}
        renderItem={renderItem}
        ListEmptyComponent={<EmptyState icon="🔍" title="No matches" subtitle="Try a different keyword or clear your filters." />}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        {...LIST_PERF}
      />
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors, spacing, font) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  searchBar: { padding: spacing.lg, paddingBottom: spacing.sm },
  filterToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  filterToggleText: { fontWeight: '700', color: colors.text },
  clear: { color: colors.primary, fontWeight: '700', fontSize: font.small },
  filters: { paddingBottom: spacing.sm },
  filterLabel: { fontSize: font.tiny, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', paddingHorizontal: spacing.lg, marginTop: spacing.sm, marginBottom: 6 },
  rowChips: { paddingHorizontal: spacing.lg, paddingBottom: 4 },
  resultCount: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, color: colors.textMuted, fontSize: font.small, fontWeight: '600' },
});
