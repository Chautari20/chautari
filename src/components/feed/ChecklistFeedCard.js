import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { CHECKLIST_TOTAL } from '../../data/checklist';

export default function ChecklistFeedCard({ doneCount, onOpen, onDismiss }) {
  const { colors, spacing, font, radius, shadow } = useTheme();
  const styles = useMemo(() => createStyles(colors, spacing, font, radius, shadow), [colors, spacing, font, radius, shadow]);

}

const createStyles = (colors, spacing, font, radius, shadow) => StyleSheet.create({
  wrap: { marginHorizontal: spacing.lg, marginBottom: spacing.md, position: 'relative' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    paddingRight: spacing.lg,
    ...shadow.card,
  },
  textCol: { flex: 1, paddingRight: spacing.sm },
  eyebrow: { fontSize: font.tiny, fontWeight: '800', color: colors.secondaryDark, letterSpacing: 0.6, marginBottom: 4 },
  title: { fontSize: font.body, fontWeight: '800', color: colors.text, lineHeight: 20 },
  subtitle: { fontSize: font.tiny, color: colors.textMuted, marginTop: 4, lineHeight: 16 },
  progress: { fontSize: font.tiny, fontWeight: '800', color: colors.primary, marginTop: spacing.sm },
  emoji: { fontSize: 28 },
  dismiss: {
    position: 'absolute',
    top: 8,
    right: spacing.lg + 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bgSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissIcon: { fontSize: 12, color: colors.textMuted, fontWeight: '700' },
});
