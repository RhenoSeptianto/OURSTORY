-- Run in Supabase SQL Editor after 001_schema.sql. Safe to repeat.
-- Preserves all existing album IDs, stories, photos, policies and trip links.
begin;
alter table public.memories add column if not exists location text not null default '';
alter table public.memories alter column trip_id drop not null;
do $$ begin
 if not exists(select 1 from pg_constraint where conrelid='public.memories'::regclass and conname='memories_location_length') then
  alter table public.memories add constraint memories_location_length check(length(location)<=200);
 end if;
 if not exists(select 1 from pg_constraint where conrelid='public.memories'::regclass and conname='memories_destination_needs_trip') then
  alter table public.memories add constraint memories_destination_needs_trip check(destination_id is null or trip_id is not null);
 end if;
end $$;
notify pgrst, 'reload schema';
commit;
