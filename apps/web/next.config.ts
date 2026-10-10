import type { NextConfig } from "next";
import { readFileSync } from "node:fs";
import path from "node:path";

const isStaticExport = process.env.STATIC_EXPORT === "true";
const extraAllowedDevOrigins = (process.env.LAYERLING_ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const occtRuntimeVersion: string = JSON.parse(
  readFileSync(path.resolve(process.cwd(), "node_modules", "occt-wasm", "package.json"), "utf8"),
).version;
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
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
  images: {
    unoptimized: true
  },
  // brepjs (loaded lazily by the STEP exporter) ships an auto-init helper that
  // tries optional kernel backends via guarded `import().catch()`. We only install
  // and use occt-wasm, so silence the resolution warnings for the backends we omit.
  // Next.js 16 builds with Turbopack by default and refuses a `webpack` hook
  // without a `turbopack` entry. The empty entry accepts Turbopack's defaults
  // there; Next.js 15 ignores it for webpack builds (#217).
  turbopack: {},
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "brepkit-wasm": false,
      "brepjs-opencascade": false,
    };
    return config;
  },
  ...(isStaticExport
    ? {
        output: "export" as const,
        trailingSlash: true,
      }
    : {}),
};

export default nextConfig;
