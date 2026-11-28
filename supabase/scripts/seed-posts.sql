-- Chautari test data: rerunnable post seeder
-- Run in Supabase Dashboard → SQL Editor.
-- Uses existing profiles and circles, and is safe to rerun.

WITH
profile_pool AS (
  SELECT coalesce(array_agg(id ORDER BY created_at), ARRAY[]::uuid[]) AS ids
  FROM public.profiles
),
circle_pool AS (
  SELECT coalesce(array_agg(id ORDER BY name), ARRAY[]::text[]) AS ids
  FROM public.circles
),
seed_posts (ordinal, title, body, anonymous, posted_as_expert, profession_label, upvotes, views, age_hours) AS (
  VALUES
    (1, 'Best way to open a bank account as a new resident?', 'I have arrived recently and need to open an everyday account. Which documents and banks would you recommend for a first account?', false, false, null, 18, 86, 2),
    (2, 'Tax refund checklist before filing my return', 'Could anyone explain what documents I should collect before lodging a tax return for the first time in Australia?', false, true, 'Tax accountant', 31, 154, 5),
    (3, 'Has anyone used public transport in Melbourne lately?', 'I am comparing weekly transport options around the CBD. How reliable are trams and trains during peak hours?', true, false, null, 7, 42, 9),
    (4, 'Finding a local GP with a short wait time', 'I need to register with a GP in the western suburbs. Are there clinics that accept new patients without a long waiting period?', false, false, null, 12, 73, 14),
    (5, 'Understanding Australian rental references', 'What references and documents are usually needed when applying for a rental property for the first time?', false, false, null, 24, 121, 20),
    (6, 'CPA or tax agent for a small sole-trader business?', 'I am starting some consulting work and want advice on whether I should register an ABN and engage a tax agent immediately.', false, true, 'Certified accountant', 44, 210, 28),
    (7, 'Where should I start with the 482 visa process?', 'I have received an invitation to discuss a sponsored role. What documents should I prepare before speaking to a registered migration agent?', false, true, 'Migration agent', 38, 188, 36),
    (8, 'Community recommendations for children’s activities', 'Are there affordable arts, sport or language programs suitable for primary-aged children in the local area?', true, false, null, 9, 55, 43),
    (9, 'How much deposit is reasonable for a new rental?', 'I am reviewing a lease and want to confirm that the bond and advance rent amounts are within normal requirements.', false, false, null,16, 98, 52),
    (10, 'Choosing between fixed and variable home loan rates', 'For a first home buyer, what factors should I compare beyond the advertised interest rate?', false, true, 'Mortgage broker', 52, 275, 64),
    (11, 'International licence conversion experience', 'Has anyone recently converted an overseas licence in Victoria? How long did the process take?', false, false, null, 21, 137, 75),
    (12, 'When should I switch from a GP to a specialist?', 'What symptoms or referral rules should I understand before asking a GP for a specialist referral?', true, true, 'Medical doctor', 35, 166, 88),
    (13, 'Good suburb resources for recently arrived families', 'Which local services help with schools, childcare, libraries and community support for new families?', false, false, null, 14, 81, 96),
    (14, 'Reviewing a property settlement quote', 'Is there a plain-English checklist for reviewing a conveyancer or settlement agent quote?', false, true, 'Licensed conveyancer', 27, 143, 108),
    (15, 'Which tax deductions are easy to miss?', 'I work from home and sometimes travel for client meetings. Which expenses should I keep records for?', false, true, 'Tax professional', 47, 229, 120),
    (16, 'Anonymous post for testing moderation', 'This is sample test content for checking anonymous post display, editing and deletion in the admin panel.', true, false, null, 3, 29, 132)
)
INSERT INTO public.posts (
  id, circle_id, author_id, anonymous, title, body, photos, upvotes, views,
  posted_as_expert, profession_label, created_at, updated_at
)
SELECT
  'seed_post_' || lpad(s.ordinal::text, 3, '0'),
  (c.ids[((s.ordinal - 1) % coalesce(array_length(c.ids, 1), 0)) + 1]),
  (p.ids[((s.ordinal - 1) % coalesce(array_length(p.ids, 1), 0)) + 1]),
  s.anonymous,
  s.title,
  s.body,
  '[]'::jsonb,
  s.upvotes,
  s.views,
  s.posted_as_expert,
  s.profession_label,
  now() - (s.age_hours || ' hours')::interval,
  now() - (greatest(s.age_hours - 2, 0) || ' hours')::interval
FROM seed_posts s
CROSS JOIN profile_pool p
CROSS JOIN circle_pool c
WHERE coalesce(array_length(p.ids, 1), 0) > 0
  AND coalesce(array_length(c.ids, 1), 0) > 0
ON CONFLICT (id) DO UPDATE SET
  circle_id = excluded.circle_id,
  author_id = excluded.author_id,
  anonymous = excluded.anonymous,
  title = excluded.title,
  body = excluded.body,
  photos = excluded.photos,
  upvotes = excluded.upvotes,
  views = excluded.views,
  posted_as_expert = excluded.posted_as_expert,
  profession_label = excluded.profession_label,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at;

SELECT count(*) AS seeded_posts
FROM public.posts
WHERE id LIKE 'seed_post_%';
