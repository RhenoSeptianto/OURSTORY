import { test, expect } from "@playwright/test";
import { themes } from "../src/themes";
test("seven themes remain readable, preserve photos and persist after reload", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("browser-tests/themes.html");
  await expect(
    page.getByRole("group", { name: "Pilih tema" }).getByRole("button"),
  ).toHaveCount(7);
  for (const theme of themes) {
    await page.getByRole("button", { name: new RegExp(theme.name) }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme.id);
    await expect(page.locator(`.scene-${theme.id}`)).toBeVisible();
    expect(
      await page
        .locator(".banner-scene")
        .evaluateAll(
          (nodes) =>
            nodes.filter((n) => getComputedStyle(n).display !== "none").length,
        ),
    ).toBe(1);
    await expect(page.locator(".banner-backdrop")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(
      await page
        .locator(".banner-backdrop")
        .evaluate((el) => getComputedStyle(el).pointerEvents),
    ).toBe("none");
    await expect(
      page.getByRole("button", { name: new RegExp(theme.name) }),
    ).toHaveAttribute("aria-pressed", "true");
    const visual = await page.evaluate(() => {
      const ratio = (a: string, b: string) => {
        const lum = (s: string) => {
          const v = (s.match(/[\d.]+/g) || [])
            .slice(0, 3)
            .map(Number)
            .map((x) => {
              const v = x / 255;
              return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
            });
          return v[0] * 0.2126 + v[1] * 0.7152 + v[2] * 0.0722;
        };
        const l1 = lum(a),
          l2 = lum(b);
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      };
      const input = getComputedStyle(document.querySelector("input")!);
      const panel = getComputedStyle(document.querySelector(".panel")!);
      const p = getComputedStyle(document.querySelector(".panel p")!);
      const button = getComputedStyle(
        document.querySelector(".actions button")!,
      );
      const image = getComputedStyle(document.querySelector("img")!);
      return {
        input: ratio(input.color, input.backgroundColor),
        body: ratio(p.color, panel.backgroundColor),
        button: ratio(button.color, button.backgroundColor),
        filter: image.filter,
        opacity: image.opacity,
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    expect(visual.input, theme.id + " input").toBeGreaterThanOrEqual(4.5);
    expect(visual.body, theme.id + " text").toBeGreaterThanOrEqual(4.5);
    expect(visual.button, theme.id + " button").toBeGreaterThanOrEqual(4.5);
    expect(visual.filter).toBe("none");
    expect(visual.opacity).toBe("1");
    expect(visual.overflow).toBe(false);
    await page.screenshot({
      path: testInfo.outputPath(`${theme.id}.png`),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Simpan", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Selesai", exact: true }).click();
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme.id);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      "content",
      theme.colors[0],
    );
  }
});

test("plain banner preference persists and does not reset when the theme changes", async ({
  page,
}) => {
  await page.goto("browser-tests/themes.html");
  const preference = page.getByRole("combobox", {
    name: "Background banner",
    exact: true,
  });
  await expect(page.locator(".banner-backdrop")).toBeVisible();
  await preference.selectOption("plain");
  await expect(page.locator(".banner-backdrop")).toBeHidden();
  await page.getByRole("button", { name: /Plum Love/ }).click();
  await expect(page.locator(".banner-backdrop")).toBeHidden();
  await page.reload();
  await expect(preference).toHaveValue("plain");
  await expect(page.locator(".banner-backdrop")).toBeHidden();
  await preference.selectOption("theme");
  await expect(page.locator(".scene-plum")).toBeVisible();
  await page
    .getByRole("button", { name: "Jelajahi perjalanan kita", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Selesai", exact: true }).click();
  await page.reload();
  await expect(preference).toHaveValue("theme");
  await expect(page.locator(".scene-plum")).toBeVisible();
});
test("legacy sage selection works and unavailable storage does not break theme selection", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("ots-theme", "sage"));
  await page.goto("browser-tests/themes.html");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "sage");
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw Error("Storage disabled");
    };
  });
  await page.getByRole("button", { name: /Black Valentine/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "black");
});
