-- PROPOSAL ONLY: not applied. Kept outside supabase/migrations intentionally.
-- Requires explicit user approval before installation or promotion to a migration.
-- Adds one singleton gallery configuration; existing application tables/policies stay unchanged.
begin;

create table if not exists public.dashboard_polaroids (
  id uuid primary key default '30000000-0000-4000-8000-000000000001'
    check(id='30000000-0000-4000-8000-000000000001'),
  photos jsonb not null default '[]'::jsonb,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.authorized_members(id),
  updated_by uuid references public.authorized_members(id),
  constraint polaroid_photo_limit check(
    case when jsonb_typeof(photos)='array' then jsonb_array_length(photos)<=5 else false end
  ),
  constraint polaroid_config_size check(octet_length(photos::text)<=8192)
);

alter table public.dashboard_polaroids enable row level security;
revoke all on public.dashboard_polaroids from public,anon,authenticated;
grant select on public.dashboard_polaroids to authenticated;
grant update(photos) on public.dashboard_polaroids to authenticated;

drop policy if exists polaroids_member_read on public.dashboard_polaroids;
create policy polaroids_member_read on public.dashboard_polaroids
  for select to authenticated using(public.is_member());
drop policy if exists polaroids_member_update on public.dashboard_polaroids;
create policy polaroids_member_update on public.dashboard_polaroids
  for update to authenticated using(public.is_member()) with check(public.is_member());
-- No client INSERT/DELETE, membership changes, storage grants, or public URLs.

create or replace function public.validate_dashboard_polaroids()
returns trigger language plpgsql set search_path='' as $$
declare item jsonb; photo_id uuid; seen uuid[] := array[]::uuid[];
begin
  if jsonb_typeof(new.photos) is distinct from 'array' then
    raise exception 'Gallery must be an array' using errcode='23514';
  end if;
  if jsonb_array_length(new.photos)>5 then
    raise exception 'Maximum five Polaroid photos' using errcode='23514';
  end if;
  for item in select value from jsonb_array_elements(new.photos) loop
    if jsonb_typeof(item) is distinct from 'object' then
      raise exception 'Invalid Polaroid item' using errcode='23514';
    end if;
    if not (item ?& array['photo_id','caption','fit','x','y','zoom'])
       or (item - array['photo_id','caption','fit','x','y','zoom']) <> '{}'::jsonb then
      raise exception 'Invalid Polaroid fields' using errcode='23514';
    end if;
    if jsonb_typeof(item->'photo_id') is distinct from 'string'
       or jsonb_typeof(item->'caption') is distinct from 'string'
       or jsonb_typeof(item->'fit') is distinct from 'string'
       or jsonb_typeof(item->'x') is distinct from 'number'
       or jsonb_typeof(item->'y') is distinct from 'number'
       or jsonb_typeof(item->'zoom') is distinct from 'number' then
      raise exception 'Invalid Polaroid value types' using errcode='23514';
    end if;
    if length(item->>'caption')>120 or (item->>'fit') not in ('contain','cover')
       or (item->>'x')::numeric not between 0 and 100
       or (item->>'y')::numeric not between 0 and 100
       or (item->>'zoom')::numeric not between 1 and 3 then
      raise exception 'Invalid caption or crop bounds' using errcode='23514';
    end if;
    photo_id := (item->>'photo_id')::uuid;
    if photo_id=any(seen) then
      raise exception 'Duplicate Polaroid photo' using errcode='23514';
    end if;
    seen := array_append(seen,photo_id);
    if not exists (
      select 1 from public.memory_photos p
      join public.memories m on m.id=p.memory_id
      left join public.trips t on t.id=m.trip_id
      where p.id=photo_id and m.deleted_at is null
        and (m.trip_id is null or (t.id is not null and t.deleted_at is null))
    ) then
      raise exception 'Photo is missing or its album is in trash' using errcode='23514';
    end if;
  end loop;
  return new;
end $$;
revoke all on function public.validate_dashboard_polaroids() from public;

drop trigger if exists polaroids_validate on public.dashboard_polaroids;
create trigger polaroids_validate before insert or update of photos
  on public.dashboard_polaroids for each row execute function public.validate_dashboard_polaroids();
drop trigger if exists polaroids_stamp on public.dashboard_polaroids;
create trigger polaroids_stamp before insert or update
  on public.dashboard_polaroids for each row execute function public.stamp_record();
drop trigger if exists polaroids_audit on public.dashboard_polaroids;
create trigger polaroids_audit after insert or update
  on public.dashboard_polaroids for each row execute function public.audit_record();

insert into public.dashboard_polaroids(id,photos)
values('30000000-0000-4000-8000-000000000001','[]'::jsonb)
on conflict(id) do nothing;

do $$ begin
  if not exists(select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='dashboard_polaroids') then
    alter publication supabase_realtime add table public.dashboard_polaroids;
  end if;
end $$;
notify pgrst,'reload schema';
commit;
