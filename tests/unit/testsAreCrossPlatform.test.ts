import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The tests run on Linux in CI and on Windows where the release is made. A debug write to `/dev/null` or a file in `/tmp`
 * passes on Linux and breaks the whole release on Windows (1.141.0: two hinge tests wrote their numbers to `/dev/null`,
 * "ENOENT: C:\dev\null"). So no test or source file may name such a path; use `os.tmpdir()` or `mkdtempSync` for files,
 * and print numbers with `console.log` while debugging, then take them out again.
 */
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === "node_modules" || name === ".next") return [];
    if (statSync(path).isDirectory()) return files(path);
    return /\.(ts|tsx|mjs)$/.test(name) ? [path] : [];
  });
}

describe("tests and sources that run on every platform", () => {
  it("name no Unix-only path such as /dev/null or /tmp", () => {
    const self = join(__dirname, "testsAreCrossPlatform.test.ts");
    const found: string[] = [];
    for (const root of ["tests", "apps/web/src"]) {
      for (const file of files(join(__dirname, "..", "..", root))) {
        if (file === self) continue;
        const text = readFileSync(file, "utf8");
        const hit = text.split("\n").findIndex((line) => /["'`]\/(dev\/null|tmp\/|tmp["'`])/.test(line));
        if (hit >= 0) found.push(`${file}:${hit + 1}`);
      }
    }
    expect(found).toEqual([]);
  });
});
