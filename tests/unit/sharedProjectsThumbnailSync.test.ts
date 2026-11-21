import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DELETE, GET, POST } from "@/app/api/shared-projects/route";
import { exportLylProject } from "@/lib/lylProject";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * A store folder that a sync program carries between two computers (Issue #1874): the design
 * arrives with a modification time that is some seconds off, so its revision - size and time -
 * is another one there, and the picture, which is named after the revision of the computer that
 * saved it, was not found: "No snapshot" on the start page. The picture is now also found by the
 * file's name and size alone. These tests stand on the second computer: the picture in the folder
 * carries the same size and another time than the file has here.
 */

const SHARED_PROJECTS_ENV = "LAYERLING_SHARED_PROJECTS_DIR";
const THUMBNAILS_DIRECTORY = ".thumbnails";
const PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);
/** What the report measured between the two computers. */
const SYNC_DRIFT_MICROS = 15_000_000;

let sharedProjectsRoot = "";
let previousSharedProjectsRoot: string | undefined;

type Listed = { fileName: string; revision: string; thumbnailUrl?: string };

async function listProject(fileName: string, folder = "") {
  const query = folder ? `?path=${encodeURIComponent(folder)}` : "";
  const response = await GET(new Request(`http://localhost/api/shared-projects${query}`));
  const payload = await response.json() as { projects: Listed[] };
  const project = payload.projects.find((candidate) => candidate.fileName === fileName);
  if (!project) throw new Error(`Could not find ${fileName} in the listing`);
  return project;
}

async function createSharedProject(fileName: string, content: string | Uint8Array = "shared project", folder = "") {
  await fs.mkdir(path.join(sharedProjectsRoot, folder), { recursive: true });
  await fs.writeFile(path.join(sharedProjectsRoot, folder, fileName), content);
  return listProject(fileName, folder);
}

/** The revision the same file has on the other computer: the same size, a time that is off. */
function revisionElsewhere(revision: string, driftMicros = SYNC_DRIFT_MICROS) {
  const [size, time] = revision.split("-");
  return `${size}-${(parseInt(time, 16) - driftMicros).toString(16)}`;
}

async function createThumbnail(fileName: string, revision: string, content = "picture", folder = "") {
  const thumbnails = path.join(sharedProjectsRoot, folder, THUMBNAILS_DIRECTORY);
  await fs.mkdir(thumbnails, { recursive: true });
  await fs.writeFile(path.join(thumbnails, `${fileName}.${revision}.png`), content);
}

async function thumbnailNames(folder = "") {
  return (await fs.readdir(path.join(sharedProjectsRoot, folder, THUMBNAILS_DIRECTORY)).catch(() => [] as string[])).sort();
}

async function fetchThumbnail(project: Listed) {
  if (!project.thumbnailUrl) throw new Error(`${project.fileName} is listed without a picture`);
  return GET(new Request(`http://localhost${project.thumbnailUrl}`));
}

function writeRequest(query: Record<string, string>, revision: string, body?: FormData) {
  const headers = new Headers({ Origin: "http://localhost", "If-Match": `"${revision}"` });
  return new Request(`http://localhost/api/shared-projects?${new URLSearchParams(query).toString()}`, { method: "POST", headers, body });
}

const box = {
  id: "box-1",
  name: "Box",
  kind: "box",
  x: 0,
  y: 0,
  z: 0,
  size: 20,
  width: 20,
  depth: 10,
  height: 5,
  rotation: 0,
  color: "#d84a3a",
} as WorkplaneShape;

async function savedPackage(projectName: string) {
  return exportLylProject({
    projectId: "design-1",
    projectName,
    createdAt: Date.UTC(2026, 9, 1),
    modifiedAt: Date.UTC(2026, 9, 2),
    shapes: [box],
    history: [],
    historyIndex: 0,
    assets: [],
    compressionLevel: 1,
  } as Parameters<typeof exportLylProject>[0]);
}

describe("the picture of a shared design whose file time differs from the one in the picture's name (#1874)", () => {
  beforeEach(async () => {
    previousSharedProjectsRoot = process.env[SHARED_PROJECTS_ENV];
    sharedProjectsRoot = await fs.mkdtemp(path.join(os.tmpdir(), "layerling-shared-thumbnail-sync-"));
    process.env[SHARED_PROJECTS_ENV] = sharedProjectsRoot;
  });

  afterEach(async () => {
    if (previousSharedProjectsRoot === undefined) delete process.env[SHARED_PROJECTS_ENV];
    else process.env[SHARED_PROJECTS_ENV] = previousSharedProjectsRoot;
    await fs.rm(sharedProjectsRoot, { recursive: true, force: true });
  });

  it("lists the design with its picture and serves it", async () => {
    const project = await createSharedProject("ZAOARTLAB_TEST_001.lyl");
    await createThumbnail(project.fileName, revisionElsewhere(project.revision), "from the other computer");

    const listed = await listProject(project.fileName);
    expect(listed.thumbnailUrl).toBeTruthy();
    // The revision itself stays this computer's own: it is what guards a save.
    expect(listed.revision).toBe(project.revision);

    const response = await fetchThumbnail(listed);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("from the other computer");
    // Not kept for a year: the exactly named picture may still arrive under the same address.
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("finds it in a sub-folder, in the search and in the list of all designs too", async () => {
    const project = await createSharedProject("Winkel.lyl", "shared project", "Werkstatt");
    await createThumbnail(project.fileName, revisionElsewhere(project.revision), "picture", "Werkstatt");

    expect((await listProject(project.fileName, "Werkstatt")).thumbnailUrl).toBeTruthy();
    const search = await (await GET(new Request("http://localhost/api/shared-projects?search=wink"))).json() as { projects: Listed[] };
    expect(search.projects[0]?.thumbnailUrl).toBeTruthy();
    const all = await (await GET(new Request("http://localhost/api/shared-projects?all=1"))).json() as { projects: Listed[] };
    expect(all.projects[0]?.thumbnailUrl).toBeTruthy();
  });

  it("prefers the picture of the exact revision, and that one may be kept by the browser", async () => {
    const project = await createSharedProject("Exact.lyl");
    await createThumbnail(project.fileName, revisionElsewhere(project.revision), "near");
    await createThumbnail(project.fileName, project.revision, "exact");

    const response = await fetchThumbnail(await listProject(project.fileName));
    expect(await response.text()).toBe("exact");
    expect(response.headers.get("Cache-Control")).toContain("immutable");
  });

  it("takes the picture whose time is nearest to the file's when several have the size", async () => {
    const project = await createSharedProject("Several.lyl");
    await createThumbnail(project.fileName, revisionElsewhere(project.revision, 3_600_000_000), "an hour off");
    await createThumbnail(project.fileName, revisionElsewhere(project.revision, -SYNC_DRIFT_MICROS), "seconds off");
    await createThumbnail(project.fileName, revisionElsewhere(project.revision, 86_400_000_000), "a day off");

    const response = await fetchThumbnail(await listProject(project.fileName));
    expect(await response.text()).toBe("seconds off");
  });

  it("does not show a picture of another size: that one is of older contents", async () => {
    const project = await createSharedProject("Edited.lyl", "the contents after the edit");
    const [size, time] = project.revision.split("-");
    await createThumbnail(project.fileName, `${(parseInt(size, 16) + 1).toString(16)}-${time}`);

    const listed = await listProject(project.fileName);
    expect(listed.thumbnailUrl).toBeUndefined();
    const query = new URLSearchParams({ fileName: project.fileName, thumbnail: "1", v: project.revision });
    expect((await GET(new Request(`http://localhost/api/shared-projects?${query.toString()}`))).status).toBe(404);
  });

  it("does not lend a design the picture of another one whose name only starts the same way", async () => {
    const project = await createSharedProject("a.lyl");
    const sizeHex = project.revision.split("-")[0];
    // The picture of a design called "a.lyl.<size>-1.png.lyl", and files that are no pictures at all.
    await createThumbnail(`a.lyl.${sizeHex}-1.png.lyl`, revisionElsewhere(project.revision));
    await createThumbnail("a.lyl", `${sizeHex}-xyz`);
    await createThumbnail("a.lyl", `${sizeHex}-1/../../outside`.replace(/\//g, "_"));
    await createThumbnail("A.lyl", revisionElsewhere(project.revision));

    expect((await listProject(project.fileName)).thumbnailUrl).toBeUndefined();
  });

  it("does not follow a link that stands where a picture would", async () => {
    const project = await createSharedProject("Linked.lyl");
    const outside = path.join(sharedProjectsRoot, "outside.txt");
    await fs.writeFile(outside, "not a picture of the store");
    const thumbnails = path.join(sharedProjectsRoot, THUMBNAILS_DIRECTORY);
    await fs.mkdir(thumbnails, { recursive: true });
    // A Windows checkout without Developer Mode may not create links at all; there is nothing to refuse then.
    const linked = await fs.symlink(outside, path.join(thumbnails, `${project.fileName}.${revisionElsewhere(project.revision)}.png`)).then(() => true, () => false);
    if (!linked) return;

    expect((await listProject(project.fileName)).thumbnailUrl).toBeUndefined();
  });

  it("still refuses a picture request for a revision the file no longer has", async () => {
    const project = await createSharedProject("Stale.lyl");
    await createThumbnail(project.fileName, revisionElsewhere(project.revision));

    const query = new URLSearchParams({ fileName: project.fileName, thumbnail: "1", v: revisionElsewhere(project.revision) });
    expect((await GET(new Request(`http://localhost/api/shared-projects?${query.toString()}`))).status).toBe(404);
  });

  it("leaves the pictures alone when it only reads: two computers must not take them from each other", async () => {
    const project = await createSharedProject("Read only.lyl");
    await createThumbnail(project.fileName, revisionElsewhere(project.revision));
    await createThumbnail(project.fileName, revisionElsewhere(project.revision, 3_600_000_000));
    const before = await thumbnailNames();

    await fetchThumbnail(await listProject(project.fileName));
    await GET(new Request("http://localhost/api/shared-projects?search=read"));
    await GET(new Request("http://localhost/api/shared-projects?all=1"));

    expect(await thumbnailNames()).toEqual(before);
  });

  it("still refuses a save against the other computer's revision", async () => {
    const bytes = await savedPackage("Guarded");
    const project = await createSharedProject("Guarded.lyl", bytes);
    await createThumbnail(project.fileName, revisionElsewhere(project.revision));

    const body = new FormData();
    body.set("project", new Blob([bytes]));
    body.set("thumbnail", new Blob([PNG]));
    const response = await POST(writeRequest({ fileName: project.fileName }, revisionElsewhere(project.revision), body));

    expect(response.status).toBe(409);
    expect(await thumbnailNames()).toEqual([`${project.fileName}.${revisionElsewhere(project.revision)}.png`]);
  });

  it("replaces the other computer's picture on a save, so it cannot come back for later contents", async () => {
    const project = await createSharedProject("Saved.lyl", await savedPackage("Saved"));
    await createThumbnail(project.fileName, revisionElsewhere(project.revision), "old picture");
    await createThumbnail("Other.lyl", revisionElsewhere(project.revision), "of another design");

    const body = new FormData();
    body.set("project", new Blob([await savedPackage("Saved")]));
    body.set("thumbnail", new Blob([PNG]));
    const response = await POST(writeRequest({ fileName: project.fileName }, project.revision, body));

    expect(response.status).toBe(200);
    const saved = (await response.json() as { project: Listed }).project;
    expect(await thumbnailNames()).toEqual([
      `Other.lyl.${revisionElsewhere(project.revision)}.png`,
      `${project.fileName}.${saved.revision}.png`,
    ]);
    const picture = await fetchThumbnail(await listProject(project.fileName));
    expect(new Uint8Array(await picture.arrayBuffer())).toEqual(PNG);
  });

  it("takes the picture along when the design is renamed, moved or duplicated", async () => {
    const project = await createSharedProject("Alt.lyl");
    await createThumbnail(project.fileName, revisionElsewhere(project.revision), "from the other computer");

    const copied = await POST(writeRequest({ fileName: "Alt.lyl", copyTo: "Kopie" }, project.revision));
    expect(copied.status).toBe(201);
    expect(await (await fetchThumbnail(await listProject("Kopie.lyl"))).text()).toBe("from the other computer");
    // The original keeps its own.
    expect((await listProject("Alt.lyl")).thumbnailUrl).toBeTruthy();

    const renamed = await POST(writeRequest({ fileName: "Alt.lyl", renameFileTo: "Neu" }, project.revision));
    expect(renamed.status).toBe(200);
    const renamedProject = (await renamed.json() as { project: Listed }).project;
    expect(renamedProject.thumbnailUrl).toBeTruthy();
    expect((await thumbnailNames()).filter((name) => name.startsWith("Alt.lyl."))).toEqual([]);

    await fs.mkdir(path.join(sharedProjectsRoot, "Ablage"));
    const moved = await POST(writeRequest({ fileName: "Neu.lyl", moveTo: "Ablage" }, renamedProject.revision));
    expect(moved.status).toBe(200);
    expect(await (await fetchThumbnail(await listProject("Neu.lyl", "Ablage"))).text()).toBe("from the other computer");
    expect((await thumbnailNames()).filter((name) => name.startsWith("Neu.lyl."))).toEqual([]);
  });

  it("removes the picture with the design when it is deleted", async () => {
    const project = await createSharedProject("Weg.lyl");
    await createThumbnail(project.fileName, revisionElsewhere(project.revision));
    await createThumbnail("Bleibt.lyl", revisionElsewhere(project.revision));

    const query = new URLSearchParams({ fileName: project.fileName });
    const response = await DELETE(new Request(`http://localhost/api/shared-projects?${query.toString()}`, {
      method: "DELETE",
      headers: { Origin: "http://localhost", "If-Match": `"${project.revision}"` },
    }));

    expect(response.status).toBe(200);
    expect(await thumbnailNames()).toEqual([`Bleibt.lyl.${revisionElsewhere(project.revision)}.png`]);
  });
});
