import React, { useEffect, useMemo, useState } from 'react';
import { Text, StyleSheet, View, Pressable } from 'react-native';
import Button from '../../components/common/Button';
import KeyboardScreen from '../../components/common/KeyboardScreen';
import CodeInput from '../../components/auth/CodeInput';
import { useTheme } from '../../theme/ThemeContext';
import { useToast } from '../../components/common/Toast';
import { supabase } from '../../lib/supabase';

export default function ChangePhoneSmsCodeScreen({ navigation, route }) {
  const { colors, spacing, font } = useTheme();
  const styles = useMemo(() => createStyles(colors, spacing, font), [colors, spacing, font]);
  const showToast = useToast();
  const { phoneE164, phone } = route.params || {};
  const [code, setCode] = useState('');
  const [seconds, setSeconds] = useState(60);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (seconds <= 0) return undefined;
    const t = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [seconds]);

  const verify = async () => {
    if (code.length !== 6 || busy) return;
    setBusy(true);
    setError('');
    try {
      const { error: otpErr } = await supabase.auth.verifyOtp({
        phone: phoneE164,
        token: code,
        type: 'phone_change',
      });
      if (otpErr) throw new Error("That code didn't work. Try again.");
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        await supabase.from('profiles').update({ phone: phoneE164 }).eq('id', user.id);
      }
      showToast('Phone number updated', { tone: 'success' });
      navigation.navigate('Settings');
    } catch (e) {
      setError(e?.message || 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setSeconds(60);
    setError('');
    setCode('');
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ phone: phoneE164 });
      if (updateErr) throw new Error('Could not resend the code. Try again.');
    } catch (e) {
      setError(e?.message || 'Something went wrong. Try again.');
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
      <Text style={styles.title}>Enter the SMS code</Text>
      <Text style={styles.sub}>Sent to {phone}.</Text>
      <CodeInput value={code} onChangeText={(t) => { setError(''); setCode(t); }} error={error} />
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
