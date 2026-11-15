import React, { useMemo,  useRef, useState  } from 'react';
import { View, Text, StyleSheet, Dimensions, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../components/common/Button';
import { useTheme } from '../../theme/ThemeContext';

const { width } = Dimensions.get('window');

// Welcome 1 + Welcome 2 value-prop slides with a Continue button.
const SLIDES = [
  { icon: '💬', title: 'Real answers from your community', body: 'Post anything about visas, tax, housing, health or life in Australia — and hear from people who have actually been there.' },
  { icon: '🎓', title: 'Verified local experts', body: 'Migration agents, accountants, GPs and brokers answer posts and build their reputation. Look for the verified badge.' },
  { icon: '🤝', title: 'Post freely — even anonymously', body: 'Some topics feel personal. Post anonymously any time and your name, photo and suburb stay hidden.' },
];

export default function WelcomeScreen({ navigation }) {
  const { colors, spacing, font } = useTheme();
  const styles = useMemo(() => createStyles(colors, spacing, font), [colors, spacing, font]);

  const [index, setIndex] = useState(0);
  const listRef = useRef(null);

  const onContinue = () => {
    if (index < SLIDES.length - 1) {
      const next = index + 1;
      listRef.current?.scrollToIndex({ index: next });
      setIndex(next);
    } else {
      navigation.navigate('PhoneEntry');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(s) => s.title}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={styles.iconWrap}><Text style={styles.icon}>{item.icon}</Text></View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
      />
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
      <View style={styles.footer}>
        <Button title={index < SLIDES.length - 1 ? 'Continue' : 'Get started'} onPress={onContinue} />
        <Text style={styles.legal}>By continuing you agree to our Terms & Privacy Policy.</Text>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors, spacing, font) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, flex: 1 },
  iconWrap: { width: 140, height: 140, borderRadius: 40, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl },
  icon: { fontSize: 72 },
  title: { fontSize: font.h1, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: spacing.md },
  body: { fontSize: font.body, color: colors.textMuted, textAlign: 'center', lineHeight: 23, paddingHorizontal: spacing.md },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary, width: 22 },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  legal: { fontSize: font.tiny, color: colors.textFaint, textAlign: 'center', marginTop: spacing.md },
});
