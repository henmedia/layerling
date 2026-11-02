import { SOURCE_CODE_URL } from "@/lib/appUpdate";
import { parseWhatsNewEntries, whatsNewSince, type WhatsNewEntry } from "@/lib/whatsNew";

/** Where the highlights of a release live in the repository. */
const WHATS_NEW_FILE_PATH = "apps/web/src/lib/whatsNew.json";

/**
 * The address of whatsNew.json in the version of one release, read straight from
 * GitHub. Pinned to the release's tag, so it is exactly what that release
 * contains and never something half-written on the main branch. Null for a copy
 * whose source address is not on GitHub, and for a tag that is not a version.
 */
export function whatsNewFileUrl(tag: string, sourceCodeUrl: string = SOURCE_CODE_URL): string | null {
  if (!/^v?\d+\.\d+\.\d+$/.test(tag.trim())) return null;
  try {
    const parsed = new URL(sourceCodeUrl);
    if (parsed.hostname !== "github.com" && parsed.hostname !== "www.github.com") return null;
    const parts = parsed.pathname.replace(/^\/+/, "").replace(/\/+$/, "").split("/");
    if (parts.length < 2 || !/^[\w.-]+$/.test(parts[0]) || !/^[\w.-]+$/.test(parts[1])) return null;
    return `https://raw.githubusercontent.com/${parts[0]}/${parts[1].replace(/\.git$/, "")}/${tag.trim()}/${WHATS_NEW_FILE_PATH}`;
  } catch {
    return null;
  }
}

/**
 * What the update to `latestTag` brings over `currentVersion`, from that
 * release's own list: the entries in between, newest first. An empty list means
 * the release says nothing new for people (a plain fix); null means the list
 * could not be fetched or read - no network, a fork, a release from before the
 * list existed - and the caller falls back to the link to the release notes.
 */
export async function fetchUpdatePreview(
  latestTag: string,
  currentVersion: string,
  options: { fetchFn?: typeof fetch; sourceCodeUrl?: string; timeoutMs?: number } = {},
): Promise<WhatsNewEntry[] | null> {
  const url = whatsNewFileUrl(latestTag, options.sourceCodeUrl);
  if (!url) return null;
  const fetcher = options.fetchFn ?? fetch;
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), options.timeoutMs ?? 6000) : null;
  try {
    const response = await fetcher(url, { signal: controller?.signal });
    if (!response.ok) return null;
    const entries = parseWhatsNewEntries(await response.json());
    return whatsNewSince(currentVersion, latestTag, entries);
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
