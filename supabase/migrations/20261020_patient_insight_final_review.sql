alter table public.patient_insights
  add column if not exists anonymous_confirmed boolean not null default false,
  add column if not exists final_reviewed boolean not null default false,
  add column if not exists final_reviewed_at timestamptz;

create or replace function public.patient_insights_set_timestamps()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  if new.status = 'published' and old.status <> 'published' then
    new.published_at = coalesce(new.published_at, now());
  end if;
  if new.final_reviewed = true and old.final_reviewed is distinct from true then
    new.final_reviewed_at = now();
  end if;
  return new;
end;
$$;

drop policy if exists "authenticated users manage all stories" on public.patient_insights;
create policy "authenticated users manage all stories"
  on public.patient_insights for all
  to authenticated
  using (auth.role() = 'authenticated')
  with check (
    auth.role() = 'authenticated'
    and (
      status <> 'published'
      or (
        consent_confirmed = true
        and identifiers_removed = true
        and privacy_reviewed = true
        and no_identifying_details = true
        and medical_reviewed = true
        and anonymous_confirmed = true
        and final_reviewed = true
        and (urgent = '' or urgent_reviewed = true)
      )
    )
  );
