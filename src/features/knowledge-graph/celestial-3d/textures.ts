import * as THREE from "three";
import { createLcg, createNoise3D, fbm3D, ridgedFbm3D, createCellular3D } from "./noise3d";

// Global texture cache so textures are generated only once per seed
const textureCache = new Map<string, THREE.CanvasTexture>();

function createOffscreenCanvas(width: number, height: number): HTMLCanvasElement | null {
  if (typeof document === "undefined") {
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

// Fixed deterministic impact craters on unit sphere for Rocky World
interface CraterDef {
  readonly dir: [number, number, number];
  readonly radius: number;
  readonly depth: number;
}

const ROCKY_CRATERS: CraterDef[] = [
  { dir: [0.65, 0.35, 0.67], radius: 0.18, depth: 0.38 },
  { dir: [-0.72, 0.22, 0.65], radius: 0.22, depth: 0.42 },
  { dir: [0.28, -0.68, 0.67], radius: 0.14, depth: 0.32 },
  { dir: [-0.45, -0.55, -0.7], radius: 0.24, depth: 0.46 },
  { dir: [0.82, -0.25, -0.51], radius: 0.13, depth: 0.26 },
  { dir: [-0.3, 0.75, -0.58], radius: 0.19, depth: 0.36 },
  { dir: [0.15, 0.85, 0.5], radius: 0.12, depth: 0.24 },
  { dir: [-0.85, -0.3, 0.43], radius: 0.16, depth: 0.3 },
];

/**
 * Generates procedural diffuse, bump, and roughness maps for Rocky World
 * with true 3D noise sampling and 3-scale geological hierarchy.
 */
export function createRockyTextures(seed = 42): {
  diffuse: THREE.CanvasTexture | null;
  bump: THREE.CanvasTexture | null;
  roughness: THREE.CanvasTexture | null;
} {
  const cacheKeyDiff = `rocky-diff-${seed}`;
  const cacheKeyBump = `rocky-bump-${seed}`;
  const cacheKeyRough = `rocky-rough-${seed}`;

  if (
    textureCache.has(cacheKeyDiff) &&
    textureCache.has(cacheKeyBump) &&
    textureCache.has(cacheKeyRough)
  ) {
    return {
      diffuse: textureCache.get(cacheKeyDiff) ?? null,
      bump: textureCache.get(cacheKeyBump) ?? null,
      roughness: textureCache.get(cacheKeyRough) ?? null,
    };
  }

  const width = 512;
  const height = 256;
  const diffCanvas = createOffscreenCanvas(width, height);
  const bumpCanvas = createOffscreenCanvas(width, height);
  const roughCanvas = createOffscreenCanvas(width, height);

  if (!diffCanvas || !bumpCanvas || !roughCanvas) {
    return { diffuse: null, bump: null, roughness: null };
  }

  const dCtx = diffCanvas.getContext("2d");
  const bCtx = bumpCanvas.getContext("2d");
  const rCtx = roughCanvas.getContext("2d");

  if (!dCtx || !bCtx || !rCtx) {
    return { diffuse: null, bump: null, roughness: null };
  }

  const noiseMacro = createNoise3D(seed);
  const noiseMeso = createNoise3D(seed + 101);
  const noiseMicro = createNoise3D(seed + 202);

  const dImg = dCtx.createImageData(width, height);
  const bImg = bCtx.createImageData(width, height);
  const rImg = rCtx.createImageData(width, height);

  for (let y = 0; y < height; y++) {
    const phi = (y / height) * Math.PI;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);

    for (let x = 0; x < width; x++) {
      const theta = (x / width) * Math.PI * 2;
      const px = sinPhi * Math.cos(theta);
      const py = cosPhi;
      const pz = sinPhi * Math.sin(theta);

      // 1. Macro scale: continental shields vs deep mineral basins
      const macro = fbm3D(noiseMacro, px * 1.5, py * 1.5, pz * 1.5, 3, 2.0, 0.5);

      // 2. Meso scale: tectonic ridges, fault crests, plate margins
      const meso = ridgedFbm3D(noiseMeso, px * 3.8, py * 3.8, pz * 3.8, 4, 2.0, 0.5);

      // 3. Micro scale: fine mineral regolith grain
      const micro = fbm3D(noiseMicro, px * 14.0, py * 14.0, pz * 14.0, 3, 2.0, 0.45);

      // 4. Subtle impact craters
      let craterHeight = 0;
      let craterRimMask = 0;
      for (const c of ROCKY_CRATERS) {
        const dot = px * c.dir[0] + py * c.dir[1] + pz * c.dir[2];
        const angle = Math.acos(clamp(dot, -1, 1));
        if (angle < c.radius) {
          const t = angle / c.radius;
          const bowl = -(1.0 - t * t) * c.depth;
          const rim = Math.exp(-Math.pow((t - 0.88) / 0.12, 2)) * (c.depth * 0.45);
          craterHeight += bowl + rim;
          if (rim > 0.05) {
            craterRimMask = Math.max(craterRimMask, rim);
          }
        }
      }

      // Combined height calculation
      const elevation = clamp(macro * 0.5 + meso * 0.36 + micro * 0.14 + craterHeight, 0, 1);

      // Vibrant, warm geological color palette
      let r = 0;
      let g = 0;
      let b = 0;

      if (elevation < 0.35) {
        // Mineral lowlands & basaltic basins
        const t = elevation / 0.35;
        r = lerp(120, 165, t);
        g = lerp(55, 78, t);
        b = lerp(25, 38, t);
      } else if (elevation < 0.65) {
        // Oxidized terra plains (warm rust / copper)
        const t = (elevation - 0.35) / 0.3;
        r = lerp(165, 218, t);
        g = lerp(78, 105, t);
        b = lerp(38, 48, t);
      } else if (elevation < 0.84) {
        // Highland plateaus (vibrant amber-terra)
        const t = (elevation - 0.65) / 0.19;
        r = lerp(218, 245, t);
        g = lerp(105, 150, t);
        b = lerp(48, 75, t);
      } else {
        // Silicate mountain crests & crater rims
        const t = (elevation - 0.84) / 0.16;
        r = lerp(245, 255, t);
        g = lerp(150, 225, t);
        b = lerp(75, 175, t);
      }

      // Crater rim highlight with exposed pale silicate
      if (craterRimMask > 0.06) {
        r = lerp(r, 255, craterRimMask * 0.55);
        g = lerp(g, 240, craterRimMask * 0.55);
        b = lerp(b, 205, craterRimMask * 0.55);
      }

      const idx = (y * width + x) * 4;
      dImg.data[idx] = clamp(Math.round(r), 0, 255);
      dImg.data[idx + 1] = clamp(Math.round(g), 0, 255);
      dImg.data[idx + 2] = clamp(Math.round(b), 0, 255);
      dImg.data[idx + 3] = 255;

      // Bump map: grayscale elevation
      const bumpVal = Math.round(elevation * 255);
      bImg.data[idx] = bumpVal;
      bImg.data[idx + 1] = bumpVal;
      bImg.data[idx + 2] = bumpVal;
      bImg.data[idx + 3] = 255;

      // Roughness map: smooth basalt basins (~0.55), rough plateaus (~0.85)
      const roughVal = Math.round(
        clamp(lerp(0.55, 0.85, elevation) - craterRimMask * 0.2, 0.4, 0.9) * 255
      );
      rImg.data[idx] = roughVal;
      rImg.data[idx + 1] = roughVal;
      rImg.data[idx + 2] = roughVal;
      rImg.data[idx + 3] = 255;
    }
  }

  dCtx.putImageData(dImg, 0, 0);
  bCtx.putImageData(bImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);

  const diffTex = new THREE.CanvasTexture(diffCanvas);
  diffTex.colorSpace = THREE.SRGBColorSpace;
  diffTex.wrapS = THREE.RepeatWrapping;
  diffTex.wrapT = THREE.ClampToEdgeWrapping;

  const bumpTex = new THREE.CanvasTexture(bumpCanvas);
  bumpTex.colorSpace = THREE.NoColorSpace;
  bumpTex.wrapS = THREE.RepeatWrapping;
  bumpTex.wrapT = THREE.ClampToEdgeWrapping;

  const roughTex = new THREE.CanvasTexture(roughCanvas);
  roughTex.colorSpace = THREE.NoColorSpace;
  roughTex.wrapS = THREE.RepeatWrapping;
  roughTex.wrapT = THREE.ClampToEdgeWrapping;

  textureCache.set(cacheKeyDiff, diffTex);
  textureCache.set(cacheKeyBump, bumpTex);
  textureCache.set(cacheKeyRough, roughTex);

  return { diffuse: diffTex, bump: bumpTex, roughness: roughTex };
}

/**
 * Generates procedural texture for Gas World with multi-width irregular bands,
 * domain warping turbulence, and an identifiable cyclonic vortex.
 */
export function createGasTexture(seed = 101): THREE.CanvasTexture | null {
  const cacheKey = `gas-${seed}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey) ?? null;
  }

  const width = 512;
  const height = 256;
  const canvas = createOffscreenCanvas(width, height);
  if (!canvas) {
    return null;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }

  const noiseWarp = createNoise3D(seed);
  const noiseDetail = createNoise3D(seed + 88);
  const imgData = ctx.createImageData(width, height);

  // Identifiable Great Cyclonic Vortex placed on front-facing illuminated hemisphere
  const stormLat = Math.PI * 0.64;
  const stormLon = Math.PI * 0.45;
  const stormRadius = 0.35;

  for (let y = 0; y < height; y++) {
    const phi = (y / height) * Math.PI;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);

    for (let x = 0; x < width; x++) {
      const theta = (x / width) * Math.PI * 2;
      const px = sinPhi * Math.cos(theta);
      const py = cosPhi;
      const pz = sinPhi * Math.sin(theta);

      // Domain-warped latitude to eliminate straight horizontal stripes
      const warp = fbm3D(noiseWarp, px * 2.2, py * 2.2, pz * 2.2, 3, 2.0, 0.5) * 0.22;
      const detail = fbm3D(noiseDetail, px * 8.0, py * 8.0, pz * 8.0, 2, 2.0, 0.4) * 0.08;
      const warpedPhi = phi + warp + detail;

      // Variable width jet streams
      const bandWave =
        Math.sin(warpedPhi * 6.8) * 0.48 +
        Math.sin(warpedPhi * 13.5 + 1.2) * 0.32 +
        Math.sin(warpedPhi * 2.6 - 0.6) * 0.2;

      const normBand = clamp((bandWave + 1.0) * 0.5, 0, 1);

      // Vibrant, luminous palette: deep navy/teal belts, vivid cyan jets, pale cloud crests
      let r = 0;
      let g = 0;
      let b = 0;

      if (normBand < 0.32) {
        // Deep marine teal belts
        const t = normBand / 0.32;
        r = lerp(14, 25, t);
        g = lerp(75, 115, t);
        b = lerp(105, 155, t);
      } else if (normBand < 0.68) {
        // Radiant cyan jet-streams
        const t = (normBand - 0.32) / 0.36;
        r = lerp(25, 45, t);
        g = lerp(115, 195, t);
        b = lerp(155, 235, t);
      } else {
        // Pale luminous cloud highlights
        const t = (normBand - 0.68) / 0.32;
        r = lerp(45, 185, t);
        g = lerp(195, 245, t);
        b = lerp(235, 255, t);
      }

      // Polar hood color shift (muted violet / indigo in high latitudes)
      const polarWeight = Math.pow(Math.abs(cosPhi), 3.0);
      if (polarWeight > 0.05) {
        r = lerp(r, 65, polarWeight * 0.45);
        g = lerp(g, 60, polarWeight * 0.45);
        b = lerp(b, 135, polarWeight * 0.55);
      }

      // Check for Great Cyclonic Vortex
      const dPhi = phi - stormLat;
      let dLon = theta - stormLon;
      if (dLon > Math.PI) {
        dLon -= Math.PI * 2;
      }
      if (dLon < -Math.PI) {
        dLon += Math.PI * 2;
      }
      const distStorm = Math.sqrt(dPhi * dPhi + dLon * 1.6 * (dLon * 1.6));

      if (distStorm < stormRadius) {
        const stormT = distStorm / stormRadius;
        const collar = Math.exp(-Math.pow((stormT - 0.65) / 0.18, 2));
        const eye = Math.exp(-Math.pow(stormT / 0.32, 2));

        r = lerp(r, 10, collar * 0.65);
        g = lerp(g, 65, collar * 0.65);
        b = lerp(b, 95, collar * 0.65);

        r = lerp(r, 220, eye * 0.9);
        g = lerp(g, 250, eye * 0.9);
        b = lerp(b, 255, eye * 0.9);
      }

      const idx = (y * width + x) * 4;
      imgData.data[idx] = clamp(Math.round(r), 0, 255);
      imgData.data[idx + 1] = clamp(Math.round(g), 0, 255);
      imgData.data[idx + 2] = clamp(Math.round(b), 0, 255);
      imgData.data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  textureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Generates procedural diffuse, roughness, and bump maps for Ice World
 * featuring crystalline fracture lattices, frost plains, and mirror glaze.
 */
export function createIceTextures(seed = 202): {
  diffuse: THREE.CanvasTexture | null;
  roughness: THREE.CanvasTexture | null;
  bump: THREE.CanvasTexture | null;
} {
  const cacheKeyDiff = `ice-diff-${seed}`;
  const cacheKeyRough = `ice-rough-${seed}`;
  const cacheKeyBump = `ice-bump-${seed}`;

  if (
    textureCache.has(cacheKeyDiff) &&
    textureCache.has(cacheKeyRough) &&
    textureCache.has(cacheKeyBump)
  ) {
    return {
      diffuse: textureCache.get(cacheKeyDiff) ?? null,
      roughness: textureCache.get(cacheKeyRough) ?? null,
      bump: textureCache.get(cacheKeyBump) ?? null,
    };
  }

  const width = 512;
  const height = 256;
  const diffCanvas = createOffscreenCanvas(width, height);
  const roughCanvas = createOffscreenCanvas(width, height);
  const bumpCanvas = createOffscreenCanvas(width, height);

  if (!diffCanvas || !roughCanvas || !bumpCanvas) {
    return { diffuse: null, roughness: null, bump: null };
  }

  const dCtx = diffCanvas.getContext("2d");
  const rCtx = roughCanvas.getContext("2d");
  const bCtx = bumpCanvas.getContext("2d");

  if (!dCtx || !rCtx || !bCtx) {
    return { diffuse: null, roughness: null, bump: null };
  }

  const noiseMacro = createNoise3D(seed);
  const cellularFracture = createCellular3D(seed + 155);
  const noiseFrost = createNoise3D(seed + 311);

  const dImg = dCtx.createImageData(width, height);
  const rImg = rCtx.createImageData(width, height);
  const bImg = bCtx.createImageData(width, height);

  for (let y = 0; y < height; y++) {
    const phi = (y / height) * Math.PI;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);

    for (let x = 0; x < width; x++) {
      const theta = (x / width) * Math.PI * 2;
      const px = sinPhi * Math.cos(theta);
      const py = cosPhi;
      const pz = sinPhi * Math.sin(theta);

      // 1. Macro glacial massifs
      const macro = fbm3D(noiseMacro, px * 1.6, py * 1.6, pz * 1.6, 3, 2.0, 0.5);

      // 2. Natural organic Europa/glacial ice fractures with domain warping
      const crackWarp = fbm3D(noiseFrost, px * 2.5, py * 2.5, pz * 2.5, 2, 2.0, 0.5) * 0.18;
      const { diff } = cellularFracture(
        (px + crackWarp) * 1.8,
        (py + crackWarp) * 1.8,
        (pz + crackWarp) * 1.8
      );
      // Sharp crack veins
      const crack = 1.0 - clamp(diff / 0.16, 0, 1);

      // 3. Fine frosted firn snow
      const frost = fbm3D(noiseFrost, px * 12.0, py * 12.0, pz * 12.0, 2, 2.0, 0.45);

      // Pale luminous glacial color composition
      let r = 0;
      let g = 0;
      let b = 0;

      if (macro < 0.4) {
        // Deep translucent glacial blue
        const t = macro / 0.4;
        r = lerp(85, 145, t);
        g = lerp(165, 205, t);
        b = lerp(220, 245, t);
      } else if (macro < 0.75) {
        // Frost plains & firn ice
        const t = (macro - 0.4) / 0.35;
        r = lerp(145, 215, t);
        g = lerp(205, 240, t);
        b = lerp(245, 255, t);
      } else {
        // Brilliant snowpack crests
        const t = (macro - 0.75) / 0.25;
        r = lerp(215, 252, t);
        g = lerp(240, 254, t);
        b = lerp(255, 255, t);
      }

      // Translucent fracture veins: deep sapphire trench with bright crystal ridge crests
      if (crack > 0.12) {
        if (crack > 0.55) {
          // Sapphire ice fissure trench
          const t = (crack - 0.55) / 0.45;
          r = lerp(r, 22, t);
          g = lerp(g, 115, t);
          b = lerp(b, 195, t);
        } else {
          // Pure white crystalline pressure rim
          const t = crack / 0.55;
          r = lerp(r, 255, t);
          g = lerp(g, 255, t);
          b = lerp(b, 255, t);
        }
      }

      const idx = (y * width + x) * 4;
      dImg.data[idx] = clamp(Math.round(r), 0, 255);
      dImg.data[idx + 1] = clamp(Math.round(g), 0, 255);
      dImg.data[idx + 2] = clamp(Math.round(b), 0, 255);
      dImg.data[idx + 3] = 255;

      // Roughness map: mirror glaze ice in cracks (~0.18) vs matte frost (~0.72)
      let rough = lerp(0.28, 0.72, frost * 0.7 + macro * 0.3);
      if (crack > 0.5) {
        rough = 0.16; // mirror glaze in fractures
      }
      const roughVal = Math.round(clamp(rough, 0.14, 0.82) * 255);
      rImg.data[idx] = roughVal;
      rImg.data[idx + 1] = roughVal;
      rImg.data[idx + 2] = roughVal;
      rImg.data[idx + 3] = 255;

      // Bump map: subtle pressure ridges along fractures
      const bumpVal = Math.round(
        clamp(macro * 0.5 + (1.0 - crack) * 0.3 + frost * 0.2, 0, 1) * 255
      );
      bImg.data[idx] = bumpVal;
      bImg.data[idx + 1] = bumpVal;
      bImg.data[idx + 2] = bumpVal;
      bImg.data[idx + 3] = 255;
    }
  }

  dCtx.putImageData(dImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);
  bCtx.putImageData(bImg, 0, 0);

  const diffTex = new THREE.CanvasTexture(diffCanvas);
  diffTex.colorSpace = THREE.SRGBColorSpace;
  diffTex.wrapS = THREE.RepeatWrapping;
  diffTex.wrapT = THREE.ClampToEdgeWrapping;

  const roughTex = new THREE.CanvasTexture(roughCanvas);
  roughTex.colorSpace = THREE.NoColorSpace;
  roughTex.wrapS = THREE.RepeatWrapping;
  roughTex.wrapT = THREE.ClampToEdgeWrapping;

  const bumpTex = new THREE.CanvasTexture(bumpCanvas);
  bumpTex.colorSpace = THREE.NoColorSpace;
  bumpTex.wrapS = THREE.RepeatWrapping;
  bumpTex.wrapT = THREE.ClampToEdgeWrapping;

  textureCache.set(cacheKeyDiff, diffTex);
  textureCache.set(cacheKeyRough, roughTex);
  textureCache.set(cacheKeyBump, bumpTex);

  return { diffuse: diffTex, roughness: roughTex, bump: bumpTex };
}

/**
 * Generates procedural textures for Luminous Star:
 * 1. Granulation cell texture for custom stellar shader
 * 2. Organic billboard corona sprite texture
 */
export function createStarTextures(seed = 303): {
  surface: THREE.CanvasTexture | null;
  corona: THREE.CanvasTexture | null;
} {
  const cacheKeySurface = `star-surface-${seed}`;
  const cacheKeyCorona = `star-corona-${seed}`;

  if (textureCache.has(cacheKeySurface) && textureCache.has(cacheKeyCorona)) {
    return {
      surface: textureCache.get(cacheKeySurface) ?? null,
      corona: textureCache.get(cacheKeyCorona) ?? null,
    };
  }

  // 1. Surface Granulation Map
  const sWidth = 512;
  const sHeight = 256;
  const sCanvas = createOffscreenCanvas(sWidth, sHeight);
  let surfaceTex: THREE.CanvasTexture | null = null;

  if (sCanvas) {
    const sCtx = sCanvas.getContext("2d");
    if (sCtx) {
      const noiseCells = createNoise3D(seed);
      const noiseTurb = createNoise3D(seed + 99);
      const sImg = sCtx.createImageData(sWidth, sHeight);

      for (let y = 0; y < sHeight; y++) {
        const phi = (y / sHeight) * Math.PI;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        for (let x = 0; x < sWidth; x++) {
          const theta = (x / sWidth) * Math.PI * 2;
          const px = sinPhi * Math.cos(theta);
          const py = cosPhi;
          const pz = sinPhi * Math.sin(theta);

          // Cellular granulation using ridged/abs noise
          const cells = ridgedFbm3D(noiseCells, px * 8.5, py * 8.5, pz * 8.5, 3, 2.0, 0.55);
          const turb = fbm3D(noiseTurb, px * 18.0, py * 18.0, pz * 18.0, 2, 2.0, 0.4) * 0.15;
          const val = clamp(cells + turb, 0, 1);

          const idx = (y * sWidth + x) * 4;
          const byteVal = Math.round(val * 255);
          sImg.data[idx] = byteVal;
          sImg.data[idx + 1] = byteVal;
          sImg.data[idx + 2] = byteVal;
          sImg.data[idx + 3] = 255;
        }
      }

      sCtx.putImageData(sImg, 0, 0);
      surfaceTex = new THREE.CanvasTexture(sCanvas);
      surfaceTex.colorSpace = THREE.SRGBColorSpace;
      surfaceTex.wrapS = THREE.RepeatWrapping;
      surfaceTex.wrapT = THREE.ClampToEdgeWrapping;
      textureCache.set(cacheKeySurface, surfaceTex);
    }
  }

  // 2. Organic Billboard Corona Sprite Map
  const cSize = 256;
  const cCanvas = createOffscreenCanvas(cSize, cSize);
  let coronaTex: THREE.CanvasTexture | null = null;

  if (cCanvas) {
    const cCtx = cCanvas.getContext("2d");
    if (cCtx) {
      const cImg = cCtx.createImageData(cSize, cSize);
      const center = cSize / 2;
      const maxR = cSize / 2;
      const rnd = createLcg(seed + 404);

      for (let y = 0; y < cSize; y++) {
        const dy = y - center;
        for (let x = 0; x < cSize; x++) {
          const dx = x - center;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const normDist = dist / maxR;

          if (normDist >= 1.0) {
            continue;
          }

          const angle = Math.atan2(dy, dx);
          // Subtle organic asymmetry: 5 soft convective lobes
          const lobes = Math.sin(angle * 5.0 + rnd() * 0.5) * 0.08 + Math.cos(angle * 3.0) * 0.05;
          const effectiveDist = clamp(normDist * (1.0 + lobes), 0, 1);

          // Soft exponential falloff
          const alpha = Math.pow(1.0 - effectiveDist, 2.6);

          const idx = (y * cSize + x) * 4;
          // Warm solar corona gradient: white-gold near core, amber at perimeter
          const r = Math.round(lerp(254, 245, effectiveDist));
          const g = Math.round(lerp(245, 175, effectiveDist));
          const b = Math.round(lerp(215, 35, effectiveDist));

          cImg.data[idx] = r;
          cImg.data[idx + 1] = g;
          cImg.data[idx + 2] = b;
          cImg.data[idx + 3] = clamp(Math.round(alpha * 255), 0, 255);
        }
      }

      cCtx.putImageData(cImg, 0, 0);
      coronaTex = new THREE.CanvasTexture(cCanvas);
      coronaTex.colorSpace = THREE.SRGBColorSpace;
      textureCache.set(cacheKeyCorona, coronaTex);
    }
  }

  return { surface: surfaceTex, corona: coronaTex };
}

/**
 * Cleanly disposes all procedural canvas textures in the cache.
 */
export function disposeAllCelestialTextures(): void {
  for (const texture of textureCache.values()) {
    texture.dispose();
  }
  textureCache.clear();
}
