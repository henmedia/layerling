import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DELETE, GET, POST } from "@/app/api/shared-projects/route";

/*
 * An export file - STL, 3MF, STEP, SVG ... - goes into a folder of the server store (#779), so a slicer
 * that shares the folder can open it. It is no project: the list does not show it, and a file of the same
 * name is replaced only when the request says so.
 */

const SHARED_PROJECTS_ENV = "LAYERLING_SHARED_PROJECTS_DIR";

let sharedProjectsRoot = "";
let previousSharedProjectsRoot: string | undefined;

function exportRequest(fileName: string, bytes: string, options: { folder?: string; overwrite?: boolean; origin?: string } = {}) {
  const query = new URLSearchParams({ exportFile: fileName });
  if (options.folder) query.set("path", options.folder);
  if (options.overwrite) query.set("overwrite", "1");
  return new Request(`http://localhost/api/shared-projects?${query.toString()}`, {
    method: "POST",
    headers: { Origin: options.origin ?? "http://localhost" },
    body: bytes,
  });
}

describe("saving an export file on the server", () => {
  beforeEach(async () => {
    previousSharedProjectsRoot = process.env[SHARED_PROJECTS_ENV];
    sharedProjectsRoot = await fs.mkdtemp(path.join(os.tmpdir(), "layerling-shared-export-"));
    process.env[SHARED_PROJECTS_ENV] = sharedProjectsRoot;
  });

  afterEach(async () => {
    if (previousSharedProjectsRoot === undefined) delete process.env[SHARED_PROJECTS_ENV];
    else process.env[SHARED_PROJECTS_ENV] = previousSharedProjectsRoot;
    await fs.rm(sharedProjectsRoot, { recursive: true, force: true });
  });

  it("writes the file into the folder and says where", async () => {
    await fs.mkdir(path.join(sharedProjectsRoot, "Prints"));

    const response = await POST(exportRequest("Bracket.3mf", "PK\u0003\u00043mf", { folder: "Prints" }));

    expect(response.status).toBe(201);
    const payload = await response.json() as { file: { fileName: string; path: string; size: number } };
    expect(payload.file).toEqual({ fileName: "Bracket.3mf", path: "Prints", size: 7 });
    expect(await fs.readFile(path.join(sharedProjectsRoot, "Prints", "Bracket.3mf"), "utf8")).toBe("PK\u0003\u00043mf");
  });

  it("leaves a file of the same name alone until the request asks to replace it", async () => {
    await POST(exportRequest("Part.stl", "first"));

    const refused = await POST(exportRequest("Part.stl", "second"));
    expect(refused.status).toBe(409);
    expect(await refused.json()).toMatchObject({ exists: true, fileName: "Part.stl" });
    expect(await fs.readFile(path.join(sharedProjectsRoot, "Part.stl"), "utf8")).toBe("first");

    const replaced = await POST(exportRequest("Part.stl", "second", { overwrite: true }));
    expect(replaced.status).toBe(200);
    expect(await fs.readFile(path.join(sharedProjectsRoot, "Part.stl"), "utf8")).toBe("second");
  });

  it("does not show the file in the list of designs", async () => {
    await POST(exportRequest("Part.step", "ISO-10303-21;\nHEADER;"));

    const listing = await (await GET(new Request("http://localhost/api/shared-projects"))).json() as { projects: unknown[] };

    expect(listing.projects).toEqual([]);
  });

  it("refuses types that are no export, names that climb out, and other origins", async () => {
    expect((await POST(exportRequest("run.php", "<?php"))).status).toBe(400);
    expect((await POST(exportRequest("notes.lyl", "x"))).status).toBe(400);
    expect((await POST(exportRequest("Part.stl", "x", { folder: "../outside" }))).status).toBe(400);
    expect((await POST(exportRequest("Part.stl", "x", { origin: "http://elsewhere.example" }))).status).toBe(403);

    const climbing = await POST(exportRequest("../../escape.stl", "x"));
    expect(climbing.status).toBe(201);
    expect(await fs.readdir(sharedProjectsRoot)).toEqual(["escape.stl"]);
  });

  it("does not let a folder with export files go without being asked", async () => {
    await fs.mkdir(path.join(sharedProjectsRoot, "Prints"));
    await POST(exportRequest("Part.stl", "x", { folder: "Prints" }));

    const refused = await DELETE(new Request("http://localhost/api/shared-projects?path=Prints&deleteFolder=1", { method: "DELETE", headers: { Origin: "http://localhost" } }));

    expect(refused.status).toBe(409);
    expect(await refused.json()).toMatchObject({ files: 1 });
    expect(await fs.readdir(path.join(sharedProjectsRoot, "Prints"))).toContain("Part.stl");
  });

  // As store.php: a lock left by a request that died does not keep the name locked for good.
  it("takes over a lock older than a minute, but not a fresh one", async () => {
    const lockPath = path.join(sharedProjectsRoot, "Part.stl.lock");
    await fs.writeFile(lockPath, "");
    expect((await POST(exportRequest("Part.stl", "solid a"))).status).toBe(409);

    const old = new Date(Date.now() - 120_000);
    await fs.utimes(lockPath, old, old);
    expect((await POST(exportRequest("Part.stl", "solid a"))).status).toBe(201);
    expect(await fs.readdir(sharedProjectsRoot)).toEqual(["Part.stl"]);
  });

  // The same check store.php makes (GHSA-wj5x-5r5v-89r3): a file is what its name says and nothing a browser could run.
  it("refuses a file that is not what its name says", async () => {
    const drawing = '<svg xmlns="http://www.w3.org/2000/svg"><g><path d="M0 0L10 10"/><text>A</text></g></svg>';
    expect((await POST(exportRequest("Plan.svg", drawing))).status).toBe(201);
    expect((await POST(exportRequest("Bad.svg", '<svg><script>alert(1)</script></svg>'))).status).toBe(400);
    expect((await POST(exportRequest("Bad2.svg", '<svg onload="alert(1)"><path/></svg>'))).status).toBe(400);
    expect((await POST(exportRequest("Bad3.svg", '<svg><a href="javascript:alert(1)"><path/></a></svg>'))).status).toBe(400);
    expect((await POST(exportRequest("Page.stl", "<html><script>alert(1)</script></html>"))).status).toBe(400);
    expect((await POST(exportRequest("Fake.png", "not a picture"))).status).toBe(400);
    expect((await POST(exportRequest("Fake.pdf", "not a pdf"))).status).toBe(400);
    expect((await POST(exportRequest("Fake.step", "<html>"))).status).toBe(400);
    expect((await POST(exportRequest("Real.step", "\uFEFF ISO-10303-21;"))).status).toBe(201);
    expect((await POST(exportRequest("Real.pdf", "%PDF-1.7"))).status).toBe(201);
    expect((await POST(exportRequest("Real.dxf", "0\nSECTION"))).status).toBe(201);
    expect(await fs.readdir(sharedProjectsRoot)).toEqual(expect.not.arrayContaining(["Bad.svg", "Bad2.svg", "Bad3.svg", "Page.stl", "Fake.png", "Fake.pdf", "Fake.step"]));
  });
});
