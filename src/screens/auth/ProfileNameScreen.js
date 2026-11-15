import React, { useMemo,  useState  } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import Button from '../../components/common/Button';
import KeyboardScreen from '../../components/common/KeyboardScreen';
import { Field, Input } from '../../components/common/ui';
import { useTheme } from '../../theme/ThemeContext';

// Profile setup step 1 — name is required.
// We carry the name forward and only create the account at the final step,
// because signing in immediately swaps the navigator out of the onboarding flow.
export default function ProfileNameScreen({ navigation, route }) {
  const { colors, spacing, font } = useTheme();
  const styles = useMemo(() => createStyles(colors, spacing, font), [colors, spacing, font]);

  const [name, setName] = useState('');
  const trimmed = name.trim();
  const valid = trimmed.length >= 2;

  const next = () => {
    if (!valid) return;
    navigation.navigate('Email', {
      name: trimmed,
      phone: route.params?.phone,
      phoneE164: route.params?.phoneE164,
    });
  };

  return (
    <KeyboardScreen
      contentStyle={styles.body}
      footer={(
        <View style={styles.footer}>
          <Button title="Continue" onPress={next} disabled={!valid} />
        </View>
      )}
    >
      <Text style={styles.title}>What should we call you?</Text>
      <Text style={styles.sub}>This is the name shown on your posts and answers (unless you post anonymously).</Text>
      <Field label="Full name" hint="Required">
        <Input placeholder="e.g. Sita Gurung" value={name} onChangeText={setName} autoFocus autoCapitalize="words" />
      </Field>
    </KeyboardScreen>
  );
}

const createStyles = (colors, spacing, font) => StyleSheet.create({
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  title: { fontSize: font.h1, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  sub: { fontSize: font.body, color: colors.textMuted, lineHeight: 22, marginBottom: spacing.xl },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
});
