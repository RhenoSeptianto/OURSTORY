import { test, expect } from "@playwright/test";
import sharp from "sharp";
function noise(width: number, height: number, alpha = false) {
  const pixels = Buffer.alloc(width * height * (alpha ? 4 : 3));
  let state = 42;
  for (let i = 0; i < pixels.length; i++) {
    state = (state * 1664525 + 1013904223) >>> 0;
    pixels[i] = alpha && i % 4 === 3 ? 127 : state >>> 24;
  }
  return sharp(pixels, { raw: { width, height, channels: alpha ? 4 : 3 } });
}
test.beforeEach(async ({ page }) => {
  await page.goto("./");
});
test("large gallery image survives native encoder differences and stays within storage limits", async ({
  page,
}, info) => {
  const input = await noise(3000, 2000).png().toBuffer();
  const result = await page.evaluate(
    async ({ encoded }) => {
      const { optimize } = await import("/OURSTORY/src/images.ts");
      const file = new File(
        [Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0))],
        "gallery.png",
        { type: "image/png" },
      );
      const sample = document.createElement("canvas");
      sample.width = sample.height = 1;
      const probe = await new Promise<Blob | null>((resolve) =>
        sample.toBlob(resolve, "image/webp", 0.8),
      );
      const output = await optimize(file);
      const bitmap = await createImageBitmap(output);
      const dimensions = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return {
        probe: probe?.type,
        type: output.type,
        bytes: output.size,
        ...dimensions,
        inputBytes: file.size,
      };
    },
    { encoded: input.toString("base64") },
  );
  expect(result.inputBytes).toBeGreaterThan(1_500_000);
  expect(result.bytes).toBeLessThanOrEqual(1_500_000);
  expect(result.width).toBeLessThanOrEqual(1800);
  expect(result.width / result.height).toBeCloseTo(1.5, 2);
  expect(result.type).toBe(
    result.probe === "image/webp" ? "image/webp" : "image/jpeg",
  );
  await info.attach("native-encoder-result", {
    body: JSON.stringify(result),
    contentType: "application/json",
  });
  console.log(info.project.name, JSON.stringify(result));
});
test("unsupported WebP falls back automatically without asking user to convert the image", async ({
  page,
}) => {
  const input = await noise(800, 600).png().toBuffer();
  const result = await page.evaluate(
    async ({ encoded }) => {
      const { optimize } = await import("/OURSTORY/src/images.ts");
      const original = HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
        return original.call(
          this,
          callback,
          type === "image/webp" ? "image/png" : type,
          quality,
        );
      };
      try {
        const blob = await optimize(
          new File(
            [Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0))],
            "photo.png",
            { type: "image/png" },
          ),
          { maxBytes: 40000 },
        );
        const image = await createImageBitmap(blob);
        const dimensions = { width: image.width, height: image.height };
        image.close();
        return { type: blob.type, size: blob.size, ...dimensions };
      } finally {
        HTMLCanvasElement.prototype.toBlob = original;
      }
    },
    { encoded: input.toString("base64") },
  );
  expect(result.type).toBe("image/jpeg");
  expect(result.size).toBeLessThanOrEqual(40000);
  expect(result.width / result.height).toBeCloseTo(4 / 3, 1);
  expect(result.width).toBeLessThan(800);
});
test("transparent image keeps its alpha while resizing to fit an upload", async ({
  page,
}) => {
  const input = await noise(600, 400, true).png().toBuffer();
  const result = await page.evaluate(
    async ({ encoded }) => {
      const { optimize, imageExtension } =
        await import("/OURSTORY/src/images.ts");
      const original = HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
        return original.call(
          this,
          callback,
          type === "image/webp" ? "image/png" : type,
          quality,
        );
      };
      try {
        const blob = await optimize(
          new File(
            [Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0))],
            "transparent.png",
            { type: "image/png" },
          ),
          { maxBytes: 32000 },
        );
        const bitmap = await createImageBitmap(blob);
        const c = document.createElement("canvas");
        c.width = bitmap.width;
        c.height = bitmap.height;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(bitmap, 0, 0);
        const alpha = ctx.getImageData(0, 0, 1, 1).data[3];
        bitmap.close();
        return {
          type: blob.type,
          size: blob.size,
          width: c.width,
          height: c.height,
          alpha,
          extension: imageExtension(blob.type),
        };
      } finally {
        HTMLCanvasElement.prototype.toBlob = original;
      }
    },
    { encoded: input.toString("base64") },
  );
  expect(result.type).toBe("image/png");
  expect(result.extension).toBe("png");
  expect(result.size).toBeLessThanOrEqual(32000);
  expect(result.alpha).toBeGreaterThan(0);
  expect(result.alpha).toBeLessThan(255);
  expect(result.width).toBeLessThan(600);
  expect(result.width / result.height).toBeCloseTo(1.5, 1);
});
test("native decoder honors EXIF rotation and optimized copy strips metadata", async ({
  page,
}) => {
  const input = await sharp({
    create: { width: 120, height: 80, channels: 3, background: "#d39ba8" },
  })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();
  const result = await page.evaluate(
    async ({ encoded }) => {
      const { optimize } = await import("/OURSTORY/src/images.ts");
      const file = new File(
        [Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0))],
        "rotated.jpg",
        { type: "image/jpeg" },
      );
      const output = await optimize(file);
      return {
        bytes: [...new Uint8Array(await output.arrayBuffer())],
        originalSize: file.size,
      };
    },
    { encoded: input.toString("base64") },
  );
  const metadata = await sharp(Buffer.from(result.bytes)).metadata();
  expect(metadata.width).toBe(80);
  expect(metadata.height).toBe(120);
  expect(metadata.orientation).toBeUndefined();
  expect(metadata.exif).toBeUndefined();
  expect(result.originalSize).toBe(input.length);
});
test("unknown-MIME gallery file is decoded; corrupt files and non-images get clear errors", async ({
  page,
}) => {
  const input = await sharp({
    create: { width: 32, height: 24, channels: 3, background: "green" },
  })
    .png()
    .toBuffer();
  const result = await page.evaluate(
    async ({ encoded }) => {
      const { optimize } = await import("/OURSTORY/src/images.ts");
      const valid = await optimize(
        new File(
          [Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0))],
          "gallery.png",
          { type: "" },
        ),
      );
      let corrupt = "",
        notImage = "";
      try {
        await optimize(
          new File(["not a valid image"], "broken.heic", {
            type: "image/heic",
          }),
        );
      } catch (e) {
        corrupt = (e as Error).message;
      }
      try {
        await optimize(new File(["test"], "notes.txt", { type: "text/plain" }));
      } catch (e) {
        notImage = (e as Error).message;
      }
      return { bytes: valid.size, corrupt, notImage };
    },
    { encoded: input.toString("base64") },
  );
  expect(result.bytes).toBeGreaterThan(0);
  expect(result.corrupt).toContain("belum bisa membaca");
  expect(result.notImage).toContain("bukan gambar");
});

test("upload control accepts gallery images and sends a MIME-matched optimized file", async ({
  page,
}) => {
  await page.goto("browser-tests/upload.html");
  const input = page.locator("input[type=file]");
  await expect(input).toHaveAttribute("accept", /image\/\*/);
  const photo = await noise(800, 600).png().toBuffer();
  await input.setInputFiles({
    name: "gallery-photo.png",
    mimeType: "image/png",
    buffer: photo,
  });
  await expect(page.locator("body")).toHaveAttribute("data-saved", "yes");
  const sent = await page.evaluate(() => {
    const w = window as unknown as {
      uploadCalls: {
        path: string;
        type: string;
        bytes: number;
        contentType: string;
      }[];
    };
    return w.uploadCalls;
  });
  expect(sent).toHaveLength(1);
  expect(sent[0].bytes).toBeLessThanOrEqual(1_500_000);
  expect(sent[0].contentType).toBe(sent[0].type);
  const extension =
    sent[0].type === "image/webp"
      ? "webp"
      : sent[0].type === "image/png"
        ? "png"
        : "jpg";
  expect(sent[0].path).toMatch(new RegExp("\\." + extension + "$"));
  await expect(input).toBeEnabled();
  await expect(input).toHaveValue("");
});
