import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createPortGeometry, maxPortCorner, normalizePortCorner, portChamfer, portContourPoints, PORT_PRESET_ORDER, PORT_PRESETS, portPresetFor } from "@/lib/portGeometry";
import { cadProfileForShapeKind } from "@/lib/cadProfileExtrusion";
import { makeShapeFromAsset, toolbarShapeAssets } from "@/lib/shapeCatalog";

function volumeOf(geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute("position");
  const index = geometry.getIndex();
  const count = index ? index.count : position.count;
  const at = (i: number) => new THREE.Vector3().fromBufferAttribute(position, index ? index.getX(i) : i);
  let volume = 0;
  for (let i = 0; i < count; i += 3) volume += at(i).dot(at(i + 1).cross(at(i + 2))) / 6;
  return volume;
}

describe("the port opening (#1049)", () => {
  it("fills its box: the opening seen from the front, pushed through along z", () => {
    const geometry = createPortGeometry({ width: 9.4, depth: 10, height: 3.7, cornerFillet: 1.85 });
    const box = geometry.boundingBox!;
    expect(box.min.x).toBeCloseTo(-4.7, 5);
    expect(box.max.x).toBeCloseTo(4.7, 5);
    expect(box.min.y).toBeCloseTo(0, 5);
    expect(box.max.y).toBeCloseTo(3.7, 5);
    expect(box.min.z).toBeCloseTo(-5, 5);
    expect(box.max.z).toBeCloseTo(5, 5);
  });

  it("is closed and faces outward, with the volume of a stadium", () => {
    const geometry = createPortGeometry({ width: 9.4, depth: 10, height: 3.7, cornerFillet: 1.85 });
    const r = 1.85;
    const exact = ((9.4 - 2 * r) * 3.7 + Math.PI * r * r) * 10;
    expect(volumeOf(geometry)).toBeGreaterThan(exact * 0.98);
    expect(volumeOf(geometry)).toBeLessThanOrEqual(exact + 1e-6);
  });

  it("keeps the corners inside the opening and leaves no doubled point at a fully round end", () => {
    expect(normalizePortCorner(5, 9.4, 3.7)).toBeCloseTo(1.85, 6);
    expect(normalizePortCorner(-1, 9.4, 3.7)).toBe(0);
    const points = portContourPoints(9.4, 3.7, 1.85);
    points.forEach((point, index) => {
      const next = points[(index + 1) % points.length];
      expect(Math.hypot(next.x - point.x, next.y - point.y)).toBeGreaterThan(1e-6);
    });
    expect(portContourPoints(13, 5.6, 0)).toHaveLength(4);
  });

  it("knows its presets again and calls a size changed by hand its own", () => {
    const c = PORT_PRESETS.usbC;
    expect(portPresetFor(c.width, c.height, c.corner)).toBe("usbC");
    expect(portPresetFor(PORT_PRESETS.usbA.width, PORT_PRESETS.usbA.height, PORT_PRESETS.usbA.corner)).toBe("usbA");
    expect(portPresetFor(c.width + 0.5, c.height, c.corner)).toBeNull();
  });

  it("cuts the lower corners of HDMI on both sides and of DisplayPort on the left only", () => {
    const hdmi = portContourPoints(15.7, 6.2, 0.3, 32, "hdmi");
    const bottom = hdmi.filter((point) => Math.abs(point.y) < 1e-9).map((point) => point.x).sort((a, b) => a - b);
    expect(bottom[0]).toBeCloseTo(-5.4, 6);
    expect(bottom[1]).toBeCloseTo(5.4, 6);
    expect(hdmi.some((point) => Math.abs(point.x - 7.85) < 1e-9 && Math.abs(point.y - 1.2) < 1e-9)).toBe(true);
    const dp = portContourPoints(17.1, 5.76, 0.8, 32, "displayPort");
    const dpBottom = dp.filter((point) => Math.abs(point.y) < 1e-9).map((point) => point.x).sort((a, b) => a - b);
    expect(dpBottom[0]).toBeCloseTo(-8.55 + 1.8, 6);
    expect(dpBottom[dpBottom.length - 1]).toBeCloseTo(8.55 - 0.8, 6);
    expect(portChamfer("rounded", 10, 5)).toBeNull();
    expect(portChamfer("nonsense", 10, 5)).toBeNull();
    // A cut corner leaves the side shorter, so the round corners above it must fit what is left.
    expect(maxPortCorner(15.7, 6.2, "hdmi")).toBeCloseTo((6.2 - 1.2) / 2, 6);
  });

  it("finds every preset again by its size, corner and outline", () => {
    for (const key of PORT_PRESET_ORDER) {
      const preset = PORT_PRESETS[key];
      expect(portPresetFor(preset.width, preset.height, preset.corner, preset.profile), key).toBe(key);
      const geometry = createPortGeometry({ width: preset.width, depth: 5, height: preset.height, cornerFillet: preset.corner, portProfile: preset.profile });
      expect(volumeOf(geometry), key).toBeGreaterThan(0);
    }
    expect(portPresetFor(15.7, 6.2, 0.3, "rounded")).toBeNull();
  });

  it("comes from the library as a USB-C hole with an exact outline laid along its depth", () => {
    const asset = toolbarShapeAssets.find((entry) => entry.kind === "port");
    expect(asset?.hole).toBe(true);
    const shape = makeShapeFromAsset(asset!, { x: 0, z: 0, elevation: 0 });
    expect(shape.hole).toBe(true);
    expect(portPresetFor(shape.width ?? 0, shape.height, shape.cornerFillet)).toBe("usbC");
    const profile = cadProfileForShapeKind(shape);
    expect(profile?.loops).toHaveLength(1);
    expect(profile?.frame?.kind).toBe("extrusion");
    expect(profile?.frame?.height).toBeCloseTo(shape.depth ?? 0, 6);
    const segments = profile!.loops[0].segments;
    expect(segments.some((segment) => segment.kind === "arc")).toBe(true);
    const zs = [profile!.loops[0].z, ...segments.map((segment) => segment.z)];
    expect(Math.min(...zs)).toBeCloseTo(0, 6);
    expect(Math.max(...zs)).toBeCloseTo(shape.height, 6);
  });
});
