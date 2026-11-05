import React, { useEffect, useMemo, useState } from 'react';
import { Text, StyleSheet, View, Pressable } from 'react-native';
import Button from '../../components/common/Button';
import KeyboardScreen from '../../components/common/KeyboardScreen';
import CodeInput from '../../components/auth/CodeInput';
import { useTheme } from '../../theme/ThemeContext';
import { startAccountRecovery, verifyRecoveryEmail } from '../../services/emailRecovery';
import { emptyScreenError, screenError } from '../../utils/formError';

export default function RecoveryEmailCodeScreen({ navigation, route }) {
  const { colors, spacing, font } = useTheme();
  const styles = useMemo(() => createStyles(colors, spacing, font), [colors, spacing, font]);
  const email = route.params?.email || '';
  const [code, setCode] = useState('');
  const [seconds, setSeconds] = useState(60);
  const [error, setError] = useState(emptyScreenError());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (seconds <= 0) return undefined;
    const t = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [seconds]);

  const verify = async () => {
    if (code.length !== 6 || busy) return;
    setBusy(true);
    setError(emptyScreenError());
    try {
      const data = await verifyRecoveryEmail(email, code);
      navigation.navigate('RecoveryNewPhone', { token: data.token });
    } catch (e) {
      setError(screenError(e));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setSeconds(60);
    setError(emptyScreenError());
    setCode('');
    try {
      await startAccountRecovery(email);
    } catch (e) {
      if (__DEV__) setError(screenError(e));
    }
  };

  return (
    <KeyboardScreen
      contentStyle={styles.body}
      footer={(
        <View style={styles.footer}>
          <Button title={busy ? 'Checking…' : 'Verify'} onPress={verify} disabled={code.length !== 6 || busy} />
        </View>
      )}
    >
      <Text style={styles.title}>Enter your email code</Text>
      <Text style={styles.sub}>If that email is on an account, we sent a code. It expires in 10 minutes.</Text>
      <CodeInput value={code} onChangeText={(t) => { setError(emptyScreenError()); setCode(t); }} error={error.message} errorDetail={error.detail} />
      <View style={styles.resendRow}>
        {seconds > 0 ? (
          <Text style={styles.resendMuted}>Resend code in {seconds}s</Text>
        ) : (
          <Pressable onPress={resend}><Text style={styles.resendLink}>Resend code</Text></Pressable>
        )}
      </View>
    </KeyboardScreen>
  );
}

const createStyles = (colors, spacing, font) => StyleSheet.create({
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  title: { fontSize: font.h1, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  sub: { fontSize: font.body, color: colors.textMuted, marginBottom: spacing.xl },
  resendRow: { marginTop: spacing.sm },
  resendMuted: { color: colors.textMuted, fontSize: font.small },
  resendLink: { color: colors.primary, fontSize: font.small, fontWeight: '700' },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
});
