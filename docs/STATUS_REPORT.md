# Chautari status report

Read-only snapshot of `chautari-test/` against **PRD v1.2** (`C:\Users\ashis\Downloads\Chautari_PRD_v1.2.docx`; not in this repo). Repo `docs/PRD.md` is the old prototype brief and is **not** v1.2. Also read `docs/APP_MAP.md` and `docs/CLEANUP_REPORT.md`.

Every claim cites a path. Anything not confirmable from this tree is **UNVERIFIED**.

---

## 1. Repo state

- Branch: `master` (tracks `origin/master`, not ahead).
- Working tree: **dirty**. Recovery-email work, migration `012`, edge functions, and related app changes are uncommitted / untracked (not on GitHub).
- HEAD: `ccbbee4` Read migration env from the .env file instead of process.env.

**Uncommitted (modified):** `docs/APP_MAP.md`, `package.json`, `package-lock.json`, `src/components/common/ui.js`, `src/data/store.js`, `src/navigation/RootNavigator.js`, `src/screens/auth/{Otp,PhoneEntry,ProfileName,ProfileSuburb}Screen.js`, `src/screens/settings/SettingsScreen.js`, `src/services/liveData/fetch.js`, `src/services/profile.js`, `supabase/README.md`, `supabase/run-migrations.js`.

**Untracked:** `src/components/auth/`, `src/screens/auth/Email*.js`, `src/screens/auth/Recovery*.js`, `src/screens/settings/ChangePhone*.js`, `src/services/emailRecovery.js`, `src/utils/email.js`, `src/utils/formError.js`, `supabase/functions/`, `supabase/migrations/012_verified_recovery_email.sql`, `tsconfig.json`, `supabase/.temp/` (CLI cache).

**Last 15 commits**

```
ccbbee4 Read migration env from the .env file instead of process.env.
9e9bf22 Document the live-only data model and migration 011.
9f87d4a Add migration 011 to drop leftover seed circles and dangling checklist threads.
c81f851 Remove bundled seed so the app runs on live Supabase data only.
1870fb1 Add docs/APP_MAP.md and docs/CLEANUP_REPORT.md; correct AUTH_DEV_MODE source path in README.
f05a48b Rewrite README: SDK 58, dev build instead of Expo Go, outer-folder start scripts, env vars, folder layout.
d92f032 Move product/spec docs into docs/ and update links.
00543c5 Group profile components into src/components/profile/.
34df50a Group circle components into src/components/circles/.
77962e5 Group question/composer components into src/components/question/.
2284497 Group feed components into src/components/feed/.
b5f2fca Group shared UI primitives into src/components/common/.
152c368 Move modal screens into src/screens/modals/.
3b3f429 Move settings/legal screens into src/screens/settings/.
0620157 Move ArrivalChecklist screen into src/screens/checklist/.
```

Whether migrations `000–011` (and uncommitted `012`) are applied on the hosted project is **UNVERIFIED**. Edge functions are in the tree; deploy status is **UNVERIFIED**.

---

## 2. What changed since APP_MAP.md

Committed APP_MAP is from `1870fb1` / `9e9bf22`. Working copy of APP_MAP already mentions recovery email; the items below are in the tree and were **not** in the committed map as implemented code.

**New screens:** `EmailScreen`, `EmailCodeScreen`, `RecoveryEmailScreen`, `RecoveryEmailCodeScreen`, `RecoveryNewPhoneScreen`, `RecoveryPhoneCodeScreen`, `RecoverySuccessScreen` (`src/screens/auth/`); `ChangePhoneEmailCodeScreen`, `ChangePhoneNewScreen`, `ChangePhoneSmsCodeScreen` (`src/screens/settings/`). Wired in `src/navigation/RootNavigator.js`.

**New services / utils:** `src/services/emailRecovery.js`; `src/utils/email.js` (`isProfileComplete`, `firstIncompleteOnboardingRoute`); `src/utils/formError.js`; `src/components/auth/CodeInput.js`.

**New backend:** `supabase/migrations/012_verified_recovery_email.sql`; `supabase/functions/email-verification/`; `supabase/functions/account-recovery/`; shared helpers under `supabase/functions/_shared/`.

**New env / secrets (functions, not `.env.example`):** `CODE_PEPPER`, `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_TEST_MODE`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID` (`supabase/functions/README.md`). App env vars unchanged: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_AUTH_DEV_MODE` (`src/lib/supabase.js`, `.env.example`).

**Also uncommitted:** `PROFILE_PUBLIC_COLUMNS` + explicit profile selects (`src/services/profile.js`, `src/services/liveData/fetch.js`); onboarding resume (`src/utils/email.js`, `RootNavigator.js`, `OtpScreen.js`); TypeScript as a **devDependency** + empty `tsconfig.json` (app remains `.js`).

**Removed / renamed screens:** none since APP_MAP. Cleanup deletions (`CategoriesScreen`, `CategoryFeedScreen`, `AnswerComposerScreen`) are already documented in `docs/CLEANUP_REPORT.md`.

---

## 3. PRD v1.2 checklist

Statuses: **Built** / **Partial** / **Not started** / **Mocked**.

### Sign-in

| Item | Status | Evidence |
|---|---|---|
| Phone OTP, AU `+61 4…` | **Partial** | Real path: `src/services/auth.js` `signInWithOtp` / `verifyOtp`. Default is mock OTP (`isAuthDevMode` unless env is the string `false`, `src/lib/supabase.js:11-12`). AU format: `PhoneEntryScreen.js` `/^4\d{8}$/`. |
| 6 digits, 3 attempts, 60s resend | **Built** (client) | `src/screens/auth/OtpScreen.js`. Cap of 20 SMS/number/day: **Not started** (no server counter in repo). |
| Test numbers | **Partial** | Email test bypass: `EMAIL_TEST_MODE` + `@example.test` → code `123456` (`supabase/functions/_shared/email.ts`, `codes.ts`). SMS test numbers: **UNVERIFIED** (not in app code; would be Twilio/Supabase dashboard). |
| Dev-mode switch default | **Mocked by default** | Code default mock-on (`!== 'false'`). `.env.example` sets `EXPO_PUBLIC_AUTH_DEV_MODE=true`. Local `.env` is gitignored — live value **UNVERIFIED** here. |
| Friendly errors (no raw provider errors) | **Partial** | Email/recovery: friendly copy from functions (`_shared/http.ts` `MSG`); `__DEV__` extra line (`src/utils/formError.js`). Phone send/verify still `e?.message` (`PhoneEntryScreen.js:41`, `OtpScreen.js`). |

### Email

| Item | Status | Evidence |
|---|---|---|
| Email step at sign-up | **Built** (uncommitted) | `ProfileName` → `Email` → `EmailCode` → `ProfileSuburb` (`RootNavigator.js`, `EmailScreen.js`). Profile complete = name + `email_verified_at` (`src/utils/email.js`). Needs `012` + function deploy to work against a live project (**UNVERIFIED**). |
| Email code screen | **Built** | `src/screens/auth/EmailCodeScreen.js`. |
| Resume at first incomplete step | **Built** (uncommitted) | `firstIncompleteOnboardingRoute` (`src/utils/email.js`); `RootNavigator.js` stack key `onboard`; `OtpScreen.js` `afterRealOtp`. |
| Lost-number recovery | **Built** (uncommitted) | `Recovery*` screens + `account-recovery` function. |
| Change phone in Settings | **Partial** | Flow exists (`ChangePhone*`). Change-phone SMS uses `supabase.auth.updateUser({ phone })` / `verifyOtp({ type: 'phone_change' })` (`ChangePhoneNewScreen.js`, `ChangePhoneSmsCodeScreen.js`), not the recovery Twilio path. |
| Masked email in Settings | **Built** | `recoveryEmailStatus()` → `email-verification` action `status` (`SettingsScreen.js`, `emailRecovery.js`). |

### Circles

| Item | Status | Evidence |
|---|---|---|
| 7 official, IT & Careers removed | **Not started** | Still **8**, including `it_careers` (`src/data/categories.js:2-11`, `src/data/circles.js`, `002_seed_reference_data.sql`). |
| User circles, create/edit, pin one post | **Built** | Create/Edit screens; pin/unpin creator-only (`store.js` `PIN_QUESTION_TO_CIRCLE` / `UPDATE_CIRCLE`; `persist.js`). |

### Posts

| Item | Status | Evidence |
|---|---|---|
| Create | **Built** | `AskComposerScreen.js`, `ASK_QUESTION`. |
| Edit + “edited” label | **Not started** | No `EDIT_QUESTION` / composer-edit route. |
| Delete | **Partial** | Own questions only (`DELETE_QUESTION`, `QuestionDetailScreen.js`). CASCADE in DB (`001` answers FK). |
| Up to 5 photos, 5 MB, ≤1920 px | **Built** | `src/constants/media.js`. EXIF not requested (`useImagePicker.js` `exif: false`). |
| Anonymous | **Partial** | Client flag + `displayAuthor` (`utils/format.js`). DB stores `author_id` on the row (`001`); not hidden from clients with SELECT. |
| Title 10–120, body 10–4000 | **Partial** | App and DB still **body 30–4000** (`AskComposerScreen.js:27`, `001:105-106`). |

### Answers / replies

| Item | Status | Evidence |
|---|---|---|
| Create, anonymous, one photo | **Built** | `QuestionDetailScreen.js`; photos gated by `ENABLE_REPLY_PHOTOS = true` (`constants/media.js`). |
| No min length | **Built** | Client: non-empty (`QuestionDetailScreen.js:32, 480`). DB after `010`: `char_length(btrim(body)) > 0`. |
| Max 4000 / 1000 | **Partial** | After `010`, DB has **no max**. Client has no 4000/1000 cap. |
| Edit | **Not started** | No edit actions. |
| Delete | **Not started** | No `DELETE_ANSWER` / `DELETE_REPLY`; no DELETE RLS on those tables (`001:301-307`). |
| 20 answers / 50 replies per day | **Not started** | Only post caps exist (`store.js` `MEMBER_DAILY_POST_LIMIT = 5`, `EXPERT_DAILY_POST_LIMIT = 2`). |

### Upvotes, milestones, karma

| Item | Status | Evidence |
|---|---|---|
| Toggle upvotes on post/answer/reply | **Built** | `store.js` + `persist.js`. Self-upvote ban: **Not started**. |
| Milestones 5…500 | **Partial** | Local notif on answer upvote only (`store.js` `TOGGLE_UPVOTE_ANSWER`, `utils/format.js` `MILESTONES`). No push. |
| Karma +10 / +2 / +1 | **Partial** | `src/utils/karma.js` — **also +25 `EXPERT_BONUS`**. Computed **in the app**, not the server. Not reversed on delete. Anonymous posts still count if `authorId` matches. |

### Social / moderation features

| Item | Status | Evidence |
|---|---|---|
| Mark resolved | **Not started** | No resolved column, action, or ✓ on cards. |
| Saved posts | **Built** | `TOGGLE_SAVE_QUESTION`, `SavedPostsScreen.js`. |
| Following (one-way; lists private) | **Partial** | Follow works. Counts public. Owner-only lists: following list is on-device for `me`; other members’ lists not shown. |
| Block user + blocked list | **Not started** | No block table, action, or Settings list (only a test-helper string in `helpers_test.ts`). |

### Verified experts

| Item | Status | Evidence |
|---|---|---|
| Application | **Partial** | `VerifiedApplicationScreen.js`: badge title, one circle, optional **one** credential (PRD: up to 3 files, PDF/image 10 MB). |
| Admin review | **Mocked** | Auto-approve `status: 'approved'` (`VerifiedApplicationScreen.js:79`). No admin UI. |
| Professional posts | **Built** (client) | Mode toggle, never anonymous, forced circle, 2/day (`store.js`, `AskComposerScreen.js`). Promo-language filter: **Not started**. Disclaimer on expert answers: **Not started**. Contact-tap totals: **Not started**. |

### Founding Member

| Item | Status | Evidence |
|---|---|---|
| Badge | **Partial** | UI chip (`FoundingMemberBadge.js`). Every local `SIGN_UP` sets `isFoundingMember: true` (`store.js`). No “first 1,000” or exclusion of test accounts. |
| Member number | **Not started** | No number in schema or badge. |

### Checklist, search, feeds, notifications

| Item | Status | Evidence |
|---|---|---|
| First 30 Days | **Partial** | 10 tasks in `src/data/checklist.js`; `questionId` is **null** (links not live). Newcomer window 60 days (`constants/newcomer.js`). Progress synced (`checklist_progress`). Team-editable links without app update: **Not started** (catalog is bundled; `checklist_items.question_id` exists in DB but app reads the JS file). |
| Search + feeds | **Built**, **computed in app** | Search: `SearchScreen.js` over loaded questions. Date chips: 24h / 7d / 30d — **not** PRD “this month / last 3 months / this year”. For You: `src/feed/*` + `useForYouFeed.js`. Following: `store.js` `followingFeed`. |
| In-app notifications | **Partial** | Screen exists; only milestones + digest are written (`digest.js` `ADD_NOTIFICATION`). No write on new answer / expert answer / reply / application decision. DB `notifications` unused by app (`APP_MAP.md` §11). |
| Push | **Mocked / local only** | `expo-notifications` **scheduled local digest** (`services/digest.js`). No `getExpoPushToken`, no push function. |

### Digest, reports, theme, account, admin

| Item | Status | Evidence |
|---|---|---|
| Digest | **Should be out of v1** (PRD §9) | Still **in Settings** and `DigestManager` (`SettingsScreen.js`, `src/services/digest.js`). Not removed or hidden. |
| Reports | **Partial** | `ReportScreen.js` → `reports` insert. No queue, 24h SLA, or auto-remove (PRD: nothing auto-removed). |
| Profanity filter | **Not started** | No filter; Help copy says reports are mocked (`HelpScreen.js`). |
| Dark mode | **Built** | `ThemeContext.js`, persisted `chautari.theme.v1`. `app.json` `userInterfaceStyle: "light"` — OS follow **UNVERIFIED** / likely ignored because the app sets mode itself. |
| Offline reading | **Partial** | Loaded state in AsyncStorage `chautari.state.v3`. Connectivity is a **Settings demo switch** (`src/data/network.js`), not NetInfo. |
| Account deletion | **Mocked / local only** | Re-auth accepts **any 6 digits** (`DeleteAccountScreen.js:33`). `signOut` + `DELETE_ACCOUNT` wipes local state. No `auth.admin.deleteUser`, no content/photo purge. |
| Admin web app | **Not started** | No admin app, 2FA, dashboard, queue, members, audit log. Only SQL `supabase/scripts/grant_expert_ashish2.sql`. |

**Should (share cards):** **Not started** (no Share API usage).

---

## 4. Backend

### Migrations (`supabase/migrations/`)

Never edit `000–011`. Apply status on hosted DB: **UNVERIFIED**.

| File | Purpose | Destructive? |
|---|---|---|
| `000_reset_public_schema.sql` | Drop/recreate `public` | **Yes** |
| `001_chautari_schema.sql` | Enums, tables, triggers, RLS | No (create) |
| `002_seed_reference_data.sql` | 8 official circles + leftover user circles + checklist catalog | No |
| `003_clear_auth_users.sql` | `DELETE` all `auth.users` / identities | **Yes** |
| `004_rls_content_updates.sql` | UPDATE on questions/answers/replies for **any authenticated** user (vote bumps) | No (widens writes) |
| `005_flexible_social_refs.sql` | Loosen FKs for seed ids | No |
| `006_storage_media.sql` | Photo columns + `media` bucket + storage policies | No |
| `007_credentials_storage.sql` | `credentials` storage prefix | No |
| `008_expert_post_mode.sql` | `posted_as_expert`, `profession_label` | No |
| `009_expert_profile_fields.sql` | `expert_badge_title`, `expert_circle_id` | No |
| `010_relax_answer_reply_lengths.sql` | Answers/replies: non-empty only | No |
| `011_clear_seed_content.sql` | Null missing checklist `question_id`; delete empty 002 user circles | Deletes empty seed circles only |
| `012_verified_recovery_email.sql` | `profiles.email` / `email_verified_at`; table-level REVOKE then column GRANT; `email_codes`; `recovery_sessions`; `profile_is_complete()` | No (uncommitted; **not applied** from this repo) |

### Edge functions

No `resend-email` function. Callers of `supabase.functions.invoke`: only `src/services/emailRecovery.js` (`email-verification`, `account-recovery`).

| Function | Purpose | JWT | Secrets read |
|---|---|---|---|
| `email-verification` | `status` / `send` / `verify` for `verify_email` and `change_phone` | **Required** (`Authorization` + `auth.getUser`, `email-verification/index.ts`) | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CODE_PEPPER`, `EMAIL_TEST_MODE`, `RESEND_API_KEY`, `EMAIL_FROM` |
| `account-recovery` | `start` / `verify_email` / `send_phone_code` / `complete`; deploy `--no-verify-jwt` | **Not required** | Same as above plus `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID` |

Shared: `_shared/{http,db,codes,email,phone,twilio}.ts`. Deploy/secrets on the project: **UNVERIFIED**.

### RLS (on for all public tables in `001`; plus `012` tables)

| Table | Policies (one line) |
|---|---|
| `profiles` | SELECT all; INSERT/UPDATE own. `012` then revokes table SELECT/INSERT/UPDATE from `anon`/`authenticated` and GRANTs columns except `email` (and except `email`+`email_verified_at` on write). |
| `circles` | SELECT all; INSERT non-official by creator; UPDATE by creator. No DELETE. |
| `circle_members` | SELECT all; INSERT/DELETE own. |
| `questions` | SELECT all; INSERT/DELETE own; UPDATE **any authenticated** (`004`). |
| `answers` / `replies` | SELECT all; INSERT own; UPDATE **any authenticated** (`004`); **no DELETE**. |
| `follows` | SELECT all; INSERT/DELETE as follower. |
| `saved_questions` | Own SELECT/INSERT/DELETE. |
| `upvotes` | SELECT all; INSERT/DELETE own. |
| `notifications` | Own SELECT/UPDATE; **no INSERT policy** (app does not write this table). |
| `reports` | INSERT own; **no SELECT** for clients. |
| `expert_applications` | Own SELECT/INSERT; **no admin UPDATE**. |
| `expert_upvote_bonuses` | SELECT all; app never writes it. |
| `checklist_items` | SELECT all. |
| `checklist_progress` | Own SELECT/INSERT/DELETE. |
| `email_codes` / `recovery_sessions` | RLS on, **no policies**; GRANT ALL to `service_role` only (`012`). |

Storage `media`: public read; authenticated write under `<prefix>/<auth.uid()>/` (`006`, `007`).

---

## 5. Where the rules are enforced

| Rule | Where |
|---|---|
| Question title 10–120, body 30–4000 (not PRD 10–4000) | **Both** — UI `AskComposerScreen.js`; CHECK `001`. |
| Answer/reply non-empty | **Both** — UI `QuestionDetailScreen.js`; CHECK `010`. |
| Answer/reply max length | **Neither** after `010`. |
| Daily post caps 5 / expert 2 | **App only** — `store.js` reducer + composer alerts. Not in SQL. |
| Daily answer 20 / reply 50 / SMS 20 | **Neither**. |
| Anonymity (hide name/photo/suburb) | **App only** — `displayAuthor`. `author_id` remains on the row; SELECT is public. |
| Expert-only professional posting | **App only** — composer + reducer. DB will store `posted_as_expert` from any author. |
| Expert badge / verified flag | **App only** (auto-approve). Any user can UPDATE own `profiles.verified` via RLS. |
| Vote counters | **Both** — reducer + `persist.js` `bumpVotes`. RLS UPDATE is **any authenticated** (`004`) — not limited to increment-own. |
| Karma | **App only** — `utils/karma.js`. |
| Blocking | **Neither**. |
| Edit own content | **Neither** (no edit UI; `004` lets any auth user UPDATE any Q/A/R row). |
| Delete own question | **Both** — reducer + DELETE policy own questions. |
| Delete own answer/reply | **Neither**. |
| Email / `email_verified_at` writes | **Database** (after `012`) + trigger `protect_profile_email_columns`; clients go through edge functions. |
| Phone change | **App + Auth API** + recovery function (`auth.admin.updateUserById`). |
| Founding member / member number | **App only** (flag); number **neither**. |

---

## 6. Config

| Flag / var | Default | Where |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` / `_ANON_KEY` | empty in `.env.example` | `src/lib/supabase.js` — unset → no client |
| `EXPO_PUBLIC_AUTH_DEV_MODE` | mock OTP unless exactly `'false'` | `src/lib/supabase.js:11-12`; `.env.example=true` |
| `SUPABASE_DB_URL` | commented in `.env.example` | scripts only |
| `SEED_MODE` | **does not exist** | seed file removed (`c81f851`) |
| `ENABLE_REPLY_PHOTOS` | `true` | `src/constants/media.js:2` |
| Function secrets | see §4 | `supabase/functions/README.md` |

**`eas.json`:** one profile, `preview` → Android APK (`buildType: apk`). No production/iOS profiles.

**`app.json`:** name Chautari, slug `chautari`, version `1.0.0`, portrait, `userInterfaceStyle: "light"`, Android package `com.ashishpoudeltete.chautari`, EAS project `c0f583d9-e0f1-42ff-92c1-43c599a87040`, owner `ashishpoudeltete`. Plugins: notifications, image-picker, splash (`#0B7A6B`).

**SDK:** Expo `^58.0.0`, RN `0.88.0`, React `19.3.0` (`package.json`). Uncommitted: `typescript ~6.0.3`, `@types/react`.

---

## 7. Known issues

- **No `TODO`/`FIXME` in `src/`** (grep).
- **`console.warn` / `log`:** storage/auth/fetch/dispatch (`store.js`), `fetch.js`, `useLiveDataRefresh.js`, `DigestManager.js`, `ErrorBoundary.js`; leftover `console.log` in `ImageViewerScreen.js:35-36`.
- **Unused / leftover:** `store.js` selector `forYouFeed` (Home uses `useForYouFeed` — `CLEANUP_REPORT.md`); DB tables `notifications`, `expert_upvote_bonuses` unused by app; `views` never incremented (`QuestionDetailScreen.js` still displays them); official circle `memberCount` is hardcoded `800 + i*220` (`circles.js:49`); Settings footer still says “mock data” (`SettingsScreen.js:145`).
- **Seed:** bundled `src/data/seed.js` gone. `002` leftover user circles only deleted by `011` if empty; remaining live leftover circles **UNVERIFIED**.
- **Empty/error states:** Home, Search, Notifications, My/Saved posts, Expert directory, Circle detail, ProfileView have `EmptyState`. Circles directory, composers, auth, Settings, Change-phone, Recovery, Verified application: no dedicated empty/error layout (PRD §7: every screen). Offline is the demo switch, not real network.
- **Security (v1 launch bar, PRD §10):** members **can** change others’ vote/body columns via `004`; **can** set `profiles.verified` on themselves; anonymity is display-only; limits are client-side.
- **PRD out-of-scope still present:** activity digest UI (`SettingsScreen.js`).

---

## 8. Tests

| What | Covers |
|---|---|
| `supabase/functions/_shared/helpers_test.ts` | Deno: 6-digit code shape, hash/pepper, timing-safe compare, expiry, attempt/send limits, AU phone, `@example.test` bypass, email normalize/mask. |
| App | **None** (no Jest/Detox/`__tests__` under `src/`). |
| Deno run locally | **UNVERIFIED** / previously missing on this machine. |

---

## 10-line summary

The mobile app is a working Expo 58 prototype on live Supabase for Q&A, circles, follows, saves, and upvotes, with client-side For You/Following feeds. Recovery email (sign-up, resume, lost-number, Settings) is implemented in the working tree but uncommitted, undeployed, and `012` is unapplied. Phone OTP has a real Twilio/Supabase path that is **off by default** (mock OTP). Biggest gaps vs PRD v1.2: **(1)** no admin/moderator web app; **(2)** no edit/delete for answers/replies, no post edit, no mark-resolved, no block list; **(3)** experts auto-approve with no credential review; **(4)** no remote push and almost no in-app events except local milestones/digest; **(5)** rules that must be server-side (karma, caps, anonymity, vote updates, verified flag, 7 official circles, body 10–4000, no +25 bonus) are still app-only or wrong. Risky: `004` lets any signed-in user UPDATE any question/answer/reply; account delete is local+signOut; email/phone recovery depends on secrets and deploys that this repo cannot confirm.
