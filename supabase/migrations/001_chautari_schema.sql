-- Chautari v2 — PostgreSQL schema (matches current React Native prototype model)
-- Requires: Supabase project with auth.users enabled.
-- Run AFTER 000_reset_public_schema.sql

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE public.expert_application_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.report_kind AS ENUM ('content', 'expert');
CREATE TYPE public.notification_type AS ENUM (
  'answer', 'milestone', 'follow', 'expert', 'expert_answer', 'expert_karma', 'digest'
);
CREATE TYPE public.upvote_target AS ENUM ('question', 'answer', 'reply');
CREATE TYPE public.digest_mode AS ENUM ('daily', 'weekly', 'off');

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone           TEXT,
  name            TEXT NOT NULL DEFAULT '',
  suburb          TEXT,
  photo_url       TEXT,
  bio             TEXT NOT NULL DEFAULT '',
  verified        BOOLEAN NOT NULL DEFAULT FALSE,
  verified_category TEXT,
  profession      TEXT,
  contact         TEXT,
  is_founding_member BOOLEAN NOT NULL DEFAULT FALSE,
  digest_mode     public.digest_mode NOT NULL DEFAULT 'daily',
  checklist_card_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
  followers_count INTEGER NOT NULL DEFAULT 0 CHECK (followers_count >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX profiles_verified_idx ON public.profiles (verified) WHERE verified = TRUE;
CREATE INDEX profiles_suburb_idx ON public.profiles (suburb);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, phone)
  VALUES (NEW.id, NEW.phone)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Circles
-- ---------------------------------------------------------------------------
CREATE TABLE public.circles (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  handle              TEXT NOT NULL UNIQUE,
  description         TEXT NOT NULL DEFAULT '',
  icon                TEXT NOT NULL DEFAULT '📌',
  accent_id           TEXT NOT NULL DEFAULT 'crimson',
  creator_id          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_official         BOOLEAN NOT NULL DEFAULT FALSE,
  pinned_question_id  TEXT,
  member_count        INTEGER NOT NULL DEFAULT 0 CHECK (member_count >= 0),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX circles_official_idx ON public.circles (is_official);
CREATE INDEX circles_creator_idx ON public.circles (creator_id);

CREATE TABLE public.circle_members (
  circle_id   TEXT NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (circle_id, user_id)
);

CREATE INDEX circle_members_user_idx ON public.circle_members (user_id);

-- ---------------------------------------------------------------------------
-- Questions, answers, replies
-- ---------------------------------------------------------------------------
CREATE TABLE public.questions (
  id          TEXT PRIMARY KEY,
  circle_id   TEXT NOT NULL REFERENCES public.circles(id) ON DELETE RESTRICT,
  author_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  anonymous   BOOLEAN NOT NULL DEFAULT FALSE,
  title       TEXT NOT NULL CHECK (char_length(title) BETWEEN 10 AND 120),
  body        TEXT NOT NULL CHECK (char_length(body) BETWEEN 30 AND 4000),
  photos      JSONB NOT NULL DEFAULT '[]'::jsonb,
  upvotes     INTEGER NOT NULL DEFAULT 0 CHECK (upvotes >= 0),
  views       INTEGER NOT NULL DEFAULT 0 CHECK (views >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX questions_circle_created_idx ON public.questions (circle_id, created_at DESC);
CREATE INDEX questions_author_idx ON public.questions (author_id);

CREATE TABLE public.answers (
  id          TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  anonymous   BOOLEAN NOT NULL DEFAULT FALSE,
  body        TEXT NOT NULL CHECK (char_length(body) BETWEEN 20 AND 4000),
  upvotes     INTEGER NOT NULL DEFAULT 0 CHECK (upvotes >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX answers_question_created_idx ON public.answers (question_id, created_at);

CREATE TABLE public.replies (
  id          TEXT PRIMARY KEY,
  answer_id   TEXT NOT NULL REFERENCES public.answers(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  anonymous   BOOLEAN NOT NULL DEFAULT FALSE,
  body        TEXT NOT NULL CHECK (char_length(body) BETWEEN 5 AND 1000),
  upvotes     INTEGER NOT NULL DEFAULT 0 CHECK (upvotes >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX replies_answer_created_idx ON public.replies (answer_id, created_at);

-- FK for pinned question (added after questions exist)
ALTER TABLE public.circles
  ADD CONSTRAINT circles_pinned_question_fk
  FOREIGN KEY (pinned_question_id) REFERENCES public.questions(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Social: follows, saves, upvotes
-- ---------------------------------------------------------------------------
CREATE TABLE public.follows (
  follower_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

CREATE TABLE public.saved_questions (
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id  TEXT NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, question_id)
);

CREATE TABLE public.upvotes (
  user_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type  public.upvote_target NOT NULL,
  target_id    TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, target_type, target_id)
);

-- ---------------------------------------------------------------------------
-- Notifications, reports, expert applications
-- ---------------------------------------------------------------------------
CREATE TABLE public.notifications (
  id          TEXT PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        public.notification_type NOT NULL,
  text        TEXT NOT NULL,
  actor_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  question_id TEXT REFERENCES public.questions(id) ON DELETE SET NULL,
  read        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_created_idx ON public.notifications (user_id, created_at DESC);

CREATE TABLE public.reports (
  id            TEXT PRIMARY KEY,
  reporter_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind          public.report_kind NOT NULL,
  target_title  TEXT,
  reason        TEXT NOT NULL,
  detail        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.expert_applications (
  id              TEXT PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category        TEXT,
  custom_category TEXT,
  status          public.expert_application_status NOT NULL DEFAULT 'pending',
  credentials_url TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX expert_applications_user_pending_idx
  ON public.expert_applications (user_id)
  WHERE status = 'pending';

-- Expert-upvote karma bonuses (prototype: expertUpvoteBonuses map)
CREATE TABLE public.expert_upvote_bonuses (
  user_id   UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  count     INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0)
);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER circles_updated_at
  BEFORE UPDATE ON public.circles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER questions_updated_at
  BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expert_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expert_upvote_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_progress ENABLE ROW LEVEL SECURITY;

-- Profiles: world-readable, self-editable
CREATE POLICY profiles_select ON public.profiles FOR SELECT USING (true);
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Circles: world-readable; authenticated users can create non-official
CREATE POLICY circles_select ON public.circles FOR SELECT USING (true);
CREATE POLICY circles_insert ON public.circles FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND is_official = FALSE AND creator_id = auth.uid());
CREATE POLICY circles_update_creator ON public.circles FOR UPDATE
  USING (creator_id = auth.uid() AND is_official = FALSE);

-- Circle members
CREATE POLICY circle_members_select ON public.circle_members FOR SELECT USING (true);
CREATE POLICY circle_members_insert ON public.circle_members FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY circle_members_delete ON public.circle_members FOR DELETE USING (user_id = auth.uid());

-- Questions
CREATE POLICY questions_select ON public.questions FOR SELECT USING (true);
CREATE POLICY questions_insert ON public.questions FOR INSERT WITH CHECK (author_id = auth.uid());
CREATE POLICY questions_delete_own ON public.questions FOR DELETE USING (author_id = auth.uid());

-- Answers
CREATE POLICY answers_select ON public.answers FOR SELECT USING (true);
CREATE POLICY answers_insert ON public.answers FOR INSERT WITH CHECK (author_id = auth.uid());

-- Replies
CREATE POLICY replies_select ON public.replies FOR SELECT USING (true);
CREATE POLICY replies_insert ON public.replies FOR INSERT WITH CHECK (author_id = auth.uid());

-- Follows
CREATE POLICY follows_select ON public.follows FOR SELECT USING (true);
CREATE POLICY follows_insert ON public.follows FOR INSERT WITH CHECK (follower_id = auth.uid());
CREATE POLICY follows_delete ON public.follows FOR DELETE USING (follower_id = auth.uid());

-- Saved questions
CREATE POLICY saved_select ON public.saved_questions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY saved_insert ON public.saved_questions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY saved_delete ON public.saved_questions FOR DELETE USING (user_id = auth.uid());

-- Upvotes
CREATE POLICY upvotes_select ON public.upvotes FOR SELECT USING (true);
CREATE POLICY upvotes_insert ON public.upvotes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY upvotes_delete ON public.upvotes FOR DELETE USING (user_id = auth.uid());

-- Notifications
CREATE POLICY notifications_select ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY notifications_update ON public.notifications FOR UPDATE USING (user_id = auth.uid());

-- Reports
CREATE POLICY reports_insert ON public.reports FOR INSERT WITH CHECK (reporter_id = auth.uid());

-- Expert applications
CREATE POLICY expert_apps_select_own ON public.expert_applications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY expert_apps_insert ON public.expert_applications FOR INSERT WITH CHECK (user_id = auth.uid());

-- Checklist items: public read
CREATE POLICY checklist_items_select ON public.checklist_items FOR SELECT USING (true);

-- Checklist progress: own rows only
CREATE POLICY checklist_progress_select ON public.checklist_progress FOR SELECT USING (user_id = auth.uid());
CREATE POLICY checklist_progress_insert ON public.checklist_progress FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY checklist_progress_delete ON public.checklist_progress FOR DELETE USING (user_id = auth.uid());

-- Expert bonuses: readable for karma display
CREATE POLICY expert_bonuses_select ON public.expert_upvote_bonuses FOR SELECT USING (true);

SELECT 'Chautari schema created' AS status;
