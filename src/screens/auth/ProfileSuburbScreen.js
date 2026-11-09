import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Switch } from 'react-native';
import Button from '../../components/common/Button';
import Avatar from '../../components/common/Avatar';
import KeyboardScreen from '../../components/common/KeyboardScreen';
import PhotoSourceSheet from '../../components/question/PhotoSourceSheet';
import { Chip } from '../../components/common/ui';
import { useData } from '../../data/store';
import { SUBURBS } from '../../data/categories';
import { useTheme } from '../../theme/ThemeContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import { completeOnboarding } from '../../services/profile';
import { useProfilePhotoFlow } from '../../hooks/useProfilePhotoFlow';
import { isLocalPhotoUri, photoUrl } from '../../utils/photos';
import { uploadAvatar } from '../../services/mediaStorage';

// Profile setup step 2 — suburb + photo, both optional and skippable.
// This is the final onboarding step, so we create the account here.
export default function ProfileSuburbScreen({ navigation, route }) {
  const { colors, spacing, font, radius } = useTheme();
  const styles = useMemo(() => createStyles(colors, spacing, font, radius), [colors, spacing, font, radius]);

  const { dispatch, state } = useData();
  const name = route.params?.name || state.authProfileName || 'You';
  const [suburb, setSuburb] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [newcomer, setNewcomer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const onPhotoConfirmed = useCallback((url) => setPhoto(url), []);
  const onPhotoRemoved = useCallback(() => setPhoto(null), []);

  const {
    pickerOpen,
    setPickerOpen,
    pickPhoto,
    pickProfileFromLibrary,
    takeProfilePhoto,
    removePhoto,
  } = useProfilePhotoFlow(navigation, route, {
    displayName: name,
    onPhotoConfirmed,
    onPhotoRemoved,
  });

  const finish = async () => {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      let photoUrlValue = photoUrl(photo) || null;
      if (photoUrlValue && isLocalPhotoUri(photoUrlValue)) {
        if (!isSupabaseConfigured()) {
          throw new Error('Photo upload requires Supabase — check your .env.');
        }
        photoUrlValue = await uploadAvatar({ uri: photoUrlValue });
      }
      let authUserId = state.authUserId;
      let foundingMemberNumber = null;
      if (isSupabaseConfigured()) {
        const completed = await completeOnboarding({
          name,
          suburb,
          photo: photoUrlValue,
          newcomer,
          phone: route.params?.phoneE164 || route.params?.phone,
        });
        authUserId = completed?.userId ?? null;
        foundingMemberNumber = completed?.foundingMemberNumber ?? null;
        if (authUserId) dispatch({ type: 'SET_AUTH', userId: authUserId });
      }
      dispatch({ type: 'SIGN_UP', name, newcomer, authUserId, foundingMemberNumber });
      if (suburb || photoUrlValue) dispatch({ type: 'UPDATE_PROFILE', patch: { suburb, photo: photoUrlValue } });
    } catch (e) {
      setError(e?.message || 'Could not save profile. Try again.');
      setSaving(false);
    }
  };

  return (
    <>
      <KeyboardScreen
        contentStyle={styles.body}
        footer={(
          <View style={styles.footer}>
            <View style={styles.newcomerRow}>
              <View style={styles.newcomerCopy}>
                <Text style={styles.newcomerLabel}>I'm new to Australia</Text>
                <Text style={styles.newcomerHint}>Select to unlock features made for newcomers.</Text>
              </View>
              <Switch
                value={newcomer}
                onValueChange={setNewcomer}
                trackColor={{ true: colors.primary, false: colors.borderStrong }}
                thumbColor={colors.onPrimary}
              />
            </View>
            {error ? <Text style={styles.err}>{error}</Text> : null}
            <Button title={saving ? 'Saving…' : 'Finish'} onPress={finish} disabled={saving} />
            <Button title="Skip for now" variant="ghost" onPress={finish} disabled={saving} style={{ marginTop: 4 }} />
          </View>
        )}
      >
        <Text style={styles.title}>Add a few details</Text>
        <Text style={styles.sub}>Both are optional — you can skip and add them later.</Text>

        <View style={styles.photoBlock}>
          <Avatar name={name} photo={photoUrl(photo)} size={88} />
          <Pressable onPress={() => setPickerOpen(true)} style={styles.photoBtn}>
            <Text style={styles.photoBtnText}>📷  Add photo</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>Your suburb (Greater Melbourne)</Text>
        <View style={styles.chips}>
          {SUBURBS.map((s) => (
            <Chip key={s} label={s} active={suburb === s} onPress={() => setSuburb(suburb === s ? null : s)} />
          ))}
        </View>
      </KeyboardScreen>

      <PhotoSourceSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Add profile photo"
        showRemove={!!photo}
        onCamera={() => pickPhoto(takeProfilePhoto)}
        onLibrary={() => pickPhoto(pickProfileFromLibrary)}
        onRemove={removePhoto}
      />
    </>
  );
}

const createStyles = (colors, spacing, font, radius) => StyleSheet.create({
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xl },
  title: { fontSize: font.h1, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  sub: { fontSize: font.body, color: colors.textMuted, marginBottom: spacing.xl },
  photoBlock: { alignItems: 'center', marginBottom: spacing.xl },
  photoBtn: { marginTop: spacing.md, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, backgroundColor: colors.primaryLight },
  photoBtnText: { color: colors.primaryDark, fontWeight: '700' },
  label: { fontSize: font.small, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  newcomerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.bgSunken,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  newcomerCopy: { flex: 1 },
  newcomerLabel: { fontSize: font.caption, fontWeight: '800', color: colors.text },
  newcomerHint: { fontSize: font.tiny, color: colors.textMuted, marginTop: 2, lineHeight: 16 },
  err: { color: colors.danger, fontSize: font.small, fontWeight: '600', marginBottom: spacing.sm, textAlign: 'center' },
});
