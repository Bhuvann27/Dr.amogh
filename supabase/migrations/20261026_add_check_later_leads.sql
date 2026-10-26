create table if not exists public.check_later_entries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source_category text not null,
  profile_url text,
  contact text,
  note text,
  potential_score integer not null default 5 check (potential_score between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists check_later_entries_source_category_idx on public.check_later_entries (source_category);
create index if not exists check_later_entries_created_at_idx on public.check_later_entries (created_at desc);

alter table public.check_later_entries enable row level security;

create policy "Authenticated users can read check later entries"
  on public.check_later_entries for select to authenticated using (true);
create policy "Authenticated users can insert check later entries"
  on public.check_later_entries for insert to authenticated with check (true);
create policy "Authenticated users can update check later entries"
  on public.check_later_entries for update to authenticated using (true) with check (true);
create policy "Authenticated users can delete check later entries"
  on public.check_later_entries for delete to authenticated using (true);

create or replace function public.set_check_later_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger check_later_entries_updated_at
before update on public.check_later_entries
for each row execute function public.set_check_later_updated_at();
