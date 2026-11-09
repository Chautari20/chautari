import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Avatar from '../../components/common/Avatar';
import VerifiedBadge from '../../components/common/VerifiedBadge';
import Button from '../../components/common/Button';
import { useSelectors } from '../../data/store';
import { useLiveDataRefresh } from '../../hooks/useLiveDataRefresh';
import { useTheme } from '../../theme/ThemeContext';
import { useNavigationGuard } from '../../utils/navigation';
import ExpertPostQuota from '../../components/question/ExpertPostQuota';
import KarmaBadge from '../../components/common/KarmaBadge';
import { compactNumber } from '../../utils/format';
import FoundingMemberBadge from '../../components/common/FoundingMemberBadge';
import { CHECKLIST_TOTAL } from '../../data/checklist';

function formatJoined(ts) {
  if (!ts) return 'Recently';
  const d = new Date(ts);
  return d.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' });
}

export default function MyProfileScreen({ navigation }) {
  const { me, state, karmaFor, checklistDoneCount, isNewcomerActive } = useSelectors();
  useLiveDataRefresh({ onFocus: true });
  const user = me();
  const { colors, shadow, spacing, font, radius } = useTheme();
  const { navigate } = useNavigationGuard(navigation);
  const styles = useMemo(() => createStyles(colors, shadow, spacing, font, radius), [colors, shadow, spacing, font, radius]);

  const followingCount = state.following.length;

  const checklistProgress = `${checklistDoneCount()} of ${CHECKLIST_TOTAL} done`;

  const options = [
    ...(isNewcomerActive() ? [{
      key: 'checklist',
      label: 'First 30 Days checklist',
      sublabel: checklistProgress,
      icon: '🛬',
      onPress: () => navigate('ArrivalChecklist'),
    }] : []),
    { key: 'posts', label: 'My Posts', icon: '📝', onPress: () => navigate('MyPosts') },
    { key: 'saved', label: 'Saved Posts', icon: '🔖', onPress: () => navigate('SavedPosts') },
  ];

  if (!user?.verified) {
    options.push({
      key: 'expert',
      label: 'Are you a professional? Apply for verification',
      icon: null,
      quiet: true,
      onPress: () => navigate('VerifiedApplication'),
    });
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topbar}>
        <Text style={styles.topTitle}>My Profile</Text>
        <Pressable onPress={() => navigate('Settings')} hitSlop={10}>
          <Text style={styles.gear}>⚙️</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.identity}>
          <Avatar name={user?.name || 'You'} photo={user?.photo} size={88} />
          <View style={styles.nameRow}>
            <Text style={styles.name}>{user?.name || 'You'}</Text>
            {user?.verified ? <VerifiedBadge compact /> : null}
            {user?.isFoundingMember ? <FoundingMemberBadge number={user.foundingMemberNumber} /> : null}
            <KarmaBadge karma={karmaFor('me')} />
          </View>
          {user?.suburb ? <Text style={styles.suburb}>📍 {user.suburb}</Text> : null}
          <Text style={styles.joined}>Joined {formatJoined(user?.createdAt)}</Text>

          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statNum}>{compactNumber(user?.followers || 0)}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNum}>{compactNumber(followingCount)}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
          </View>

          <Button title="Edit profile" variant="secondary" onPress={() => navigate('EditProfile')} style={{ alignSelf: 'stretch', marginTop: spacing.md }} />
        </View>

        {user?.verified ? (
          <View style={styles.verifiedNote}>
            <Text style={styles.verifiedNoteText}>
              ✓ Verified expert · <ExpertPostQuota variant="inline" />
            </Text>
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>OPTIONS</Text>
        <View style={styles.group}>
          {options.map((opt, i) => (
            <Pressable
              key={opt.key}
              onPress={opt.onPress}
              style={({ pressed }) => [
                styles.row,
                opt.quiet && styles.rowQuiet,
                i === options.length - 1 && { borderBottomWidth: 0 },
                pressed && { backgroundColor: colors.surfaceAlt },
              ]}
            >
              {opt.icon ? <Text style={styles.rowIcon}>{opt.icon}</Text> : <View style={styles.rowIconSpacer} />}
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, opt.quiet && styles.rowLabelQuiet]}>{opt.label}</Text>
                {opt.sublabel ? <Text style={styles.rowSublabel}>{opt.sublabel}</Text> : null}
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors, shadow, spacing, font, radius) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  topTitle: { fontSize: font.h2, fontWeight: '800', color: colors.text },
  gear: { fontSize: 20 },
  body: { paddingBottom: spacing.xl },
  identity: { backgroundColor: colors.surface, alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.border },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: spacing.md, flexWrap: 'wrap', justifyContent: 'center' },
  name: { fontSize: font.h2, fontWeight: '800', color: colors.text },
  suburb: { color: colors.textMuted, fontSize: font.small, marginTop: 4 },
  joined: { color: colors.textFaint, fontSize: font.tiny, marginTop: 4, fontWeight: '600' },
  stats: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.lg },
  stat: { alignItems: 'center', minWidth: 72 },
  statNum: { fontSize: font.h3, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: font.tiny, color: colors.textMuted, marginTop: 2 },
  verifiedNote: { marginHorizontal: spacing.lg, marginTop: spacing.lg, backgroundColor: colors.verifiedTint, borderRadius: radius.md, padding: spacing.md },
  verifiedNoteText: { color: colors.verified, fontWeight: '700', fontSize: font.small, textAlign: 'center' },
  sectionLabel: { fontSize: font.tiny, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.8, marginTop: spacing.xl, marginBottom: spacing.sm, marginLeft: spacing.lg + 4 },
  group: { marginHorizontal: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', ...shadow.card },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowQuiet: { paddingVertical: spacing.lg },
  rowIcon: { fontSize: 18, width: 30 },
  rowIconSpacer: { width: 0 },
  rowLabel: { fontSize: font.body, color: colors.text, fontWeight: '700' },
  rowSublabel: { fontSize: font.tiny, color: colors.primary, fontWeight: '700', marginTop: 2 },
  rowLabelQuiet: { fontSize: font.caption, fontWeight: '500', color: colors.textMuted },
  chevron: { fontSize: 22, color: colors.textFaint },
});
