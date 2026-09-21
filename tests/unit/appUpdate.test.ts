import { describe, expect, it, vi } from "vitest";
import {
  checkAppUpdate,
  compareSemver,
  dismissUpdate,
  fetchLatestGitHubRelease,
  githubReleasesLatestApiUrl,
  isNewerVersion,
  isUpdateDismissed,
  parseSemver,
  UPDATE_CHECK_CACHE_KEY,
  UPDATE_DISMISSED_KEY,
} from "@/lib/appUpdate";

describe("semver parsing and comparison", () => {
  it("parses valid semver versions", () => {
    expect(parseSemver("1.11.0")).toEqual({ major: 1, minor: 11, patch: 0, prerelease: undefined });
    expect(parseSemver("v1.11.0")).toEqual({ major: 1, minor: 11, patch: 0, prerelease: undefined });
    expect(parseSemver("V2.0.5-beta.1")).toEqual({ major: 2, minor: 0, patch: 5, prerelease: "beta.1" });
    expect(parseSemver("0.9.1")).toEqual({ major: 0, minor: 9, patch: 1, prerelease: undefined });
  });

  it("returns null for invalid versions", () => {
    expect(parseSemver("")).toBeNull();
    expect(parseSemver("not-a-version")).toBeNull();
    expect(parseSemver("abc.def.ghi")).toBeNull();
  });

  it("compares semver versions correctly", () => {
    expect(compareSemver("1.11.0", "1.10.3")).toBeGreaterThan(0);
    expect(compareSemver("1.11.0", "1.11.0")).toBe(0);
    expect(compareSemver("v1.11.0", "1.11.0")).toBe(0);
    expect(compareSemver("1.10.3", "1.11.0")).toBeLessThan(0);
    expect(compareSemver("2.0.0", "1.99.99")).toBeGreaterThan(0);
    expect(compareSemver("1.11.1", "1.11.0")).toBeGreaterThan(0);
    expect(compareSemver("1.12.0", "1.11.5")).toBeGreaterThan(0);
    expect(compareSemver("1.11.0", "1.11.0-beta")).toBeGreaterThan(0);
    expect(compareSemver("1.11.0-beta", "1.11.0")).toBeLessThan(0);
  });

  it("checks if a candidate version is newer", () => {
    expect(isNewerVersion("1.12.0", "1.11.0")).toBe(true);
    expect(isNewerVersion("v1.11.1", "1.11.0")).toBe(true);
    expect(isNewerVersion("v2.0.0", "1.11.0")).toBe(true);
    expect(isNewerVersion("1.11.0", "1.11.0")).toBe(false);
    expect(isNewerVersion("v1.11.0", "1.11.0")).toBe(false);
    expect(isNewerVersion("v1.10.3", "1.11.0")).toBe(false);
    expect(isNewerVersion("invalid", "1.11.0")).toBe(false);
  });
});

describe("githubReleasesLatestApiUrl", () => {
  it("derives the correct latest release endpoint from GitHub URLs", () => {
    expect(githubReleasesLatestApiUrl("https://github.com/henmedia/layerling")).toBe(
      "https://api.github.com/repos/henmedia/layerling/releases/latest",
    );
    expect(githubReleasesLatestApiUrl("https://github.com/henmedia/layerling/")).toBe(
      "https://api.github.com/repos/henmedia/layerling/releases/latest",
    );
  });

  it("returns null for non-GitHub URLs or malformed URLs", () => {
    expect(githubReleasesLatestApiUrl("https://gitlab.com/henmedia/layerling")).toBeNull();
    expect(githubReleasesLatestApiUrl("not-a-url")).toBeNull();
  });
});

function createMockStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    length: store.size,
  };
}

describe("fetchLatestGitHubRelease and checkAppUpdate", () => {
  it("returns update info when remote release is newer", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        tag_name: "v1.12.0",
        html_url: "https://github.com/henmedia/layerling/releases/tag/v1.12.0",
        name: "layerling 1.12.0",
        published_at: "2026-09-22T10:00:00Z",
      }),
    });
    const storage = createMockStorage();

    const update = await checkAppUpdate("1.11.0", "https://github.com/henmedia/layerling", {
      fetchFn: mockFetch as unknown as typeof fetch,
      storage,
    });

    expect(update).not.toBeNull();
    expect(update?.latestVersion).toBe("v1.12.0");
    expect(update?.currentVersion).toBe("1.11.0");
    expect(update?.releaseUrl).toBe("https://github.com/henmedia/layerling/releases/tag/v1.12.0");
    expect(storage.getItem(UPDATE_CHECK_CACHE_KEY)).toContain("v1.12.0");
  });

  it("returns null when remote release is equal to or older than current", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        tag_name: "v1.11.0",
        html_url: "https://github.com/henmedia/layerling/releases/tag/v1.11.0",
      }),
    });
    const storage = createMockStorage();

    const update = await checkAppUpdate("1.11.0", "https://github.com/henmedia/layerling", {
      fetchFn: mockFetch as unknown as typeof fetch,
      storage,
    });

    expect(update).toBeNull();
  });

  it("handles fetch errors gracefully without throwing", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network offline"));
    const storage = createMockStorage();

    const update = await checkAppUpdate("1.11.0", "https://github.com/henmedia/layerling", {
      fetchFn: mockFetch as unknown as typeof fetch,
      storage,
    });

    expect(update).toBeNull();
  });

  it("uses cached release info when available and not expired", async () => {
    const storage = createMockStorage();
    storage.setItem(
      UPDATE_CHECK_CACHE_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        latestVersion: "v1.13.0",
        releaseUrl: "https://github.com/henmedia/layerling/releases/tag/v1.13.0",
      }),
    );
    const mockFetch = vi.fn();

    const update = await checkAppUpdate("1.11.0", "https://github.com/henmedia/layerling", {
      fetchFn: mockFetch as unknown as typeof fetch,
      storage,
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(update?.latestVersion).toBe("v1.13.0");
  });

  it("manages dismissal state properly", () => {
    const storage = createMockStorage();
    expect(isUpdateDismissed("v1.12.0", storage)).toBe(false);

    dismissUpdate("v1.12.0", storage);
    expect(isUpdateDismissed("v1.12.0", storage)).toBe(true);
    expect(isUpdateDismissed("v1.13.0", storage)).toBe(false);
  });

  it("supports simulated update version for testing and demonstration", async () => {
    const storage = createMockStorage();
    storage.setItem("layerling.simulatedLatestVersion", "v1.15.0");

    const update = await checkAppUpdate("1.11.0", "https://github.com/henmedia/layerling", {
      storage,
    });

    expect(update).not.toBeNull();
    expect(update?.latestVersion).toBe("v1.15.0");
    expect(update?.currentVersion).toBe("1.11.0");
  });
});
