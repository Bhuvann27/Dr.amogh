-- =========================================================
-- Patient Insights — schema, security, and seed data
-- Run this once in your Supabase project's SQL Editor
-- (Project → SQL Editor → New query → paste all of this → Run)
-- =========================================================

create extension if not exists pgcrypto;

create table if not exists patient_insights (
  id                 uuid primary key default gen_random_uuid(),
  slug               text unique not null,
  title              text not null default '',
  subtitle           text not null default '',
  intro              text not null default '',
  topic              text not null default '',

  dialogue           jsonb not null default '[]'::jsonb,   -- [{ "q": "...", "a": "..." }, ...]
  relate_intro       text not null default '',
  relate_points      jsonb not null default '[]'::jsonb,   -- ["...", "..."]
  relate_close       text not null default '',
  action_points      jsonb not null default '[]'::jsonb,   -- ["...", "..."]
  urgent             text not null default '',
  urgent_reviewed    boolean not null default false,

  consent_confirmed        boolean not null default false,
  identifiers_removed      boolean not null default false,
  privacy_reviewed         boolean not null default false,
  no_identifying_details   boolean not null default false,
  medical_reviewed         boolean not null default false,

  status             text not null default 'draft' check (status in ('draft','published','archived')),

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  published_at       timestamptz
);

-- keep updated_at current, and stamp published_at the first time a
-- story becomes published (never overwritten on later edits)
create or replace function patient_insights_set_timestamps()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  if new.status = 'published' and (old.published_at is null) then
    new.published_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_patient_insights_timestamps on patient_insights;
create trigger trg_patient_insights_timestamps
  before update on patient_insights
  for each row execute function patient_insights_set_timestamps();

-- =========================================================
-- Row Level Security
-- =========================================================
alter table patient_insights enable row level security;

-- Anyone (including anonymous website visitors) can read PUBLISHED
-- stories only. Drafts and archived stories are never exposed.
drop policy if exists "public can read published stories" on patient_insights;
create policy "public can read published stories"
  on patient_insights for select
  to anon, authenticated
  using (status = 'published');

-- Any logged-in user has full access. This site has exactly one
-- admin (the doctor), so any authenticated Supabase user = the admin.
-- If you ever add a second staff login, this still applies to them too.
drop policy if exists "authenticated users manage all stories" on patient_insights;
create policy "authenticated users manage all stories"
  on patient_insights for all
  to authenticated
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- =========================================================
-- Seed data — the two existing public stories, unchanged.
-- Safe to re-run: it only inserts them if they don't exist yet.
-- =========================================================
insert into patient_insights
  (slug, title, subtitle, intro, topic, dialogue, relate_intro, relate_points, relate_close, action_points, urgent, urgent_reviewed, consent_confirmed, identifiers_removed, privacy_reviewed, no_identifying_details, medical_reviewed, status)
values
(
  'fatigue',
  '“I thought I was just tired.”',
  'On fatigue that doesn''t go away with rest',
  'A patient came in after feeling more tired than usual for a few weeks.',
  'Tiredness',
  '[{"q": "When did you first notice it?", "a": "I think it started a few weeks ago. At first, I thought it was because of work. I was busy, so I didn''t think much about it."}, {"q": "Was it happening every day?", "a": "No. Some days I felt completely fine. But on some days, I would feel tired even after sleeping."}, {"q": "How was it affecting your normal day?", "a": "I could still do my work, but I didn''t have much energy after that. Earlier I used to do things after work, but recently I just wanted to rest."}, {"q": "Did you notice anything else?", "a": "I was getting headaches sometimes. I also felt that I wasn''t able to concentrate properly."}, {"q": "How was your sleep?", "a": "I was sleeping at my usual time, but I didn''t feel fresh when I woke up."}, {"q": "Did you notice any change in your routine?", "a": "Not really. That''s why I thought it was just normal tiredness."}]'::jsonb,
  'Sometimes these changes are very small and easy to ignore. You may have noticed that:',
  '["You are getting tired more easily than before.", "You sleep, but still don''t feel rested.", "You find it harder to concentrate.", "You have started getting headaches or other small changes.", "You need more rest after your usual work.", "You keep thinking, “Maybe I''m just tired.”"]'::jsonb,
  'Everyone feels tired sometimes. But when something keeps happening or starts becoming part of your everyday life, it is worth paying attention to.',
  '["Start by noticing when the tiredness happens, how often it happens, and whether anything else happens along with it.", "If you haven''t had a routine health check recently, consider getting one.", "If the tiredness continues, keeps coming back, or starts affecting your normal work and daily activities, it''s a good idea to speak with a doctor."]'::jsonb,
  'If symptoms are sudden, severe, or getting worse, seek medical attention promptly.',
  true, true, true, true, true, true, 'published'
),
(
  'headache',
  '“My headaches started becoming part of my day.”',
  'On headaches that keep coming back',
  'A patient came in after having headaches on and off for some time.',
  'Headache',
  '[{"q": "When did you first notice the headaches?", "a": "I don''t remember the exact day. In the beginning, it was only once in a while, so I didn''t think much about it."}, {"q": "How often were you getting them later?", "a": "After some time, it started happening more often. Some weeks I would get it two or three times."}, {"q": "What was it like when you had the headache?", "a": "It was usually a dull pain. Sometimes it would stay for a few hours. I would try to continue my work, but I didn''t feel comfortable."}, {"q": "Did anything seem to bring it on?", "a": "I noticed it more on days when I was very busy. Sometimes I had been looking at a screen for many hours."}, {"q": "Did you have anything else along with it?", "a": "Sometimes I just wanted to sit somewhere quiet. I didn''t feel like doing much until it settled."}, {"q": "Did you take anything for it?", "a": "Sometimes I would just rest and wait for it to go away. I didn''t want to keep taking something every time it happened."}]'::jsonb,
  'Headaches are common, and many people simply continue with their day when they happen. You might have noticed:',
  '["Headaches coming back every few days or weeks.", "A headache after a long day of work.", "Feeling uncomfortable looking at a screen for a long time.", "Wanting to sit somewhere quiet when the headache starts.", "Taking rest and waiting for it to settle.", "Noticing that the headaches are becoming more frequent than before."]'::jsonb,
  'Sometimes you get used to something simply because it has been happening for a while.',
  '["If headaches keep coming back, notice when they happen, how long they last, how often they occur, and whether anything seems to bring them on.", "Getting enough rest, staying hydrated, and maintaining regular meals can also be part of looking after your general health.", "If the headaches continue, become more frequent, or start affecting your normal activities, consider discussing them with a doctor."]'::jsonb,
  'If a headache is sudden and extremely severe, or comes with weakness, confusion, fainting, difficulty speaking, vision changes, or other concerning symptoms, seek urgent medical attention.',
  true, true, true, true, true, true, 'published'
)
on conflict (slug) do nothing;

-- =========================================================
-- Creating the doctor's login
-- =========================================================
-- Don't create the admin user here in SQL. Instead, in the Supabase
-- dashboard: Authentication -> Users -> Add user -> enter Dr. Amogh's
-- email and a password. That's the only account this site needs.
-- Turn OFF "Enable email signups" under Authentication -> Providers
-- so no one else can self-register an account.

-- =========================================================
-- Online consultation: availability + appointments
-- (Applied directly to the live project. Kept here so the schema is
-- fully documented in the repo and reproducible elsewhere.)
-- =========================================================

create table if not exists availability_weekly (
  day_of_week  int primary key check (day_of_week between 0 and 6),
  is_open      boolean not null default true,
  start_time   time not null default '10:00',
  end_time     time not null default '19:00',
  updated_at   timestamptz not null default now()
);

insert into availability_weekly (day_of_week, is_open, start_time, end_time)
select d, true, '10:00', '19:00' from generate_series(0,6) as d
on conflict (day_of_week) do nothing;

-- Ad-hoc exceptions: block a whole date, or a specific time range within a
-- date. start_time/end_time NULL on both = the entire date is blocked.
create table if not exists availability_blocks (
  id          uuid primary key default gen_random_uuid(),
  block_date  date not null,
  start_time  time,
  end_time    time,
  reason      text not null default '',
  created_at  timestamptz not null default now()
);
create index if not exists idx_availability_blocks_date on availability_blocks(block_date);

-- Duration/fee are columns, not hard-coded in app code, so they can
-- change later without a schema migration.
create table if not exists appointments (
  id                  uuid primary key default gen_random_uuid(),
  patient_name        text not null,
  patient_phone       text not null,
  patient_email       text,
  appointment_date    date not null,
  start_time          time not null,
  duration_minutes    int not null default 15,
  fee_inr             int not null default 1200,
  status              text not null default 'requested' check (status in ('requested','confirmed','completed','cancelled')),
  payment_status      text not null default 'pending' check (payment_status in ('pending','paid')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Real double-booking prevention at the database level (a partial unique
-- index), not just a frontend check — verified with a concurrent-insert
-- test against the live project.
create unique index if not exists uq_appointments_slot
  on appointments(appointment_date, start_time)
  where status <> 'cancelled';

create or replace function appointments_set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_appointments_updated_at on appointments;
create trigger trg_appointments_updated_at
  before update on appointments
  for each row execute function appointments_set_updated_at();

-- Public-safe view: which slots are taken, with zero patient details, so
-- the booking page can compute free slots without ever exposing another
-- patient's name/phone/email. security_invoker so it respects the
-- querying user's own RLS rather than the view owner's.
create or replace view taken_slots as
  select appointment_date, start_time
  from appointments
  where status <> 'cancelled';
alter view taken_slots set (security_invoker = true);

alter table availability_weekly enable row level security;
alter table availability_blocks enable row level security;
alter table appointments enable row level security;

drop policy if exists "public can read weekly availability" on availability_weekly;
create policy "public can read weekly availability" on availability_weekly
  for select to anon, authenticated using (true);
drop policy if exists "authenticated manage weekly availability" on availability_weekly;
create policy "authenticated manage weekly availability" on availability_weekly
  for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "public can read availability blocks" on availability_blocks;
create policy "public can read availability blocks" on availability_blocks
  for select to anon, authenticated using (true);
drop policy if exists "authenticated manage availability blocks" on availability_blocks;
create policy "authenticated manage availability blocks" on availability_blocks
  for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Anyone can create a booking request; only the doctor can read, update,
-- or cancel appointments. A patient can never read back any appointment
-- row, including their own — the confirmation is shown client-side at
-- submit time, not fetched from the table.
drop policy if exists "anyone can request an appointment" on appointments;
create policy "anyone can request an appointment" on appointments
  for insert to anon, authenticated with check (true);
drop policy if exists "authenticated manage appointments" on appointments;
create policy "authenticated manage appointments" on appointments
  for all to authenticated using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select on taken_slots to anon, authenticated;
