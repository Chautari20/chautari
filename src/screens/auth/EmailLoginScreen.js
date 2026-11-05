import React, { useMemo, useState } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import Button from '../../components/common/Button';
import KeyboardScreen from '../../components/common/KeyboardScreen';
import { Field, Input } from '../../components/common/ui';
import { useTheme } from '../../theme/ThemeContext';
import { usesMockOtp } from '../../services/auth';
import { lookupAccount, sendEmailLogin } from '../../services/emailRecovery';
import { isValidEmail, normalizeEmail } from '../../utils/email';
import { AUTH_COPY } from '../../utils/authCopy';
import { emptyScreenError, screenError } from '../../utils/formError';

export default function EmailLoginScreen({ navigation }) {
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
      const exists = await lookupAccount({ email: trimmed });
      if (!exists) {
        setError(screenError(new Error(AUTH_COPY.noAccountEmail)));
        return;
      }
      if (!usesMockOtp()) await sendEmailLogin(trimmed);
      navigation.navigate('EmailLoginCode', { email: trimmed });
    } catch (e) {
      setError(screenError(e, AUTH_COPY.unavailable));
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardScreen
      contentStyle={styles.body}
      footer={(
        <View style={styles.footer}>
          <Button title={sending ? 'Sending…' : 'Send code'} onPress={next} disabled={!valid || sending} loading={sending} />
        </View>
      )}
    >
      <Text style={styles.title}>Log in with email</Text>
      <Text style={styles.sub}>We'll send a 6-digit code. You can still use your phone number next time.</Text>
      <Field label="Email" error={error.message} errorDetail={error.detail}>
        <Input
          placeholder="you@email.com"
          value={email}
          onChangeText={(t) => { setError(emptyScreenError()); setEmail(t); }}
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
