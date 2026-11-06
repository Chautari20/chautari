import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated, Easing } from 'react-native';
import { useData, useSelectors } from '../../data/store';
import { useTheme } from '../../theme/ThemeContext';
import { CHECKLIST_ITEMS, CHECKLIST_TOTAL } from '../../data/checklist';

export default function ArrivalChecklistScreen({ navigation }) {
  const { dispatch } = useData();
  const { checklistDoneCount, isChecklistItemDone, isNewcomerActive } = useSelectors();
  const { colors, spacing, font, radius, shadow } = useTheme();
  const styles = useMemo(() => createStyles(colors, spacing, font, radius, shadow), [colors, spacing, font, radius, shadow]);

  const done = checklistDoneCount();
  const pct = done / CHECKLIST_TOTAL;
  const allDone = done === CHECKLIST_TOTAL;
  const prevDone = useRef(done);
  const flash = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  const newcomerActive = isNewcomerActive();

  useEffect(() => {
    if (!newcomerActive) navigation.goBack();
  }, [newcomerActive, navigation]);

  useEffect(() => {
    if (prevDone.current < CHECKLIST_TOTAL && done === CHECKLIST_TOTAL) {
      flash.setValue(0);
      Animated.parallel([
        Animated.timing(flash, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.04, duration: 200, useNativeDriver: true }),
          Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
        ]),
      ]).start();
    }
    prevDone.current = done;
  }, [done, flash, scale]);

  const toggle = (itemId) => {
    dispatch({ type: 'TOGGLE_CHECKLIST_ITEM', itemId });
  };

  const openThread = (questionId) => {
    navigation.navigate('QuestionDetail', { questionId, fromChecklist: true });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.body}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.intro}>
        Ten practical steps for your first month — tick them off as you go, and tap through to real community answers.
      </Text>

      <View style={styles.progressBlock}>
        <View style={styles.progressLabels}>
          <Text style={styles.progressTitle}>Your progress</Text>
          <Text style={styles.progressCount}>{done} of {CHECKLIST_TOTAL}</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(pct * 100)}%` }]} />
        </View>
      </View>

      {allDone ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.celebrate,
            {
              transform: [{ scale }],
            },
          ]}
        >
          <Animated.View
            pointerEvents="none"
            style={[
              styles.celebrateFlash,
              {
                opacity: flash.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, 0.5, 0] }),
              },
            ]}
          />
          <Text style={styles.celebrateEmoji}>🎉</Text>
          <Text style={styles.celebrateTitle}>You made it through the first 30 days</Text>
          <Text style={styles.celebrateBody}>The basics are sorted — keep posting on Chautari whenever you need a hand.</Text>
        </Animated.View>
      ) : null}

      {CHECKLIST_ITEMS.map((item) => {
        const checked = isChecklistItemDone(item.id);
        return (
          <View key={item.id} style={styles.item}>
            <View style={styles.checkRow}>
              <Pressable
                onPress={() => toggle(item.id)}
                style={styles.checkboxHit}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
              >
                <View style={[styles.checkbox, checked && styles.checkboxOn]}>
                  {checked ? <Text style={styles.checkMark}>✓</Text> : null}
                </View>
              </Pressable>
              <Pressable
                onPress={() => toggle(item.id)}
                style={styles.itemText}
                accessibilityRole="button"
                accessibilityLabel={`${checked ? 'Uncheck' : 'Check'} ${item.title}`}
              >
                <Text style={[styles.itemTitle, checked && styles.itemTitleDone]}>{item.title}</Text>
                <Text style={styles.itemExplainer}>{item.explainer}</Text>
              </Pressable>
            </View>
            {item.questionId ? (
              <Pressable
                onPress={() => openThread(item.questionId)}
                style={styles.linkRow}
                hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
              >
                <Text style={styles.linkText}>See answers from the community →</Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const createStyles = (colors, spacing, font, radius, shadow) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  body: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  intro: { fontSize: font.body, color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.lg },
  progressBlock: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg, ...shadow.card },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  progressTitle: { fontWeight: '800', fontSize: font.body, color: colors.text },
  progressCount: { fontWeight: '800', fontSize: font.caption, color: colors.primary },
  track: { height: 8, backgroundColor: colors.bgSunken, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.pill },

  celebrate: {
    backgroundColor: colors.secondaryTint,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.expertMarkerBorder,
    alignItems: 'center',
    overflow: 'hidden',
    ...shadow.card,
  },
  celebrateFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.secondary,
  },
  celebrateEmoji: { fontSize: 32, marginBottom: spacing.sm },
  celebrateTitle: { fontSize: font.subtitle, fontWeight: '800', color: colors.secondaryDark, textAlign: 'center' },
  celebrateBody: { fontSize: font.caption, color: colors.secondaryDark, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20, opacity: 0.9 },

  item: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadow.card,
  },
  checkRow: { flexDirection: 'row', padding: spacing.lg, paddingBottom: spacing.sm, gap: spacing.sm },
  checkboxHit: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkMark: { color: colors.onPrimary, fontSize: 14, fontWeight: '900' },
  itemText: { flex: 1, paddingVertical: 2 },
  itemTitle: { fontSize: font.body, fontWeight: '800', color: colors.text, marginBottom: 4 },
  itemTitleDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
  itemExplainer: { fontSize: font.caption, color: colors.textSecondary, lineHeight: 20 },
  linkRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
    minHeight: 44,
    justifyContent: 'center',
  },
  linkText: { color: colors.primary, fontWeight: '800', fontSize: font.caption },
});
