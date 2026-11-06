import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import ExpertPostQuota from '../../components/question/ExpertPostQuota';
import QuestionFeedList from '../../components/feed/QuestionFeedList';
import { EmptyState } from '../../components/common/ui';
import { useSelectors } from '../../data/store';
import { useTheme } from '../../theme/ThemeContext';

export default function MyPostsScreen({ navigation }) {
  const {
    myQuestions, me, canOpenComposerToday,
    canExpertPostProfessionalToday, canPostMemberToday,
    expertProfessionalPostsToday, expertDailyPostLimit,
    memberPostsToday, memberDailyPostLimit,
  } = useSelectors();
  const { colors, spacing } = useTheme();
  const data = myQuestions();
  const user = me();
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
    navigation.navigate('AskComposer');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <QuestionFeedList
        data={data}
        navigation={navigation}
        ListHeaderComponent={(
          <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
            <ExpertPostQuota variant="banner" />
          </View>
        )}
        ListEmptyComponent={(
          <EmptyState
            icon="✍️"
            title="No posts yet"
            subtitle="Your posts will show up here."
            action={{ label: 'Create a post', onPress: openAsk }}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
