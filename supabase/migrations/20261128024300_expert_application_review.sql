-- Expert application review metadata.
ALTER TABLE public.expert_applications
  ADD COLUMN IF NOT EXISTS credential_name TEXT,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
