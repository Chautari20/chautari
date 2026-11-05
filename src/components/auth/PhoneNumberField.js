import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Input } from '../common/ui';
import { useTheme } from '../../theme/ThemeContext';

export function digitsFromRoute(route) {
  const raw = route?.params?.phone || route?.params?.phoneE164 || '';
  return String(raw).replace(/^\+61\s?/, '').replace(/\D/g, '');
}

export default function PhoneNumberField({ value, onChangeText, autoFocus = true }) {
  const { colors, spacing, font, radius } = useTheme();
  const styles = useMemo(() => createStyles(colors, spacing, font, radius), [colors, spacing, font, radius]);

  return (
    <View style={styles.phoneRow}>
      <View style={styles.prefix}><Text style={styles.prefixText}>🇦🇺 +61</Text></View>
      <Input
        style={styles.phoneInput}
        placeholder="412 345 678"
        keyboardType="number-pad"
        value={value}
        onChangeText={onChangeText}
        maxLength={12}
        autoFocus={autoFocus}
      />
    </View>
  );
}

const createStyles = (colors, spacing, font, radius) => StyleSheet.create({
  phoneRow: { flexDirection: 'row', gap: spacing.sm },
  prefix: { justifyContent: 'center', paddingHorizontal: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  prefixText: { fontSize: font.body, fontWeight: '700', color: colors.text },
  phoneInput: { flex: 1, fontSize: font.h3, letterSpacing: 1 },
});
