import React, { useMemo } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../components/common/Button';
import { useTheme } from '../../theme/ThemeContext';

export default function RecoverySuccessScreen({ navigation, route }) {
  const { colors, spacing, font } = useTheme();
  const styles = useMemo(() => createStyles(colors, spacing, font), [colors, spacing, font]);
  const phone = route.params?.phone || route.params?.phoneE164 || '';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.body}>
        <Text style={styles.emoji}>✅</Text>
        <Text style={styles.title}>Number updated</Text>
        <Text style={styles.sub}>Sign in with your new mobile number. We'll text you a code.</Text>
      </View>
      <View style={styles.footer}>
        <Button
          title="Sign in"
          onPress={() => navigation.reset({
            index: 0,
            routes: [
              {
                name: 'PhoneEntry',
                params: {
                  phone: phone.replace(/^\+61\s?/, ''),
                  phoneE164: route.params?.phoneE164,
                },
              },
            ],
          })}
        />
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors, spacing, font) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, paddingHorizontal: spacing.xl, justifyContent: 'center', alignItems: 'center' },
  emoji: { fontSize: 48, marginBottom: spacing.lg },
  title: { fontSize: font.h1, fontWeight: '800', color: colors.text, marginBottom: spacing.sm, textAlign: 'center' },
  sub: { fontSize: font.body, color: colors.textMuted, lineHeight: 22, textAlign: 'center' },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
});
