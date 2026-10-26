// Run against `VITE_BASE_PATH=/OURSTORY/ npm run preview -- --port 4173`.
// Uses an existing Chrome installation; never uses the user's normal browser profile.
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
const chrome =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const profile = await mkdtemp(join(tmpdir(), "ourstory-chrome-qa-"));
const browser = spawn(
  chrome,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-debugging-port=9223",
    `--user-data-dir=${profile}`,
  ],
  { windowsHide: true, stdio: "ignore" },
);
let socket;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
try {
  let pages;
  for (let i = 0; i < 50; i++) {
    try {
      pages = await (await fetch("http://127.0.0.1:9223/json/list")).json();
      break;
    } catch {
      await delay(100);
    }
  }
  assert.ok(pages, "Chrome debugging endpoint unavailable");
  socket = new WebSocket(
    pages.find((p) => p.type === "page").webSocketDebuggerUrl,
  );
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  let seq = 0;
  const pending = new Map(),
    exceptions = [];
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const request = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) request.reject(Error(JSON.stringify(message.error)));
      else request.resolve(message.result);
    } else if (message.method === "Runtime.exceptionThrown")
      exceptions.push(message.params.exceptionDetails);
  };
  const call = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++seq;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id);
          reject(Error("CDP timed out: " + method));
        }
      }, 15000).unref();
    });
  const evaluate = async (expression) => {
    const r = await call("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails));
    return r.result.value;
  };
  await call("Runtime.enable");
  await call("Page.enable");
  await call("Network.enable");
  await mkdir("test-results", { recursive: true });
  await call("Page.navigate", { url: "http://127.0.0.1:4173/OURSTORY/" });
  await delay(300);
  await evaluate("sessionStorage.setItem('ots-guest-mode','1')");
  for (const width of [320, 390, 768, 1440]) {
    await call("Emulation.setDeviceMetricsOverride", {
      width,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: width <= 650,
    });
    await call("Page.navigate", {
      url: "http://127.0.0.1:4173/OURSTORY/#/trips",
    });
    let ready = false;
    for (let i = 0; i < 50; i++) {
      ready = await evaluate("Boolean(document.querySelector('.welcome'))");
      if (ready) break;
      await delay(100);
    }
    assert.ok(ready, "Setup screen failed to render");
    assert.equal(
      await evaluate(
        "Boolean(document.querySelector('.guest-entry,.guest-banner,.app-shell'))",
      ),
      false,
      "Legacy guest flag bypassed login",
    );
    const dimensions = await evaluate(
      "({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth})",
    );
    assert.ok(
      dimensions.scroll <= dimensions.width,
      `Horizontal overflow at ${width}px: ${JSON.stringify(dimensions)}`,
    );
    const screenshot = await call("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
    });
    await writeFile(
      `test-results/setup-${width}.png`,
      Buffer.from(screenshot.data, "base64"),
    );
    console.log(
      `PASS: login/setup render and no horizontal overflow at ${width}px`,
    );
  }
  const scope = await evaluate(
    "Promise.race([navigator.serviceWorker.ready.then(r=>r.scope),new Promise(resolve=>setTimeout(()=>resolve('timeout'),8000))])",
  );
  assert.ok(
    scope.endsWith("/OURSTORY/"),
    "Service worker scope mismatch: " + scope,
  );
  await delay(500);
  await call("Page.reload");
  await delay(700);
  assert.ok(
    await evaluate("Boolean(navigator.serviceWorker.controller)"),
    "Service worker not controlling page",
  );
  await call("Network.emulateNetworkConditions", {
    offline: true,
    latency: 0,
    downloadThroughput: 0,
    uploadThroughput: 0,
  });
  await call("Page.reload");
  await delay(700);
  assert.ok(
    await evaluate("Boolean(document.querySelector('.welcome'))"),
    "Offline app shell failed",
  );
  assert.equal(exceptions.length, 0, JSON.stringify(exceptions));
  console.log(
    "PASS: service worker controls project path, offline app-shell reload, no uncaught JS exceptions",
  );
} finally {
  socket?.close();
  browser.kill();
}
