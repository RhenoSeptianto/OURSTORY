-- Run ONLY against a fresh local Supabase test database, after migration + seed.
-- psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -v ON_ERROR_STOP=1 -f supabase/tests/rls.sql
begin;
insert into auth.users(id,email) values
 ('a0000000-0000-4000-8000-000000000001','rheno@example.invalid'),
 ('a0000000-0000-4000-8000-000000000002','fadla@example.invalid'),
 ('a0000000-0000-4000-8000-000000000003','outsider@example.invalid');
insert into public.authorized_members(id,display_name) values
 ('a0000000-0000-4000-8000-000000000001','Rheno'),
 ('a0000000-0000-4000-8000-000000000002','Fadla');
set local role authenticated;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000001',true);
do $$ begin
 if not public.is_member() then raise exception 'Rheno membership failed'; end if;
 if (select count(*) from public.trips)<>1 then raise exception 'Member cannot read trip'; end if;
 if (select count(*) from public.destinations)<>10 then raise exception 'Seed must contain exactly ten destinations'; end if;
 update public.destinations set status='Visited' where id='20000000-0000-4000-8000-000000000001';
 if (select version from public.destinations where id='20000000-0000-4000-8000-000000000001')<>2 then raise exception 'Version trigger failed'; end if;
 update public.destinations set notes='Stale write' where id='20000000-0000-4000-8000-000000000001' and version=1;
 if found then raise exception 'Stale version overwrote data'; end if;
 begin
  update public.authorized_members set display_name='Fadla' where id=auth.uid();
  raise exception 'Membership modification allowed';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000002',true);
do $$ begin
 if not public.is_member() then raise exception 'Fadla membership failed'; end if;
 if (select status from public.destinations where id='20000000-0000-4000-8000-000000000001')<>'Visited' then raise exception 'Shared read failed'; end if;
 insert into storage.objects(bucket_id,name) values('memories','test/private.webp');
end $$;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000003',true);
do $$ declare t text; n integer; begin
 if public.is_member() then raise exception 'Outsider membership allowed'; end if;
 foreach t in array array['authorized_members','trips','destinations','memories','memory_photos','activity_history'] loop
 execute format('select count(*) from public.%I',t) into n;
 if n<>0 then raise exception 'Private rows leaked: %',t; end if;
 end loop;
 if exists(select 1 from storage.objects where bucket_id='memories') then raise exception 'Private photo leaked'; end if;
 begin
 insert into public.trips(name,city,start_date,end_date) values('Forbidden','No','2026-10-30','2026-11-01');
 raise exception 'Outsider insert allowed'; exception when insufficient_privilege then null; end;
 begin
 insert into storage.objects(bucket_id,name) values('memories','test/outsider.webp');
 raise exception 'Outsider upload allowed'; exception when insufficient_privilege then null; end;
 begin
 insert into public.authorized_members(id,display_name) values(auth.uid(),'Rheno');
 raise exception 'Self authorization allowed'; exception when insufficient_privilege then null; end;
end $$;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ declare t text; begin
 foreach t in array array['authorized_members','trips','destinations','memories','memory_photos','activity_history'] loop
 begin execute format('select 1 from public.%I limit 1',t); raise exception 'Anonymous select grant exists: %',t;
 exception when insufficient_privilege then null; end;
 end loop;
 if exists(select 1 from storage.objects where bucket_id='memories') then raise exception 'Anonymous storage leak'; end if;
end $$;
rollback;
