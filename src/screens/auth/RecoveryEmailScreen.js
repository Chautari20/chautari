import React, { useMemo, useState } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import Button from '../../components/common/Button';
import KeyboardScreen from '../../components/common/KeyboardScreen';
import { Field, Input } from '../../components/common/ui';
import { useTheme } from '../../theme/ThemeContext';
import { isValidEmail, normalizeEmail } from '../../utils/email';
import { startAccountRecovery } from '../../services/emailRecovery';
import { emptyScreenError, screenError } from '../../utils/formError';

const SAME = "If that email is on an account, we've sent a code.";

export default function RecoveryEmailScreen({ navigation }) {
  const { colors, spacing, font } = useTheme();
  const styles = useMemo(() => createStyles(colors, spacing, font), [colors, spacing, font]);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(emptyScreenError());
  const trimmed = normalizeEmail(email);
  const valid = isValidEmail(trimmed);

  const next = async () => {
    if (!valid || sending) return;
    setSending(true);
    setError(emptyScreenError());
    try {
      await startAccountRecovery(trimmed);
    } catch (e) {
      if (__DEV__) {
        setError(screenError(e));
        setSending(false);
        return;
      }
    } finally {
      setSending(false);
    }
    navigation.navigate('RecoveryEmailCode', { email: trimmed });
  };

  return (
    <KeyboardScreen
      contentStyle={styles.body}
      footer={(
        <View style={styles.footer}>
          <Button title={sending ? 'Sending…' : 'Send code'} onPress={next} disabled={!valid || sending} />
        </View>
      )}
    >
      <Text style={styles.title}>Lost access to your number?</Text>
      <Text style={styles.sub}>{SAME}</Text>
      <Field label="Recovery email" error={error.message} errorDetail={error.detail}>
        <Input
          placeholder="you@email.com"
          value={email}
          onChangeText={setEmail}
          autoFocus
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
        />
      </Field>
    </KeyboardScreen>
  );
}

const createStyles = (colors, spacing, font) => StyleSheet.create({
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  title: { fontSize: font.h1, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  sub: { fontSize: font.body, color: colors.textMuted, lineHeight: 22, marginBottom: spacing.xl },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
});
