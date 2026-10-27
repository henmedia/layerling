import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DELETE, POST } from "@/app/api/shared-projects/route";

/*
 * The custom shapes are found by the name of their folder at the top of the store, so that folder
 * is not renamed or deleted; the folders inside it are the shapes panel's to change.
 */

const SHARED_PROJECTS_ENV = "LAYERLING_SHARED_PROJECTS_DIR";
const headers = { Origin: "http://localhost" };

let root = "";
let previousRoot: string | undefined;

beforeEach(async () => {
  previousRoot = process.env[SHARED_PROJECTS_ENV];
  root = await fs.mkdtemp(path.join(os.tmpdir(), "layerling-shapes-folder-"));
  process.env[SHARED_PROJECTS_ENV] = root;
  await fs.mkdir(path.join(root, "Custom shapes", "Brackets"), { recursive: true });
  await fs.writeFile(path.join(root, "Custom shapes", "Clip.lyl"), "shape");
});

afterEach(async () => {
  if (previousRoot === undefined) delete process.env[SHARED_PROJECTS_ENV];
  else process.env[SHARED_PROJECTS_ENV] = previousRoot;
  await fs.rm(root, { recursive: true, force: true });
});

describe("the custom shapes folder of the store", () => {
  it("cannot be renamed or deleted", async () => {
    const renamed = await POST(new Request("http://localhost/api/shared-projects?path=Custom%20shapes&renameTo=Other", { method: "POST", headers }));
    const deleted = await DELETE(new Request("http://localhost/api/shared-projects?path=Custom%20shapes&deleteFolder=1&recursive=1", { method: "DELETE", headers }));
    expect(renamed.status).toBe(400);
    expect(deleted.status).toBe(400);
    await expect(fs.stat(path.join(root, "Custom shapes", "Clip.lyl"))).resolves.toBeTruthy();
  });

  it("still lets the folders inside it change", async () => {
    const renamed = await POST(new Request("http://localhost/api/shared-projects?path=Custom%20shapes%2FBrackets&renameTo=Holders", { method: "POST", headers }));
    expect(renamed.status).toBe(200);
    await expect(fs.stat(path.join(root, "Custom shapes", "Holders"))).resolves.toBeTruthy();
  });
});
