-- Idempotent, contains only the itinerary from the brief; no private accounts or photos.
begin;
insert into public.trips(id,name,city,start_date,end_date,timezone)
 values('10000000-0000-4000-8000-000000000001','Bandung Date ♡','Bandung, West Java, Indonesia','2026-10-30','2026-11-01','Asia/Jakarta') on conflict(id) do nothing;
insert into public.destinations(id,trip_id,name,category,date,time,tentative,status,sort_order,notes)
select ('20000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,'10000000-0000-4000-8000-000000000001'::uuid,
 name,category,day::date,clock::time,n<>1,'Scheduled',n*10,note
from (values
 (1,'Bubur DPR','Food','2026-10-30','07:00','Waktu mulai dikonfirmasi. Jam buka dan alamat belum diverifikasi.'),
 (2,'Makmur Jaya','Coffee','2026-10-30',null,'Jumat pagi · tentatif'),
 (3,'Tjilaki 9','Food','2026-10-30',null,'Jumat pagi · tentatif'),
 (4,'Ayam Asin Cihapit','Food','2026-10-30',null,'Jumat malam · tentatif'),
 (5,'BMB Canteen','Food','2026-10-31',null,'Sabtu · tentatif'),
 (6,'The Deli Bakes','Bakery','2026-10-31',null,'Sabtu · tentatif'),
 (7,'Toppie Burger','Food','2026-10-31',null,'Sabtu · tentatif'),
 (8,'Wangi Seruni','Other','2026-10-31',null,'Sabtu · tentatif'),
 (9,'Tako Buranko','Food','2026-10-31',null,'Sabtu sore/malam · tentatif'),
 (10,'Tjuanki Stasiun','Food','2026-11-01',null,'Minggu · tentatif')
) as seed(n,name,category,day,clock,note) on conflict(id) do nothing;
commit;
