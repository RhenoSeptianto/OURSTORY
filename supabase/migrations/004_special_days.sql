-- Run in Supabase SQL Editor after 001–003. Additive; no existing data changes.
begin;
create table if not exists public.special_days (
  id uuid primary key default gen_random_uuid(),
  title text not null check(length(trim(title)) between 1 and 120),
  kind text not null check(kind in ('special','anniversary')),
  date date not null check(date between date '1900-01-01' and date '2200-12-31'),
  deleted_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  created_by uuid references public.authorized_members(id),
  updated_by uuid references public.authorized_members(id), version integer not null default 1
);
alter table public.special_days enable row level security;
revoke all on public.special_days from public,anon,authenticated;
grant select on public.special_days to authenticated;
grant insert(title,kind,date) on public.special_days to authenticated;
grant update(title,kind,date,deleted_at) on public.special_days to authenticated;
drop policy if exists special_read on public.special_days;
create policy special_read on public.special_days for select to authenticated using(public.is_member());
drop policy if exists special_insert on public.special_days;
create policy special_insert on public.special_days for insert to authenticated with check(public.is_member());
drop policy if exists special_update on public.special_days;
create policy special_update on public.special_days for update to authenticated using(public.is_member()) with check(public.is_member());
drop trigger if exists special_stamp on public.special_days;
create trigger special_stamp before insert or update on public.special_days for each row execute function public.stamp_record();
drop trigger if exists special_audit on public.special_days;
create trigger special_audit after insert or update on public.special_days for each row execute function public.audit_record();
do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='special_days') then
    alter publication supabase_realtime add table public.special_days;
  end if;
end $$;
notify pgrst,'reload schema';
commit;
