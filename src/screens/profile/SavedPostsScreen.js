import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import QuestionFeedList from '../../components/feed/QuestionFeedList';
import { EmptyState } from '../../components/common/ui';
import { useData, useSelectors } from '../../data/store';
import { useTheme } from '../../theme/ThemeContext';
import { useToast } from '../../components/common/Toast';

export default function SavedPostsScreen({ navigation }) {
  const { dispatch } = useData();
  const { savedQuestionsList } = useSelectors();
  const { colors, radius } = useTheme();
  const showToast = useToast();
  const data = savedQuestionsList();

  const unsave = useCallback((questionId) => {
    dispatch({ type: 'TOGGLE_SAVE_QUESTION', questionId });
    showToast('Removed from saved', { tone: 'default' });
  }, [dispatch, showToast]);

  const renderUnsave = useCallback((questionId) => (
    <Pressable
      onPress={() => unsave(questionId)}
      hitSlop={12}
      style={[styles.unsaveBtn, { backgroundColor: colors.bgSunken, borderRadius: radius.pill }]}
    >
      <Text style={[styles.unsaveText, { color: colors.textMuted }]}>🔖 Saved · tap to remove</Text>
    </Pressable>
  ), [unsave, colors, radius]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <QuestionFeedList
        data={data}
        navigation={navigation}
        renderCardFooter={renderUnsave}
        ListEmptyComponent={(
          <EmptyState
            icon="🔖"
            title="Nothing saved yet"
            subtitle="Tap the bookmark on any post to save it here for later."
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  unsaveBtn: { marginHorizontal: 16, marginTop: -4, marginBottom: 8, paddingVertical: 6, paddingHorizontal: 12, alignSelf: 'flex-start' },
  unsaveText: { fontSize: 11, fontWeight: '700' },
});
