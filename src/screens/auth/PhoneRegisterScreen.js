import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Button from '../../components/common/Button';
import KeyboardScreen from '../../components/common/KeyboardScreen';
import PhoneNumberField, { digitsFromRoute } from '../../components/auth/PhoneNumberField';
import { useTheme } from '../../theme/ThemeContext';
import { sendPhoneOtp, toE164Au } from '../../services/auth';
import { lookupAccount } from '../../services/emailRecovery';
import { AUTH_COPY } from '../../utils/authCopy';
import { emptyScreenError, screenError } from '../../utils/formError';

export default function PhoneRegisterScreen({ navigation, route }) {
  const { colors, spacing, font } = useTheme();
  const styles = useMemo(() => createStyles(colors, spacing, font), [colors, spacing, font]);

  const [digits, setDigits] = useState(() => digitsFromRoute(route));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(emptyScreenError());
  const cleaned = digits.replace(/\D/g, '');
  const valid = /^4\d{8}$/.test(cleaned);
  const taken = error.message === AUTH_COPY.phoneRegistered;

  const onSend = async () => {
    if (!valid || sending) return;
    setError(emptyScreenError());
    const phoneE164 = toE164Au(cleaned);
    const phoneDisplay = `+61 ${cleaned}`;
    setSending(true);
    try {
      const exists = await lookupAccount({ phone: phoneE164 });
      if (exists) {
        setError(screenError(new Error(AUTH_COPY.phoneRegistered)));
        return;
      }
      await sendPhoneOtp(phoneE164, { createUser: true });
      navigation.navigate('Otp', {
        phone: phoneDisplay,
        phoneE164,
        flow: 'register',
        createUser: true,
      });
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
          <Button title="Send code" onPress={onSend} disabled={!valid || sending} loading={sending} />
        </View>
      )}
    >
      <Text style={styles.title}>Register</Text>
      <Text style={styles.sub}>We'll text you a 6-digit code to verify your number.</Text>

      <PhoneNumberField value={digits} onChangeText={(t) => { setError(emptyScreenError()); setDigits(t); }} />
      {error.message ? <Text style={styles.err}>{error.message}</Text> : null}
      {error.detail ? <Text style={styles.errDetail}>{error.detail}</Text> : null}
      {taken ? (
        <Pressable
          onPress={() => navigation.navigate('PhoneEntry', { phone: digits, phoneE164: valid ? toE164Au(cleaned) : undefined })}
          style={styles.linkWrap}
        >
          <Text style={styles.link}>Log in</Text>
        </Pressable>
      ) : null}
      {cleaned.length > 0 && !valid && !error.message ? (
        <Text style={styles.err}>Enter a valid Australian mobile (9 digits starting with 4).</Text>
      ) : taken ? null : (
        <Text style={styles.hint}>Australian mobile numbers only for v1 (Greater Melbourne).</Text>
      )}
    </KeyboardScreen>
  );
}

const createStyles = (colors, spacing, font) => StyleSheet.create({
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  title: { fontSize: font.h1, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  sub: { fontSize: font.body, color: colors.textMuted, lineHeight: 22, marginBottom: spacing.xl },
  hint: { fontSize: font.tiny, color: colors.textFaint, marginTop: spacing.sm },
  err: { fontSize: font.tiny, color: colors.danger, marginTop: spacing.sm, fontWeight: '600' },
  errDetail: { fontSize: font.tiny, color: colors.textMuted, marginTop: 2, fontWeight: '500' },
  linkWrap: { marginTop: spacing.sm, alignSelf: 'flex-start' },
  link: { color: colors.primary, fontSize: font.small, fontWeight: '700' },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
});
