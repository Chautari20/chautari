import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { MotifBand } from './Motif';

function useUIStyles() {
  const { colors, spacing, radius, font, line, shadow } = useTheme();
  return useMemo(() => createStyles(colors, spacing, radius, font, line, shadow), [colors, spacing, radius, font, line, shadow]);
}

export function EmptyState({ icon = '🌿', title, subtitle, action, children }) {
  const { spacing } = useTheme();
  const styles = useUIStyles();
  return (
    <View style={styles.empty}>
      <MotifBand count={7} style={{ marginBottom: spacing.lg, opacity: 0.7 }} />
      {icon ? <Text style={{ fontSize: 40, marginBottom: spacing.md }}>{icon}</Text> : null}
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySub}>{subtitle}</Text> : null}
      {children}
      {action ? (
        <Pressable onPress={action.onPress} style={styles.emptyAction}>
          <Text style={styles.emptyActionText}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Chip({ label, icon, active, onPress, tone = 'primary' }) {
  const styles = useUIStyles();
  const activeStyle = tone === 'saffron' ? styles.chipActiveSaffron : styles.chipActive;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.chip, active && activeStyle, pressed && { opacity: 0.85 }]}>
      {icon ? <Text style={styles.chipIcon}>{icon} </Text> : null}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

// Small static label pill (category, suburb, status). Tones map to theme.
export function Pill({ label, icon, tone = 'neutral', style }) {
  const styles = useUIStyles();
  const toneStyle =
    tone === 'category' ? styles.pillCategory :
    tone === 'suburb' ? styles.pillSuburb :
    tone === 'saffron' ? styles.pillSaffron :
    styles.pillNeutral;
  const textStyle =
    tone === 'category' ? styles.pillCategoryText :
    tone === 'suburb' ? styles.pillSuburbText :
    tone === 'saffron' ? styles.pillSaffronText :
    styles.pillNeutralText;
  return (
    <View style={[styles.pill, toneStyle, style]}>
      {icon ? <Text style={[textStyle, { marginRight: 3 }]}>{icon}</Text> : null}
      <Text style={textStyle} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export function SectionLabel({ children, style }) {
  const styles = useUIStyles();
  return <Text style={[styles.sectionLabel, style]}>{children}</Text>;
}

export function Field({ label, hint, error, errorDetail, children }) {
  const { spacing } = useTheme();
  const styles = useUIStyles();
  return (
    <View style={{ marginBottom: spacing.lg }}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      {children}
      {error ? <Text style={styles.fieldError}>{error}</Text> : hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
      {error && errorDetail ? <Text style={styles.fieldErrorDetail}>{errorDetail}</Text> : null}
    </View>
  );
}

export function Input({ style, multiline, ...props }) {
  const { colors } = useTheme();
  const styles = useUIStyles();
  return (
    <TextInput
      placeholderTextColor={colors.textFaint}
      multiline={multiline}
      style={[styles.input, multiline && styles.inputMultiline, style]}
      {...props}
    />
  );
}

// Live character counter that turns warm-green when the value is valid, muted
// while too short, and danger when over the max. Encouraging, not punishing.
export function CharCount({ value = '', min, max }) {
  const { colors } = useTheme();
  const styles = useUIStyles();
  const len = value.trim().length;
  const valid = (min == null || len >= min) && (max == null || len <= max);
  const over = max != null && len > max;
  const color = over ? colors.danger : valid && len > 0 ? colors.success : colors.textFaint;
  return (
    <Text style={[styles.charCount, { color }]}>
      {valid && len > 0 ? '✓ ' : ''}{len}{max ? `/${max}` : ''}
    </Text>
  );
}

export function Divider({ style }) {
  const styles = useUIStyles();
  return <View style={[styles.divider, style]} />;
}

export function CountBadge({ count, tone = 'primary' }) {
  const { colors } = useTheme();
  const styles = useUIStyles();
  if (!count) return null;
  return (
    <View style={[styles.countBadge, tone === 'saffron' && { backgroundColor: colors.secondary }]}>
      <Text style={styles.countBadgeText}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

// A soft, full-bleed surface card used to group content.
export function Card({ children, style }) {
  const styles = useUIStyles();
  return <View style={[styles.cardSurface, style]}>{children}</View>;
}

const createStyles = (colors, spacing, radius, font, line, shadow) => StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 56, paddingHorizontal: spacing.xl },
  emptyTitle: { fontSize: font.subtitle, fontWeight: '800', color: colors.text, textAlign: 'center' },
  emptySub: { fontSize: font.caption, color: colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: line.caption, maxWidth: 300 },
  emptyAction: { marginTop: spacing.lg, backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: 12, borderRadius: radius.pill, ...shadow.card },
  emptyActionText: { color: colors.onPrimary, fontWeight: '800', fontSize: font.body },

  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, marginRight: spacing.sm },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipActiveSaffron: { backgroundColor: colors.secondary, borderColor: colors.secondary },
  chipIcon: { fontSize: font.caption },
  chipText: { color: colors.text, fontWeight: '700', fontSize: font.caption },
  chipTextActive: { color: colors.onPrimary },

  pill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill, maxWidth: 180 },
  pillNeutral: { backgroundColor: colors.bgSunken },
  pillNeutralText: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '700' },
  pillCategory: { backgroundColor: colors.primaryTint },
  pillCategoryText: { color: colors.primaryDark, fontSize: font.tiny, fontWeight: '800', letterSpacing: 0.2 },
  pillSuburb: { backgroundColor: colors.bgSunken },
  pillSuburbText: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '700' },
  pillSaffron: { backgroundColor: colors.secondaryTint },
  pillSaffronText: { color: colors.secondaryDark, fontSize: font.tiny, fontWeight: '800' },

  sectionLabel: { fontSize: font.tiny, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm, marginTop: spacing.sm },
  fieldLabel: { fontSize: font.caption, fontWeight: '800', color: colors.text, marginBottom: 7 },
  fieldHint: { fontSize: font.tiny, color: colors.textMuted, marginTop: 5 },
  fieldError: { fontSize: font.tiny, color: colors.danger, marginTop: 5, fontWeight: '700' },
  fieldErrorDetail: { fontSize: font.tiny, color: colors.textMuted, marginTop: 2 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 13, fontSize: font.body, color: colors.text },
  inputMultiline: { minHeight: 120, textAlignVertical: 'top', paddingTop: 13, lineHeight: 22 },
  charCount: { fontSize: font.tiny, fontWeight: '800', alignSelf: 'flex-end' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  countBadge: { backgroundColor: colors.primary, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  countBadgeText: { color: colors.onPrimary, fontSize: 10, fontWeight: '800' },
  cardSurface: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, ...shadow.card },
});
