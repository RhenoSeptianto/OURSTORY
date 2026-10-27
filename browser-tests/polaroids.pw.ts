import { test, expect } from "@playwright/test";
import sharp from "sharp";
test.beforeEach(async ({ page }) => {
  page.on("dialog", (dialog) => void dialog.accept());
  await page.goto("browser-tests/polaroids.html");
  await expect(
    page.getByRole("button", { name: "Atur foto Polaroid", exact: true }),
  ).toBeEnabled();
});
async function edit(page: import("@playwright/test").Page) {
  await page
    .getByRole("button", { name: "Atur foto Polaroid", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
}
test("cancel discards caption, crop, reorder and removal without touching originals", async ({
  page,
}) => {
  const before = await page.evaluate(() => window.polaroidHarness.snapshot());
  await edit(page);
  await page.getByLabel("Caption foto 1").fill("Unsaved caption");
  await page
    .getByRole("button", { name: "Turunkan foto 1", exact: true })
    .click();
  await page.getByRole("button", { name: "Lepas foto 3", exact: true }).click();
  await page
    .getByRole("button", { name: "Atur posisi", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Isi bingkai", exact: true }).click();
  await page.getByLabel("Zoom foto").fill("2");
  await page.getByRole("button", { name: "Batal", exact: true }).click();
  expect(await page.evaluate(() => window.polaroidHarness.snapshot())).toEqual(
    before,
  );
  expect(
    await page.evaluate(() => window.polaroidHarness.storageRemovals),
  ).toEqual([]);
});

test("removing a replacement target closes the chooser and next addition is retained", async ({
  page,
}) => {
  await edit(page);
  await page
    .getByRole("button", { name: "Ganti foto", exact: true })
    .first()
    .click();
  await expect(page.locator(".polaroid-picker")).toBeVisible();
  await page.getByRole("button", { name: "Lepas foto 1", exact: true }).click();
  await expect(page.locator(".polaroid-picker")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Pilih dari Kenangan", exact: true })
    .click();
  await page
    .getByRole("button", { name: /^Pilih foto Album Test .*000000000004$/ })
    .click();
  await expect(page.locator(".polaroid-selection > li")).toHaveCount(3);
  await page
    .getByRole("button", { name: "Simpan Polaroid", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => window.polaroidHarness.snapshot().gallery.photos[2].photo_id,
    ),
  ).toMatch(/000000000004$/);
});
test("save reorders, edits caption/crop, removes selection, and survives reload and a second page", async ({
  page,
  context,
}) => {
  await edit(page);
  await page.getByLabel("Caption foto 1").fill("Our favorite");
  await page
    .getByRole("button", { name: "Turunkan foto 1", exact: true })
    .click();
  await page.getByRole("button", { name: "Lepas foto 3", exact: true }).click();
  await page
    .getByRole("button", { name: "Atur posisi", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Isi bingkai", exact: true }).click();
  await page.getByLabel("Zoom foto").fill("1.5");
  await page.getByLabel("Posisi horizontal").fill("70");
  await page
    .getByRole("button", { name: "Simpan Polaroid", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const stored = await page.evaluate(() => window.polaroidHarness.snapshot());
  expect(stored.gallery.photos).toHaveLength(2);
  expect(stored.gallery.photos[0].zoom).toBe(1.5);
  expect(stored.gallery.photos[0].x).toBe(70);
  expect(stored.gallery.photos[1].caption).toBe("Our favorite");
  expect(stored.data.photos).toHaveLength(8);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Tampilkan foto 2", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Tampilkan foto 3", exact: true }),
  ).toHaveCount(0);
  const other = await context.newPage();
  await other.goto("browser-tests/polaroids.html");
  await expect(
    other.getByRole("button", { name: "Tampilkan foto 2", exact: true }),
  ).toBeVisible();
  await other
    .getByRole("button", { name: "Tampilkan foto 2", exact: true })
    .click();
  await expect(other.locator(".polaroid-caption")).toHaveText("Our favorite");
});
test("zero, first, five and rejected sixth selections; replace does not delete originals", async ({
  page,
}) => {
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.goto("browser-tests/polaroids.html?count=0");
  await expect(page.getByText("Add our first memory ♡")).toBeVisible();
  await edit(page);
  for (let i = 1; i <= 5; i++) {
    await page
      .getByRole("button", { name: "Pilih dari Kenangan", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: new RegExp(
          "^Pilih foto Album Test .*" + String(i).padStart(12, "0") + "$",
        ),
      })
      .click();
  }
  await expect(
    page.getByRole("button", { name: "Pilih dari Kenangan", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Unggah foto baru", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".polaroid-selection > li")).toHaveCount(5);
  await page
    .getByRole("button", { name: "Ganti foto", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: /^Pilih foto Album Test .*000000000006$/ })
    .click();
  await expect(page.locator(".polaroid-selection > li")).toHaveCount(5);
  await page
    .getByRole("button", { name: "Simpan Polaroid", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => window.polaroidHarness.snapshot().data.photos.length,
    ),
  ).toBe(8);
  expect(
    await page.evaluate(() => window.polaroidHarness.storageRemovals),
  ).toEqual([]);
});
test("autoplay pauses for focus, editor and reduced motion; manual navigation resets interval", async ({
  page,
}) => {
  await page.clock.install();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Atur foto Polaroid", exact: true }),
  ).toBeEnabled();
  await page.mouse.move(0, 0);
  const caption = page.locator(".dashboard-polaroid .polaroid-caption");
  await expect(caption).toHaveText("Moment 1");
  await page.clock.runFor(6100);
  await expect(caption).toHaveText("Moment 2");
  await page
    .getByRole("button", { name: "Tampilkan foto 3", exact: true })
    .click();
  await expect(caption).toHaveText("Moment 3");
  await page.clock.runFor(10000);
  await expect(caption).toHaveText("Moment 3");
  await page.locator("body").click({ position: { x: 1, y: 1 } });
  await page.mouse.move(0, 0);
  await page.clock.runFor(5900);
  await expect(caption).toHaveText("Moment 3");
  await page.clock.runFor(200);
  await expect(caption).toHaveText("Moment 1");
  await edit(page);
  await page.clock.runFor(10000);
  await expect(caption).toHaveText("Moment 1");
  await page.getByRole("button", { name: "Batal", exact: true }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.mouse.move(0, 0);
  await page.clock.runFor(15000);
  await expect(caption).toHaveText("Moment 1");
});
test("horizontal swipe changes photo while vertical gesture does not", async ({
  page,
}) => {
  const viewport = page.locator(".dashboard-polaroid .polaroid-viewport");
  await viewport.dispatchEvent("pointerdown", {
    isPrimary: true,
    clientX: 180,
    clientY: 100,
    pointerId: 1,
  });
  await viewport.dispatchEvent("pointerup", {
    isPrimary: true,
    clientX: 100,
    clientY: 105,
    pointerId: 1,
  });
  await expect(page.locator(".polaroid-caption")).toHaveText("Moment 2");
  await viewport.dispatchEvent("pointerdown", {
    isPrimary: true,
    clientX: 180,
    clientY: 100,
    pointerId: 1,
  });
  await viewport.dispatchEvent("pointerup", {
    isPrimary: true,
    clientX: 175,
    clientY: 180,
    pointerId: 1,
  });
  await expect(page.locator(".polaroid-caption")).toHaveText("Moment 2");
});
test("concurrent update is rejected and local caption survives failure", async ({
  page,
}) => {
  await edit(page);
  await page.getByLabel("Caption foto 1").fill("My unsaved edit");
  await page.evaluate(() => {
    const next = window.polaroidHarness.snapshot().gallery.photos;
    next[0].caption = "Other device";
    window.polaroidHarness.remote(next);
  });
  await expect(
    page.getByText("Pilihan bersama telah diperbarui", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Simpan Polaroid", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("perangkat lain");
  await expect(page.getByLabel("Caption foto 1")).toHaveValue(
    "My unsaved edit",
  );
  expect(
    await page.evaluate(
      () => window.polaroidHarness.snapshot().gallery.photos[0].caption,
    ),
  ).toBe("Other device");
});
test("new upload is deferred, retry is safe, and saved files remain Memories photos", async ({
  page,
}) => {
  const image = await sharp({
    create: { width: 120, height: 180, channels: 3, background: "#8ea99a" },
  })
    .png()
    .toBuffer();
  await edit(page);
  await page
    .getByLabel("Unggah foto Polaroid")
    .setInputFiles({ name: "new.png", mimeType: "image/png", buffer: image });
  await expect(page.locator(".polaroid-selection > li")).toHaveCount(4);
  expect(
    await page.evaluate(() => window.polaroidHarness.storageUploads.length),
  ).toBe(0);
  await page.evaluate(() => {
    window.polaroidHarness.failUploads = 1;
  });
  await page
    .getByRole("button", { name: "Simpan Polaroid", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Unggah gagal");
  await expect(page.locator(".polaroid-selection > li")).toHaveCount(4);
  await page
    .getByRole("button", { name: "Simpan Polaroid", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const snapshot = await page.evaluate(() => window.polaroidHarness.snapshot());
  expect(snapshot.data.photos).toHaveLength(9);
  expect(snapshot.gallery.photos).toHaveLength(4);
});
test("cancel new local image never uploads; missing migration and offline are safe", async ({
  page,
  context,
}) => {
  const image = await sharp({
    create: { width: 30, height: 30, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  await edit(page);
  await page
    .getByLabel("Unggah foto Polaroid")
    .setInputFiles({ name: "test.png", mimeType: "image/png", buffer: image });
  await expect(page.locator(".polaroid-selection > li")).toHaveCount(4);
  await page.getByRole("button", { name: "Batal", exact: true }).click();
  expect(
    await page.evaluate(() => window.polaroidHarness.storageUploads),
  ).toEqual([]);
  await context.setOffline(true);
  await expect(
    page.getByRole("button", { name: "Atur foto Polaroid", exact: true }),
  ).toBeDisabled();
  await context.setOffline(false);
  await page.goto("browser-tests/polaroids.html?missing=1");
  await expect(
    page.getByText("Galeri dashboard belum diaktifkan.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Atur foto Polaroid", exact: true }),
  ).toBeDisabled();
});
test("source removal is omitted and editor remains responsive with safe touch controls", async ({
  page,
}, info) => {
  await page.evaluate(() => {
    const id = window.polaroidHarness.snapshot().gallery.photos[0].photo_id;
    window.polaroidHarness.dropPhoto(id);
  });
  await expect(
    page.getByRole("button", { name: "Tampilkan foto 3", exact: true }),
  ).toHaveCount(0);
  await edit(page);
  await expect(page.locator(".polaroid-selection > li")).toHaveCount(3);
  await page
    .getByRole("button", { name: "Simpan Polaroid", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("belum tersedia");
  await page.getByRole("button", { name: "Lepas foto 1", exact: true }).click();
  await expect(page.locator(".polaroid-selection > li")).toHaveCount(2);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/polaroid-editor-${info.project.name}.png`,
    fullPage: true,
  });
});

test("one photo has no autoplay and image load failure stays inside its frame", async ({
  page,
}) => {
  await page.clock.install();
  await page.evaluate(() => localStorage.clear());
  await page.goto("browser-tests/polaroids.html?count=1");
  await expect(
    page.getByRole("button", { name: "Atur foto Polaroid", exact: true }),
  ).toBeEnabled();
  await page.clock.runFor(20000);
  await expect(page.locator(".polaroid-caption")).toHaveText("Moment 1");
  await expect(
    page.getByRole("button", { name: /Tampilkan foto/ }),
  ).toHaveCount(0);
  const image = page.locator(".polaroid-layer.is-current img");
  await expect(image).toBeVisible();
  await image.dispatchEvent("error");
  await expect(
    page.locator(".polaroid-layer.is-current").getByText("Foto tidak tersedia"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Atur foto Polaroid", exact: true }),
  ).toBeEnabled();
});
test("autoplay stops in a hidden tab and resumes after visibility returns", async ({
  page,
}) => {
  await page.clock.install();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Atur foto Polaroid", exact: true }),
  ).toBeEnabled();
  await page.mouse.move(0, 0);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(20000);
  await expect(page.locator(".polaroid-caption")).toHaveText("Moment 1");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(6100);
  await expect(page.locator(".polaroid-caption")).toHaveText("Moment 2");
});
test("config failure preserves committed uploads and retry does not duplicate storage", async ({
  page,
}) => {
  const image = await sharp({
    create: { width: 40, height: 60, channels: 3, background: "#d39ba8" },
  })
    .png()
    .toBuffer();
  await edit(page);
  await page
    .getByLabel("Unggah foto Polaroid")
    .setInputFiles({ name: "new.png", mimeType: "image/png", buffer: image });
  await expect(page.locator(".polaroid-selection > li")).toHaveCount(4);
  await page.evaluate(() => {
    window.polaroidHarness.failConfig = true;
  });
  await page
    .getByRole("button", { name: "Simpan Polaroid", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Pengaturan gagal");
  expect(
    await page.evaluate(
      () => window.polaroidHarness.snapshot().data.photos.length,
    ),
  ).toBe(9);
  expect(
    await page.evaluate(() => window.polaroidHarness.storageUploads.length),
  ).toBe(1);
  await page.evaluate(() => {
    window.polaroidHarness.failConfig = false;
  });
  await page
    .getByRole("button", { name: "Simpan Polaroid", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(() => window.polaroidHarness.storageUploads.length),
  ).toBe(1);
  expect(
    await page.evaluate(() => window.polaroidHarness.storageRemovals.length),
  ).toBe(0);
});
test("failed photo metadata cleans up uncommitted object and allows retry", async ({
  page,
}) => {
  const image = await sharp({
    create: { width: 30, height: 50, channels: 3, background: "#8ea99a" },
  })
    .png()
    .toBuffer();
  await edit(page);
  await page
    .getByLabel("Unggah foto Polaroid")
    .setInputFiles({ name: "new.png", mimeType: "image/png", buffer: image });
  await expect(page.locator(".polaroid-selection > li")).toHaveCount(4);
  await page.evaluate(() => {
    window.polaroidHarness.failMetadata = true;
  });
  await page
    .getByRole("button", { name: "Simpan Polaroid", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Metadata gagal");
  expect(
    await page.evaluate(() => window.polaroidHarness.storageRemovals.length),
  ).toBe(1);
  expect(
    await page.evaluate(
      () => window.polaroidHarness.snapshot().data.photos.length,
    ),
  ).toBe(8);
  await page.evaluate(() => {
    window.polaroidHarness.failMetadata = false;
  });
  await page
    .getByRole("button", { name: "Simpan Polaroid", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => window.polaroidHarness.snapshot().data.photos.length,
    ),
  ).toBe(9);
});
test("crop is reversible and the editor fits narrow phones and tablet", async ({
  page,
}, info) => {
  await edit(page);
  await page
    .getByRole("button", { name: "Atur posisi", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Isi bingkai", exact: true }).click();
  await page.getByLabel("Zoom foto").fill("2");
  await page.getByLabel("Posisi horizontal").fill("80");
  const box = await page.locator(".crop-viewport").boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box!.x + box!.width / 2 - 35,
    box!.y + box!.height / 2 + 15,
    { steps: 5 },
  );
  await page.mouse.up();
  await expect(page.getByLabel("Posisi horizontal")).not.toHaveValue("80");
  await page.getByRole("button", { name: "Reset posisi", exact: true }).click();
  await expect(page.getByLabel("Zoom foto")).toHaveValue("1");
  await expect(page.getByLabel("Posisi horizontal")).toHaveValue("50");
  await expect(
    page.getByRole("button", { name: "Foto utuh", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
    const button = await page
      .getByRole("button", { name: "Simpan Polaroid", exact: true })
      .boundingBox();
    expect(button!.height).toBeGreaterThanOrEqual(44);
    await page.screenshot({
      path: `test-results/polaroid-${info.project.name}-${width}.png`,
      fullPage: true,
    });
  }
});
