#!/usr/bin/env node
// Actual SDK authoring -> product export projection -> product browser pixels.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import net from "node:net";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
const library = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
if (args.includes("--help")) {
  console.log(
    "SELECTS_DEV_REPO=/path/to/combined-selects node tools/check_gallery_pixels.mjs [--output=/absolute/new-directory]\nRequires the paired SDK prerequisites, ffmpeg/ffprobe, built video-renderer.wasm and local Chrome/WebGPU. Uses generated fixtures and in-memory repositories; it does not open or install Selects.",
  );
  process.exit(0);
}
if (args.length > 1 || args.some((arg) => !arg.startsWith("--output=")))
  throw Error("Unknown option; use --help.");
if (!process.env.SELECTS_DEV_REPO)
  throw Error("SELECTS_DEV_REPO must identify the paired SDK checkout.");
const sdk = path.resolve(process.env.SELECTS_DEV_REPO),
  wasm = path.join(
    sdk,
    "src/external-services/wasm-video-renderer/video-renderer.wasm",
  );
for (const name of [
  "electron/mcp/script-runtime/sdk.ts",
  "node_modules/vitest/vitest.mjs",
  "node_modules/playwright/index.mjs",
  "node_modules/vite/dist/node/index.js",
])
  if (!fs.existsSync(path.join(sdk, name)))
    throw Error("The selected client lacks " + name);
if (!fs.existsSync(wasm))
  throw Error(
    "Build the client WASM with node scripts/build-video-renderer-wasm.mjs before pixel verification.",
  );
const sdkVersion = spawnSync("git", ["rev-parse", "HEAD"], {
  cwd: sdk,
  encoding: "utf8",
});
if (sdkVersion.status !== 0) throw Error("SDK Git revision unavailable.");
const requested = args[0]?.slice("--output=".length);
if (requested && (!path.isAbsolute(requested) || fs.existsSync(requested)))
  throw Error(
    "Output must be an absolute, new directory. Existing output is preserved.",
  );
const output = requested
  ? path.resolve(requested)
  : fs.mkdtempSync(path.join(os.tmpdir(), "gallery-pixels-"));
if (requested) fs.mkdirSync(output);
const directory = fs.mkdtempSync(path.join(sdk, "validation-gallery-pixels-"));
let server, browser, timeout;
const oracle = JSON.parse(
  fs.readFileSync(
    path.join(library, "plugins/photo-gallery-no2/reference-oracle.json"),
    "utf8",
  ),
);
const moving = new Set(oracle.observedMovingSlots);
function check(rows, fps, variant) {
  const reveals = oracle.revealFrames.map((frame) =>
      Math.round((frame * fps) / oracle.fps),
    ),
    color = Math.round((oracle.colorFrame * fps) / oracle.fps),
    failures = [];
  for (const row of rows) {
    for (let i = 0; i < 21; i++) {
      const rgb = row.cells[i],
        points = row.points[i],
        expected = row.frame >= reveals[i],
        visible = points.some((pixel) => Math.max(...pixel) > 5);
      if (visible !== expected)
        failures.push({
          frame: row.frame,
          slot: i + 1,
          check: "visibility",
          expected,
          rgb,
        });
      if (
        expected &&
        row.frame < color &&
        points.some((pixel) => Math.max(...pixel) - Math.min(...pixel) > 3)
      )
        failures.push({
          frame: row.frame,
          slot: i + 1,
          check: "grayscale",
          rgb,
        });
      if (expected && row.frame >= color && !moving.has(i + 1)) {
        const channel =
          variant === "landscape"
            ? i % 3
            : variant === "portrait"
              ? Math.floor(i / 3) % 3
              : 0;
        if (
          rgb[channel] - Math.max(...rgb.filter((_v, c) => c !== channel)) <
          100
        )
          failures.push({
            frame: row.frame,
            slot: i + 1,
            check: "color-focus",
            expectedChannel: channel,
            rgb,
          });
      }
    }
    row.borders.forEach((rgb, index) => {
      if (Math.max(...rgb) > 3)
        failures.push({ frame: row.frame, check: "border", index, rgb });
    });
  }
  return { reveals, color, failures };
}
try {
  fs.copyFileSync(
    path.join(library, "tests/selects-sdk/gallery-runtime.spec.ts"),
    path.join(directory, "gallery-runtime.spec.ts"),
  );
  fs.copyFileSync(
    path.join(library, "tests/selects-sdk/gallery-pixels.browser.ts"),
    path.join(directory, "browser.ts"),
  );
  fs.writeFileSync(
    path.join(directory, "browser.html"),
    '<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><script type="module" src="./browser.ts"></script>',
  );
  for (const variant of ["plain", "landscape", "portrait", "square"]) {
    const result = spawnSync(
      process.execPath,
      [
        path.join(sdk, "node_modules/vitest/vitest.mjs"),
        "run",
        path.relative(sdk, path.join(directory, "gallery-runtime.spec.ts")),
        "--maxWorkers=1",
        "--testNamePattern=exports the saved Gallery through product projection for pixel validation",
      ],
      {
        cwd: sdk,
        env: {
          ...process.env,
          GALLERY_LIBRARY_ROOT: library,
          GALLERY_RENDER_FIXTURE_DIR: path.join(output, variant),
          GALLERY_RENDER_VARIANT: variant,
        },
        encoding: "utf8",
        timeout: 120000,
      },
    );
    fs.writeFileSync(
      path.join(output, variant + "-sdk.log"),
      (result.stdout ?? "") + (result.stderr ?? ""),
    );
    if (result.error || result.status !== 0)
      throw Error(
        "SDK render projection failed for " +
          variant +
          "; see " +
          path.join(output, variant + "-sdk.log"),
      );
  }
  const { createServer } = await import(
    pathToFileURL(path.join(sdk, "node_modules/vite/dist/node/index.js"))
  );
  const { chromium } = await import(
    pathToFileURL(path.join(sdk, "node_modules/playwright/index.mjs"))
  );
  const reservation = net.createServer();
  await new Promise((resolve, reject) => {
    reservation.once("error", reject);
    reservation.listen(0, "127.0.0.1", resolve);
  });
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  server = await createServer({
    configFile: false,
    root: sdk,
    cacheDir: path.join(output, "vite-cache"),
    resolve: {
      alias: {
        "@": path.join(sdk, "src"),
        "@shared": path.join(sdk, "src/shared"),
      },
    },
    esbuild: { jsx: "automatic" },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "remotion",
        "@remotion/player",
        "mediabunny",
        "html-to-image",
        "sucrase",
      ],
    },
    server: {
      host: "127.0.0.1",
      port,
      strictPort: true,
      fs: { allow: [sdk, output, path.join(sdk, "node_modules")] },
    },
  });
  await server.listen();
  const base = "http://127.0.0.1:" + server.httpServer.address().port;
  browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--enable-unsafe-webgpu"],
  });
  const page = await browser.newPage({
      viewport: { width: 1080, height: 1920 },
    }),
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400)
      errors.push({ url: response.url(), status: response.status() });
  });
  await page.goto(base + "/" + path.relative(sdk, directory) + "/browser.html");
  await page.waitForFunction(
    () => typeof window.galleryRender === "function",
    null,
    { timeout: 60000 },
  );
  await server.waitForRequestsIdle();
  await page.waitForLoadState("networkidle");
  await page.waitForFunction(
    () => typeof window.galleryRender === "function",
    null,
    { timeout: 60000 },
  );
  const summary = {
    sdkRevision: sdkVersion.stdout.trim(),
    platform: process.platform,
    chrome: browser.version(),
    wasmSha256: createHash("sha256")
      .update(fs.readFileSync(wasm))
      .digest("hex"),
    rasterSha256: createHash("sha256")
      .update(
        fs.readFileSync(
          path.join(
            sdk,
            "src/external-services/wasm-video-renderer/programs/CanvasProgramRaster.ts",
          ),
        ),
      )
      .digest("hex"),
    sdkModifiedFiles: spawnSync("git", ["diff", "--name-only"], {
      cwd: sdk,
      encoding: "utf8",
    })
      .stdout.trim()
      .split("\n")
      .filter(Boolean),
    rendererSources: [
      "CanvasProgramRaster.ts",
      "RasterizeProgram.ts",
      "ExportProgramRenderer.tsx",
    ].map((name) => ({
      name,
      sha256: createHash("sha256")
        .update(
          fs.readFileSync(
            path.join(
              sdk,
              "src/external-services/wasm-video-renderer/programs",
              name,
            ),
          ),
        )
        .digest("hex"),
    })),
    variants: [],
    mutations: [],
    errors,
  };
  let plain;
  const render = async (input, frames, saveFrames = []) => {
    try {
      return await Promise.race([
        page.evaluate(
          ({ input, frames, saveFrames }) =>
            window.galleryRender(input, frames, saveFrames),
          { input, frames, saveFrames },
        ),
        new Promise((_resolve, reject) => {
          timeout = setTimeout(
            () => reject(Error("Pixel verification exceeded 180 seconds.")),
            180000,
          );
        }),
      ]);
    } finally {
      clearTimeout(timeout);
    }
  };
  for (const variant of ["plain", "landscape", "portrait", "square"]) {
    const original = JSON.parse(
        fs.readFileSync(
          path.join(output, variant, "render-input.json"),
          "utf8",
        ),
      ),
      mapping = new Map(
        original.files.map((file) => [
          file.originalPath,
          base + "/@fs" + path.join(output, variant, file.filename),
        ]),
      );
    const input = JSON.parse(
      JSON.stringify(original, (_key, value) =>
        typeof value === "string" && mapping.has(value)
          ? mapping.get(value)
          : value,
      ),
    );
    input.files = original.files.map((file) => ({
      ...file,
      url: mapping.get(file.originalPath),
    }));
    const fps = input.remotion.fps,
      color = Math.round((oracle.colorFrame * fps) / oracle.fps),
      reveals = oracle.revealFrames.map((frame) =>
        Math.round((frame * fps) / oracle.fps),
      );
    const frames = Array.from(
        { length: input.scene.durationFrames },
        (_, frame) => frame,
      ),
      saveFrames = [
        ...new Set([
          0,
          ...reveals.flatMap((frame) => [Math.max(0, frame - 1), frame]),
          color - 1,
          color,
          input.scene.durationFrames - 1,
        ]),
      ];
    const rows = await render(input, frames, saveFrames),
      verdict = check(rows, fps, variant);
    fs.mkdirSync(path.join(output, variant, "frames"));
    for (const row of rows) {
      if (row.png)
        fs.writeFileSync(
          path.join(
            output,
            variant,
            "frames",
            String(row.frame).padStart(4, "0") + ".png",
          ),
          Buffer.from(row.png, "base64"),
        );
      delete row.png;
    }
    fs.writeFileSync(
      path.join(output, variant, "pixel-report.json"),
      JSON.stringify({ fps, ...verdict, frames: rows }, null, 2),
    );
    summary.variants.push({
      variant,
      fps,
      frames: rows.length,
      failures: verdict.failures.length,
    });
    console.log(JSON.stringify(summary.variants.at(-1)));
    if (variant === "plain") plain = { input, color, fps };
  }
  for (const kind of ["color-clock", "placement"]) {
    const input = structuredClone(plain.input),
      program = input.remotion.programs.find(
        (program) => program.data.colorAfterLocalFrame === plain.color,
      );
    if (!program) throw Error("First-tile mutation target is unavailable.");
    if (kind === "color-clock") program.data.colorAfterLocalFrame++;
    else {
      const layer = input.scene.procedural.find(
        (layer) => layer.inputId === program.inputId,
      );
      layer.transform[4] += 20;
    }
    const rows = await render(input, [plain.color]),
      verdict = check(rows, plain.fps, "plain");
    const detected =
      kind === "color-clock"
        ? verdict.failures.some(
            (f) => f.slot === 1 && f.check === "color-focus",
          )
        : verdict.failures.some((f) => f.check === "border");
    summary.mutations.push({ kind, detected, failures: verdict.failures });
  }
  fs.writeFileSync(
    path.join(output, "summary.json"),
    JSON.stringify(summary, null, 2),
  );
  console.log(
    JSON.stringify({
      output,
      variants: summary.variants,
      mutations: summary.mutations.map((m) => ({
        kind: m.kind,
        detected: m.detected,
      })),
      errors,
    }),
  );
  if (
    summary.variants.some((v) => v.failures) ||
    summary.mutations.some((m) => !m.detected) ||
    errors.length
  )
    process.exitCode = 1;
} finally {
  clearTimeout(timeout);
  await browser?.close();
  await server?.close();
  fs.rmSync(directory, { recursive: true, force: true });
}
