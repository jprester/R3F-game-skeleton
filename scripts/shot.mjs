// Headless screenshot tool for the R3F scene.
//
// Loads the running dev server in headless Chromium (WebGL via SwiftShader),
// optionally aims the camera, advances a few frames so animated shaders settle,
// then writes a PNG. Pairs with the in-app debug hooks: window.advanceTime,
// window.setCameraOrientation, window.render_game_to_text (see Scene.tsx).
//
// Usage:
//   npm run dev                      # in one terminal (serves :3000)
//   node scripts/shot.mjs --out screenshots/sun.png --yaw 0 --pitch 0.05
//
// Flags (all optional):
//   --url <url>      default http://localhost:3000/?qa=1  (qa=1 hides the UI overlay)
//   --out <path>     default screenshots/shot.png
//   --yaw <rad>      camera yaw   (0 = looking toward -z, the sun)
//   --pitch <rad>    camera pitch (+ looks up)
//   --width <px>     default 1280
//   --height <px>    default 720
//   --frames <n>     advanceTime() calls before capture, default 12
//   --wait <ms>      extra settle time for async asset loads, default 1500

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}

const url = arg("url", "http://localhost:3000/?qa=1");
const out = arg("out", "screenshots/shot.png");
const yaw = arg("yaw", null);
const pitch = arg("pitch", null);
const width = Number(arg("width", "1280"));
const height = Number(arg("height", "720"));
const frames = Number(arg("frames", "12"));
const settle = Number(arg("wait", "1500"));

const browser = await chromium.launch({
  headless: true,
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
  ],
});

const page = await browser.newPage({
  viewport: { width, height },
  deviceScaleFactor: 1,
});

const problems = [];
page.on("console", (m) => {
  if (m.type() === "error") problems.push(`console: ${m.text()}`);
});
page.on("pageerror", (e) => problems.push(`pageerror: ${e.message ?? e}`));

try {
  // "load" rather than "networkidle": Vite's persistent HMR connection keeps the
  // network from ever going idle. Scene readiness is handled by waitForFunction below.
  await page.goto(url, { waitUntil: "load", timeout: 30000 });

  // setCameraOrientation only exists once <Scene> has mounted, which means its
  // floor/water textures have loaded — a reliable "scene is up" signal.
  await page.waitForFunction(
    () => typeof window.setCameraOrientation === "function" &&
          typeof window.advanceTime === "function",
    null,
    { timeout: 30000 },
  );

  if (yaw !== null || pitch !== null) {
    await page.evaluate(
      ([y, p]) => window.setCameraOrientation(y, p),
      [Number(yaw ?? 0), Number(pitch ?? 0)],
    );
  }

  // Let remaining GLTFs finish, then pump frames so water/sky/clouds advance.
  await page.waitForTimeout(settle);
  for (let i = 0; i < frames; i++) {
    await page.evaluate(() => window.advanceTime?.(16));
  }

  const state = await page.evaluate(() => window.render_game_to_text?.() ?? null);

  await mkdir(dirname(out), { recursive: true });
  await page.screenshot({ path: out });

  console.log(`Saved ${out} (${width}x${height})`);
  if (state) console.log("render_game_to_text:", state);
  if (problems.length) {
    console.log(`\n${problems.length} page problem(s):`);
    for (const p of problems) console.log("  -", p);
  }
} finally {
  await browser.close();
}
