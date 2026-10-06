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
    transparent: true,
    opacity: config.opacity,
    color: new THREE.Color(config.color ?? 0xffffff),
    side: THREE.DoubleSide,
    depthWrite: false, // Prevents transparent division gaps & voids from writing depth
    depthTest: true, // Correctly occluded behind the planet's opaque sphere
    roughness: config.style === "dust" ? 0.92 : 0.8,
    metalness: config.style === "ice" ? 0.12 : 0.04,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 1; // Renders after the opaque planet sphere (renderOrder 0)

  // In Three.js, RingGeometry lies in XY plane.
  // Rotate around X axis to lie in equatorial plane, then tilt around Z/X axis.
  mesh.rotation.x = Math.PI / 2.3;
  mesh.rotation.z = config.tilt;

  // For broken rings: attach 5 miniature irregular debris rock chunks in the ring plane
  if (config.style === "broken") {
    const chunkCount = 5;
    const ringSpan = config.outerRadius - config.innerRadius;
    const seedAngleShift = ((config.seed % 100) / 100) * Math.PI * 2;

    // Placed deterministically in gaps and near arc tips
    const targetAngles = [
      2.65, // in Void Gap 1
      3.15, // trailing tip of Void Gap 1
      4.85, // in Void Gap 2
      5.45, // in Fragmented Cluster
      6.12, // in Void Gap 3
    ];

    const chunkMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(config.color ?? 0xd6d3d1),
      roughness: 0.9,
      metalness: 0.06,
      depthTest: true,
      depthWrite: true,
    });

    for (let i = 0; i < chunkCount; i++) {
      const angle = (targetAngles[i]! + seedAngleShift) % (Math.PI * 2);
      const rFraction = 0.25 + ((i * 37 + config.seed) % 50) / 100;
      const radius = config.innerRadius + ringSpan * rFraction;

      const chunkSize = Math.max(1.8, Math.min(3.8, ringSpan * 0.1));
      const chunkGeo = new THREE.DodecahedronGeometry(chunkSize, 0);

      // Irregular vertex perturbation for rocky asteroid shape
      const posAttr = chunkGeo.attributes.position;
      if (posAttr) {
        for (let vIdx = 0; vIdx < posAttr.count; vIdx++) {
          const vx = posAttr.getX(vIdx);
          const vy = posAttr.getY(vIdx);
          const vz = posAttr.getZ(vIdx);
          const scale = 0.82 + ((vIdx * 17 + i * 31 + config.seed) % 36) / 100;
          posAttr.setXYZ(vIdx, vx * scale, vy * scale, vz * scale);
        }
        chunkGeo.computeVertexNormals();
      }

      const chunkMesh = new THREE.Mesh(chunkGeo, chunkMat);
      chunkMesh.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
      chunkMesh.rotation.set((i * 1.3 + config.seed) % 3, (i * 0.8) % 3, (i * 2.1) % 3);
      chunkMesh.renderOrder = 2;
      mesh.add(chunkMesh);
    }
  }

  return mesh;
}
