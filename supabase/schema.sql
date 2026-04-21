-- ═══════════════════════════════════════════════
-- OMNISCIENT DASHBOARD — SUPABASE SCHEMA
-- Run this entire file in your Supabase SQL Editor
-- ═══════════════════════════════════════════════

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── PROFILES ───────────────────────────────────
-- Extends Supabase auth.users with role + client link
create table public.profiles (
  id           uuid references auth.users(id) on delete cascade primary key,
  role         text not null default 'client' check (role in ('admin', 'client')),
  client_id    uuid,  -- null for admins
  full_name    text,
  email        text,
  created_at   timestamptz default now()
);

-- ─── CLIENTS ────────────────────────────────────
create table public.clients (
  id               uuid default uuid_generate_v4() primary key,
  name             text not null,
  short_name       text,
  industry         text,
  website_url      text,
  locations        jsonb default '[]',  -- [{name, city, address}]
  contact_name     text,
  contact_email    text,
  tier             text default 'growth' check (tier in ('core','growth','pro','enterprise')),
  status           text default 'active' check (status in ('active','onboarding','paused','churned')),
  onboarded_at     timestamptz default now(),
  brand_primary    text default '#2EC4B6',
  brand_secondary  text default '#3A86FF',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ─── SCANS ──────────────────────────────────────
-- Each weekly recon scan result
create table public.scans (
  id                    uuid default uuid_generate_v4() primary key,
  client_id             uuid references public.clients(id) on delete cascade not null,
  scanned_at            timestamptz default now(),
  scan_type             text default 'weekly' check (scan_type in ('onboarding','weekly','manual')),

  -- Overall
  overall_score         int check (overall_score between 0 and 100),
  overall_grade         text,
  overall_verdict       text,

  -- Category scores (0-100)
  website_score         int check (website_score between 0 and 100),
  website_grade         text,
  website_findings      jsonb default '[]',
  website_opportunity   text,

  social_score          int check (social_score between 0 and 100),
  social_grade          text,
  social_findings       jsonb default '[]',
  social_opportunity    text,
  social_platforms      jsonb default '{}',  -- {instagram: {followers, posts, active}, tiktok: {...}}

  reviews_score         int check (reviews_score between 0 and 100),
  reviews_grade         text,
  reviews_findings      jsonb default '[]',
  reviews_opportunity   text,
  review_platforms      jsonb default '{}',  -- {google: {rating, count}, yelp: {...}}

  local_seo_score       int check (local_seo_score between 0 and 100),
  local_seo_grade       text,
  local_seo_findings    jsonb default '[]',
  local_seo_opportunity text,

  press_score           int check (press_score between 0 and 100),
  press_grade           text,
  press_findings        jsonb default '[]',
  press_opportunity     text,

  competitor_score      int check (competitor_score between 0 and 100),
  competitor_grade      text,
  competitor_findings   jsonb default '[]',
  competitor_opportunity text,
  competitors           jsonb default '[]',  -- [{name, rating, review_count}]

  -- Raw data for reference
  raw_data              jsonb default '{}',
  status                text default 'complete' check (status in ('running','complete','failed')),
  error_message         text
);

-- ─── KPI DEFINITIONS ────────────────────────────
-- Each client can have custom KPIs tracked
create table public.kpi_definitions (
  id           uuid default uuid_generate_v4() primary key,
  client_id    uuid references public.clients(id) on delete cascade not null,
  name         text not null,
  key          text not null,  -- e.g. 'google_reviews', 'weekly_covers'
  unit         text,           -- e.g. 'count', 'rating', 'currency'
  target       numeric,
  icon         text,
  sort_order   int default 0,
  created_at   timestamptz default now()
);

-- ─── KPI VALUES ─────────────────────────────────
-- Weekly KPI data points
create table public.kpi_values (
  id             uuid default uuid_generate_v4() primary key,
  client_id      uuid references public.clients(id) on delete cascade not null,
  kpi_id         uuid references public.kpi_definitions(id) on delete cascade not null,
  value          numeric not null,
  recorded_at    timestamptz default now(),
  note           text
);

-- ─── FIXES ──────────────────────────────────────
-- The prescription items for each client
create table public.fixes (
  id             uuid default uuid_generate_v4() primary key,
  client_id      uuid references public.clients(id) on delete cascade not null,
  category       text not null,  -- website, social, reviews, local_seo, press, competitors
  name           text not null,
  description    text,
  before_state   text,
  after_state    text,
  how_we_do_it   text,
  tier_required  text default 'core',
  score_impact   int default 0,
  status         text default 'pending' check (status in ('pending','in_progress','done','skipped')),
  started_at     timestamptz,
  completed_at   timestamptz,
  sort_order     int default 0,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- ─── ACTIVITY LOG ───────────────────────────────
create table public.activity (
  id           uuid default uuid_generate_v4() primary key,
  client_id    uuid references public.clients(id) on delete cascade not null,
  type         text not null,  -- scan_complete, fix_done, fix_started, report_sent, kpi_update
  title        text not null,
  description  text,
  metadata     jsonb default '{}',
  created_at   timestamptz default now()
);

-- ─── MONTHLY REPORTS ────────────────────────────
create table public.reports (
  id              uuid default uuid_generate_v4() primary key,
  client_id       uuid references public.clients(id) on delete cascade not null,
  period_month    int not null,   -- 1-12
  period_year     int not null,
  overall_score   int,
  overall_grade   text,
  summary         text,           -- Claude-generated summary
  html_content    text,           -- Full HTML report
  sent_at         timestamptz,
  opened_at       timestamptz,
  created_at      timestamptz default now()
);

-- ═══════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════

alter table public.profiles       enable row level security;
alter table public.clients         enable row level security;
alter table public.scans           enable row level security;
alter table public.kpi_definitions enable row level security;
alter table public.kpi_values      enable row level security;
alter table public.fixes           enable row level security;
alter table public.activity        enable row level security;
alter table public.reports         enable row level security;

-- Profiles: users can read their own
create policy "Users read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Admins can read/write everything
create policy "Admins full access to clients"
  on public.clients for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins full access to scans"
  on public.scans for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins full access to fixes"
  on public.fixes for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins full access to kpi_definitions"
  on public.kpi_definitions for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins full access to kpi_values"
  on public.kpi_values for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins full access to activity"
  on public.activity for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Admins full access to reports"
  on public.reports for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Clients can only read their own data
create policy "Clients read own data"
  on public.clients for select
  using (id = (select client_id from public.profiles where id = auth.uid()));

create policy "Clients read own scans"
  on public.scans for select
  using (client_id = (select client_id from public.profiles where id = auth.uid()));

create policy "Clients read own fixes"
  on public.fixes for select
  using (client_id = (select client_id from public.profiles where id = auth.uid()));

create policy "Clients read own kpi_definitions"
  on public.kpi_definitions for select
  using (client_id = (select client_id from public.profiles where id = auth.uid()));

create policy "Clients read own kpi_values"
  on public.kpi_values for select
  using (client_id = (select client_id from public.profiles where id = auth.uid()));

create policy "Clients read own activity"
  on public.activity for select
  using (client_id = (select client_id from public.profiles where id = auth.uid()));

create policy "Clients read own reports"
  on public.reports for select
  using (client_id = (select client_id from public.profiles where id = auth.uid()));

-- ═══════════════════════════════════════════════
-- FUNCTIONS & TRIGGERS
-- ═══════════════════════════════════════════════

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger clients_updated_at
  before update on public.clients
  for each row execute procedure public.handle_updated_at();

create trigger fixes_updated_at
  before update on public.fixes
  for each row execute procedure public.handle_updated_at();

-- ═══════════════════════════════════════════════
-- SEED: De Novo as first client
-- ═══════════════════════════════════════════════

insert into public.clients (
  id, name, short_name, industry, website_url,
  locations, contact_name, contact_email,
  tier, status, brand_primary, brand_secondary
) values (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'De Novo European Pub',
  'De Novo',
  'Restaurant / Hospitality',
  'https://www.denovoeuropeanpub.com',
  '[{"name":"Edgewater","city":"Edgewater, NJ","address":"1257 River Rd"},{"name":"Montclair","city":"Montclair, NJ","address":"275 Bellevue Ave"}]',
  'Demetri Malki',
  'owner@denovopub.com',
  'growth',
  'active',
  '#1E3A5F',
  '#6FA5D9'
);

-- Seed first scan (onboarding baseline)
insert into public.scans (
  client_id, scan_type,
  overall_score, overall_grade, overall_verdict,
  website_score, website_grade,
  social_score, social_grade,
  reviews_score, reviews_grade,
  local_seo_score, local_seo_grade,
  press_score, press_grade,
  competitor_score, competitor_grade,
  review_platforms, social_platforms
) values (
  'a1b2c3d4-0000-0000-0000-000000000001', 'onboarding',
  59, 'D', 'Strong food and loyal guests — but digital leaks are costing reservations every night.',
  52, 'C',
  62, 'C',
  64, 'C',
  55, 'D',
  72, 'B',
  48, 'D',
  '{"google_edgewater":{"rating":4.3,"count":400},"google_montclair":{"rating":4.2,"count":700},"yelp_edgewater":{"rating":3.8,"count":410},"yelp_montclair":{"rating":4.0,"count":589},"tripadvisor_edgewater":{"rating":2.9,"count":14,"claimed":false},"opentable":{"listed":false}}',
  '{"instagram_edgewater":{"handle":"denovoedgewater","followers":16000,"posts":762,"active":true},"instagram_montclair":{"handle":"denovomontclair","followers":6299,"posts":536,"active":true},"facebook_edgewater":{"followers":990,"active":true},"facebook_montclair":{"followers":3400,"active":true},"tiktok":{"active":false},"linkedin":{"active":false}}'
);

-- Seed fixes for De Novo
insert into public.fixes (client_id, category, name, tier_required, score_impact, status, sort_order) values
  ('a1b2c3d4-0000-0000-0000-000000000001', 'reviews',   'TripAdvisor listing claimed',      'core',   8,  'done',        1),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'reviews',   'AI review response deployed',       'core',   7,  'done',        2),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'website',   'Schema markup installed',           'core',   3,  'done',        3),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'local_seo', 'GBP full audit complete',           'core',   6,  'done',        4),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'reviews',   'OpenTable onboarding',              'growth', 6,  'in_progress', 5),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'social',    'TikTok account launch',             'growth', 10, 'in_progress', 6),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'website',   'Email capture + welcome sequence',  'growth', 5,  'in_progress', 7),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'local_seo', 'Citation cleanup (50+ dirs)',       'growth', 5,  'in_progress', 8),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'website',   'Domain consolidation',              'growth', 10, 'pending',     9),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'reviews',   'Post-visit review automation',      'core',   8,  'pending',     10),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'website',   'Content engine launch',             'growth', 8,  'pending',     11);

-- Seed KPI definitions
insert into public.kpi_definitions (client_id, name, key, unit, target, icon, sort_order) values
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Google Reviews',      'google_reviews',      'count',    500,  '⭐', 1),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Avg Star Rating',     'avg_rating',          'rating',   4.7,  '★',  2),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Instagram Followers', 'instagram_followers', 'count',    25000,'📸', 3),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Weekly Covers',       'weekly_covers',       'count',    1200, '🍽', 4),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'OpenTable Bookings',  'opentable_bookings',  'count',    200,  '📅', 5),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Private Event Leads', 'event_leads',         'count',    10,   '🎉', 6);

-- Seed initial activity
insert into public.activity (client_id, type, title, description) values
  ('a1b2c3d4-0000-0000-0000-000000000001', 'fix_done',       'TripAdvisor listing claimed',    'Edgewater location claimed. 2.9★ now actively managed.'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'fix_done',       'AI review responses live',       '11 reviews answered in first 24 hours.'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'scan_complete',  'Weekly scan completed',          'Overall score: 67/100. +3 points vs last week.'),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'fix_started',    'OpenTable onboarding',           'Account created, awaiting confirmation from OT team.');
