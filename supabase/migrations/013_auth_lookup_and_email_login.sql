-- Account lookup rate-limit table + email-login purpose on email_codes.
-- Safe to re-run. Never edit 000–012.

-- ---------------------------------------------------------------------------
-- 1. auth_checks — IP rate limit for account-lookup (service_role only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.auth_checks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip          TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_checks_ip_created_idx
  ON public.auth_checks (ip, created_at DESC);

ALTER TABLE public.auth_checks ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.auth_checks FROM PUBLIC;
REVOKE ALL ON public.auth_checks FROM anon;
REVOKE ALL ON public.auth_checks FROM authenticated;
GRANT ALL ON public.auth_checks TO service_role;

-- ---------------------------------------------------------------------------
-- 2. email_codes.purpose includes login
-- ---------------------------------------------------------------------------
ALTER TABLE public.email_codes DROP CONSTRAINT IF EXISTS email_codes_purpose_check;
ALTER TABLE public.email_codes
  ADD CONSTRAINT email_codes_purpose_check
  CHECK (purpose IN ('verify_email', 'recovery', 'change_phone', 'login'));

-- ---------------------------------------------------------------------------
-- 3. Faster phone existence checks (phone is not unique)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS profiles_phone_idx ON public.profiles (phone);
