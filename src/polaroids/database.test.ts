import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { GALLERY_ID, defaultCrop } from "./model";
// Real PostgreSQL SQL/RLS execution in WASM. Supabase's auth/storage scaffolding is test-local.
const pg = new PGlite();
const rheno = "a0000000-0000-4000-8000-000000000001",
  fadla = "a0000000-0000-4000-8000-000000000002",
  outsider = "a0000000-0000-4000-8000-000000000003",
  photo = "b0000000-0000-4000-8000-000000000001";
const item = { photo_id: photo, caption: "Our little story", ...defaultCrop };
async function actor(id: string, role = "authenticated") {
  await pg.exec(
    `reset role;set role ${role};select set_config('request.jwt.claim.sub','${id}',false)`,
  );
}
beforeAll(async () => {
  await pg.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
 create table auth.users(id uuid primary key,email text);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth,storage to anon,authenticated;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text);
 alter table storage.objects enable row level security;grant select,insert,delete on storage.objects to anon,authenticated;
 create publication supabase_realtime;`);
  for (const migration of [
    "001_schema.sql",
    "002_album_locations.sql",
    "003_dashboard_polaroids.sql",
    "004_special_days.sql",
  ])
    await pg.exec(
      await readFile(
        new URL("../../supabase/migrations/" + migration, import.meta.url),
        "utf8",
      ),
    );
  await pg.exec(
    await readFile(new URL("../../supabase/seed.sql", import.meta.url), "utf8"),
  );
  await pg.exec(
    `insert into auth.users(id,email) values('${rheno}','rheno@example.invalid'),('${fadla}','fadla@example.invalid'),('${outsider}','outsider@example.invalid');insert into public.authorized_members(id,display_name) values('${rheno}','Rheno'),('${fadla}','Fadla');insert into public.memories(id,title) values('c0000000-0000-4000-8000-000000000001','Test album');insert into public.memory_photos(id,memory_id,path,bytes) values('${photo}','c0000000-0000-4000-8000-000000000001','test/photo.webp',100);`,
  );
}, 30000);
afterAll(async () => {
  await pg.close();
});
describe("Approved Polaroid migration and RLS in local PostgreSQL", () => {
  it("shares special dates between members, guards conflicts and blocks unauthorized writes", async () => {
    await actor(rheno);
    const created = await pg.query<{ id: string; version: number }>(
      "insert into public.special_days(title,kind,date) values('Our anniversary','anniversary','2022-10-28') returning id,version",
    );
    const row = created.rows[0];
    await actor(fadla);
    expect(
      (
        await pg.query("select * from public.special_days where id=$1", [
          row.id,
        ])
      ).rows,
    ).toHaveLength(1);
    await pg.query(
      "update public.special_days set title='Together' where id=$1 and version=$2",
      [row.id, row.version],
    );
    expect(
      (
        await pg.query(
          "update public.special_days set title='Stale' where id=$1 and version=$2 returning id",
          [row.id, row.version],
        )
      ).rows,
    ).toHaveLength(0);
    await expect(
      pg.exec("update public.special_days set version=99"),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      pg.exec(
        "insert into public.special_days(title,kind,date) values('','bad','2026-01-01')",
      ),
    ).rejects.toMatchObject({ code: "23514" });
    await actor(outsider);
    expect(
      (await pg.query("select * from public.special_days")).rows,
    ).toHaveLength(0);
    await expect(
      pg.exec(
        "insert into public.special_days(title,kind,date) values('No','special','2026-01-01')",
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await actor("", "anon");
    await expect(
      pg.query("select * from public.special_days"),
    ).rejects.toMatchObject({ code: "42501" });
    await actor(rheno);
    await pg.query(
      "update public.special_days set deleted_at=now() where id=$1",
      [row.id],
    );
    expect(
      (
        await pg.query<{ deleted_at: string }>(
          "select deleted_at from public.special_days where id=$1",
          [row.id],
        )
      ).rows[0].deleted_at,
    ).toBeTruthy();
  });
  it("allows both members to share one versioned configuration and rejects a stale save", async () => {
    await actor(rheno);
    const first = await pg.query<{ version: number }>(
      "select version from public.dashboard_polaroids where id=$1",
      [GALLERY_ID],
    );
    const saved = await pg.query<{ version: number; updated_by: string }>(
      "update public.dashboard_polaroids set photos=$1::jsonb where id=$2 and version=$3 returning version,updated_by",
      [JSON.stringify([item]), GALLERY_ID, first.rows[0].version],
    );
    expect(saved.rows[0].updated_by).toBe(rheno);
    expect(saved.rows[0].version).toBe(first.rows[0].version + 1);
    await actor(fadla);
    expect(
      (
        await pg.query<{ photos: unknown[] }>(
          "select photos from public.dashboard_polaroids",
        )
      ).rows[0].photos,
    ).toHaveLength(1);
    const stale = await pg.query(
      "update public.dashboard_polaroids set photos=$1::jsonb where id=$2 and version=$3 returning id",
      ["[]", GALLERY_ID, first.rows[0].version],
    );
    expect(stale.rows).toHaveLength(0);
  });
  it("blocks an outsider and anonymous user including direct API-equivalent SQL", async () => {
    await actor(outsider);
    expect(
      (await pg.query("select * from public.dashboard_polaroids")).rows,
    ).toHaveLength(0);
    expect(
      (
        await pg.query(
          "update public.dashboard_polaroids set photos='[]' returning id",
        )
      ).rows,
    ).toHaveLength(0);
    await expect(
      pg.exec("insert into public.dashboard_polaroids(photos) values('[]')"),
    ).rejects.toMatchObject({ code: "42501" });
    await actor("", "anon");
    await expect(
      pg.query("select * from public.dashboard_polaroids"),
    ).rejects.toMatchObject({ code: "42501" });
  });
  it("rejects sixth photos, duplicates, missing sources, URLs, invalid positions and long captions", async () => {
    await actor(rheno);
    const invalid = [
      Array.from({ length: 6 }, () => item),
      [item, item],
      [{ ...item, photo_id: "b0000000-0000-4000-8000-000000000999" }],
      [{ ...item, x: 101 }],
      [{ ...item, zoom: 0.5 }],
      [{ ...item, caption: "x".repeat(121) }],
      [{ ...item, url: "https://example.invalid/private" }],
    ];
    for (const photos of invalid)
      await expect(
        pg.query("update public.dashboard_polaroids set photos=$1::jsonb", [
          JSON.stringify(photos),
        ]),
      ).rejects.toMatchObject({ code: "23514" });
  });
  it("permits only the photo configuration column and never membership self-assignment", async () => {
    await actor(rheno);
    await expect(
      pg.exec("update public.dashboard_polaroids set version=999"),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      pg.exec("delete from public.dashboard_polaroids"),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      pg.exec(
        "update public.authorized_members set display_name='Fadla' where id=auth.uid()",
      ),
    ).rejects.toMatchObject({ code: "42501" });
  });
  it("removing selection preserves the source photo and deleting a source does not break settings reads", async () => {
    await actor(fadla);
    await pg.exec("update public.dashboard_polaroids set photos='[]'");
    expect(
      (
        await pg.query("select id from public.memory_photos where id=$1", [
          photo,
        ])
      ).rows,
    ).toHaveLength(1);
    await pg.query("update public.dashboard_polaroids set photos=$1::jsonb", [
      JSON.stringify([item]),
    ]);
    await pg.query("delete from public.memory_photos where id=$1", [photo]);
    expect(
      (await pg.query("select id from public.dashboard_polaroids")).rows,
    ).toHaveLength(1);
    await expect(
      pg.query("update public.dashboard_polaroids set photos=$1::jsonb", [
        JSON.stringify([item]),
      ]),
    ).rejects.toMatchObject({ code: "23514" });
  });
  it("can be installed again without erasing settings and leaves core RLS enabled", async () => {
    await actor(rheno);
    await pg.exec("update public.dashboard_polaroids set photos='[]'");
    const before = (
      await pg.query("select version from public.dashboard_polaroids")
    ).rows[0];
    await pg.exec("reset role");
    await pg.exec(
      await readFile(
        new URL(
          "../../supabase/migrations/003_dashboard_polaroids.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const after = (
      await pg.query("select version from public.dashboard_polaroids")
    ).rows[0];
    expect(after).toEqual(before);
    const tables = await pg.query<{ relrowsecurity: boolean }>(
      "select relrowsecurity from pg_class where relnamespace='public'::regnamespace and relname in ('trips','destinations','memories','memory_photos','authorized_members','dashboard_polaroids')",
    );
    expect(tables.rows).toHaveLength(6);
    expect(tables.rows.every((r) => r.relrowsecurity)).toBe(true);
  });
});
