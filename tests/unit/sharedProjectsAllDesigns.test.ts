import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/shared-projects/route";

/*
 * "Back up all" on the start page's server tab packs what `?all=1` lists, and the tab shows the
 * `total`: every design of the store in its folder, the empty folders, and not the custom shapes.
 */

const SHARED_PROJECTS_ENV = "LAYERLING_SHARED_PROJECTS_DIR";

let root = "";
let previousRoot: string | undefined;

beforeEach(async () => {
  previousRoot = process.env[SHARED_PROJECTS_ENV];
  root = await fs.mkdtemp(path.join(os.tmpdir(), "layerling-all-designs-"));
  process.env[SHARED_PROJECTS_ENV] = root;
  await fs.mkdir(path.join(root, "Prints", "Deep"), { recursive: true });
  await fs.mkdir(path.join(root, "Empty"));
  await fs.mkdir(path.join(root, "Custom shapes"));
  await fs.writeFile(path.join(root, "Top.lyl"), "a");
  await fs.writeFile(path.join(root, "Prints", "Deep", "Nested.lyl"), "b");
  await fs.writeFile(path.join(root, "Custom shapes", "Clip.lyl"), "c");
});

afterEach(async () => {
  if (previousRoot === undefined) delete process.env[SHARED_PROJECTS_ENV];
  else process.env[SHARED_PROJECTS_ENV] = previousRoot;
  await fs.rm(root, { recursive: true, force: true });
});

describe("every design of the store", () => {
  it("lists each design in its folder, and the empty folders, without the custom shapes", async () => {
    const payload = await (await GET(new Request("http://localhost/api/shared-projects?all=1"))).json() as {
      projects: Array<{ fileName: string; path?: string }>;
      emptyFolders: string[];
    };
    expect(payload.projects.map((project) => `${project.path ?? ""}/${project.fileName}`).sort()).toEqual(["/Top.lyl", "Prints/Deep/Nested.lyl"]);
    expect(payload.emptyFolders).toEqual(["Empty"]);
  });

  it("counts them for the server's tab in any folder's listing", async () => {
    const payload = await (await GET(new Request("http://localhost/api/shared-projects?path=Prints"))).json() as { total: number };
    expect(payload.total).toBe(2);
  });
});
