import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Switch } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useData, useSelectors } from '../../data/store';
import { composeDigestSummary, scheduleDigest, ensureNotificationPermissions } from '../../services/digest';
import { useNetwork } from '../../data/network';
import { useTheme } from '../../theme/ThemeContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import { signOut } from '../../services/auth';
import { recoveryEmailStatus } from '../../services/emailRecovery';

// Settings: support links (real screens), account actions, and a demo offline toggle.
export default function SettingsScreen({ navigation }) {
  const { dispatch, state } = useData();
  const { circleById } = useSelectors();
  const { online, setOnline } = useNetwork();
  const { colors, spacing, font, radius, isDark, setMode } = useTheme();
  const styles = useMemo(() => createStyles(colors, spacing, font, radius), [colors, spacing, font, radius]);

  const [emailMasked, setEmailMasked] = useState('');

  useFocusEffect(useCallback(() => {
    if (!isSupabaseConfigured()) return undefined;
    let cancelled = false;
    recoveryEmailStatus()
      .then((data) => {
        if (!cancelled) setEmailMasked(data.emailMasked || '');
      })
      .catch(() => {
        if (!cancelled) setEmailMasked('');
      });
    return () => { cancelled = true; };
  }, []));

  const logout = () => {
    Alert.alert('Log out?', 'You can sign back in anytime with your phone number.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          if (isSupabaseConfigured()) {
            try { await signOut(); } catch (e) { /* session listener clears state */ }
          }
          dispatch({ type: 'LOGOUT' });
        },
      },
    ]);
  };

  const Row = ({ label, icon, onPress, danger, last }) => (
    <Pressable style={({ pressed }) => [styles.row, last && { borderBottomWidth: 0 }, pressed && { backgroundColor: colors.surfaceAlt }]} onPress={onPress}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <Text style={[styles.rowLabel, danger && { color: colors.danger }]}>{label}</Text>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <Text style={styles.section}>Support</Text>
      <View style={styles.group}>
        <Row label="Help & FAQ" icon="❓" onPress={() => navigation.navigate('Help')} />
        <Row label="About Chautari" icon="🌳" onPress={() => navigation.navigate('About')} />
        <Row label="Terms & Conditions" icon="📄" onPress={() => navigation.navigate('Terms')} />
        <Row label="Privacy Policy" icon="🔒" onPress={() => navigation.navigate('Privacy')} last />
      </View>

      <Text style={styles.section}>Account</Text>
      <View style={styles.group}>
        {emailMasked ? (
          <View style={styles.row}>
            <Text style={styles.rowIcon}>✉️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Recovery email</Text>
              <Text style={styles.rowSub}>{emailMasked}</Text>
            </View>
          </View>
        ) : null}
        <Row label="Change phone number" icon="📱" onPress={() => navigation.navigate('ChangePhoneEmailCode')} />
        <Row label="Edit profile" icon="✏️" onPress={() => navigation.navigate('EditProfile')} />
        <Row label="Create a circle" icon="⭕" onPress={() => navigation.navigate('CreateCircle')} />
        <Row label="Log out" icon="🚪" onPress={logout} />
        <Row label="Delete account" icon="🗑️" danger onPress={() => navigation.navigate('DeleteAccount')} last />
      </View>
{/*
      <Text style={styles.section}>Digest</Text>
      <View style={styles.group}>
        {[
          ['daily', 'Daily at 6pm'],
          ['weekly', 'Weekly (Monday 6pm)'],
          ['off', 'Off'],
        ].map(([mode, label], i, arr) => (
          <Pressable
            key={mode}
            style={({ pressed }) => [styles.row, i === arr.length - 1 && { borderBottomWidth: 0 }, pressed && { backgroundColor: colors.surfaceAlt }]}
            onPress={async () => {
              if (mode !== 'off') {
                const ok = await ensureNotificationPermissions();
                if (!ok) {
                  Alert.alert('Notifications off', 'Enable notifications in system settings to receive circle digests.');
                  return;
                }
              }
              dispatch({ type: 'SET_DIGEST_MODE', mode });
              const summary = composeDigestSummary(state, circleById);
              await scheduleDigest(mode, summary);
            }}
          >
            <Text style={styles.rowIcon}>{state.digestMode === mode ? '✓' : '○'}</Text>
            <Text style={[styles.rowLabel, state.digestMode === mode && { color: colors.primary }]}>{label}</Text>
          </Pressable>
        ))}
      </View>
*/}
      <Text style={styles.section}>Appearance</Text>
      <View style={styles.group}>
        <View style={[styles.row, { borderBottomWidth: 0 }]}>
          <Text style={styles.rowIcon}>{isDark ? '🌙' : '☀️'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>Dark mode</Text>
            <Text style={styles.rowSub}>{isDark ? 'On — easier on the eyes at night.' : 'Off — warm light theme.'}</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={(v) => setMode(v ? 'dark' : 'light')}
            trackColor={{ true: colors.primary, false: colors.borderStrong }}
            thumbColor={colors.onPrimary}
          />
        </View>
      </View>

      <Text style={styles.section}>Developer · demo</Text>
      <View style={styles.group}>
        <View style={[styles.row, { borderBottomWidth: 0 }]}>
          <Text style={styles.rowIcon}>{online ? '📶' : '✈️'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>Simulate offline mode</Text>
            <Text style={styles.rowSub}>Test how posting behaves with no connection.</Text>
          </View>
          <Switch value={!online} onValueChange={(v) => setOnline(!v)} trackColor={{ true: colors.primary, false: colors.borderStrong }} thumbColor={colors.onPrimary} />
        </View>
      </View>

      <Text style={styles.version}>Chautari prototype · v1.0.0 · mock data</Text>
    </ScrollView>
  );
}

const createStyles = (colors, spacing, font, radius) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  section: { fontSize: font.tiny, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: spacing.lg, marginBottom: spacing.sm, marginLeft: 4 },
  group: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowIcon: { fontSize: 18, width: 30 },
  rowLabel: { flex: 1, fontSize: font.body, color: colors.text, fontWeight: '700' },
  rowSub: { fontSize: font.tiny, color: colors.textMuted, marginTop: 2 },
  chevron: { fontSize: 22, color: colors.textFaint },
  version: { textAlign: 'center', color: colors.textFaint, fontSize: font.tiny, marginTop: spacing.xl, fontWeight: '600' },
});
