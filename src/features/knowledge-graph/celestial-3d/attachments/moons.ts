import * as THREE from "three";
import type { MoonConfig } from "../identity";

export interface MoonInstance {
  readonly pivot: THREE.Group;
  readonly mesh: THREE.Mesh;
  readonly config: MoonConfig;
  update(deltaSec: number): void;
  dispose(): void;
}

/**
 * Creates an optional lightweight moon that orbits its host planet.
 * Under reduced motion, orbit freezes at its initial phase.
 */
export function createMoonGroup(config: MoonConfig, parentRadius = 50): MoonInstance {
  const pivot = new THREE.Group();
  pivot.rotation.y = config.phase;

  const moonRadius = Math.max(3, parentRadius * config.relativeRadius);
  const geometry = new THREE.SphereGeometry(moonRadius, 24, 18);

  const material = new THREE.MeshStandardMaterial({
    color: config.archetype === "ice" ? 0xbae6fd : 0x78716c,
    roughness: config.archetype === "ice" ? 0.35 : 0.88,
    metalness: 0.05,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(config.distance, 0, 0);
  pivot.add(mesh);

  const speed = config.orbitalSpeed ?? 0.15;

  return {
    pivot,
    mesh,
    config,
    update(deltaSec: number) {
      pivot.rotation.y += deltaSec * speed;
      mesh.rotation.y += deltaSec * speed * 2;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
