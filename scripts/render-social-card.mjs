import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/*
 * Zeichnet die Karte fuer Linkvorschauen (og:image) aus scripts/social-card.html.
 *
 * Die uebrigen Symbole entstehen ohne Browser, siehe
 * tests/tools/renderBrandIcons.tool.ts. Auf dieser Karte steht aber Schrift,
 * und die zu rastern hiesse, eine Schriftdatei zu lesen - dafuer gibt es den
 * Browser, der ohnehin auf jedem Rechner steht. Das Ergebnis liegt im Baum,
 * also braucht das hier nur, wer die Karte aendert.
 */

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT = resolve(repositoryRoot, "apps/web/public/assets/layerling/layerling-social.png");
const WIDTH = 1280;
const HEIGHT = 640;

const candidates = [
  process.env.CHROME_PATH,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);

const browser = candidates.find((path) => existsSync(path));
if (!browser) {
  console.error(
    "[social-card] Kein Chromium gefunden. Pfad ueber CHROME_PATH setzen, oder\n" +
      "              die Karte so lassen, wie sie im Baum liegt - sie aendert sich selten.",
  );
  process.exit(1);
}

// Das Zeichen kommt aus dem echten SVG, damit die Marke eine einzige Quelle
// hat - und zwar aus dem Logo, das die Seite selbst oben links traegt: ohne
// eigene Grundflaeche und mit dem dunklen Balken darunter. Das Symbol mit dem
// braunen Quadrat gehoert aufs Reiterblatt und auf den Home-Bildschirm, wo es
// keinen hellen Grund unter sich hat.
const iconPath = resolve(repositoryRoot, "apps/web/public/assets/layerling/layerling-logo.svg");
const icon = readFileSync(iconPath, "utf8");
const viewBox = /viewBox="0 0 (\d+) (\d+)"/.exec(icon);
const motif = [...icon.matchAll(/<rect\b[^>]*\/>/g)].map((match) => match[0]);
if (!viewBox || motif.length === 0) {
  console.error(
    `[social-card] ${iconPath} sieht anders aus als erwartet: ` +
      `${motif.length} Rechtecke, viewBox ${viewBox ? "da" : "fehlt"}.`,
  );
  process.exit(1);
}

const template = readFileSync(resolve(repositoryRoot, "scripts/social-card.html"), "utf8");
if (!template.includes("<!--MARKE-->")) {
  console.error("[social-card] Die Vorlage hat keinen Platzhalter <!--MARKE--> mehr.");
  process.exit(1);
}
// Eng um das Zeichen herum zuschneiden. Im SVG laesst es ringsum Luft, und auf
// der Karte waere das unsichtbarer Rand, der die Zeile aus der Mitte schoebe.
const value = (rect, name) => Number(new RegExp(`\\b${name}="([^"]*)"`).exec(rect)[1]);
const left = Math.min(...motif.map((rect) => value(rect, "x")));
const top = Math.min(...motif.map((rect) => value(rect, "y")));
const right = Math.max(...motif.map((rect) => value(rect, "x") + value(rect, "width")));
const bottom = Math.max(...motif.map((rect) => value(rect, "y") + value(rect, "height")));

const svg =
  `<svg viewBox="${left} ${top} ${right - left} ${bottom - top}" xmlns="http://www.w3.org/2000/svg"` +
  ` role="img" aria-label="Layerling">\n` +
  motif.map((rect) => `      ${rect}`).join("\n") +
  "\n    </svg>";

const work = mkdtempSync(join(tmpdir(), "layerling-card-"));
const page = join(work, "card.html");
writeFileSync(page, template.replace("<!--MARKE-->", svg));

const result = spawnSync(
  browser,
  [
    "--headless=new",
    "--disable-gpu",
    "--disable-extensions",
    "--no-first-run",
    // A fresh profile otherwise downloads about 500 MB of Edge components on every start.
    "--disable-component-update",
    "--disable-background-networking",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    `--user-data-dir=${join(work, "profile")}`,
    `--window-size=${WIDTH},${HEIGHT}`,
    `--screenshot=${OUT}`,
    pathToFileURL(page).href,
  ],
  { stdio: "inherit" },
);

rmSync(work, { recursive: true, force: true });
if (result.status !== 0) process.exit(result.status ?? 1);

// Nachsehen, ob wirklich ein Bild der richtigen Groesse herauskam - ein
// kopfloser Browser meldet Erfolg auch dann, wenn er nichts gezeichnet hat.
const png = readFileSync(OUT);
const width = png.readUInt32BE(16);
const height = png.readUInt32BE(20);
if (width !== WIDTH || height !== HEIGHT) {
  console.error(`[social-card] ${width} x ${height} statt ${WIDTH} x ${HEIGHT}.`);
  process.exit(1);
}
console.log(`[social-card] ${OUT} - ${width} x ${height}, ${png.length} Bytes`);
