/** PRD excludes answer/reply photos — flip to false to hide without touching other upload sites. */
export const ENABLE_REPLY_PHOTOS = true;

export const MEDIA_BUCKET = 'media';

export const MAX_QUESTION_PHOTOS = 5;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // ~5 MB per PRD
export const MAX_IMAGE_DIMENSION = 1920;
export const JPEG_QUALITY = 0.82;
export const UPLOAD_CONTENT_TYPE = 'image/jpeg';

/** Picker MIME types we accept before HEIC→JPEG conversion. */
export const PICKER_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'];

export const MEDIA_PATH_PREFIX = {
  AVATAR: 'avatars',
  POST: 'posts', // was 'questions' before migration 014; legacy objects stay readable
  CIRCLE: 'circles',
  ANSWER: 'answers',
  REPLY: 'replies',
  CREDENTIAL: 'credentials',
};

/** Diameter used on My Profile, Edit Profile, and the photo preview confirm screen. */
export const PROFILE_AVATAR_SIZE = 88;
