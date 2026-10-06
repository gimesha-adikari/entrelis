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
      const noise = createNoise3D(seed + 17);

      for (let y = 0; y < height; y++) {
        const phi = (y / height) * Math.PI;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        for (let x = 0; x < width; x++) {
          const theta = (x / width) * 2 * Math.PI;
          const px = sinPhi * Math.cos(theta);
          const py = cosPhi;
          const pz = sinPhi * Math.sin(theta);

          // Solar granulation: cellular distance modulated by subtle fBm
          const cell = cellNoise(px * 16, py * 16, pz * 16);
          const fbm = fbm3D(noise, px * 8, py * 8, pz * 8, 3) * 0.15;
          const val = clamp(cell.diff * 1.4 + fbm, 0, 1);
          const byteVal = Math.floor(val * 255);

          const idx = (y * width + x) * 4;
          data[idx] = byteVal;
          data[idx + 1] = byteVal;
          data[idx + 2] = byteVal;
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
          const lobe = 1.0 + 0.14 * Math.sin(angle * 5 + seed * 0.1) + 0.08 * Math.cos(angle * 3 - seed * 0.2);
          const normR = r / lobe;
          if (normR >= 1.0) continue;

          const falloff = Math.pow(Math.max(0, 1.0 - normR), 2.4);
          const idx = (y * size + x) * 4;
          data[idx] = Math.floor(255 * falloff);
          data[idx + 1] = Math.floor(215 * falloff);
          data[idx + 2] = Math.floor(100 * falloff);
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
      const noise = createNoise3D(seed + 333);

      for (let y = 0; y < height; y++) {
        const phi = (y / height) * Math.PI;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        for (let x = 0; x < width; x++) {
          const theta = (x / width) * 2 * Math.PI;
          const px = sinPhi * Math.cos(theta);
          const py = cosPhi;
          const pz = sinPhi * Math.sin(theta);

          // Hotter, tighter blue-white granules with sharper contrast
          const cell = cellNoise(px * 24, py * 24, pz * 24);
          const micro = fbm3D(noise, px * 14, py * 14, pz * 14, 4) * 0.1;
          const val = clamp(Math.pow(cell.diff * 1.5, 1.3) + micro, 0, 1);
          const byteVal = Math.floor(val * 255);

          const idx = (y * width + x) * 4;
          data[idx] = byteVal;
          data[idx + 1] = byteVal;
          data[idx + 2] = byteVal;
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
          data[idx] = Math.floor(180 * falloff);
          data[idx + 1] = Math.floor(235 * falloff);
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

      for (let y = 0; y < height; y++) {
        const phi = (y / height) * Math.PI;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        for (let x = 0; x < width; x++) {
          const theta = (x / width) * 2 * Math.PI;
          const px = sinPhi * Math.cos(theta);
          const py = cosPhi;
          const pz = sinPhi * Math.sin(theta);

          // Deep convective red-star cells: larger irregular convection with dark intergranular lanes
          const cell = cellNoise(px * 11, py * 11, pz * 11);
          const warp = domainWarp3D(noise, px * 4, py * 4, pz * 4, 0.4) * 0.2;
          const val = clamp(cell.diff * 1.2 + warp, 0, 1);
          const byteVal = Math.floor(val * 255);

          const idx = (y * width + x) * 4;
          data[idx] = byteVal;
          data[idx + 1] = byteVal;
          data[idx + 2] = byteVal;
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
          data[idx] = Math.floor(250 * falloff);
          data[idx + 1] = Math.floor(80 * falloff);
          data[idx + 2] = Math.floor(30 * falloff);
          data[idx + 3] = Math.floor(240 * falloff);
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

export function createVolcanicRockyTextures(seed: number, lod: GeometryLOD = "focus"): RockyTextures {
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

export function createMineralDesertTextures(seed: number, lod: GeometryLOD = "focus"): RockyTextures {
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

export function createLifeWorldTextures(seed: number, lod: GeometryLOD = "focus"): LifeWorldTextures {
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

        // 1. Continental land vs ocean generator (threshold 0.48)
        const continent = fbm3D(continentNoise, px * 2.2, py * 2.2, pz * 2.2, 4);
        const biome = fbm3D(biomeNoise, px * 6.0, py * 6.0, pz * 6.0, 3);

        const isLand = continent > 0.48;
        let r = 0;
        let g = 0;
        let b = 0;
        let rough = 0;

        if (!isLand) {
          // Ocean: Deep sapphire (0x0f2b48) to shallow coastal cyan (0x1e6f7d)
          const depth = clamp(continent / 0.48, 0, 1);
          r = lerp(15, 30, depth);
          g = lerp(43, 111, depth);
          b = lerp(72, 125, depth);
          rough = 38; // Ultra-glossy specular ocean (roughness ~0.15)
        } else {
          // Landmass: Forest emerald, savanna olive, alpine highlands
          const elevation = clamp((continent - 0.48) / 0.52, 0, 1);
          if (elevation < 0.6) {
            // Biome mix: Emerald to olive
            const t = clamp(biome * 0.5 + 0.5, 0, 1);
            r = lerp(29, 74, t);
            g = lerp(92, 107, t);
            b = lerp(46, 34, t);
          } else {
            // Alpine highlands: Stone beige / snow peaks
            r = lerp(120, 210, (elevation - 0.6) / 0.4);
            g = lerp(115, 215, (elevation - 0.6) / 0.4);
            b = lerp(110, 220, (elevation - 0.6) / 0.4);
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

        // 2. Separate Cloud Shell: Domain-warped wisps & swirls (transparent alpha)
        const cloudDensity = domainWarp3D(cloudNoise, px * 3.5, py * 3.5, pz * 3.5, 0.6);
        const cloudAlpha = clamp(smoothstep(0.42, 0.75, cloudDensity) * 0.88, 0, 1);

        cloudImg.data[idx] = 255;
        cloudImg.data[idx + 1] = 255;
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

export function createBlueAtmosphericTexture(seed: number, lod: GeometryLOD = "focus"): THREE.CanvasTexture {
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

        // Latitudinal jet streams with domain-warped turbulence
        const latFlow = Math.sin(py * 14.0) * 0.5 + 0.5;
        const turb = domainWarp3D(noise, px * 3.0, py * 3.0, pz * 3.0, 0.7) * 0.4;
        const val = clamp(latFlow * 0.6 + turb, 0, 1);

        // Deep blue, cyan, indigo, violet palette
        const r = Math.floor(lerp(18, 56, val));
        const g = Math.floor(lerp(50, 189, val));
        const b = Math.floor(lerp(120, 248, val));

        const idx = (y * width + x) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
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

export function createStormGiantTexture(seed: number, lod: GeometryLOD = "focus"): THREE.CanvasTexture {
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

    for (let y = 0; y < height; y++) {
      const phi = (y / height) * Math.PI;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      for (let x = 0; x < width; x++) {
        const theta = (x / width) * 2 * Math.PI;
        const px = sinPhi * Math.cos(theta);
        const py = cosPhi;
        const pz = sinPhi * Math.sin(theta);

        // 16-band Jupiter-like shear turbulence
        const bands = Math.sin(py * 28.0) * 0.5 + 0.5;
        const shear = fbm3D(bandNoise, px * 5.0, py * 5.0, pz * 5.0, 4) * 0.45;
        const vortex = ridgedFbm3D(vortexNoise, px * 2.5, py * 2.5, pz * 2.5, 3) * 0.25;

        const val = clamp(bands * 0.45 + shear * 0.4 + vortex * 0.15, 0, 1);

        // Warm tawny, amber-ochre, cream, peach, mocha palette
        const r = Math.floor(lerp(212, 109, val));
        const g = Math.floor(lerp(163, 76, val));
        const b = Math.floor(lerp(115, 65, val));

        const idx = (y * width + x) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
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
}

export function createMetallicWorldTextures(seed: number, lod: GeometryLOD = "focus"): MetallicTextures {
  const diffKey = `metallic:diff:${seed}:${lod}`;
  const roughKey = `metallic:rough:${seed}:${lod}`;
  const metalKey = `metallic:metal:${seed}:${lod}`;
  const bumpKey = `metallic:bump:${seed}:${lod}`;

  let diffuse = textureCache.get(diffKey);
  let roughness = textureCache.get(roughKey);
  let metalness = textureCache.get(metalKey);
  let bump = textureCache.get(bumpKey);

  if (!diffuse || !roughness || !metalness || !bump) {
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

    const manhattanCell = createCellularManhattan3D(seed);
    const traceNoise = createNoise3D(seed + 77);

    for (let y = 0; y < height; y++) {
      const phi = (y / height) * Math.PI;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      for (let x = 0; x < width; x++) {
        const theta = (x / width) * 2 * Math.PI;
        const px = sinPhi * Math.cos(theta);
        const py = cosPhi;
        const pz = sinPhi * Math.sin(theta);

        // Rectilinear Manhattan grid representing silicon die partitions & wafer blocks
        const grid = manhattanCell(px * 12.0, py * 12.0, pz * 12.0);
        const traces = Math.abs(fbm3D(traceNoise, px * 24.0, py * 24.0, pz * 24.0, 3));
        const isTrace = traces > 0.65;

        // Base metallic colors: Graphite (0x1e293b), Steel (0x475569), Titanium (0x94a3b8)
        let r = lerp(30, 110, grid.diff);
        let g = lerp(41, 130, grid.diff);
        let b = lerp(59, 155, grid.diff);

        // Controlled subtle cyan bus lines in micro-trenches
        if (isTrace) {
          r = 6;
          g = 182;
          b = 212; // Cyan #06b6d4
        }

        const idx = (y * width + x) * 4;
        diffImg.data[idx] = Math.floor(r);
        diffImg.data[idx + 1] = Math.floor(g);
        diffImg.data[idx + 2] = Math.floor(b);
        diffImg.data[idx + 3] = 255;

        // Metalness: 0.85–0.98 high metallic
        metalImg.data[idx] = isTrace ? 200 : Math.floor(lerp(215, 248, grid.diff));
        metalImg.data[idx + 1] = metalImg.data[idx];
        metalImg.data[idx + 2] = metalImg.data[idx];
        metalImg.data[idx + 3] = 255;

        // Roughness: Wafer mirror polish (0.15) to matte chassis (0.55)
        const rough = isTrace ? 45 : Math.floor(lerp(40, 140, grid.diff));
        roughImg.data[idx] = rough;
        roughImg.data[idx + 1] = rough;
        roughImg.data[idx + 2] = rough;
        roughImg.data[idx + 3] = 255;

        // Bump: Stepped elevation transitions between wafer tiles
        const bumpVal = Math.floor(grid.diff * 220);
        bumpImg.data[idx] = bumpVal;
        bumpImg.data[idx + 1] = bumpVal;
        bumpImg.data[idx + 2] = bumpVal;
        bumpImg.data[idx + 3] = 255;
      }
    }

    diffCtx.putImageData(diffImg, 0, 0);
    metalCtx.putImageData(metalImg, 0, 0);
    roughCtx.putImageData(roughImg, 0, 0);
    bumpCtx.putImageData(bumpImg, 0, 0);

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
  }

  return { diffuse, roughness, metalness, bump };
}

export interface CrystalTextures {
  readonly diffuse: THREE.CanvasTexture;
  readonly roughness: THREE.CanvasTexture;
  readonly bump: THREE.CanvasTexture;
}

export function createCrystalWorldTextures(seed: number, lod: GeometryLOD = "focus"): CrystalTextures {
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

    const fractureNoise = createCellular3D(seed);
    const iceNoise = createNoise3D(seed + 59);

    for (let y = 0; y < height; y++) {
      const phi = (y / height) * Math.PI;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      for (let x = 0; x < width; x++) {
        const theta = (x / width) * 2 * Math.PI;
        const px = sinPhi * Math.cos(theta);
        const py = cosPhi;
        const pz = sinPhi * Math.sin(theta);

        // Brittle fracture valleys: sharp Voronoi boundaries
        const cell = fractureNoise(px * 10.0, py * 10.0, pz * 10.0);
        const crack = clamp(cell.diff * 4.0, 0, 1);
        const frost = fbm3D(iceNoise, px * 8.0, py * 8.0, pz * 8.0, 3) * 0.2;

        // Sapphire fissure trenches (0x0284c7) to radiant firn snowpack (0xf0fdfa)
        let r = lerp(2, 240, crack);
        let g = lerp(132, 253, crack);
        let b = lerp(199, 250, crack);

        const idx = (y * width + x) * 4;
        diffImg.data[idx] = Math.floor(r);
        diffImg.data[idx + 1] = Math.floor(g);
        diffImg.data[idx + 2] = Math.floor(b);
        diffImg.data[idx + 3] = 255;

        // Roughness: Mirror ice (0.12) vs frosted snow (0.75)
        const rough = Math.floor(lerp(30, 190, crack + frost));
        roughImg.data[idx] = rough;
        roughImg.data[idx + 1] = rough;
        roughImg.data[idx + 2] = rough;
        roughImg.data[idx + 3] = 255;

        // Bump: Crevasse indentations
        const bumpVal = Math.floor(crack * 240);
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
  const height = 16;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    const img = ctx.createImageData(width, height);
    const data = img.data;
    const noise = createNoise3D(config.seed);

    for (let x = 0; x < width; x++) {
      const u = x / width; // Radial fraction from inner to outer radius

      // Multi-scale concentric ring density
      const band1 = Math.sin(u * 80.0) * 0.5 + 0.5;
      const band2 = Math.sin(u * 210.0 + config.seed) * 0.5 + 0.5;
      const cassini = u > 0.62 && u < 0.68 ? 0.05 : 1.0; // Cassini division gap
      const encke = u > 0.88 && u < 0.91 ? 0.1 : 1.0; // Encke gap

      let density = (band1 * 0.6 + band2 * 0.4) * cassini * encke;

      if (config.style === "dust") {
        density = density * 0.65;
      } else if (config.style === "broken") {
        const breakFactor = Math.abs(fbm3D(noise, u * 15.0, 0.5, 0.5, 3));
        density = density * breakFactor;
      }

      const alpha = clamp(density * config.opacity, 0, 1);

      for (let y = 0; y < height; y++) {
        const idx = (y * width + x) * 4;
        data[idx] = 255;
        data[idx + 1] = 255;
        data[idx + 2] = 255;
        data[idx + 3] = Math.floor(alpha * 255);
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(key, texture);
  return texture;
}
