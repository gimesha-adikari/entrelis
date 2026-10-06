import * as THREE from "three";
import type { CelestialIdentity, GeometryLOD } from "../identity";
import {
  createGoldenStarTextures,
  createBlueStarTextures,
  createEmberStarTextures,
  createVolcanicRockyTextures,
  createMineralDesertTextures,
  createLifeWorldTextures,
  createBlueAtmosphericTexture,
  createStormGiantTexture,
  createMetallicWorldTextures,
  createCrystalWorldTextures,
  createAsteroidTextures,
} from "../procedural/textures";
import { createAtmosphereMaterial } from "../shaders/atmosphere";
import { createStarSurfaceMaterial } from "../shaders/star";
import { createRingMesh } from "../attachments/rings";
import { createMoonGroup, type MoonInstance } from "../attachments/moons";
import { createDebrisGroup, type DebrisInstance } from "../attachments/debris";
import { deformAsteroidGeometry } from "./asteroid";

export interface CelestialBodyInstance {
  readonly group: THREE.Group;
  readonly primaryMesh: THREE.Mesh;
  readonly identity: CelestialIdentity;
  readonly baseRotationSpeed: number; // rad/s
  readonly tiltZ: number; // radians

  readonly cloudShell?: THREE.Mesh;
  readonly cloudRotationSpeed?: number;

  readonly atmosphereShell?: THREE.Mesh;
  readonly atmosphereMaterial?: THREE.ShaderMaterial;
  readonly atmosphereRotationSpeed?: number;

  readonly starCoronaSprite?: THREE.Sprite;
  readonly starShaderMaterial?: THREE.ShaderMaterial;

  readonly ringMesh?: THREE.Mesh;
  readonly moonInstances: readonly MoonInstance[];
  readonly debrisInstances: readonly DebrisInstance[];

  setHover(isHovered: boolean): void;
  update(deltaSec: number, elapsedTime: number): void;
  dispose(): void;
}

/**
 * Factory function that constructs a complete Three.js celestial body hierarchy
 * from a CelestialIdentity and GeometryLOD level.
 */
export function createCelestialObject(
  identity: CelestialIdentity,
  lod: GeometryLOD = "focus",
  radius = 50
): CelestialBodyInstance {
  const group = new THREE.Group();
  const archetype = identity.archetype;
  const seed = identity.seed;

  const geometriesToDispose: THREE.BufferGeometry[] = [];
  const materialsToDispose: THREE.Material[] = [];
  const moonInstances: MoonInstance[] = [];
  const debrisInstances: DebrisInstance[] = [];

  const sphereSegments =
    lod === "context" ? { w: 16, h: 12 } : lod === "primary" ? { w: 32, h: 24 } : { w: 48, h: 36 };

  let primaryMesh: THREE.Mesh;
  let baseRotationSpeed = 0.05;
  let tiltZ = 0;

  let cloudShell: THREE.Mesh | undefined;
  let cloudRotationSpeed: number | undefined;

  let atmosphereShell: THREE.Mesh | undefined;
  let atmosphereMaterial: THREE.ShaderMaterial | undefined;
  let atmosphereRotationSpeed: number | undefined;

  let starCoronaSprite: THREE.Sprite | undefined;
  let starShaderMaterial: THREE.ShaderMaterial | undefined;
  let coronaBaseSize = radius * 2.45;
  let coronaPeriodX = 14.0;
  let coronaPeriodY = 11.5;
  let coronaVarAmp = 0.025;
  let coronaHoverScale = 1.0;

  let ringMesh: THREE.Mesh | undefined;

  // 1. STARS
  if (archetype === "golden-star" || archetype === "blue-star" || archetype === "ember-star") {
    const geo = new THREE.SphereGeometry(radius, sphereSegments.w, sphereSegments.h);
    geometriesToDispose.push(geo);

    let starTex;
    let shaderParams;
    let coronaScale = 2.45;

    if (archetype === "golden-star") {
      starTex = createGoldenStarTextures(seed, lod);
      shaderParams = {
        surfaceTexture: starTex.surface,
        coreColor: 0xffffff,
        midColor: 0xfef08a,
        limbColor: 0xb45309,
        limbDarkening: 0.32,
        intensity: 1.15,
        rimStrength: 0.0,
      };
      baseRotationSpeed = (2 * Math.PI) / 86; // 86s / rev (70-100s range)
      coronaScale = 2.85;
      coronaPeriodX = 14.0;
      coronaPeriodY = 11.5;
      coronaVarAmp = 0.025;
    } else if (archetype === "blue-star") {
      starTex = createBlueStarTextures(seed, lod);
      shaderParams = {
        surfaceTexture: starTex.surface,
        coreColor: 0xffffff,
        midColor: 0xf0fdf4,
        limbColor: 0x38bdf8,
        limbDarkening: 0.1,
        intensity: 1.12,
        rimColor: 0xe0f2fe,
        rimStrength: 0.05,
      };
      baseRotationSpeed = (2 * Math.PI) / 68; // 68s / rev (55-85s range)
      coronaScale = 2.45; // Compact, tight corona
      coronaPeriodX = 11.0;
      coronaPeriodY = 9.0;
      coronaVarAmp = 0.018;
    } else {
      // ember-star (Ownership)
      starTex = createEmberStarTextures(seed, lod);
      shaderParams = {
        surfaceTexture: starTex.surface,
        coreColor: 0xffedd5,
        midColor: 0xf97316,
        limbColor: 0x450a0a,
        limbDarkening: 0.42,
        intensity: 1.22,
        rimStrength: 0.0,
      };
      baseRotationSpeed = (2 * Math.PI) / 122; // 122s / rev (90-140s range)
      coronaScale = 3.6; // Broad, diffuse, irregular envelope
      coronaPeriodX = 17.0;
      coronaPeriodY = 13.5;
      coronaVarAmp = 0.03;
    }

    coronaBaseSize = radius * coronaScale;

    starShaderMaterial = createStarSurfaceMaterial(shaderParams);
    materialsToDispose.push(starShaderMaterial);

    primaryMesh = new THREE.Mesh(geo, starShaderMaterial);
    group.add(primaryMesh);

    // Corona Billboard Sprite
    const coronaMat = new THREE.SpriteMaterial({
      map: starTex.corona,
      color: 0xffffff,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    materialsToDispose.push(coronaMat);

    starCoronaSprite = new THREE.Sprite(coronaMat);
    const spriteSize = coronaBaseSize;
    starCoronaSprite.scale.set(spriteSize, spriteSize, 1);
    group.add(starCoronaSprite);
  }
  // 2. ROCKY WORLDS
  else if (archetype === "volcanic-rocky" || archetype === "mineral-rocky") {
    const geo = new THREE.SphereGeometry(radius, sphereSegments.w, sphereSegments.h);
    geometriesToDispose.push(geo);

    if (archetype === "volcanic-rocky") {
      const tex = createVolcanicRockyTextures(seed, lod);
      const mat = new THREE.MeshStandardMaterial({
        map: tex.diffuse,
        bumpMap: tex.bump,
        bumpScale: 1.8,
        roughnessMap: tex.roughness,
        emissiveMap: tex.emissive,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0.85,
        metalness: 0.1,
      });
      materialsToDispose.push(mat);
      primaryMesh = new THREE.Mesh(geo, mat);
      tiltZ = 0.26; // 15°
      baseRotationSpeed = (2 * Math.PI) / 60;
    } else {
      // mineral-rocky
      const tex = createMineralDesertTextures(seed, lod);
      const mat = new THREE.MeshStandardMaterial({
        map: tex.diffuse,
        bumpMap: tex.bump,
        bumpScale: 1.3,
        roughnessMap: tex.roughness,
        metalness: 0.05,
      });
      materialsToDispose.push(mat);
      primaryMesh = new THREE.Mesh(geo, mat);
      tiltZ = 0.31; // 18°
      baseRotationSpeed = (2 * Math.PI) / 55;
    }

    primaryMesh.rotation.z = tiltZ;
    group.add(primaryMesh);
  }
  // 3. BIOLOGICAL: LIFE WORLD
  else if (archetype === "life-world") {
    const geo = new THREE.SphereGeometry(radius, sphereSegments.w, sphereSegments.h);
    geometriesToDispose.push(geo);

    const tex = createLifeWorldTextures(seed, lod);
    const mat = new THREE.MeshStandardMaterial({
      map: tex.surface,
      roughnessMap: tex.roughness,
      metalness: 0.05,
    });
    materialsToDispose.push(mat);
    primaryMesh = new THREE.Mesh(geo, mat);
    tiltZ = 0.41; // 23.5°
    baseRotationSpeed = (2 * Math.PI) / 50;
    primaryMesh.rotation.z = tiltZ;
    group.add(primaryMesh);

    // Cloud Shell
    const cloudGeo = new THREE.SphereGeometry(radius * 1.012, sphereSegments.w, sphereSegments.h);
    geometriesToDispose.push(cloudGeo);
    const cloudMat = new THREE.MeshStandardMaterial({
      map: tex.clouds,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    materialsToDispose.push(cloudMat);
    cloudShell = new THREE.Mesh(cloudGeo, cloudMat);
    cloudShell.rotation.z = tiltZ;
    cloudRotationSpeed = (2 * Math.PI) / 42; // slightly faster than surface
    group.add(cloudShell);

    // Atmosphere Shell
    const atmGeo = new THREE.SphereGeometry(radius * 1.028, sphereSegments.w, sphereSegments.h);
    geometriesToDispose.push(atmGeo);
    atmosphereMaterial = createAtmosphereMaterial({
      color: 0x38bdf8,
      fresnelPower: 3.2,
      intensity: 1.15,
    });
    materialsToDispose.push(atmosphereMaterial);
    atmosphereShell = new THREE.Mesh(atmGeo, atmosphereMaterial);
    group.add(atmosphereShell);
  }
  // 4. ATMOSPHERIC / GAS WORLDS
  else if (archetype === "blue-atmospheric" || archetype === "storm-giant") {
    const geo = new THREE.SphereGeometry(radius, sphereSegments.w, sphereSegments.h);
    geometriesToDispose.push(geo);

    if (archetype === "blue-atmospheric") {
      const tex = createBlueAtmosphericTexture(seed, lod);
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.85,
        metalness: 0.05,
      });
      materialsToDispose.push(mat);
      primaryMesh = new THREE.Mesh(geo, mat);
      tiltZ = 0.14; // 8°
      baseRotationSpeed = (2 * Math.PI) / 48;

      // Atmosphere Shell
      const atmGeo = new THREE.SphereGeometry(radius * 1.025, sphereSegments.w, sphereSegments.h);
      geometriesToDispose.push(atmGeo);
      atmosphereMaterial = createAtmosphereMaterial({
        color: 0x60a5fa,
        fresnelPower: 2.7,
        intensity: 0.85,
      });
      materialsToDispose.push(atmosphereMaterial);
      atmosphereShell = new THREE.Mesh(atmGeo, atmosphereMaterial);
      atmosphereRotationSpeed = (2 * Math.PI) / 42;
    } else {
      // storm-giant
      const tex = createStormGiantTexture(seed, lod);
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.8,
        metalness: 0.05,
      });
      materialsToDispose.push(mat);
      primaryMesh = new THREE.Mesh(geo, mat);
      tiltZ = 0.21; // 12°
      baseRotationSpeed = (2 * Math.PI) / 40;

      // Warm peach/gold Atmosphere Shell
      const atmGeo = new THREE.SphereGeometry(radius * 1.026, sphereSegments.w, sphereSegments.h);
      geometriesToDispose.push(atmGeo);
      atmosphereMaterial = createAtmosphereMaterial({
        color: 0xfde047,
        fresnelPower: 2.8,
        intensity: 0.7,
      });
      materialsToDispose.push(atmosphereMaterial);
      atmosphereShell = new THREE.Mesh(atmGeo, atmosphereMaterial);
      atmosphereRotationSpeed = (2 * Math.PI) / 35;
    }

    primaryMesh.rotation.z = tiltZ;
    group.add(primaryMesh);
    if (atmosphereShell) {
      group.add(atmosphereShell);
    }
  }
  // 5. STRUCTURAL: METALLIC & CRYSTAL
  else if (archetype === "metallic-world" || archetype === "crystal-world") {
    const geo = new THREE.SphereGeometry(radius, sphereSegments.w, sphereSegments.h);
    geometriesToDispose.push(geo);

    if (archetype === "metallic-world") {
      const tex = createMetallicWorldTextures(seed, lod);
      const mat = new THREE.MeshStandardMaterial({
        map: tex.diffuse,
        metalnessMap: tex.metalness,
        roughnessMap: tex.roughness,
        bumpMap: tex.bump,
        bumpScale: 1.1,
        metalness: 0.68,
        emissiveMap: tex.emissive,
        emissive: 0x22d3ee,
        emissiveIntensity: 1.25,
      });
      materialsToDispose.push(mat);
      primaryMesh = new THREE.Mesh(geo, mat);
      tiltZ = 0.1; // 6°
      baseRotationSpeed = (2 * Math.PI) / 75;
    } else {
      // crystal-world
      const tex = createCrystalWorldTextures(seed, lod);
      const mat = new THREE.MeshStandardMaterial({
        map: tex.diffuse,
        roughnessMap: tex.roughness,
        bumpMap: tex.bump,
        bumpScale: 1.2,
        metalness: 0.08,
      });
      materialsToDispose.push(mat);
      primaryMesh = new THREE.Mesh(geo, mat);
      tiltZ = 0.38; // 22°
      baseRotationSpeed = (2 * Math.PI) / 72;

      // Frosty Haze Atmosphere Shell
      const atmGeo = new THREE.SphereGeometry(radius * 1.018, sphereSegments.w, sphereSegments.h);
      geometriesToDispose.push(atmGeo);
      atmosphereMaterial = createAtmosphereMaterial({
        color: 0x7dd3fc,
        fresnelPower: 3.4,
        intensity: 0.8,
      });
      materialsToDispose.push(atmosphereMaterial);
      atmosphereShell = new THREE.Mesh(atmGeo, atmosphereMaterial);
      atmosphereRotationSpeed = (2 * Math.PI) / 65;
    }

    primaryMesh.rotation.z = tiltZ;
    group.add(primaryMesh);
    if (atmosphereShell) {
      group.add(atmosphereShell);
    }
  }
  // 6. SMALL BODIES: ASTEROIDS
  else {
    // archetype === "asteroid"
    const variant = identity.asteroidVariant ?? "carbon";
    const geo = deformAsteroidGeometry(radius, seed, lod === "context" ? 1 : 2);
    geometriesToDispose.push(geo);

    const tex = createAsteroidTextures(seed, lod, variant);
    const mat = new THREE.MeshStandardMaterial({
      map: tex.diffuse,
      roughnessMap: tex.roughness,
      bumpMap: tex.bump,
      bumpScale: 1.6,
      metalness: 0.05,
    });
    materialsToDispose.push(mat);
    primaryMesh = new THREE.Mesh(geo, mat);
    tiltZ = 0.45;
    baseRotationSpeed = (2 * Math.PI) / 80;
    primaryMesh.rotation.z = tiltZ;
    group.add(primaryMesh);
  }

  // ATTACHMENT: RINGS
  if (identity.rings) {
    ringMesh = createRingMesh(identity.rings, lod);
    geometriesToDispose.push(ringMesh.geometry);
    materialsToDispose.push(ringMesh.material as THREE.Material);
    group.add(ringMesh);
  }

  // ATTACHMENT: MOONS
  if (identity.moons && identity.moons.length > 0) {
    for (const mConf of identity.moons) {
      const moonInst = createMoonGroup(mConf, radius);
      moonInstances.push(moonInst);
      group.add(moonInst.pivot);
    }
  }

  // ATTACHMENT: DEBRIS
  if (identity.debris) {
    const debInst = createDebrisGroup(identity.debris, radius);
    debrisInstances.push(debInst);
    group.add(debInst.group);
  }

  return {
    group,
    primaryMesh,
    identity,
    baseRotationSpeed,
    tiltZ,
    cloudShell,
    cloudRotationSpeed,
    atmosphereShell,
    atmosphereMaterial,
    atmosphereRotationSpeed,
    starCoronaSprite,
    starShaderMaterial,
    ringMesh,
    moonInstances,
    debrisInstances,

    setHover(isHovered: boolean) {
      if (starShaderMaterial) {
        const targetHover = isHovered ? 1.0 : 0.0;
        const currentHover = (starShaderMaterial.uniforms["uHover"]?.value as number) ?? 0.0;
        starShaderMaterial.uniforms["uHover"]!.value =
          currentHover + (targetHover - currentHover) * 0.2;
        const targetCoronaHover = isHovered ? 1.035 : 1.0;
        coronaHoverScale = coronaHoverScale + (targetCoronaHover - coronaHoverScale) * 0.2;
      } else {
        const mat = primaryMesh.material as THREE.MeshStandardMaterial;
        if (mat && typeof mat.emissiveIntensity === "number") {
          const targetEmissive = isHovered
            ? identity.archetype === "volcanic-rocky"
              ? 1.2
              : 0.08
            : identity.archetype === "volcanic-rocky"
              ? 0.85
              : 0.0;
          mat.emissiveIntensity += (targetEmissive - mat.emissiveIntensity) * 0.15;
        }
      }

      if (atmosphereMaterial) {
        const targetIntensity = isHovered ? 0.95 : 0.8;
        const current = (atmosphereMaterial.uniforms["uIntensity"]?.value as number) ?? 0.8;
        atmosphereMaterial.uniforms["uIntensity"]!.value =
          current + (targetIntensity - current) * 0.15;
      }
    },

    update(deltaSec: number, elapsedTime: number) {
      // Primary mesh rotation
      primaryMesh.rotation.y += deltaSec * baseRotationSpeed;

      // Cloud rotation
      if (cloudShell && cloudRotationSpeed) {
        cloudShell.rotation.y += deltaSec * cloudRotationSpeed;
      }

      // Atmosphere differential rotation
      if (atmosphereShell && atmosphereRotationSpeed) {
        atmosphereShell.rotation.y += deltaSec * atmosphereRotationSpeed;
      }

      // Star corona subtle asynchronous atmospheric variation (Rule 13: 2-4% over 10-18s)
      if (starCoronaSprite) {
        const sx = 1.0 + coronaVarAmp * Math.sin((elapsedTime / coronaPeriodX) * Math.PI * 2);
        const sy = 1.0 + coronaVarAmp * Math.cos((elapsedTime / coronaPeriodY) * Math.PI * 2);
        starCoronaSprite.scale.set(
          coronaBaseSize * sx * coronaHoverScale,
          coronaBaseSize * sy * coronaHoverScale,
          1
        );
      }

      // Moon orbits
      for (const moon of moonInstances) {
        moon.update(deltaSec);
      }

      // Debris cluster orbits
      for (const debris of debrisInstances) {
        debris.update(deltaSec);
      }
    },

    dispose() {
      for (const m of moonInstances) m.dispose();
      for (const d of debrisInstances) d.dispose();
      for (const g of geometriesToDispose) g.dispose();
      for (const m of materialsToDispose) m.dispose();
      group.clear();
    },
  };
}
