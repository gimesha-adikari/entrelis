import * as THREE from "three";
import type { RingConfig, GeometryLOD } from "../identity";
import { createRingTexture } from "../procedural/textures";

/**
 * Creates a reusable 3D Ring mesh with procedural radial banding,
 * alpha gaps, customizable tilt, and depth-testing for proper spherical occlusion.
 */
export function createRingMesh(config: RingConfig, lod: GeometryLOD = "focus"): THREE.Mesh {
  const thetaSegments = lod === "context" ? 32 : lod === "primary" ? 48 : 64;
  const geometry = new THREE.RingGeometry(config.innerRadius, config.outerRadius, thetaSegments, 4);

  const texture = createRingTexture(config);

  const material = new THREE.MeshStandardMaterial({
    map: texture,
    alphaMap: texture,
    transparent: true,
    opacity: config.opacity,
    color: new THREE.Color(config.color ?? 0xffffff),
    side: THREE.DoubleSide,
    depthWrite: true,
    depthTest: true,
    roughness: 0.85,
    metalness: 0.1,
  });

  const mesh = new THREE.Mesh(geometry, material);

  // In Three.js, RingGeometry lies in XY plane.
  // Rotate around X axis to lie in equatorial plane, then tilt around Z/X axis.
  mesh.rotation.x = Math.PI / 2.3;
  mesh.rotation.z = config.tilt;

  return mesh;
}
