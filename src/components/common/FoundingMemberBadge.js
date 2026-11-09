import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

function foundingMemberLabel(number) {
  const n = Number(number);
  return Number.isInteger(n) && n > 0 ? `Founding member #${n}` : 'Founding member';
}

// Quiet saffron chip — profiles only. Diyo-style mark from motif language.
export default function FoundingMemberBadge({ number }) {
  const { colors, spacing, font, radius, shadow } = useTheme();
  const styles = useMemo(() => createStyles(colors, spacing, font, radius, shadow), [colors, spacing, font, radius, shadow]);
  const [open, setOpen] = useState(false);
  const label = foundingMemberLabel(number);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.chip, pressed && { opacity: 0.88 }]}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <View style={styles.mark}>
          <Text style={styles.markIcon}>🪔</Text>
        </View>
        <Text style={styles.label}>{label}</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.scrim} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetMark}><Text style={styles.sheetMarkIcon}>🪔</Text></View>
            <Text style={styles.sheetTitle}>{label}</Text>
            <Text style={styles.sheetBody}>
              One of the first 1,000 members of Chautari. This badge is permanent.
            </Text>
            <Pressable onPress={() => setOpen(false)} style={styles.dismissBtn}>
              <Text style={styles.dismissText}>Got it</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const createStyles = (colors, spacing, font, radius, shadow) => StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.secondaryTint,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.expertMarkerBorder,
  },
  mark: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: `${colors.secondary}33`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markIcon: { fontSize: 9 },
  label: { color: colors.secondaryDark, fontSize: font.tiny, fontWeight: '800', letterSpacing: 0.2 },

  scrim: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: spacing.xl },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadow.raised,
  },
  sheetMark: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.secondaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.expertMarkerBorder,
  },
  sheetMarkIcon: { fontSize: 22 },
  sheetTitle: { fontSize: font.h3, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  sheetBody: { fontSize: font.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  dismissBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: 12,
    borderRadius: radius.pill,
  },
  dismissText: { color: colors.onPrimary, fontWeight: '800', fontSize: font.body },
});
