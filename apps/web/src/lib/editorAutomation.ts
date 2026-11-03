
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { canonicalizeShape, withHoleMode } from "@/lib/workplaneShapes";
import { sceneShape } from "@/lib/shapeCatalog";
import type { WorkplaneShape } from "@/types/layerling";
import { type Vec3, meshForShape, appendMeshData, boundsForCuboids, meshAabb } from "@/lib/editorMeshCore";
import { groupedShape } from "@/lib/editorBooleans";

function stlBoxTrianglePositions(width: number, depth: number, height: number) {
  const x = width / 2;
  const z = depth / 2;
  const vertices: Vec3[] = [
    [-x, 0, -z],
    [x, 0, -z],
    [x, 0, z],
    [-x, 0, z],
    [-x, height, -z],
    [x, height, -z],
    [x, height, z],
    [-x, height, z],
  ];
  const faces: [number, number, number][] = [
    [0, 1, 2],
    [0, 2, 3],
    [4, 6, 5],
    [4, 7, 6],
    [0, 5, 1],
    [0, 4, 5],
    [1, 6, 2],
    [1, 5, 6],
    [2, 7, 3],
    [2, 6, 7],
    [3, 4, 0],
    [3, 7, 4],
  ];
  return faces.flatMap((face) => face.flatMap((index) => vertices[index]));
}

function automationSolidBox(overrides: Partial<WorkplaneShape> = {}) {
  return sceneShape({
    id: "solid-cube",
    name: "Solid cube",
    kind: "box",
    color: "#d41721",
    x: 0,
    z: 0,
    width: 28,
    depth: 28,
    height: 28,
    ...overrides,
  });
}

function automationHoleBox(overrides: Partial<WorkplaneShape> = {}) {
  return sceneShape({
    id: "hole-cube",
    name: "Hole cube",
    kind: "box",
    color: "#b8c2cc",
    hole: true,
    x: 0,
    z: 0,
    elevation: -4,
    width: 13,
    depth: 40,
    height: 36,
    ...overrides,
  });
}

function automationImportedStlBox(overrides: Partial<WorkplaneShape> = {}) {
  const width = overrides.width ?? 28;
  const depth = overrides.depth ?? 28;
  const height = overrides.height ?? 28;
  return sceneShape({
    id: "imported-stl-cube",
    name: "Imported STL cube",
    kind: "mesh",
    color: "#0098c7",
    x: 0,
    z: 0,
    width,
    depth,
    height,
    importedMesh: {
      positions: stlBoxTrianglePositions(width, depth, height),
      baseWidth: width,
      baseDepth: depth,
      baseHeight: height,
      triangleCount: 12,
      sourceFormat: "stl",
    },
    ...overrides,
  });
}

function automationHoleStlBox(overrides: Partial<WorkplaneShape> = {}) {
  return automationImportedStlBox({
    id: "hole-stl",
    name: "Hole STL",
    color: "#b8c2cc",
    hole: true,
    elevation: -4,
    width: 13,
    depth: 40,
    height: 38,
    ...overrides,
  });
}

function automationImportedStlFromShapes(id: string, name: string, color: string, parts: WorkplaneShape[], overrides: Partial<WorkplaneShape> = {}) {
  const vertices: Vec3[] = [];
  const faces: [number, number, number][] = [];
  parts.forEach((part) => appendMeshData(vertices, faces, meshForShape(part)));
  const bounds = boundsForCuboids([{ minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 }, ...parts.map(meshAabb)]);
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const depth = Math.max(1, bounds.maxZ - bounds.minZ);
  const height = Math.max(1, bounds.maxY - bounds.minY);
  const positions: number[] = [];
  faces.forEach(([ai, bi, ci]) => {
    [vertices[ai], vertices[bi], vertices[ci]].forEach(([x, y, z]) => {
      positions.push(x - centerX, y - bounds.minY, z - centerZ);
    });
  });

  return sceneShape({
    id,
    name,
    kind: "mesh",
    color,
    x: centerX,
    z: centerZ,
    elevation: bounds.minY,
    width,
    depth,
    height,
    importedMesh: {
      positions,
      baseWidth: width,
      baseDepth: depth,
      baseHeight: height,
      triangleCount: faces.length,
      sourceFormat: "stl",
    },
    ...overrides,
  });
}

function automationRaspberryPiStl(overrides: Partial<WorkplaneShape> = {}) {
  const parts: WorkplaneShape[] = [
    sceneShape({ id: "raspi-board", name: "Board", kind: "box", color: "#1f9f5f", width: 70, depth: 48, height: 3, elevation: 0 }),
    sceneShape({ id: "raspi-soc", name: "Main chip", kind: "box", color: "#30343b", x: -8, z: 0, width: 15, depth: 15, height: 3.2, elevation: 3 }),
    sceneShape({ id: "raspi-memory", name: "Memory chip", kind: "box", color: "#2b2e34", x: 10, z: 1, width: 11, depth: 13, height: 2.8, elevation: 3 }),
    sceneShape({ id: "raspi-usb-a", name: "USB block", kind: "box", color: "#b9c1c9", x: 23, z: -13, width: 17, depth: 11, height: 9, elevation: 3 }),
    sceneShape({ id: "raspi-usb-b", name: "USB block", kind: "box", color: "#b9c1c9", x: 23, z: 4, width: 17, depth: 11, height: 9, elevation: 3 }),
    sceneShape({ id: "raspi-ethernet", name: "Ethernet jack", kind: "box", color: "#c4c9ce", x: 23, z: 18, width: 18, depth: 13, height: 11, elevation: 3 }),
    sceneShape({ id: "raspi-hdmi", name: "HDMI", kind: "box", color: "#c9c0b2", x: -15, z: -22, width: 16, depth: 5, height: 4, elevation: 3 }),
    sceneShape({ id: "raspi-camera", name: "Camera connector", kind: "box", color: "#2b2e34", x: -28, z: 4, width: 5, depth: 20, height: 3, elevation: 3 }),
    sceneShape({ id: "raspi-mount-a", name: "Mount", kind: "cylinder", color: "#1f9f5f", x: -29, z: -17, width: 6, depth: 6, height: 3.4, elevation: 0, sides: 32 }),
    sceneShape({ id: "raspi-mount-b", name: "Mount", kind: "cylinder", color: "#1f9f5f", x: 29, z: -17, width: 6, depth: 6, height: 3.4, elevation: 0, sides: 32 }),
    sceneShape({ id: "raspi-mount-c", name: "Mount", kind: "cylinder", color: "#1f9f5f", x: -29, z: 17, width: 6, depth: 6, height: 3.4, elevation: 0, sides: 32 }),
    sceneShape({ id: "raspi-mount-d", name: "Mount", kind: "cylinder", color: "#1f9f5f", x: 29, z: 17, width: 6, depth: 6, height: 3.4, elevation: 0, sides: 32 }),
    ...Array.from({ length: 14 }, (_, index) =>
      sceneShape({
        id: `raspi-pin-${index}`,
        name: "GPIO pin",
        kind: "box",
        color: "#e2b94f",
        x: -29 + index * 4,
        z: 23,
        width: 1.6,
        depth: 2.6,
        height: 6,
        elevation: 3,
      }),
    ),
  ];
  return automationImportedStlFromShapes("raspberry-pi-stl", "Raspberry Pi-like STL", "#0098c7", parts, overrides);
}

const booleanAutomationShapeConfigs: Record<
  string,
  {
    name: string;
    kind: WorkplaneShape["kind"];
    color: string;
    width?: number;
    depth?: number;
    height?: number;
    props?: Partial<WorkplaneShape>;
  }
> = {
  cube: { name: "Cube", kind: "box", color: "#d41721" },
  cylinder: { name: "Cylinder", kind: "cylinder", color: "#d97813", props: { sides: 96, segments: 1 } },
  sphere: { name: "Sphere", kind: "sphere", color: "#0098c7", props: { steps: 28, sides: 56 } },
  cone: { name: "Cone", kind: "cone", color: "#6e2786", props: { sides: 96, topRadius: 0, baseRadius: 14 } },
  pyramid: { name: "Pyramid", kind: "pyramid", color: "#f2cf10", props: { sides: 4 } },
  wedge: { name: "Wedge", kind: "wedge", color: "#33983d" },
  text: { name: "Text", kind: "text", color: "#cf101b", width: 34, depth: 18, height: 28, props: { text: "T", font: "Sans" } },
  "round-roof": { name: "Round Roof", kind: "roundRoof", color: "#67c4ce", props: { sides: 64 } },
  "half-sphere": { name: "Half Sphere", kind: "halfSphere", color: "#c9009a", props: { steps: 32 } },
  paraboloid: { name: "Paraboloid", kind: "paraboloid", color: "#8fdc5a", props: { steps: 32 } },
  curvedCone: { name: "Curved Cone", kind: "curvedCone", color: "#9b59b6", width: 30, depth: 30, height: 30, props: { curvedConeTop: 0.25, curvedConeBend: -0.8 } },
  torus: { name: "Torus", kind: "torus", color: "#0098c7", width: 34, depth: 34, height: 8, props: { sides: 96 } },
  tube: { name: "Tube", kind: "tube", color: "#ce7013", width: 34, depth: 34, height: 28, props: { bevel: 6, sides: 96 } },
};

function automationShape(key: string, overrides: Partial<WorkplaneShape> = {}) {
  const config = booleanAutomationShapeConfigs[key];
  if (!config) {
    return null;
  }

  const width = overrides.width ?? config.width ?? 28;
  const depth = overrides.depth ?? config.depth ?? 28;
  const height = overrides.height ?? config.height ?? 28;
  return sceneShape({
    id: `${overrides.hole ? "hole" : "solid"}-${key}`,
    name: config.name,
    kind: config.kind,
    color: config.color,
    x: 0,
    z: 0,
    width,
    depth,
    height,
    size: Math.max(width, depth),
    ...config.props,
    ...overrides,
  });
}

function automationHoleShape(key: string, overrides: Partial<WorkplaneShape> = {}) {
  const shape = automationShape(key, {
    hole: true,
    color: "#b8c2cc",
    elevation: key === "torus" ? 18 : -3,
    rotation: 27,
    width: key === "text" ? 32 : key === "torus" || key === "tube" ? 34 : 24,
    depth: key === "text" ? 17 : key === "torus" || key === "tube" ? 34 : 24,
    height: key === "torus" ? 12 : 34,
    ...overrides,
  });
  return shape ? withHoleMode(shape, true) : null;
}

function automationNormalGroupedObject(overrides: Partial<WorkplaneShape> = {}) {
  const cube = automationShape("cube", { id: "normal-group-cube", x: -9, width: 18, depth: 24, height: 26 });
  const cylinder = automationShape("cylinder", { id: "normal-group-cylinder", x: 10, width: 20, depth: 20, height: 28 });
  if (!cube || !cylinder) {
    return null;
  }
  const group = groupedShape([cube, cylinder]);
  return group ? { ...group, id: "normal-group", name: "Normal grouped object", ...overrides } : null;
}

function automationSelectionOutlineRegressionShape() {
  const geometries: THREE.BufferGeometry[] = [
    new RoundedBoxGeometry(30, 20, 20, 8, 4).translate(-15, 10, 0),
    new THREE.BoxGeometry(16, 20, 20).translate(18, 10, 0),
  ];
  const positions: number[] = [];
  const normals: number[] = [];

  geometries.forEach((geometry) => {
    const nonIndexed = geometry.index ? geometry.toNonIndexed() : geometry;
    nonIndexed.computeVertexNormals();
    positions.push(...Array.from(nonIndexed.getAttribute("position").array as ArrayLike<number>));
    normals.push(...Array.from(nonIndexed.getAttribute("normal").array as ArrayLike<number>));
    if (nonIndexed !== geometry) {
      nonIndexed.dispose();
    }
    geometry.dispose();
  });

  return canonicalizeShape(
    sceneShape({
      id: "selection-outline-regression",
      name: "Selection outline regression",
      kind: "mesh",
      color: "#d41721",
      x: 0,
      z: 0,
      width: 56,
      depth: 20,
      height: 20,
      size: 56,
      importedMesh: {
        positions,
        normals,
        baseWidth: 56,
        baseDepth: 20,
        baseHeight: 20,
        triangleCount: Math.floor(positions.length / 9),
        sourceFormat: "json",
      },
      groupedShapes: [
        sceneShape({ id: "rounded-child", name: "Rounded child", kind: "box", color: "#d41721", x: -15, width: 30, depth: 20, height: 20, radius: 4 }),
        sceneShape({ id: "box-child", name: "Box child", kind: "box", color: "#d41721", x: 18, width: 16, depth: 20, height: 20 }),
      ],
    }),
  );
}

function booleanAutomationDynamicScene(caseId: string): { label: string; shapes: WorkplaneShape[] } | null {
  const requestedKeys = Object.keys(booleanAutomationShapeConfigs).filter((key) => key !== "cube" && key !== "cylinder");
  const allNormalKeys = Object.keys(booleanAutomationShapeConfigs);

  for (const key of requestedKeys) {
    if (caseId === `${key}-rot-hole`) {
      const solid = automationShape(key);
      return solid
        ? {
            label: `${solid.name} + rotated hole cube`,
            shapes: [solid, automationHoleBox({ rotation: 32 })],
          }
        : null;
    }

    if (caseId === `${key}-hole-cube`) {
      const hole = automationHoleShape(key);
      return hole
        ? {
            label: `${hole.name} hole + solid cube`,
            shapes: [automationSolidBox({ width: 36, depth: 36, height: 30 }), hole],
          }
        : null;
    }

    if (caseId === `${key}-hole-stl`) {
      const hole = automationHoleShape(key);
      return hole
        ? {
            label: `${hole.name} hole + imported STL`,
            shapes: [automationImportedStlBox({ width: 36, depth: 36, height: 30 }), hole],
          }
        : null;
    }
  }

  for (const key of allNormalKeys) {
    if (caseId === `hole-stl-${key}`) {
      const solid = automationShape(key, { width: key === "text" ? 42 : undefined, depth: key === "text" ? 20 : undefined });
      return solid
        ? {
            label: `rotated hole STL + ${solid.name}`,
            shapes: [
              solid,
              automationHoleStlBox({
                id: `hole-stl-${key}`,
                rotation: 29,
                rotationZ: 8,
              }),
            ],
          }
        : null;
    }

    if (caseId === `straight-hole-stl-${key}`) {
      const solid = automationShape(key, { width: key === "text" ? 42 : undefined, depth: key === "text" ? 20 : undefined });
      return solid
        ? {
            label: `non-rotated hole STL + ${solid.name}`,
            shapes: [
              solid,
              automationHoleStlBox({
                id: `straight-hole-stl-${key}`,
                rotation: 0,
                rotationZ: 0,
              }),
            ],
          }
        : null;
    }
  }

  return null;
}

export function booleanAutomationScene(caseId: string): { label: string; shapes: WorkplaneShape[] } | null {
  const rotatedHole = () => automationHoleBox({ rotation: 32 });
  if (caseId === "selection-outline-regression") {
    return {
      label: "segmented rounded mesh selection outline",
      shapes: [automationSelectionOutlineRegressionShape()],
    };
  }
  if (caseId === "locked-align-pair") {
    return {
      label: "locked alignment reference pair",
      shapes: [
        sceneShape({ id: "locked-anchor", name: "Locked cube", kind: "box", color: "#d41721", x: 24, z: 10, width: 20, depth: 20, height: 20, locked: true }),
        sceneShape({ id: "moving-cube", name: "Moving cube", kind: "box", color: "#ef7f1a", x: -24, z: -18, width: 12, depth: 12, height: 12 }),
      ],
    };
  }
  if (caseId === "normal-group") {
    const group = groupedShape([
      sceneShape({ id: "modifier-base", name: "Base", kind: "box", color: "#d41721", width: 54, depth: 38, height: 7 }),
      sceneShape({ id: "modifier-upright", name: "Upright", kind: "box", color: "#d41721", x: 8, width: 14, depth: 14, height: 40, elevation: 4 }),
      sceneShape({ id: "modifier-rail", name: "Rail", kind: "box", color: "#d41721", x: -7, z: 5, width: 32, depth: 10, height: 13, elevation: 4 }),
    ]);
    return group ? { label: "overlapping normal solid group", shapes: [group] } : null;
  }
  if (caseId === "straight-hole-stl-group") {
    const group = automationNormalGroupedObject();
    return group
      ? {
          label: "normal grouped object + non-rotated hole STL",
          shapes: [group, automationHoleStlBox({ id: "straight-hole-stl-group", width: 24, depth: 42 })],
        }
      : null;
  }
  if (caseId === "straight-hole-stl-mixed-group") {
    const group = automationNormalGroupedObject({ x: 12 });
    const cube = automationShape("cube", { id: "mixed-solid-cube", x: -14, width: 24, depth: 26, height: 28 });
    return group && cube
      ? {
          label: "cube + normal grouped object + non-rotated hole STL",
          shapes: [cube, group, automationHoleStlBox({ id: "straight-hole-stl-mixed-group", width: 48, depth: 42 })],
        }
      : null;
  }
  if (caseId === "raspi-stl-hole") {
    return {
      label: "Raspberry Pi-like STL + non-rotated hole cube",
      shapes: [
        automationRaspberryPiStl(),
        automationHoleBox({ id: "raspi-hole-cube", x: -2, z: 2, width: 18, depth: 56, height: 20, elevation: -2, rotation: 0, rotationZ: 0 }),
      ],
    };
  }
  if (caseId === "raspi-stl-rot-hole") {
    return {
      label: "Raspberry Pi-like STL + rotated hole cube",
      shapes: [
        automationRaspberryPiStl(),
        automationHoleBox({ id: "raspi-rot-hole-cube", x: -2, z: 2, width: 18, depth: 56, height: 20, elevation: -2, rotation: 28, rotationZ: 8 }),
      ],
    };
  }
  if (caseId === "raspi-stl-hole-stl") {
    return {
      label: "Raspberry Pi-like STL + non-rotated hole STL",
      shapes: [
        automationRaspberryPiStl(),
        automationHoleStlBox({ id: "raspi-hole-stl", x: -2, z: 2, width: 18, depth: 56, height: 20, elevation: -2, rotation: 0, rotationZ: 0 }),
      ],
    };
  }
  if (caseId === "raspi-stl-rot-hole-stl") {
    return {
      label: "Raspberry Pi-like STL + rotated hole STL",
      shapes: [
        automationRaspberryPiStl(),
        automationHoleStlBox({ id: "raspi-rot-hole-stl", x: -2, z: 2, width: 18, depth: 56, height: 20, elevation: -2, rotation: 28, rotationZ: 8 }),
      ],
    };
  }
  const cases: Record<string, { label: string; shapes: WorkplaneShape[] }> = {
    "cube-hole": {
      label: "solid cube + non-rotated hole cube",
      shapes: [automationSolidBox(), automationHoleBox()],
    },
    "cube-rot-hole": {
      label: "solid cube + rotated hole cube",
      shapes: [automationSolidBox(), rotatedHole()],
    },
    "stl-hole": {
      label: "STL + non-rotated hole cube",
      shapes: [automationImportedStlBox(), automationHoleBox()],
    },
    "stl-rot-hole": {
      label: "STL + rotated hole cube",
      shapes: [automationImportedStlBox(), rotatedHole()],
    },
    "rot-stl-hole": {
      label: "rotated STL + hole cube",
      shapes: [automationImportedStlBox({ rotation: 28, rotationZ: 8 }), automationHoleBox()],
    },
    "rot-stl-rot-hole": {
      label: "rotated STL + rotated hole cube",
      shapes: [automationImportedStlBox({ rotation: 28, rotationZ: 8 }), rotatedHole()],
    },
    "cylinder-rot-hole": {
      label: "cylinder + rotated hole cube",
      shapes: [automationSolidBox({ id: "solid-cylinder", name: "Cylinder", kind: "cylinder", color: "#d97813", sides: 48 }), rotatedHole()],
    },
    "sphere-rot-hole": {
      label: "sphere + rotated hole cube",
      shapes: [automationSolidBox({ id: "solid-sphere", name: "Sphere", kind: "sphere", color: "#0098c7", sides: 48 }), rotatedHole()],
    },
    "cone-rot-hole": {
      label: "cone + rotated hole cube",
      shapes: [
        automationSolidBox({ id: "solid-cone", name: "Cone", kind: "cone", color: "#6e2786", sides: 64, topRadius: 0, baseRadius: 14 }),
        rotatedHole(),
      ],
    },
    "pyramid-rot-hole": {
      label: "pyramid + rotated hole cube",
      shapes: [automationSolidBox({ id: "solid-pyramid", name: "Pyramid", kind: "pyramid", color: "#f2cf10", sides: 4 }), rotatedHole()],
    },
  };
  return cases[caseId] ?? booleanAutomationDynamicScene(caseId);
}
