-- Chautari — reference / catalog data (no auth users, no Q&A threads)
-- Run AFTER 001_chautari_schema.sql

-- ---------------------------------------------------------------------------
-- Official circles (matches src/data/circles.js)
-- ---------------------------------------------------------------------------
INSERT INTO public.circles (id, name, handle, description, icon, accent_id, is_official, member_count, created_at) VALUES
  ('migration',   'Visa & Migration',      'visa-migration',      'Visas, PR pathways, bridging visas and migration agents.',              '🛂', 'crimson', TRUE, 800,  now() - interval '400 days'),
  ('tax_super',   'Tax & Super',           'tax-super',           'Tax returns, ABN, super and small-business questions.',                   '💰', 'saffron', TRUE, 1020, now() - interval '400 days'),
  ('health',      'Health & Medical',      'health-medical',      'GPs, Medicare, mental health and navigating care in Australia.',        '🩺', 'teal',    TRUE, 1240, now() - interval '400 days'),
  ('real_estate', 'Real Estate',           'real-estate',         'Renting, buying, auctions and tenant rights in Victoria.',              '🏠', 'ocean',   TRUE, 1460, now() - interval '400 days'),
  ('loans',       'Loans & Mortgages',     'loans-mortgages',     'Home loans, refinancing and first-home buyer schemes.',                 '🏦', 'forest',  TRUE, 1680, now() - interval '400 days'),
  
  ('general',     'Life in Australia',     'life-australia',      'Settling in, culture, community and everyday life.',                    '🌏', 'clay',    TRUE, 2120, now() - interval '400 days'),
  ('others',      'Others',                'others',              'Everything else — ask away.',                                           '📌', 'slate',   TRUE, 2340, now() - interval '400 days')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  handle = EXCLUDED.handle,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  accent_id = EXCLUDED.accent_id,
  is_official = EXCLUDED.is_official;

INSERT INTO public.circles (id, name, handle, description, icon, accent_id, creator_id, is_official, member_count, created_at) VALUES
  ('c_footscray', 'Footscray Nepali Community',    'footscray-nepali',    'Local meetups, temple events in the west.',     '🍲', 'saffron', NULL, FALSE, 340, now() - interval '90 days'),
  ('c_fhb',       'First Home Buyers AU',          'first-home-buyers-au','Deposits, FHOG, stamp duty and the emotional rollercoaster of buying.','🏠', 'teal',    NULL, FALSE, 120, now() - interval '60 days'),
  ('c_monash',    'Monash Uni Nepalese Students',  'monash-nepalese',     'Units, placements, casual work and surviving exam season together.',    '🎓', 'plum',    NULL, FALSE, 85,  now() - interval '45 days'),
  ('c_cricket',   'Cricket Melbourne',             'cricket-melbourne',   'Weekend games, gear swaps and finding a side that needs one more.',   '🏏', 'forest',  NULL, FALSE, 60,  now() - interval '30 days'),
  ('c_tiny',      'Gundruk Recipe Club',           'gundruk-recipe-club', 'A tiny circle for fermenting, drying and cooking gundruk properly.',    '🌿', 'olive',   NULL, FALSE, 4,   now() - interval '3 days')
ON CONFLICT (id) DO NOTHING;

SELECT 'Reference data seeded (circles + checklist catalog)' AS status;
