# Cleanup report

Safe structure cleanup of `chautari-test/` (no behavior, UI, styling, copy, or navigation-flow changes). Baseline before this work: commit `3116da9`. Docs live in this folder; the complete app map is [`APP_MAP.md`](./APP_MAP.md).

---

## Deleted (with evidence)

| Path | Why | Evidence |
|---|---|---|
| `src/screens/CategoriesScreen.js` | Never registered in any navigator. Categories became Circles. Also referenced a nonexistent `categoryCounts` selector. | No import of `CategoriesScreen` anywhere; no `name="Categories"` in `RootNavigator` / `MainTabs` / `ExpertsStack`. Commit `5c9065b`. |
| `src/screens/CategoryFeedScreen.js` | Same: never registered. Route string `'CategoryFeed'` only existed in `BackButton`'s `ALWAYS_BACK_ROUTES` Set (removed in the same commit). | Grep of `CategoryFeed` after the delete is empty. Commit `5c9065b`. |
| `src/screens/AnswerComposerScreen.js` | Never registered. Answering is inline on `QuestionDetailScreen`. | No import, no `name="AnswerComposer"`. Commit `5c9065b`. |
| `src/theme/theme.js` | Re-export shim with zero importers. | knip + repo-wide import grep. Commit `38cd846`. |

Six-criteria check used before each delete: no static import, not registered as a navigator screen, route string unused (except the leftover `'CategoryFeed'` in `BackButton`, which was removed with the delete), no config/asset reference, no `require()` of the path, not an Expo asset.

---

## Unused imports / locals removed (live files)

Commit `b302dd7`. Each identifier occurred nowhere else in its file (eslint unused + per-file grep).

| File | Removed |
|---|---|
| `src/components/FeedSortToggle.js` | unused `useCallback` import |
| `src/components/ProfileView.js` | unused `Pressable` import |
| `src/hooks/useForYouFeed.js` | local `bumpHotSnapshot` (never returned or called; `refresh` is the live equivalent) |
| `src/screens/AskComposerScreen.js` | unused `expertProfessionalPostsToday` destructure |
| `src/screens/CircleDetailScreen.js` | unused `photoUrl` import (kept `displayPhotoUrl`); unused `joinedCirclesList` destructure |
| `src/screens/MyPostsScreen.js` | unused `const { dispatch } = useData()` and the `useData` import |
| `src/screens/SearchScreen.js` | same unused `dispatch` / `useData` |
| `src/screens/SavedPostsScreen.js` | unused `spacing`, `font` from `useTheme()` |
| `src/screens/NotificationsScreen.js` | unused `VerifiedBadge` import |
| `src/services/digest.js` | unused `AsyncStorage` import and unused `DIGEST_CHANNEL` const |

Not touched: unused `catch (e)` params and `_` placeholders (idiomatic).

---

## Moved

All moves used `git mv` plus an import rewriter that resolved every relative spec to an absolute target *before* the move, then rewrote specs relative to the new locations (extension-less, kept `./` / `../`). Both platform exports were re-run after **each** commit (1142 Android / 1145 iOS modules, same as baseline).

### Screens → `src/screens/<feature>/`

| Commit | Target | Files |
|---|---|---|
| `7ec4962` | `auth/` | Splash, Welcome, PhoneEntry, Otp, ProfileName, ProfileSuburb |
| `9f55060` | `home/` | Home, Search, Notifications |
| `10a5423` | `questions/` | QuestionDetail, AskComposer |
| `d8b5095` | `circles/` | CirclesDirectory, CircleDetail, CreateCircle, EditCircle, CirclesSectionSeeAll |
| `3c9789a` | `experts/` | ExpertDirectory, ExpertProfile, VerifiedApplication, ExpertProfessionalSetup |
| `9eddaef` | `profile/` | MyProfile, UserProfile, EditProfile, MyPosts, SavedPosts |
| `0620157` | `checklist/` | ArrivalChecklist |
| `3b3f429` | `settings/` | Settings, Help, Terms, Privacy, About, DeleteAccount |
| `152c368` | `modals/` | Report, ImageViewer, ProfilePhotoPreview |

Zero files remain at `src/screens/*.js`.

### Components → grouped folders (44 files, above the 25-file threshold; grouping approved at the checkpoint)

| Commit | Target | Files |
|---|---|---|
| `b5f2fca` | `common/` | ui, Button, Avatar, Toast, BackButton, KeyboardScreen, ErrorBoundary, DispatchErrorBridge, Motion, Motif, MotifOverlay, Skeleton, DocScreen, MissingParamsFallback, ShinyWordmark, DigestManager, VerifiedBadge, KarmaBadge, FoundingMemberBadge |
| `2284497` | `feed/` | QuestionCard, QuestionCardPhotoThumb, QuestionFeedList, FeedSortToggle, CirclesRecommendRow, ChecklistFeedCard, PinnedQuestionCard, ExpertMarker |
| `77962e5` | `question/` | UpvoteButton, PhotoStrip, PhotoSourceSheet, SinglePhotoPicker, ContentPhoto, ExpertPostModeToggle, ExpertProfessionalConfirm, ExpertProfessionalFields, ExpertPostQuota |
| `34df50a` | `circles/` | CircleChip, CircleIcon, CircleDirectoryRow, CircleAboutSection, ExpertsHereRow, AccentSwatch |
| `00543c5` | `profile/` | ProfileView, FollowButton |

Zero files remain at `src/components/*.js`.

### Docs → `docs/`

Commit `d92f032`: `FEED_COMPOSITION.md`, `FEED_RANKING.md`, `BUGS.md`, `PRD.md`, `BUILD_BRIEF.md`. README links and the `See FEED_COMPOSITION.md` comment in `src/feed/rankingConfig.js:15` updated.

### README

Commit `f05a48b`: rewritten in place for SDK 58, outer-folder start scripts, development build instead of Expo Go, env-var table, new folder layout, and links to this report and `APP_MAP.md`.

### Misc

Commit `0cb7f3c`: added `*.apk` / `*.aab` to `.gitignore`.

Unchanged on purpose: `navigation/`, `data/`, `feed/`, `services/`, `hooks/`, `theme/`, `constants/`, `lib/`, `utils/`, `supabase/`.

---

## Uncertain (left untouched)

| Item | Why |
|---|---|
| `src/data/categories.js` | Live. Imported by 9 files for `SUBURBS`, `CATEGORIES`, `professionLabel`, `categoryName`. Official circles are derived from `CATEGORIES`. Only `categoryById` became unused after deleting `CategoryFeedScreen`, but `categoryName` still calls it internally. |
| `supabase/run-migrations.js`, `supabase/verify.js`, `supabase/scripts/run-sql.js` | knip flags as unused files; they are manual CLI tools (`node supabase/…`) that read `SUPABASE_DB_URL`. Keep. |
| 50 knip "unused exports" | Exported API surface, not local dead code. Includes `feed/*` tunables (off-limits by the cleanup rules and documented in `FEED_*.md`), `mediaStorage` lower-level helpers, `color.js` primitives, `format.js` `MILESTONES`/`nextMilestone`, `karma.js` `KARMA`/`computeAllKarma`, `circleDirectory.js` `buildAllList` (marked `@deprecated`). Report only. |
| `store.js` selector `forYouFeed` (line 1017) | Legacy selector, still exported from `useSelectors`. Home uses `src/hooks/useForYouFeed.js` + `src/feed/*` instead. No callers. Left in place (do not change reducer/selector logic in this pass). |
| `pg` (devDependency) | knip flags unused; used by `supabase/*.js` CLI scripts. Keep. |
| `@react-navigation/elements` | knip "unlisted"; pulled transitively by React Navigation. Do not add. |
| `expo-updates`, `expo-system-ui` | knip "unlisted"; Expo config / plugins, not app imports. Do not add. |

---

## Unused npm dependencies (report only)

No `package.json` dependency versions were changed.

- **devDep `pg`**: used by `supabase/run-migrations.js` / `verify.js` / `scripts/run-sql.js`. Keep.
- No unused production dependencies identified.

---

## Dead reducer action types

**None.** `src/data/store.js` has 34 `case` labels; every one is dispatched from somewhere (26 from screens/services, 8 internal to `DataProvider`: `HYDRATE`, `BOOTED`, `AUTH_READY`, `SET_AUTH`, `CLEAR_AUTH`, `CLEAR_LOCAL_SESSION`, `RESTORE_SESSION`, `MERGE_LIVE_DATA`).

---

## Verification

| Check | Result |
|---|---|
| `npx expo-doctor` | 20/20 checks passed (Phase 4, after all moves) |
| `npx expo export --platform android` | `Bundled … (1142 modules)` after every move commit, matching baseline |
| `npx expo export --platform ios` | `Bundled … (1145 modules)` after every move commit, matching baseline |
| Grep for deleted paths / routes (`CategoriesScreen`, `CategoryFeedScreen`, `AnswerComposerScreen`, `theme/theme`, `'CategoryFeed'`, `'Categories'`, `'AnswerComposer'`) | Zero matches outside `docs/` |
| Grep for leftover flat import paths (`screens/FooScreen`, `components/Foo`) | Zero matches |
| Route names, AsyncStorage keys, Supabase table/column names, env-var names | Unchanged |
| `supabase/migrations/` | Untouched |
| `package.json` dependencies / versions, `app.json`, `eas.json`, babel/metro, `.env*` | Untouched |

---

## Manual smoke-test checklist

Run on a development build (not Expo Go) with `.env` configured.

1. **Cold start** — splash ≥ 1.5 s, then Welcome (signed out) or Home (signed in).
2. **Onboarding** — phone → any 6-digit OTP (dev mode) → name → suburb + optional photo + newcomer toggle → land on Home.
3. **Home For You** — Hot/New toggle, pull-to-refresh, scroll pagination, "N new today" pill if any, checklist card if newcomer and not dismissed.
4. **Home tab re-tap** — while already on Home and scrolled down, tap Home: list scrolls to top and refreshes. Switching from Circles/Experts/Profile to Home must **not** force-scroll.
5. **Following tab** — empty-state suggested experts; follow one; posts from followed users appear.
6. **Post** — FAB opens composer; title 10–120 / body 30–4000 enforced; post lands on QuestionDetail; back returns to Home (not a dead stack).
7. **Thread** — answer (any non-empty body), nested reply, upvote post/answer/reply, save, report, open image viewer, tap author → profile.
8. **Circles** — directory sections, See all, join/leave a user circle (official circles have no leave), open a circle, pin/unpin as creator, create a circle, edit a circle.
9. **Experts** — directory filters, expert profile, Become verified (auto-approves), professional post mode + daily cap alert.
10. **Profile** — edit name/suburb/photo, My Posts, Saved Posts, checklist (if newcomer), Settings.
11. **Settings** — theme toggle (persists), digest mode, offline demo switch (composer shows "No connection"), Help/Terms/Privacy/About, Sign out, Delete account (returns to Welcome, local state wiped).
12. **Search** — text + circle/suburb/date filters.
13. **Notifications** — list sections; items mark read; digest tap (if scheduled) opens Circles tab.
14. **Dark mode** — Home, CircleDetail, QuestionDetail, Settings all themed (no leftover light-only surfaces).

---

## Commits (this cleanup, `3116da9` → HEAD)

```
5c9065b Remove unreachable screens: Categories, CategoryFeed, AnswerComposer
38cd846 Remove unused theme.js re-export shim
b302dd7 Remove unused imports and locals (no behavior change)
0cb7f3c Ignore local APK/AAB build outputs
7ec4962 Move auth screens into src/screens/auth/
9f55060 Move home screens into src/screens/home/
10a5423 Move question screens into src/screens/questions/
d8b5095 Move circle screens into src/screens/circles/
3c9789a Move expert screens into src/screens/experts/
9eddaef Move profile screens into src/screens/profile/
0620157 Move ArrivalChecklist screen into src/screens/checklist/
3b3f429 Move settings/legal screens into src/screens/settings/
152c368 Move modal screens into src/screens/modals/
b5f2fca Group shared UI primitives into src/components/common/
2284497 Group feed components into src/components/feed/
77962e5 Group question/composer components into src/components/question/
34df50a Group circle components into src/components/circles/
00543c5 Group profile components into src/components/profile/
d92f032 Move product/spec docs into docs/
f05a48b Rewrite README (SDK 58, dev build, env vars, folder layout)
```

Plus the commit that lands this file and `APP_MAP.md`.
