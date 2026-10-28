import { describe, expect, it } from "vitest";
import { precachePaths, serviceWorkerSource } from "../../scripts/generate-service-worker.mjs";

describe("offline copy of layerling", () => {
  it("stores the program but not server scripts, crawler files or the duplicate kernel", () => {
    const paths = precachePaths([
      "index.html",
      "_next/static/chunks/app/page-abc.js",
      "_next/static/media/occt-wasm.6db3513f.wasm",
      "occt/5.3.5-layerling.1/occt-wasm.wasm",
      "fonts/japanese/0123456789ab/base.typeface.json",
      "fonts/japanese/0123456789ab/level2.typeface.json",
      "fonts/japanese/version.txt",
      "manifold.wasm",
      "store.php",
      "kontakt.php",
      "robots.txt",
      "sitemap.xml",
      "index.txt",
      "404.html",
      "404/index.html",
      "sw.js",
      "_next/static/chunks/main.js.map",
    ]);
    expect(paths).toEqual([
      "/",
      "/_next/static/chunks/app/page-abc.js",
      "/manifold.wasm",
      "/occt/5.3.5-layerling.1/occt-wasm.wasm",
    ]);
  });

  it("writes a service worker that is valid JavaScript and carries its version", () => {
    const source = serviceWorkerSource("abc123", ["/", "/manifold.wasm"]);
    expect(() => new Function(source)).not.toThrow();
    expect(source).toContain("layerling-fonts");
    expect(source).toContain('"abc123"');
    expect(source).toContain('["/","/manifold.wasm"]');
  });

  it("keeps the guide's pages for offline use but not its pictures", () => {
    const paths = precachePaths([
      "anleitung/index.html",
      "anleitung/formen.html",
      "anleitung/img/editor-overview.webp",
      "guide/shapes.html",
      "guide/img/editor-overview.webp",
    ]);
    expect(paths).toEqual(["/anleitung/formen.html", "/anleitung/index.html", "/guide/shapes.html"]);
    // The page for printing the whole guide is big and opened by few.
    expect(precachePaths(["anleitung/print-all.html", "guide/print-all.html", "handleiding/print-all.html", "guide/shapes.html"])).toEqual(["/guide/shapes.html"]);
    // Every language's folder, not only the first three (the Arabic pictures and 16 print pages went in, 28.10.2026).
    expect(precachePaths(["dalil/img/editor-overview.webp", "dalil/print-all.html", "zh-cn/print-all.html", "zh-cn/index.html"])).toEqual(["/zh-cn/index.html"]);
  });

  /*
   * A page left open across an update loads some files only when it needs
   * them, such as the CAD workers. The new version's service worker took over
   * and deleted the old copy, and the server no longer had the files either:
   * "worker failed to start" (discussion #88).
   */
  describe("across an update", () => {
    type Handler = (event: Record<string, unknown>) => void;
    const ORIGIN = "https://layerling.test";

    function browser(server: Set<string>) {
      const stores = new Map<string, Map<string, string>>();
      const network: string[] = [];
      const cacheFor = (name: string) => {
        if (!stores.has(name)) stores.set(name, new Map());
        const store = stores.get(name)!;
        return {
          async addAll(requests: Array<{ url: string }>) {
            for (const request of requests) store.set(request.url, `${name}:${request.url}`);
          },
          async match(path: string) {
            return store.has(path) ? new Response(store.get(path)) : undefined;
          },
          async put(path: string, response: Response) {
            store.set(path, await response.text());
          },
          async keys() {
            return [...store.keys()].map((path) => ({ url: ORIGIN + path }));
          },
          async delete(request: { url: string }) {
            return store.delete(request.url.slice(ORIGIN.length));
          },
        };
      };
      const caches = {
        open: async (name: string) => cacheFor(name),
        keys: async () => [...stores.keys()],
        delete: async (name: string) => stores.delete(name),
        async match(path: string, options?: { cacheName?: string }) {
          const names = options?.cacheName ? [options.cacheName] : [...stores.keys()];
          for (const name of names) {
            const hit = await stores.get(name)?.has(path) ? new Response(stores.get(name)!.get(path)) : undefined;
            if (hit) return hit;
          }
          return undefined;
        },
      };
      const fetchFromServer = async (request: string | { url: string }) => {
        const url = typeof request === "string" ? request : request.url;
        const path = url.startsWith(ORIGIN) ? url.slice(ORIGIN.length) : url;
        network.push(path);
        return server.has(path) ? new Response(`server:${path}`) : new Response("missing", { status: 404 });
      };
      class FakeRequest {
        url: string;
        constructor(url: string) {
          this.url = url;
        }
      }
      let handlers = new Map<string, Handler>();
      const self = {
        location: { origin: ORIGIN },
        addEventListener: (type: string, handler: Handler) => handlers.set(type, handler),
        skipWaiting: async () => undefined,
        clients: { claim: async () => undefined },
      };
      const lifecycle = async (type: string) => {
        const waits: Promise<unknown>[] = [];
        handlers.get(type)?.({ waitUntil: (promise: Promise<unknown>) => waits.push(promise) });
        await Promise.all(waits);
      };
      return {
        stores,
        network,
        async install(version: string, paths: string[]) {
          handlers = new Map();
          new Function("self", "caches", "fetch", "Request", "Response", serviceWorkerSource(version, paths))(self, caches, fetchFromServer, FakeRequest, Response);
          await lifecycle("install");
          await lifecycle("activate");
        },
        async request(path: string) {
          let answer: Promise<Response> | undefined;
          handlers.get("fetch")?.({
            request: { method: "GET", url: ORIGIN + path, mode: "no-cors" },
            respondWith: (promise: Promise<Response>) => {
              answer = promise;
            },
          });
          const response = await (answer ?? fetchFromServer(path));
          return { status: response.status, body: await response.text() };
        },
      };
    }

    it("still serves an open page of the previous version its worker", async () => {
      const server = new Set(["/", "/_next/static/chunks/233.old.js"]);
      const client = browser(server);
      await client.install("v1", ["/", "/_next/static/chunks/233.old.js"]);
      // The deploy replaces the files on the server, and the new worker takes over.
      server.clear();
      ["/", "/_next/static/chunks/233.new.js"].forEach((path) => server.add(path));
      await client.install("v2", ["/", "/_next/static/chunks/233.new.js"]);

      const old = await client.request("/_next/static/chunks/233.old.js");
      expect(old.status).toBe(200);
      expect(old.body).toBe("layerling-v1:/_next/static/chunks/233.old.js");
      const fresh = await client.request("/_next/static/chunks/233.new.js");
      expect(fresh.body).toBe("layerling-v2:/_next/static/chunks/233.new.js");
    });

    it("stores the Japanese typeface on first use, keeps it across versions and drops other cuts", async () => {
      const server = new Set(["/", "/fonts/japanese/aaa/base.typeface.json", "/fonts/japanese/bbb/base.typeface.json"]);
      const client = browser(server);
      await client.install("v1", ["/"]);
      expect(client.stores.get("layerling-fonts")).toBeUndefined();
      expect((await client.request("/fonts/japanese/aaa/base.typeface.json")).body).toBe("server:/fonts/japanese/aaa/base.typeface.json");
      // The second request comes from the computer, also after the server has lost the file and a new version took over.
      server.delete("/fonts/japanese/aaa/base.typeface.json");
      await client.install("v2", ["/"]);
      client.network.length = 0;
      expect((await client.request("/fonts/japanese/aaa/base.typeface.json")).body).toBe("server:/fonts/japanese/aaa/base.typeface.json");
      expect(client.network).toEqual([]);
      // A new cut replaces the old one.
      await client.request("/fonts/japanese/bbb/base.typeface.json");
      expect([...client.stores.get("layerling-fonts")!.keys()]).toEqual(["/fonts/japanese/bbb/base.typeface.json"]);
    });

    it("keeps the copy an older service worker left without a list", async () => {
      const client = browser(new Set(["/"]));
      client.stores.set("layerling-before", new Map([["/_next/static/chunks/233.before.js", "layerling-before:/_next/static/chunks/233.before.js"]]));
      await client.install("v1", ["/"]);
      expect((await client.request("/_next/static/chunks/233.before.js")).status).toBe(200);
    });

    it("keeps the last three versions and lets older ones go", async () => {
      const client = browser(new Set(["/"]));
      for (const version of ["v1", "v2", "v3", "v4"]) await client.install(version, ["/"]);
      expect([...client.stores.keys()].filter((name) => name !== "layerling-meta").sort()).toEqual(["layerling-v2", "layerling-v3", "layerling-v4"]);
      // Installing the same version again does not push the others out.
      await client.install("v4", ["/"]);
      expect([...client.stores.keys()].filter((name) => name !== "layerling-meta").sort()).toEqual(["layerling-v2", "layerling-v3", "layerling-v4"]);
    });
  });
});
