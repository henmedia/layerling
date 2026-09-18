import { describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/layerling-mcp/route";

const ROUTE = "/api/layerling-mcp";

function request(url: string, headers: Record<string, string> = {}) {
  return new Request(`${url}${ROUTE}`, { headers });
}

// A browser fetch from the editor page always carries these two headers.
function fromEditorPage(pageOrigin: string, servedFrom = pageOrigin) {
  return request(servedFrom, { origin: pageOrigin, "sec-fetch-site": "same-origin" });
}

describe("Layerling MCP route access control", () => {
  it("accepts a request without an Origin header, such as the stdio MCP server", async () => {
    const response = await GET(request("http://127.0.0.1:3000"));
    expect(response.status).toBe(200);
  });

  it.each(["http://localhost:3000", "http://127.0.0.1:3000", "http://[::1]:3000"])(
    "accepts an editor tab opened at %s",
    async (pageOrigin) => {
      const response = await GET(fromEditorPage(pageOrigin));
      expect(response.status).toBe(200);
    },
  );

  // Next reports request.url under the hostname the dev server bound to, which
  // is not necessarily the one the user typed. Both name the same machine, so
  // the pairing below must not be treated as cross-origin.
  it("accepts a tab opened at 127.0.0.1 while the server reports localhost", async () => {
    const response = await GET(fromEditorPage("http://127.0.0.1:3000", "http://localhost:3000"));
    expect(response.status).toBe(200);
  });

  it("accepts a tab opened at localhost while the server reports 127.0.0.1", async () => {
    const response = await GET(fromEditorPage("http://localhost:3000", "http://127.0.0.1:3000"));
    expect(response.status).toBe(200);
  });

  it("rejects a page served from another machine on the network", async () => {
    const response = await GET(request("http://192.168.1.50:3000"));
    expect(response.status).toBe(403);
  });

  it("rejects a remote site fetching the bridge", async () => {
    const response = await GET(
      request("http://localhost:3000", { origin: "https://evil.example", "sec-fetch-site": "cross-site" }),
    );
    expect(response.status).toBe(403);
  });

  it("rejects a local origin on a different port", async () => {
    const response = await GET(fromEditorPage("http://localhost:4000", "http://localhost:3000"));
    expect(response.status).toBe(403);
  });

  it("rejects a local origin on a different protocol", async () => {
    const response = await GET(fromEditorPage("https://localhost:3000", "http://localhost:3000"));
    expect(response.status).toBe(403);
  });

  it.each(["cross-site", "same-site"])("rejects a %s fetch even from a local origin", async (fetchSite) => {
    const response = await GET(
      request("http://localhost:3000", { origin: "http://localhost:3000", "sec-fetch-site": fetchSite }),
    );
    expect(response.status).toBe(403);
  });

  it("rejects an unparseable Origin header", async () => {
    const response = await GET(request("http://localhost:3000", { origin: "not a url" }));
    expect(response.status).toBe(403);
  });

  it("guards POST with the same rule as GET", async () => {
    const response = await POST(
      new Request(`http://192.168.1.50:3000${ROUTE}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "heartbeat", editor: {} }),
      }),
    );
    expect(response.status).toBe(403);
  });
});
