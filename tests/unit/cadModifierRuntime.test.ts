import { describe, expect, it } from "vitest";
import {
  CAD_MODIFIER_MAX_SHARP_ANGLE,
  CAD_MODIFIER_MAX_PREPARE_TIMEOUT_MS,
  CAD_MODIFIER_REQUEST_TIMEOUT_MS,
  CAD_MODIFIER_RUNTIME_BASE,
  CAD_MODIFIER_PREPARE_TRIANGLE_LIMIT,
  cadModifierBaseDeflection,
  cadModifierCandidateEdge,
  cadModifierPrepareCostMs,
  cadModifierPrepareTimeoutMs,
  cadModifierTessellationDeflection,
  cadModifierTopologyEdgeIsSelectable,
  cadTransformRequiresGeneralTransform,
  cadModifierTimeoutMessage,
  defaultCadModifierTangentChain,
  edgeModifierSelectionStatus,
  isCadModifierKernelExhausted,
  rescueSharpAngleForEdges,
  isCadModifierWasmMemoryFault,
  selectableCadModifierEdge,
  CAD_MODIFIER_KERNEL_RESTART_MESSAGE,
  SKETCH_CAD_DEFLECTION,
  cadModifierUserErrorMessage,
} from "@/lib/cadModifierRuntime";
import { setLanguage } from "@/lib/i18n";

describe("CAD modifier runtime state", () => {
  it("uses the build-managed OCCT runtime", () => {
    expect(CAD_MODIFIER_RUNTIME_BASE).toBe("/occt");
  });

  it("does not report zero edges before preparation finishes", () => {
    expect(edgeModifierSelectionStatus(false, 0, 0)).toBe("Preparing edges\u2026");
    expect(edgeModifierSelectionStatus(true, 0, 0)).toBe("0 of 0 sharp edges selected");
    expect(edgeModifierSelectionStatus(true, 2, 12)).toBe("2 of 12 sharp edges selected");
  });

  it("keeps exact CAD preparation short and gives imported meshes a bounded triangle-aware budget", () => {
    expect(CAD_MODIFIER_REQUEST_TIMEOUT_MS).toBeGreaterThanOrEqual(20_000);
    expect(CAD_MODIFIER_REQUEST_TIMEOUT_MS).toBeLessThanOrEqual(60_000);
    expect(cadModifierPrepareTimeoutMs(0)).toBe(CAD_MODIFIER_REQUEST_TIMEOUT_MS);
    expect(cadModifierPrepareTimeoutMs(Number.NaN)).toBe(CAD_MODIFIER_REQUEST_TIMEOUT_MS);
    // Alles, was die Wache ueberhaupt noch sieht, liegt unter der Grenze - und
    // dort deckt der Sockel von einer Minute die gemessenen Kosten mehrfach ab.
    expect(cadModifierPrepareTimeoutMs(2_208)).toBe(60_000);
    expect(cadModifierPrepareTimeoutMs(CAD_MODIFIER_PREPARE_TRIANGLE_LIMIT)).toBe(60_000);
    expect(cadModifierPrepareCostMs(CAD_MODIFIER_PREPARE_TRIANGLE_LIMIT) * 2.5).toBeLessThan(60_000);
    // Oberhalb greift trotzdem die Decke, falls je etwas daran vorbeikommt.
    expect(cadModifierPrepareTimeoutMs(100_000)).toBe(CAD_MODIFIER_MAX_PREPARE_TIMEOUT_MS);
    expect(cadModifierTimeoutMessage("prepare")).toContain("lower-detail STL");
    expect(cadModifierTimeoutMessage("prepare")).not.toContain("Firefox");
  });

  /*
   * Am 19.09.2026 auf HENMEDIA gemessen (naehen plus Kanten einsammeln). Der
   * Punkt bei 13 304 Dreiecken ist Fraterculas Schraube: zwei Minuten fuer
   * 14 845 Kanten, unter denen keine Kopfkante mehr zu finden ist. Wer das
   * Kostenmodell anfasst, muss an diesen Zahlen vorbei.
   */
  it("bildet die gemessene Vorbereitungszeit ab, nicht eine geratene Gerade", () => {
    const messungen: Array<[dreiecke: number, sekunden: number]> = [
      [400, 0.6],
      [2_208, 6.6],
      [3_806, 11.1],
      [13_304, 128],
    ];
    messungen.forEach(([dreiecke, sekunden]) => {
      const geschaetzt = cadModifierPrepareCostMs(dreiecke) / 1000;
      expect(geschaetzt).toBeGreaterThan(sekunden / 1.5);
      expect(geschaetzt).toBeLessThan(sekunden * 1.5);
    });
    // Die Kosten wachsen ueberlinear: doppelt so viele Dreiecke kosten mehr
    // als das Doppelte. Genau das hatte die alte Gerade verfehlt.
    expect(cadModifierPrepareCostMs(8_000)).toBeGreaterThan(cadModifierPrepareCostMs(4_000) * 2);
  });

  it("faengt ein Netz ab, das die Wache ohnehin nicht schaffen wuerde", () => {
    // Gemessen: 3 806 Dreiecke waren nach 11 s fertig, 7 612 nach vier Minuten
    // nicht. Die Grenze liegt zwischen beiden und laesst den kleineren durch.
    expect(CAD_MODIFIER_PREPARE_TRIANGLE_LIMIT).toBeGreaterThan(3_806);
    expect(CAD_MODIFIER_PREPARE_TRIANGLE_LIMIT).toBeLessThan(7_612);
    // Fraterculas Schraube liegt darueber und wird deshalb sofort abgelehnt.
    expect(13_304).toBeGreaterThan(CAD_MODIFIER_PREPARE_TRIANGLE_LIMIT);
  });

  it("does not expose thresholds above the worker's folded edge-angle range", () => {
    expect(CAD_MODIFIER_MAX_SHARP_ANGLE).toBe(90);
  });

  it("recognizes browser-specific WebAssembly memory fault messages", () => {
    expect(isCadModifierWasmMemoryFault("toBREP: memory access out of bounds")).toBe(true);
    expect(isCadModifierWasmMemoryFault("toBREP: Out of bounds memory access (evaluating 'func(...args)')")).toBe(true);
    expect(isCadModifierWasmMemoryFault("Unreachable code reached", "RuntimeError")).toBe(true);
    expect(isCadModifierWasmMemoryFault("The selected edges cannot be filleted together", "Error")).toBe(false);
    expect(isCadModifierWasmMemoryFault("fillet: [object WebAssembly.Exception]", "OcctError")).toBe(false);
    expect(isCadModifierWasmMemoryFault("fillet: wasm exception", "OcctError")).toBe(false);
  });

  it("routes rotated non-uniform resize transforms through OCCT's general transform", () => {
    const angle = Math.PI / 4;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    const rotatedNonUniformResize = [
      2 * cosine, 0, 2 * sine, 12,
      0, 1, 0, 4,
      -sine, 0, cosine, -8,
    ];
    const rigidRotation = [
      cosine, 0, sine, 12,
      0, 1, 0, 4,
      -sine, 0, cosine, -8,
    ];

    expect(cadTransformRequiresGeneralTransform(rotatedNonUniformResize)).toBe(true);
    expect(cadTransformRequiresGeneralTransform(rigidRotation)).toBe(false);
  });

  it("does not auto-chain newly created edges after an applied edge treatment", () => {
    expect(defaultCadModifierTangentChain(0)).toBe(true);
    expect(defaultCadModifierTangentChain(1)).toBe(false);
    expect(defaultCadModifierTangentChain(2)).toBe(false);
  });

  it("keeps valid post-treatment edges selectable when normal outline display suppresses them", () => {
    const hiddenDetailEdge = {
      display: false,
      selectable: true,
      manifold: true,
      boundary: false,
      angle: 45,
      points: [0, 0, 0, 1, 0, 0],
    };

    expect(cadModifierTopologyEdgeIsSelectable(hiddenDetailEdge)).toBe(true);
    expect(selectableCadModifierEdge(hiddenDetailEdge, 25)).toBe(true);
    expect(selectableCadModifierEdge(hiddenDetailEdge, 60)).toBe(false);
  });

  it("keeps a shallow-angle edge pickable independent of the sharp-angle slider (Forum: Verrundung erst nach Schieberegler)", () => {
    const shallowEdge = { selectable: true, manifold: true, boundary: false, angle: 8 };

    // Unter der Schwelle nicht in der Vorauswahl - aber grundsaetzlich verrundbar.
    expect(selectableCadModifierEdge(shallowEdge, 25)).toBe(false);
    expect(cadModifierCandidateEdge(shallowEdge)).toBe(true);
  });

  it("still excludes edges that are structurally unusable, not just below the threshold", () => {
    const nonManifoldEdge = { selectable: true, manifold: false, boundary: false, angle: 45 };
    const boundaryEdge = { selectable: true, manifold: true, boundary: true, angle: 45 };
    const unselectableEdge = { selectable: false, manifold: true, boundary: false, angle: 45 };

    expect(cadModifierCandidateEdge(nonManifoldEdge)).toBe(false);
    expect(cadModifierCandidateEdge(boundaryEdge)).toBe(false);
    expect(cadModifierCandidateEdge(unselectableEdge)).toBe(false);
  });
});

/*
 * Der Unterschied, um den es hier geht: "dieser Radius passt an dieser Kante
 * nicht" ist eine Aussage ueber das Bauteil - der Kernel arbeitet weiter. Eine
 * Ausnahme aus dem WebAssembly heraus ist eine Aussage ueber den Kernel, und
 * dann muss er abgebaut werden, sonst scheitert ab da alles.
 */
describe("Kernel am Ende oder nur die Aufgabe?", () => {
  it("erkennt eine Ausnahme aus dem WebAssembly als Kernel-Ende", () => {
    expect(isCadModifierKernelExhausted("fromBREP: [object WebAssembly.Exception]")).toBe(true);
  });

  it("erkennt auch den Speicherfehler weiterhin", () => {
    expect(isCadModifierKernelExhausted("memory access out of bounds")).toBe(true);
    expect(isCadModifierKernelExhausted("etwas ganz anderes", "RuntimeError")).toBe(true);
  });

  it("laesst eine gescheiterte Verrundung den Kernel nicht kosten", () => {
    expect(isCadModifierKernelExhausted("The chosen size creates invalid or overlapping edge geometry")).toBe(false);
    expect(isCadModifierKernelExhausted("The group has no solid body to modify")).toBe(false);
    expect(isCadModifierKernelExhausted("")).toBe(false);
  });

  it("meldet den Neustart mit einem Satz, der den Anwender nicht ratlos laesst", () => {
    expect(CAD_MODIFIER_KERNEL_RESTART_MESSAGE).toContain("restarted");
    expect(isCadModifierKernelExhausted(CAD_MODIFIER_KERNEL_RESTART_MESSAGE)).toBe(false);
  });
});

describe("cadModifierUserErrorMessage", () => {
  it("translates overlapping geometry error into helpful German message", () => {
    setLanguage("de", false);
    const raw = "The chosen size creates invalid or overlapping edge geometry";
    const msg = cadModifierUserErrorMessage(raw);
    expect(msg).toContain("kleineren Wert");
  });

  it("translates overlapping geometry error into helpful English message", () => {
    setLanguage("en", false);
    const raw = "The chosen size creates invalid or overlapping edge geometry";
    const msg = cadModifierUserErrorMessage(raw);
    expect(msg).toContain("smaller value");
  });

  it("translates timeout and worker errors", () => {
    setLanguage("de", false);
    expect(cadModifierUserErrorMessage("The edge preview timed out. Cancel the tool and try again.")).toContain("Vorschau-Berechnung");
    expect(cadModifierUserErrorMessage("Edge preparation timed out. This mesh needs more CAD processing than the interactive limit allows. Try a repaired or lower-detail STL.")).toContain("Vorbereitung der Kanten");
    expect(cadModifierUserErrorMessage("The group has no solid body to modify")).toContain("keinen festen Körper");
    expect(cadModifierUserErrorMessage("The CAD worker could not start. Update to Firefox 121+, Chrome/Brave 114+, or Safari 17.2+, then try again.")).toContain("CAD-Rechenkern");
  });

  it("passes through unknown errors and handles nullish values", () => {
    expect(cadModifierUserErrorMessage(null)).toBeNull();
    expect(cadModifierUserErrorMessage(undefined)).toBeNull();
    expect(cadModifierUserErrorMessage("Some unexpected error")).toBe("Some unexpected error");
  });
});

/*
 * Forenmeldung: ein Koerper aus einer Skizze mit mehreren nacheinander
 * angewandten Verrundungen bekommt zunehmend wellige Netzlinien. Ursache: jede
 * Verrundung tessellierte den GANZEN Koerper neu, aber die Feinheit hing nur
 * am Radius der jeweils neuen Operation - eine spaetere, groessere Verrundung
 * durfte eine schon fein vernetzte Stelle (z. B. eine Rundung der Skizze
 * selbst) groeber neu abtasten als sie schon war.
 */
describe("Vernetzungsfeinheit ueber mehrere Verrundungen hinweg", () => {
  it("wird bei einem groesseren Radius grober, ohne ein Mindestmass", () => {
    const erste = cadModifierBaseDeflection("standard", 1);
    const zweite = cadModifierBaseDeflection("standard", 8);
    expect(zweite.linear).toBeGreaterThan(erste.linear);
  });

  it("darf eine schon feinere Stelle nicht groeber ueberschreiben", () => {
    const fein = cadModifierBaseDeflection("standard", 1);
    const grob = cadModifierTessellationDeflection("standard", 8, fein);
    expect(grob.linear).toBe(fein.linear);
    expect(grob.angular).toBe(fein.angular);
  });

  it("lässt eine tatsaechlich feinere neue Operation trotzdem gewinnen", () => {
    const grob = cadModifierBaseDeflection("standard", 8);
    const fein = cadModifierTessellationDeflection("fine", 1, grob);
    expect(fein.linear).toBeLessThan(grob.linear);
  });

  it("verhaelt sich ohne Vorgeschichte wie zuvor", () => {
    expect(cadModifierTessellationDeflection("standard", 2)).toEqual(cadModifierBaseDeflection("standard", 2));
  });

  it("gibt der ersten Extrusion einer Skizze eine feste, feine Vorgabe", () => {
    expect(SKETCH_CAD_DEFLECTION.linear).toBeLessThan(cadModifierBaseDeflection("standard", 1).linear);
  });
});

/*
 * Wer ein Bauteil mit lauter flachen Uebergaengen oeffnet, sieht bei 25 Grad
 * nichts hervorgehoben und denkt, das Werkzeug koenne nur rechte Winkel. Die
 * Schwelle soll dann dorthin rutschen, wo die schaerfste Kante wirklich liegt.
 */
describe("Rettungsschwelle fuer flache Kanten", () => {
  const kante = (angle: number, extra: Partial<{ manifold: boolean; boundary: boolean; selectable: boolean }> = {}) => ({
    angle,
    manifold: true,
    boundary: false,
    selectable: true,
    ...extra,
  });

  it("laesst die Schwelle stehen, wenn ohnehin etwas waehlbar ist", () => {
    expect(rescueSharpAngleForEdges([kante(90), kante(12)], 25)).toBeNull();
  });

  it("rutscht auf die schaerfste vorhandene Kante", () => {
    expect(rescueSharpAngleForEdges([kante(12.7), kante(8), kante(3)], 25)).toBe(12);
  });

  it("zaehlt nur Kanten, die ueberhaupt bearbeitbar sind", () => {
    const kanten = [kante(20, { manifold: false }), kante(18, { boundary: true }), kante(15, { selectable: false }), kante(6)];
    expect(rescueSharpAngleForEdges(kanten, 25)).toBe(6);
  });

  it("rettet nichts, wo nur tangentiale Uebergaenge sind", () => {
    expect(rescueSharpAngleForEdges([kante(0.2), kante(0)], 25)).toBeNull();
    expect(rescueSharpAngleForEdges([], 25)).toBeNull();
  });
});
