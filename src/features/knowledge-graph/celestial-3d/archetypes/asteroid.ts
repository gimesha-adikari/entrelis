import * as THREE from "three";
import { createLcg, createNoise3D, fbm3D } from "../procedural/noise3d";

type AsteroidVariant = "carbon" | "mineral";

interface AsteroidCrater {
  readonly direction: THREE.Vector3;
  readonly angularRadius: number;
  readonly depth: number;
  readonly rim: number;
}

interface AsteroidLobe {
  readonly direction: THREE.Vector3;
  readonly strength: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function createSeededDirection(random: () => number): THREE.Vector3 {
  const y = random() * 2 - 1;
  const angle = random() * Math.PI * 2;
  const horizontalRadius = Math.sqrt(1 - y * y);
  return new THREE.Vector3(
    horizontalRadius * Math.cos(angle),
    y,
    horizontalRadius * Math.sin(angle)
  );
}

function createCraters(seed: number, variant: AsteroidVariant): readonly AsteroidCrater[] {
  const random = createLcg(seed + (variant === "carbon" ? 211 : 719));

  if (variant === "carbon") {
    return Array.from({ length: 3 }, () => ({
      direction: createSeededDirection(random),
      angularRadius: 0.27 + random() * 0.11,
      depth: 0.13 + random() * 0.07,
      rim: 0.018 + random() * 0.025,
    }));
  }

  const basinDirection = new THREE.Vector3(
    (random() - 0.5) * 0.46,
    (random() - 0.5) * 0.34,
    1
  ).normalize();
  return [
    {
      direction: basinDirection,
      angularRadius: 0.43 + random() * 0.1,
      depth: 0.2 + random() * 0.08,
      rim: 0.014 + random() * 0.018,
    },
  ];
}

function createLobes(seed: number, variant: AsteroidVariant): readonly AsteroidLobe[] {
  const random = createLcg(seed + (variant === "carbon" ? 419 : 1021));
  const count = variant === "carbon" ? 3 : 1;
  const baseStrength = variant === "carbon" ? 0.1 : 0.04;
  const strengthRange = variant === "carbon" ? 0.055 : 0.025;

  return Array.from({ length: count }, () => ({
    direction: createSeededDirection(random),
    strength: baseStrength + random() * strengthRange,
  }));
}

function createMineralCutNormal(seed: number): THREE.Vector3 {
  const random = createLcg(seed + 1301);
  return new THREE.Vector3(
    0.58 + (random() - 0.5) * 0.14,
    0.14 + (random() - 0.5) * 0.14,
    0.8 + (random() - 0.5) * 0.14
  ).normalize();
}

function getCraterDisplacement(
  direction: THREE.Vector3,
  craters: readonly AsteroidCrater[],
  edgeNoise: (x: number, y: number, z: number) => number
): number {
  let displacement = 0;

  for (const crater of craters) {
    const angle = Math.acos(clamp(direction.dot(crater.direction), -1, 1));
    const edgeWarp = edgeNoise(direction.x * 3.2, direction.y * 3.2, direction.z * 3.2) * 0.06;
    const distance = angle / (crater.angularRadius * (1 + edgeWarp));
    if (distance >= 1) continue;

    const bowl = (1 - distance * distance) * crater.depth;
    const rim = Math.sin(distance * Math.PI) * crater.rim;
    displacement -= bowl - rim;
  }

  return displacement;
}

/**
 * Builds one deterministic asteroid family silhouette from a seeded icosphere.
 * Carbon bodies stay compact and multi-lobed; mineral bodies use a long silicate
 * axis and a clipped shear plane. All levels sample the same continuous fields.
 */
export function deformAsteroidGeometry(
  radius = 50,
  seed = 42,
  detail = 2,
  variant: AsteroidVariant = "carbon"
): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(radius, detail);
  const positionAttribute = geometry.attributes["position"] as THREE.BufferAttribute;
  const familySeed = seed + (variant === "carbon" ? 0 : 4099);
  const featureRandom = createLcg(familySeed + 37);
  const macroNoise = createNoise3D(familySeed + 53);
  const mesoNoise = createNoise3D(familySeed + 79);
  const craterEdgeNoise = createNoise3D(familySeed + 101);
  const craters = createCraters(familySeed, variant);
  const lobes = createLobes(familySeed, variant);

  const axisScale =
    variant === "carbon"
      ? new THREE.Vector3(
          0.97 + featureRandom() * 0.1,
          0.96 + featureRandom() * 0.1,
          0.96 + featureRandom() * 0.1
        )
      : new THREE.Vector3(
          1.38 + featureRandom() * 0.1,
          0.78 + featureRandom() * 0.08,
          0.9 + featureRandom() * 0.1
        );
  const mineralCutNormal = variant === "mineral" ? createMineralCutNormal(familySeed) : null;

  for (let i = 0; i < positionAttribute.count; i++) {
    const x = positionAttribute.getX(i);
    const y = positionAttribute.getY(i);
    const z = positionAttribute.getZ(i);
    const length = Math.sqrt(x * x + y * y + z * z);
    if (length === 0) continue;

    const nx = x / length;
    const ny = y / length;
    const nz = z / length;
    const direction = new THREE.Vector3(nx, ny, nz);

    let lobeDisplacement = 0;
    for (const lobe of lobes) {
      lobeDisplacement += Math.pow(Math.max(0, direction.dot(lobe.direction)), 4) * lobe.strength;
    }

    const macro = fbm3D(macroNoise, nx * 1.75, ny * 1.75, nz * 1.75, 3);
    const meso = fbm3D(mesoNoise, nx * 3.8, ny * 3.8, nz * 3.8, 2);
    const micro = fbm3D(craterEdgeNoise, nx * 7.2, ny * 7.2, nz * 7.2, 2);
    const crater = getCraterDisplacement(direction, craters, craterEdgeNoise);

    const macroStrength = variant === "carbon" ? 0.16 : 0.07;
    const mesoStrength = variant === "carbon" ? 0.035 : 0.06;
    const microStrength = variant === "carbon" ? 0.018 : 0.012;
    const axisBias =
      variant === "carbon"
        ? 0.035 * nx * nx - 0.02 * ny * ny + 0.025 * nz
        : 0.018 * nz - 0.012 * ny;
    const radialScale = clamp(
      1 +
        axisBias +
        lobeDisplacement +
        macro * macroStrength +
        meso * mesoStrength +
        micro * microStrength +
        crater,
      0.62,
      1.34
    );

    const deformed = new THREE.Vector3(
      nx * radius * radialScale * axisScale.x,
      ny * radius * radialScale * axisScale.y,
      nz * radius * radialScale * axisScale.z
    );

    if (mineralCutNormal) {
      const cutExcess = deformed.dot(mineralCutNormal) - radius * 1.03;
      if (cutExcess > 0) deformed.addScaledVector(mineralCutNormal, -cutExcess);
    }

    positionAttribute.setXYZ(i, deformed.x, deformed.y, deformed.z);
  }

  positionAttribute.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
