// Circles — user-created communities replacing categories as the bundling system.
import { CATEGORIES } from './categories';
import {
  clampForDarkSurface, contrastOnBackground, withAlpha,
} from '../utils/color';

// Single source of truth: palette KEY -> { light, dark }. Circles store accentId only.
export const CIRCLE_ACCENT_PALETTE = {
  crimson: { light: '#B5302E', dark: '#F2A8A6' },
  saffron: { light: '#C9772E', dark: '#F5D48A' },
  teal: { light: '#2F6E72', dark: '#8FD9DD' },
  forest: { light: '#3F7D6B', dark: '#9AD8C4' },
  ocean: { light: '#3C6E8F', dark: '#9FCEEE' },
  plum: { light: '#8E5A8C', dark: '#E0B0DE' },
  clay: { light: '#A14A3C', dark: '#F0B0A4' },
  olive: { light: '#577A3F', dark: '#BEE0A4' },
  amber: { light: '#D9A218', dark: '#F5DE8A' },
  slate: { light: '#5C6B7A', dark: '#B8CAD8' },
};

export const CIRCLE_ACCENT_PRESETS = Object.keys(CIRCLE_ACCENT_PALETTE).map((id) => ({ id }));

export const CIRCLE_ICON_PRESETS = ['🛂', '💰', '🩺', '🏠', '🏦', '💻', '🌏', '📌', '⚽', '🎓', '🍲', '🏏', '🌿', '☕', '🎉'];

const OFFICIAL_META = {
  migration: { name: 'Visa & Migration', handle: 'visa-migration', description: 'Visas, PR pathways, bridging visas and migration agents.' },
  tax_super: { name: 'Tax & Super', handle: 'tax-super', description: 'Tax returns, ABN, super and small-business posts.' },
  health: { name: 'Health & Medical', handle: 'health-medical', description: 'GPs, Medicare, mental health and navigating care in Australia.' },
  real_estate: { name: 'Real Estate', handle: 'real-estate', description: 'Renting, buying, auctions and tenant rights in Victoria.' },
  loans: { name: 'Loans & Mortgages', handle: 'loans-mortgages', description: 'Home loans, refinancing and first-home buyer schemes.' },
  it_careers: { name: 'IT & Careers', handle: 'it-careers', description: 'Jobs, resumes, interviews and breaking into the local market.' },
  general: { name: 'Life in Australia', handle: 'life-australia', description: 'Settling in, culture, community and everyday life.' },
  others: { name: 'Others', handle: 'others', description: 'Everything else — post away.' },
};

const OFFICIAL_ACCENTS = ['crimson', 'saffron', 'teal', 'ocean', 'forest', 'plum', 'clay', 'slate'];
const DAY = 24 * 60 * 60 * 1000;
const ago = (ms) => Date.now() - ms;

export function buildOfficialCircles() {
  return CATEGORIES.map((c, i) => ({
    id: c.id,
    name: OFFICIAL_META[c.id]?.name || c.name,
    handle: OFFICIAL_META[c.id]?.handle || c.id,
    description: OFFICIAL_META[c.id]?.description || c.name,
    icon: c.icon,
    accentId: OFFICIAL_ACCENTS[i % OFFICIAL_ACCENTS.length],
    creatorId: null,
    memberCount: 800 + i * 220,
    createdAt: ago(400 * DAY),
    isOfficial: true,
    isPrivate: false,
    pinnedQuestionId: null,
  }));
}

export function officialCircleIds() {
  return CATEGORIES.map((c) => c.id);
}

function paletteEntry(accentId) {
  return CIRCLE_ACCENT_PALETTE[accentId] || CIRCLE_ACCENT_PALETTE.crimson;
}

function accentKeyFromCircle(circle) {
  return circle?.accentId || 'crimson';
}

/**
 * Resolve accent for render — THE only path for circle colors in UI.
 * @param {string} accentId palette key
 * @param {boolean} isDark active theme
 * @param {string} surfaceHex colors.surface for contrast clamp in dark mode
 */
export function resolveCircleAccent(accentId, isDark, surfaceHex = '#141110') {
  const entry = paletteEntry(accentId);
  const color = isDark
    ? clampForDarkSurface(entry.dark, surfaceHex)
    : entry.light;
  return {
    id: accentId in CIRCLE_ACCENT_PALETTE ? accentId : 'crimson',
    color,
    onAccent: contrastOnBackground(color),
    light: entry.light,
    dark: entry.dark,
  };
}

/** @deprecated use resolveCircleAccent — kept for call-site ergonomics */
export function circleAccentColor(circle, isDark, surfaceHex) {
  return resolveCircleAccent(accentKeyFromCircle(circle), isDark, surfaceHex);
}

export function accentById(accentId) {
  const entry = paletteEntry(accentId);
  return { id: accentId, color: entry.light, darkColor: entry.dark };
}

export function circleIconPresentation(circle, isDark, themeColors) {
  const surface = themeColors?.surface || '#141110';
  const borderToken = themeColors?.borderStrong || '#3A3530';
  const accent = resolveCircleAccent(accentKeyFromCircle(circle), isDark, surface);
  if (isDark) {
    return {
      backgroundColor: accent.color,
      borderColor: borderToken,
      borderWidth: 1,
      labelColor: accent.color,
      onAccent: accent.onAccent,
    };
  }
  return {
    backgroundColor: withAlpha(accent.color, '38'),
    borderColor: withAlpha(accent.color, '66'),
    borderWidth: 1,
    labelColor: accent.color,
    onAccent: accent.color,
  };
}

export function accentSwatchPresentation(accentId, isDark, themeColors) {
  return circleIconPresentation({ accentId }, isDark, themeColors);
}

export function circleChipPresentation(circle, isDark, themeColors) {
  const surface = themeColors?.surface || '#141110';
  const accent = resolveCircleAccent(accentKeyFromCircle(circle), isDark, surface);
  const icon = circleIconPresentation(circle, isDark, themeColors);
  return {
    ...icon,
    labelColor: accent.color,
    chipBackground: isDark ? withAlpha(accent.color, '22') : withAlpha(accent.color, '14'),
    chipBorder: isDark ? themeColors?.borderStrong : withAlpha(accent.color, '55'),
  };
}

export function circleBannerGradient(circle, isDark, themeColors) {
  const surface = themeColors?.surface || (isDark ? '#141110' : '#FAF6F0');
  const bg = themeColors?.bg || surface;
  const accent = resolveCircleAccent(accentKeyFromCircle(circle), isDark, surface);
  const rich = circle?.isOfficial ? 1 : 0;
  if (isDark) {
    return {
      colors: [accent.color, withAlpha(accent.color, 'BB'), bg],
      locations: rich ? [0, 0.5, 1] : [0, 0.55, 1],
      motifOpacity: rich ? 0.14 : 0.1,
      onAccent: accent.onAccent,
    };
  }
  return {
    colors: [accent.color, withAlpha(accent.color, 'DD'), rich ? '#FAF6F0' : '#F2ECE3'],
    locations: rich ? [0, 0.4, 1] : [0, 0.5, 1],
    motifOpacity: rich ? 0.12 : 0.08,
    onAccent: accent.onAccent,
  };
}

export function slugify(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[m][n];
}

export function findSimilarCircles(name, circles, limit = 3) {
  const q = name.trim().toLowerCase();
  if (q.length < 2) return [];
  return circles
    .map((c) => {
      const n = c.name.toLowerCase();
      const sub = n.includes(q) || q.includes(n);
      const dist = levenshtein(q, n);
      const score = sub ? 0 : dist;
      return { circle: c, score };
    })
    .filter((x) => x.score <= 4)
    .sort((a, b) => a.score - b.score || b.circle.memberCount - a.circle.memberCount)
    .slice(0, limit)
    .map((x) => x.circle);
}

export function isCircleNameTaken(name, circles, exceptId = null) {
  const n = name.trim().toLowerCase();
  return circles.some((c) => c.id !== exceptId && c.name.trim().toLowerCase() === n);
}
