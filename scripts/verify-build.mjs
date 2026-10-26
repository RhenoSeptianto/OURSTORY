import { readFile, access } from "node:fs/promises";
import assert from "node:assert/strict";
const html = await readFile("dist/index.html", "utf8");
const manifest = JSON.parse(
  await readFile("dist/manifest.webmanifest", "utf8"),
);
assert.equal(manifest.display, "standalone");
assert.equal(manifest.lang, "id");
assert.ok(manifest.start_url.endsWith("/"));
assert.equal(manifest.scope, manifest.start_url);
for (const icon of manifest.icons) await access("dist/" + icon.src);
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  const url = match[1];
  if (url.startsWith("http")) continue;
  const path = url.startsWith(manifest.start_url)
    ? url.slice(manifest.start_url.length)
    : url.replace(/^\//, "");
  await access("dist/" + path);
}
const sw = await readFile("dist/sw.js", "utf8");
assert.ok(!sw.includes("supabase.co"));
assert.ok(sw.includes("index.html"));
assert.ok(sw.includes("precacheAndRoute"));
console.log(
  "PASS: project-path assets, manifest icons/scope, standalone mode, Indonesian locale, app-shell-only precache",
);
