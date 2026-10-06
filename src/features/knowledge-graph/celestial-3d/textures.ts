import * as THREE from "three";

/**
 * Deterministic pseudo-random LCG for repeatable procedural textures.
 */
function createLcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Simple deterministic 2D permutation table for gradient/value noise.
 */
function createNoise2D(seed: number) {
  const rnd = createLcg(seed);
  const p = new Uint8Array(512);
  const permutation = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    permutation[i] = i;
  }
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = permutation[i]!;
    permutation[i] = permutation[j]!;
    permutation[j] = tmp;
  }
  for (let i = 0; i < 512; i++) {
    p[i] = permutation[i & 255]!;
  }

  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (t: number, a: number, b: number) => a + t * (b - a);
  const grad = (hash: number, x: number, y: number) => {
    const h = hash & 3;
    const u = h === 0 || h === 1 ? x : y;
    const v = h === 0 || h === 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  };

  return (x: number, y: number): number => {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = fade(xf);
    const v = fade(yf);

    const aa = p[p[X]! + Y]!;
    const ab = p[p[X]! + Y + 1]!;
    const ba = p[p[X + 1]! + Y]!;
    const bb = p[p[X + 1]! + Y + 1]!;

    return lerp(
      v,
      lerp(u, grad(aa, xf, yf), grad(ba, xf - 1, yf)),
      lerp(u, grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1))
    );
  };
}

/**
 * Multi-octave fractal Brownian motion (fBm) noise.
 */
function fbm2D(
  noise: (x: number, y: number) => number,
  x: number,
  y: number,
  octaves = 4,
  lacunarity = 2.0,
  gain = 0.5
): number {
  let total = 0;
  let amplitude = 1;
  let frequency = 1;
  let max = 0;
  for (let i = 0; i < octaves; i++) {
    total += noise(x * frequency, y * frequency) * amplitude;
    max += amplitude;
    frequency *= lacunarity;
    amplitude *= gain;
  }
  return total / max;
}

// Global texture cache so textures are generated only once per seed
const textureCache = new Map<string, THREE.CanvasTexture>();

function createOffscreenCanvas(width: number, height: number): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * Generates procedural diffuse & bump maps for Rocky World.
 */
export function createRockyTextures(seed = 42): {
  diffuse: THREE.CanvasTexture | null;
  bump: THREE.CanvasTexture | null;
} {
  const cacheKeyDiff = `rocky-diff-${seed}`;
  const cacheKeyBump = `rocky-bump-${seed}`;
  if (textureCache.has(cacheKeyDiff) && textureCache.has(cacheKeyBump)) {
    return {
      diffuse: textureCache.get(cacheKeyDiff)!,
      bump: textureCache.get(cacheKeyBump)!,
    };
  }

  const width = 512;
  const height = 256;
  const canvas = createOffscreenCanvas(width, height);
  const bumpCanvas = createOffscreenCanvas(width, height);
  if (!canvas || !bumpCanvas) return { diffuse: null, bump: null };

  const ctx = canvas.getContext("2d");
  const bCtx = bumpCanvas.getContext("2d");
  if (!ctx || !bCtx) return { diffuse: null, bump: null };

  const noise = createNoise2D(seed);
  const imgData = ctx.createImageData(width, height);
  const bData = bCtx.createImageData(width, height);

  // Palette: warm copper/rust terra
  // Deep basins: #3d1406
  // Lowlands: #9a3412
  // Highlands: #ea580c
  // Mountain peaks / crater rims: #fdba74
  for (let y = 0; y < height; y++) {
    // Equirectangular mapping: theta from 0 to 2pi, phi from 0 to pi
    const phi = (y / height) * Math.PI;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);

    for (let x = 0; x < width; x++) {
      const theta = (x / width) * Math.PI * 2;
      const nx = sinPhi * Math.cos(theta);
      const ny = sinPhi * Math.sin(theta);
      const nz = cosPhi;

      // 3D coordinate sampling mapped to 2D noise
      const val = fbm2D(noise, (nx + 1.2) * 2.2, (ny + 1.2) * 2.2 + nz * 1.5, 5, 2.1, 0.52);
      const h = Math.max(0, Math.min(1, (val + 0.5) * 0.9));

      const idx = (y * width + x) * 4;

      let r: number, g: number, b: number;
      if (h < 0.35) {
        // Deep basalt basins
        const t = h / 0.35;
        r = 61 + t * 45;
        g = 20 + t * 25;
        b = 6 + t * 10;
      } else if (h < 0.65) {
        // Rust lowlands
        const t = (h - 0.35) / 0.3;
        r = 106 + t * 128;
        g = 45 + t * 43;
        b = 16 + t * 8;
      } else {
        // Luminous highlands & ridges
        const t = (h - 0.65) / 0.35;
        r = 234 + t * 19;
        g = 88 + t * 98;
        b = 24 + t * 92;
      }

      imgData.data[idx] = Math.round(r);
      imgData.data[idx + 1] = Math.round(g);
      imgData.data[idx + 2] = Math.round(b);
      imgData.data[idx + 3] = 255;

      // Grayscale bump height
      const bumpVal = Math.round(h * 255);
      bData.data[idx] = bumpVal;
      bData.data[idx + 1] = bumpVal;
      bData.data[idx + 2] = bumpVal;
      bData.data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  bCtx.putImageData(bData, 0, 0);

  const diffuse = new THREE.CanvasTexture(canvas);
  diffuse.wrapS = THREE.RepeatWrapping;
  diffuse.wrapT = THREE.ClampToEdgeWrapping;

  const bump = new THREE.CanvasTexture(bumpCanvas);
  bump.wrapS = THREE.RepeatWrapping;
  bump.wrapT = THREE.ClampToEdgeWrapping;

  textureCache.set(cacheKeyDiff, diffuse);
  textureCache.set(cacheKeyBump, bump);

  return { diffuse, bump };
}

/**
 * Generates procedural latitudinally banded texture for Gas World.
 */
export function createGasTexture(seed = 101): THREE.CanvasTexture | null {
  const cacheKey = `gas-diff-${seed}`;
  if (textureCache.has(cacheKey)) return textureCache.get(cacheKey)!;

  const width = 512;
  const height = 256;
  const canvas = createOffscreenCanvas(width, height);
  if (!canvas) return null;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const noise = createNoise2D(seed);
  const imgData = ctx.createImageData(width, height);

  // Palette: Neptunian cyan / deep teal / white-aqua ammonia cloud bands
  for (let y = 0; y < height; y++) {
    const lat = y / height; // 0 (North Pole) to 1 (South Pole)

    // Base latitudinal banding frequency
    const bandFreq = Math.sin(lat * Math.PI * 14) * 0.5 + Math.sin(lat * Math.PI * 6) * 0.35;

    for (let x = 0; x < width; x++) {
      const lon = x / width;

      // Zonal turbulence along latitude
      const turbulence = fbm2D(noise, lon * 8.0, lat * 18.0, 4, 2.0, 0.48) * 0.22;
      let val = (bandFreq + turbulence + 1) * 0.5;

      // Embedded Cyclonic Storm Eddy around lat 0.65, lon 0.45
      const dLon = Math.min(Math.abs(lon - 0.45), 1 - Math.abs(lon - 0.45)) * 2;
      const dLat = (lat - 0.65) * 4;
      const stormDist = Math.hypot(dLon * 2.5, dLat);
      if (stormDist < 0.28) {
        val += (1 - stormDist / 0.28) * 0.45;
      }

      val = Math.max(0, Math.min(1, val));
      const idx = (y * width + x) * 4;

      let r: number, g: number, b: number;
      if (val < 0.4) {
        // Deep methane blue
        const t = val / 0.4;
        r = 6 + t * 4;
        g = 35 + t * 45;
        b = 68 + t * 60;
      } else if (val < 0.75) {
        // Vibrant cyan jet stream
        const t = (val - 0.4) / 0.35;
        r = 10 + t * 24;
        g = 80 + t * 102;
        b = 128 + t * 110;
      } else {
        // Ammonia ice clouds
        const t = (val - 0.75) / 0.25;
        r = 34 + t * 160;
        g = 182 + t * 65;
        b = 238 + t * 15;
      }

      imgData.data[idx] = Math.round(r);
      imgData.data[idx + 1] = Math.round(g);
      imgData.data[idx + 2] = Math.round(b);
      imgData.data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  textureCache.set(cacheKey, texture);

  return texture;
}

/**
 * Generates procedural glacial fractures & translucent frost texture for Ice World.
 */
export function createIceTextures(seed = 202): {
  diffuse: THREE.CanvasTexture | null;
  roughness: THREE.CanvasTexture | null;
} {
  const cacheKeyDiff = `ice-diff-${seed}`;
  const cacheKeyRough = `ice-rough-${seed}`;
  if (textureCache.has(cacheKeyDiff) && textureCache.has(cacheKeyRough)) {
    return {
      diffuse: textureCache.get(cacheKeyDiff)!,
      roughness: textureCache.get(cacheKeyRough)!,
    };
  }

  const width = 512;
  const height = 256;
  const canvas = createOffscreenCanvas(width, height);
  const roughCanvas = createOffscreenCanvas(width, height);
  if (!canvas || !roughCanvas) return { diffuse: null, roughness: null };

  const ctx = canvas.getContext("2d");
  const rCtx = roughCanvas.getContext("2d");
  if (!ctx || !rCtx) return { diffuse: null, roughness: null };

  const noise = createNoise2D(seed);
  const imgData = ctx.createImageData(width, height);
  const rData = rCtx.createImageData(width, height);

  // Palette: pale icy cyan / glacial blue-white / violet frost
  for (let y = 0; y < height; y++) {
    const lat = y / height;
    for (let x = 0; x < width; x++) {
      const lon = x / width;

      // Fractured ice noise (sharp ridges)
      const rawNoise = fbm2D(noise, lon * 10.0, lat * 10.0, 5, 2.2, 0.5);
      const ridge = 1 - Math.abs(rawNoise * 2);
      const frost = fbm2D(noise, lon * 24.0, lat * 24.0, 3, 2.0, 0.5);

      const h = Math.max(0, Math.min(1, ridge * 0.7 + frost * 0.3));
      const idx = (y * width + x) * 4;

      // Glacial color gradient
      const r = Math.round(180 + h * 75);
      const g = Math.round(230 + h * 25);
      const b = 255;

      imgData.data[idx] = r;
      imgData.data[idx + 1] = g;
      imgData.data[idx + 2] = b;
      imgData.data[idx + 3] = 255;

      // Roughness map (smooth ice has low roughness, ridges have higher)
      const roughVal = Math.round((0.2 + (1 - h) * 0.4) * 255);
      rData.data[idx] = roughVal;
      rData.data[idx + 1] = roughVal;
      rData.data[idx + 2] = roughVal;
      rData.data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  rCtx.putImageData(rData, 0, 0);

  const diffuse = new THREE.CanvasTexture(canvas);
  diffuse.wrapS = THREE.RepeatWrapping;
  diffuse.wrapT = THREE.ClampToEdgeWrapping;

  const roughness = new THREE.CanvasTexture(roughCanvas);
  roughness.wrapS = THREE.RepeatWrapping;
  roughness.wrapT = THREE.ClampToEdgeWrapping;

  textureCache.set(cacheKeyDiff, diffuse);
  textureCache.set(cacheKeyRough, roughness);

  return { diffuse, roughness };
}

/**
 * Generates procedural solar granulation texture and billboard corona sprite for Luminous Star.
 */
export function createStarTextures(seed = 303): {
  surface: THREE.CanvasTexture | null;
  corona: THREE.CanvasTexture | null;
} {
  const cacheKeySurf = `star-surf-${seed}`;
  const cacheKeyCorona = `star-corona-${seed}`;
  if (textureCache.has(cacheKeySurf) && textureCache.has(cacheKeyCorona)) {
    return {
      surface: textureCache.get(cacheKeySurf)!,
      corona: textureCache.get(cacheKeyCorona)!,
    };
  }

  // 1. Granulation surface texture
  const width = 512;
  const height = 256;
  const canvas = createOffscreenCanvas(width, height);
  const coronaCanvas = createOffscreenCanvas(256, 256);
  if (!canvas || !coronaCanvas) return { surface: null, corona: null };

  const ctx = canvas.getContext("2d");
  const cCtx = coronaCanvas.getContext("2d");
  if (!ctx || !cCtx) return { surface: null, corona: null };

  const noise = createNoise2D(seed);
  const imgData = ctx.createImageData(width, height);

  // Solar granulation: bright golden-white cells with deep amber convective lanes
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = x / width;
      const ny = y / height;
      const val = fbm2D(noise, nx * 14.0, ny * 14.0, 4, 2.0, 0.52);
      const intensity = Math.max(0, Math.min(1, (val + 0.5) * 1.05));
      const idx = (y * width + x) * 4;

      // Radiant gold/amber/white
      const r = 255;
      const g = Math.round(180 + intensity * 75);
      const b = Math.round(60 + intensity * 180);

      imgData.data[idx] = r;
      imgData.data[idx + 1] = g;
      imgData.data[idx + 2] = b;
      imgData.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // 2. Billboard Corona Sprite (soft multi-stop radial glow)
  const center = 128;
  const grad = cCtx.createRadialGradient(center, center, 10, center, center, center);
  grad.addColorStop(0, "rgba(255, 255, 255, 1.0)");
  grad.addColorStop(0.2, "rgba(254, 240, 138, 0.85)");
  grad.addColorStop(0.45, "rgba(245, 158, 11, 0.45)");
  grad.addColorStop(0.75, "rgba(217, 119, 6, 0.12)");
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");

  cCtx.fillStyle = grad;
  cCtx.beginPath();
  cCtx.arc(center, center, center, 0, Math.PI * 2);
  cCtx.fill();

  const surface = new THREE.CanvasTexture(canvas);
  surface.wrapS = THREE.RepeatWrapping;
  surface.wrapT = THREE.ClampToEdgeWrapping;

  const corona = new THREE.CanvasTexture(coronaCanvas);

  textureCache.set(cacheKeySurf, surface);
  textureCache.set(cacheKeyCorona, corona);

  return { surface, corona };
}

/**
 * Disposes all cached procedural textures.
 */
export function disposeAllCelestialTextures(): void {
  for (const texture of textureCache.values()) {
    texture.dispose();
  }
  textureCache.clear();
}
