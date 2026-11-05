import React, { useMemo, useState } from 'react';
import { Text, StyleSheet, View, Pressable } from 'react-native';
import Button from '../../components/common/Button';
import KeyboardScreen from '../../components/common/KeyboardScreen';
import { Field, Input } from '../../components/common/ui';
import { useTheme } from '../../theme/ThemeContext';
import { useData } from '../../data/store';
import { signOut, usesMockOtp } from '../../services/auth';
import { isValidEmail, normalizeEmail } from '../../utils/email';
import { lookupAccount, sendVerifyEmail } from '../../services/emailRecovery';
import { AUTH_COPY, isEmailTakenMessage } from '../../utils/authCopy';
import { emptyScreenError, screenError } from '../../utils/formError';

export default function EmailScreen({ navigation, route }) {
  const { colors, spacing, font } = useTheme();
  const styles = useMemo(() => createStyles(colors, spacing, font), [colors, spacing, font]);
  const { state, dispatch } = useData();
  const name = route.params?.name || state.authProfileName;
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(emptyScreenError());
  const trimmed = normalizeEmail(email);
  const valid = isValidEmail(trimmed);
  const taken = isEmailTakenMessage(error.message);

  const next = async () => {
    if (!valid || sending) return;
    setSending(true);
    setError(emptyScreenError());
    try {
      if (usesMockOtp()) {
        const exists = await lookupAccount({ email: trimmed });
        if (exists) throw new Error(AUTH_COPY.emailRegistered);
      } else {
        await sendVerifyEmail(trimmed);
      }
      navigation.navigate('EmailCode', {
        email: trimmed,
        name,
        phone: route.params?.phone,
        phoneE164: route.params?.phoneE164,
      });
    } catch (e) {
      setError(screenError(e));
    } finally {
      setSending(false);
    }
  };

  const goLogin = async () => {
    try { await signOut(); } catch { /* local logout still runs */ }
    dispatch({ type: 'LOGOUT' });
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
      <Text style={styles.title}>Add a recovery email</Text>
      <Text style={styles.sub}>
        We only use this if you lose access to your phone number. You can also log in with this email.
      </Text>
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
      {taken ? (
        <Pressable onPress={goLogin}>
          <Text style={styles.link}>Log in</Text>
        </Pressable>
      ) : null}
    </KeyboardScreen>
  );
}

const createStyles = (colors, spacing, font) => StyleSheet.create({
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  title: { fontSize: font.h1, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  sub: { fontSize: font.body, color: colors.textMuted, lineHeight: 22, marginBottom: spacing.xl },
  link: { color: colors.primary, fontSize: font.small, fontWeight: '700' },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
});
