import React, { useMemo, useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

// Help / FAQ — a real screen with expandable Q&A entries.
const FAQ = [
  {
    q: 'Is Chautari free to use?',
    a: 'Yes. Posting, answering, following and browsing experts are all free. Verified experts may offer paid services off-platform, but the community itself is free.',
  },
  {
    q: 'How does anonymous posting work?',
    a: 'When you toggle “anonymous” on a post or answer, your name, photo and suburb are hidden and you appear as “Anonymous” with a neutral avatar. You can mix anonymous and named posts freely.',
  },
  {
    q: 'What does the verified badge mean?',
    a: 'A verified expert has submitted credentials (e.g. a MARA number, CPA, or AHPRA registration) for review. Their answers are pinned to the top of a post and marked with a badge so you can weigh credibility.',
  },
  {
    q: 'How do I become a verified expert?',
    a: 'Go to your profile and tap “Become a Verified Expert”, choose your area of expertise, and upload your credentials. In this prototype, applications are auto-approved instantly.',
  },
  {
    q: 'Can I edit or delete a post after publishing?',
    a: 'Editing posts is not available in this version. You can delete your own posts from the post’s “⋯” menu. Answers and replies stay to preserve the conversation.',
  },
  {
    q: 'How are upvotes counted?',
    a: 'One upvote per person per answer or reply — tap again to remove it. Popular answers rise to the top, and crossing a milestone (5, 10, 20, 50, 100, 200, 500) celebrates the author.',
  },
  {
    q: 'I saw something inappropriate. What do I do?',
    a: 'Use the “⋯” menu on any post, answer, or expert profile to report it with a reason. Reports go to moderation (mocked in this prototype).',
  },
  {
    q: 'How do I delete my account?',
    a: 'Settings → Delete account. You’ll see a warning, re-verify with a code, and confirm. Deletion is permanent and removes your profile and data.',
  },
];

function FaqItem({ item, open, onToggle }) {
  const { colors, spacing, font, radius, line, shadow } = useTheme();
  const styles = useMemo(() => createStyles(colors, spacing, font, radius, line, shadow), [colors, spacing, font, radius, line, shadow]);
  return (
    <Pressable style={styles.item} onPress={onToggle}>
      <View style={styles.qRow}>
        <Text style={styles.q}>{item.q}</Text>
        <Text style={styles.chev}>{open ? '–' : '+'}</Text>
      </View>
      {open ? <Text style={styles.a}>{item.a}</Text> : null}
    </Pressable>
  );
}

export default function HelpScreen() {
  const { colors, spacing, font, radius, line, shadow } = useTheme();
  const styles = useMemo(() => createStyles(colors, spacing, font, radius, line, shadow), [colors, spacing, font, radius, line, shadow]);
  const [open, setOpen] = useState(0);
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <Text style={styles.lead}>Common things people ask about Chautari. Tap one to expand it.</Text>
      {FAQ.map((item, i) => (
        <FaqItem key={i} item={item} open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />
      ))}
      <View style={styles.contact}>
        <Text style={styles.contactTitle}>Still need help?</Text>
        <Text style={styles.contactText}>In a production build this would link to live support. For now, this is a prototype with mock data only.</Text>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors, spacing, font, radius, line, shadow) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  lead: { fontSize: font.body, color: colors.textMuted, lineHeight: line.body, marginBottom: spacing.lg },
  item: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.sm, ...shadow.card },
  qRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  q: { flex: 1, fontSize: font.body, fontWeight: '800', color: colors.text },
  chev: { fontSize: 22, color: colors.primary, fontWeight: '800', width: 22, textAlign: 'center' },
  a: { fontSize: font.caption, color: colors.textMuted, lineHeight: line.caption, marginTop: spacing.md },
  contact: { marginTop: spacing.lg, padding: spacing.lg, backgroundColor: colors.primaryTint, borderRadius: radius.lg },
  contactTitle: { fontSize: font.body, fontWeight: '800', color: colors.primaryDark },
  contactText: { fontSize: font.caption, color: colors.primaryDark, lineHeight: line.caption, marginTop: 4 },
});
