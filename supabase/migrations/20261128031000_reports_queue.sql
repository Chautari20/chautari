-- Add target and moderation metadata to the report queue.
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS target_type TEXT,
  ADD COLUMN IF NOT EXISTS target_id TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'resolved', 'dismissed')),
  ADD COLUMN IF NOT EXISTS resolution_note TEXT,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS reports_status_created_idx
  ON public.reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS reports_kind_created_idx
  ON public.reports(kind, created_at DESC);
