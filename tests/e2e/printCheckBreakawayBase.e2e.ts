import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
// The exact kernel (Manifold) loads its files relative to the page; in node they are the public folder.
(globalThis as unknown as { window: unknown }).window = { location: { href: pathToFileURL(resolve("apps/web/public") + "/").href } };
import { fitTestShape } from "@/lib/fitTest";
import { setLanguage } from "@/lib/i18n";
import { bodyOverhang } from "@/lib/overhangFigures";
import { checkPrint } from "@/lib/printCheck";
import type { WorkplaneShape } from "@/types/layerling";

/*
 * Issue #1633: the print check of a fit test whose pin stands on a breakaway base warned about overhangs (90°, about
 * 13 mm²) and thin walls (0.2 mm) on the pin. Both are the base, made so on purpose: the pin's foot hangs 0.3 mm over
 * the socket's floor, held by the nub, and that floor is one layer thick. The check leaves them out; the same pin
 * without its mark still shows them, so it is the mark that does it and not a blind spot.
 */

const LIMIT = 250_000;
let pin: WorkplaneShape;

beforeAll(async () => {
  await setLanguage("en", false);
  const based = await fitTestShape(LIMIT, "en-US", { base: true });
  pin = based.groupedShapes![1];
}, 300_000);

describe("the print check of a pin on a breakaway base (#1633)", () => {
  it("marks the fit test's pin as standing on a breakaway base", () => {
    expect(pin.breakawayBase).toBe(true);
  });

  it("finds no overhang on it, though the same pin without the mark has its foot over the socket", () => {
    const marked = bodyOverhang(pin, 45);
    expect(marked.areaMm2).toBe(0);
    expect(marked.steepestDegrees ?? 0).toBeLessThan(45);
    const unmarked = bodyOverhang({ ...pin, breakawayBase: undefined }, 45);
    expect(unmarked.areaMm2).toBeGreaterThan(5);
    expect(unmarked.steepestDegrees).toBeCloseTo(90, 0);
  });

  it("finds neither an overhang nor a thin wall on it in the print check", async () => {
    const result = await checkPrint([pin], { nozzle: 0.4 });
    expect(result.overhang.areaMm2).toBe(0);
    expect(result.thinWalls?.places ?? []).toEqual([]);
    const unmarked = await checkPrint([{ ...pin, breakawayBase: undefined }], { nozzle: 0.4 });
    expect(unmarked.overhang.areaMm2).toBeGreaterThan(5);
    expect(unmarked.thinWalls?.places.length ?? 0).toBeGreaterThan(0);
    expect(Math.min(...unmarked.thinWalls!.places.map((place) => place.thinnestMm))).toBeLessThan(0.25);
  }, 300_000);
});
