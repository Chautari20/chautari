-- Stable founding-member number. Assigned in the database as the count of
-- founding members when is_founding_member turns on (1, 2, 3, …).
-- Clients may read the column. They cannot choose the number.
-- Safe to re-run. Never edit 000–013.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS founding_member_number INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_founding_member_number_positive'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_founding_member_number_positive
      CHECK (founding_member_number IS NULL OR founding_member_number >= 1);
  END IF;
END $$;

-- Number existing founding members by join order. Skip rows that already have one.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (ORDER BY created_at, id) AS n
  FROM public.profiles
  WHERE is_founding_member = TRUE
    AND founding_member_number IS NULL
),
base AS (
  SELECT COALESCE(MAX(founding_member_number), 0) AS max_n
  FROM public.profiles
)
UPDATE public.profiles AS p
SET founding_member_number = ranked.n + base.max_n
FROM ranked, base
WHERE p.id = ranked.id;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_founding_member_number_idx
  ON public.profiles (founding_member_number)
  WHERE founding_member_number IS NOT NULL;

CREATE OR REPLACE FUNCTION public.assign_founding_member_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_founding_member IS NOT TRUE THEN
    NEW.founding_member_number := NULL;
    RETURN NEW;
  END IF;

  -- Keep the number already issued. Ignore any value sent by the client.
  IF TG_OP = 'UPDATE' AND OLD.founding_member_number IS NOT NULL THEN
    NEW.founding_member_number := OLD.founding_member_number;
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(8142142);
  SELECT COALESCE(MAX(founding_member_number), 0) + 1
    INTO NEW.founding_member_number
  FROM public.profiles;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_assign_founding_member_number ON public.profiles;
CREATE TRIGGER profiles_assign_founding_member_number
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_founding_member_number();

GRANT SELECT (founding_member_number) ON public.profiles TO anon, authenticated;

COMMENT ON COLUMN public.profiles.founding_member_number IS
  'This member''s place in the founding-member count. Assigned by the database; clients cannot set it.';
