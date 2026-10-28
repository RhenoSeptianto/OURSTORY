import { test, expect } from "@playwright/test";
import type { SpecialDay } from "../src/reminders/model";
test("special-day create, edit, export and delete; responsive dashboard", async ({
  page,
}) => {
  let rows: SpecialDay[] = [];
  await page.route(
    "https://example.supabase.co/rest/v1/special_days*",
    async (route) => {
      const req = route.request();
      const method = req.method();
      if (method === "OPTIONS")
        return route.fulfill({
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-headers": "*",
            "access-control-allow-methods": "GET,POST,PATCH,OPTIONS",
          },
        });
      let result: unknown = rows;
      if (method === "POST") {
        const row = {
          ...req.postDataJSON(),
          id: "a0000000-0000-4000-8000-000000000007",
          version: 1,
          created_by: null,
          updated_by: null,
        };
        rows.push(row);
        result = row;
      }
      if (method === "PATCH") {
        rows = rows.map((r) => ({
          ...r,
          ...req.postDataJSON(),
          version: r.version + 1,
        }));
        result = rows[0];
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(result),
      });
    },
  );
  await page.goto("browser-tests/reminders.html");
  await page.getByRole("button", { name: "Hari spesial", exact: true }).click();
  await page.getByLabel("Judul", { exact: true }).fill("Anniversary kita");
  await page.getByRole("combobox", { name: "Jenis", exact: true }).selectOption("anniversary");
  await page.getByLabel("Tanggal mulai hubungan").fill("2022-10-28");
  await page.getByRole("button", { name: "Simpan hari spesial" }).click();
  const item = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: "Anniversary kita" }) });
  await expect(item).toBeVisible();
  await expect(item).toContainText("Anniversary ke-");
  await item.getByRole("button", { name: "Ubah Anniversary kita" }).click();
  await page.getByLabel("Judul", { exact: true }).fill("Cerita kita");
  await page.getByRole("button", { name: "Simpan hari spesial" }).click();
  const changed = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: "Cerita kita" }) });
  await changed.getByRole("button", { name: "Tambahkan ke kalender" }).click();
  const link = page.getByRole("link", { name: "Google Calendar", exact: true });
  expect(
    new URL((await link.getAttribute("href"))!).searchParams.get("recur"),
  ).toBe("RRULE:FREQ=YEARLY");
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Kalender iPhone / file .ics" })
    .click();
  expect((await download).suggestedFilename()).toBe("ourstory-pengingat.ics");
  await page.getByRole("button", { name: "Tutup dialog" }).click();
  await changed.getByRole("button", { name: "Hapus Cerita kita" }).click();
  await page
    .getByRole("button", { name: "Hapus hari spesial", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Cerita kita" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("heading", { name: "Bogor weekend" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("missing migration does not hide trip reminders", async ({ page }) => {
  await page.route(
    "https://example.supabase.co/rest/v1/special_days*",
    (route) =>
      route.fulfill({
        status: 404,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify({ code: "PGRST205", message: "missing" }),
      }),
  );
  await page.goto("browser-tests/reminders.html");
  await expect(page.getByRole("alert")).toContainText("004_special_days");
  await expect(
    page.getByRole("button", { name: "Hari spesial", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("heading", { name: "Bogor weekend" }),
  ).toBeVisible();
});
