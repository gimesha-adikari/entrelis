import * as THREE from "three";
import type { DebrisConfig, GeometryLOD } from "../identity";
import { createLcg } from "../procedural/noise3d";

export interface DebrisInstance {
  readonly group: THREE.Group;
  readonly fragments: readonly THREE.Mesh[];
  readonly config: DebrisConfig;
  update(deltaSec: number): void;
  dispose(): void;
}

function createFragmentGeometry(radius: number, seed: number): THREE.BufferGeometry {
  const geometry = new THREE.DodecahedronGeometry(1, 0);
  const position = geometry.attributes["position"] as THREE.BufferAttribute;
  const random = createLcg(seed);
  const vertexScales = new Map<string, number>();
  const axisScale = new THREE.Vector3(
    0.82 + random() * 0.28,
    0.82 + random() * 0.28,
    0.82 + random() * 0.28
  );

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const key = `${x.toFixed(5)}:${y.toFixed(5)}:${z.toFixed(5)}`;
    let vertexScale = vertexScales.get(key);
    if (vertexScale === undefined) {
      vertexScale = 0.82 + random() * 0.34;
      vertexScales.set(key, vertexScale);
    }

    position.setXYZ(
      i,
      x * axisScale.x * vertexScale * radius,
      y * axisScale.y * vertexScale * radius,
      z * axisScale.z * vertexScale * radius
    );
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * Creates a sparse deterministic field of miniature irregular fragments.
 * The cluster stays fixed; only each fragment turns slowly on its own axis.
 */
export function createDebrisGroup(
  config: DebrisConfig,
  parentRadius = 50,
  lod: GeometryLOD = "focus"
): DebrisInstance {
  const group = new THREE.Group();
  const rnd = createLcg(config.seed);

  const fragments: THREE.Mesh[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const referenceRadiusScale = Math.max(parentRadius, 1) / 50;
  const lodAdjustment = lod === "context" ? -1 : lod === "focus" ? 1 : 0;
  const count = Math.max(3, Math.min(7, Math.round(config.count + lodAdjustment)));

  const fragmentMaterial = new THREE.MeshStandardMaterial({
    color: 0x57534e,
    roughness: 0.94,
    metalness: 0.02,
  });

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 2 * Math.PI + (rnd() - 0.5) * 0.8;
    const dist =
      (config.minDistance + rnd() * (config.maxDistance - config.minDistance)) *
      referenceRadiusScale;
    const sizeFactor = i === 0 ? 1.18 : 0.78 + rnd() * 0.34;
    const radius = Math.max(1.5, parentRadius * config.scale * sizeFactor);

    const geo = createFragmentGeometry(radius, config.seed + (i + 1) * 73);
    geometries.push(geo);

    const mesh = new THREE.Mesh(geo, fragmentMaterial);
    mesh.position.set(
      Math.cos(angle) * dist,
      (rnd() - 0.5) * parentRadius * 0.2,
      Math.sin(angle) * dist
    );
    mesh.rotation.set(rnd() * Math.PI, rnd() * Math.PI, rnd() * Math.PI);

    group.add(mesh);
    fragments.push(mesh);
  }

  return {
    group,
    fragments,
    config,
    update(deltaSec: number) {
      for (let i = 0; i < fragments.length; i++) {
        const fragment = fragments[i]!;
        const spin = 0.008 + (i % 4) * 0.0015;
        fragment.rotation.x += deltaSec * spin * 0.72;
        fragment.rotation.y += deltaSec * spin;
        fragment.rotation.z += deltaSec * spin * 0.48;
      }
    },
    dispose() {
      for (const geo of geometries) geo.dispose();
      fragmentMaterial.dispose();
    },
  };
}
