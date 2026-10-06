import * as THREE from "three";
import type { RingConfig, GeometryLOD } from "../identity";
import { createRingTexture } from "../procedural/textures";

/**
 * Creates a reusable 3D Ring mesh with procedural radial banding,
 * alpha gaps, customizable tilt, and depth-testing for proper spherical occlusion.
 */
export function createRingMesh(config: RingConfig, lod: GeometryLOD = "focus"): THREE.Mesh {
  const thetaSegments = lod === "context" ? 32 : lod === "primary" ? 48 : 64;
  const phiSegments = 8;
  const geometry = new THREE.RingGeometry(
    config.innerRadius,
    config.outerRadius,
    thetaSegments,
    phiSegments
  );

  // Remap RingGeometry planar UVs to parametric polar coordinates:
  // u: radial fraction [0, 1] (inner to outer radius)
  // v: angular fraction [0, 1] (0 to 2*PI circumference)
  const uv = geometry.attributes.uv;
  if (uv) {
    for (let i = 0; i <= phiSegments; i++) {
      const u = i / phiSegments;
      for (let j = 0; j <= thetaSegments; j++) {
        const v = j / thetaSegments;
        const index = i * (thetaSegments + 1) + j;
        uv.setXY(index, u, v);
      }
    }
    uv.needsUpdate = true;
  }

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
    roughness: 0.82,
    metalness: 0.08,
  });

  const mesh = new THREE.Mesh(geometry, material);

  // In Three.js, RingGeometry lies in XY plane.
  // Rotate around X axis to lie in equatorial plane, then tilt around Z/X axis.
  mesh.rotation.x = Math.PI / 2.3;
  mesh.rotation.z = config.tilt;

  return mesh;
}
