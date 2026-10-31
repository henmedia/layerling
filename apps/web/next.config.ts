import type { NextConfig } from "next";
import { readFileSync } from "node:fs";
import path from "node:path";

const isStaticExport = process.env.STATIC_EXPORT === "true";
const buildCpus = Math.max(0, Math.floor(Number(process.env.LAYERLING_BUILD_CPUS)) || 0);
const extraAllowedDevOrigins = (process.env.LAYERLING_ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const occtRuntimeVersion: string = JSON.parse(
  readFileSync(path.resolve(process.cwd(), "node_modules", "occt-wasm", "package.json"), "utf8"),
).version;
// The cut of the Japanese typeface scripts/build-japanese-typeface.mjs staged (the folder under
// public/fonts/japanese/); empty before it has run, and the text then finds no Japanese letters.
let japaneseFontVersion = "";
try {
  japaneseFontVersion = readFileSync(path.resolve(process.cwd(), "apps", "web", "public", "fonts", "japanese", "version.txt"), "utf8").trim();
} catch {
  // not built yet
}
// The app's own version, so files with a fixed name (the Graphite stylesheet)
// can carry it and a browser cache cannot hand out last release's copy.
const appVersion: string = JSON.parse(readFileSync(path.resolve(process.cwd(), "package.json"), "utf8")).version;

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(process.cwd()),
  devIndicators: false,
  // Keep the live development compiler isolated from `next build`. Sharing
  // `.next` lets a production verification build invalidate chunks used by a
  // running dev server, which also breaks API routes such as project snapshots.
  distDir: isStaticExport ? ".next-export" : process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  allowedDevOrigins: ["localhost", "127.0.0.1", ...extraAllowedDevOrigins],
  env: {
    NEXT_PUBLIC_STATIC_EXPORT: isStaticExport ? "true" : "false",
    NEXT_PUBLIC_OCCT_RUNTIME_VERSION: occtRuntimeVersion,
    NEXT_PUBLIC_JAPANESE_FONT_VERSION: japaneseFontVersion,
    NEXT_PUBLIC_APP_VERSION: appVersion,
    // Page and CAD workers compare it (lib/buildStamp.ts); the export script sets one per build.
    NEXT_PUBLIC_BUILD_ID: process.env.LAYERLING_BUILD_ID || appVersion,
  },
  images: {
    unoptimized: true
  },
  // Next.js 16 builds with Turbopack by default and refuses a `webpack` hook
  // without a `turbopack` entry. The empty entry accepts Turbopack's defaults
  // there; Next.js 15 ignores it for webpack builds (#217).
  turbopack: {},
  webpack: (config, { dev }) => {
    // The webpack cache on disk grew to gigabytes over many builds; entries nobody used for three
    // days can go (the default is two months). Production builds write it uncompressed by default
    // (Next leaves that to its own hosting), which was about three times the size.
    if (config.cache && typeof config.cache === "object") {
      config.cache.maxAge = 3 * 24 * 60 * 60 * 1000;
      if (!dev) config.cache.compression = "gzip";
    }
    return config;
  },
  ...(isStaticExport
    ? {
        output: "export" as const,
        trailingSlash: true,
      }
    : {}),
  // How many workers the build may start; the release script leaves two threads free with it, so the machine
  // stays usable while it builds. Left out, Next takes all cores but one.
  ...(buildCpus ? { experimental: { cpus: buildCpus } } : {}),
};

export default nextConfig;
