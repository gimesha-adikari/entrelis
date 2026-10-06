import * as THREE from "three";
import {
  createNoise3D,
  fbm3D,
  ridgedFbm3D,
  createCellular3D,
  createCellularManhattan3D,
  domainWarp3D,
} from "./noise3d";
import type { GeometryLOD, RingConfig } from "../identity";

/**
 * Global cache for procedural CanvasTextures keyed by archetype + seed + lod + type.
 */
const textureCache = new Map<string, THREE.CanvasTexture>();

export function disposeAllCelestialTextures(): void {
  for (const texture of textureCache.values()) {
    texture.dispose();
  }
  textureCache.clear();
}

export function getCachedTexture(key: string): THREE.CanvasTexture | undefined {
  return textureCache.get(key);
}

function getResolution(lod: GeometryLOD = "focus"): { width: number; height: number } {
  if (lod === "context") {
    return { width: 64, height: 32 };
  }
  if (lod === "primary") {
    return { width: 256, height: 128 };
  }
  return { width: 512, height: 256 };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

/**
 * -------------------------------------------------------------
 * 1. STARS: Golden, Blue-White, and Ember
 * -------------------------------------------------------------
 */

export interface StarTextures {
  readonly surface: THREE.CanvasTexture;
  readonly corona: THREE.CanvasTexture;
}

export function createGoldenStarTextures(seed: number, lod: GeometryLOD = "focus"): StarTextures {
  const surfaceKey = `star:golden:surface:${seed}:${lod}`;
  const coronaKey = `star:golden:corona:${seed}:${lod}`;

  let surface = textureCache.get(surfaceKey);
  let corona = textureCache.get(coronaKey);

  if (!surface) {
    const { width, height } = getResolution(lod);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const img = ctx.createImageData(width, height);
      const data = img.data;
      const cellNoise = createCellular3D(seed);
      const fineNoise = createNoise3D(seed + 93);

      for (let y = 0; y < height; y++) {
        const phi = (y / height) * Math.PI;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        for (let x = 0; x < width; x++) {
          const theta = (x / width) * 2 * Math.PI;
          const px = sinPhi * Math.cos(theta);
          const py = cosPhi;
          const pz = sinPhi * Math.sin(theta);

          // Multi-scale solar granulation:
          // 1. Primary convective cells with defined intergranular lanes
          const cell = cellNoise(px * 14, py * 14, pz * 14);
          const primaryVal = clamp(cell.diff * 1.55, 0, 1);

          // 2. Secondary turbulent fine granulation
          const micro = fbm3D(fineNoise, px * 26, py * 26, pz * 26, 3) * 0.5 + 0.5;

          // 3. Faculae / magnetic bright points concentrated in cell upwelling centers
          const hotCenter = Math.pow(clamp(cell.diff * 1.35, 0, 1), 2.2);

          const idx = (y * width + x) * 4;
          data[idx] = Math.floor(primaryVal * 255);
          data[idx + 1] = Math.floor(micro * 255);
          data[idx + 2] = Math.floor(hotCenter * 255);
          data[idx + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    }
    surface = new THREE.CanvasTexture(canvas);
    surface.wrapS = THREE.RepeatWrapping;
    surface.wrapT = THREE.ClampToEdgeWrapping;
    surface.colorSpace = THREE.SRGBColorSpace;
    textureCache.set(surfaceKey, surface);
  }

  if (!corona) {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const center = size / 2;
      const img = ctx.createImageData(size, size);
      const data = img.data;

      for (let y = 0; y < size; y++) {
        const dy = (y - center) / center;
        for (let x = 0; x < size; x++) {
          const dx = (x - center) / center;
          const r = Math.sqrt(dx * dx + dy * dy);
          if (r >= 1.0) continue;

          const angle = Math.atan2(dy, dx);
          // 5-lobe organic solar flare modulation
          const lobe =
            1.0 + 0.14 * Math.sin(angle * 5 + seed * 0.1) + 0.08 * Math.cos(angle * 3 - seed * 0.2);
          const normR = r / lobe;
          if (normR >= 1.0) continue;

          const falloff = Math.pow(Math.max(0, 1.0 - normR), 2.4);
          const idx = (y * size + x) * 4;
          data[idx] = Math.floor(255 * falloff);
          data[idx + 1] = Math.floor(225 * falloff);
          data[idx + 2] = Math.floor(130 * falloff);
          data[idx + 3] = Math.floor(255 * falloff);
        }
      }
      ctx.putImageData(img, 0, 0);
    }
    corona = new THREE.CanvasTexture(canvas);
    corona.colorSpace = THREE.SRGBColorSpace;
    textureCache.set(coronaKey, corona);
  }

  return { surface, corona };
}

export function createBlueStarTextures(seed: number, lod: GeometryLOD = "focus"): StarTextures {
  const surfaceKey = `star:blue:surface:${seed}:${lod}`;
  const coronaKey = `star:blue:corona:${seed}:${lod}`;

  let surface = textureCache.get(surfaceKey);
  let corona = textureCache.get(coronaKey);

  if (!surface) {
    const { width, height } = getResolution(lod);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const img = ctx.createImageData(width, height);
      const data = img.data;
      const cellNoise = createCellular3D(seed + 99);
      const fineNoise = createNoise3D(seed + 555);

      for (let y = 0; y < height; y++) {
        const phi = (y / height) * Math.PI;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        for (let x = 0; x < width; x++) {
          const theta = (x / width) * 2 * Math.PI;
          const px = sinPhi * Math.cos(theta);
          const py = cosPhi;
          const pz = sinPhi * Math.sin(theta);

          // Ultra-hot O/B-type star: tight high-frequency granulation with intense white upwelling
          const cell = cellNoise(px * 26, py * 26, pz * 26);
          const primaryVal = clamp(Math.pow(cell.diff * 1.6, 1.4), 0, 1);

          // Micro-cellular granulation
          const micro = fbm3D(fineNoise, px * 42, py * 42, pz * 42, 3) * 0.5 + 0.5;

          // Radiant white central core boost
          const hotCenter = Math.pow(clamp(cell.diff * 1.5, 0, 1), 2.8);

          const idx = (y * width + x) * 4;
          data[idx] = Math.floor(primaryVal * 255);
          data[idx + 1] = Math.floor(micro * 255);
          data[idx + 2] = Math.floor(hotCenter * 255);
          data[idx + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    }
    surface = new THREE.CanvasTexture(canvas);
    surface.wrapS = THREE.RepeatWrapping;
    surface.wrapT = THREE.ClampToEdgeWrapping;
    surface.colorSpace = THREE.SRGBColorSpace;
    textureCache.set(surfaceKey, surface);
  }

  if (!corona) {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const center = size / 2;
      const img = ctx.createImageData(size, size);
      const data = img.data;

      for (let y = 0; y < size; y++) {
        const dy = (y - center) / center;
        for (let x = 0; x < size; x++) {
          const dx = (x - center) / center;
          const r = Math.sqrt(dx * dx + dy * dy);
          if (r >= 1.0) continue;

          const angle = Math.atan2(dy, dx);
          // Tighter, energetic 7-ray corona
          const lobe = 1.0 + 0.18 * Math.sin(angle * 7 + seed * 0.2);
          const normR = r / lobe;
          if (normR >= 1.0) continue;

          const falloff = Math.pow(Math.max(0, 1.0 - normR), 3.2);
          const idx = (y * size + x) * 4;
          data[idx] = Math.floor(220 * falloff);
          data[idx + 1] = Math.floor(245 * falloff);
          data[idx + 2] = Math.floor(255 * falloff);
          data[idx + 3] = Math.floor(255 * falloff);
        }
      }
      ctx.putImageData(img, 0, 0);
    }
    corona = new THREE.CanvasTexture(canvas);
    corona.colorSpace = THREE.SRGBColorSpace;
    textureCache.set(coronaKey, corona);
  }

  return { surface, corona };
}

export function createEmberStarTextures(seed: number, lod: GeometryLOD = "focus"): StarTextures {
  const surfaceKey = `star:ember:surface:${seed}:${lod}`;
  const coronaKey = `star:ember:corona:${seed}:${lod}`;

  let surface = textureCache.get(surfaceKey);
  let corona = textureCache.get(coronaKey);

  if (!surface) {
    const { width, height } = getResolution(lod);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const img = ctx.createImageData(width, height);
      const data = img.data;
      const cellNoise = createCellular3D(seed + 55);
      const noise = createNoise3D(seed + 77);
      const hotNoise = createNoise3D(seed + 121);

      for (let y = 0; y < height; y++) {
        const phi = (y / height) * Math.PI;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        for (let x = 0; x < width; x++) {
          const theta = (x / width) * 2 * Math.PI;
          const px = sinPhi * Math.cos(theta);
          const py = cosPhi;
          const pz = sinPhi * Math.sin(theta);

          // Deep convective red giant: massive irregular convection plumes with dark obsidian lanes
          const warp = domainWarp3D(noise, px * 3.5, py * 3.5, pz * 3.5, 0.45);
          const cell = cellNoise(
            (px + warp * 0.15) * 8.5,
            (py + warp * 0.15) * 8.5,
            (pz + warp * 0.15) * 8.5
          );
          const primaryVal = clamp(cell.diff * 1.45, 0, 1);

          // Convective turbulence within plumes
          const plumeTurb = fbm3D(noise, px * 16, py * 16, pz * 16, 3) * 0.5 + 0.5;

          // Molten amber hot spots in cell centers
          const hotCenter =
            Math.pow(clamp(cell.diff * 1.35, 0, 1), 1.8) *
            (fbm3D(hotNoise, px * 5, py * 5, pz * 5, 2) * 0.35 + 0.65);

          const idx = (y * width + x) * 4;
          data[idx] = Math.floor(primaryVal * 255);
          data[idx + 1] = Math.floor(plumeTurb * 255);
          data[idx + 2] = Math.floor(clamp(hotCenter, 0, 1) * 255);
          data[idx + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    }
    surface = new THREE.CanvasTexture(canvas);
    surface.wrapS = THREE.RepeatWrapping;
    surface.wrapT = THREE.ClampToEdgeWrapping;
    surface.colorSpace = THREE.SRGBColorSpace;
    textureCache.set(surfaceKey, surface);
  }

  if (!corona) {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const center = size / 2;
      const img = ctx.createImageData(size, size);
      const data = img.data;

      for (let y = 0; y < size; y++) {
        const dy = (y - center) / center;
        for (let x = 0; x < size; x++) {
          const dx = (x - center) / center;
          const r = Math.sqrt(dx * dx + dy * dy);
          if (r >= 1.0) continue;

          const angle = Math.atan2(dy, dx);
          // Restrained, deep crimson-amber corona
          const lobe = 1.0 + 0.1 * Math.sin(angle * 4 + seed * 0.15);
          const normR = r / lobe;
          if (normR >= 1.0) continue;

          const falloff = Math.pow(Math.max(0, 1.0 - normR), 2.2);
          const idx = (y * size + x) * 4;
          data[idx] = Math.floor(255 * falloff);
          data[idx + 1] = Math.floor(120 * falloff);
          data[idx + 2] = Math.floor(35 * falloff);
          data[idx + 3] = Math.floor(255 * falloff);
        }
      }
      ctx.putImageData(img, 0, 0);
    }
    corona = new THREE.CanvasTexture(canvas);
    corona.colorSpace = THREE.SRGBColorSpace;
    textureCache.set(coronaKey, corona);
  }

  return { surface, corona };
}

/**
 * -------------------------------------------------------------
 * 2. ROCKY WORLDS: Volcanic (Rust) & Mineral Desert
 * -------------------------------------------------------------
 */

export interface RockyTextures {
  readonly diffuse: THREE.CanvasTexture;
  readonly bump: THREE.CanvasTexture;
  readonly roughness: THREE.CanvasTexture;
  readonly emissive?: THREE.CanvasTexture;
}

export function createVolcanicRockyTextures(
  seed: number,
  lod: GeometryLOD = "focus"
): RockyTextures {
  const diffKey = `rocky:volcanic:diff:${seed}:${lod}`;
  const bumpKey = `rocky:volcanic:bump:${seed}:${lod}`;
  const roughKey = `rocky:volcanic:rough:${seed}:${lod}`;
  const emissKey = `rocky:volcanic:emiss:${seed}:${lod}`;

  let diffuse = textureCache.get(diffKey);
  let bump = textureCache.get(bumpKey);
  let roughness = textureCache.get(roughKey);
  let emissive = textureCache.get(emissKey);

  if (!diffuse || !bump || !roughness || !emissive) {
    const { width, height } = getResolution(lod);

    const diffCanvas = document.createElement("canvas");
    diffCanvas.width = width;
    diffCanvas.height = height;
    const diffCtx = diffCanvas.getContext("2d")!;
    const diffImg = diffCtx.createImageData(width, height);

    const bumpCanvas = document.createElement("canvas");
    bumpCanvas.width = width;
    bumpCanvas.height = height;
    const bumpCtx = bumpCanvas.getContext("2d")!;
    const bumpImg = bumpCtx.createImageData(width, height);

    const roughCanvas = document.createElement("canvas");
    roughCanvas.width = width;
    roughCanvas.height = height;
    const roughCtx = roughCanvas.getContext("2d")!;
    const roughImg = roughCtx.createImageData(width, height);

    const emissCanvas = document.createElement("canvas");
    emissCanvas.width = width;
    emissCanvas.height = height;
    const emissCtx = emissCanvas.getContext("2d")!;
    const emissImg = emissCtx.createImageData(width, height);

    const noiseMacro = createNoise3D(seed);
    const noiseMeso = createNoise3D(seed + 101);
    const noiseMicro = createNoise3D(seed + 202);

    for (let y = 0; y < height; y++) {
      const phi = (y / height) * Math.PI;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      for (let x = 0; x < width; x++) {
        const theta = (x / width) * 2 * Math.PI;
        const px = sinPhi * Math.cos(theta);
        const py = cosPhi;
        const pz = sinPhi * Math.sin(theta);

        // Volcanic terrain: dark basalt plateaus + copper ridges + lava fissure veins
        const macro = fbm3D(noiseMacro, px * 1.6, py * 1.6, pz * 1.6, 3);
        const meso = ridgedFbm3D(noiseMeso, px * 5.0, py * 5.0, pz * 5.0, 3);
        const micro = fbm3D(noiseMicro, px * 16.0, py * 16.0, pz * 16.0, 3) * 0.15;

        const elevation = clamp(macro * 0.5 + meso * 0.4 + micro, 0, 1);

        // Diffuse: Basalt (dark charcoal) to Copper/Terra
        let r = lerp(32, 180, elevation);
        let g = lerp(28, 85, elevation);
        let b = lerp(26, 40, elevation);

        // Sparse glowing volcanic fissures in deep tectonic cracks
        let emissiveIntensity = 0;
        if (macro < 0.28 && meso > 0.65) {
          emissiveIntensity = clamp((0.28 - macro) * 4.0 * (meso - 0.65) * 3.0, 0, 1);
          r = lerp(r, 255, emissiveIntensity);
          g = lerp(g, 90, emissiveIntensity);
          b = lerp(b, 20, emissiveIntensity);
        }

        const idx = (y * width + x) * 4;
        diffImg.data[idx] = Math.floor(r);
        diffImg.data[idx + 1] = Math.floor(g);
        diffImg.data[idx + 2] = Math.floor(b);
        diffImg.data[idx + 3] = 255;

        // Bump map
        const bumpVal = Math.floor(elevation * 255);
        bumpImg.data[idx] = bumpVal;
        bumpImg.data[idx + 1] = bumpVal;
        bumpImg.data[idx + 2] = bumpVal;
        bumpImg.data[idx + 3] = 255;

        // Roughness: Basalt is high matte (0.88), copper deposits lower (0.55)
        const roughVal = Math.floor(lerp(225, 140, elevation));
        roughImg.data[idx] = roughVal;
        roughImg.data[idx + 1] = roughVal;
        roughImg.data[idx + 2] = roughVal;
        roughImg.data[idx + 3] = 255;

        // Emissive map
        const emVal = Math.floor(emissiveIntensity * 255);
        emissImg.data[idx] = Math.floor(emVal);
        emissImg.data[idx + 1] = Math.floor(emVal * 0.35);
        emissImg.data[idx + 2] = 0;
        emissImg.data[idx + 3] = 255;
      }
    }

    diffCtx.putImageData(diffImg, 0, 0);
    bumpCtx.putImageData(bumpImg, 0, 0);
    roughCtx.putImageData(roughImg, 0, 0);
    emissCtx.putImageData(emissImg, 0, 0);

    diffuse = new THREE.CanvasTexture(diffCanvas);
    diffuse.wrapS = THREE.RepeatWrapping;
    diffuse.wrapT = THREE.ClampToEdgeWrapping;
    diffuse.colorSpace = THREE.SRGBColorSpace;
    textureCache.set(diffKey, diffuse);

    bump = new THREE.CanvasTexture(bumpCanvas);
    bump.wrapS = THREE.RepeatWrapping;
    bump.wrapT = THREE.ClampToEdgeWrapping;
    bump.colorSpace = THREE.NoColorSpace;
    textureCache.set(bumpKey, bump);

    roughness = new THREE.CanvasTexture(roughCanvas);
    roughness.wrapS = THREE.RepeatWrapping;
    roughness.wrapT = THREE.ClampToEdgeWrapping;
    roughness.colorSpace = THREE.NoColorSpace;
    textureCache.set(roughKey, roughness);

    emissive = new THREE.CanvasTexture(emissCanvas);
    emissive.wrapS = THREE.RepeatWrapping;
    emissive.wrapT = THREE.ClampToEdgeWrapping;
    emissive.colorSpace = THREE.SRGBColorSpace;
    textureCache.set(emissKey, emissive);
  }

  return { diffuse, bump, roughness, emissive };
}

export function createMineralDesertTextures(
  seed: number,
  lod: GeometryLOD = "focus"
): RockyTextures {
  const diffKey = `rocky:desert:diff:${seed}:${lod}`;
  const bumpKey = `rocky:desert:bump:${seed}:${lod}`;
  const roughKey = `rocky:desert:rough:${seed}:${lod}`;

  let diffuse = textureCache.get(diffKey);
  let bump = textureCache.get(bumpKey);
  let roughness = textureCache.get(roughKey);

  if (!diffuse || !bump || !roughness) {
    const { width, height } = getResolution(lod);

    const diffCanvas = document.createElement("canvas");
    diffCanvas.width = width;
    diffCanvas.height = height;
    const diffCtx = diffCanvas.getContext("2d")!;
    const diffImg = diffCtx.createImageData(width, height);

    const bumpCanvas = document.createElement("canvas");
    bumpCanvas.width = width;
    bumpCanvas.height = height;
    const bumpCtx = bumpCanvas.getContext("2d")!;
    const bumpImg = bumpCtx.createImageData(width, height);

    const roughCanvas = document.createElement("canvas");
    roughCanvas.width = width;
    roughCanvas.height = height;
    const roughCtx = roughCanvas.getContext("2d")!;
    const roughImg = roughCtx.createImageData(width, height);

    const strataNoise = createNoise3D(seed + 41);
    const duneNoise = createNoise3D(seed + 83);

    for (let y = 0; y < height; y++) {
      const phi = (y / height) * Math.PI;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      for (let x = 0; x < width; x++) {
        const theta = (x / width) * 2 * Math.PI;
        const px = sinPhi * Math.cos(theta);
        const py = cosPhi;
        const pz = sinPhi * Math.sin(theta);

        // Stratified sediment: horizontal banding modulated by vertical tectonic shifting
        const latShift = fbm3D(strataNoise, px * 2.0, py * 2.0, pz * 2.0, 3) * 0.2;
        const strata = Math.sin((py + latShift) * 18.0) * 0.5 + 0.5;
        const dunes = fbm3D(duneNoise, px * 8.0, py * 8.0, pz * 8.0, 4) * 0.35;
        const elevation = clamp(strata * 0.6 + dunes * 0.4, 0, 1);

        // Sand, ochre, muted copper, dusty terracotta
        const r = lerp(160, 215, elevation);
        const g = lerp(110, 160, elevation);
        const b = lerp(75, 105, elevation);

        const idx = (y * width + x) * 4;
        diffImg.data[idx] = Math.floor(r);
        diffImg.data[idx + 1] = Math.floor(g);
        diffImg.data[idx + 2] = Math.floor(b);
        diffImg.data[idx + 3] = 255;

        // Bump: shallow layered sediment terraces
        const bumpVal = Math.floor(elevation * 230);
        bumpImg.data[idx] = bumpVal;
        bumpImg.data[idx + 1] = bumpVal;
        bumpImg.data[idx + 2] = bumpVal;
        bumpImg.data[idx + 3] = 255;

        // Matte sand/mineral: uniform high roughness (0.85–0.95)
        const roughVal = Math.floor(lerp(215, 242, elevation));
        roughImg.data[idx] = roughVal;
        roughImg.data[idx + 1] = roughVal;
        roughImg.data[idx + 2] = roughVal;
        roughImg.data[idx + 3] = 255;
      }
    }

    diffCtx.putImageData(diffImg, 0, 0);
    bumpCtx.putImageData(bumpImg, 0, 0);
    roughCtx.putImageData(roughImg, 0, 0);

    diffuse = new THREE.CanvasTexture(diffCanvas);
    diffuse.wrapS = THREE.RepeatWrapping;
    diffuse.wrapT = THREE.ClampToEdgeWrapping;
    diffuse.colorSpace = THREE.SRGBColorSpace;
    textureCache.set(diffKey, diffuse);

    bump = new THREE.CanvasTexture(bumpCanvas);
    bump.wrapS = THREE.RepeatWrapping;
    bump.wrapT = THREE.ClampToEdgeWrapping;
    bump.colorSpace = THREE.NoColorSpace;
    textureCache.set(bumpKey, bump);

    roughness = new THREE.CanvasTexture(roughCanvas);
    roughness.wrapS = THREE.RepeatWrapping;
    roughness.wrapT = THREE.ClampToEdgeWrapping;
    roughness.colorSpace = THREE.NoColorSpace;
    textureCache.set(roughKey, roughness);
  }

  return { diffuse, bump, roughness };
}

/**
 * -------------------------------------------------------------
 * 3. BIOLOGICAL: Life World (Surface + Clouds)
 * -------------------------------------------------------------
 */

export interface LifeWorldTextures {
  readonly surface: THREE.CanvasTexture;
  readonly clouds: THREE.CanvasTexture;
  readonly roughness: THREE.CanvasTexture;
}

export function createLifeWorldTextures(
  seed: number,
  lod: GeometryLOD = "focus"
): LifeWorldTextures {
  const surfKey = `life:surface:${seed}:${lod}`;
  const cloudKey = `life:clouds:${seed}:${lod}`;
  const roughKey = `life:rough:${seed}:${lod}`;

  let surface = textureCache.get(surfKey);
  let clouds = textureCache.get(cloudKey);
  let roughness = textureCache.get(roughKey);

  if (!surface || !clouds || !roughness) {
    const { width, height } = getResolution(lod);

    const surfCanvas = document.createElement("canvas");
    surfCanvas.width = width;
    surfCanvas.height = height;
    const surfCtx = surfCanvas.getContext("2d")!;
    const surfImg = surfCtx.createImageData(width, height);

    const roughCanvas = document.createElement("canvas");
    roughCanvas.width = width;
    roughCanvas.height = height;
    const roughCtx = roughCanvas.getContext("2d")!;
    const roughImg = roughCtx.createImageData(width, height);

    const cloudCanvas = document.createElement("canvas");
    cloudCanvas.width = width;
    cloudCanvas.height = height;
    const cloudCtx = cloudCanvas.getContext("2d")!;
    const cloudImg = cloudCtx.createImageData(width, height);

    const continentNoise = createNoise3D(seed);
    const biomeNoise = createNoise3D(seed + 19);
    const cloudNoise = createNoise3D(seed + 99);

    for (let y = 0; y < height; y++) {
      const phi = (y / height) * Math.PI;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      for (let x = 0; x < width; x++) {
        const theta = (x / width) * 2 * Math.PI;
        const px = sinPhi * Math.cos(theta);
        const py = cosPhi;
        const pz = sinPhi * Math.sin(theta);

        // 1. Continental land vs ocean generator:
        // Use lower frequency (1.5x) with domain warping for large recognizable macro continents
        const warp = domainWarp3D(continentNoise, px * 1.2, py * 1.2, pz * 1.2, 0.4);
        const continent = fbm3D(
          continentNoise,
          (px + warp * 0.18) * 1.5,
          (py + warp * 0.18) * 1.5,
          (pz + warp * 0.18) * 1.5,
          4
        );
        const biome = fbm3D(biomeNoise, px * 5.0, py * 5.0, pz * 5.0, 3);

        const isLand = continent > 0.46;
        let r = 0;
        let g = 0;
        let b = 0;
        let rough = 0;

        if (!isLand) {
          // Ocean: Deep sapphire (rgb 16, 52, 108) to shelf cyan (rgb 30, 126, 155)
          const depth = clamp(continent / 0.46, 0, 1);
          r = lerp(16, 30, depth);
          g = lerp(52, 126, depth);
          b = lerp(108, 155, depth);
          rough = 26; // Ultra-glossy specular ocean (roughness ~0.10)
        } else {
          // Landmass: Forest green & teal-green lowlands, fertile olive interior, alpine peaks
          const elevation = clamp((continent - 0.46) / 0.54, 0, 1);
          if (elevation < 0.62) {
            // Lowlands & fertile plateaus: Forest green (42, 124, 76) to fertile olive (92, 138, 74)
            const t = clamp(biome * 0.5 + 0.5, 0, 1);
            r = lerp(42, 92, t);
            g = lerp(124, 138, t);
            b = lerp(76, 74, t);
          } else {
            // Cordilleras & alpine peaks: Muted stone (128, 120, 106) to snow (220, 235, 245)
            const snowT = (elevation - 0.62) / 0.38;
            r = lerp(128, 220, snowT);
            g = lerp(120, 235, snowT);
            b = lerp(106, 245, snowT);
          }
          rough = 215; // Matte terrain (roughness ~0.85)
        }

        const idx = (y * width + x) * 4;
        surfImg.data[idx] = Math.floor(r);
        surfImg.data[idx + 1] = Math.floor(g);
        surfImg.data[idx + 2] = Math.floor(b);
        surfImg.data[idx + 3] = 255;

        roughImg.data[idx] = rough;
        roughImg.data[idx + 1] = rough;
        roughImg.data[idx + 2] = rough;
        roughImg.data[idx + 3] = 255;

        // 2. Separate Cloud Shell: Organized large systems & wisps with clear sky gaps
        const cloudMacro = fbm3D(cloudNoise, px * 2.2, py * 2.2, pz * 2.2, 3);
        const cloudWarp = domainWarp3D(cloudNoise, px * 4.2, py * 4.2, pz * 4.2, 0.55);
        const cloudVal = cloudMacro * 0.6 + cloudWarp * 0.4;
        // Strict threshold so 55%+ of surface remains exposed through clear gaps
        const cloudAlpha = clamp(smoothstep(0.48, 0.78, cloudVal) * 0.92, 0, 1);

        cloudImg.data[idx] = 252;
        cloudImg.data[idx + 1] = 254;
        cloudImg.data[idx + 2] = 255;
        cloudImg.data[idx + 3] = Math.floor(cloudAlpha * 255);
      }
    }

    surfCtx.putImageData(surfImg, 0, 0);
    roughCtx.putImageData(roughImg, 0, 0);
    cloudCtx.putImageData(cloudImg, 0, 0);

    surface = new THREE.CanvasTexture(surfCanvas);
    surface.wrapS = THREE.RepeatWrapping;
    surface.wrapT = THREE.ClampToEdgeWrapping;
    surface.colorSpace = THREE.SRGBColorSpace;
    textureCache.set(surfKey, surface);

    roughness = new THREE.CanvasTexture(roughCanvas);
    roughness.wrapS = THREE.RepeatWrapping;
    roughness.wrapT = THREE.ClampToEdgeWrapping;
    roughness.colorSpace = THREE.NoColorSpace;
    textureCache.set(roughKey, roughness);

    clouds = new THREE.CanvasTexture(cloudCanvas);
    clouds.wrapS = THREE.RepeatWrapping;
    clouds.wrapT = THREE.ClampToEdgeWrapping;
    clouds.colorSpace = THREE.SRGBColorSpace;
    textureCache.set(cloudKey, clouds);
  }

  return { surface, clouds, roughness };
}

function smoothstep(min: number, max: number, value: number): number {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}

/**
 * -------------------------------------------------------------
 * 4. ATMOSPHERIC / GAS WORLDS: Blue Atmospheric & Storm Giant
 * -------------------------------------------------------------
 */

export function createBlueAtmosphericTexture(
  seed: number,
  lod: GeometryLOD = "focus"
): THREE.CanvasTexture {
  const key = `gas:blue:${seed}:${lod}`;
  let texture = textureCache.get(key);
  if (texture) return texture;

  const { width, height } = getResolution(lod);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    const img = ctx.createImageData(width, height);
    const data = img.data;
    const warpNoise = createNoise3D(seed);
    const turbNoise = createNoise3D(seed + 101);
    const vortexNoise = createNoise3D(seed + 202);

    for (let y = 0; y < height; y++) {
      const phi = (y / height) * Math.PI;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      for (let x = 0; x < width; x++) {
        const theta = (x / width) * 2 * Math.PI;
        const px = sinPhi * Math.cos(theta);
        const py = cosPhi;
        const pz = sinPhi * Math.sin(theta);

        // Unequal band widths & local longitudinal distortion:
        // 1. Large-scale 3D domain warping to break horizontal uniformity
        const warp = domainWarp3D(warpNoise, px * 2.2, py * 2.2, pz * 2.2, 0.65);
        const latDistorted = py + warp * 0.22;

        // 2. Non-linear, multi-scale harmonic belts with unequal widths
        const belt1 = Math.sin(latDistorted * 15.0 + 0.4);
        const belt2 = Math.sin(latDistorted * 32.0 - 1.2) * 0.45;
        const belt3 = Math.sin(latDistorted * 7.5 + 2.1) * 0.65;
        const baseBelts = (belt1 + belt2 + belt3) * 0.35 + 0.5;

        // 3. Local turbulent shear & vortex eddies
        const shear = fbm3D(turbNoise, px * 5.0 + py * 1.5, py * 5.0, pz * 5.0, 4) * 0.35;
        const vortex = ridgedFbm3D(vortexNoise, px * 3.2, py * 3.2, pz * 3.2, 3) * 0.25;

        const val = clamp(baseBelts + shear + vortex, 0, 1);

        // Palette:
        // Deep abyssal navy (14, 24, 75)
        // Mid azure/cobalt (24, 85, 175)
        // Vivid cyan jet-streams (45, 195, 235)
        // Radiant pale turquoise/white cirrus (185, 242, 255)
        // Plus subtle violet shear lanes (80, 50, 140)
        let r: number, g: number, b: number;
        if (val < 0.3) {
          const t = val / 0.3;
          r = lerp(14, 24, t);
          g = lerp(24, 85, t);
          b = lerp(75, 175, t);
        } else if (val < 0.72) {
          const t = (val - 0.3) / 0.42;
          r = lerp(24, 45, t);
          g = lerp(85, 195, t);
          b = lerp(175, 235, t);
        } else {
          const t = (val - 0.72) / 0.28;
          r = lerp(45, 195, t);
          g = lerp(195, 245, t);
          b = lerp(235, 255, t);
        }

        // Violet shear tint where turbulence is concentrated
        if (Math.abs(shear) > 0.22) {
          const violetFactor = clamp((Math.abs(shear) - 0.22) * 2.5, 0, 0.4);
          r = lerp(r, 95, violetFactor);
          g = lerp(g, 55, violetFactor);
          b = lerp(b, 150, violetFactor);
        }

        const idx = (y * width + x) * 4;
        data[idx] = Math.floor(r);
        data[idx + 1] = Math.floor(g);
        data[idx + 2] = Math.floor(b);
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(key, texture);
  return texture;
}

export function createStormGiantTexture(
  seed: number,
  lod: GeometryLOD = "focus"
): THREE.CanvasTexture {
  const key = `gas:storm:${seed}:${lod}`;
  let texture = textureCache.get(key);
  if (texture) return texture;

  const { width, height } = getResolution(lod);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    const img = ctx.createImageData(width, height);
    const data = img.data;
    const bandNoise = createNoise3D(seed);
    const vortexNoise = createNoise3D(seed + 88);
    const stormNoise = createNoise3D(seed + 144);

    // Great Storm Oval coordinates: Southern tropical belt
    const stormTheta = 1.65; // ~94° longitude
    const stormPy = -0.28; // Southern hemisphere latitude

    // Secondary smaller storm eddy: Northern temperate belt
    const secTheta = 4.2;
    const secPy = 0.38;

    for (let y = 0; y < height; y++) {
      const phi = (y / height) * Math.PI;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      for (let x = 0; x < width; x++) {
        const theta = (x / width) * 2 * Math.PI;
        const px = sinPhi * Math.cos(theta);
        const py = cosPhi;
        const pz = sinPhi * Math.sin(theta);

        // 1. Great Storm Oval distance & streamline deflection
        let dTheta = theta - stormTheta;
        if (dTheta > Math.PI) dTheta -= 2 * Math.PI;
        if (dTheta < -Math.PI) dTheta -= 2 * Math.PI;

        const stormDx = dTheta * 1.8;
        const stormDy = (py - stormPy) * 3.2;
        const stormDist = Math.sqrt(stormDx * stormDx + stormDy * stormDy);

        // Streamlines deform visibly around the storm boundary
        const deflection =
          (1.0 - smoothstep(0.0, 1.35, stormDist)) * 0.18 * (py >= stormPy ? 1.0 : -1.0);
        const deformedPy = py + deflection;

        // 2. Secondary storm eddy distance
        let dSecTheta = theta - secTheta;
        if (dSecTheta > Math.PI) dSecTheta -= 2 * Math.PI;
        if (dSecTheta < -Math.PI) dSecTheta += 2 * Math.PI;
        const secDist = Math.sqrt(dSecTheta * dSecTheta * 2.2 + (py - secPy) * (py - secPy) * 4.0);

        // 3. Multi-harmonic non-parallel belts across deformed coordinates
        const belt1 = Math.sin(deformedPy * 18.0 + 0.3);
        const belt2 = Math.sin(deformedPy * 36.0 - 0.8) * 0.5;
        const belt3 = Math.sin(deformedPy * 9.0 + 1.6) * 0.6;
        const baseBelts = (belt1 + belt2 + belt3) * 0.35 + 0.5;

        // 4. Shear turbulence & boundary interactions
        const shear = fbm3D(bandNoise, px * 5.2, deformedPy * 5.2, pz * 5.2, 4) * 0.35;
        const vortex = ridgedFbm3D(vortexNoise, px * 3.0, py * 3.0, pz * 3.0, 3) * 0.2;

        const val = clamp(baseBelts + shear + vortex, 0, 1);

        // 5. Palette: Warm tawny, mocha, peach, cream, amber
        let r = lerp(228, 95, val);
        let g = lerp(178, 62, val);
        let b = lerp(130, 48, val);

        // Ammonia cloud deck highlights
        if (val > 0.72) {
          const t = (val - 0.72) / 0.28;
          r = lerp(r, 248, t);
          g = lerp(g, 230, t);
          b = lerp(b, 205, t);
        }

        // 6. Great Storm Oval internal cyclonic spiraling core
        if (stormDist < 0.95) {
          const stormMask = 1.0 - smoothstep(0.15, 0.95, stormDist);
          const stormAngle = Math.atan2(stormDy, stormDx);
          const spiral = Math.sin(
            stormDist * 16.0 - stormAngle * 2.5 + fbm3D(stormNoise, px * 8, py * 8, pz * 8, 2) * 1.5
          );
          const coreT = clamp(spiral * 0.5 + 0.5, 0, 1);

          // Rich terracotta-brick amber storm eye (rgb 215, 85, 52) to peach margin (rgb 238, 148, 98)
          const stormR = lerp(215, 242, coreT);
          const stormG = lerp(85, 155, coreT);
          const stormB = lerp(52, 105, coreT);

          r = lerp(r, stormR, stormMask);
          g = lerp(g, stormG, stormMask);
          b = lerp(b, stormB, stormMask);
        }

        // 7. Secondary eddy core
        if (secDist < 0.6) {
          const secMask = 1.0 - smoothstep(0.1, 0.6, secDist);
          r = lerp(r, 245, secMask * 0.85);
          g = lerp(g, 210, secMask * 0.85);
          b = lerp(b, 175, secMask * 0.85);
        }

        const idx = (y * width + x) * 4;
        data[idx] = Math.floor(r);
        data[idx + 1] = Math.floor(g);
        data[idx + 2] = Math.floor(b);
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(key, texture);
  return texture;
}

/**
 * -------------------------------------------------------------
 * 5. STRUCTURAL: Metallic Artificial (CPUs) & Crystal Ice
 * -------------------------------------------------------------
 */

export interface MetallicTextures {
  readonly diffuse: THREE.CanvasTexture;
  readonly roughness: THREE.CanvasTexture;
  readonly metalness: THREE.CanvasTexture;
  readonly bump: THREE.CanvasTexture;
  readonly emissive?: THREE.CanvasTexture;
}

export function createMetallicWorldTextures(
  seed: number,
  lod: GeometryLOD = "focus"
): MetallicTextures {
  const diffKey = `metallic:diff:${seed}:${lod}`;
  const roughKey = `metallic:rough:${seed}:${lod}`;
  const metalKey = `metallic:metal:${seed}:${lod}`;
  const bumpKey = `metallic:bump:${seed}:${lod}`;
  const emissKey = `metallic:emiss:${seed}:${lod}`;

  let diffuse = textureCache.get(diffKey);
  let roughness = textureCache.get(roughKey);
  let metalness = textureCache.get(metalKey);
  let bump = textureCache.get(bumpKey);
  let emissive = textureCache.get(emissKey);

  if (!diffuse || !roughness || !metalness || !bump || !emissive) {
    const { width, height } = getResolution(lod);

    const diffCanvas = document.createElement("canvas");
    diffCanvas.width = width;
    diffCanvas.height = height;
    const diffCtx = diffCanvas.getContext("2d")!;
    const diffImg = diffCtx.createImageData(width, height);

    const roughCanvas = document.createElement("canvas");
    roughCanvas.width = width;
    roughCanvas.height = height;
    const roughCtx = roughCanvas.getContext("2d")!;
    const roughImg = roughCtx.createImageData(width, height);

    const metalCanvas = document.createElement("canvas");
    metalCanvas.width = width;
    metalCanvas.height = height;
    const metalCtx = metalCanvas.getContext("2d")!;
    const metalImg = metalCtx.createImageData(width, height);

    const bumpCanvas = document.createElement("canvas");
    bumpCanvas.width = width;
    bumpCanvas.height = height;
    const bumpCtx = bumpCanvas.getContext("2d")!;
    const bumpImg = bumpCtx.createImageData(width, height);

    const emissCanvas = document.createElement("canvas");
    emissCanvas.width = width;
    emissCanvas.height = height;
    const emissCtx = emissCanvas.getContext("2d")!;
    const emissImg = emissCtx.createImageData(width, height);

    const manhattanCell = createCellularManhattan3D(seed);
    const macroPanelNoise = createNoise3D(seed + 41);
    const traceGateNoise = createNoise3D(seed + 89);

    for (let y = 0; y < height; y++) {
      const phi = (y / height) * Math.PI;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      for (let x = 0; x < width; x++) {
        const theta = (x / width) * 2 * Math.PI;
        const px = sinPhi * Math.cos(theta);
        const py = cosPhi;
        const pz = sinPhi * Math.sin(theta);

        // Macro wafer & chassis partitioning: lower frequency 5.5 scale for clear macro blocks
        const grid = manhattanCell(px * 5.5, py * 5.5, pz * 5.5);
        const macroPanel = fbm3D(macroPanelNoise, px * 2.0, py * 2.0, pz * 2.0, 2);

        // Edge detection between die wafer blocks
        const isBorder = grid.diff < 0.12;

        // Base metallic albedo:
        // Polished steel / titanium plates: rgb(130, 150, 172) to rgb(185, 202, 218)
        // Graphite chassis frames: rgb(52, 64, 78) to rgb(75, 88, 102)
        let r: number;
        let g: number;
        let b: number;
        let metalVal: number;
        let roughVal: number;

        if (isBorder) {
          // Recessed graphite seam / structural channel
          r = lerp(48, 68, grid.diff / 0.12);
          g = lerp(58, 80, grid.diff / 0.12);
          b = lerp(70, 95, grid.diff / 0.12);
          metalVal = 145; // lower metalness in matte seam
          roughVal = 180; // higher roughness in seam
        } else {
          // Polished wafer plate face
          const plateTier = clamp(macroPanel * 0.5 + 0.5, 0, 1);
          r = lerp(128, 185, plateTier);
          g = lerp(148, 202, plateTier);
          b = lerp(172, 220, plateTier);
          metalVal = 220; // high specular metallic
          roughVal = 65; // mirror wafer polish (~0.25)
        }

        // Clean, sparse cyan circuit conduits along selected seams
        const traceGate = fbm3D(traceGateNoise, px * 3.5, py * 3.5, pz * 3.5, 2);
        const isCyanBus = isBorder && traceGate > 0.32;

        if (isCyanBus) {
          r = 34;
          g = 211;
          b = 238; // Clean cyan #22d3ee
          roughVal = 40;
        }

        const idx = (y * width + x) * 4;
        diffImg.data[idx] = Math.floor(r);
        diffImg.data[idx + 1] = Math.floor(g);
        diffImg.data[idx + 2] = Math.floor(b);
        diffImg.data[idx + 3] = 255;

        metalImg.data[idx] = metalVal;
        metalImg.data[idx + 1] = metalVal;
        metalImg.data[idx + 2] = metalVal;
        metalImg.data[idx + 3] = 255;

        roughImg.data[idx] = roughVal;
        roughImg.data[idx + 1] = roughVal;
        roughImg.data[idx + 2] = roughVal;
        roughImg.data[idx + 3] = 255;

        const bumpVal = isBorder ? 20 : 190;
        bumpImg.data[idx] = bumpVal;
        bumpImg.data[idx + 1] = bumpVal;
        bumpImg.data[idx + 2] = bumpVal;
        bumpImg.data[idx + 3] = 255;

        emissImg.data[idx] = isCyanBus ? 34 : 0;
        emissImg.data[idx + 1] = isCyanBus ? 211 : 0;
        emissImg.data[idx + 2] = isCyanBus ? 238 : 0;
        emissImg.data[idx + 3] = 255;
      }
    }

    diffCtx.putImageData(diffImg, 0, 0);
    metalCtx.putImageData(metalImg, 0, 0);
    roughCtx.putImageData(roughImg, 0, 0);
    bumpCtx.putImageData(bumpImg, 0, 0);
    emissCtx.putImageData(emissImg, 0, 0);

    diffuse = new THREE.CanvasTexture(diffCanvas);
    diffuse.wrapS = THREE.RepeatWrapping;
    diffuse.wrapT = THREE.ClampToEdgeWrapping;
    diffuse.colorSpace = THREE.SRGBColorSpace;
    textureCache.set(diffKey, diffuse);

    metalness = new THREE.CanvasTexture(metalCanvas);
    metalness.wrapS = THREE.RepeatWrapping;
    metalness.wrapT = THREE.ClampToEdgeWrapping;
    metalness.colorSpace = THREE.NoColorSpace;
    textureCache.set(metalKey, metalness);

    roughness = new THREE.CanvasTexture(roughCanvas);
    roughness.wrapS = THREE.RepeatWrapping;
    roughness.wrapT = THREE.ClampToEdgeWrapping;
    roughness.colorSpace = THREE.NoColorSpace;
    textureCache.set(roughKey, roughness);

    bump = new THREE.CanvasTexture(bumpCanvas);
    bump.wrapS = THREE.RepeatWrapping;
    bump.wrapT = THREE.ClampToEdgeWrapping;
    bump.colorSpace = THREE.NoColorSpace;
    textureCache.set(bumpKey, bump);

    emissive = new THREE.CanvasTexture(emissCanvas);
    emissive.wrapS = THREE.RepeatWrapping;
    emissive.wrapT = THREE.ClampToEdgeWrapping;
    emissive.colorSpace = THREE.SRGBColorSpace;
    textureCache.set(emissKey, emissive);
  }

  return { diffuse, roughness, metalness, bump, emissive };
}

export interface CrystalTextures {
  readonly diffuse: THREE.CanvasTexture;
  readonly roughness: THREE.CanvasTexture;
  readonly bump: THREE.CanvasTexture;
}

export function createCrystalWorldTextures(
  seed: number,
  lod: GeometryLOD = "focus"
): CrystalTextures {
  const diffKey = `crystal:diff:${seed}:${lod}`;
  const roughKey = `crystal:rough:${seed}:${lod}`;
  const bumpKey = `crystal:bump:${seed}:${lod}`;

  let diffuse = textureCache.get(diffKey);
  let roughness = textureCache.get(roughKey);
  let bump = textureCache.get(bumpKey);

  if (!diffuse || !roughness || !bump) {
    const { width, height } = getResolution(lod);

    const diffCanvas = document.createElement("canvas");
    diffCanvas.width = width;
    diffCanvas.height = height;
    const diffCtx = diffCanvas.getContext("2d")!;
    const diffImg = diffCtx.createImageData(width, height);

    const roughCanvas = document.createElement("canvas");
    roughCanvas.width = width;
    roughCanvas.height = height;
    const roughCtx = roughCanvas.getContext("2d")!;
    const roughImg = roughCtx.createImageData(width, height);

    const bumpCanvas = document.createElement("canvas");
    bumpCanvas.width = width;
    bumpCanvas.height = height;
    const bumpCtx = bumpCanvas.getContext("2d")!;
    const bumpImg = bumpCtx.createImageData(width, height);

    // Voronoi fracture network: 4.5 frequency for broad, readable crystalline plates
    const fractureNoise = createCellular3D(seed);
    const fieldNoise = createNoise3D(seed + 109);

    for (let y = 0; y < height; y++) {
      const phi = (y / height) * Math.PI;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      for (let x = 0; x < width; x++) {
        const theta = (x / width) * 2 * Math.PI;
        const px = sinPhi * Math.cos(theta);
        const py = cosPhi;
        const pz = sinPhi * Math.sin(theta);

        // 1. Broad polygonal ice plates
        const cell = fractureNoise(px * 4.5, py * 4.5, pz * 4.5);
        // Fissure trench profile: cell.diff < 0.28 is inside deep fissure
        const fissureFactor = smoothstep(0.02, 0.28, cell.diff);

        // 2. Crystalline field variation across plate interiors
        const crystalField = fbm3D(fieldNoise, px * 2.5, py * 2.5, pz * 2.5, 2);
        const fieldT = clamp(crystalField * 0.5 + 0.5, 0, 1);

        let r: number;
        let g: number;
        let b: number;
        let roughVal: number;
        let bumpVal: number;

        if (fissureFactor < 0.85) {
          // Deep sapphire fissure chasm (rgb 3, 105, 161) to trench wall (rgb 14, 165, 233)
          const depthT = fissureFactor / 0.85;
          r = lerp(3, 14, depthT);
          g = lerp(105, 165, depthT);
          b = lerp(161, 233, depthT);
          roughVal = 40; // glassy fissure ice
          bumpVal = Math.floor(depthT * 80);
        } else {
          // Broad smooth ice plate: translucent ice blue (175, 222, 248) to pale aquamarine (215, 238, 252)
          const plateT = (fissureFactor - 0.85) / 0.15;
          r = lerp(175, 215, fieldT * plateT);
          g = lerp(222, 238, fieldT * plateT);
          b = lerp(248, 252, fieldT * plateT);
          roughVal = 35; // smooth mirror-glaze glassy plates (roughness ~0.14)
          bumpVal = Math.floor(lerp(180, 240, fieldT));
        }

        const idx = (y * width + x) * 4;
        diffImg.data[idx] = Math.floor(r);
        diffImg.data[idx + 1] = Math.floor(g);
        diffImg.data[idx + 2] = Math.floor(b);
        diffImg.data[idx + 3] = 255;

        roughImg.data[idx] = roughVal;
        roughImg.data[idx + 1] = roughVal;
        roughImg.data[idx + 2] = roughVal;
        roughImg.data[idx + 3] = 255;

        bumpImg.data[idx] = bumpVal;
        bumpImg.data[idx + 1] = bumpVal;
        bumpImg.data[idx + 2] = bumpVal;
        bumpImg.data[idx + 3] = 255;
      }
    }

    diffCtx.putImageData(diffImg, 0, 0);
    roughCtx.putImageData(roughImg, 0, 0);
    bumpCtx.putImageData(bumpImg, 0, 0);

    diffuse = new THREE.CanvasTexture(diffCanvas);
    diffuse.wrapS = THREE.RepeatWrapping;
    diffuse.wrapT = THREE.ClampToEdgeWrapping;
    diffuse.colorSpace = THREE.SRGBColorSpace;
    textureCache.set(diffKey, diffuse);

    roughness = new THREE.CanvasTexture(roughCanvas);
    roughness.wrapS = THREE.RepeatWrapping;
    roughness.wrapT = THREE.ClampToEdgeWrapping;
    roughness.colorSpace = THREE.NoColorSpace;
    textureCache.set(roughKey, roughness);

    bump = new THREE.CanvasTexture(bumpCanvas);
    bump.wrapS = THREE.RepeatWrapping;
    bump.wrapT = THREE.ClampToEdgeWrapping;
    bump.colorSpace = THREE.NoColorSpace;
    textureCache.set(bumpKey, bump);
  }

  return { diffuse, roughness, bump };
}

/**
 * -------------------------------------------------------------
 * 6. SMALL BODIES: Asteroids (Carbon & Mineral)
 * -------------------------------------------------------------
 */

export interface AsteroidTextures {
  readonly diffuse: THREE.CanvasTexture;
  readonly roughness: THREE.CanvasTexture;
  readonly bump: THREE.CanvasTexture;
}

export function createAsteroidTextures(
  seed: number,
  lod: GeometryLOD = "focus",
  variant: "carbon" | "mineral" = "carbon"
): AsteroidTextures {
  const diffKey = `asteroid:${variant}:diff:${seed}:${lod}`;
  const roughKey = `asteroid:${variant}:rough:${seed}:${lod}`;
  const bumpKey = `asteroid:${variant}:bump:${seed}:${lod}`;

  let diffuse = textureCache.get(diffKey);
  let roughness = textureCache.get(roughKey);
  let bump = textureCache.get(bumpKey);

  if (!diffuse || !roughness || !bump) {
    const { width, height } = getResolution(lod);

    const diffCanvas = document.createElement("canvas");
    diffCanvas.width = width;
    diffCanvas.height = height;
    const diffCtx = diffCanvas.getContext("2d")!;
    const diffImg = diffCtx.createImageData(width, height);

    const roughCanvas = document.createElement("canvas");
    roughCanvas.width = width;
    roughCanvas.height = height;
    const roughCtx = roughCanvas.getContext("2d")!;
    const roughImg = roughCtx.createImageData(width, height);

    const bumpCanvas = document.createElement("canvas");
    bumpCanvas.width = width;
    bumpCanvas.height = height;
    const bumpCtx = bumpCanvas.getContext("2d")!;
    const bumpImg = bumpCtx.createImageData(width, height);

    const noise = createNoise3D(seed);

    for (let y = 0; y < height; y++) {
      const phi = (y / height) * Math.PI;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      for (let x = 0; x < width; x++) {
        const theta = (x / width) * 2 * Math.PI;
        const px = sinPhi * Math.cos(theta);
        const py = cosPhi;
        const pz = sinPhi * Math.sin(theta);

        const pit = fbm3D(noise, px * 8.0, py * 8.0, pz * 8.0, 4);
        const relief = clamp(pit * 0.5 + 0.5, 0, 1);

        let r = 0;
        let g = 0;
        let b = 0;

        if (variant === "carbon") {
          // Dark charcoal/graphite (low albedo ~0.10)
          r = Math.floor(lerp(24, 48, relief));
          g = Math.floor(lerp(24, 46, relief));
          b = Math.floor(lerp(24, 44, relief));
        } else {
          // Dusty mineral silicate & iron oxide brown
          r = Math.floor(lerp(75, 120, relief));
          g = Math.floor(lerp(55, 88, relief));
          b = Math.floor(lerp(40, 62, relief));
        }

        const idx = (y * width + x) * 4;
        diffImg.data[idx] = r;
        diffImg.data[idx + 1] = g;
        diffImg.data[idx + 2] = b;
        diffImg.data[idx + 3] = 255;

        // Very high matte roughness (0.92–0.98)
        roughImg.data[idx] = 240;
        roughImg.data[idx + 1] = 240;
        roughImg.data[idx + 2] = 240;
        roughImg.data[idx + 3] = 255;

        const bumpVal = Math.floor(relief * 220);
        bumpImg.data[idx] = bumpVal;
        bumpImg.data[idx + 1] = bumpVal;
        bumpImg.data[idx + 2] = bumpVal;
        bumpImg.data[idx + 3] = 255;
      }
    }

    diffCtx.putImageData(diffImg, 0, 0);
    roughCtx.putImageData(roughImg, 0, 0);
    bumpCtx.putImageData(bumpImg, 0, 0);

    diffuse = new THREE.CanvasTexture(diffCanvas);
    diffuse.wrapS = THREE.RepeatWrapping;
    diffuse.wrapT = THREE.ClampToEdgeWrapping;
    diffuse.colorSpace = THREE.SRGBColorSpace;
    textureCache.set(diffKey, diffuse);

    roughness = new THREE.CanvasTexture(roughCanvas);
    roughness.wrapS = THREE.RepeatWrapping;
    roughness.wrapT = THREE.ClampToEdgeWrapping;
    roughness.colorSpace = THREE.NoColorSpace;
    textureCache.set(roughKey, roughness);

    bump = new THREE.CanvasTexture(bumpCanvas);
    bump.wrapS = THREE.RepeatWrapping;
    bump.wrapT = THREE.ClampToEdgeWrapping;
    bump.colorSpace = THREE.NoColorSpace;
    textureCache.set(bumpKey, bump);
  }

  return { diffuse, roughness, bump };
}

/**
 * -------------------------------------------------------------
 * 7. REUSABLE RING TEXTURE GENERATOR
 * -------------------------------------------------------------
 */

export function createRingTexture(config: RingConfig): THREE.CanvasTexture {
  const key = `ring:${config.style}:${config.seed}:${config.opacity}`;
  let texture = textureCache.get(key);
  if (texture) return texture;

  const width = 512;
  const height = 256;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    const img = ctx.createImageData(width, height);
    const data = img.data;
    const noise = createNoise3D(config.seed);

    for (let y = 0; y < height; y++) {
      const v = y / height; // Angular coordinate around circumference [0, 1]
      const angle = v * 2 * Math.PI;

      // Angular modulation depending on style
      let angularMask = 1.0;
      if (config.style === "broken") {
        // True angular gaps: multi-harmonic azimuthal breaks
        const wave1 = Math.sin(angle * 3.0 + config.seed * 0.4);
        const wave2 = Math.cos(angle * 5.0 - config.seed * 0.6) * 0.5;
        angularMask = smoothstep(-0.1, 0.35, wave1 + wave2);
      } else if (config.style === "ice") {
        // Subtle azimuthal spiral density waves
        angularMask = 0.92 + 0.08 * Math.sin(angle * 6.0 + config.seed);
      } else {
        // Dust: irregular clumpiness around orbit
        const clumping = fbm3D(noise, Math.cos(angle) * 2.0, Math.sin(angle) * 2.0, 0.5, 2);
        angularMask = clamp(0.75 + clumping * 0.3, 0, 1);
      }

      for (let x = 0; x < width; x++) {
        const u = x / width; // Radial fraction from inner to outer radius [0, 1]

        // Edge fades at inner & outer radial boundaries
        const edgeFade = smoothstep(0.0, 0.06, u) * smoothstep(1.0, 0.94, u);

        // Multi-scale concentric ring density
        const band1 = Math.sin(u * 95.0) * 0.5 + 0.5;
        const band2 = Math.sin(u * 240.0 + config.seed) * 0.5 + 0.5;
        const band3 = Math.sin(u * 520.0 - config.seed) * 0.5 + 0.5;

        // Division gaps
        const cassini = u > 0.61 && u < 0.67 ? 0.0 : 1.0; // Cassini division gap
        const encke = u > 0.85 && u < 0.88 ? 0.0 : 1.0; // Encke gap

        const radialDensity =
          (band1 * 0.45 + band2 * 0.35 + band3 * 0.2) * cassini * encke * edgeFade;

        let r = 255;
        let g = 255;
        let b = 255;
        let baseAlpha = 0.7;

        if (config.style === "ice") {
          // Delicate translucent ice bands with radial tint variation
          baseAlpha = 0.68;
          if (u < 0.61) {
            // Inner B-ring: warm ivory ice
            r = Math.floor(lerp(242, 252, radialDensity));
            g = Math.floor(lerp(235, 248, radialDensity));
            b = Math.floor(lerp(220, 242, radialDensity));
          } else {
            // Outer A-ring: cool azure-white ice
            r = Math.floor(lerp(210, 245, radialDensity));
            g = Math.floor(lerp(228, 250, radialDensity));
            b = Math.floor(lerp(248, 255, radialDensity));
          }
        } else if (config.style === "dust") {
          // Softer, darker brown/gray silicate particles
          baseAlpha = 0.42;
          r = Math.floor(lerp(125, 168, radialDensity));
          g = Math.floor(lerp(110, 148, radialDensity));
          b = Math.floor(lerp(95, 132, radialDensity));
        } else {
          // Broken rings: fractured icy chunks
          baseAlpha = 0.72;
          r = Math.floor(lerp(218, 250, radialDensity));
          g = Math.floor(lerp(228, 252, radialDensity));
          b = Math.floor(lerp(242, 255, radialDensity));
        }

        const alpha = clamp(radialDensity * angularMask * baseAlpha * config.opacity, 0, 1);

        const idx = (y * width + x) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = Math.floor(alpha * 255);
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.RepeatWrapping; // Angular v wraps around 360°
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(key, texture);
  return texture;
}
