-- Chautari — 015: one phone format everywhere: +614XXXXXXXX
-- Run AFTER 014_rename_questions_to_posts.sql
--
-- Problem: handle_new_user() copied auth.users.phone verbatim. Supabase stores
-- phones WITHOUT the leading '+', so real-SMS sign-ups landed in profiles.phone
-- as '614XXXXXXXX' while the app and account-lookup compare against '+614…'.
-- Those accounts were invisible to lookup / login.
--
-- Fix: a normaliser function, a BEFORE trigger on profiles so no un-normalised
-- phone can be saved again, handle_new_user() goes through the normaliser, and
-- existing rows are rewritten. auth.users.phone itself is Supabase-managed and
-- is left alone (its canonical form is digits only).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Normaliser: AU mobiles → +614XXXXXXXX. Anything else is returned unchanged
--    (never nulls out data it does not understand).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.normalize_au_phone(input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  d TEXT;
BEGIN
  IF input IS NULL OR btrim(input) = '' THEN
    RETURN NULL;
  END IF;
  d := regexp_replace(input, '\D', '', 'g');
  IF d ~ '^614\d{8}$'  THEN RETURN '+' || d;                 END IF;  -- 614…, +614…
  IF d ~ '^04\d{8}$'   THEN RETURN '+61' || substr(d, 2);    END IF;  -- 04…
  IF d ~ '^4\d{8}$'    THEN RETURN '+61' || d;               END IF;  -- 4…
  RETURN input;
END;
$$;

COMMENT ON FUNCTION public.normalize_au_phone(TEXT) IS
  'AU mobile in any common form → +614XXXXXXXX. Non-AU input is returned unchanged.';

-- ---------------------------------------------------------------------------
-- 2. profiles.phone is always stored normalised
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.profiles_normalize_phone()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.phone := public.normalize_au_phone(NEW.phone);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_normalize_phone ON public.profiles;
CREATE TRIGGER profiles_normalize_phone
  BEFORE INSERT OR UPDATE OF phone ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_normalize_phone();

-- ---------------------------------------------------------------------------
-- 3. New auth users: take auth.users.phone (real SMS) or the phone the client
--    put in user metadata (dev register), normalised.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, phone)
  VALUES (
    NEW.id,
    public.normalize_au_phone(COALESCE(NEW.phone, NEW.raw_user_meta_data ->> 'phone'))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Fix existing rows (the UPDATE fires the trigger, which does the work)
-- ---------------------------------------------------------------------------
UPDATE public.profiles
SET phone = phone
WHERE phone IS NOT NULL
  AND phone IS DISTINCT FROM public.normalize_au_phone(phone);

COMMIT;

-- Sanity check: every non-null phone should now be +614XXXXXXXX
SELECT
  count(*) FILTER (WHERE phone ~ '^\+614\d{8}$')                        AS normalised,
  count(*) FILTER (WHERE phone IS NOT NULL AND phone !~ '^\+614\d{8}$') AS still_other,
  count(*) FILTER (WHERE phone IS NULL)                                 AS no_phone
FROM public.profiles;
