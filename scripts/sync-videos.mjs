import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

// The list of videos by other people lives in one place, apps/web/src/lib/layerlingVideos.ts, and the video
// chapter of the guide (docs/guide/<language>/16-*.md) carries it with a description per language.
// Everything else is filled from the chapter, so that no copy falls behind:
//
//   npm run videos:sync                  the video lists of README.md, README.de.md and README.nl.md
//   npm run videos:sync -- --check       only says whether they are current (exit code 1 if not)
//   npm run videos:sync -- --discussion  the first post of Discussion #296 on GitHub: shows whether it is current
//   npm run videos:sync -- --discussion --apply   and writes it (needs `gh`, logged in as the owner)
//
// tests/unit/videoList.test.ts checks the chapter against layerlingVideos.ts and the READMEs against the chapter.

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const START = "<!-- videos:start -->";
const END = "<!-- videos:end -->";
const DISCUSSION_NUMBER = 296;

/** README file -> the guide language its list is taken from. */
export const README_LANGUAGES = { "README.md": "en", "README.de.md": "de", "README.es.md": "es", "README.nl.md": "nl", "README.ar.md": "ar", "README.zh-cn.md": "zh-cn", "README.zh-tw.md": "zh-tw" };

/** The lines of the video chapter of a language: "- [title](https://...) - channel (language). description". */
export function chapterVideoLines(language, base = root) {
  const folder = join(base, "docs", "guide", language);
  const file = readdirSync(folder).find((name) => name.startsWith("16-"));
  if (!file) throw new Error(`docs/guide/${language} has no video chapter (16-*.md)`);
  return readFileSync(join(folder, file), "utf8")
    .split(/\r?\n/)
    .filter((line) => /^- \[[^\]]+\]\(https:\/\/[^)\s]+\)/.test(line));
}

/**
 * The README text with the lines between the markers replaced. Without markers they are put around the run of
 * video lines under the heading "### Video…" (the first time), so an old hand-written list is taken over.
 */
export function withVideoLines(text, lines) {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const block = [START, ...lines, END].join(eol);
  const startAt = text.indexOf(START);
  const endAt = text.indexOf(END);
  if (startAt !== -1 && endAt > startAt) return text.slice(0, startAt) + block + text.slice(endAt + END.length);
  const heading = text.search(/^### Video/m);
  if (heading === -1) throw new Error("no '### Video' heading and no video markers in the README");
  const rows = text.slice(heading).split(/\r?\n/);
  let first = rows.findIndex((row) => row.startsWith("- ["));
  if (first === -1) throw new Error("no video list under the heading");
  let last = first;
  while (last + 1 < rows.length && rows[last + 1].startsWith("- [")) last += 1;
  const before = text.slice(0, heading) + rows.slice(0, first).join(eol) + (first > 0 ? eol : "");
  const after = rows.slice(last + 1).join(eol);
  return before + block + (after ? eol + after : "");
}

/** The video lines between the markers of a README, or null. */
export function readmeVideoLines(text) {
  const startAt = text.indexOf(START);
  const endAt = text.indexOf(END);
  if (startAt === -1 || endAt < startAt) return null;
  return text
    .slice(startAt + START.length, endAt)
    .split(/\r?\n/)
    .filter((line) => line.startsWith("- ["));
}

function syncReadmes(check) {
  let stale = false;
  for (const [file, language] of Object.entries(README_LANGUAGES)) {
    const path = join(root, file);
    const text = readFileSync(path, "utf8");
    const next = withVideoLines(text, chapterVideoLines(language));
    if (next === text) {
      console.log(`${file}: current`);
      continue;
    }
    stale = true;
    if (check) {
      console.log(`${file}: out of date (run npm run videos:sync)`);
    } else {
      writeFileSync(path, next);
      console.log(`${file}: updated`);
    }
  }
  return stale;
}

function gh(args, input) {
  const result = spawnSync("gh", args, { encoding: "utf8", input });
  if (result.status !== 0) throw new Error(`gh ${args.slice(0, 2).join(" ")} failed: ${result.stderr || result.stdout}`);
  return result.stdout;
}

/** The first post of Discussion #296 with the list replaced by the English chapter's; head and tail stay as they are. */
export function discussionBody(current, lines) {
  const rows = current.split(/\r?\n/);
  const first = rows.findIndex((row) => row.startsWith("- ["));
  if (first === -1) throw new Error("the post has no video list");
  let last = first;
  while (last + 1 < rows.length && rows[last + 1].startsWith("- [")) last += 1;
  return [...rows.slice(0, first), ...lines, ...rows.slice(last + 1)].join("\n");
}

function syncDiscussion(apply) {
  const out = gh([
    "api", "graphql", "-f",
    `query={repository(owner:"henmedia",name:"layerling"){discussion(number:${DISCUSSION_NUMBER}){id body}}}`,
  ]);
  const { id, body } = JSON.parse(out).data.repository.discussion;
  const next = discussionBody(body, chapterVideoLines("en"));
  if (next.trim() === body.trim()) {
    console.log(`Discussion #${DISCUSSION_NUMBER}: current`);
    return false;
  }
  if (!apply) {
    console.log(`Discussion #${DISCUSSION_NUMBER}: out of date (run with --discussion --apply)`);
    return true;
  }
  gh(["api", "graphql", "-f", "query=mutation($id:ID!,$body:String!){updateDiscussion(input:{discussionId:$id,body:$body}){discussion{url}}}", "-f", `id=${id}`, "-f", `body=${next}`]);
  console.log(`Discussion #${DISCUSSION_NUMBER}: updated`);
  return false;
}

const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain) {
  const args = new Set(process.argv.slice(2));
  const check = args.has("--check");
  let stale = false;
  if (args.has("--discussion")) {
    stale = syncDiscussion(args.has("--apply"));
  } else {
    stale = syncReadmes(check);
  }
  if (check && stale) process.exit(1);
}
