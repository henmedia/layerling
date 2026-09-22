import type { SketchProfile } from "@/types/layerling";

export type SketchCadBuildRequest =
  | {
      type: "build";
      requestId: number;
      profile: SketchProfile;
      height: number;
    }
  | {
      type: "sweep";
      requestId: number;
      points: { x: number; y: number; z: number }[];
      radius: number;
    };

export type SketchCadBuildResponse =
  | {
      type: "built";
      requestId: number;
      positions: Float32Array;
      normals: Float32Array;
      indices: Uint32Array;
      triangleCount: number;
      brep: string;
    }
  | {
      type: "swept";
      requestId: number;
      positions: Float32Array;
      normals: Float32Array;
      indices: Uint32Array;
      triangleCount: number;
      brep: string;
    }
  | { type: "error"; requestId: number; message: string };
