import React, { useCallback, useMemo } from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import QuestionCard from './QuestionCard';
import { FadeRise } from '../common/Motion';
import { EmptyState } from '../common/ui';
import { useSelectors } from '../../data/store';
import { useNavigationGuard, openAuthorProfile } from '../../utils/navigation';
import { useTheme } from '../../theme/ThemeContext';

const LIST_PERF = {
  initialNumToRender: 8,
  maxToRenderPerBatch: 6,
  windowSize: 7,
  removeClippedSubviews: true,
};

export default function QuestionFeedList({
  data,
  navigation,
  replayKey = 0,
  ListHeaderComponent,
  ListEmptyComponent,
  contentContainerStyle,
  refreshControl,
  renderCardFooter,
  insertAfterIndex = null,
  InsertComponent = null,
  onEndReached,
  hasMore = false,
  listRef,
}) {
  const { userById, circleById, answerCount, expertAnswerOn, state } = useSelectors();
  const { navigate } = useNavigationGuard(navigation);
  const { spacing } = useTheme();

  const openQuestion = useCallback(
    (questionId) => navigate('QuestionDetail', { questionId }),
    [navigate],
  );

  const renderItem = useCallback(
    ({ item, index }) => {
      const ei = expertAnswerOn(item);
      const card = (
        <FadeRise index={index} replayKey={replayKey}>
          <QuestionCard
            question={item}
            author={userById(item.authorId)}
            circle={circleById(item.circleId)}
            answerCount={answerCount(item)}
            expert={ei?.expert || null}
            onPress={() => openQuestion(item.id)}
            onCirclePress={() => navigate('CircleDetail', { circleId: item.circleId })}
            onAuthorPress={() => openAuthorProfile(navigate, userById, item.authorId, { anonymous: item.anonymous, authUserId: state.authUserId, navigation })}
          />
          {renderCardFooter ? renderCardFooter(item.id) : null}
        </FadeRise>
      );
      if (InsertComponent && insertAfterIndex != null && index === insertAfterIndex) {
        return (
          <View>
            {card}
            <InsertComponent />
          </View>
        );
      }
      return card;
    },
    [userById, circleById, answerCount, expertAnswerOn, openQuestion, navigate, replayKey, renderCardFooter, insertAfterIndex, InsertComponent],
  );

  const empty = useMemo(
    () => ListEmptyComponent || (
      <EmptyState icon="🌿" title="No posts yet" subtitle="Be the first to post in this category." />
    ),
    [ListEmptyComponent],
  );

  const handleEndReached = useCallback(() => {
    if (hasMore && onEndReached) onEndReached();
  }, [hasMore, onEndReached]);

  return (
    <FlatList
      ref={listRef}
      style={styles.list}
      data={data}
      keyExtractor={(q) => q.id}
      renderItem={renderItem}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={empty}
      contentContainerStyle={[{ paddingTop: spacing.sm, paddingBottom: 40 }, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
      onEndReached={onEndReached ? handleEndReached : undefined}
      onEndReachedThreshold={0.35}
      {...LIST_PERF}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1 },
});
