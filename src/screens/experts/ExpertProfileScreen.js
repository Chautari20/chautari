import React, { useMemo, useLayoutEffect, useEffect } from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import MissingParamsFallback from '../../components/common/MissingParamsFallback';
import ProfileView from '../../components/profile/ProfileView';
import Button from '../../components/common/Button';
import { useToast } from '../../components/common/Toast';
import { useData, useSelectors } from '../../data/store';
import { useTheme } from '../../theme/ThemeContext';
import { isSelfUserId, openSelfProfile, resolveUserId } from '../../utils/navigation';

// Expert Profile: bio, profession, suburb, contact, posts, follower count, follow.
export default function ExpertProfileScreen({ navigation, route }) {
  const { spacing } = useTheme();
  const styles = useMemo(() => createStyles(spacing), [spacing]);

  const { userId: rawUserId } = route.params || {};
  const { dispatch, state } = useData();
  const { userById, isFollowing } = useSelectors();
  const showToast = useToast();
  const userId = rawUserId ? resolveUserId(rawUserId, state.authUserId) : null;
  const user = userId ? userById(userId) : null;
  const following = userId ? isFollowing(userId) : false;

  useEffect(() => {
    if (!rawUserId) return;
    if (isSelfUserId(rawUserId, state.authUserId)) {
      openSelfProfile(navigation);
    }
  }, [rawUserId, state.authUserId, navigation]);

  const toggleFollow = async () => {
    if (!userId) return;
    const res = await dispatch({ type: 'TOGGLE_FOLLOW', userId });
    if (res?.ok === false) return;
    showToast(following ? `Unfollowed ${user?.name}` : `Following ${user?.name}`, { tone: following ? 'default' : 'success' });
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => navigation.navigate('Report', { kind: 'expert', targetType: 'expert', targetId: userId, targetTitle: user?.name })} hitSlop={10}>
          <Text style={{ fontSize: 18 }}>⋯</Text>
        </Pressable>
      ),
    });
  }, [navigation, user]);

  if (!rawUserId) {
    return (
      <MissingParamsFallback
        navigation={navigation}
        title="Profile couldn't be loaded"
        message="This profile link is missing required information."
      />
    );
  }

  if (isSelfUserId(rawUserId, state.authUserId)) return null;

  return (
    <ProfileView
      userId={userId}
      navigation={navigation}
      showFollowers
      actions={
        <View style={styles.actions}>
          <Button
            title={following ? 'Following ✓' : '+ Follow'}
            variant={following ? 'secondary' : 'primary'}
            onPress={toggleFollow}
          />
        </View>
      }
    />
  );
}

const createStyles = (spacing) => StyleSheet.create({
  actions: { alignSelf: 'stretch', marginTop: spacing.md },
});
