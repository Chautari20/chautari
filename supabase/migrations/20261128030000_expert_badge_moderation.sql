-- Moderation state and audit reason for expert badges.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS expert_badge_status TEXT NOT NULL DEFAULT 'active'
    CHECK (expert_badge_status IN ('active', 'suspended', 'revoked')),
  ADD COLUMN IF NOT EXISTS expert_badge_reason TEXT,
  ADD COLUMN IF NOT EXISTS expert_badge_updated_at TIMESTAMPTZ;

-- Existing verified profiles are active badges.
UPDATE public.profiles
SET expert_badge_status = 'active'
WHERE verified = TRUE
  AND expert_badge_status IS DISTINCT FROM 'active';
