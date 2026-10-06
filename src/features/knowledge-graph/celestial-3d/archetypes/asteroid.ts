import * as THREE from "three";
import { createNoise3D, fbm3D } from "../procedural/noise3d";

/**
 * Procedurally deforms an IcosahedronGeometry into a realistic irregular asteroid with
 * asymmetrical elongation, low-frequency lumpiness, and impact craters.
 * Guaranteed to produce an irregular 3D silhouette rather than a sphere.
 */
export function deformAsteroidGeometry(radius = 50, seed = 42, detail = 2): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(radius, detail);
  const positionAttribute = geometry.attributes["position"] as THREE.BufferAttribute;

  const noise = createNoise3D(seed);
  const craterNoise = createNoise3D(seed + 109);

  // 3 deterministic crater centers on the sphere
  const craters = [
    { dir: new THREE.Vector3(0.6, 0.7, 0.3).normalize(), radius: 0.35, depth: 0.22 },
    { dir: new THREE.Vector3(-0.7, -0.4, 0.5).normalize(), radius: 0.28, depth: 0.18 },
    { dir: new THREE.Vector3(0.2, -0.8, -0.5).normalize(), radius: 0.3, depth: 0.2 },
  ];

  for (let i = 0; i < positionAttribute.count; i++) {
    const x = positionAttribute.getX(i);
    const y = positionAttribute.getY(i);
    const z = positionAttribute.getZ(i);

    const length = Math.sqrt(x * x + y * y + z * z);
    if (length === 0) continue;

    const nx = x / length;
    const ny = y / length;
    const nz = z / length;

    // 1. Asymmetrical ellipsoid elongation
    const elongation = 1.0 + 0.22 * nx * nx - 0.15 * ny * ny + 0.1 * nz;

    // 2. Low-frequency lumpiness & ridges
    const lump = fbm3D(noise, nx * 1.8, ny * 1.8, nz * 1.8, 3) * 0.28;

    // 3. Impact craters with bowl indentations and raised rims
    let craterOffset = 0;
    const vertexDir = new THREE.Vector3(nx, ny, nz);
    for (const c of craters) {
      const angle = vertexDir.angleTo(c.dir);
      if (angle < c.radius) {
        const t = angle / c.radius;
        // Raised rim at edge, depression at center
        const bowl = (1.0 - t * t) * c.depth;
        const rim = Math.sin(t * Math.PI) * 0.08;
        craterOffset -= bowl - rim;
      }
    }

    // 4. Fine regolith micro-roughness
    const micro = fbm3D(craterNoise, nx * 6.0, ny * 6.0, nz * 6.0, 2) * 0.06;

    const totalScale = elongation + lump + craterOffset + micro;
    const newRadius = radius * totalScale;

    positionAttribute.setXYZ(i, nx * newRadius, ny * newRadius, nz * newRadius);
  }

  positionAttribute.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}
