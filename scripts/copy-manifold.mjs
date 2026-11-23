// Copies the manifold-3d runtime (Emscripten glue and WASM) into the web app's public/
// folder, where the editor loads it next to the page (getManifoldRuntime in
// lib/editorMeshCore.ts, webpackIgnore). Like copy-occt-wasm.mjs, but the two files
// stay checked in, as the static export and the PHP hosting take them from public/.
// Without this step the browser kept running the manifold of layerling 1.0.0 while
// package.json and every test moved on to 3.5.x (audit, 22.11.2026);
// tests/unit/manifoldRuntimeFiles.test.ts fails when the copies fall behind again.
import { chmod, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "manifold-3d");
const dest = join(root, "apps", "web", "public");

if (!existsSync(join(src, "manifold.wasm"))) {
  console.error(`[copy-manifold] manifold-3d not installed at ${src}. Run \`npm install\` first.`);
  process.exit(1);
}

for (const file of ["manifold.js", "manifold.wasm"]) {
  await copyFile(join(src, file), join(dest, file));
  // The package ships manifold.wasm as executable; copyFile keeps that on Linux, and CI's "generated files are
  // committed" check then saw a changed mode (1.169.0). The copies are plain files.
  await chmod(join(dest, file), 0o644);
}
console.log("[copy-manifold] manifold.js and manifold.wasm copied to apps/web/public");
