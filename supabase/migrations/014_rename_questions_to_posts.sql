-- Chautari — 014: rename question* → post* to match product terminology
-- Run AFTER 013_auth_lookup_and_email_login.sql
--
-- Product model:  Post → Answers → Replies (to an answer)
--
-- Pure metadata renames: tables, columns, constraints, indexes, RLS policies,
-- trigger and the upvote enum label. No rows are rewritten and no data is lost.
--
-- Storage: new post photos upload under media/posts/{userId}/{postId}/…
-- Existing objects under media/questions/… stay where they are and remain
-- publicly readable (public bucket; UPDATE/DELETE policies do not check prefix).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.questions       RENAME TO posts;
ALTER TABLE public.saved_questions RENAME TO saved_posts;

-- ---------------------------------------------------------------------------
-- 2. Columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.answers         RENAME COLUMN question_id        TO post_id;
ALTER TABLE public.saved_posts     RENAME COLUMN question_id        TO post_id;
ALTER TABLE public.notifications   RENAME COLUMN question_id        TO post_id;
ALTER TABLE public.checklist_items RENAME COLUMN question_id        TO post_id;
ALTER TABLE public.circles         RENAME COLUMN pinned_question_id TO pinned_post_id;

-- ---------------------------------------------------------------------------
-- 3. Constraints (PK / FK / CHECK). Renaming a PK also renames its index.
--    questions_pkey → posts_pkey, answers_question_id_fkey → answers_post_id_fkey,
--    circles_pinned_question_fk → circles_pinned_post_fk, saved_questions_* → saved_posts_*, …
-- ---------------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.conname, c.conrelid::regclass AS tbl
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE n.nspname = 'public' AND c.conname LIKE '%question%'
  LOOP
    EXECUTE format('ALTER TABLE %s RENAME CONSTRAINT %I TO %I',
      r.tbl, r.conname, replace(r.conname, 'question', 'post'));
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Remaining (non-constraint) indexes
--    questions_circle_created_idx → posts_circle_created_idx, questions_author_idx → posts_author_idx,
--    answers_question_created_idx → answers_post_created_idx
-- ---------------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT indexname FROM pg_indexes
    WHERE schemaname = 'public' AND indexname LIKE '%question%'
  LOOP
    EXECUTE format('ALTER INDEX public.%I RENAME TO %I',
      r.indexname, replace(r.indexname, 'question', 'post'));
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 5. RLS policies (questions_select/insert/delete_own/update_votes → posts_*)
-- ---------------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public' AND policyname LIKE '%question%'
  LOOP
    EXECUTE format('ALTER POLICY %I ON public.%I RENAME TO %I',
      r.policyname, r.tablename, replace(r.policyname, 'question', 'post'));
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 6. updated_at trigger
-- ---------------------------------------------------------------------------
ALTER TRIGGER questions_updated_at ON public.posts RENAME TO posts_updated_at;

-- ---------------------------------------------------------------------------
-- 7. Upvote target enum: 'question' → 'post'
-- ---------------------------------------------------------------------------
ALTER TYPE public.upvote_target RENAME VALUE 'question' TO 'post';

-- ---------------------------------------------------------------------------
-- 8. Storage: allow uploads under media/posts/… (replaces 'questions' prefix)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "media_auth_insert" ON storage.objects;
CREATE POLICY "media_auth_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'media'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND (storage.foldername(name))[1] IN (
      'avatars', 'posts', 'circles', 'answers', 'replies', 'credentials'
    )
  );

COMMIT;

-- Sanity check
SELECT
  (SELECT count(*) FROM public.posts)       AS posts,
  (SELECT count(*) FROM public.answers)     AS answers,
  (SELECT count(*) FROM public.replies)     AS replies,
  (SELECT count(*) FROM public.saved_posts) AS saved_posts,
  (SELECT count(*) FROM public.upvotes WHERE target_type = 'post') AS post_upvotes,
  (SELECT count(*) FROM information_schema.columns
     WHERE table_schema = 'public' AND column_name ILIKE '%question%') AS leftover_question_columns;
