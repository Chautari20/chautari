const FALLBACK = 'Something went wrong. Try again.';

export function emptyScreenError() {
  return { message: '', detail: '' };
}

/** Friendly copy always. Extra code/message only in __DEV__. */
export function screenError(e, fallback = FALLBACK) {
  return {
    message: e?.message || fallback,
    detail: __DEV__ ? String(e?.devDetail || e?.code || '').trim() : '',
  };
}
