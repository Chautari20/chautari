# Chautari Edge Functions

Sign-in is **phone OTP** (login vs register) or **email code** for an already verified recovery email. Email is not a password.

## Secrets (Dashboard → Edge Functions → Secrets)

Set these on the project. Do not commit them.

| Secret | Used by |
|---|---|
| `CODE_PEPPER` | Hashing email codes and recovery tokens |
| `RESEND_API_KEY` | Sending codes and the phone-change notice |
| `EMAIL_FROM` | From address, e.g. `Chautari <noreply@yourdomain>` |
| `EMAIL_TEST_MODE` | `true` only in dev. Combined with `*@example.test` uses code `123456` and skips send |
| `AUTH_DEV_BYPASS` | `true` only in this prototype. Any 6-digit email code is accepted **and** outbound email is skipped. Ignored unless `SUPABASE_URL` is project `hlrvifbztfizncodlrru` |
| `TWILIO_ACCOUNT_SID` | Account recovery SMS via Twilio Verify |
| `TWILIO_AUTH_TOKEN` | Account recovery SMS |
| `TWILIO_VERIFY_SERVICE_SID` | Account recovery SMS |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | Injected by Supabase on deploy |

JWT: `email-verification` requires a signed-in user. `account-lookup`, `email-login`, and `account-recovery` are public (`--no-verify-jwt`).

## Migrations

Apply in order. Never edit `000`–`012`.

| File | Needed for |
|---|---|
| `012_verified_recovery_email.sql` | `profiles.email` / `email_verified_at`, `email_codes`, `recovery_sessions` |
| `013_auth_lookup_and_email_login.sql` | `auth_checks` rate limit, `email_codes.purpose = 'login'`, `profiles_phone_idx` |

```bash
# from chautari-test/  (or paste the SQL in Dashboard → SQL Editor)
node supabase/run-migrations.js 012
node supabase/run-migrations.js 013
node supabase/run-migrations.js 014   # questions → posts rename
```

## Deploy

```bash
# from chautari-test/
npx supabase functions deploy email-verification
npx supabase functions deploy account-recovery --no-verify-jwt
npx supabase functions deploy account-lookup --no-verify-jwt
npx supabase functions deploy email-login --no-verify-jwt
```

`verify_jwt` flags are also in `supabase/config.toml`.

Set the prototype bypass (optional; only this project ref can honour it):

```bash
npx supabase secrets set AUTH_DEV_BYPASS=true
```

## App env (`.env`, not function secrets)

| Variable | Effect |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Anon key |
| `EXPO_PUBLIC_AUTH_DEV_MODE` | Must be the string `true` **and** a `__DEV__` build to mock SMS/email send. Release ignores it. Login still looks up the account; mock login never creates a user |

## Functions

| Function | JWT | Body | Result |
|---|---|---|---|
| `account-lookup` | off | `{ phone }` or `{ email }` | `{ exists }` only. Email matches **verified** profiles only. 10 lookups / IP / minute via `auth_checks` |
| `email-login` | off | `{ action: 'send' \| 'verify', email, code? }` | send: issues a `login` code. verify: `{ token_hash, type }` for `supabase.auth.verifyOtp` |
| `email-verification` | on | `{ action, purpose, email?, code? }` | Onboarding / change-phone. Verify also copies email onto `auth.users` |
| `account-recovery` | off | `{ action, email, code?, token?, newPhone? }` | Lost-number flow |

Friendly errors only (`_shared/http.ts` `MSG`). Raw provider errors stay in function logs.

Leave **Authentication → Email** / SMTP off so `generateLink` does not send a second magic-link email. Phone auth stays on for real SMS.

## Tests

```bash
deno test supabase/functions/_shared/helpers_test.ts
```

Covers code hashing, expiry, attempts, AU phone checks, `@example.test` bypass, and project-ref parsing for `AUTH_DEV_BYPASS`.
