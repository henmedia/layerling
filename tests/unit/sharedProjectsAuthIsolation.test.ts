import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/shared-projects/route";

const SHARED_PROJECTS_ENV = "LAYERLING_SHARED_PROJECTS_DIR";
const USER_HEADER_ENV = "LAYERLING_USER_HEADER";

let sharedProjectsRoot = "";
let previousSharedProjectsRoot: string | undefined;
let previousUserHeader: string | undefined;

function projectRequest(url: string, headers: Record<string, string> = {}) {
  return new Request(url, {
    method: "GET",
    headers,
  });
}

describe("shared projects user isolation & streaming", () => {
  beforeEach(async () => {
    previousSharedProjectsRoot = process.env[SHARED_PROJECTS_ENV];
    previousUserHeader = process.env[USER_HEADER_ENV];
    sharedProjectsRoot = await fs.mkdtemp(path.join(os.tmpdir(), "layerling-user-isolation-"));
    process.env[SHARED_PROJECTS_ENV] = sharedProjectsRoot;
    delete process.env[USER_HEADER_ENV];
  });

  afterEach(async () => {
    if (previousSharedProjectsRoot === undefined) delete process.env[SHARED_PROJECTS_ENV];
    else process.env[SHARED_PROJECTS_ENV] = previousSharedProjectsRoot;

    if (previousUserHeader === undefined) delete process.env[USER_HEADER_ENV];
    else process.env[USER_HEADER_ENV] = previousUserHeader;

    await fs.rm(sharedProjectsRoot, { recursive: true, force: true });
  });

  it("ignores auth headers by default when LAYERLING_USER_HEADER is unset", async () => {
    // Put a project in the shared root
    await fs.writeFile(path.join(sharedProjectsRoot, "PublicProject.lyl"), "public data");

    // Put a project in a .users folder
    const aliceDir = path.join(sharedProjectsRoot, ".users", "alice_at_example.com");
    await fs.mkdir(aliceDir, { recursive: true });
    await fs.writeFile(path.join(aliceDir, "AliceProject.lyl"), "alice data");

    // Requests with headers should NOT be isolated into .users; they see the shared root
    const resWithEmail = await GET(projectRequest("http://localhost/api/shared-projects", {
      "x-forwarded-email": "alice@example.com",
    }));
    expect(resWithEmail.status).toBe(200);
    const payloadWithEmail = await resWithEmail.json() as { projects: Array<{ name: string }> };
    expect(payloadWithEmail.projects.map((p) => p.name)).toEqual(["PublicProject"]);

    const resWithRemoteUser = await GET(projectRequest("http://localhost/api/shared-projects", {
      "remote-user": "alice@example.com",
    }));
    expect(resWithRemoteUser.status).toBe(200);
    const payloadWithRemoteUser = await resWithRemoteUser.json() as { projects: Array<{ name: string }> };
    expect(payloadWithRemoteUser.projects.map((p) => p.name)).toEqual(["PublicProject"]);
  });

  it("isolates users based only on the configured LAYERLING_USER_HEADER", async () => {
    process.env[USER_HEADER_ENV] = "X-Forwarded-Email";

    const aliceDir = path.join(sharedProjectsRoot, ".users", "alice_at_example.com");
    await fs.mkdir(aliceDir, { recursive: true });
    await fs.writeFile(path.join(aliceDir, "AliceProject.lyl"), "alice data");

    const bobDir = path.join(sharedProjectsRoot, ".users", "bob_at_example.com");
    await fs.mkdir(bobDir, { recursive: true });
    await fs.writeFile(path.join(bobDir, "BobProject.lyl"), "bob data");

    // Alice requests her projects via configured header
    const aliceRes = await GET(projectRequest("http://localhost/api/shared-projects", {
      "x-forwarded-email": "Alice@Example.COM",
    }));
    expect(aliceRes.status).toBe(200);
    const alicePayload = await aliceRes.json() as { projects: Array<{ name: string }> };
    expect(alicePayload.projects.map((p) => p.name)).toEqual(["AliceProject"]);

    // Bob requests his projects via configured header
    const bobRes = await GET(projectRequest("http://localhost/api/shared-projects", {
      "x-forwarded-email": "bob@example.com",
    }));
    expect(bobRes.status).toBe(200);
    const bobPayload = await bobRes.json() as { projects: Array<{ name: string }> };
    expect(bobPayload.projects.map((p) => p.name)).toEqual(["BobProject"]);

    // Unconfigured headers (like Remote-User or X-Forwarded-User) are ignored
    const otherHeaderRes = await GET(projectRequest("http://localhost/api/shared-projects", {
      "x-forwarded-user": "alice@example.com",
      "remote-user": "alice@example.com",
    }));
    expect(otherHeaderRes.status).toBe(200);
    const otherPayload = await otherHeaderRes.json() as { projects: Array<{ name: string }> };
    expect(otherPayload.projects).toEqual([]);

    // Unauthenticated user sees shared root
    const unauthRes = await GET(projectRequest("http://localhost/api/shared-projects"));
    expect(unauthRes.status).toBe(200);
    const unauthPayload = await unauthRes.json() as { projects: Array<{ name: string }> };
    expect(unauthPayload.projects).toEqual([]);
  });

  it("sanitizes identity and works with custom header names", async () => {
    process.env[USER_HEADER_ENV] = "Remote-User";

    const userDir = path.join(sharedProjectsRoot, ".users", "test.user_special");
    await fs.mkdir(userDir, { recursive: true });
    await fs.writeFile(path.join(userDir, "Test.lyl"), "test data");

    const res = await GET(projectRequest("http://localhost/api/shared-projects", {
      "remote-user": "  Test.User+Special  ",
    }));
    expect(res.status).toBe(200);
    const payload = await res.json() as { projects: Array<{ name: string }> };
    expect(payload.projects.map((p) => p.name)).toEqual(["Test"]);
  });

  it("streams project downloads with correct headers without buffering", async () => {
    const projectContent = "LYL_PROJECT_STREAMING_TEST_CONTENT";
    await fs.writeFile(path.join(sharedProjectsRoot, "StreamTest.lyl"), projectContent);

    const res = await GET(projectRequest("http://localhost/api/shared-projects?fileName=StreamTest.lyl"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Disposition")).toContain("StreamTest.lyl");
    expect(res.headers.get("Content-Type")).toBe("application/vnd.layerling.project+zip");
    expect(res.headers.get("Content-Length")).toBe(String(projectContent.length));
    expect(res.headers.get("Cache-Control")).toBe("no-store");

    const downloadedText = await res.text();
    expect(downloadedText).toBe(projectContent);
  });
});
