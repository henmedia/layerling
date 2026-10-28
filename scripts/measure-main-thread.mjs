#!/usr/bin/env node
/*
 * How long heavy actions block the page's main thread - the time the editor cannot answer a
 * click, a key or the mouse. Each action runs in a fresh editor; what it needs (bodies, a file)
 * is set up first and not measured. During the action a PerformanceObserver records every long
 * task (a stretch of 50 ms or more in which the main thread did nothing else), a 10 ms timer
 * records how late it comes (the delay a click or a key would have), and requestAnimationFrame the
 * longest wait between two painted frames. The table gives the action's duration, the sum and the
 * longest of the long tasks, the longest input delay, the longest frame gap, and whether the page
 * froze (an input delay of 200 ms or more: a click then visibly waits). A frame gap without input
 * delay is the GPU or the compositor, not the main thread (software rendering in a container).
 *
 * It drives the editor through the MCP bridge and, for STEP export and opening a .lyl file, the
 * real buttons. Measure a production build, the development build is several times slower:
 *
 *   npm run build
 *   LAYERLING_MCP_REMOTE=true LAYERLING_MCP_TOKEN=measure-token-0123456789 npx next start apps/web -p 3021
 *   node scripts/measure-main-thread.mjs --url http://localhost:3021 --token measure-token-0123456789
 *
 * Options: --only <action,...>  --runs <n> (default 2, the table shows the median)  --json <file>
 *          --gpu (draw with the graphics card; without it SwiftShader, as in a container)
 *          --channel msedge (an installed browser instead of Playwright's Chromium)
 * The test data is made here, the same at every run: a sphere of about 300,000 triangles as
 * binary STL and as OBJ, 60 boxes with 20 cylinder holes, and so on.
 */
import { createRequire } from "node:module";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const option = (name, fallback) => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
};
const BASE = option("url", "http://localhost:3021").replace(/\/$/, "");
const TOKEN = option("token", process.env.LAYERLING_MCP_TOKEN ?? "");
const RUNS = Number(option("runs", "2"));
const ONLY = option("only", "")?.split(",").filter(Boolean);
const JSON_OUT = option("json", "");
/** A folder to write a CPU profile of each measured run into (Chrome DevTools opens .cpuprofile files). */
const PROFILE_DIR = option("profile", "");
const GPU = process.argv.includes("--gpu");
/** An installed browser instead of Playwright's own Chromium, such as "msedge" or "chrome". */
const CHANNEL = option("channel", "");
const FREEZE_MS = 200;
const scratch = mkdtempSync(join(tmpdir(), "layerling-measure-"));
// The test files run to 45 MB; they go with the run, also when it stops on an error.
process.on("exit", () => rmSync(scratch, { recursive: true, force: true }));

// ---- Test data -------------------------------------------------------------------------------

/** A UV sphere as triangles: [ax, ay, az, bx, by, bz, cx, cy, cz] each, in mm, Y up. */
function sphereTriangles(rings, segments, radius = 40, center = [0, radius, 0]) {
  const point = (ring, segment) => {
    const theta = (ring / rings) * Math.PI;
    const phi = (segment / segments) * Math.PI * 2;
    return [center[0] + radius * Math.sin(theta) * Math.cos(phi), center[1] + radius * Math.cos(theta), center[2] + radius * Math.sin(theta) * Math.sin(phi)];
  };
  const triangles = [];
  for (let ring = 0; ring < rings; ring += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const a = point(ring, segment), b = point(ring + 1, segment), c = point(ring + 1, segment + 1), d = point(ring, segment + 1);
      // Two triangles per patch, facing out; at the poles one of them has no area and is left out.
      if (ring < rings - 1) triangles.push([...a, ...c, ...b]);
      if (ring > 0) triangles.push([...a, ...d, ...c]);
    }
  }
  return triangles;
}

function binaryStl(triangles) {
  const buffer = Buffer.alloc(84 + triangles.length * 50);
  buffer.writeUInt32LE(triangles.length, 80);
  triangles.forEach((t, i) => {
    const o = 84 + i * 50;
    // STL is Z up: (x, y, z) of the editor become (x, -z, y).
    for (let k = 0; k < 3; k += 1) {
      buffer.writeFloatLE(t[k * 3], o + 12 + k * 12);
      buffer.writeFloatLE(-t[k * 3 + 2], o + 16 + k * 12);
      buffer.writeFloatLE(t[k * 3 + 1], o + 20 + k * 12);
    }
  });
  return buffer;
}

function objText(triangles) {
  const lines = [];
  triangles.forEach((t) => { for (let k = 0; k < 3; k += 1) lines.push(`v ${t[k * 3].toFixed(4)} ${t[k * 3 + 1].toFixed(4)} ${t[k * 3 + 2].toFixed(4)}`); });
  triangles.forEach((_, i) => lines.push(`f ${i * 3 + 1} ${i * 3 + 2} ${i * 3 + 3}`));
  return lines.join("\n");
}

const bigSphere = sphereTriangles(274, 548); // about 300,000 triangles
const midSphere = sphereTriangles(158, 316, 30); // about 100,000 triangles
const cutSphere = sphereTriangles(224, 448); // about 200,000: under the cut limit of 250,000 a new design starts with
const bigStl = binaryStl(bigSphere).toString("base64");
const midStl = binaryStl(midSphere).toString("base64");
const bigObj = objText(bigSphere);
const cutStl = binaryStl(cutSphere).toString("base64");

// ---- Editor and bridge -----------------------------------------------------------------------

let editorNumber = 1;
async function mcp(action, params = {}, timeoutMs = 300000) {
  const response = await fetch(`${BASE}/api/layerling-mcp`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) },
    body: JSON.stringify({ type: "command", editorNumber, action, params, timeoutMs }),
  });
  const result = await response.json();
  if (!result.ok) throw new Error(`${action}: ${result.error ?? JSON.stringify(result).slice(0, 300)}`);
  return result.data;
}

async function listEditors() {
  const response = await fetch(`${BASE}/api/layerling-mcp`, { headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {} });
  return (await response.json()).editors ?? [];
}

/** Waits for an editor that was not in `before` and talks to it from now on. */
async function newestEditor(before = []) {
  const known = new Set(before.map((editor) => editor.editorNumber));
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const fresh = (await listEditors()).filter((editor) => !known.has(editor.editorNumber));
    if (fresh.length) { editorNumber = fresh[fresh.length - 1].editorNumber; return; }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("no new editor connected to the bridge");
}

async function openEditor(context) {
  const page = await context.newPage();
  page.on("pageerror", (error) => console.error("page error:", error.message));
  await page.addInitScript(() => {
    window.__longTasks = [];
    new PerformanceObserver((list) => { for (const entry of list.getEntries()) window.__longTasks.push(entry.duration); }).observe({ type: "longtask" });
    // A second, independent view: the longest wait between two frames the page could paint.
    window.__frameGap = 0;
    let last = performance.now();
    const frame = (now) => { window.__frameGap = Math.max(window.__frameGap, now - last); last = now; requestAnimationFrame(frame); };
    requestAnimationFrame(frame);
    // And the one a click feels: how late a 10 ms timer comes when the main thread is busy.
    window.__lag = 0;
    let due = performance.now() + 10;
    const ping = () => { const now = performance.now(); window.__lag = Math.max(window.__lag, now - due); due = now + 10; setTimeout(ping, 10); };
    setTimeout(ping, 10);
  });
  const before = await listEditors();
  await page.goto(`${BASE}/?editor=1`, { waitUntil: "domcontentloaded" });
  await newestEditor(before);
  await mcp("list_objects");
  await page.getByText("Jetzt nicht").click({ timeout: 1500 }).catch(() => {});
  await page.waitForTimeout(1500);
  return page;
}

/** Waits until the main thread has been free for `quiet` ms (no long task), at most `limit` ms. */
async function settle(page, quiet = 800, limit = 20000) {
  await page.evaluate(({ quiet, limit }) => new Promise((resolve) => {
    const start = performance.now();
    let last = performance.now();
    const seen = () => window.__longTasks.length;
    let count = seen();
    const tick = () => {
      if (seen() !== count) { count = seen(); last = performance.now(); }
      if (performance.now() - last >= quiet || performance.now() - start > limit) resolve(null);
      else setTimeout(tick, 50);
    };
    tick();
  }), { quiet, limit });
}

async function measure(page, run) {
  await settle(page);
  await page.evaluate(() => { window.__longTasks = []; window.__frameGap = 0; window.__lag = 0; });
  const started = Date.now();
  await run();
  const duration = Date.now() - started;
  await settle(page, 600);
  const { tasks, gap, lag } = await page.evaluate(() => ({ tasks: window.__longTasks, gap: window.__frameGap, lag: window.__lag }));
  return { duration, blocked: Math.round(tasks.reduce((sum, value) => sum + value, 0)), longest: Math.round(Math.max(0, ...tasks)), frameGap: Math.round(gap), lag: Math.round(lag) };
}

const ids = (objects) => objects.map((object) => object.id);

/** A file on disk: handed to the input by its path, Playwright does not copy it through the page. */
function writeScratchFile(name, bytes) {
  const file = join(scratch, name);
  writeFileSync(file, bytes);
  return file;
}

/** Hands a file to the editor's import input and waits until it stands in the scene. */
async function importThroughChooser(page, file) {
  // Editors of earlier runs are closed but may still be listed; asking them would wait for nothing.
  const current = editorNumber;
  const earlier = new Set((await listEditors()).map((editor) => editor.editorNumber).filter((number) => number !== current));
  await page.locator("input[type=file][accept*='.stl']").first().setInputFiles(file);
  // An import into an empty editor starts a design named after the file, and the page may join the
  // bridge again under another number: this editor or a new one with the object in it counts.
  for (let attempt = 0; attempt < 600; attempt += 1) {
    await page.waitForTimeout(50);
    for (const editor of await listEditors()) {
      if (earlier.has(editor.editorNumber)) continue;
      editorNumber = editor.editorNumber;
      const listed = await mcp("list_objects", {}, 2000).catch(() => null);
      if ((listed?.objects?.length ?? 0) > 0) return;
    }
  }
  throw new Error(`${file} did not come in`);
}
/** The ids of what import_file brought in. */
const importedIds = (result) => ids(result.imported ?? []);

// ---- The actions -----------------------------------------------------------------------------
// setup(page) builds what the action needs and returns what run() takes; run is what is measured.

const ACTIONS = [
  {
    key: "import-stl", label: "Import STL, 300k triangles (binary)",
    run: () => mcp("import_file", { fileName: "sphere.stl", base64: bigStl }),
  },
  {
    key: "import-obj", label: "Import OBJ, 300k triangles",
    run: () => mcp("import_file", { fileName: "sphere.obj", text: bigObj }),
  },
  // The same files through the file chooser, as a person imports them: the bridge's own work (it
  // gets the file as base64 and decodes it on the page) is not in these.
  {
    key: "import-stl-file", label: "Import STL, 300k triangles, file chooser",
    setup: async () => writeScratchFile("sphere.stl", Buffer.from(bigStl, "base64")),
    run: (file, page) => importThroughChooser(page, file),
  },
  {
    key: "import-obj-file", label: "Import OBJ, 300k triangles, file chooser",
    setup: async () => writeScratchFile("sphere.obj", Buffer.from(bigObj)),
    run: (file, page) => importThroughChooser(page, file),
  },
  {
    key: "import-3mf", label: "Import 3MF, 100k triangles",
    setup: async () => {
      const made = await mcp("import_file", { fileName: "mid.stl", base64: midStl });
      const file = await mcp("export_mesh", { format: "3mf" });
      await mcp("delete_objects", { ids: importedIds(made) });
      return file.base64;
    },
    run: (data) => mcp("import_file", { fileName: "mid.3mf", base64: data }),
  },
  {
    key: "group-many", label: "Group 60 boxes with 20 cylinder holes",
    setup: async () => {
      const made = [];
      for (let k = 0; k < 60; k += 1) made.push((await mcp("create_shape", { kind: "box", x: (k % 10) * 9 - 45, z: Math.floor(k / 10) * 9 - 27, width: 10, depth: 10, height: 6 })).object.id);
      for (let k = 0; k < 20; k += 1) {
        const hole = (await mcp("create_shape", { kind: "cylinder", x: (k % 10) * 9 - 41, z: Math.floor(k / 10) * 27 - 18, width: 5, depth: 5, height: 10 })).object.id;
        await mcp("update_object", { id: hole, hole: true });
        made.push(hole);
      }
      return made;
    },
    run: (made) => mcp("group_objects", { ids: made }),
  },
  {
    key: "group-round", label: "Group 40 cylinders with 20 sphere holes (no box shortcut)",
    setup: async () => {
      const made = [];
      for (let k = 0; k < 40; k += 1) made.push((await mcp("create_shape", { kind: "cylinder", x: (k % 8) * 9 - 32, z: Math.floor(k / 8) * 9 - 18, width: 12, depth: 12, height: 10, sides: 64 })).object.id);
      for (let k = 0; k < 20; k += 1) {
        const hole = (await mcp("create_shape", { kind: "sphere", x: (k % 10) * 8 - 36, z: Math.floor(k / 10) * 18 - 9, width: 8, depth: 8, height: 8, elevation: 6 })).object.id;
        await mcp("update_object", { id: hole, hole: true });
        made.push(hole);
      }
      return made;
    },
    run: (made) => mcp("group_objects", { ids: made }),
  },
  {
    // push_face on a group: its parts joined first, then the top made a body of its own.
    key: "face-group", label: "Push the top of a group of four overlapping 512-sided cylinders",
    setup: async () => {
      const made = [];
      for (let k = 0; k < 4; k += 1) made.push((await mcp("create_shape", { kind: "cylinder", x: (k % 2) * 10 - 5, z: Math.floor(k / 2) * 10 - 5, width: 30, depth: 30, height: 20, sides: 512 })).object.id);
      return (await mcp("group_objects", { ids: made })).object.id;
    },
    run: (id) => mcp("push_face", { targetId: id, targetFace: "top", separate: true }),
  },
  {
    key: "cut-mesh", label: "Cut a cylinder out of an imported 200k-triangle sphere",
    setup: async () => {
      const sphere = await mcp("import_file", { fileName: "sphere.stl", base64: cutStl });
      const hole = (await mcp("create_shape", { kind: "cylinder", x: 0, z: 0, width: 20, depth: 20, height: 100 })).object.id;
      return { solid: importedIds(sphere)[0], hole };
    },
    run: ({ solid, hole }) => mcp("boolean_cut", { solidIds: [solid], holeIds: [hole] }),
  },
  {
    key: "union-meshes", label: "Group two overlapping imported 100k-triangle spheres",
    setup: async () => {
      const a = await mcp("import_file", { fileName: "a.stl", base64: midStl });
      const b = await mcp("import_file", { fileName: "b.stl", base64: midStl });
      const second = importedIds(b)[0];
      await mcp("update_object", { id: second, x: 25 });
      return [importedIds(a)[0], second];
    },
    run: (pair) => mcp("group_objects", { ids: pair }),
  },
  {
    key: "split-mesh", label: "Split an imported 300k-triangle sphere in two",
    setup: async () => importedIds(await mcp("import_file", { fileName: "sphere.stl", base64: bigStl }))[0],
    run: (id) => mcp("split_objects", { ids: [id], axis: "x", position: 0 }),
  },
  {
    // Four cuts that do not depend on each other: what a pool of workers could share out.
    key: "split-four", label: "Split four imported 100k-triangle spheres with one plane",
    setup: async () => {
      const made = [];
      for (let k = 0; k < 4; k += 1) {
        const id = importedIds(await mcp("import_file", { fileName: `s${k}.stl`, base64: midStl }))[0];
        await mcp("update_object", { id, x: k * 70 - 105 });
        made.push(id);
      }
      return made;
    },
    run: (made) => mcp("split_objects", { ids: made, axis: "y", position: 0 }),
  },
  {
    // The same after a split of four small boxes, so every worker that will help has started.
    key: "split-four-warm", label: "The same, workers already started",
    setup: async () => {
      const boxes = [];
      for (let k = 0; k < 4; k += 1) boxes.push((await mcp("create_shape", { kind: "box", x: k * 15, z: 60, width: 10, depth: 10, height: 10 })).object.id);
      await mcp("split_objects", { ids: boxes, axis: "y", position: 60 });
      await mcp("delete_objects", { ids: ids((await mcp("list_objects")).objects) });
      const made = [];
      for (let k = 0; k < 4; k += 1) {
        const id = importedIds(await mcp("import_file", { fileName: `s${k}.stl`, base64: midStl }))[0];
        await mcp("update_object", { id, x: k * 70 - 105 });
        made.push(id);
      }
      return made;
    },
    run: (made) => mcp("split_objects", { ids: made, axis: "y", position: 0 }),
  },
  {
    key: "export-stl", label: "Export STL of a 300k-triangle import and 40 boxes",
    setup: async () => {
      await mcp("import_file", { fileName: "sphere.stl", base64: bigStl });
      for (let k = 0; k < 40; k += 1) await mcp("create_shape", { kind: "box", x: (k % 8) * 12 + 60, z: Math.floor(k / 8) * 12 - 30, width: 10, depth: 10, height: 10 });
    },
    run: () => mcp("export_mesh", { format: "stl" }),
  },
  {
    key: "export-3mf", label: "Export 3MF of the same",
    setup: async () => {
      await mcp("import_file", { fileName: "sphere.stl", base64: bigStl });
      for (let k = 0; k < 40; k += 1) await mcp("create_shape", { kind: "box", x: (k % 8) * 12 + 60, z: Math.floor(k / 8) * 12 - 30, width: 10, depth: 10, height: 10 });
    },
    run: () => mcp("export_mesh", { format: "3mf" }),
  },
  {
    key: "estimate", label: "Print estimate of a 300k-triangle import",
    setup: async () => { await mcp("import_file", { fileName: "sphere.stl", base64: bigStl }); },
    run: () => mcp("estimate_print", {}),
  },
  {
    key: "section", label: "Switch the section view on (300k import and 40 boxes)",
    setup: async () => {
      await mcp("import_file", { fileName: "sphere.stl", base64: bigStl });
      for (let k = 0; k < 40; k += 1) await mcp("create_shape", { kind: "box", x: (k % 8) * 12 + 60, z: Math.floor(k / 8) * 12 - 30, width: 10, depth: 10, height: 10 });
    },
    run: () => mcp("set_section_view", { enabled: true, axis: "x" }),
  },
  {
    key: "simplify", label: "Simplify a 300k-triangle import to 20 %",
    setup: async () => importedIds(await mcp("import_file", { fileName: "sphere.stl", base64: bigStl }))[0],
    run: (id) => mcp("simplify_mesh", { id, keepPercent: 20 }),
  },
  {
    key: "save-lyl", label: "Save a .lyl: 300k import, 60 boxes, 60 undo steps",
    setup: async () => {
      await mcp("import_file", { fileName: "sphere.stl", base64: bigStl });
      for (let k = 0; k < 60; k += 1) await mcp("create_shape", { kind: "box", x: (k % 10) * 12 + 60, z: Math.floor(k / 10) * 12 - 30, width: 10, depth: 10, height: 10 });
    },
    run: () => mcp("save_project", {}),
  },
  {
    key: "open-lyl", label: "Open that .lyl (file chooser)",
    setup: async (page) => {
      await mcp("import_file", { fileName: "sphere.stl", base64: bigStl });
      for (let k = 0; k < 60; k += 1) await mcp("create_shape", { kind: "box", x: (k % 10) * 12 + 60, z: Math.floor(k / 10) * 12 - 30, width: 10, depth: 10, height: 10 });
      const saved = await mcp("save_project", {});
      const file = join(scratch, "measure.lyl");
      writeFileSync(file, Buffer.from(saved.base64, "base64"));
      // An empty scene, so the count below can only come from the opened file.
      await mcp("delete_objects", { ids: ids((await mcp("list_objects")).objects) });
      return file;
    },
    run: async (file, page) => {
      await page.locator("input[type=file][accept*='.lyl']").first().setInputFiles(file);
      // The file opens as a design of its own, and the page may join the bridge again under another number.
      for (let attempt = 0; attempt < 600; attempt += 1) {
        await page.waitForTimeout(100);
        for (const editor of await listEditors()) {
          editorNumber = editor.editorNumber;
          const listed = await mcp("list_objects").catch(() => null);
          if ((listed?.objects?.length ?? 0) >= 61) return;
        }
      }
      throw new Error("the .lyl did not open");
    },
  },
  {
    key: "export-step", label: "Export STEP of 40 boxes and 20 cylinders (first time: loads the CAD kernel)",
    setup: async () => {
      for (let k = 0; k < 40; k += 1) await mcp("create_shape", { kind: "box", x: (k % 8) * 12 - 45, z: Math.floor(k / 8) * 12 - 30, width: 10, depth: 10, height: 10 });
      for (let k = 0; k < 20; k += 1) await mcp("create_shape", { kind: "cylinder", x: (k % 10) * 12 - 55, z: 45, width: 8, depth: 8, height: 12 });
    },
    run: async (_, page) => {
      await page.getByRole("button", { name: "Exportieren", exact: true }).first().click();
      await page.waitForTimeout(400);
      await page.locator(".export-format-slider button").nth(3).click();
      const [download] = await Promise.all([page.waitForEvent("download", { timeout: 300000 }), page.getByRole("button", { name: /exportieren$/ }).last().click()]);
      writeFileSync(join(scratch, "measure.step"), readFileSync(await download.path()));
    },
  },
  {
    key: "import-step", label: "Import that STEP file (60 bodies)",
    setup: async (page) => {
      const file = join(scratch, "measure.step");
      try { readFileSync(file); } catch { throw new Error("run export-step first"); }
      // The kernel is loaded once beforehand, so this measures the import itself.
      await mcp("import_file", { fileName: "warm.step", text: readFileSync(file, "utf8") });
      await mcp("delete_objects", { ids: ids((await mcp("list_objects")).objects) });
      return readFileSync(file, "utf8");
    },
    run: (text) => mcp("import_file", { fileName: "measure.step", text }),
  },
];

// ---- Run ------------------------------------------------------------------------------------

// --gpu draws with the computer's graphics card instead of software rendering (SwiftShader).
const browser = await chromium.launch({ ...(CHANNEL ? { channel: CHANNEL } : {}), args: GPU ? ["--enable-gpu", "--ignore-gpu-blocklist", "--use-gl=angle"] : ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const context = await browser.newContext({ viewport: { width: 1500, height: 950 }, locale: "de-DE", acceptDownloads: true });
{
  const page = await context.newPage();
  const renderer = await page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    const info = gl?.getExtension("WEBGL_debug_renderer_info");
    return gl ? String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER)) : "no WebGL2";
  });
  console.error(`renderer: ${renderer}`);
  await page.close();
}
const results = [];
for (const action of ACTIONS.filter((entry) => !ONLY?.length || ONLY.includes(entry.key))) {
  const runs = [];
  for (let run = 0; run < RUNS; run += 1) {
    const page = await openEditor(context);
    try {
      const data = action.setup ? await action.setup(page) : undefined;
      const session = PROFILE_DIR ? await context.newCDPSession(page) : null;
      if (session) {
        await session.send("Profiler.enable");
        await session.send("Profiler.setSamplingInterval", { interval: 200 });
        await session.send("Profiler.start");
      }
      runs.push(await measure(page, () => action.run(data, page)));
      if (session) {
        const { profile } = await session.send("Profiler.stop");
        writeFileSync(join(PROFILE_DIR, `${action.key}-${run + 1}.cpuprofile`), JSON.stringify(profile));
      }
    } catch (error) {
      runs.push({ error: String(error.message ?? error).slice(0, 200) });
    }
    await page.close();
  }
  const ok = runs.filter((entry) => !entry.error);
  const median = (key) => { const values = ok.map((entry) => entry[key]).sort((a, b) => a - b); return values.length ? values[Math.floor((values.length - 1) / 2)] : null; };
  const row = { key: action.key, label: action.label, duration: median("duration"), blocked: median("blocked"), longest: median("longest"), frameGap: median("frameGap"), lag: median("lag"), runs };
  // A click waits as long as the main thread is busy: that, not the frame rate, decides.
  row.freezes = row.lag !== null ? row.lag >= FREEZE_MS : null;
  results.push(row);
  console.error(`${action.key}: ${JSON.stringify(runs)}`);
}
await browser.close();

const format = (value) => (value === null ? "-" : `${value.toLocaleString("en-US")} ms`);
console.log("| Action | Duration | Main thread blocked | Longest block | Longest input delay | Longest frame gap | Page freezes |");
console.log("| --- | --- | --- | --- | --- | --- | --- |");
for (const row of results) {
  const failed = row.runs.find((entry) => entry.error);
  console.log(`| ${row.label} | ${format(row.duration)} | ${format(row.blocked)} | ${format(row.longest)} | ${format(row.lag)} | ${format(row.frameGap)} | ${row.freezes === null ? `failed: ${failed?.error}` : row.freezes ? "yes" : "no"} |`);
}
if (JSON_OUT) writeFileSync(JSON_OUT, JSON.stringify({ base: BASE, runs: RUNS, date: new Date().toISOString(), results }, null, 2));
