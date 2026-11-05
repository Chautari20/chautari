-- Verified recovery email. Sign-in stays phone OTP only.
-- email / email_verified_at are written only by service_role (edge functions).
-- Safe to re-run. Never edit 000–011.

-- ---------------------------------------------------------------------------
-- 1. profiles: recovery email (service_role write only)
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_verified_email_lower_idx
  ON public.profiles (lower(email))
  WHERE email_verified_at IS NOT NULL;

-- Table-level grants beat column REVOKE. Strip them, then grant every column
-- except email (SELECT) / email + email_verified_at (INSERT, UPDATE).
REVOKE SELECT, INSERT, UPDATE ON public.profiles FROM anon, authenticated;

GRANT SELECT (
  id, phone, name, suburb, photo_url, bio, verified, verified_category,
  profession, contact, is_founding_member, newcomer, newcomer_since,
  digest_mode, checklist_card_dismissed, followers_count, created_at,
  updated_at, expert_badge_title, expert_circle_id, email_verified_at
) ON public.profiles TO anon, authenticated;

GRANT INSERT (
  id, phone, name, suburb, photo_url, bio, verified, verified_category,
  profession, contact, is_founding_member, newcomer, newcomer_since,
  digest_mode, checklist_card_dismissed, followers_count, created_at,
  updated_at, expert_badge_title, expert_circle_id
) ON public.profiles TO authenticated;

GRANT UPDATE (
  id, phone, name, suburb, photo_url, bio, verified, verified_category,
  profession, contact, is_founding_member, newcomer, newcomer_since,
  digest_mode, checklist_card_dismissed, followers_count, created_at,
  updated_at, expert_badge_title, expert_circle_id
) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.protect_profile_email_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  jwt_role text;
BEGIN
  BEGIN
    jwt_role := coalesce(auth.jwt() ->> 'role', '');
  EXCEPTION WHEN OTHERS THEN
    jwt_role := '';
  END;

  IF jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- SQL editor / migrations have no JWT and are not the client roles.
  IF jwt_role = '' AND current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.email := NULL;
    NEW.email_verified_at := NULL;
  ELSE
    NEW.email := OLD.email;
    NEW.email_verified_at := OLD.email_verified_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_email ON public.profiles;
CREATE TRIGGER profiles_protect_email
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_email_columns();

-- Profile is complete only with a display name AND a verified recovery email.
CREATE OR REPLACE FUNCTION public.profile_is_complete(p public.profiles)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT coalesce(btrim(p.name), '') <> ''
     AND p.email_verified_at IS NOT NULL;
$$;

COMMENT ON FUNCTION public.profile_is_complete(public.profiles) IS
  'True when the user has a name and a verified recovery email. Sign-in stays phone OTP.';

-- ---------------------------------------------------------------------------
-- 2. email_codes — service_role only (RLS on, no policies)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_codes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  purpose      TEXT NOT NULL CHECK (purpose IN ('verify_email', 'recovery', 'change_phone')),
  code_hash    TEXT NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  attempts     INTEGER NOT NULL DEFAULT 0,
  consumed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_codes_lookup_idx
  ON public.email_codes (lower(email), purpose, created_at DESC);

CREATE INDEX IF NOT EXISTS email_codes_user_id_idx
  ON public.email_codes (user_id);

ALTER TABLE public.email_codes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.email_codes FROM PUBLIC;
REVOKE ALL ON public.email_codes FROM anon;
REVOKE ALL ON public.email_codes FROM authenticated;
GRANT ALL ON public.email_codes TO service_role;

-- ---------------------------------------------------------------------------
-- 3. recovery_sessions — service_role only (RLS on, no policies)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recovery_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL,
  consumed_at  TIMESTAMPTZ,
  new_phone    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS recovery_sessions_token_hash_idx
  ON public.recovery_sessions (token_hash);

CREATE INDEX IF NOT EXISTS recovery_sessions_user_id_idx
  ON public.recovery_sessions (user_id);

ALTER TABLE public.recovery_sessions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.recovery_sessions FROM PUBLIC;
REVOKE ALL ON public.recovery_sessions FROM anon;
REVOKE ALL ON public.recovery_sessions FROM authenticated;
GRANT ALL ON public.recovery_sessions TO service_role;
