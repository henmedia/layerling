import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/*
 * The editor loads manifold.js and manifold.wasm from apps/web/public, not from the package.
 * Those copies stayed at layerling 1.0.0 while manifold-3d moved on to 3.5.x and every test ran
 * against the package: the browser ran a different kernel than the one tested (audit, 22.11.2026).
 * `npm run copy:manifold` brings them in line.
 */
describe("the manifold runtime the browser loads", () => {
  it.each(["manifold.js", "manifold.wasm"])("%s in public/ is the one of the installed manifold-3d", (file) => {
    const root = join(__dirname, "..", "..");
    const served = readFileSync(join(root, "apps", "web", "public", file));
    const installed = readFileSync(join(root, "node_modules", "manifold-3d", file));
    expect(served.equals(installed), `${file} is out of date: run npm run copy:manifold`).toBe(true);
  });
});
