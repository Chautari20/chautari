# Chautari — Supabase setup

Reuse your **existing Supabase project** (same project URL, anon key, JWT secret). These scripts wipe the old experiment and install the schema that matches the current React Native prototype.

## What stays the same

- Project URL (`https://xxxx.supabase.co`)
- `anon` public key (safe in the mobile app)
- `service_role` key (server-only — never commit or ship in the client)
- Phone auth / Twilio config in Dashboard (if already set up)

## What gets destroyed

- All tables in the `public` schema from the old model
- All rows (questions, users, etc.)
- All **Authentication users** (if you run `003_clear_auth_users.sql`)

## Run order (Supabase Dashboard → SQL Editor)

Run each file **in order**, one at a time. Check the result panel shows success before continuing.

| Step | File | Purpose |
|------|------|---------|
| 1 | `migrations/000_reset_public_schema.sql` | Drop all old public tables/views/types |
| 2 | `migrations/003_clear_auth_users.sql` | **Optional** — delete all login users |
| 3 | `migrations/001_chautari_schema.sql` | Create new tables + RLS |
| 4 | `migrations/002_seed_reference_data.sql` | Official circles + checklist catalog |
| 5 | `migrations/004_rls_content_updates.sql` | Content RLS updates |
| 6 | `migrations/005_flexible_social_refs.sql` | Flexible social refs |
| 7 | `migrations/006_storage_media.sql` | **Photo storage** — `media` bucket + policies + `image_url` / `photo_url` columns |
| 8 | `migrations/007_credentials_storage.sql` | Credentials prefix on storage insert policy |
| 9 | `migrations/008_expert_post_mode.sql` | Expert post / reply columns |
| 10 | `migrations/009_expert_profile_fields.sql` | Expert badge + circle on profiles |
| 11 | `migrations/010_relax_answer_reply_lengths.sql` | Answers and replies: any non-empty body |
| 12 | `migrations/011_clear_seed_content.sql` | Null dangling checklist `question_id`; delete empty 002 seed user circles |
| 13 | `migrations/012_verified_recovery_email.sql` | Recovery email columns, `email_codes`, `recovery_sessions` |
| 14 | `migrations/013_auth_lookup_and_email_login.sql` | `auth_checks`, email-login purpose, `profiles_phone_idx` |

### Storage — `media` bucket (migration 006)

Run `006_storage_media.sql` after the schema migrations. It creates a **public** bucket named `media` (5 MB limit, JPEG/PNG/WebP) with path prefixes:

| Prefix | Example path | Use |
|--------|----------------|-----|
| `avatars/{userId}/…` | `avatars/uuid/profile/avatar-123.jpg` | Profile photo |
| `questions/{userId}/{questionId}/…` | `questions/uuid/q_abc/0.jpg` | Question photos (up to 5) |
| `circles/{userId}/{circleId}/…` | `circles/uuid/c_xyz/banner.jpg` | Circle banner |
| `answers/{userId}/{answerId}/…` | `answers/uuid/a_123/photo.jpg` | Answer photo (prototype flag) |
| `replies/{userId}/{replyId}/…` | `replies/uuid/r_456/photo.jpg` | Reply photo (prototype flag) |

**Policies (on `storage.objects`):**

- **SELECT** — public read on all `media` objects (cross-account viewing).
- **INSERT / UPDATE** — authenticated users only; path segment `[2]` must equal `auth.uid()` (users upload into their own folder).
- **DELETE** — authenticated users only; same ownership rule.

Client uses the **anon key** only. Never ship `service_role` in the app.

### Edge Functions / webhooks

See [`functions/README.md`](./functions/README.md). Deploy `email-verification` (JWT on) plus `account-recovery`, `account-lookup`, and `email-login` (`--no-verify-jwt`). Dashboard → **Edge Functions** — the leftover `resend-email` function is unused by this app.

---

## Environment variables (when you wire the app)

Copy `.env.example` to `.env` in the project root (`.env` is gitignored):

```bash
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key...
```

**Never** put `service_role` in the Expo app.

---

## Schema overview

```
auth.users
    └── profiles (1:1)
circles ← circle_members → profiles
questions → answers → replies
follows · saved_questions · upvotes
notifications · reports · expert_applications
checklist_items · checklist_progress
```

Karma is **computed** from upvotes (same as the prototype) — not stored.

---

## After reset

1. The app uses **live Supabase data** after onboarding (official circles + checklist catalog ship in the client).
2. Dashboard → Authentication → **Phone** on for real SMS. Leave **Email** / SMTP **off** so email-login `generateLink` does not send a second magic-link email. Mock phone accounts still use a synthetic email+password under the hood.
3. Dev mock OTP: `EXPO_PUBLIC_AUTH_DEV_MODE=true` in a `__DEV__` build (skips sending). Login still looks up the account and will not create one. Function secret `AUTH_DEV_BYPASS=true` accepts any 6-digit **email** code on this project only.
4. Set `EXPO_PUBLIC_AUTH_DEV_MODE=false` in `.env` when Twilio SMS is ready for real phone OTP.
5. Test: Register → OTP → onboarding → Table Editor → `profiles`. Log in with that number. Log in with the verified recovery email.

---

## CLI alternative (optional)

If you install [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

For a one-shot reset on a dev project, the SQL Editor approach above is simpler.
