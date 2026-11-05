import React, { useEffect, useMemo, useState } from 'react';
import { Text, StyleSheet, View, Pressable } from 'react-native';
import Button from '../../components/common/Button';
import KeyboardScreen from '../../components/common/KeyboardScreen';
import CodeInput from '../../components/auth/CodeInput';
import { useTheme } from '../../theme/ThemeContext';
import { useData } from '../../data/store';
import { usesMockOtp, verifyEmailLoginToken } from '../../services/auth';
import { finishAuthNavigation } from '../../services/authSession';
import { sendEmailLogin, verifyEmailLoginCode } from '../../services/emailRecovery';
import { AUTH_COPY } from '../../utils/authCopy';
import { emptyScreenError, screenError } from '../../utils/formError';

const LENGTH = 6;

export default function EmailLoginCodeScreen({ navigation, route }) {
  const { colors, spacing, font } = useTheme();
  const styles = useMemo(() => createStyles(colors, spacing, font), [colors, spacing, font]);
  const { dispatch } = useData();
  const email = route.params?.email || '';
  const [code, setCode] = useState('');
  const [seconds, setSeconds] = useState(60);
  const [error, setError] = useState(emptyScreenError());
  const [busy, setBusy] = useState(false);
  const mockOtp = usesMockOtp();

  useEffect(() => {
    if (seconds <= 0) return undefined;
    const t = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [seconds]);

  const verify = async () => {
    if (code.length !== LENGTH || busy) return;
    setBusy(true);
    setError(emptyScreenError());
    try {
      const data = await verifyEmailLoginCode(email, code);
      if (!data?.token_hash) throw new Error(AUTH_COPY.unavailable);
      const { user } = await verifyEmailLoginToken(data.token_hash, data.type);
      await finishAuthNavigation({
        userId: user.id,
        navigation,
        dispatch,
      });
    } catch (e) {
      setError(screenError(e, AUTH_COPY.codeWrong));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setSeconds(60);
    setError(emptyScreenError());
    setCode('');
    if (mockOtp) return;
    try {
      await sendEmailLogin(email);
    } catch (e) {
      setError(screenError(e, AUTH_COPY.unavailable));
    }
  };

  return (
    <KeyboardScreen
      contentStyle={styles.body}
      footer={(
        <View style={styles.footer}>
          <Button title={busy ? 'Checking…' : 'Verify'} onPress={verify} disabled={code.length !== LENGTH || busy} loading={busy} />
        </View>
      )}
    >
      <Text style={styles.title}>Enter your email code</Text>
      <Text style={styles.sub}>
        Sent to your email. It expires in 10 minutes.
        {mockOtp ? ' (Demo: type any 6 digits.)' : ''}
      </Text>
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
