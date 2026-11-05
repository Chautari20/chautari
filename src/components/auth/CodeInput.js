import React, { useMemo, useRef } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

const LENGTH = 6;

export default function CodeInput({ value, onChangeText, error, errorDetail }) {
  const { colors, spacing, font, radius } = useTheme();
  const styles = useMemo(() => createStyles(colors, spacing, font, radius), [colors, spacing, font, radius]);
  const inputRef = useRef(null);
  const cells = Array.from({ length: LENGTH }, (_, i) => value[i] || '');

  return (
    <View>
      <Pressable style={styles.cells} onPress={() => inputRef.current?.focus()}>
        {cells.map((c, i) => (
          <View key={i} style={[styles.cell, value.length === i && styles.cellActive]}>
            <Text style={styles.cellText}>{c}</Text>
          </View>
        ))}
      </Pressable>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) => onChangeText(t.replace(/\D/g, '').slice(0, LENGTH))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        style={styles.hiddenInput}
        autoFocus
        maxLength={LENGTH}
      />
      {error ? <Text style={styles.err}>{error}</Text> : null}
      {error && errorDetail ? <Text style={styles.errDetail}>{errorDetail}</Text> : null}
    </View>
  );
}

const createStyles = (colors, spacing, font, radius) => StyleSheet.create({
  cells: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg },
  cell: { width: 48, height: 58, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  cellActive: { borderColor: colors.primary },
  cellText: { fontSize: 26, fontWeight: '700', color: colors.text },
  hiddenInput: { position: 'absolute', opacity: 0, height: 1, width: 1 },
  err: { color: colors.danger, fontSize: font.small, fontWeight: '600', marginBottom: spacing.sm },
  errDetail: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '500', marginTop: -4, marginBottom: spacing.sm },
});
