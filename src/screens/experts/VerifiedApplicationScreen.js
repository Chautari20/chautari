import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Image } from 'react-native';
import Button from '../../components/common/Button';
import PhotoSourceSheet from '../../components/question/PhotoSourceSheet';
import KeyboardScreen from '../../components/common/KeyboardScreen';
import ExpertProfessionalFields from '../../components/question/ExpertProfessionalFields';
import { useData, useSelectors } from '../../data/store';
import { useTheme } from '../../theme/ThemeContext';
import { useNetwork } from '../../data/network';
import { useImagePicker } from '../../hooks/useImagePicker';
import { isSupabaseConfigured } from '../../lib/supabase';
import { uploadExpertCredential } from '../../services/mediaStorage';
import { isLocalPhotoUri, displayPhotoUrl } from '../../utils/photos';
import { validateExpertBadgeTitle } from '../../utils/expertPost';

export default function VerifiedApplicationScreen({ navigation }) {
  const { colors, spacing, font, radius } = useTheme();
  const styles = useMemo(() => createStyles(colors, spacing, font, radius), [colors, spacing, font, radius]);

  const { dispatch } = useData();
  const { state } = useSelectors();
  const { online } = useNetwork();
  const { pickFromLibrary } = useImagePicker();
  const [badgeTitle, setBadgeTitle] = useState('');
  const [circleId, setCircleId] = useState(null);
  const [credential, setCredential] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  const valid = !validateExpertBadgeTitle(badgeTitle) && !!circleId;

  const pickCredential = async () => {
    const picked = await pickFromLibrary();
    if (!picked?.uri) return;
    setCredential({
      uri: picked.uri,
      base64: picked.base64,
      mimeType: picked.mimeType,
      width: picked.width,
      height: picked.height,
      name: 'Credential photo',
    });
  };

  const submit = async () => {
    setTouched(true);
    if (!valid || submitting) return;
    if (!online) {
      Alert.alert('No connection', 'Reconnect to submit your application.');
      return;
    }

    setSubmitting(true);
    try {
      let credentialUrl = credential?.url || null;
      let credentialName = credential?.name || null;

      if (credential?.uri && isLocalPhotoUri(credential.uri)) {
        if (!isSupabaseConfigured()) {
          throw new Error('Credential upload requires Supabase — check your .env.');
        }
        credentialUrl = await uploadExpertCredential({
          uri: credential.uri,
          base64: credential.base64,
          mimeType: credential.mimeType,
          width: credential.width,
          height: credential.height,
        });
        credentialName = 'Credential photo';
      }

      const res = await dispatch({
        type: 'SUBMIT_EXPERT_APPLICATION',
        expertBadgeTitle: badgeTitle.trim(),
        expertCircleId: circleId,
        credentialName,
        credentialUrl,
        status: 'pending',
      });
      if (res?.ok === false) throw res.error || new Error('Could not submit');
      Alert.alert('Application submitted', 'Your expert application is now pending admin review.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Could not submit', e?.message || 'Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const previewUri = displayPhotoUrl(credential, { allowLocal: true });

  return (
    <>
      <KeyboardScreen
        safe={false}
        contentStyle={styles.body}
        footer={(
          <View style={styles.footer}>
            <Button title={submitting ? 'Submitting…' : 'Submit application'} onPress={submit} disabled={!valid || submitting} />
          </View>
        )}
      >
        <Text style={styles.lead}>
          Verified experts help the community with credible answers. Declare your badge title and professional circle — both are required.
        </Text>

        <ExpertProfessionalFields
          badgeTitle={badgeTitle}
          onBadgeTitleChange={setBadgeTitle}
          circleId={circleId}
          onCircleIdChange={setCircleId}
          circles={state.circles}
          touched={touched}
        />

        <Text style={styles.sectionLabel}>Credentials · optional</Text>
        <Text style={styles.sectionHint}>Upload proof of registration/qualification (e.g. MARA number, CPA, AHPRA).</Text>
        <Pressable style={styles.upload} onPress={() => setPickerOpen(true)}>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.preview} resizeMode="cover" />
          ) : null}
          <Text style={styles.uploadText}>
            {credential ? `✓ ${credential.name}` : '📎  Upload credential photo'}
          </Text>
        </Pressable>

        <View style={styles.note}>
          <Text style={styles.noteText}>Demo note: real apps go to admin review. This prototype auto-approves on submit.</Text>
        </View>
      </KeyboardScreen>

      <PhotoSourceSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Add credential photo"
        showRemove={!!credential}
        onLibrary={pickCredential}
        onRemove={() => setCredential(null)}
      />
    </>
  );
}

const createStyles = (colors, spacing, font, radius) => StyleSheet.create({
  body: { padding: spacing.lg, paddingBottom: spacing.xl },
  lead: { fontSize: font.body, color: colors.textMuted, lineHeight: 22, marginBottom: spacing.lg },
  sectionLabel: { fontWeight: '800', color: colors.text, fontSize: font.bodyLg, marginTop: spacing.md },
  sectionHint: { color: colors.textMuted, fontSize: font.caption, marginTop: 4, marginBottom: spacing.sm, lineHeight: 18 },
  upload: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    overflow: 'hidden',
  },
  preview: { width: '100%', height: 120, borderRadius: radius.sm, marginBottom: spacing.sm },
  uploadText: { color: colors.primary, fontWeight: '700' },
  note: { backgroundColor: colors.secondaryTint, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.lg },
  noteText: { color: colors.secondaryDark, fontSize: font.tiny, lineHeight: 17 },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
});
