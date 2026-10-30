import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/*
 * What the scripts that read OrcaSlicer's printer profiles share: the list of the printers layerling
 * offers, the fetching of the profiles and the reading of one profile. The generator
 * (generate-printer-presets.mjs) builds the presets from them, and check-printer-updates.mjs looks
 * for printers and plates OrcaSlicer has that the list does not.
 */

export const ORCA_REPOSITORY = "https://github.com/SoftFever/OrcaSlicer.git";

/** [OrcaSlicer vendor folder, printer_model]. The order is the order in the menu. */
export const PRINTERS = [
  ["BBL", "Bambu Lab A1 mini"],
  ["BBL", "Bambu Lab A1"],
  ["BBL", "Bambu Lab A2L"],
  ["BBL", "Bambu Lab P1P"],
  ["BBL", "Bambu Lab P1S"],
  ["BBL", "Bambu Lab P2S"],
  ["BBL", "Bambu Lab X1"],
  ["BBL", "Bambu Lab X1 Carbon"],
  ["BBL", "Bambu Lab X1E"],
  ["BBL", "Bambu Lab X2D"],
  ["BBL", "Bambu Lab H2S"],
  ["BBL", "Bambu Lab H2D"],
  ["BBL", "Bambu Lab H2D Pro"],
  ["BBL", "Bambu Lab H2C"],
  ["Prusa", "Prusa MINI"],
  ["Prusa", "Prusa MK3S"],
  ["Prusa", "Prusa MK3.5"],
  ["Prusa", "Prusa MK4"],
  ["Prusa", "Prusa MK4S"],
  ["Prusa", "Prusa CORE One"],
  ["Prusa", "Prusa CORE One L"],
  ["Prusa", "Prusa XL"],
  ["Snapmaker", "Snapmaker U1"],
  ["Snapmaker", "Snapmaker A250"],
  ["Snapmaker", "Snapmaker A350"],
  ["Snapmaker", "Snapmaker Artisan"],
  ["Snapmaker", "Snapmaker J1"],
  ["Creality", "Creality Ender-2 Pro"],
  ["Creality", "Creality Ender-3"],
  ["Creality", "Creality Ender-3 Pro"],
  ["Creality", "Creality Ender-3 V2"],
  ["Creality", "Creality Ender-3 V2 Neo"],
  ["Creality", "Creality Ender-3 Neo"],
  ["Creality", "Creality Ender-3 S1"],
  ["Creality", "Creality Ender-3 S1 Pro"],
  ["Creality", "Creality Ender-3 S1 Plus"],
  ["Creality", "Creality Ender-3 Max"],
  ["Creality", "Creality Ender-3 V3 SE"],
  ["Creality", "Creality Ender-3 V3 KE"],
  ["Creality", "Creality Ender-3 V3"],
  ["Creality", "Creality Ender-3 V3 Plus"],
  ["Creality", "Creality Ender-3 V4"],
  ["Creality", "Creality Ender-5"],
  ["Creality", "Creality Ender-5 Pro (2019)"],
  ["Creality", "Creality Ender-5 S1"],
  ["Creality", "Creality Ender-5S"],
  ["Creality", "Creality Ender-5 Plus"],
  ["Creality", "Creality Ender-5 Max"],
  ["Creality", "Creality Ender-6"],
  ["Creality", "Creality CR-10"],
  ["Creality", "Creality CR-10 V2"],
  ["Creality", "Creality CR-10 SE"],
  ["Creality", "Creality CR-10 V3"],
  ["Creality", "Creality CR-M4"],
  ["Creality", "Creality CR-M4 SE"],
  ["Creality", "Creality CR-10 Max"],
  ["Creality", "Creality CR-6 SE"],
  ["Creality", "Creality CR-6 Max"],
  ["Creality", "Creality K1"],
  ["Creality", "Creality K1 SE"],
  ["Creality", "Creality K1C"],
  ["Creality", "Creality K1 Max"],
  ["Creality", "Creality K2"],
  ["Creality", "Creality K2 Plus"],
  ["Creality", "Creality K2 SE"],
  ["Creality", "Creality K2 Pro"],
  ["Creality", "Creality Hi"],
  ["Creality", "Creality SPARKX i7"],
  ["Elegoo", "Elegoo Neptune 2"],
  ["Elegoo", "Elegoo Neptune 2S"],
  ["Elegoo", "Elegoo Neptune 2D"],
  ["Elegoo", "Elegoo Neptune 3"],
  ["Elegoo", "Elegoo Neptune 3 Pro"],
  ["Elegoo", "Elegoo Neptune 3 Plus"],
  ["Elegoo", "Elegoo Neptune 3 Max"],
  ["Elegoo", "Elegoo Neptune 4"],
  ["Elegoo", "Elegoo Neptune 4 Pro"],
  ["Elegoo", "Elegoo Neptune 4 Plus"],
  ["Elegoo", "Elegoo Neptune 4 Max"],
  ["Elegoo", "Elegoo OrangeStorm Giga"],
  ["Elegoo", "Elegoo Neptune X"],
  ["Elegoo", "Elegoo Centauri"],
  ["Elegoo", "Elegoo Centauri Carbon"],
  ["Elegoo", "Elegoo Centauri 2"],
  ["Elegoo", "Elegoo Centauri Carbon 2"],
  ["Anycubic", "Anycubic i3 Mega S"],
  ["Anycubic", "Anycubic Vyper"],
  ["Anycubic", "Anycubic Kobra"],
  ["Anycubic", "Anycubic Kobra Neo"],
  ["Anycubic", "Anycubic Kobra 2"],
  ["Anycubic", "Anycubic Kobra 2 Neo"],
  ["Anycubic", "Anycubic Kobra 2 Pro"],
  ["Anycubic", "Anycubic Kobra 2 Plus"],
  ["Anycubic", "Anycubic Kobra 2 Max"],
  ["Anycubic", "Anycubic Kobra Plus"],
  ["Anycubic", "Anycubic Kobra Max"],
  ["Anycubic", "Anycubic Kobra 3"],
  ["Anycubic", "Anycubic Kobra 3 V2"],
  ["Anycubic", "Anycubic Kobra 3 Max"],
  ["Anycubic", "Anycubic Kobra S1"],
  ["Anycubic", "Anycubic Kobra S1 Max"],
  ["Anycubic", "Anycubic Kobra X"],
  ["Anycubic", "Anycubic Chiron"],
  ["Anycubic", "Anycubic 4Max Pro 2"],
  ["Qidi", "Qidi Q1 Pro"],
  ["Qidi", "Qidi Q2"],
  ["Qidi", "Qidi Q2C"],
  ["Qidi", "Qidi X-Smart 3"],
  ["Qidi", "Qidi X-Plus"],
  ["Qidi", "Qidi X-Plus 3"],
  ["Qidi", "Qidi X-Plus 4"],
  ["Qidi", "Qidi X-Plus 5"],
  ["Qidi", "Qidi X-Max"],
  ["Qidi", "Qidi X-Max 3"],
  ["Qidi", "Qidi X-Max 4"],
  ["Qidi", "Qidi X-CF Pro"],
  ["Sovol", "Sovol Zero"],
  ["Sovol", "Sovol SV01"],
  ["Sovol", "Sovol SV01 Pro"],
  ["Sovol", "Sovol SV02"],
  ["Sovol", "Sovol SV05"],
  ["Sovol", "Sovol SV06"],
  ["Sovol", "Sovol SV06 ACE"],
  ["Sovol", "Sovol SV06 Plus"],
  ["Sovol", "Sovol SV06 Plus ACE"],
  ["Sovol", "Sovol SV07"],
  ["Sovol", "Sovol SV07 Plus"],
  ["Sovol", "Sovol SV08"],
  ["Sovol", "Sovol SV08 MAX"],
  ["Flashforge", "Flashforge Adventurer 3 Series"],
  ["Flashforge", "Flashforge Adventurer 4 Series"],
  ["Flashforge", "Flashforge Adventurer 5M"],
  ["Flashforge", "Flashforge Adventurer 5M Pro"],
  ["Flashforge", "Flashforge Adventurer A5"],
  ["Flashforge", "Flashforge AD5X"],
  ["Flashforge", "Flashforge Creator 5"],
  ["Flashforge", "Flashforge Creator 5 Pro"],
  ["Flashforge", "Flashforge Guider 2s"],
  ["Flashforge", "Flashforge Guider4"],
  ["Flashforge", "Flashforge Guider 3 Ultra"],
  ["Flashforge", "Flashforge Guider4 Pro"],
  ["Flashforge", "Flashforge Artemis"],
  ["Artillery", "Artillery Genius"],
  ["Artillery", "Artillery Genius Pro"],
  ["Artillery", "Artillery Hornet"],
  ["Artillery", "Artillery M1 Pro"],
  ["Artillery", "Artillery Sidewinder X1"],
  ["Artillery", "Artillery Sidewinder X2"],
  ["Artillery", "Artillery Sidewinder X3 Pro"],
  ["Artillery", "Artillery Sidewinder X3 Plus"],
  ["Artillery", "Artillery Sidewinder X4 Pro"],
  ["Artillery", "Artillery Sidewinder X4 Plus"],
  ["Anker", "Anker M5"],
  ["Anker", "Anker M5C"],
  ["BIQU", "BIQU B1"],
  ["BIQU", "BIQU BX"],
  ["BIQU", "BIQU Hurakan"],
  ["Kingroon", "Kingroon KP3S 3.0"],
  ["Kingroon", "Kingroon KP3S PRO V2"],
  ["Kingroon", "Kingroon KLP1"],
  ["LONGER", "LONGER LK10"],
  ["LONGER", "LONGER LK10 Plus"],
  ["Geeetech", "Geeetech A10 Pro"],
  ["Geeetech", "Geeetech A20"],
  ["Geeetech", "Geeetech A30 Pro"],
  ["Geeetech", "Geeetech Mizar"],
  ["Geeetech", "Geeetech Mizar Max"],
  ["Geeetech", "Geeetech Thunder"],
  ["Voxelab", "Voxelab Aquila X2"],
  ["TwoTrees", "TwoTrees SK1"],
  ["TwoTrees", "TwoTrees SP-5 Klipper"],
  ["Comgrow", "Comgrow T300"],
  ["Comgrow", "Comgrow T500"],
  ["Eryone", "Eryone ER20"],
  ["Eryone", "Thinker X400"],
  ["Dremel", "Dremel 3D20"],
  ["Dremel", "Dremel 3D40"],
  ["Dremel", "Dremel 3D45"],
  ["InfiMech", "InfiMech TX"],
  ["InfiMech", "InfiMech EX"],
  ["Peopoly", "Peopoly Magneto X"],
  ["Wanhao", "Wanhao D12-300"],
  ["Wanhao", "Wanhao D9-400 MK3"],
  ["Wanhao", "Wanhao D9-500 MK3"],
  ["Raise3D", "Raise3D Pro3"],
  ["Raise3D", "Raise3D Pro3 Plus"],
  ["UltiMaker", "UltiMaker 2+"],
  ["UltiMaker", "UltiMaker S5"],
  ["Volumic", "VS20MK2"],
  ["Volumic", "VS30MK3"],
  ["Volumic", "VS30SC2"],
  ["Volumic", "EXO42"],
  ["Volumic", "EXO42 Performance"],
  ["Volumic", "EXO65 Performance"],
  ["Volumic", "SH65 Performance"],
  ["Ratrig", "RatRig V-Minion"],
  ["Ratrig", "RatRig V-Cast"],
  ["Ratrig", "RatRig V-Core 3 300"],
  ["Ratrig", "RatRig V-Core 4 300"],
  ["Ratrig", "RatRig V-Core 3 400"],
  ["Ratrig", "RatRig V-Core 3 500"],
  ["Ratrig", "RatRig V-Core 4 400"],
  ["Ratrig", "RatRig V-Core 4 500"],
  ["Ratrig", "RatRig V-Core 4 IDEX 400"],
  ["Ratrig", "RatRig V-Core 4 IDEX 500"],
  ["Voron", "Voron 0.1"],
  ["Voron", "Voron 2.4 250"],
  ["Voron", "Voron 2.4 300"],
  ["Voron", "Voron 2.4 350"],
  ["Voron", "Voron Switchwire 250"],
  ["Voron", "Voron Trident 250"],
  ["Voron", "Voron Trident 300"],
  ["Voron", "Voron Trident 350"],
  ["Goofoo", "Goofoo GP1"],
  ["Goofoo", "Goofoo TurboM"],
  ["Goofoo", "Goofoo Velo+"],
  ["Goofoo", "Goofoo Velo+ Tool"],
  ["Vivedino", "Troodon 2.0 - Klipper"],
  ["Vivedino", "Xplorer Single"],
  ["Vivedino", "Xplorer IDEX"],
  ["Tronxy", "Tronxy X5SA 400 Marlin Firmware"],
  // Delta printers, on a round plate (LLL-GitHub, #1024).
  ["FLSun", "FLSun Q5"],
  ["FLSun", "FLSun QQ-S Pro"],
  ["FLSun", "FLSun Super Racer (SR)"],
  ["FLSun", "FLSun T1"],
  ["FLSun", "FLSun V400"],
  ["FLSun", "FLSun S1"],
  ["SeeMeCNC", "SeeMeCNC RostockMAX v3.2"],
  ["SeeMeCNC", "SeeMeCNC RostockMAX v4"],
  ["SeeMeCNC", "SeeMeCNC Artemis 300"],
  ["SeeMeCNC", "SeeMeCNC BOSSdelta 300"],
  ["SeeMeCNC", "SeeMeCNC BOSSdelta 500 0505"],
  ["SeeMeCNC", "SeeMeCNC BOSSdelta 500 0510"],
  ["SeeMeCNC", "SeeMeCNC BOSSdelta 500 0521"],
  ["Anycubic", "Anycubic Predator"],
  ["RolohaunDesign", "Rolohaun Delta Flyer Refit"],
];

/** How the vendor is written in the menu. */
export const VENDOR_LABELS = { BBL: "Bambu Lab", RolohaunDesign: "Rolohaun" };

export function orcaCheckout(given) {
  if (given) return { root: given, cleanup: () => {} };
  const work = mkdtempSync(join(tmpdir(), "orca-profiles-"));
  const run = (args, cwd) => {
    const result = spawnSync("git", args, { cwd, stdio: "inherit" });
    if (result.status !== 0) throw new Error(`git ${args.join(" ")} failed`);
  };
  run(["clone", "--depth", "1", "--filter=blob:none", "--sparse", ORCA_REPOSITORY, work]);
  run(["sparse-checkout", "set", "resources/profiles"], work);
  return { root: work, cleanup: () => rmSync(work, { recursive: true, force: true }) };
}

export function listJson(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return listJson(path);
    return entry.name.endsWith(".json") ? [path] : [];
  });
}

/** Every machine profile of one vendor, by name, with `inherits` resolved. */
export function vendorMachines(profilesRoot, vendor) {
  const byName = new Map();
  for (const file of listJson(join(profilesRoot, vendor, "machine"))) {
    const profile = JSON.parse(readFileSync(file, "utf8"));
    if (profile.name) byName.set(profile.name, profile);
  }
  const resolved = new Map();
  const resolve = (name, trail = []) => {
    if (resolved.has(name)) return resolved.get(name);
    const own = byName.get(name);
    if (!own) throw new Error(`${vendor}: profile "${name}" not found (${trail.join(" <- ")})`);
    const parent = own.inherits ? resolve(own.inherits, [...trail, name]) : {};
    const merged = { ...parent, ...own };
    resolved.set(name, merged);
    return merged;
  };
  return [...byName.keys()].map((name) => resolve(name));
}

export function bedFromArea(area, label) {
  // Most profiles list the corners, some write them as one comma separated string.
  const corners = Array.isArray(area) ? area : String(area).split(",");
  const listed = corners.map((point) => String(point).trim().split("x").map(Number));
  // Some profiles close the outline by repeating the first corner.
  const points = listed.length > 1 && listed[0].every((value, index) => value === listed[listed.length - 1][index]) ? listed.slice(0, -1) : listed;
  if (points.some((point) => point.length !== 2 || point.some((value) => !Number.isFinite(value)))) {
    throw new Error(`${label}: unreadable printable_area ${JSON.stringify(area)}`);
  }
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const width = Math.max(...xs) - Math.min(...xs);
  const depth = Math.max(...ys) - Math.min(...ys);
  const rectangle = points.length === 4 && points.every(([x, y]) =>
    (x === Math.min(...xs) || x === Math.max(...xs)) && (y === Math.min(...ys) || y === Math.max(...ys)));
  if (rectangle) return { width, depth };
  // A delta printer's plate is a circle, listed as many points round it (#1024): its diameter, as wide as deep.
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const radii = points.map(([x, y]) => Math.hypot(x - cx, y - cy));
  const radius = Math.max(...radii);
  const round = points.length >= 12 && Math.abs(width - depth) <= width * 0.005 && radii.every((value) => value >= radius * 0.995);
  if (!round) throw new Error(`${label}: only rectangular and round beds are supported, got ${JSON.stringify(area)}`);
  const diameter = Math.round(radius * 2 * 10) / 10;
  return { width: diameter, depth: diameter, round: true };
}

export function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

