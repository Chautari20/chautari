import React, { useMemo,  useState, useRef  } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import Button from '../../components/common/Button';
import KeyboardScreen from '../../components/common/KeyboardScreen';
import { useData, useSelectors } from '../../data/store';
import { useTheme } from '../../theme/ThemeContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import { signOut } from '../../services/auth';

const LENGTH = 6;

// Full account-deletion flow: warning -> mock OTP re-auth -> final confirm.
// Hard delete wipes everything; the navigator returns to the auth flow once
// currentUserId becomes null.
export default function DeleteAccountScreen({ navigation }) {
  const { colors, spacing, font, radius, line, shadow } = useTheme();
  const styles = useMemo(() => createStyles(colors, spacing, font, radius, line, shadow), [colors, spacing, font, radius, line, shadow]);

  const { dispatch } = useData();
  const { me } = useSelectors();
  const user = me();
  const [stage, setStage] = useState('warning'); // 'warning' | 'reauth' | 'confirm'
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const verify = () => {
    if (code.length !== LENGTH) {
      setError('Enter all 6 digits to continue.');
      return;
    }
    setError('');
    setStage('confirm'); // mock backend accepts any code
  };

  const reallyDelete = async () => {
    if (isSupabaseConfigured()) {
      try { await signOut(); } catch (e) { /* local wipe still runs */ }
    }
    dispatch({ type: 'DELETE_ACCOUNT' });
  };

  return (
    <KeyboardScreen
      contentStyle={styles.body}
      footer={(
        <View style={styles.footer}>
          {stage === 'warning' && (
            <>
              <Button title="Continue" variant="danger" onPress={() => setStage('reauth')} />
              <Button title="Keep my account" variant="ghost" onPress={() => navigation.goBack()} style={{ marginTop: 4 }} />
            </>
          )}
          {stage === 'reauth' && (
            <>
              <Button title="Verify & continue" variant="danger" onPress={verify} disabled={code.length !== LENGTH} />
              <Button title="Cancel" variant="ghost" onPress={() => navigation.goBack()} style={{ marginTop: 4 }} />
            </>
          )}
          {stage === 'confirm' && (
            <>
              <Button title="Permanently delete my account" variant="danger" onPress={reallyDelete} />
              <Button title="Cancel" variant="ghost" onPress={() => navigation.goBack()} style={{ marginTop: 4 }} />
            </>
          )}
        </View>
      )}
    >
      {stage === 'warning' && (
        <>
          <View style={styles.iconWrap}><Text style={styles.icon}>⚠️</Text></View>
          <Text style={styles.title}>Delete your account?</Text>
          <Text style={styles.lead}>This is permanent. Deleting your account will immediately and irreversibly remove:</Text>
          <View style={styles.card}>
            {[
              'Your profile, name, photo and suburb',
              'Every post and answer you made',
              'Your follows, upvotes and notifications',
              ...(user?.verified ? ['Your verified-expert status and badge'] : []),
            ].map((t) => (
              <View key={t} style={styles.bullet}>
                <Text style={styles.bulletDot}>✕</Text>
                <Text style={styles.bulletText}>{t}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.fine}>You can sign up again later, but your history will not come back. To continue, you’ll re-verify your number with a code.</Text>
        </>
      )}

      {stage === 'reauth' && (
        <>
          <Text style={styles.title}>Confirm it’s you</Text>
          <Text style={styles.lead}>For your security, enter the 6-digit code we “sent” to your number. (Demo: type any 6 digits.)</Text>
          <Pressable style={styles.cells} onPress={() => inputRef.current?.focus()}>
            {Array.from({ length: LENGTH }).map((_, i) => (
              <View key={i} style={[styles.cell, code.length === i && styles.cellActive]}>
                <Text style={styles.cellText}>{code[i] || ''}</Text>
              </View>
            ))}
          </Pressable>
          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={(t) => { setError(''); setCode(t.replace(/\D/g, '').slice(0, LENGTH)); }}
            keyboardType="number-pad"
            style={styles.hiddenInput}
            autoFocus
            maxLength={LENGTH}
          />
          {error ? <Text style={styles.err}>{error}</Text> : null}
        </>
      )}

      {stage === 'confirm' && (
        <>
          <View style={styles.iconWrap}><Text style={styles.icon}>🗑️</Text></View>
          <Text style={styles.title}>Last chance</Text>
          <Text style={styles.lead}>Your identity is confirmed. Tapping the button below will permanently delete your account right now. This cannot be undone.</Text>
        </>
      )}
    </KeyboardScreen>
  );
}

const createStyles = (colors, spacing, font, radius, line, shadow) => StyleSheet.create({
  body: { padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xl },
  iconWrap: { alignSelf: 'center', width: 72, height: 72, borderRadius: 36, backgroundColor: colors.dangerTint, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  icon: { fontSize: 36 },
  title: { fontSize: font.title, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: spacing.sm },
  lead: { fontSize: font.body, color: colors.textMuted, lineHeight: line.body, textAlign: 'center', marginBottom: spacing.lg, paddingHorizontal: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.dangerTint, padding: spacing.lg, ...shadow.card },
  bullet: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  bulletDot: { color: colors.danger, fontWeight: '900', fontSize: font.caption, marginTop: 2 },
  bulletText: { flex: 1, color: colors.text, fontSize: font.caption, lineHeight: line.caption },
  fine: { fontSize: font.caption, color: colors.textMuted, lineHeight: line.caption, marginTop: spacing.lg, textAlign: 'center' },
  cells: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg },
  cell: { width: 48, height: 58, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.borderStrong, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  cellActive: { borderColor: colors.danger },
  cellText: { fontSize: 26, fontWeight: '700', color: colors.text },
  hiddenInput: { position: 'absolute', opacity: 0, height: 1, width: 1 },
  err: { color: colors.danger, fontSize: font.caption, fontWeight: '700', marginTop: spacing.md, textAlign: 'center' },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
});
