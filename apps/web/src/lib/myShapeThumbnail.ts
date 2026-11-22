import * as THREE from "three";
import { installSafariBufferUploads } from "@/lib/safariBufferUploads";

/*
 * The preview tile of a custom shape: the saved bodies alone, drawn from
 * the front right and a little above like the other library icons, in their
 * own colours on a clear ground. Holes show as a faint grey ghost, the way
 * the workplane shows them.
 */

export type ThumbnailMesh = {
  vertices: Array<[number, number, number]>;
  faces: Array<[number, number, number]>;
  color: string;
  hole?: boolean;
};

export const MY_SHAPE_THUMBNAIL_SIZE = 160;

export function renderMyShapeThumbnail(meshes: ThumbnailMesh[], size = MY_SHAPE_THUMBNAIL_SIZE): string {
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  let renderer: THREE.WebGLRenderer | null = null;
  const scene = new THREE.Scene();
  const disposables: Array<{ dispose: () => void }> = [];
  try {
    installSafariBufferUploads();
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(size, size, false);
    renderer.setClearColor(0x000000, 0);

    const bounds = new THREE.Box3();
    for (const mesh of meshes) {
      if (mesh.vertices.length === 0 || mesh.faces.length === 0) continue;
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(mesh.vertices.flat(), 3));
      geometry.setIndex(mesh.faces.flat());
      geometry.computeVertexNormals();
      const material = mesh.hole
        ? new THREE.MeshStandardMaterial({ color: 0x9a9a9a, transparent: true, opacity: 0.35, depthWrite: false, roughness: 0.8, side: THREE.DoubleSide })
        : new THREE.MeshStandardMaterial({ color: new THREE.Color(mesh.color), roughness: 0.62, metalness: 0.04, flatShading: true, side: THREE.DoubleSide });
      disposables.push(geometry, material);
      const object = new THREE.Mesh(geometry, material);
      object.renderOrder = mesh.hole ? 1 : 0;
      scene.add(object);
      geometry.computeBoundingBox();
      if (geometry.boundingBox) bounds.union(geometry.boundingBox);
    }
    if (bounds.isEmpty()) return "";

    const center = bounds.getCenter(new THREE.Vector3());
    const radius = Math.max(0.5, bounds.getBoundingSphere(new THREE.Sphere()).radius);
    const camera = new THREE.OrthographicCamera(-radius, radius, radius, -radius, 0.1, radius * 8);
    const direction = new THREE.Vector3(1, 1.15, 1.3).normalize();
    camera.position.copy(center).addScaledVector(direction, radius * 4);
    camera.lookAt(center);
    camera.zoom = 1.06;
    camera.updateProjectionMatrix();

    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a68, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.copy(center).add(new THREE.Vector3(radius * 2, radius * 4, radius * 3));
    scene.add(key);

    renderer.render(scene, camera);
    return canvas.toDataURL("image/png");
  } catch {
    return "";
  } finally {
    disposables.forEach((item) => item.dispose());
    renderer?.dispose();
    renderer?.forceContextLoss();
  }
}
