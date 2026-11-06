import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { decode as decodeBase64 } from 'base64-arraybuffer';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  MEDIA_BUCKET,
  MEDIA_PATH_PREFIX,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_DIMENSION,
  JPEG_QUALITY,
  UPLOAD_CONTENT_TYPE,
  PICKER_IMAGE_TYPES,
} from '../constants/media';

function storagePath(prefix, userId, entityId, fileName) {
  return `${prefix}/${userId}/${entityId}/${fileName}`;
}

/**
 * Read a prepared file:// JPEG into an ArrayBuffer for Supabase upload.
 * Never fetch() blob:/content:/ph: URIs — RN has no blob: handler.
 */
async function readFileAsArrayBuffer(fileUri) {
  if (!fileUri?.startsWith('file://')) {
    throw new Error('Photo must be saved as a local file before upload. Try selecting the photo again.');
  }

  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const arrayBuffer = decodeBase64(base64);
  if (!arrayBuffer.byteLength) throw new Error('Photo file is empty.');
  return arrayBuffer;
}

async function fileByteSize(fileUri) {
  return (await readFileAsArrayBuffer(fileUri)).byteLength;
}

/** Read a blob: URI to base64 without fetch() — web uses XHR + FileReader. */
async function readBlobUriAsBase64(blobUri) {
  if (Platform.OS === 'web' && typeof XMLHttpRequest !== 'undefined') {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result;
          if (typeof dataUrl !== 'string' || !dataUrl.includes(',')) {
            reject(new Error('Could not read photo data.'));
            return;
          }
          resolve(dataUrl.split(',')[1]);
        };
        reader.onerror = () => reject(new Error('Could not read photo data.'));
        reader.readAsDataURL(xhr.response);
      };
      xhr.onerror = () => reject(new Error('Could not read photo data.'));
      xhr.open('GET', blobUri);
      xhr.responseType = 'blob';
      xhr.send();
    });
  }

  throw new Error(
    'Could not read cropped photo. Try choosing the image again from your library.',
  );
}

/**
 * Stage picker/crop output to file:// before ImageManipulator or upload.
 * Handles blob: via picker base64 or web XHR — never fetch(blob:).
 */
export async function stagePickerAssetToFile(asset) {
  if (!asset?.uri && !asset?.base64) {
    throw new Error('Photo is missing — try selecting again.');
  }

  const cacheFile = `${FileSystem.cacheDirectory}chautari_stage_${Date.now()}.jpg`;

  if (asset.base64) {
    await FileSystem.writeAsStringAsync(cacheFile, asset.base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const bytes = await readFileAsArrayBuffer(cacheFile);
    if (!bytes.byteLength) throw new Error('Photo file is empty.');
    return cacheFile;
  }

  const { uri } = asset;
  if (uri.startsWith('file://')) return uri;

  if (uri.startsWith('blob:')) {
    const base64 = await readBlobUriAsBase64(uri);
    await FileSystem.writeAsStringAsync(cacheFile, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const bytes = await readFileAsArrayBuffer(cacheFile);
    if (!bytes.byteLength) throw new Error('Photo file is empty.');
    return cacheFile;
  }

  return uri;
}

export function getMediaPublicUrl(path) {
  if (!isSupabaseConfigured()) return null;
  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Normalize any picker/crop URI (blob:, file:, ph:, …) to a compressed JPEG file://
 * via expo-image-manipulator, then validate size.
 */
export async function prepareImageForUpload(asset) {
  const mime = (asset.mimeType || asset.type || '').toLowerCase();
  if (mime && !PICKER_IMAGE_TYPES.some((t) => mime.includes(t.replace('image/', '')))) {
    throw new Error('Use a JPEG, PNG, or HEIC photo.');
  }

  const sourceUri = await stagePickerAssetToFile(asset);

  let width = asset.width;
  let height = asset.height;
  const actions = [];
  if (width && height && (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION)) {
    actions.push({
      resize: width >= height
        ? { width: MAX_IMAGE_DIMENSION }
        : { height: MAX_IMAGE_DIMENSION },
    });
  }

  const manipulated = await ImageManipulator.manipulateAsync(
    sourceUri,
    actions,
    { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG },
  );

  if (!manipulated.uri.startsWith('file://')) {
    throw new Error('Could not prepare photo for upload — try selecting the image again.');
  }

  const size = await fileByteSize(manipulated.uri);
  if (size > MAX_IMAGE_BYTES) {
    throw new Error('Photo is too large — pick an image under 5 MB.');
  }
  if (!size) {
    throw new Error('Could not read the selected photo. Try another image.');
  }

  return { uri: manipulated.uri, size, contentType: UPLOAD_CONTENT_TYPE };
}

async function requireAuthUserId() {
  if (!isSupabaseConfigured()) throw new Error('Photo upload requires Supabase — check your .env.');
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) throw new Error('Sign in to upload photos.');
  return user.id;
}

/**
 * Upload a prepared JPEG to Supabase Storage.
 * @returns public HTTPS URL
 */
export async function uploadMediaFile({
  prefix,
  entityId,
  localUri,
  fileName = 'photo.jpg',
  upsert = true,
}) {
  const userId = await requireAuthUserId();
  const path = storagePath(prefix, userId, entityId, fileName);
  const arrayBuffer = await readFileAsArrayBuffer(localUri);
  if (!arrayBuffer.byteLength) throw new Error('Photo file is empty — could not read image bytes.');

  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, arrayBuffer, {
    contentType: UPLOAD_CONTENT_TYPE,
    upsert,
    cacheControl: '3600',
  });
  if (error) throw error;

  const url = getMediaPublicUrl(path);
  if (!url) throw new Error('Upload succeeded but public URL is missing.');
  return url;
}

/**
 * Single shared upload entry — every image upload in the app must go through here.
 * Stages blob:/crop URIs → JPEG file:// → base64 → ArrayBuffer → Supabase Storage.
 */
export async function uploadImageAsset(asset, {
  prefix,
  entityId,
  fileName = 'photo.jpg',
  upsert = true,
} = {}) {
  if (!prefix || !entityId) throw new Error('Upload path is incomplete.');
  const prepared = await prepareImageForUpload(asset);
  return uploadMediaFile({
    prefix,
    entityId,
    localUri: prepared.uri,
    fileName,
    upsert,
  });
}

/** @deprecated Use uploadImageAsset — kept for any external callers. */
export async function uploadPreparedImage(options) {
  return uploadImageAsset(options.asset || options, options);
}

export async function uploadAvatar(asset) {
  return uploadImageAsset(asset, {
    prefix: MEDIA_PATH_PREFIX.AVATAR,
    entityId: 'profile',
    fileName: `avatar-${Date.now()}.jpg`,
    upsert: true,
  });
}

export async function uploadQuestionPhotos(questionId, assets) {
  const urls = [];
  for (let i = 0; i < assets.length; i += 1) {
    const url = await uploadImageAsset(assets[i], {
      prefix: MEDIA_PATH_PREFIX.POST,
      entityId: questionId,
      fileName: `${i}.jpg`,
    });
    urls.push(url);
  }
  return urls;
}

export async function uploadCircleImage(circleId, asset) {
  return uploadImageAsset(asset, {
    prefix: MEDIA_PATH_PREFIX.CIRCLE,
    entityId: circleId,
    fileName: 'banner.jpg',
    upsert: true,
  });
}

export async function uploadAnswerPhoto(answerId, asset) {
  return uploadImageAsset(asset, {
    prefix: MEDIA_PATH_PREFIX.ANSWER,
    entityId: answerId,
    fileName: 'photo.jpg',
  });
}

export async function uploadReplyPhoto(replyId, asset) {
  return uploadImageAsset(asset, {
    prefix: MEDIA_PATH_PREFIX.REPLY,
    entityId: replyId,
    fileName: 'photo.jpg',
  });
}

export async function uploadExpertCredential(asset) {
  return uploadImageAsset(asset, {
    prefix: MEDIA_PATH_PREFIX.CREDENTIAL,
    entityId: 'application',
    fileName: `credential-${Date.now()}.jpg`,
    upsert: true,
  });
}
