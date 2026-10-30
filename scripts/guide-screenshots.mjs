import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadMessages } from "./build-guide.mjs";
import { scenes } from "./guide-scenes.mjs";

// Takes the guide's pictures from the running program, once per language.
//
//   npm run dev -- -p 3010            (the MCP bridge only exists in the dev server)
//   npm run guide:images              (all scenes, both languages)
//   node scripts/guide-screenshots.mjs --only curved-text --lang de
//
// A scene builds its situation through the MCP bridge and the real buttons,
// so the picture shows what a person sees - and is renewed whenever the
// interface changes. Scenes live in scripts/guide-scenes.mjs.
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? args[at + 1] : fallback;
};
const BASE = option("base", "http://localhost:3010");
const only = option("only", "")?.split(",").filter(Boolean);
const languages = option("lang", "de,en").split(",");
const WIDTH = Number(option("width", 1280));
const HEIGHT = Number(option("height", 800));
const EDGE = process.env.EDGE_PATH ?? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function session(language, port) {
  const profile = mkdtempSync(join(tmpdir(), "edge-guide-"));
  const edge = spawn(EDGE, [
    "--headless=new", "--disable-gpu", "--disable-extensions", "--no-first-run", `--lang=${language === "de" ? "de-DE" : "en-US"}`,
    `--window-size=${WIDTH},${HEIGHT}`, `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "about:blank",
  ], { stdio: "ignore" });
  for (let i = 0; i < 60; i += 1) {
    try { if ((await fetch(`http://127.0.0.1:${port}/json/version`)).ok) break; } catch { /* still starting */ }
    await wait(250);
  }
  const tab = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
  const socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));
  let sequence = 0;
  const send = (method, params = {}) => new Promise((resolve) => {
    const id = ++sequence;
    const listener = (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== id) return;
      socket.removeEventListener("message", listener);
      resolve(message.result ?? message);
    };
    socket.addEventListener("message", listener);
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const response = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true, userGesture: true });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description ?? "evaluate failed");
    return response.result?.value;
  };
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false });
  await send("Emulation.setFocusEmulationEnabled", { enabled: true });
  await send("Page.setWebLifecycleState", { state: "active" });
  const close = () => {
    try { socket.close(); } catch { /* already closed */ }
    edge.kill();
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* Edge still lets go of the folder */ }
  };
  return { send, evaluate, close };
}

async function run(language, port) {
  const messages = await loadMessages(language);
  const { send, evaluate, close } = await session(language, port);
  const imageDirectory = join(root, "docs", "guide", "images", language);
  mkdirSync(imageDirectory, { recursive: true });
  const editorList = async () => {
    const editors = await (await fetch(`${BASE}/api/layerling-mcp`)).json();
    return [...(editors.editors ?? editors)];
  };
  let ownEditor = null;
  let loads = 0;

  const ctx = {
    language, wait, evaluate, send, BASE,
    /** The interface's own wording, so a scene finds buttons by the name a reader sees. */
    t: (key, values = {}) => {
      const text = messages[key];
      if (text === undefined) throw new Error(`Unknown message ${key}`);
      return text.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? `{${name}}`));
    },
    async goto(path = "/?editor=1", settle = 6000) {
      if (!path.includes("editor")) {
        await send("Page.navigate", { url: `${BASE}${path}` });
        await wait(settle);
      } else {
        // Other editors on the same dev server (the other languages of this run, another session's browser) must not get
        // this scene's commands: ours is the one whose address carries this load's mark. Once it has reported to the
        // bridge it takes commands, so there is no fixed wait; a busy dev server can take a while to bring it up.
        loads += 1;
        const mark = `guide=${language}-${loads}`;
        // The object list starts closed, as for a new reader; the browser would keep it open after a scene that showed it.
        await evaluate(`try { localStorage.removeItem("layerling.editor.objectListOpen"); } catch {} true`);
        await send("Page.navigate", { url: `${BASE}${path}${path.includes("?") ? "&" : "?"}${mark}` });
        await wait(1500);
        ownEditor = null;
        for (let tries = 0; tries < 60 && ownEditor === null; tries += 1) {
          ownEditor = (await editorList()).find((editor) => editor.url?.endsWith(mark))?.editorNumber ?? null;
          if (ownEditor === null) await wait(500);
        }
        if (ownEditor === null) throw new Error("the editor did not report to the bridge");
        await wait(1000);
      }
      // The status pill keeps the last message of the bridge; it is not part of what a reader should look at.
      await evaluate(`document.head.insertAdjacentHTML("beforeend", "<style>.editor-status{display:none !important}</style>"); true`);
    },
    async mcp(action, params = {}) {
      const editorNumber = ownEditor;
      const response = await fetch(`${BASE}/api/layerling-mcp`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "command", editorNumber, action, params }),
      });
      const result = await response.json();
      if (result.ok === false) throw new Error(`${action}: ${result.error}`);
      return result.data ?? result;
    },
    /** Clicks the first visible element whose text or aria-label equals `label`. */
    async click(label, selector = "button, [role=button], [role=menuitem], [role=tab], a, label, summary", prefix = false) {
      const found = await evaluate(`(() => {
        const wanted = ${JSON.stringify(label)};
        const same = (text) => ${prefix} ? text.startsWith(wanted) : text === wanted;
        const visible = (element) => { const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0; };
        const named = (candidate) => same((candidate.getAttribute("aria-label") ?? "").trim()) || same((candidate.getAttribute("title") ?? "").trim()) || same(candidate.textContent.trim());
        const candidates = [...document.querySelectorAll(${JSON.stringify(selector)})];
        let element = candidates.find((candidate) => visible(candidate) && named(candidate));
        if (!element) {
          // A tool in a ribbon group folded for want of room: open the group first, as a click on its button does.
          const hidden = candidates.find((candidate) => named(candidate) && candidate.closest(".toolbar-section[data-collapsed]"));
          hidden?.closest(".toolbar-section[data-collapsed]")?.querySelector("[data-collapse-trigger]")?.click();
          if (hidden && visible(hidden)) element = hidden;
        }
        if (!element) return false;
        element.click();
        return true;
      })()`);
      if (!found) throw new Error(`Nothing to click named "${label}"`);
      await wait(600);
    },
    async clickSelector(selector, index = 0) {
      const found = await evaluate(`(() => { const element = document.querySelectorAll(${JSON.stringify(selector)})[${index}]; if (!element) return false; element.click(); return true; })()`);
      if (!found) throw new Error(`Nothing matches ${selector}`);
      await wait(600);
    },
    /** Scrolls the element with this exact text into view (for long side panels). */
    async reveal(text) {
      const found = await evaluate(`(() => {
        const wanted = ${JSON.stringify(text)};
        const element = [...document.querySelectorAll("label, span, strong, h3, h4, button, div")].find((candidate) => candidate.children.length < 3 && candidate.textContent.trim() === wanted && candidate.getBoundingClientRect().width > 0);
        if (!element) return false;
        element.scrollIntoView({ block: "center" });
        return true;
      })()`);
      if (!found) throw new Error(`Nothing to reveal named "${text}"`);
      await wait(500);
    },
    /** Types a number into the field that follows the label with this text. */
    async setField(label, value) {
      const done = await evaluate(`(() => {
        const wanted = ${JSON.stringify(label)};
        const heading = [...document.querySelectorAll("label, span, div, strong")].find((candidate) => candidate.children.length < 3 && candidate.textContent.trim() === wanted && candidate.getBoundingClientRect().width > 0);
        if (!heading) return "no label";
        let scope = heading;
        let input = null;
        for (let depth = 0; depth < 4 && !input; depth += 1) {
          scope = scope.parentElement;
          input = scope?.querySelector("input:not([type=range]):not([type=checkbox]), textarea");
        }
        if (!input) return "no input";
        // The field takes its value when it is left, so it has to have been entered first.
        input.focus();
        const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value").set;
        setter.call(input, ${JSON.stringify(String(value))});
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        input.blur();
        return "ok";
      })()`);
      if (done !== "ok") throw new Error(`Field "${label}": ${done}`);
      await wait(600);
    },
    /** Picks the option whose text contains `option` in the first select that has one. */
    async chooseOption(option) {
      const done = await evaluate(`(() => {
        for (const select of document.querySelectorAll("select")) {
          const match = [...select.options].find((candidate) => candidate.textContent.includes(${JSON.stringify(option)}));
          if (!match) continue;
          const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
          setter.call(select, match.value);
          select.dispatchEvent(new Event("change", { bubbles: true }));
          return true;
        }
        return false;
      })()`);
      if (!done) throw new Error(`No option "${option}"`);
      await wait(800);
    },
    async key(key, modifiers = 0) {
      const code = key.length === 1 ? `Key${key.toUpperCase()}` : key;
      await send("Input.dispatchKeyEvent", { type: "keyDown", key, code, modifiers, windowsVirtualKeyCode: key.length === 1 ? key.toUpperCase().charCodeAt(0) : undefined });
      await send("Input.dispatchKeyEvent", { type: "keyUp", key, code, modifiers });
      await wait(400);
    },
    async mouse(x, y, type = "click") {
      if (type === "click") {
        await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
        await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
        await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
      } else {
        await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
      }
      await wait(500);
    },
    /** Empties the workplane so the next scene starts from nothing. */
    async clearScene() {
      const scene = await ctx.mcp("get_scene");
      const ids = (scene.shapes ?? []).map((shape) => shape.id);
      if (ids.length) await ctx.mcp("delete_objects", { ids });
      await wait(300);
    },
    async shot(name, clip) {
      const options = { format: "webp", quality: 82 };
      if (clip) options.clip = { ...clip, scale: 1 };
      const result = await send("Page.captureScreenshot", options);
      // Windows may hold the old picture open for a moment (a preview, the virus scanner): try again before giving up.
      for (let attempt = 1; ; attempt += 1) {
        try {
          writeFileSync(join(imageDirectory, `${name}.webp`), Buffer.from(result.data, "base64"));
          break;
        } catch (error) {
          if (attempt >= 5) throw error;
          await wait(500);
        }
      }
      console.log(`  ${language}/${name}.webp`);
    },
  };

  await send("Page.navigate", { url: `${BASE}/` });
  await wait(3000);
  await evaluate(`localStorage.setItem("layerling.language", ${JSON.stringify(language)}); localStorage.setItem("layerling.theme", "light"); true`);

  const wanted = Object.entries(scenes).filter(([name]) => !only?.length || only.includes(name));
  for (const [name, scene] of wanted) {
    try {
      await scene(ctx);
    } catch (error) {
      console.log(`  ${language}/${name}: FAILED - ${error.message}`);
    }
  }
  close();
}

// The languages run side by side, each in its own browser on its own port: a run takes about as long as one language.
const port = 9400 + Math.floor(Math.random() * 300);
console.log(`Languages ${languages.join(", ")}`);
await Promise.all(languages.map((language, index) => run(language, port + index)));
if (!existsSync(join(root, "docs", "guide", "images"))) console.log("No pictures were written.");
