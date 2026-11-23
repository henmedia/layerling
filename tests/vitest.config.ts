import path from "node:path";
import { defineConfig } from "vitest/config";
import { shareTheMachine } from "./shareTheMachine";

const rootDir = path.resolve(__dirname, "..");

export default defineConfig({
  root: rootDir,
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "apps/web/src"),
    },
  },
  // The web tsconfig keeps JSX for Next ("preserve"); tests that render a
  // component need it compiled.
  oxc: {
    jsx: { runtime: "automatic" },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    maxWorkers: shareTheMachine(),
    // GitHub's runners are slower: a test of 4 seconds here ran past vitest's 5 there.
    testTimeout: process.env.CI ? 20_000 : 5_000,
  },
});
