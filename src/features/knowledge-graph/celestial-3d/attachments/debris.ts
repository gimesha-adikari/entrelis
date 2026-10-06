import * as THREE from "three";
import type { DebrisConfig } from "../identity";
import { createLcg } from "../procedural/noise3d";

export interface DebrisInstance {
  readonly group: THREE.Group;
  readonly fragments: readonly THREE.Mesh[];
  readonly config: DebrisConfig;
  update(deltaSec: number): void;
  dispose(): void;
}

/**
 * Creates 2 to 5 lightweight miniature debris/fragment bodies around a celestial object.
 * Deterministic positioning and subtle rotation.
 */
export function createDebrisGroup(config: DebrisConfig, parentRadius = 50): DebrisInstance {
  const group = new THREE.Group();
  const rnd = createLcg(config.seed);

  const fragments: THREE.Mesh[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const count = Math.max(2, Math.min(5, config.count));

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 2 * Math.PI + (rnd() - 0.5) * 0.4;
    const dist = config.minDistance + rnd() * (config.maxDistance - config.minDistance);
    const radius = Math.max(2, parentRadius * config.scale * (0.8 + rnd() * 0.4));

    // Irregular miniature rock geometry using Dodecahedron
    const geo = new THREE.DodecahedronGeometry(radius, 0);
    geometries.push(geo);

    const mat = new THREE.MeshStandardMaterial({
      color: 0x57534e,
      roughness: 0.9,
      metalness: 0.05,
    });
    materials.push(mat);

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(Math.cos(angle) * dist, (rnd() - 0.5) * 12, Math.sin(angle) * dist);
    mesh.rotation.set(rnd() * Math.PI, rnd() * Math.PI, rnd() * Math.PI);

    group.add(mesh);
    fragments.push(mesh);
  }

  return {
    group,
    fragments,
    config,
    update(deltaSec: number) {
      group.rotation.y += deltaSec * 0.08;
      for (const frag of fragments) {
        frag.rotation.x += deltaSec * 0.2;
        frag.rotation.y += deltaSec * 0.25;
      }
    },
    dispose() {
      for (const geo of geometries) geo.dispose();
      for (const mat of materials) mat.dispose();
    },
  };
}
