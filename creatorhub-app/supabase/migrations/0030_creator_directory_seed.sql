-- 0030_creator_directory_seed.sql
-- Seed 20 representative creators across the 5 PDF niches (real estate,
-- fitness, info products, business/entrepreneurship, lifestyle) so the
-- /creators directory + outreach UI are demoable from day one.
--
-- Idempotent: ON CONFLICT DO NOTHING against the unique
-- (lower(handle), primary_platform) index. Re-running this migration is
-- a no-op even if rows have been edited since.
--
-- These are illustrative placeholder creators, not real handles. The
-- CreatorHub team replaces them with curated entries via the admin tool
-- once it ships.

insert into creator_directory
  (handle, display_name, primary_platform, niche, follower_range, platforms, posting_frequency, bio, curated_by)
values
  -- Real estate (4)
  ('@listing.daily',     'Daily Listings',          'instagram', 'Real estate',     '50k_250k',  array['instagram','tiktok']::platform_t[],     'few_per_week', 'Daily walkthroughs of $1M+ homes in coastal markets.',                'seed-2026-05'),
  ('@buyers.agent.tx',   'Buyers Agent TX',         'tiktok',    'Real estate',     '10k_50k',   array['tiktok','instagram']::platform_t[],     'daily',        'First-time buyer education for the Texas market.',                    'seed-2026-05'),
  ('@modern.estates',    'Modern Estates',          'instagram', 'Real estate',     '250k_1m',   array['instagram','youtube']::platform_t[],    'weekly',       'High-design listings + market analysis.',                              'seed-2026-05'),
  ('@neighborhood.guy',  'The Neighborhood Guy',    'youtube',   'Real estate',     '50k_250k',  array['youtube','tiktok']::platform_t[],       'few_per_week', 'Long-form neighborhood guides for relocation buyers.',                'seed-2026-05'),

  -- Fitness (4)
  ('@strengthcoach',     'Strength Coach',          'instagram', 'Fitness',         '250k_1m',   array['instagram','youtube']::platform_t[],    'daily',        'Programming for serious lifters. PhD in exercise science.',           'seed-2026-05'),
  ('@runwithjess',       'Run With Jess',           'tiktok',    'Fitness',         '50k_250k',  array['tiktok','instagram']::platform_t[],     'daily',        'Marathon training + form breakdowns.',                                'seed-2026-05'),
  ('@yoga.with.amir',    'Yoga With Amir',          'youtube',   'Fitness',         '50k_250k',  array['youtube','instagram']::platform_t[],    'few_per_week', 'Slow-flow yoga for desk workers.',                                    'seed-2026-05'),
  ('@homefit.dad',       'Home Fit Dad',            'instagram', 'Fitness',         '10k_50k',   array['instagram','tiktok']::platform_t[],     'daily',        'Equipment-free workouts for parents in 20 minutes.',                  'seed-2026-05'),

  -- Info products / coaching (4)
  ('@build.in.public',   'Build in Public',         'youtube',   'Info products',   '250k_1m',   array['youtube','x','linkedin']::platform_t[], 'few_per_week', 'Solo founder $1M ARR journey, weekly progress drops.',                 'seed-2026-05'),
  ('@coach.olivia',      'Coach Olivia',            'instagram', 'Info products',   '50k_250k',  array['instagram','tiktok']::platform_t[],     'daily',        'Mindset + cohort-based course for first-time coaches.',               'seed-2026-05'),
  ('@dm.engine',         'DM Engine',               'instagram', 'Info products',   '10k_50k',   array['instagram']::platform_t[],              'few_per_week', 'Inbound lead system for solo coaches.',                                'seed-2026-05'),
  ('@course.creator.lab','Course Creator Lab',      'youtube',   'Info products',   '50k_250k',  array['youtube','linkedin']::platform_t[],     'weekly',       'How to launch (and re-launch) cohort courses.',                       'seed-2026-05'),

  -- Business / entrepreneurship (4)
  ('@founder.diary',     'Founder Diary',           'youtube',   'Business',        '250k_1m',   array['youtube','x']::platform_t[],            'weekly',       'Long-form interviews with bootstrapped founders.',                    'seed-2026-05'),
  ('@growth.marketer',   'Growth Marketer',         'linkedin',  'Business',        '50k_250k',  array['linkedin','x']::platform_t[],           'daily',        'B2B SaaS growth playbooks. Posts 1 hot take per day.',                'seed-2026-05'),
  ('@operator.notes',    'Operator Notes',          'x',         'Business',        '10k_50k',   array['x','linkedin']::platform_t[],           'daily',        'COO threads on hiring, ops, and process design.',                     'seed-2026-05'),
  ('@vc.in.public',      'VC In Public',            'youtube',   'Business',        '50k_250k',  array['youtube','x']::platform_t[],            'few_per_week', 'Behind the curtain at a $50M micro-fund.',                            'seed-2026-05'),

  -- Lifestyle (4)
  ('@morning.minimal',   'Morning Minimal',         'instagram', 'Lifestyle',       '250k_1m',   array['instagram','tiktok']::platform_t[],     'daily',        'Aesthetic morning routines, slow-living focus.',                      'seed-2026-05'),
  ('@cabin.cooking',     'Cabin Cooking',           'youtube',   'Lifestyle',       '50k_250k',  array['youtube','instagram']::platform_t[],    'weekly',       'Slow-paced cooking from a remote cabin in Vermont.',                  'seed-2026-05'),
  ('@city.walks',        'City Walks',              'tiktok',    'Lifestyle',       '10k_50k',   array['tiktok','instagram']::platform_t[],     'few_per_week', 'POV walking tours of underrated neighborhoods.',                      'seed-2026-05'),
  ('@thrifted.style',    'Thrifted Style',          'instagram', 'Lifestyle',       '50k_250k',  array['instagram','tiktok','youtube']::platform_t[], 'daily',  'Thrift-only outfit transformations + secondhand finds.',              'seed-2026-05')
on conflict do nothing;

insert into schema_migrations (version) values (30) on conflict do nothing;
