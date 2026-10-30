import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { PRINTERS, VENDOR_LABELS, bedFromArea, orcaCheckout, vendorMachines } from "./orca-profiles.mjs";

/*
 * Looks at OrcaSlicer's printer profiles and says what the list of printers layerling offers is
 * missing or has wrong. The list is picked by hand (PRINTERS in orca-profiles.mjs), so a new printer
 * never gets in by itself, and a plate that OrcaSlicer corrects stays as it was.
 *
 *   node scripts/check-printer-updates.mjs [--json] [--accept] [path/to/OrcaSlicer]
 *
 * Reports, for the makers layerling already lists:
 *   - new:     models OrcaSlicer has (a 0.4 mm profile with a rectangular or round plate) that the list lacks
 *   - changed: models whose plate or height differs from printerPresets.generated.ts
 *   - gone:    models of the list OrcaSlicer no longer has under that name
 * and, for the makers it does not list at all, how many models they have (the makers are left out on
 * purpose when they are industrial; this is only for looking).
 *
 * Models and makers that were looked at and left out on purpose (kit and firmware variants,
 * industrial machines) stand in printer-check-reviewed.json and are not reported again, so
 * what the report shows is what is new since the last look. `--accept` writes everything the report
 * shows into that file. To take a model over, add it to PRINTERS and run `npm run printers:update`.
 */

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const accept = args.includes("--accept");
const given = args.find((value) => !value.startsWith("--"));
const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const GENERATED = join(repositoryRoot, "apps/web/src/lib/printerPresets.generated.ts");
const REVIEWED = join(dirname(fileURLToPath(import.meta.url)), "printer-check-reviewed.json");

function reviewedEntries() {
  try {
    const parsed = JSON.parse(readFileSync(REVIEWED, "utf8"));
    return { models: new Set(parsed.models ?? []), makers: new Set(parsed.makers ?? []) };
  } catch {
    return { models: new Set(), makers: new Set() };
  }
}

function currentPresets() {
  const byModel = new Map();
  for (const line of readFileSync(GENERATED, "utf8").split(/\r?\n/)) {
    const match = /^\s*(\{"id".*\}),?\s*$/.exec(line);
    if (match) {
      const preset = JSON.parse(match[1]);
      byModel.set(`${preset.vendor} ${preset.model}`, preset);
    }
  }
  return byModel;
}

function standardProfile(machines, model) {
  const candidates = machines.filter((profile) => profile.printer_model === model && String(profile.instantiation ?? "true").toLowerCase() === "true");
  return candidates.find((candidate) => String(candidate.printer_variant) === "0.4") ?? candidates.find((candidate) => candidate.printer_variant === undefined) ?? null;
}

function plateOf(profile) {
  try {
    const { width, depth, round } = bedFromArea(profile.printable_area ?? [], profile.printer_model);
    const height = Number(profile.printable_height);
    return Number.isFinite(height) && height > 0 ? { width, depth, height, ...(round ? { round } : {}) } : null;
  } catch {
    return null;
  }
}

const { root, cleanup } = orcaCheckout(given);
try {
  const profilesRoot = join(root, "resources", "profiles");
  const commit = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).stdout.trim() || "unknown";
  const listed = currentPresets();
  const coveredVendors = [...new Set(PRINTERS.map(([vendor]) => vendor))];
  const reviewed = reviewedEntries();
  const report = { commit, newModels: [], changed: [], gone: [], otherMakers: [] };

  for (const vendor of coveredVendors) {
    const label = VENDOR_LABELS[vendor] ?? vendor;
    const machines = vendorMachines(profilesRoot, vendor);
    const inList = new Set(PRINTERS.filter(([folder]) => folder === vendor).map(([, model]) => model));
    const models = [...new Set(machines.map((profile) => profile.printer_model).filter(Boolean))];
    for (const model of models) {
      if (inList.has(model)) continue;
      const profile = standardProfile(machines, model);
      const plate = profile ? plateOf(profile) : null;
      if (plate && !reviewed.models.has(`${label} ${model}`)) report.newModels.push({ vendor: label, model, ...plate });
    }
    for (const model of inList) {
      const profile = standardProfile(machines, model);
      if (!profile) {
        report.gone.push({ vendor: label, model });
        continue;
      }
      const plate = plateOf(profile);
      const name = model.startsWith(`${label} `) ? model : `${label} ${model}`;
      const known = listed.get(name) ?? listed.get(`${label} ${model.startsWith(`${label} `) ? model.slice(label.length + 1) : model}`);
      if (plate && known && (known.width !== plate.width || known.depth !== plate.depth || known.height !== plate.height || Boolean(known.round) !== Boolean(plate.round))) {
        report.changed.push({ vendor: label, model, from: `${known.width} x ${known.depth} x ${known.height}`, to: `${plate.width} x ${plate.depth} x ${plate.height}` });
      }
    }
  }

  for (const entry of readdirSync(profilesRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || coveredVendors.includes(entry.name) || reviewed.makers.has(entry.name)) continue;
    let count = 0;
    try {
      const machines = vendorMachines(profilesRoot, entry.name);
      for (const model of new Set(machines.map((profile) => profile.printer_model).filter(Boolean))) {
        const profile = standardProfile(machines, model);
        if (profile && plateOf(profile)) count += 1;
      }
    } catch {
      continue;
    }
    if (count > 0) report.otherMakers.push({ folder: entry.name, models: count });
  }
  report.newModels.sort((a, b) => `${a.vendor} ${a.model}`.localeCompare(`${b.vendor} ${b.model}`, "en", { numeric: true }));

  if (accept) {
    const next = {
      models: [...new Set([...reviewed.models, ...report.newModels.map((entry) => `${entry.vendor} ${entry.model}`)])].sort(),
      makers: [...new Set([...reviewed.makers, ...report.otherMakers.map((entry) => entry.folder)])].sort(),
    };
    writeFileSync(REVIEWED, `${JSON.stringify(next, null, 2)}\n`);
    console.error(`printer-check-reviewed.json: ${next.models.length} models and ${next.makers.length} makers marked as looked at.`);
  }
  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`OrcaSlicer ${commit.slice(0, 7)}: ${listed.size} printers in the list.`);
    console.log(`\nNew models of makers in the list (${report.newModels.length}):`);
    for (const entry of report.newModels) console.log(`  ${entry.vendor} ${entry.model}  ${entry.width} x ${entry.depth} x ${entry.height}`);
    console.log(`\nChanged plates (${report.changed.length}):`);
    for (const entry of report.changed) console.log(`  ${entry.vendor} ${entry.model}: ${entry.from} -> ${entry.to}`);
    console.log(`\nIn the list, not in OrcaSlicer any more (${report.gone.length}):`);
    for (const entry of report.gone) console.log(`  ${entry.vendor} ${entry.model}`);
    console.log(`\nMakers not in the list (${report.otherMakers.length}): ${report.otherMakers.map((entry) => `${entry.folder} (${entry.models})`).join(", ")}`);
  }
} finally {
  cleanup();
}
