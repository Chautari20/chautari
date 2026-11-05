import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Button from '../../components/common/Button';
import KeyboardScreen from '../../components/common/KeyboardScreen';
import { Input } from '../../components/common/ui';
import { useTheme } from '../../theme/ThemeContext';
import { sendRecoveryPhoneCode } from '../../services/emailRecovery';
import { emptyScreenError, screenError } from '../../utils/formError';
import { toE164Au } from '../../services/auth';

export default function RecoveryNewPhoneScreen({ navigation, route }) {
  const { colors, spacing, font, radius } = useTheme();
  const styles = useMemo(() => createStyles(colors, spacing, font, radius), [colors, spacing, font, radius]);
  const token = route.params?.token;
  const [digits, setDigits] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(emptyScreenError());
  const cleaned = digits.replace(/\D/g, '');
  const valid = /^4\d{8}$/.test(cleaned);

  const next = async () => {
    if (!valid || sending) return;
    setSending(true);
    setError(emptyScreenError());
    try {
      const phoneE164 = toE164Au(cleaned);
      await sendRecoveryPhoneCode(token, phoneE164);
      navigation.navigate('RecoveryPhoneCode', { token, phoneE164, phone: `+61 ${cleaned}` });
    } catch (e) {
      setError(screenError(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardScreen
      contentStyle={styles.body}
      footer={(
        <View style={styles.footer}>
          <Button title={sending ? 'Sending…' : 'Send SMS code'} onPress={next} disabled={!valid || sending} />
        </View>
      )}
    >
      <Text style={styles.title}>New mobile number</Text>
      <Text style={styles.sub}>We'll text a code to this number, then you can sign in with it.</Text>
      <View style={styles.phoneRow}>
        <View style={styles.prefix}><Text style={styles.prefixText}>🇦🇺 +61</Text></View>
        <Input
          style={styles.phoneInput}
          placeholder="412 345 678"
          keyboardType="number-pad"
          value={digits}
          onChangeText={setDigits}
          maxLength={12}
          autoFocus
        />
      </View>
      {error.message ? <Text style={styles.err}>{error.message}</Text> : null}
      {error.detail ? <Text style={styles.errDetail}>{error.detail}</Text> : null}
    </KeyboardScreen>
  );
}

const createStyles = (colors, spacing, font, radius) => StyleSheet.create({
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  title: { fontSize: font.h1, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  sub: { fontSize: font.body, color: colors.textMuted, lineHeight: 22, marginBottom: spacing.xl },
  phoneRow: { flexDirection: 'row', gap: spacing.sm },
  prefix: { justifyContent: 'center', paddingHorizontal: spacing.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  prefixText: { fontSize: font.body, fontWeight: '700', color: colors.text },
  phoneInput: { flex: 1, fontSize: font.h3, letterSpacing: 1 },
  err: { fontSize: font.tiny, color: colors.danger, marginTop: spacing.sm, fontWeight: '600' },
  errDetail: { fontSize: font.tiny, color: colors.textMuted, marginTop: 2 },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
});
