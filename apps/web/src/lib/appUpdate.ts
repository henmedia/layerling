export const DEFAULT_SOURCE_CODE_URL = "https://github.com/henmedia/layerling";

export const SOURCE_CODE_URL =
  process.env.NEXT_PUBLIC_SOURCE_CODE_URL?.trim() || DEFAULT_SOURCE_CODE_URL;

export type Semver = {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
};

export type AppUpdateInfo = {
  latestVersion: string;
  currentVersion: string;
  releaseUrl: string;
  releaseName?: string;
  publishedAt?: string;
};

export type CachedUpdateCheck = {
  timestamp: number;
  latestVersion: string;
  releaseUrl: string;
  releaseName?: string;
  publishedAt?: string;
};

export const UPDATE_CHECK_CACHE_KEY = "layerling.updateCheck";
export const UPDATE_DISMISSED_KEY = "layerling.updateDismissed";
export const UPDATE_SIMULATE_STORAGE_KEY = "layerling.simulatedLatestVersion";
export const UPDATE_CACHE_DURATION_MS = 60 * 60 * 1000; // 1 Stunde

export function getSimulatedLatestVersion(storage?: Storage | null): string | null {
  if (typeof window !== "undefined") {
    try {
      const params = new URLSearchParams(window.location.search);
      const queryValue = params.get("simulateUpdate");
      if (queryValue) {
        if (queryValue === "false" || queryValue === "0" || queryValue === "off" || queryValue === "reset") {
          return null;
        }
        return queryValue === "true" || queryValue === "1" ? "v1.12.0" : queryValue;
      }
    } catch {
      // Ignoriere URL-Fehler
    }
  }

  const targetStorage = storage ?? (typeof window !== "undefined" ? window.localStorage : null);
  if (targetStorage) {
    try {
      const stored = targetStorage.getItem(UPDATE_SIMULATE_STORAGE_KEY);
      if (stored) return stored;
    } catch {
      // Ignoriere Speicherfehler
    }
  }

  return null;
}

if (typeof window !== "undefined") {
  (window as unknown as { __simulateLayerlingUpdate?: (version?: string | null) => void }).__simulateLayerlingUpdate = (
    version = "v1.12.0",
  ) => {
    if (version) {
      window.localStorage.setItem(UPDATE_SIMULATE_STORAGE_KEY, version);
      window.sessionStorage.removeItem(UPDATE_DISMISSED_KEY);
      window.location.reload();
    } else {
      window.localStorage.removeItem(UPDATE_SIMULATE_STORAGE_KEY);
      window.sessionStorage.removeItem(UPDATE_DISMISSED_KEY);
      window.location.reload();
    }
  };
}

export function parseSemver(version: string | null | undefined): Semver | null {
  if (!version || typeof version !== "string") return null;
  const trimmed = version.trim();
  const withoutV = trimmed.replace(/^v/i, "");
  const dashIndex = withoutV.indexOf("-");
  const core = dashIndex === -1 ? withoutV : withoutV.slice(0, dashIndex);
  const prerelease = dashIndex === -1 ? undefined : withoutV.slice(dashIndex + 1);

  const parts = core.split(".").map((part) => parseInt(part, 10));
  if (parts.length === 0 || parts.some((n) => Number.isNaN(n) || n < 0)) return null;

  const [major = 0, minor = 0, patch = 0] = parts;
  return { major, minor, patch, prerelease };
}

export function compareSemver(candidate: string, current: string): number {
  const semCandidate = parseSemver(candidate);
  const semCurrent = parseSemver(current);
  if (!semCandidate || !semCurrent) return 0;

  if (semCandidate.major !== semCurrent.major) {
    return semCandidate.major - semCurrent.major;
  }
  if (semCandidate.minor !== semCurrent.minor) {
    return semCandidate.minor - semCurrent.minor;
  }
  if (semCandidate.patch !== semCurrent.patch) {
    return semCandidate.patch - semCurrent.patch;
  }
  if (!semCandidate.prerelease && semCurrent.prerelease) {
    return 1;
  }
  if (semCandidate.prerelease && !semCurrent.prerelease) {
    return -1;
  }
  return 0;
}

export function isNewerVersion(candidate: string, current: string): boolean {
  return compareSemver(candidate, current) > 0;
}

export function githubReleasesLatestApiUrl(sourceCodeUrl: string = SOURCE_CODE_URL): string | null {
  try {
    const parsed = new URL(sourceCodeUrl);
    if (!parsed.hostname.includes("github.com")) return null;
    const parts = parsed.pathname.replace(/^\/+/, "").replace(/\/+$/, "").split("/");
    if (parts.length < 2) return null;
    const [owner, repo] = parts;
    return `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
  } catch {
    return null;
  }
}

export async function fetchLatestGitHubRelease(
  sourceCodeUrl: string = SOURCE_CODE_URL,
  options?: {
    force?: boolean;
    fetchFn?: typeof fetch;
    storage?: Storage | null;
  },
): Promise<CachedUpdateCheck | null> {
  const storage = options?.storage ?? (typeof window !== "undefined" ? window.localStorage : null);

  const simulated = getSimulatedLatestVersion(storage);
  if (simulated) {
    const formatted = simulated.startsWith("v") || simulated.startsWith("V") ? simulated : `v${simulated}`;
    return {
      timestamp: Date.now(),
      latestVersion: formatted,
      releaseUrl: `${sourceCodeUrl.replace(/\/+$/, "")}/releases`,
      releaseName: `layerling ${formatted}`,
      publishedAt: new Date().toISOString(),
    };
  }

  if (!options?.force && storage) {
    try {
      const raw = storage.getItem(UPDATE_CHECK_CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as CachedUpdateCheck;
        if (cached && typeof cached.timestamp === "number" && Date.now() - cached.timestamp < UPDATE_CACHE_DURATION_MS) {
          return cached;
        }
      }
    } catch {
      // Ignoriere Cache-Lesefehler
    }
  }

  const apiUrl = githubReleasesLatestApiUrl(sourceCodeUrl);
  if (!apiUrl) return null;

  const fetcher = options?.fetchFn ?? fetch;
  try {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 6000) : null;

    const response = await fetcher(apiUrl, {
      headers: { Accept: "application/vnd.github.v3+json" },
      signal: controller?.signal,
    });
    if (timeoutId) clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      tag_name?: string;
      html_url?: string;
      name?: string;
      published_at?: string;
    };

    if (!data.tag_name) return null;

    const result: CachedUpdateCheck = {
      timestamp: Date.now(),
      latestVersion: data.tag_name,
      releaseUrl: data.html_url || `${sourceCodeUrl.replace(/\/+$/, "")}/releases`,
      releaseName: data.name,
      publishedAt: data.published_at,
    };

    if (storage) {
      try {
        storage.setItem(UPDATE_CHECK_CACHE_KEY, JSON.stringify(result));
      } catch {
        // Ignoriere Speicherfehler
      }
    }

    return result;
  } catch {
    return null;
  }
}

export async function checkAppUpdate(
  currentVersion: string,
  sourceCodeUrl: string = SOURCE_CODE_URL,
  options?: {
    force?: boolean;
    fetchFn?: typeof fetch;
    storage?: Storage | null;
  },
): Promise<AppUpdateInfo | null> {
  const release = await fetchLatestGitHubRelease(sourceCodeUrl, options);
  if (!release) return null;

  if (!isNewerVersion(release.latestVersion, currentVersion)) {
    return null;
  }

  return {
    latestVersion: release.latestVersion,
    currentVersion,
    releaseUrl: release.releaseUrl,
    releaseName: release.releaseName,
    publishedAt: release.publishedAt,
  };
}

export function isUpdateDismissed(version: string, storage: Storage | null = typeof window !== "undefined" ? window.sessionStorage : null): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(UPDATE_DISMISSED_KEY) === version;
  } catch {
    return false;
  }
}

export function dismissUpdate(version: string, storage: Storage | null = typeof window !== "undefined" ? window.sessionStorage : null): void {
  if (!storage) return;
  try {
    storage.setItem(UPDATE_DISMISSED_KEY, version);
  } catch {
    // Ignoriere Speicherfehler
  }
}
