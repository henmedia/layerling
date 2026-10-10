import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Builds the static export that plain web hosting serves. This exists as a
// script rather than an npm one-liner because setting an environment variable
// inline is written differently on Windows and on everything else, and the
// export has to work on whichever machine is preparing the upload.
//
// Everything is started as `node <entry point>`: npm and npx are batch files on
// Windows, which recent Node versions refuse to spawn without a shell.
const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const nextBin = createRequire(import.meta.url).resolve("next/dist/bin/next");

function run(args, extraEnvironment = {}) {
  const result = spawnSync(process.execPath, args, {
    cwd: repositoryRoot,
    stdio: "inherit",
    env: { ...process.env, ...extraEnvironment },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(["scripts/copy-occt-wasm.mjs"]);
run(["scripts/build-guide.mjs"]);
// Next.js 16 builds with Turbopack unless told otherwise. The CAD worker is
// bundled by webpack, and the check below looks for its webpack runtime, so
// the export asks for webpack there. Next.js 15 builds with webpack already
// and does not know the flag (#217, #218).
const nextMajor = Number(createRequire(import.meta.url)("next/package.json").version.split(".")[0]);
run([nextBin, "build", "apps/web", ...(nextMajor >= 16 ? ["--webpack"] : [])], { STATIC_EXPORT: "true" });
run(["scripts/verify-static-worker-assets.mjs"]);
run(["scripts/generate-service-worker.mjs"]);

console.log("Static export ready in apps/web/.next-export/");
