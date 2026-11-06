# Chautari App Map

Complete, file-by-file map of the Chautari codebase as of the structure cleanup (see [`CLEANUP_REPORT.md`](./CLEANUP_REPORT.md)). Every claim cites a file (and line where it matters). Anything that could not be verified from the code is marked **UNVERIFIED**.

Stack: Expo SDK 58, React Native 0.88, React 19.3, JavaScript only, React Navigation 7, Supabase JS. No TypeScript, no path aliases, Continuous Native Generation (no `android/` or `ios/` committed).

**Terminology.** The product model is **Post → Answers → Replies** (a reply belongs to an answer; one level deep). UI copy, the Supabase schema (`posts`, `answers`, `replies` — migration 014) and this document use those words. Code identifiers that pre-date the rename keep their names (`QuestionDetail`/`AskComposer` routes, `ASK_QUESTION`/`DELETE_QUESTION`/`*_QUESTION` action types, `state.questions`, `questionId` props, `screens/questions/`, `components/question/`); wherever this document says `question*` in a code span, read it as "post".

---

## 1. How to run

### Prerequisites

- Node 18+ and npm.
- A **development build** on a device/emulator. The project is on SDK 58; the store Expo Go targets an older SDK and will refuse the project. Build one with `npx eas build --platform android --profile preview` (profile in `eas.json`, produces an APK) or `npx expo run:android` / `npx expo run:ios` locally.
- Optional Supabase project for auth, profile sync, live Q&A and photo upload.

### Commands

| From | Command | Effect |
|---|---|---|
| outer workspace folder | `npm run start` | `npm --prefix chautari-test run start` → `expo start` |
| outer workspace folder | `npm run start:clear` | same with `-c` (clear Metro cache) |
| outer workspace folder | `npm run android` / `npm run ios` / `npm run web` | `expo start --android` etc. |
| outer workspace folder (Windows) | `start.cmd` | installs deps if `node_modules/expo` missing, then `npx expo start` |
| `chautari-test/` | `npm install` then `npx expo start` | same as above |
| `chautari-test/` | `npx expo-doctor` | project health (20 checks) |
| `chautari-test/` | `npx expo export --platform android` / `ios` | bundle check |
| `chautari-test/` | `node supabase/run-migrations.js` | apply SQL migrations (needs `SUPABASE_DB_URL`) |
| `chautari-test/` | `node supabase/verify.js` | verify schema (needs `SUPABASE_DB_URL`) |
| `chautari-test/` | `node supabase/scripts/run-sql.js <file.sql>` | run an ad-hoc SQL file |

### Environment variables

Defined in `.env` (gitignored; template in `.env.example`).

| Variable | Read in | Effect |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | `src/lib/supabase.js:5` | With the anon key, enables `isSupabaseConfigured()`. Unset → no backend session (`authReady` is true immediately); feed stays empty aside from official circles. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `src/lib/supabase.js:6` | Anon key for the Supabase client. Never ship `service_role`. |
| `EXPO_PUBLIC_AUTH_DEV_MODE` | `src/lib/supabase.js:16-26` | Only the string `true` **and** a `__DEV__` build → `isAuthDevMode()` / `usesMockOtp()`. Skips sending SMS/email; login still looks up the account and never creates a user. Release logs an error and uses the real path. |
| `SUPABASE_DB_URL` | `supabase/run-migrations.js`, `supabase/verify.js`, `supabase/scripts/run-sql.js` | Direct Postgres URL for scripts only. Not read by the app. |

Code-level flags (not env): `ENABLE_REPLY_PHOTOS = true` in `src/constants/media.js:2`.

### Local persistence keys (AsyncStorage)

| Key | Written by | Contents |
|---|---|---|
| `chautari.state.v3` | `src/data/store.js` (`STORAGE_KEY`) | Whole reducer state minus `booted`, `authReady`, `authUserId`. Legacy `chautari.state.v2` is deleted on boot. |
| `chautari.theme.v1` | `src/theme/ThemeContext.js:6, 17, 26` | `'light'` or `'dark'` (default `'light'`; no system-follow mode) |
| Supabase auth session | `src/lib/supabase.js:17` (`storage: AsyncStorage`) | Managed by supabase-js |

---

## 2. Annotated folder tree

```
chautari-test/
├── App.js                      Provider tree: SafeArea → ErrorBoundary → Theme → Data → Network → Toast → RootNavigator
├── index.js                    Expo entry (registerRootComponent)
├── app.json                    Expo config (name, icons, splash plugin, permissions)
├── eas.json                    EAS build profile "preview" → Android APK
├── babel.config.js / metro.config.js
├── .env.example                Env template
├── docs/                       APP_MAP, CLEANUP_REPORT, FEED_COMPOSITION, FEED_RANKING, PRD, BUILD_BRIEF, BUGS
├── supabase/
│   ├── config.toml             JWT flags for edge functions
│   ├── migrations/             000..013 SQL (see §10). Never edit existing 000–012 files.
│   ├── run-migrations.js       Applies migrations in order via `pg`
│   ├── verify.js               Sanity-checks schema
│   ├── functions/              email-verification (JWT); account-recovery, account-lookup, email-login (--no-verify-jwt)
│   ├── scripts/run-sql.js      Run arbitrary SQL file
│   ├── scripts/grant_expert_ashish2.sql   One-off dev grant script
│   └── README.md               How to run migrations
└── src/
    ├── navigation/
    │   ├── RootNavigator.js    Native stack; auth vs signed-in groups; modal group; DigestManager mount
    │   ├── MainTabs.js         Bottom tabs: Home, Circles, Experts, Profile
    │   └── ExpertsStack.js     Nested stack inside Experts tab: ExpertDirectory → ExpertProfile
    ├── screens/                One folder per feature
    │   ├── auth/               Splash, PhoneEntry (login), PhoneRegister, Otp, EmailLogin*, Email, EmailCode, recovery, ProfileName, ProfileSuburb. WelcomeScreen.js exists but is not in the stack.
    │   ├── home/               Home (feeds), Search, Notifications
    │   ├── questions/          QuestionDetail (thread, answer/reply composers), AskComposer
    │   ├── circles/            CirclesDirectory (tab), CircleDetail, CreateCircle, EditCircle, CirclesSectionSeeAll
    │   ├── experts/            ExpertDirectory (tab root), ExpertProfile, VerifiedApplication, ExpertProfessionalSetup
    │   ├── profile/            MyProfile (tab), UserProfile, EditProfile, MyPosts, SavedPosts
    │   ├── checklist/          ArrivalChecklist
    │   ├── settings/           Settings, Help, Terms, Privacy, About, DeleteAccount
    │   └── modals/             Report, ImageViewer, ProfilePhotoPreview
    ├── components/
    │   ├── common/             Design primitives + app chrome (ui.js, Button, Avatar, Toast, BackButton, ErrorBoundary, Skeleton, Motion, badges, DigestManager…)
    │   ├── feed/               QuestionCard, QuestionFeedList, FeedSortToggle, CirclesRecommendRow, ChecklistFeedCard, PinnedQuestionCard, ExpertMarker, QuestionCardPhotoThumb
    │   ├── question/           UpvoteButton, PhotoStrip, PhotoSourceSheet, SinglePhotoPicker, ContentPhoto, ExpertPost* (mode toggle, quota, fields, confirm)
    │   ├── circles/            CircleChip, CircleIcon, CircleDirectoryRow, CircleAboutSection, ExpertsHereRow, AccentSwatch
    │   └── profile/            ProfileView, FollowButton
    ├── data/
    │   ├── store.js            DataProvider: reducer, persistence, Supabase bootstrap, syncDispatch, useSelectors
    │   ├── circles.js          8 official circles, accent palette + presentation helpers, slugify, name checks
    │   ├── categories.js       CATEGORIES (8 official circle ids), SUBURBS, professionLabel()
    │   ├── checklist.js        10 "First 30 Days" items (`questionId` is null until a live thread exists)
    │   └── network.js          Mock online/offline context (toggle in Settings)
    ├── feed/
    │   ├── rankingConfig.js    Tunables: GRAVITY, WEIGHTS, PAGE_SIZE, DISCOVERY_RATIO, DISCOVERY_MIN_SCORE; score()
    │   ├── feedComposition.js  Joined pool + discovery pool → sort → 4:1 merge
    │   └── feedRanking.js      compareHot/compareNew, snapshot slicing, keyset cursor helpers
    ├── hooks/
    │   ├── useForYouFeed.js    Snapshot-per-session For You feed with Hot/New + pagination
    │   ├── useLiveDataRefresh.js  Focus-debounced (45s) Supabase refetch + forced pull-to-refresh
    │   ├── useImagePicker.js   Camera/library picker with iOS presentation wait
    │   ├── useProfilePhotoFlow.js Avatar pick → crop → preview modal → confirm
    │   └── useGoBack.js        Safe goBack with tab fallback; Android back handler
    ├── services/
    │   ├── auth.js             Phone OTP / mock password auth; email-login token verify
    │   ├── authSession.js      After a session: home if complete, else first unfinished onboarding step
    │   ├── emailRecovery.js    Edge function wrappers (verify, recovery, lookup, email-login)
    │   ├── profile.js          profiles row ↔ app user mapping; completeOnboarding; updateProfile
    │   ├── mediaStorage.js     Image staging/compress/upload to `media` bucket; per-target upload helpers
    │   ├── digest.js           Local notification digest: summary, schedule, permissions
    │   └── liveData/
    │       ├── index.js        Re-exports
    │       ├── fetch.js        fetchLiveBundle(): 7 parallel queries + profiles
    │       ├── persist.js      persistAction(): per-action Supabase writes for SYNC_ACTIONS
    │       ├── mappers.js      DB row → app shape (question/answer/reply/profile/circle)
    │       └── ids.js          UUID checks, makeId()
    ├── lib/supabase.js         Supabase client + isSupabaseConfigured/isAuthDevMode
    ├── theme/                  ThemeContext (light/dark, persisted), palettes.js, tokens.js
    ├── constants/              media.js (upload limits), newcomer.js (60-day window)
    └── utils/                  navigation guards, format, karma, color, photos, expertPost, circleDirectory, dispatchGuards
```

---

## 3. Navigation

### Diagram

```mermaid
flowchart TD
  App[App.js providers] --> Root[RootNavigator<br/>native stack]
  Root -->|!ready| Splash
  Root -->|no currentUserId & no authUserId| AuthGroup
  Root -->|authUserId but no profile| ProfileGroup
  Root -->|currentUserId| SignedIn

  subgraph AuthGroup[Auth group]
    PhoneEntry -->|login OTP| Otp --> ProfileName --> Email --> EmailCode --> ProfileSuburb
    PhoneEntry --> PhoneRegister -->|register OTP| Otp
    PhoneEntry --> EmailLogin --> EmailLoginCode
    PhoneEntry --> RecoveryEmail --> RecoveryEmailCode --> RecoveryNewPhone --> RecoveryPhoneCode --> RecoverySuccess --> PhoneEntry
    ProfileSuburb -.modal.-> PPP1[ProfilePhotoPreview]
  end
  subgraph ProfileGroup[Needs-profile group]
    PN2[ProfileName] --> EM2[Email] --> EC2[EmailCode] --> PS2[ProfileSuburb] -.modal.-> PPP2[ProfilePhotoPreview]
  end

  subgraph SignedIn[Signed-in group]
    Main[Main = MainTabs]
    Main --> Home
    Main --> Circles[Circles = CirclesDirectory]
    Main --> Experts[Experts = ExpertsStack]
    Main --> Profile[Profile = MyProfile]
    Experts --> ExpertDirectory --> EP1[ExpertProfile]

    Home --> QuestionDetail
    Home --> Search
    Home --> Notifications
    Home -.modal.-> AskComposer
    Home --> ArrivalChecklist
    Circles --> CircleDetail
    Circles --> CirclesSectionSeeAll
    Circles --> CreateCircle
    CircleDetail --> EditCircle
    CircleDetail --> QuestionDetail
    QuestionDetail -.modal.-> Report
    QuestionDetail -.modal.-> ImageViewer
    QuestionDetail --> UserProfile
    QuestionDetail --> EP2[ExpertProfile root]
    Profile --> Settings
    Profile --> EditProfile
    Profile --> MyPosts
    Profile --> SavedPosts
    Profile --> VerifiedApplication
    Profile --> ArrivalChecklist
    Settings --> Help & Terms & Privacy & About & DeleteAccount
    Settings --> ChangePhoneEmailCode --> ChangePhoneNew --> ChangePhoneSmsCode
    Settings --> CreateCircle
    AskComposer --> ExpertProfessionalSetup
    EditProfile -.modal.-> PPP3[ProfilePhotoPreview]
  end
```

Gating logic (`src/navigation/RootNavigator.js`): `ready = state.booted && state.authReady && minTimePassed` (1500 ms minimum splash); `needsProfile = !!state.authUserId && !state.currentUserId`. Profile is complete only with a name **and** `email_verified_at` (`utils/email.js:isProfileComplete`). A signed-in user who quit before verifying email lands on `Email`.

### Route table

All routes use `headerBackVisible: false` and a shared `BackButton` as `headerLeft` (`RootNavigator.js:95-97`, `ExpertsStack.js:18-19`).

| Route name | Navigator | Component | Header / presentation | Params |
|---|---|---|---|---|
| `Splash` | Root | `screens/auth/SplashScreen` | hidden, fade | – |
| `PhoneEntry` | Root (auth), initial signed-out route | `screens/auth/PhoneEntryScreen` | title `''` | `phone?`, `phoneE164?` |
| `PhoneRegister` | Root (auth) | `screens/auth/PhoneRegisterScreen` | title `''` | `phone?`, `phoneE164?` |
| `Otp` | Root (auth) | `screens/auth/OtpScreen` | title `''` | `phone`, `phoneE164`, `flow` (`login`/`register`), `createUser` |
| `EmailLogin` / `EmailLoginCode` | Root (auth) | `screens/auth/EmailLoginScreen`, `EmailLoginCodeScreen` | title `''` | `email` |
| `RecoveryEmail` / `RecoveryEmailCode` / `RecoveryNewPhone` / `RecoveryPhoneCode` / `RecoverySuccess` | Root (auth) | `screens/auth/Recovery*` | title `''` | email / token / new phone |
| `ProfileName` | Root (auth + needs-profile) | `screens/auth/ProfileNameScreen` | "Your profile" | `phone`, `phoneE164` |
| `Email` / `EmailCode` | Root (auth + needs-profile) | `screens/auth/EmailScreen`, `EmailCodeScreen` | "Recovery email" / `''` | `email`, `name`, `phone` |
| `ProfileSuburb` | Root (auth + needs-profile) | `screens/auth/ProfileSuburbScreen` | "Almost there" | `name`, `phone`, `phoneE164` |
| `ProfilePhotoPreview` | Root (auth, needs-profile, and signed-in modal group) | `screens/modals/ProfilePhotoPreviewScreen` | "Preview photo", modal, slide_from_bottom | `localUri`, `base64`, `mimeType`, `width`, `height`, `displayName`, `returnScreen` |
| `Main` | Root | `navigation/MainTabs` | hidden, fade | – |
| `Home` | MainTabs | `screens/home/HomeScreen` | tab | – |
| `Circles` | MainTabs | `screens/circles/CirclesDirectoryScreen` | tab | – |
| `Experts` | MainTabs | `navigation/ExpertsStack` | tab | – |
| `ExpertDirectory` | ExpertsStack | `screens/experts/ExpertDirectoryScreen` | hidden | – |
| `ExpertProfile` | ExpertsStack **and** Root | `screens/experts/ExpertProfileScreen` | `route.params.title` or "Expert" | `userId`, `title` |
| `Profile` | MainTabs | `screens/profile/MyProfileScreen` | tab | – |
| `QuestionDetail` | Root | `screens/questions/QuestionDetailScreen` | "Question" | `questionId`, `justPosted?`, `fromChecklist?` |
| `CircleDetail` | Root | `screens/circles/CircleDetailScreen` | title `''` | `circleId` |
| `CirclesSectionSeeAll` | Root | `screens/circles/CirclesSectionSeeAllScreen` | `CIRCLE_DIR_SEE_ALL_TITLES[sectionKey]` | `sectionKey` |
| `CreateCircle` | Root | `screens/circles/CreateCircleScreen` | "Create a Circle" | – |
| `EditCircle` | Root | `screens/circles/EditCircleScreen` | "Edit circle" | `circleId` |
| `Search` | Root | `screens/home/SearchScreen` | "Search" | `reset?` |
| `UserProfile` | Root | `screens/profile/UserProfileScreen` | `params.title` or "Profile" | `userId`, `title` |
| `VerifiedApplication` | Root | `screens/experts/VerifiedApplicationScreen` | "Become a Verified Expert" | – |
| `ExpertProfessionalSetup` | Root | `screens/experts/ExpertProfessionalSetupScreen` | "Expert profile setup" | – |
| `Notifications` | Root | `screens/home/NotificationsScreen` | "Activity" | – |
| `EditProfile` | Root | `screens/profile/EditProfileScreen` | "Edit profile" | – |
| `MyPosts` | Root | `screens/profile/MyPostsScreen` | "My Posts" | – |
| `SavedPosts` | Root | `screens/profile/SavedPostsScreen` | "Saved Posts" | – |
| `ArrivalChecklist` | Root | `screens/checklist/ArrivalChecklistScreen` | "First 30 Days" | – |
| `Settings` | Root | `screens/settings/SettingsScreen` | "Settings" | – |
| `ChangePhoneEmailCode` / `ChangePhoneNew` / `ChangePhoneSmsCode` | Root | `screens/settings/ChangePhone*` | "Change phone number" / "New number" / `''` | `token`, `phoneE164` |
| `Help` / `Terms` / `Privacy` / `About` | Root | `screens/settings/*` | "Help & FAQ" / "Terms & Conditions" / "Privacy Policy" / "About Chautari" | – |
| `DeleteAccount` | Root | `screens/settings/DeleteAccountScreen` | "Delete account" | – |
| `AskComposer` | Root modal group | `screens/questions/AskComposerScreen` | "New post", modal | `circleId?` (preselects circle, `AskComposerScreen.js:52`) |
| `Report` | Root modal group | `screens/modals/ReportScreen` | "Report", modal | `kind` (`'content'`/`'expert'`), `targetTitle` |
| `ImageViewer` | Root modal group | `screens/modals/ImageViewerScreen` | hidden, fullScreenModal, fade | `photos[]`, `index` |

Navigation helpers: `src/utils/navigation.js` (`useNavigationGuard` debounces double taps, `navigateToMainTab`, `openAuthorProfile` resolves anonymous/self/expert → `UserProfile`/`ExpertProfile`/Profile tab), `src/hooks/useGoBack.js` (fallback to a tab when the stack is shallow).

---

## 4. Screen catalog

| Screen | Purpose | Reads (selectors / services) | Dispatches | Navigates to |
|---|---|---|---|---|
| `auth/SplashScreen` | Branded wait while `booted`/`authReady`/1.5 s elapse | – | – | – (RootNavigator swaps route) |
| `auth/PhoneEntryScreen` | Log in: lookup phone, then OTP (`shouldCreateUser: false`). Pinned Register; email login + lost-number links | `lookupAccount`, `sendPhoneOtp` | – | `Otp`, `PhoneRegister`, `EmailLogin`, `RecoveryEmail` |
| `auth/PhoneRegisterScreen` | Register: lookup phone, then OTP (`shouldCreateUser: true`) | `lookupAccount`, `sendPhoneOtp` | – | `Otp`, `PhoneEntry` |
| `auth/OtpScreen` | 6-digit SMS. Mock login: `signInDevForPhone` (no sign-up). Mock register: `ensureSupabaseUserForPhone` | `verifyPhoneOtp`, `finishAuthNavigation` | via `authSession` | home / first incomplete onboarding step |
| `auth/EmailLoginScreen` / `EmailLoginCodeScreen` | Email login for a **verified** recovery email | `lookupAccount`, `sendEmailLogin`, `verifyEmailLoginCode`, `verifyEmailLoginToken` | via `authSession` | home / onboarding |
| `auth/EmailScreen` / `EmailCodeScreen` | Recovery email + 6-digit code via `email-verification` | `sendVerifyEmail`, `verifyEmailCode`, `lookupAccount` (mock taken-check) | `SET_AUTH_PROFILE` / `LOGOUT` | `ProfileSuburb` or sign-out to Log in |
| `auth/Recovery*` | Lost-phone flow via `account-recovery` (no JWT) | `startAccountRecovery` … `completeAccountRecovery` | – | back to `PhoneEntry` with new number |
| `auth/ProfileNameScreen` | Display name | – | – | `Email` |
| `auth/ProfileSuburbScreen` | Suburb, avatar, "I'm new to Australia" toggle; finishes onboarding (`uploadAvatar`, `completeOnboarding`) | `completeOnboarding`, `uploadAvatar`, `useProfilePhotoFlow` | `SET_AUTH`, `SIGN_UP`, `UPDATE_PROFILE` | `ProfilePhotoPreview`; Root swaps to `Main` |
| `home/HomeScreen` | For You / Following tabs, Hot/New toggle, live pill, checklist card, FAB composer; tab re-tap scrolls to top + refreshes (lines 118-127) | `useForYouFeed`, `useLiveDataRefresh({onFocus:true})`, `followingFeed`, `newTodayCount`, `suggestedExperts`, `canOpenComposerToday`, `isNewcomerActive` | `DISMISS_CHECKLIST_CARD`, `TOGGLE_UPVOTE_QUESTION` (via card), `TOGGLE_FOLLOW` (via FollowButton) | `AskComposer`, `Search`, `Notifications`, `QuestionDetail`, `CircleDetail`, `ArrivalChecklist`, author profiles |
| `home/SearchScreen` | Text + circle/suburb/date filters over `feedQuestions()` | `feedQuestions`, `userById`, `circleById` | – | `QuestionDetail` |
| `home/NotificationsScreen` | Sectioned activity list; marks read after 900 ms | `state.notifications` | `MARK_NOTIFS_READ` | `QuestionDetail` |
| `questions/QuestionDetailScreen` | Thread: question, answers, replies; inline answer/reply composers with optional single photo; save, upvote, pin/unpin (creator), delete (owner), report, image viewer; focus refetch | `questionById`, `userById`, `hasUpvoted*`, `isSaved`, `isCircleCreator`, `isQuestionOwner`, `useLiveDataRefresh`, `uploadAnswerPhoto`, `uploadReplyPhoto` | `ADD_ANSWER`, `ADD_REPLY`, `TOGGLE_UPVOTE_QUESTION/ANSWER/REPLY`, `TOGGLE_SAVE_QUESTION`, `PIN_QUESTION_TO_CIRCLE`, `UNPIN_QUESTION_FROM_CIRCLE`, `DELETE_QUESTION` | `Report`, `ImageViewer`, `CircleDetail`, author profiles |
| `questions/AskComposerScreen` | Title (10–120), body (30–4000), circle picker, anonymous toggle, up to 5 photos, expert professional mode; daily caps | `me`, `canExpertPostProfessionalToday`, `canPostMemberToday`, `joinedCirclesList`, `useNetwork`, `uploadQuestionPhotos` | `ASK_QUESTION` | `ExpertProfessionalSetup`; on success dismisses modal then `QuestionDetail` |
| `circles/CirclesDirectoryScreen` | Tab root: "Your circles", "Popular", "All" sections (`utils/circleDirectory.js`) | `officialCircles`, `userCircles`, `joinedUserCirclesList`, `circleActivitySince` | `TOGGLE_JOIN_CIRCLE` | `CircleDetail`, `CirclesSectionSeeAll`, `CreateCircle` |
| `circles/CirclesSectionSeeAllScreen` | Paged full list for one section | `getSectionFullList` | `TOGGLE_JOIN_CIRCLE` | `CircleDetail` |
| `circles/CircleDetailScreen` | Banner, about, experts-here row, pinned card, questions list; join/leave; edit (creator) | `circleById`, `questionsInCircle`, `pinnedQuestionInCircle`, `expertsInCircle`, `isJoinedCircle`, `isCircleCreator` | `TOGGLE_JOIN_CIRCLE` | `QuestionDetail`, `EditCircle`, `AskComposer`, expert profiles |
| `circles/CreateCircleScreen` | Name (uniqueness + similar-name hints), description, icon, accent, banner image | `findSimilarCircles`, `isCircleNameTaken`, `uploadCircleImage` | `CREATE_CIRCLE` (+ `TOGGLE_JOIN_CIRCLE` for suggested) | `CircleDetail` |
| `circles/EditCircleScreen` | Edit name/description/accent/banner (creator only) | `circleById`, `uploadCircleImage` | `UPDATE_CIRCLE` | back |
| `experts/ExpertDirectoryScreen` | Verified experts with category + suburb filters | `experts`, `CATEGORIES`, `SUBURBS` | – | `ExpertProfile` (nested) |
| `experts/ExpertProfileScreen` | Expert profile via shared `ProfileView` | `userById`, `questionsByAuthor`, `karmaFor` | `TOGGLE_FOLLOW` (FollowButton) | `QuestionDetail`, `Report` |
| `experts/VerifiedApplicationScreen` | Badge title, expert circle, optional credential upload; **auto-approved** (`status: 'approved'`, line 79) | `uploadExpertCredential`, `validateExpertBadgeTitle` | `SUBMIT_EXPERT_APPLICATION` | back |
| `experts/ExpertProfessionalSetupScreen` | Declare badge title + circle for professional posting | `validateExpertBadgeTitle` | `SET_EXPERT_PROFESSIONAL_PROFILE` | back |
| `profile/MyProfileScreen` | Tab root: avatar, karma, founding badge, options (checklist if newcomer, My Posts, Saved, Become verified) | `me`, `karmaFor`, `checklistDoneCount`, `isNewcomerActive` | – | `Settings`, `EditProfile`, `MyPosts`, `SavedPosts`, `VerifiedApplication`, `ArrivalChecklist` |
| `profile/UserProfileScreen` | Other member profile via `ProfileView` | `userById`, `questionsByAuthor` | `TOGGLE_FOLLOW` | `QuestionDetail`, `Report` |
| `profile/EditProfileScreen` | Name, suburb, bio, avatar | `updateProfile` (Supabase), `uploadAvatar`, `useProfilePhotoFlow` | `UPDATE_PROFILE` | `ProfilePhotoPreview` |
| `profile/MyPostsScreen` | Own questions | `myQuestions` | – | `QuestionDetail` |
| `profile/SavedPostsScreen` | Bookmarked questions | `savedQuestionsList` | – | `QuestionDetail` |
| `checklist/ArrivalChecklistScreen` | 10 newcomer tasks with progress bar and completion animation | `CHECKLIST_ITEMS`, `isChecklistItemDone` | `TOGGLE_CHECKLIST_ITEM` | `QuestionDetail` (deep link per item) |
| `settings/SettingsScreen` | Theme toggle, digest, masked recovery email, change phone, sign out | `recoveryEmailStatus`, `useTheme`, `useNetwork`, `signOut` | `SET_DIGEST_MODE`, `LOGOUT` | `ChangePhoneEmailCode`, `Help`, `About`, `Terms`, `Privacy`, `EditProfile`, `CreateCircle`, `DeleteAccount` |
| `settings/ChangePhone*` | Email code (`change_phone`) → new AU number → `updateUser({ phone })` + `verifyOtp({ type: 'phone_change' })` | `email-verification`, `supabase.auth` | – | `Settings` |
| `settings/DeleteAccountScreen` | Confirm + wipe local state, Supabase `signOut` | `signOut` | `DELETE_ACCOUNT` | Root swaps to auth group |
| `settings/Help|Terms|Privacy|About` | Static copy via `components/common/DocScreen` | – | – | – |
| `modals/ReportScreen` | Reason list per `kind` + detail | – | `ADD_REPORT` | back |
| `modals/ImageViewerScreen` | Full-screen pager for photos | – | – | back |
| `modals/ProfilePhotoPreviewScreen` | Circular 88 pt preview, confirm/retake | `PROFILE_AVATAR_SIZE` | – (returns via callback in `useProfilePhotoFlow`) | back |

---

## 5. State

### Shape (`src/data/store.js:165-188`, `buildInitialState`)

```js
{
  booted: false,              // AsyncStorage hydration finished
  authReady: !isSupabaseConfigured(), // Supabase session check finished (true immediately offline)
  authUserId: null,           // Supabase auth.users.id (UUID) or null
  currentUserId: null,        // 'me' when signed in with a profile, else null
  users: [],                  // live profiles + `me`; [{ id, name, suburb, photo, bio, verified, ... }]
  circles: buildOfficialCircles(), // official 8 + live user circles after MERGE
  joinedCircles: officialCircleIds(), // official ids always treated as joined
  questions: [],              // live + optimistic `me` posts
  following: [],              // user ids (UUIDs)
  notifications: [],          // [{ id, type, text, questionId?, milestone?, createdAt, read }]
  myUpvotes: { questions: [], answers: [], replies: [] },
  savedQuestions: [],
  reports: [],
  expertApplication: null,    // { expertBadgeTitle, expertCircleId, credentialName, credentialUrl, status, submittedAt }
  expertUpvoteBonuses: {},
  digestMode: 'daily',        // 'daily' | 'weekly' | 'off'
  checklistDone: [],          // checklist item ids
  checklistCardDismissed: false,
  newcomer: false,
  newcomerSince: null,
}
```

Persisted to `chautari.state.v3` on every change after hydration, excluding `booted`, `authReady`, `authUserId`. Legacy `v2` is removed on boot.

### Dispatch pipeline

`useData().dispatch` is `syncDispatch` (`store.js:836-860`): dedupes in-flight toggle actions by key (`utils/dispatchGuards.js:inflightKeyForAction`), then if Supabase is configured, signed in, and the action is in `SYNC_ACTIONS` (`services/liveData/persist.js:8-15`), awaits `persistAction()` **before** reducing. On failure it logs, shows a toast via `registerDispatchErrorHandler` ("Couldn't save — check your connection."), and returns `{ ok: false, error }` without reducing. Postgres unique-violation `23505` on toggles is treated as benign.

### Action table

| Action | Payload | Reducer effect (`store.js`) | Supabase write (`persist.js`) | Dispatched from |
|---|---|---|---|---|
| `HYDRATE` | `payload` (persisted state) | Restore persisted users/posts; ensure official circles; defaults; `booted: true` | – | DataProvider boot |
| `BOOTED` | – | `booted: true` | – | DataProvider boot (no/invalid storage) |
| `AUTH_READY` | – | `authReady: true` | – | DataProvider boot |
| `SET_AUTH` | `userId` | `authUserId` | – | DataProvider, OtpScreen, ProfileSuburbScreen |
| `CLEAR_AUTH` | – | `authUserId: null` | – | DataProvider on `SIGNED_OUT` |
| `CLEAR_LOCAL_SESSION` | – | `currentUserId: null` | – | DataProvider |
| `RESTORE_SESSION` | `userId`, `profile` row | Build `me` from row; keep existing following/notifications (or `[]`); official joined fallback; newcomer/digest/checklist meta | – | DataProvider, OtpScreen |
| `SIGN_UP` | `name`, `newcomer`, `authUserId` | Create `me` (followers 0, founding member), official joined circles only | – (profile written by `completeOnboarding`) | ProfileSuburbScreen |
| `UPDATE_PROFILE` | `patch` | Patch `me`; sanitize photo (282-291) | – (EditProfile calls `updateProfile()` directly) | ProfileSuburbScreen, EditProfileScreen |
| `LOGOUT` | – | `currentUserId: null`, `authUserId: null` | – | SettingsScreen |
| `DELETE_ACCOUNT` | – | `buildInitialState()` (full wipe) | – | DeleteAccountScreen |
| `ASK_QUESTION` | `id`, `title`, `body`, `circleId`, `anonymous`, `photos`, `postedAsExpert?`, `professionLabel?` | Enforce daily caps; expert posts never anonymous; expert circle override; prepend question (300-333) | insert `questions` | AskComposerScreen |
| `MERGE_LIVE_DATA` | `payload` bundle | Local-pending `me` posts + live posts; merge users/circles; union upvotes/saves/UUID follows/joins/checklist | – | DataProvider initial load, `refreshFromServer` |
| `ADD_ANSWER` | `questionId`, `id`, `body`, `anonymous`, `photoUrl` | Append answer | insert `answers` | QuestionDetailScreen |
| `ADD_REPLY` | `questionId`, `answerId`, `id`, `body`, `anonymous`, `photoUrl`, `postedAsExpert?`, `professionLabel?` | Append reply | insert `replies` | QuestionDetailScreen |
| `TOGGLE_UPVOTE_QUESTION` | `questionId` | ±1, track in `myUpvotes.questions` (449-464) | `upvotes` insert/delete + bump `questions.upvotes` | QuestionCard/QuestionDetail |
| `TOGGLE_SAVE_QUESTION` | `questionId` | toggle `savedQuestions` (466-474) | `saved_posts` insert/delete | QuestionDetail, QuestionCard |
| `TOGGLE_UPVOTE_ANSWER` | `answerId` | ±1; milestone notification; expert-upvote bonus for answer author when voter is verified (476-527) | `upvotes` + bump `answers.upvotes` | QuestionDetail |
| `TOGGLE_UPVOTE_REPLY` | `replyId` | ±1 (529-550) | `upvotes` + bump `replies.upvotes` | QuestionDetail |
| `TOGGLE_FOLLOW` | `userId` | toggle following; adjust `followers` count; no self-follow | `follows` insert/delete (skipped for `'me'` / non-UUID) | FollowButton |
| `DELETE_QUESTION` | `questionId` | remove (569-570) | delete `questions` where author = me | QuestionDetail |
| `MARK_NOTIFS_READ` | – | all `read: true` | – | NotificationsScreen |
| `SUBMIT_EXPERT_APPLICATION` | `expertBadgeTitle`, `expertCircleId`, `credentialName`, `credentialUrl`, `status` | store application; if `approved`, mark `me` verified with category/profession (574-601) | insert `expert_applications`; if approved update `profiles` | VerifiedApplicationScreen |
| `SET_EXPERT_PROFESSIONAL_PROFILE` | `expertBadgeTitle`, `expertCircleId` | update `me` badge/circle/profession (603-620) | update `profiles` | ExpertProfessionalSetupScreen |
| `ADD_REPORT` | `report: { kind, target, reason, detail }` | append (622-623) | insert `reports` | ReportScreen |
| `ADD_NOTIFICATION` | `notification` | prepend (625-628) | – | `services/digest.js` |
| `CREATE_CIRCLE` | `name`, `description`, `icon`, `accentId`, `imageUrl`, `id?` | reject if name taken; prepend; auto-join (630-652) | insert `circles` + `circle_members` | CreateCircleScreen |
| `TOGGLE_JOIN_CIRCLE` | `circleId` | no-op for official; toggle + memberCount (654-670) | `circle_members` insert/delete | CirclesDirectory, CircleDetail, SeeAll, CreateCircle |
| `SET_DIGEST_MODE` | `mode` | set (672-673) | update `profiles.digest_mode` | SettingsScreen |
| `UPDATE_CIRCLE` | `circleId`, `name`, `description`, `accentId`, `imageUrl?` | creator-only, non-official, unique name (675-695) | update `circles` where creator = me | EditCircleScreen |
| `PIN_QUESTION_TO_CIRCLE` | `circleId`, `questionId` | creator-only; post must be in circle (697-708) | update `circles.pinned_post_id` | QuestionDetail |
| `UNPIN_QUESTION_FROM_CIRCLE` | `circleId`, `questionId` | creator-only; must match current pin (723-733) | update `circles.pinned_post_id = null` | QuestionDetail |
| `TOGGLE_CHECKLIST_ITEM` | `itemId` | toggle (710-718) | `checklist_progress` insert/delete | ArrivalChecklistScreen |
| `DISMISS_CHECKLIST_CARD` | – | `checklistCardDismissed: true` | update `profiles.checklist_card_dismissed` | HomeScreen |

All 34 action types are dispatched somewhere; there are **no dead action types**.

### Selectors (`useSelectors()`, `store.js:885-1113`)

Identity/users: `state`, `userById`, `me`, `isFollowing`, `experts`, `karmaFor`, `isQuestionOwner`, `isNewcomerActive`.
Questions: `questionById`, `answerCount`, `feedQuestions`, `forYouFeed` (legacy, **unused**: Home uses `useForYouFeed`), `followingFeed`, `myQuestions`, `questionsByAuthor`, `expertAuthoredQuestions`, `savedQuestionsList`, `expertAnswerOn`, `hasExpertAnswer`, `newTodayCount`, `suggestedExperts`.
Votes/saves: `hasUpvotedQuestion`, `hasUpvotedAnswer`, `hasUpvotedReply`, `isSaved`.
Posting quotas: `expertProfessionalPostsToday/Remaining`, `canExpertPostProfessionalToday`, `memberPostsToday/Remaining`, `canPostMemberToday`, `canOpenComposerToday`, legacy aliases `expertPostsToday`, `expertPostsRemaining`, `canExpertPostToday`, constants `expertDailyPostLimit`, `memberDailyPostLimit`.
Circles: `circleById`, `isJoinedCircle`, `effectiveJoinedCircleIds`, `joinedCirclesList`, `joinedUserCirclesList`, `officialCircles`, `userCircles`, `circleQuestionCount`, `circleActivitySince`, `questionsInCircle`, `pinnedQuestionInCircle`, `expertsInCircle`, `isCircleCreator`, `recommendedCircles`.
Notifications/checklist: `unreadNotifs`, `isChecklistItemDone`, `checklistDoneCount`.

---

## 6. Data flow

### Boot

1. `DataProvider` deletes legacy `chautari.state.v2`, then reads `chautari.state.v3` → `HYDRATE` or `BOOTED`.
2. If Supabase configured: `getSession()`; on session → `SET_AUTH`, `fetchProfile`; profile with a name → `RESTORE_SESSION`, else `CLEAR_LOCAL_SESSION`; always `AUTH_READY` (770-794). Subscribes to `onAuthStateChange` for `SIGNED_OUT` (796-802).
3. When `authUserId && currentUserId && authReady`: `fetchLiveBundle` → `MERGE_LIVE_DATA` (811-825).
4. `RootNavigator` shows `Splash` until `booted && authReady && 1.5 s`.

### Live data model

- **Reference (client):** 8 official circles (`data/circles.js:buildOfficialCircles`) and 10 checklist items (`data/checklist.js`). No bundled users, questions, follows or notifications.
- **Live (Supabase):** profiles, Q&A, user-created circles, follows, saves, upvotes, reports. Every synced write goes to Supabase when configured (`persist.js` `SYNC_ACTIONS`).
- `MERGE_LIVE_DATA` keeps local optimistic rows from `me` not yet on the server and takes live rows as truth for the rest.
- Author id mapping: DB `author_id === authUserId` ↔ app `'me'` (`services/liveData/mappers.js:authorToApp`). Follows only persist for UUID targets (`persist.js` skips `'me'`).

### Refresh

`useLiveDataRefresh({ onFocus })` (`hooks/useLiveDataRefresh.js`): on screen focus, refetch at most every 45 s; the returned function forces a refetch (pull-to-refresh on Home, QuestionDetail). Home tab re-tap (when Home is already selected) scrolls to top and calls the same `onRefresh` (`screens/home/HomeScreen.js:118-127`).

### Sequence: create a post

```mermaid
sequenceDiagram
  participant U as User
  participant AC as AskComposerScreen
  participant MS as services/mediaStorage
  participant SD as store.syncDispatch
  participant PA as liveData/persist
  participant SB as Supabase
  participant R as reducer
  U->>AC: Tap Publish post
  AC->>AC: check daily cap, expert profile, validity, online
  AC->>AC: id = `q_<base36 time>`
  opt photos pending
    AC->>MS: uploadQuestionPhotos(id, assets)
    MS->>SB: storage.upload media/posts/<uid>/...
    SB-->>MS: public URLs
  end
  AC->>SD: dispatch ASK_QUESTION {id, title, body, circleId, anonymous, photos, postedAsExpert?}
  SD->>PA: persistAction (if configured + signed in)
  PA->>SB: insert posts row
  SB-->>PA: ok / error
  PA-->>SD: action
  SD->>R: reduce → prepend post (caps re-checked)
  SD-->>AC: { ok: true }
  AC->>AC: goBack() then root.navigate('QuestionDetail', { questionId: id, justPosted: true })
```

### Sequence: answer a post

```mermaid
sequenceDiagram
  participant U as User
  participant QD as QuestionDetailScreen
  participant MS as services/mediaStorage
  participant SD as store.syncDispatch
  participant PA as liveData/persist
  participant SB as Supabase
  participant R as reducer
  U->>QD: Type answer, tap Post
  QD->>QD: require non-empty trimmed body, online
  QD->>QD: answerId = `a_<base36 time>`
  opt ENABLE_REPLY_PHOTOS && photo
    QD->>MS: uploadAnswerPhoto(answerId, asset)
    MS->>SB: storage.upload media/answers/<uid>/...
  end
  QD->>SD: dispatch ADD_ANSWER {questionId, id, body, anonymous, photoUrl}
  SD->>PA: persistAction
  PA->>SB: insert answers row (post_id)
  SD->>R: append answer to post.answers
  SD-->>QD: { ok: true } → toast "Answer posted"
```

### Sequence: upvote

```mermaid
sequenceDiagram
  participant U as User
  participant C as UpvoteButton (QuestionCard / QuestionDetail)
  participant SD as store.syncDispatch
  participant G as dispatchGuards
  participant PA as liveData/persist
  participant SB as Supabase
  participant R as reducer
  U->>C: Tap upvote
  C->>SD: dispatch TOGGLE_UPVOTE_ANSWER {answerId}
  SD->>G: inflightKeyForAction → "uv:a:<id>"
  alt already in flight
    SD-->>C: { ok: true, skipped: true }
  else
    SD->>PA: persistAction
    alt parent post is live
      PA->>SB: insert/delete upvotes(user_id, 'answer', id)
      PA->>SB: read answers.upvotes, update ±1
    end
    SD->>R: toggle myUpvotes.answers, ±1 upvotes, milestone notification, expert bonus
    SD-->>C: { ok: true }
  end
```

---

## 7. Feed pipeline (For You)

Entry: `screens/home/HomeScreen.js:55` → `hooks/useForYouFeed.js` → `feed/feedComposition.js:composeForYouFeed` → `feed/feedRanking.js` + `feed/rankingConfig.js`. Specs: [`FEED_COMPOSITION.md`](./FEED_COMPOSITION.md), [`FEED_RANKING.md`](./FEED_RANKING.md).

1. **Pools** (`feedComposition.js`)
   - Joined pool: posts whose `circleId` (or legacy `category`) is in `effectiveJoinedCircleIds()` (official circles always included). Includes own posts. (`buildJoinedPool`, 21-24)
   - Discovery pool: non-joined, not own, circle public (`isCirclePublic`; `isPrivate !== true`), Hot score ≥ `DISCOVERY_MIN_SCORE = 2.0`. (`buildDiscoveryPool`, 27-48)
2. **Sort** each pool: `new` → `createdAt DESC, id DESC`; `hot` → `_hotScore DESC, id DESC` (`feedRanking.js:4-13`).
3. **Hot score** (`rankingConfig.js:33-50`): `engagement / (hours + 2) ** 1.5` where `engagement = 1 + upvotes + 2·answers + 8·hasExpertAnswer`.
4. **Merge** 4 joined : 1 discovery, then backfill joined; discovery capped by the pattern (`mergeSortedPools`, 52-73). `JOINED_SLOTS_PER_DISCOVERY = round(0.8/0.2) = 4`.
5. **Snapshot + paging** (`useForYouFeed.js`): `referenceTime` is captured once per snapshot; `snapshotGen` bumps on refresh, on switching to Hot, and whenever the posts fingerprint (`id:createdAt:answerCount`) changes. Visible window grows by `PAGE_SIZE = 10` via `loadMore`. Switching to New keeps the reference time.
6. **Home decorations** (`HomeScreen.js`): `CirclesRecommendRow` inserted after index 4 when > 5 items; "N new today" pill from `newTodayCount` (24 h); `ChecklistFeedCard` when `isNewcomerActive()` and not dismissed; four `QuestionCardSkeleton`s while the local `loading` flag is true (`HomeScreen.js:45, 63-71, 207-210` — cleared 500 ms after the first `requestIdleCallback`).

Following tab: `followingFeed()` = posts authored or answered by followed users, newest first (`store.js:1032-1038`). Circle feeds: `questionsInCircle` newest first excluding the pinned post (`store.js:964-970`).

---

## 8. Catalogs

### Services

| File | Exports | Notes |
|---|---|---|
| `services/auth.js` | `toE164Au`, `usesMockOtp`, `ensureSupabaseUserForPhone`, `signInDevForPhone`, `sendPhoneOtp`, `verifyPhoneOtp`, `verifyEmailLoginToken`, `getSession`, `signOut`, `onAuthStateChange` | Mock register may create `user+<digits>@chautari.app`. Mock login never creates. Real login: `signInWithOtp` `shouldCreateUser: false`. |
| `services/authSession.js` | `finishAuthNavigation` | `SET_AUTH_PROFILE` then home (`RESTORE_SESSION`) or first incomplete onboarding route. |
| `services/emailRecovery.js` | verify / recovery / `lookupAccount` / `sendEmailLogin` / `verifyEmailLoginCode` | Invokes edge functions; friendly `error` plus `__DEV__` `devDetail`. |
| `services/profile.js` | `normalizePhoneE164`, `ensureProfilePhone`, `profileRowToUser`, `profileMetaFromRow`, `fetchProfile`, `updateProfile`, `completeOnboarding` | `completeOnboarding` ensures the auth user exists then updates `profiles` (name, suburb, photo_url, newcomer, is_founding_member = true, phone). |
| `services/mediaStorage.js` | `stagePickerAssetToFile`, `getMediaPublicUrl`, `prepareImageForUpload`, `uploadMediaFile`, `uploadImageAsset`, `uploadPreparedImage`, `uploadAvatar`, `uploadQuestionPhotos`, `uploadCircleImage`, `uploadAnswerPhoto`, `uploadReplyPhoto`, `uploadExpertCredential` | Pipeline: stage → resize ≤ 1920 px, JPEG q0.82 → base64 → ArrayBuffer → `storage.from('media').upload(<prefix>/<uid>/<file>)`. Prefixes in `constants/media.js:MEDIA_PATH_PREFIX`. Requires signed-in user (RLS). |
| `services/digest.js` | `ensureNotificationPermissions`, `composeDigestSummary`, `cancelDigestSchedule`, `scheduleDigest`, `addDigestInAppNotification`, `runDigestPreview` | Local `expo-notifications` only. Daily 18:00 or weekly Monday 18:00 (`weekday: 2`), identifier `chautari-daily-digest`. Tapping routes to Circles tab (`components/common/DigestManager.js`). |
| `services/liveData/fetch.js` | `fetchLiveBundle` | 7 parallel queries: `posts(*, answers(*, replies(*)))`, non-official `circles`, my `upvotes`, `saved_posts`, `follows`, `circle_members`, `checklist_progress`; then `profiles in (…uuids)`. Non-UUID ids filtered. |
| `services/liveData/persist.js` | `shouldSyncAction`, `persistAction` | See action table (§5). |
| `services/liveData/mappers.js` | `authorToApp`, `authorToDb`, `mapReply`, `mapAnswer`, `mapQuestion`, `mapProfileRow`, `mapCircle` | snake_case rows → camelCase app objects; `created_at` → epoch ms. |
| `services/liveData/ids.js` | `isValidUuid`, `filterValidUuids`, `makeId` | |
| `lib/supabase.js` | `supabase`, `isSupabaseConfigured`, `isAuthDevMode` | Client is `null` when not configured. Mock only if `EXPO_PUBLIC_AUTH_DEV_MODE === 'true'` and `__DEV__`. |

### Hooks

| Hook | File | Purpose |
|---|---|---|
| `useForYouFeed` | `hooks/useForYouFeed.js` | See §7 |
| `useLiveDataRefresh` | `hooks/useLiveDataRefresh.js` | Focus-debounced refetch (45 s) + forced refresh fn |
| `useImagePicker` | `hooks/useImagePicker.js` | Camera/library pick with permissions; `waitForPickerPresentation` works around iOS modal-dismiss race |
| `useProfilePhotoFlow` | `hooks/useProfilePhotoFlow.js` | Pick → 1:1 crop → `ProfilePhotoPreview` → confirm/remove callbacks |
| `useGoBack`, `useAndroidBackHandler` | `hooks/useGoBack.js` | Safe back with tab fallback |
| `useNavigationGuard` | `utils/navigation.js:55` | Debounced `navigate` to prevent double pushes |
| `useTheme`, `useThemedStyles` | `theme/ThemeContext.js` | `{ mode, isDark, colors, shadow, spacing, radius, font, line, weight, colorForString, setMode, toggleDark, ready }` |
| `useData`, `useSelectors` | `data/store.js` | See §5 |
| `useNetwork` | `data/network.js` | Mock `online` flag + setter (Settings switch) |
| `useToast` | `components/common/Toast.js:64` | `{ showToast }` (used as `showToast(text, { tone })` in QuestionDetail) |

### Components

| Folder | Component | Used by (representative) |
|---|---|---|
| common | `ui.js` (`EmptyState`, `Chip`, `Pill`, `SectionLabel`, `Field`, `Input`, `CharCount`, `Divider`, `CountBadge`, `Card`) | most screens |
| common | `Button`, `Avatar`, `Toast`, `BackButton`, `KeyboardScreen`, `ErrorBoundary`, `DispatchErrorBridge`, `Skeleton` (`QuestionCardSkeleton`), `Motion` (`FadeRise`, `PulseDot`), `Motif`, `MotifOverlay`, `ShinyWordmark`, `DocScreen`, `MissingParamsFallback`, `DigestManager`, `VerifiedBadge`, `KarmaBadge`, `FoundingMemberBadge` | App.js, RootNavigator, auth screens, settings docs, profile |
| feed | `QuestionCard`, `QuestionCardPhotoThumb`, `QuestionFeedList` (FlatList wrapper, accepts `listRef`, `insertAfterIndex`), `FeedSortToggle`, `CirclesRecommendRow`, `ChecklistFeedCard`, `PinnedQuestionCard`, `ExpertMarker` | Home, CircleDetail, MyPosts, SavedPosts, Search, profiles |
| question | `UpvoteButton`, `PhotoStrip`, `PhotoSourceSheet`, `SinglePhotoPicker`, `ContentPhoto`, `ExpertPostModeToggle`, `ExpertPostQuota`, `ExpertProfessionalFields`, `ExpertProfessionalConfirm` | QuestionDetail, AskComposer, VerifiedApplication, ExpertProfessionalSetup |
| circles | `CircleChip`, `CircleIcon`, `CircleDirectoryRow`, `CircleAboutSection`, `ExpertsHereRow`, `AccentSwatch` | CirclesDirectory, CircleDetail, Create/EditCircle, AskComposer |
| profile | `ProfileView`, `FollowButton` | MyProfile, UserProfile, ExpertProfile, Home suggested experts |

### Utils and data helpers

`utils/format.js` (`timeAgo`, `compactNumber`, `displayAuthor`, `milestoneCrossed`, `startOfLocalDay`), `utils/karma.js`, `utils/color.js` (contrast clamping for circle accents), `utils/photos.js` (URL sanitising, local vs remote), `utils/expertPost.js` (badge rules), `utils/circleDirectory.js` (directory sections: Your circles cap 5, Popular cap 5, All page 10), `utils/navigation.js`, `utils/dispatchGuards.js`, `data/circles.js` (accent palette, `slugify`, `isCircleNameTaken`, `findSimilarCircles`), `data/categories.js`, `data/checklist.js`.

---

## 9. Supabase

### Migrations (`supabase/migrations/`, apply in order; never edit existing files)

| File | Purpose |
|---|---|
| `000_reset_public_schema.sql` | Drops and recreates `public` schema (destructive; dev only) |
| `001_chautari_schema.sql` | Enums, all tables, indexes, `handle_new_user` trigger (auto-insert `profiles` on `auth.users` insert), `set_updated_at` triggers, RLS enable + policies |
| `002_seed_reference_data.sql` | 8 official circles (ids match `data/categories.js`) plus leftover seed user circles; 10 `checklist_items` |
| `003_clear_auth_users.sql` | `DELETE FROM auth.identities / auth.users` (dev reset) |
| `004_rls_content_updates.sql` | UPDATE policies on `questions`/`answers`/`replies` (now `posts`) for any authenticated user (needed for vote-count bumps) |
| `005_flexible_social_refs.sql` | Drop FK `saved_questions.question_id` (now `saved_posts.post_id`); `follows.following_id` → TEXT, drop FK, add no-self-follow check (allows seed ids) |
| `006_storage_media.sql` | `circles.image_url`, `answers.photo_url`, `replies.photo_url`; create public bucket `media` (5 MB, jpeg/png/webp); storage policies: public read, authenticated insert/update/delete under `<prefix>/<auth.uid()>/…` for prefixes avatars, questions (now posts), circles, answers, replies |
| `007_credentials_storage.sql` | Adds `credentials` prefix to the insert policy |
| `008_expert_post_mode.sql` | `questions.posted_as_expert`, `questions.profession_label` (now on `posts`), `replies.posted_as_expert`, `replies.profession_label` |
| `009_expert_profile_fields.sql` | `profiles.expert_badge_title`, `profiles.expert_circle_id` (FK circles, set null) |
| `010_relax_answer_reply_lengths.sql` | Replace `answers_body_check` and `replies_body_check` with `char_length(btrim(body)) > 0` |
| `011_clear_seed_content.sql` | Null `checklist_items.question_id` (now `post_id`) when the thread is missing; delete empty 002 seed user circles |
| `012_verified_recovery_email.sql` | `profiles.email` + `email_verified_at` (service_role write only); unique verified email; `email_codes`; `recovery_sessions`; `profile_is_complete()` |
| `013_auth_lookup_and_email_login.sql` | `auth_checks` (service_role only, IP rate limit); `email_codes.purpose` adds `login`; `profiles_phone_idx` |
| `014_rename_questions_to_posts.sql` | **Terminology rename, no data change.** `questions` → `posts`; `saved_questions` → `saved_posts`; `answers.question_id`, `saved_posts.question_id`, `notifications.question_id`, `checklist_items.question_id` → `post_id`; `circles.pinned_question_id` → `pinned_post_id`; constraints/indexes/policies/trigger renamed `questions_*` → `posts_*`; enum `upvote_target` value `question` → `post`; storage insert policy allows prefix `posts` (replaces `questions`; existing `questions/…` objects stay readable) |

`010`, `013` and `014` are applied on the hosted project. Whether `012` is applied is implied by `013` succeeding (`email_codes` must exist).

### Tables (after 014)

| Table | Key columns | Notes |
|---|---|---|
| `profiles` | `id UUID PK → auth.users`, `phone`, `email`, `email_verified_at`, `name`, `suburb`, `photo_url`, `bio`, `verified`, `verified_category`, `profession`, `contact`, `is_founding_member`, `newcomer`, `newcomer_since`, `digest_mode` (enum daily/weekly/off), `checklist_card_dismissed`, `followers_count`, `expert_badge_title`, `expert_circle_id`, timestamps | Auto-created by trigger. Clients cannot write `email` / `email_verified_at`. Raw `email` is not selectable by anon/authenticated. |
| `email_codes` | `id`, `user_id`, `email`, `purpose` (verify_email/recovery/change_phone/login), `code_hash`, `expires_at`, `attempts`, `consumed_at` | RLS on, no policies — service_role only |
| `auth_checks` | `id`, `ip`, `created_at` | RLS on, no policies — service_role only. 10 / IP / minute for `account-lookup` |
| `recovery_sessions` | `id`, `user_id`, `token_hash`, `expires_at`, `consumed_at`, `new_phone` | RLS on, no policies — service_role only |
| `circles` | `id TEXT PK`, `name`, `handle UNIQUE`, `description`, `icon`, `accent_id`, `creator_id UUID`, `is_official`, `pinned_post_id → posts`, `member_count`, `image_url`, timestamps | |
| `circle_members` | `(circle_id, user_id) PK` | |
| `posts` | `id TEXT PK`, `circle_id → circles (RESTRICT)`, `author_id UUID`, `anonymous`, `title` (10–120 chars), `body` (30–4000 chars), `photos JSONB`, `upvotes`, `views`, `posted_as_expert`, `profession_label`, timestamps | was `questions` before 014; ids still start with `q_` |
| `answers` | `id TEXT PK`, `post_id → posts (CASCADE)`, `author_id`, `anonymous`, `body` (non-empty after 010), `upvotes`, `photo_url`, `created_at` | |
| `replies` | `id TEXT PK`, `answer_id → answers (CASCADE)`, `author_id`, `anonymous`, `body` (non-empty after 010), `upvotes`, `photo_url`, `posted_as_expert`, `profession_label`, `created_at` | |
| `follows` | `(follower_id UUID, following_id TEXT) PK`, no self-follow | App writes UUID `following_id` only |
| `saved_posts` | `(user_id, post_id) PK` | no FK to posts since 005 |
| `upvotes` | `(user_id, target_type enum post/answer/reply, target_id TEXT) PK` | |
| `notifications` | `id`, `user_id`, `type` enum, `text`, `actor_id`, `post_id`, `read` | **Not written by the app** (notifications are local only) |
| `reports` | `id`, `reporter_id`, `kind` enum, `target_title`, `reason`, `detail` | insert-only from app |
| `expert_applications` | `id`, `user_id`, `category`, `custom_category`, `status` enum (default pending), `credentials_url` | one pending per user (partial unique index) |
| `expert_upvote_bonuses` | `user_id PK`, `count` | **Not written by the app** (bonuses are local `expertUpvoteBonuses`) |
| `checklist_items` | `id`, `title`, `explainer`, `post_id`, `sort_order` | reference data |
| `checklist_progress` | `(user_id, item_id) PK`, `done_at` | |

### RLS summary (`001:263-344`, `004`)

- Public SELECT: `profiles`, `circles`, `circle_members`, `posts`, `answers`, `replies`, `follows`, `upvotes`, `checklist_items`, `expert_upvote_bonuses`.
- Own-row SELECT only: `saved_posts`, `notifications`, `expert_applications`, `checklist_progress`.
- INSERT requires `auth.uid()` to equal the owner column (`author_id`, `user_id`, `follower_id`, `reporter_id`, `creator_id`); circles additionally `is_official = FALSE`.
- UPDATE: own `profiles`; `circles` by creator; `posts`/`answers`/`replies` by any authenticated user (004, for vote counters); own `notifications`.
- DELETE: own `posts`, `circle_members`, `follows`, `saved_posts`, `upvotes`, `checklist_progress`. No DELETE policy on `answers`/`replies`/`circles` (so the app cannot delete those).

### Storage

Bucket `media` (public read). Object path must be `<prefix>/<auth.uid()>/<file>` with prefix ∈ {avatars, posts, circles, answers, replies, credentials} (014; objects uploaded before 014 live under `questions/…` and remain readable). Client paths come from `constants/media.js:MEDIA_PATH_PREFIX` and `services/mediaStorage.js`. A legacy `question-photos` bucket with its own `question_photos_*` policies exists on the hosted project but is not used by the app or any migration in this repo.

---

## 10. Business rules (with code locations)

| Rule | Where |
|---|---|
| Verified experts: max **2** professional posts/day; members: max **5** member posts/day (local-day buckets) | `src/data/store.js:23-24`, enforced `300-310`, selectors `1061-1081`; UI alert `screens/questions/AskComposerScreen.js:204-212` |
| Professional (expert-mode) posts are never anonymous and are forced into the expert's declared circle | `store.js:311-314`; mirrored in `persist.js:57-58` |
| Expert must have badge title (2–60 chars) + circle before posting professionally | `utils/expertPost.js:3-4, 32-35`; redirect `AskComposerScreen.js:213-217` |
| Post title 10–120 chars, body 30–4000 chars (client) | `AskComposerScreen.js:27, 70-71`; DB check `001:105-106` |
| Up to 5 post photos, ~5 MB each, resized to ≤ 1920 px JPEG q0.82 | `constants/media.js:6-9` |
| Answers and replies: any non-empty body | `QuestionDetailScreen.js:346, 480`; DB `010` |
| Answer/reply photos enabled by flag | `constants/media.js:2` (`ENABLE_REPLY_PHOTOS = true`) |
| Official circles (8) are permanent membership: always joined, join toggle is a no-op | `store.js:133-140, 654-658`; ids from `data/categories.js:2-11` |
| Circle names must be unique (case/handle based); edit/pin/unpin only by creator and never on official circles | `store.js:632, 677-679, 697-701, 723-726`; `data/circles.js:isCircleNameTaken` |
| Pinned post must belong to the circle | `store.js:701` |
| Cannot follow yourself | `store.js:553-554` |
| Karma = 10 × answer upvotes + 2 × post upvotes + 1 × reply upvotes + 25 × expert-upvote bonuses | `utils/karma.js:3-25` |
| When a verified user upvotes someone else's answer, that author gets +1 expert bonus (reverted on un-upvote) | `store.js:507-512` |
| Milestone notification when an upvoted answer crosses 5/10/20/50/100/200/500 | `utils/format.js:55-67`, `store.js:491-503` |
| Newcomer features (checklist card, profile entry) active for **60 days** after opting in | `constants/newcomer.js:2`, `store.js:1093-1096` |
| Expert application is auto-approved in the prototype | `screens/experts/VerifiedApplicationScreen.js:79`, `store.js:586-600` |
| Hot ranking: gravity 1.5, age offset 2 h, weights base 1 / upvote 1 / answer 2 / expert answer 8; discovery needs score ≥ 2.0; 80/20 blend; page size 10 | `src/feed/rankingConfig.js:3-23` |
| Live refetch on focus at most every 45 s | `hooks/useLiveDataRefresh.js:5` |
| Home tab re-tap scrolls to top and refreshes only when Home is already the selected tab | `screens/home/HomeScreen.js:118-127` |
| OTP: 6 digits, 3 attempts, 60 s resend cooldown; mock mode accepts any 6 digits | `screens/auth/OtpScreen.js` (`LENGTH`, `attempts`, `setSeconds(60)`) |
| Sign-in is phone OTP (login vs register) or a code to a **verified** recovery email. Email is not a password | `PhoneEntryScreen`, `EmailLoginScreen`, `012`/`013` |
| Login must not create an account (`shouldCreateUser: false`); register may | `services/auth.js` `sendPhoneOtp` |
| Mock OTP only if `EXPO_PUBLIC_AUTH_DEV_MODE === 'true'` and `__DEV__`; mock login never sign-ups | `lib/supabase.js` `isAuthDevMode`, `signInDevForPhone` |
| Dev register may create `user+<digits>@chautari.app` with a fixed password | `services/auth.js` `ensureSupabaseUserForPhone` |
| Digest: daily 18:00 or weekly Monday 18:00 local notification; off disables | `services/digest.js:67-69` |
| Splash shows at least 1.5 s | `navigation/RootNavigator.js:66` |
| Every `SYNC_ACTIONS` write goes to Supabase when configured | `services/liveData/persist.js` |
| Delete account wipes all local state and signs out of Supabase; server rows are **not** deleted | `screens/settings/DeleteAccountScreen.js:38-40`, `store.js:296-299` |

---

## 11. Feature status

| Feature | Status | Evidence |
|---|---|---|
| Phone OTP sign-in | Login vs register. Mock only when `EXPO_PUBLIC_AUTH_DEV_MODE=true` in `__DEV__`. Real SMS when that flag is off and Phone provider is configured | `services/auth.js`, `PhoneEntryScreen`, `PhoneRegisterScreen` |
| Email login | Code to a verified recovery email via `email-login` + `verifyOtp` (`token_hash`) | `EmailLoginScreen`, `supabase/functions/email-login` |
| Recovery email | Onboarding step + lost-number recovery + Settings change-phone + email login | `supabase/functions/` |
| Profile sync (name, suburb, avatar, bio, newcomer, digest, checklist dismissed) | Working when configured | `services/profile.js`, `persist.js` |
| Ask / answer / reply with photos | Working; synced when Supabase is configured | §6 |
| Upvotes, saves, follows, joins | Working; optimistic with server toggle | `persist.js` |
| For You feed (Hot/New, 80/20) | Working, client-side over live posts | §7 |
| Following feed | Working (local filter) | `store.js:1032` |
| Circles create/edit/pin | Working | |
| Expert directory, profiles, verified application | Working; **approval is automatic** (prototype) | `VerifiedApplicationScreen.js:79` |
| Professional post mode + daily caps | Working | §10 |
| Notifications screen | Local only (milestones, digest); DB `notifications` table unused by app | `store.js`, `services/digest.js` |
| Digest push | Local scheduled notification only; no server push | `services/digest.js` |
| Arrival checklist | Working; progress synced | |
| Search | Local filter over all loaded posts | `screens/home/SearchScreen.js` |
| Reports | Insert-only to Supabase; no moderation UI | `ReportScreen.js` |
| Offline handling | Mock `online` flag toggled in Settings; real connectivity not detected | `data/network.js` |
| Dark mode | Working, persisted | `theme/ThemeContext.js` |
| Account deletion | Local wipe + sign-out only; server data retained | §10 |
| `views` counter | Column exists; never incremented by app | grep `views` |
| `expert_upvote_bonuses` table | Never written; bonuses local | `store.js:507` |
| Web target | `expo start --web` script exists; functionality **UNVERIFIED** | `package.json` |

---

## 12. Trace guides

**"Why does this post appear in For You?"**
`HomeScreen.js:55` builds `useForYouFeed` with `effectiveJoinedCircleIds()` → `feedComposition.js:buildJoinedPool` (joined circle) or `buildDiscoveryPool` (non-joined, public, score ≥ 2.0). Check `rankingConfig.js:score` with the post's `upvotes`, `answers.length`, `hasExpertAnswer` and age vs `referenceTime`. Order within pool: `feedRanking.js:compareHot/compareNew`; interleave: `mergeSortedPools`.

**"Why didn't my write reach Supabase?"**
1. `lib/supabase.js:isSupabaseConfigured()` false → everything local.
2. `store.js:848`: needs `snap.authUserId` and `shouldSyncAction` (`persist.js:8-15`).
3. Inside `persistAction`, follow skips `'me'` / non-UUID targets.
4. Error → console `[dispatch] <type>` + toast; reducer does not run; check RLS in `001`/`004`.

**"Where is X rendered on the Home screen?"**
Header block (`HomeScreen.js:~140-180`): segment control, Hot/New toggle (`FeedSortToggle`), live pill, `ChecklistFeedCard`. List: `QuestionFeedList` → `QuestionCard`; `CirclesRecommendRow` injected via `insertAfterIndex`. Top bar: Search and Notifications buttons (`187-190`).

**"How does a new user get into the app?"**
`RootNavigator` auth group starts at `PhoneEntry` (Log in). Register → `PhoneRegister` → `Otp` (`createUser: true`) → name → recovery email → suburb → `completeOnboarding`. Returning user: Log in looks up `profiles.phone` then OTP (`shouldCreateUser: false`); complete profile → `RESTORE_SESSION`, else first incomplete onboarding step. Email login: verified email → `email-login` → `verifyOtp`.

**"How do I add a Supabase column?"**
Add a new `supabase/migrations/014_*.sql` (never edit older files), run `node supabase/run-migrations.js 014`, map the column in `services/liveData/mappers.js` and/or `services/profile.js`, write it in `persist.js` for the relevant action.

**"Where are theme colours defined?"**
`theme/palettes.js` (light/dark semantic tokens) consumed via `useTheme()`; circle accents resolved only through `data/circles.js:resolveCircleAccent` with contrast clamping from `utils/color.js`.

**"How do I add a screen?"**
Create it under the matching `src/screens/<feature>/`, import in `navigation/RootNavigator.js` (or `MainTabs.js`/`ExpertsStack.js`), add `<Stack.Screen name=… />`, navigate with `useNavigationGuard(navigation).navigate('Name', params)`. Do not rename existing route names (they are referenced as strings across screens; see counts in `CLEANUP_REPORT.md`).
