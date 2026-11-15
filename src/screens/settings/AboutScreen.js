import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DocScreen, DocSection, DocParagraph } from '../../components/common/DocScreen';
import { MotifBand } from '../../components/common/Motif';
import { useTheme } from '../../theme/ThemeContext';

// About Chautari — the story and what the prototype is.
export default function AboutScreen() {
  const { colors, spacing, font } = useTheme();
  const styles = useMemo(() => createStyles(colors, spacing, font), [colors, spacing, font]);

  return (
    <DocScreen>
      <View style={styles.hero}>
        <View style={styles.logo}><Text style={styles.logoEmoji}>🌳</Text></View>
        <Text style={styles.name}>Chautari</Text>
        <Text style={styles.tag}>Post. Answer. Belong.</Text>
        <MotifBand count={7} style={{ marginTop: spacing.md }} />
      </View>

      <DocSection heading="What is a chautari?">
        <DocParagraph>
          A “chautari” is the shaded resting place under a tree where villagers gather to talk, rest and share news. This app carries that spirit online — a place for the Nepali community in Australia to post and help each other.
        </DocParagraph>
      </DocSection>
      <DocSection heading="Who it's for">
        <DocParagraph>
          Recent graduates on visas, families settling in, and long-time residents — anyone navigating migration, tax, housing, health, careers or daily life in Greater Melbourne. Verified local experts answer alongside the community.
        </DocParagraph>
      </DocSection>
      <DocSection heading="About this build">
        <DocParagraph>
          This is a functional prototype built with React Native (Expo). All data and accounts are mocked locally — there is no real backend, sign-in, or payment. It exists to demonstrate the product experience end to end.
        </DocParagraph>
      </DocSection>

      <Text style={styles.version}>Prototype · v1.0.0 · mock data</Text>
    </DocScreen>
  );
}

const createStyles = (colors, spacing, font) => StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: spacing.lg },
  logo: { width: 88, height: 88, borderRadius: 26, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  logoEmoji: { fontSize: 46 },
  name: { fontSize: font.display, fontWeight: '800', color: colors.primary, marginTop: spacing.md, letterSpacing: -0.5 },
  tag: { fontSize: font.body, color: colors.textMuted, marginTop: 4, fontWeight: '600' },
  version: { textAlign: 'center', color: colors.textFaint, fontSize: font.tiny, marginTop: spacing.md, fontWeight: '600' },
});
