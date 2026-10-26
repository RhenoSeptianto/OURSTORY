-- Run once through Supabase SQL Editor as project administrator.
begin;
create table public.authorized_members (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check(display_name in ('Rheno','Fadla')) unique,
 created_at timestamptz not null default now()
);
alter table public.authorized_members enable row level security;
create function public.is_member() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.authorized_members where id = (select auth.uid()))
$$;
revoke all on function public.is_member() from public;
grant execute on function public.is_member() to authenticated;
create policy member_read on public.authorized_members for select to authenticated using(public.is_member());
revoke all on public.authorized_members from anon,authenticated;
grant select on public.authorized_members to authenticated;

create table public.trips (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 120),
 city text not null, start_date date not null, end_date date not null, timezone text not null default 'Asia/Jakarta',
 archived boolean not null default false, cover_path text, deleted_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 created_by uuid references public.authorized_members(id), updated_by uuid references public.authorized_members(id),
 version integer not null default 1, check(end_date >= start_date and end_date <= start_date + 365)
);
create table public.destinations (
 id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id),
 name text not null check(length(trim(name)) between 1 and 160), category text not null default 'Other'
 check(category in ('Food','Coffee','Bakery','Nature','Shopping','Hotel','Transportation','Other')),
 date date, time time, tentative boolean not null default true,
 status text not null default 'Wishlist' check(status in ('Wishlist','Scheduled','Visited','Skipped')),
 maps_url text not null default '' check(maps_url = '' or maps_url ~ '^https://(www\.)?(google\.com/maps|maps\.google\.com|maps\.app\.goo\.gl|goo\.gl/maps)(/|\?|$)'),
 photo_path text, notes text not null default '', sort_order numeric not null default 0,
 deleted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 created_by uuid references public.authorized_members(id), updated_by uuid references public.authorized_members(id), version integer not null default 1,
 check(status <> 'Scheduled' or date is not null), unique(id,trip_id)
);
create table public.memories (
 id uuid primary key default gen_random_uuid(), trip_id uuid not null references public.trips(id),
 destination_id uuid, title text not null check(length(trim(title)) between 1 and 160), story text not null default '',
 date date not null default current_date, deleted_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 created_by uuid references public.authorized_members(id), updated_by uuid references public.authorized_members(id), version integer not null default 1,
 foreign key(destination_id,trip_id) references public.destinations(id,trip_id)
);
create table public.memory_photos (
 id uuid primary key default gen_random_uuid(), memory_id uuid not null references public.memories(id),
 path text not null unique, caption text not null default '', bytes integer not null check(bytes between 1 and 2097152),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 created_by uuid references public.authorized_members(id), updated_by uuid references public.authorized_members(id), version integer not null default 1
);
create table public.activity_history (
 id uuid primary key default gen_random_uuid(), table_name text not null, record_id uuid not null,
 action text not null, actor uuid references public.authorized_members(id), created_at timestamptz not null default now()
);
create function public.stamp_record() returns trigger language plpgsql set search_path='' as $$
begin
 if TG_OP='INSERT' then new.created_by := auth.uid(); new.updated_by := auth.uid();
 else new.created_by := old.created_by; new.created_at := old.created_at; new.updated_by := auth.uid(); new.version := old.version+1; end if;
 new.updated_at := now(); return new;
end $$;
create function public.audit_record() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.activity_history(table_name,record_id,action,actor) values(TG_TABLE_NAME,new.id,TG_OP,auth.uid()); return new;
end $$;
do $$ declare t text; begin
 foreach t in array array['trips','destinations','memories','memory_photos'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy shared_read on public.%I for select to authenticated using(public.is_member())',t);
 execute format('create policy shared_insert on public.%I for insert to authenticated with check(public.is_member())',t);
 execute format('create policy shared_update on public.%I for update to authenticated using(public.is_member()) with check(public.is_member())',t);
 execute format('create trigger stamp before insert or update on public.%I for each row execute function public.stamp_record()',t);
 execute format('create trigger audit after insert or update on public.%I for each row execute function public.audit_record()',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant select,insert,update on public.%I to authenticated',t);
 end loop;
end $$;
-- Only photo metadata permits permanent removal, following a storage deletion.
grant delete on public.memory_photos to authenticated;
create policy shared_delete on public.memory_photos for delete to authenticated using(public.is_member());
alter table public.activity_history enable row level security;
create policy history_read on public.activity_history for select to authenticated using(public.is_member());
revoke all on public.activity_history from anon,authenticated;
grant select on public.activity_history to authenticated;
create index destinations_trip on public.destinations(trip_id,date,sort_order);
create index memories_trip on public.memories(trip_id,date);
create index photos_memory on public.memory_photos(memory_id);
create index history_record on public.activity_history(record_id,created_at desc);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('memories','memories',false,2097152,array['image/webp','image/jpeg','image/png']) on conflict(id) do nothing;
create policy private_photos_read on storage.objects for select to authenticated using(bucket_id='memories' and public.is_member());
create policy private_photos_insert on storage.objects for insert to authenticated with check(bucket_id='memories' and public.is_member());
create policy private_photos_delete on storage.objects for delete to authenticated using(bucket_id='memories' and public.is_member());
-- No overwrite policy: unique paths prevent concurrent photo replacement.
alter publication supabase_realtime add table public.trips,public.destinations,public.memories,public.memory_photos;
commit;
