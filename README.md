# Chautari

**Community Q&A for the Nepali diaspora in Australia**

Chautari is a mobile-first platform where newcomers and long-term residents post about practical topics (visas, tax, healthcare, renting, careers) and get answers from the community and **verified local experts** (migration agents, accountants, GPs, mortgage brokers, and more).

**Terminology:** a **Post** receives **Answers**; each answer can have **Replies** (one level deep). The app copy, the Supabase schema (`posts` → `answers` → `replies`) and these docs all use the same words.

> *A chautari is the shaded resting place under a tree where villagers gather to talk, which is the spirit of the product.*

**Target launch:** 2027 (Greater Melbourne first, Australia-wide later)

**Current status:** In active development. Live data from **Supabase** (auth, profiles, Q&A, circles, photo storage) when `.env` is configured. Official circles and the arrival checklist catalog ship with the app; there is no bundled fake feed.

For a complete, file-by-file map of the codebase (navigation, state, data flow, feed pipeline, Supabase schema, business rules) see [`docs/APP_MAP.md`](./docs/APP_MAP.md).

---

## Getting started

### Requirements

- Node 18+ and npm
- A **development build** of the app on a device/emulator (see below). The project is on **Expo SDK 58**; the Expo Go app in the stores targets an older SDK and will not load this project.
- Optional: a Supabase project (for sign-in, profile sync, posting to the live DB, and photo upload)

### Folder layout

This repo is the app itself. If you cloned the outer workspace folder, it contains a thin wrapper `package.json` and `start.cmd` that delegate into this folder:

```
<outer folder>/
├── package.json      # npm run start / android / ios / web -> forwards to chautari-test/
├── start.cmd         # Windows: installs deps if missing, then `npx expo start`
└── chautari-test/    # <- this repo (app root)
```

### Install and run

From the **outer folder**:

```bash
npm run start          # = npm --prefix chautari-test run start
npm run start:clear    # same, with Metro cache cleared
npm run android        # expo start --android
npm run ios            # expo start --ios
```

Or from this folder (`chautari-test/`):

```bash
npm install
npx expo start
```

Then open the project in your development build (press `a` / `i`, or scan the QR code with the dev build, not Expo Go).

### Development build (instead of Expo Go)

The project uses Continuous Native Generation (no committed `android/` or `ios/` folders).

- **Android APK via EAS** (profile defined in `eas.json`):
  ```bash
  npx eas build --platform android --profile preview
  ```
  Install the resulting APK on a device, then run `npx expo start` and open the project from the dev build.
- **Local native run** (requires Android Studio / Xcode toolchains):
  ```bash
  npx expo run:android
  npx expo run:ios
  ```

### Environment variables

Copy `.env.example` to `.env` (gitignored, never commit it).

| Variable | Used by | Purpose |
|----------|---------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | `src/lib/supabase.js` | Supabase project URL. If unset, the app stays signed out of the backend (official circles only, empty feed). |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `src/lib/supabase.js` | Supabase anon (public) key. Never put a `service_role` key in the app. |
| `EXPO_PUBLIC_AUTH_DEV_MODE` | `src/lib/supabase.js` (consumed by `src/services/auth.js`) | `true` (default) uses a mock OTP in the UI; set `false` for real SMS OTP via Supabase Auth. |
| `SUPABASE_DB_URL` | `supabase/*.js` scripts only | Direct Postgres connection string for running migrations and verification scripts. Not read by the app. |

Feature flags in code (not env): `ENABLE_REPLY_PHOTOS` in `src/constants/media.js`.

### Reset local state

State persists between launches via AsyncStorage (`chautari.state.v3`; older `v2` caches are deleted on boot). To reset: **Profile → Settings → Delete account**, or clear the app's storage.

### Verify a clean bundle

```bash
npx expo-doctor
npx expo export --platform android
npx expo export --platform ios
```

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Mobile app | React Native 0.88, Expo SDK 58, JavaScript (no TypeScript) |
| Navigation | React Navigation 7 (native stack + bottom tabs) |
| State | React Context + reducer (`src/data/store.js`), persisted via AsyncStorage |
| Backend | Supabase (PostgreSQL, Auth, Row Level Security, Storage) |
| Theming | Semantic design tokens, light + dark mode (`src/theme/`) |
| Media | `expo-image-picker` + `expo-image-manipulator`, uploads to the public `media` bucket |

---

## Key features

- **Onboarding**: phone OTP flow (mock by default), profile name/suburb/photo, newcomer opt-in for the arrival checklist
- **Feeds**: For You with **Hot/New** toggle and **80/20 joined/discovery** composition ([`docs/FEED_COMPOSITION.md`](./docs/FEED_COMPOSITION.md), [`docs/FEED_RANKING.md`](./docs/FEED_RANKING.md)); Following tab; permanent membership in the 8 official circles; tap the Home tab again to scroll to top and refresh
- **Circles**: official topic communities + user-created circles; join/leave, create, edit, pin a post
- **Posts**: post/answer/reply, anonymous posting, photo upload, bookmarks, upvotes with karma
- **Verified experts**: directory with filters, expert profiles, pinned expert answers, professional post mode with a daily cap
- **Notifications**: grouped activity feed, local digest scheduling (`expo-notifications`)
- **Arrival checklist**: newcomer tasks with deep-links to community threads
- **Trust & safety**: report flow, account deletion, help/terms/privacy/about screens

---

## Photo upload (Supabase Storage)

Real image pick → compress (HEIC→JPEG) → upload → public URL → render everywhere.

| Target | Limit | Config |
|--------|-------|--------|
| Post photos | Up to 5, ~5 MB each, JPEG/PNG/HEIC | Always on |
| Profile avatar | Single image; native 1:1 crop + circular preview confirm | Always on |
| Circle banner | Single image (create/edit) | Always on; accent fallback when none |
| Answer / reply photos | Single each | `ENABLE_REPLY_PHOTOS` in `src/constants/media.js` |

**Bucket:** public `media`; see [`supabase/migrations/006_storage_media.sql`](supabase/migrations/006_storage_media.sql) and [`supabase/README.md`](supabase/README.md).

**Client:** all uploads go through `uploadImageAsset()` in `src/services/mediaStorage.js` (stage blob/crop URIs → `file://` JPEG → base64 → ArrayBuffer → Supabase Storage). Requires a signed-in Supabase user.

**Profile photo flow:** chooser → native square crop → `ProfilePhotoPreview` screen → upload on confirm.

---

## Project structure

```
App.js                      # Providers + RootNavigator
src/
├── navigation/             # RootNavigator, MainTabs, ExpertsStack
├── screens/                # grouped by feature
│   ├── auth/  home/  questions/ (post screens)  circles/  experts/
│   ├── profile/  checklist/  settings/  modals/
├── components/             # common/ feed/ question/ (post components) circles/ profile/
├── data/                   # store.js (reducer + selectors), circles.js, categories.js, checklist.js, ...
├── feed/                   # feedComposition.js, feedRanking.js, rankingConfig.js
├── hooks/                  # useForYouFeed, useLiveDataRefresh, useImagePicker, ...
├── services/               # auth, profile, mediaStorage, digest, liveData/*
├── lib/                    # supabase client
├── theme/                  # ThemeContext, palettes
├── constants/  utils/
supabase/
├── migrations/             # 000..010 SQL, applied in order (never edit existing files)
├── run-migrations.js  verify.js  scripts/
docs/                       # APP_MAP, CLEANUP_REPORT, FEED_*, PRD, BUILD_BRIEF, BUGS
```

---

## Documentation

- [`docs/APP_MAP.md`](./docs/APP_MAP.md): complete app map (run, navigation, state, data flow, feed pipeline, Supabase, business rules, trace guides)
- [`docs/CLEANUP_REPORT.md`](./docs/CLEANUP_REPORT.md): what the structure cleanup removed/moved and how it was verified
- [`docs/FEED_COMPOSITION.md`](./docs/FEED_COMPOSITION.md): For You 80/20 joined/discovery blend
- [`docs/FEED_RANKING.md`](./docs/FEED_RANKING.md): For You Hot/New ranking spec
- [`docs/PRD.md`](./docs/PRD.md) and [`docs/BUILD_BRIEF.md`](./docs/BUILD_BRIEF.md): original product and design briefs
- [`docs/BUGS.md`](./docs/BUGS.md): navigation audit log from polish passes
- [`supabase/README.md`](./supabase/README.md): how to run migrations

---

## Roadmap

| Phase | Focus |
|-------|--------|
| **Now** | Prototype polish, UX validation, architecture hardening |
| **2026** | Supabase backend hardening (real OTP, RLS review, moderation tools), beta with verified expert onboarding |
| **2027** | Public launch: Greater Melbourne, then national expansion |

---

## Author

**Ashish Poudel**, product & engineering

Copyright © 2026 Ashish Poudel. All rights reserved.
