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

function fbm01(
  noise: (x: number, y: number, z: number) => number,
  x: number,
  y: number,
  z: number,
  octaves = 4,
  lacunarity = 2.0,
  gain = 0.5
): number {
  return clamp(fbm3D(noise, x, y, z, octaves, lacunarity, gain) * 0.5 + 0.5, 0.0, 1.0);
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

      const warpN = createNoise3D(seed + 11);
      const macroN = createNoise3D(seed + 29);
      const flowN = createNoise3D(seed + 47);
      const faculaN = createNoise3D(seed + 73);
      const hotN = createNoise3D(seed + 101);

      for (let y = 0; y < height; y++) {
        const phi = (y / height) * Math.PI;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        for (let x = 0; x < width; x++) {
          const theta = (x / width) * 2 * Math.PI;
          const px = sinPhi * Math.cos(theta);
          const py = cosPhi;
          const pz = sinPhi * Math.sin(theta);

          // 3D fluid domain warp for sweeping organic solar plasma convection
          const wx = fbm3D(warpN, px * 1.8, py * 1.8, pz * 1.8, 3) * 0.42;
          const wy = fbm3D(warpN, px * 1.8 + 4.3, py * 1.8 + 1.7, pz * 1.8 + 8.1, 3) * 0.42;
          const wz = fbm3D(warpN, px * 1.8 + 7.9, py * 1.8 + 5.2, pz * 1.8 + 2.4, 3) * 0.42;
          const qx = px + wx;
          const qy = py + wy;
          const qz = pz + wz;

          // Broader fluid bright regions (solar macro convection flow)
          const macroFlow = fbm3D(macroN, qx * 1.8, qy * 1.8, qz * 1.8, 3);
          const broadBright = smoothstep(0.2, 0.72, macroFlow);

          // Organic fluid meso convection (soft fluid boundaries, no Voronoi tile straight edges)
          const fluidFlow = fbm3D(flowN, qx * 6.5, qy * 6.5, qz * 6.5, 3);

          // Subtle faculae (delicate filamentary magnetic bright ribbons)
          const faculaRidge = 1.0 - Math.abs(faculaN(qx * 9.5, qy * 9.5, qz * 9.5));
          const facula = smoothstep(0.72, 0.95, faculaRidge) * (0.35 + 0.65 * broadBright);

          // Rare irregular hot upwellings
          const hotSpot = smoothstep(0.65, 0.88, fbm3D(hotN, qx * 3.2, qy * 3.2, qz * 3.2, 3));

          // Fluid temperature (minimum 0.38, so no dark black or brown outlines!)
          const temp = clamp(
            0.38 + broadBright * 0.3 + fluidFlow * 0.18 + facula * 0.22 + hotSpot * 0.25,
            0,
            1
          );

          // Colors: Warm glowing amber lane -> rich solar buttercup body -> radiant warm white core
          const laneR = 210,
            laneG = 135,
            laneB = 30;
          const midR = 254,
            midG = 226,
            midB = 75;
          const hotR = 255,
            hotG = 255,
            hotB = 245;

          let r = 0,
            g = 0,
            b = 0;
          if (temp < 0.42) {
            const t = temp / 0.42;
            r = lerp(laneR, midR, t);
            g = lerp(laneG, midR, t);
            b = lerp(laneB, midB, t);
          } else {
            const t = (temp - 0.42) / 0.58;
            r = lerp(midR, hotR, t);
            g = lerp(midG, hotG, t);
            b = lerp(midB, hotB, t);
          }

          const boost = facula * 0.35 + hotSpot * 0.45;
          r = clamp(r + boost * 25, 0, 255);
          g = clamp(g + boost * 25, 0, 255);
          b = clamp(b + boost * 20, 0, 255);

          const idx = (y * width + x) * 4;
          data[idx] = Math.floor(r);
          data[idx + 1] = Math.floor(g);
          data[idx + 2] = Math.floor(b);
          data[idx + 3] = Math.floor(clamp(0.55 + temp * 0.45 + boost * 0.1, 0.55, 1.0) * 255);
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
      // coronaScale = 2.85, so star limb is at rLimb = 2.0 / 2.85 = 0.7018
      const rLimb = 2.0 / 2.85;

      for (let y = 0; y < size; y++) {
        const dy = (y - center) / center;
        for (let x = 0; x < size; x++) {
          const dx = (x - center) / center;
          const r = Math.sqrt(dx * dx + dy * dy);
          if (r >= 1.0) continue;

          const angle = Math.atan2(dy, dx);
          // Altitude above star's spherical limb
          const alt = (r - rLimb) / rLimb;

          // Subtle low-frequency organic asymmetry for scale height
          const lobe =
            1.0 +
            0.18 * Math.sin(2.0 * angle + seed * 0.3) +
            0.12 * Math.cos(3.0 * angle - seed * 0.5) +
            0.08 * Math.sin(angle + seed * 0.7);
          const effAlt = alt / Math.max(0.25, lobe);

          // Circumferential / angular intensity variation (breaks uniform circular ring)
          const baseLimb =
            0.72 +
            0.2 * Math.cos(2.0 * angle + seed * 0.4) +
            0.12 * Math.sin(4.0 * angle - seed * 0.2);

          // 2 localized solar prominences arching out above the limb
          const p1Angle = 1.15;
          const dAng1 = Math.atan2(Math.sin(angle - p1Angle), Math.cos(angle - p1Angle));
          const prom1 =
            0.55 *
            Math.exp(-Math.pow(dAng1 / 0.22, 2)) *
            Math.exp(-Math.pow(Math.max(0, alt) / 0.18, 2));

          const p2Angle = 3.65;
          const dAng2 = Math.atan2(Math.sin(angle - p2Angle), Math.cos(angle - p2Angle));
          const prom2 =
            0.45 *
            Math.exp(-Math.pow(dAng2 / 0.18, 2)) *
            Math.exp(-Math.pow(Math.max(0, alt) / 0.15, 2));

          // Faint secondary thermal puff
          const p3Angle = 5.2;
          const dAng3 = Math.atan2(Math.sin(angle - p3Angle), Math.cos(angle - p3Angle));
          const prom3 =
            0.35 *
            Math.exp(-Math.pow(dAng3 / 0.32, 2)) *
            Math.exp(-Math.pow(Math.max(0, alt) / 0.2, 2));

          let falloff = 0;
          if (alt < 0) {
            falloff = 1.0;
          } else {
            // Softer multi-scale radial falloff with non-uniform limb intensity
            const envInner = Math.exp(-effAlt / 0.09) * baseLimb * 0.92;
            const envOuter = Math.exp(-effAlt / 0.25) * (baseLimb * 0.35);
            // Window falloff to ZERO before sprite quad boundary r=1.0 to eliminate circular cutoff!
            const window = smoothstep(1.0, 0.8, r);
            falloff = clamp((envInner + envOuter + prom1 + prom2 + prom3) * window, 0, 1);
          }

          if (falloff <= 0.002) continue;

          // Warm radiant white-gold at limb -> rich solar yellow -> warm deep amber falloff
          const colR = lerp(255, 220, smoothstep(0.0, 0.35, Math.max(0, effAlt)));
          const colG = lerp(230, 115, smoothstep(0.0, 0.35, Math.max(0, effAlt)));
          const colB = lerp(95, 8, smoothstep(0.0, 0.35, Math.max(0, effAlt)));

          const idx = (y * size + x) * 4;
          data[idx] = Math.floor(colR);
          data[idx + 1] = Math.floor(colG);
          data[idx + 2] = Math.floor(colB);
          data[idx + 3] = Math.floor(falloff * 255);
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

      const warpN = createNoise3D(seed + 101);
      const upwellN = createNoise3D(seed + 127);
      const mesoN = createNoise3D(seed + 149);
      const microN = createNoise3D(seed + 173);

      for (let y = 0; y < height; y++) {
        const phi = (y / height) * Math.PI;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        for (let x = 0; x < width; x++) {
          const theta = (x / width) * 2 * Math.PI;
          const px = sinPhi * Math.cos(theta);
          const py = cosPhi;
          const pz = sinPhi * Math.sin(theta);

          // Gentle smooth macro thermal domain warp
          const wx = fbm3D(warpN, px * 1.2, py * 1.2, pz * 1.2, 3);
          const wy = fbm3D(warpN, px * 1.2 + 3.1, py * 1.2 + 1.7, pz * 1.2 + 4.9, 3);
          const wz = fbm3D(warpN, px * 1.2 + 2.3, py * 1.2 + 5.1, pz * 1.2 + 2.8, 3);
          const qx = px + wx * 0.22;
          const qy = py + wy * 0.22;
          const qz = pz + wz * 0.22;

          // Broad smooth thermal upwelling - vast white-hot regions
          const broadThermal = fbm3D(upwellN, qx * 1.5, qy * 1.5, qz * 1.5, 3) * 0.16;

          // Faint meso-scale variation visible in close-up
          const mesoTurb = fbm3D(mesoN, qx * 5.5, qy * 5.5, qz * 5.5, 3) * 0.12;

          // Fine stellar micro-granulation
          const micro = fbm3D(microN, qx * 16.0, qy * 16.0, qz * 16.0, 2) * 0.06;

          // Predominantly near-white photosphere (temp in 0.65 - 1.0)
          const temp = clamp(0.72 + broadThermal + mesoTurb + micro, 0.0, 1.0);

          // Colors:
          // Cooler pockets: Extremely pale icy cyan [212, 242, 253] (R >= 210, G >= 240)
          // Mid: Radiant azure-white [242, 250, 255]
          // Peak: Pure incandescent white [255, 255, 255]
          const cyanR = 212,
            cyanG = 242,
            cyanB = 253;
          const azureWhiteR = 242,
            azureWhiteG = 250,
            azureWhiteB = 255;
          const peakR = 255,
            peakG = 255,
            peakB = 255;

          let r = 0,
            g = 0,
            b = 0;
          if (temp < 0.72) {
            const t = temp / 0.72;
            r = lerp(cyanR, azureWhiteR, t);
            g = lerp(cyanG, azureWhiteG, t);
            b = lerp(cyanB, azureWhiteB, t);
          } else {
            const t = (temp - 0.72) / 0.28;
            r = lerp(azureWhiteR, peakR, t);
            g = lerp(azureWhiteR, peakG, t);
            b = lerp(azureWhiteR, peakB, t);
          }

          const idx = (y * width + x) * 4;
          data[idx] = Math.floor(r);
          data[idx + 1] = Math.floor(g);
          data[idx + 2] = Math.floor(b);
          data[idx + 3] = Math.floor(clamp(0.85 + broadThermal * 0.15, 0, 1) * 255);
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
      // coronaScale = 2.45, so star limb is at rLimb = 2.0 / 2.45 = 0.8163
      const rLimb = 2.0 / 2.45;

      for (let y = 0; y < size; y++) {
        const dy = (y - center) / center;
        for (let x = 0; x < size; x++) {
          const dx = (x - center) / center;
          const r = Math.sqrt(dx * dx + dy * dy);
          if (r >= 1.0) continue;

          const angle = Math.atan2(dy, dx);
          const alt = (r - rLimb) / rLimb;

          // Low-frequency asymmetry for non-circular envelope
          const lobe =
            1.0 +
            0.14 * Math.cos(3.0 * angle + seed * 0.25) +
            0.08 * Math.sin(5.0 * angle - seed * 0.4);
          const effAlt = alt / Math.max(0.2, lobe);

          // Circumferential intensity modulation (no uniform stroke/ring)
          const baseLimb =
            0.78 +
            0.18 * Math.sin(2.0 * angle + seed * 0.6) +
            0.08 * Math.cos(4.0 * angle - seed * 0.15);

          // Localized compact coronal energy plumes
          const f1Angle = 2.1;
          const dAng1 = Math.atan2(Math.sin(angle - f1Angle), Math.cos(angle - f1Angle));
          const flare1 =
            0.38 *
            Math.exp(-Math.pow(dAng1 / 0.18, 2)) *
            Math.exp(-Math.pow(Math.max(0, alt) / 0.11, 2));

          const f2Angle = 5.45;
          const dAng2 = Math.atan2(Math.sin(angle - f2Angle), Math.cos(angle - f2Angle));
          const flare2 =
            0.32 *
            Math.exp(-Math.pow(dAng2 / 0.15, 2)) *
            Math.exp(-Math.pow(Math.max(0, alt) / 0.1, 2));

          let falloff = 0;
          if (alt < 0) {
            falloff = 1.0;
          } else {
            // Intense, compact white/cyan envelope with zero gray stroke appearance
            const envInner = Math.exp(-effAlt / 0.065) * baseLimb * 0.95;
            const envOuter = Math.exp(-effAlt / 0.18) * (baseLimb * 0.28);
            // Window falloff to ZERO before sprite quad boundary r=1.0 to eliminate circular cutoff!
            const window = smoothstep(1.0, 0.88, r);
            falloff = clamp((envInner + envOuter + flare1 + flare2) * window, 0, 1);
          }

          if (falloff <= 0.002) continue;

          // Electric pale cyan at limb -> vibrant electric cyan -> soft luminous azure (zero gray appearance)
          const colR = lerp(205, 45, smoothstep(0.0, 0.22, Math.max(0, effAlt)));
          const colG = lerp(242, 185, smoothstep(0.0, 0.22, Math.max(0, effAlt)));
          const colB = 255;

          const idx = (y * size + x) * 4;
          data[idx] = Math.floor(colR);
          data[idx + 1] = Math.floor(colG);
          data[idx + 2] = Math.floor(colB);
          data[idx + 3] = Math.floor(falloff * 255);
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

      const warpN = createNoise3D(seed + 211);
      const plumeN = createNoise3D(seed + 233);
      const mesoN = createNoise3D(seed + 257);
      const hotSpotN = createNoise3D(seed + 281);

      for (let y = 0; y < height; y++) {
        const phi = (y / height) * Math.PI;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        for (let x = 0; x < width; x++) {
          const theta = (x / width) * 2 * Math.PI;
          const px = sinPhi * Math.cos(theta);
          const py = cosPhi;
          const pz = sinPhi * Math.sin(theta);

          // Deep fluid domain warping for giant billowing convection
          const wx = fbm3D(warpN, px * 1.1, py * 1.1, pz * 1.1, 4);
          const wy = fbm3D(warpN, px * 1.1 + 4.2, py * 1.1 + 1.8, pz * 1.1 + 6.5, 4);
          const wz = fbm3D(warpN, px * 1.1 + 2.7, py * 1.1 + 5.3, pz * 1.1 + 3.1, 4);
          const qx = px + wx * 0.55;
          const qy = py + wy * 0.55;
          const qz = pz + wz * 0.55;

          // Very large low-frequency plasma convection (NO Voronoi, NO cracks, NO fissure grids)
          // Map noise to positive [0, 1] range to prevent temperature drops into black
          const macroPlumes = (fbm3D(plumeN, qx * 1.3, qy * 1.3, qz * 1.3, 3) + 1.0) * 0.5;

          // Meso-scale plasma churning
          const mesoFlow = fbm3D(mesoN, qx * 2.8, qy * 2.8, qz * 2.8, 2) * 0.12;

          // A few localized amber hot regions (prominence footprints / deep upwellings)
          const hotSpot = smoothstep(
            0.55,
            0.88,
            (fbm3D(hotSpotN, qx * 1.6, qy * 1.6, qz * 1.6, 2) + 1.0) * 0.5
          );

          // Soft dark crimson sinking lanes (valleys of macroPlumes)
          // Minimum temp is strictly bounded to 0.24 - dusky crimson, NEVER black/obsidian crust
          const temp = clamp(0.24 + macroPlumes * 0.48 + mesoFlow + hotSpot * 0.28, 0.22, 1.0);

          // Colors:
          // Dusky crimson sinking lane [130, 22, 22]
          // Deep garnet midtone [185, 38, 18]
          // Burning red-orange plume body [232, 75, 16]
          // Molten amber hot regions [255, 175, 45]
          const laneR = 130,
            laneG = 22,
            laneB = 22;
          const garnetR = 185,
            garnetG = 38,
            garnetB = 18;
          const orangeR = 232,
            orangeG = 75,
            orangeB = 16;
          const amberR = 255,
            amberG = 175,
            amberB = 45;

          let r = 0,
            g = 0,
            b = 0;
          if (temp < 0.38) {
            const t = temp / 0.38;
            r = lerp(laneR, garnetR, t);
            g = lerp(laneG, garnetG, t);
            b = lerp(laneB, garnetB, t);
          } else if (temp < 0.76) {
            const t = (temp - 0.38) / 0.38;
            r = lerp(garnetR, orangeR, t);
            g = lerp(garnetG, orangeR, t);
            b = lerp(garnetB, orangeB, t);
          } else {
            const t = (temp - 0.76) / 0.24;
            r = lerp(orangeR, amberR, t);
            g = lerp(orangeG, amberG, t);
            b = lerp(orangeB, amberB, t);
          }

          const idx = (y * width + x) * 4;
          data[idx] = Math.floor(r);
          data[idx + 1] = Math.floor(g);
          data[idx + 2] = Math.floor(b);
          data[idx + 3] = Math.floor(clamp(0.55 + temp * 0.45, 0.55, 1.0) * 255);
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
      // coronaScale = 3.6, so star limb is at rLimb = 2.0 / 3.6 = 0.5556
      const rLimb = 2.0 / 3.6;

      for (let y = 0; y < size; y++) {
        const dy = (y - center) / center;
        for (let x = 0; x < size; x++) {
          const dx = (x - center) / center;
          const r = Math.sqrt(dx * dx + dy * dy);
          if (r >= 1.0) continue;

          const angle = Math.atan2(dy, dx);
          // Altitude above star's spherical limb
          const alt = (r - rLimb) / rLimb;

          // Broad asymmetric billowing envelope lobes
          const lobe1 = Math.sin(angle * 2.0 + seed * 0.22) * 0.22;
          const lobe2 = Math.cos(angle * 3.0 - seed * 0.18) * 0.14;
          const lobe = 1.0 + lobe1 + lobe2;
          const effAlt = alt / Math.max(0.25, lobe);

          // Circumferential intensity modulation (prevents uniform concentric ring)
          const baseLimb =
            0.72 +
            0.18 * Math.cos(2.0 * angle + seed * 0.35) +
            0.12 * Math.sin(3.0 * angle - seed * 0.15);

          let falloff = 0;
          if (alt < 0) {
            falloff = 1.0;
          } else {
            // Visibly larger diffuse red stellar envelope with non-uniform circumferential falloff
            const envInner = Math.exp(-effAlt / 0.13) * baseLimb * 0.88;
            const envOuter = Math.exp(-effAlt / 0.36) * (baseLimb * 0.38);
            // Window falloff to ZERO before sprite quad boundary r=1.0 to eliminate circular cutoff!
            const window = smoothstep(1.0, 0.78, r);
            falloff = clamp((envInner + envOuter) * window, 0, 1);
          }

          if (falloff <= 0.002) continue;

          // Fiery garnet-orange at limb -> deep red-orange -> dusky crimson outer haze
          const colR = lerp(255, 165, smoothstep(0.0, 0.4, Math.max(0, effAlt)));
          const colG = lerp(105, 18, smoothstep(0.0, 0.4, Math.max(0, effAlt)));
          const colB = lerp(18, 8, smoothstep(0.0, 0.4, Math.max(0, effAlt)));

          const idx = (y * size + x) * 4;
          data[idx] = Math.floor(colR);
          data[idx + 1] = Math.floor(colG);
          data[idx + 2] = Math.floor(colB);
          data[idx + 3] = Math.floor(falloff * 255);
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

    const macroN = createNoise3D(seed);
    const plateN = createNoise3D(seed + 89);
    const ridgeN = createNoise3D(seed + 173);
    const hotspotN = createNoise3D(seed + 269);
    const fissureN = createNoise3D(seed + 353);
    const microN = createNoise3D(seed + 439);

    for (let y = 0; y < height; y++) {
      const phi = (y / height) * Math.PI;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      for (let x = 0; x < width; x++) {
        const theta = (x / width) * 2 * Math.PI;
        const px = sinPhi * Math.cos(theta);
        const py = cosPhi;
        const pz = sinPhi * Math.sin(theta);

        // 1. MACRO: Basalt provinces vs highland tectonic shields
        const plate = fbm01(plateN, px * 1.5, py * 1.5, pz * 1.5, 3);
        const shield = fbm01(macroN, px * 2.2, py * 2.2, pz * 2.2, 4);

        // 2. MESO: Tectonic fault scarps & crater rims
        const scarps = ridgedFbm3D(ridgeN, px * 5.2, py * 5.2, pz * 5.2, 3) * 0.28;
        const plains = fbm01(macroN, px * 7.5, py * 7.5, pz * 7.5, 2) * 0.12;
        const craterField = ridgedFbm3D(ridgeN, px * 3.6, py * 3.6, pz * 3.6, 2);
        const craterRims = smoothstep(0.68, 0.85, craterField) * 0.22;

        // 3. MICRO: Regolith roughness noise
        const micro = fbm01(microN, px * 18.0, py * 18.0, pz * 18.0, 2) * 0.05;

        // Total elevation (mostly basalt lowlands and rugged highland shields)
        const elevation = clamp(
          plate * 0.4 + shield * 0.26 + scarps + craterRims + plains + micro,
          0.0,
          1.0
        );

        // 4. LAVA AS ACCENT: Sparse active volcanic hotspot provinces (15-25% coverage)
        const hotspot = fbm01(hotspotN, px * 1.6, py * 1.6, pz * 1.6, 3);
        // Activity strictly confined to isolated regional hotspots
        const isHotProvince = smoothstep(0.58, 0.76, hotspot);

        let lavaHeat = 0;
        if (isHotProvince > 0.01) {
          // Sharp, narrow fault fissures
          const rawFissure = ridgedFbm3D(fissureN, px * 9.0, py * 9.0, pz * 9.0, 3);
          const fissure = Math.pow(smoothstep(0.55, 0.88, rawFissure), 3.0);

          // Deep caldera vents
          const calderaVent = smoothstep(0.68, 0.88, craterField);

          lavaHeat = clamp((fissure * 2.2 + calderaVent * 1.0) * isHotProvince, 0.0, 1.0);
        }

        // 5. COLORS: Predominantly dark matte basalt (75-85% quiet rock)
        // Deep basalt mare / sinks:
        const basaltR = 42,
          basaltG = 44,
          basaltB = 50;
        // Weathered volcanic plain midtone:
        const plainR = 72,
          plainG = 66,
          plainB = 62;
        // Ancient volcanic highland / muted copper-brown rock:
        const highR = 120,
          highG = 96,
          highB = 80;

        let r = 0,
          g = 0,
          b = 0;
        if (elevation < 0.45) {
          const t = elevation / 0.45;
          r = lerp(basaltR, plainR, t);
          g = lerp(basaltG, plainG, t);
          b = lerp(basaltB, plainB, t);
        } else {
          const t = (elevation - 0.45) / 0.55;
          r = lerp(plainR, highR, t);
          g = lerp(plainG, highG, t);
          b = lerp(plainB, highB, t);
        }

        // Lava accent overlay
        if (lavaHeat > 0.03) {
          // Rim: dark cooling garnet crust
          // Mid: burning volcanic red-orange
          // Peak: incandescent molten white-gold core
          const crustR = 175,
            crustG = 42,
            crustB = 18;
          const magmaR = 255,
            magmaG = 125,
            magmaB = 24;
          const coreR = 255,
            coreG = 230,
            coreB = 140;

          if (lavaHeat < 0.5) {
            const t = lavaHeat / 0.5;
            r = lerp(r, lerp(crustR, magmaR, t), smoothstep(0.03, 0.35, lavaHeat));
            g = lerp(g, lerp(crustG, magmaG, t), smoothstep(0.03, 0.35, lavaHeat));
            b = lerp(b, lerp(crustB, magmaB, t), smoothstep(0.03, 0.35, lavaHeat));
          } else {
            const t = (lavaHeat - 0.5) / 0.5;
            r = lerp(magmaR, coreR, t);
            g = lerp(magmaG, coreG, t);
            b = lerp(magmaB, coreB, t);
          }
        }

        const idx = (y * width + x) * 4;
        diffImg.data[idx] = Math.floor(r);
        diffImg.data[idx + 1] = Math.floor(g);
        diffImg.data[idx + 2] = Math.floor(b);
        diffImg.data[idx + 3] = 255;

        // Bump map: rugged basalt relief
        const bumpVal = Math.floor(elevation * 255);
        bumpImg.data[idx] = bumpVal;
        bumpImg.data[idx + 1] = bumpVal;
        bumpImg.data[idx + 2] = bumpVal;
        bumpImg.data[idx + 3] = 255;

        // Roughness: mostly high matte basalt rock (0.86-0.95), lower on molten lava
        const rockRough = lerp(225, 242, elevation);
        const finalRough = lerp(rockRough, 95, lavaHeat);
        roughImg.data[idx] = Math.floor(finalRough);
        roughImg.data[idx + 1] = Math.floor(finalRough);
        roughImg.data[idx + 2] = Math.floor(finalRough);
        roughImg.data[idx + 3] = 255;

        // Emissive map: strictly hot geological features
        if (lavaHeat > 0.05) {
          const emT = (lavaHeat - 0.05) / 0.95;
          const emR = lerp(210, 255, emT);
          const emG = lerp(55, 230, Math.pow(emT, 1.3));
          const emB = lerp(15, 130, Math.pow(emT, 2.0));
          emissImg.data[idx] = Math.floor(emR);
          emissImg.data[idx + 1] = Math.floor(emG);
          emissImg.data[idx + 2] = Math.floor(emB);
        } else {
          emissImg.data[idx] = 0;
          emissImg.data[idx + 1] = 0;
          emissImg.data[idx + 2] = 0;
        }
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

    const plateauN = createNoise3D(seed + 41);
    const basinN = createNoise3D(seed + 127);
    const scarpN = createNoise3D(seed + 211);
    const duneN = createNoise3D(seed + 293);
    const channelN = createNoise3D(seed + 389);
    const microN = createNoise3D(seed + 467);

    for (let y = 0; y < height; y++) {
      const phi = (y / height) * Math.PI;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      for (let x = 0; x < width; x++) {
        const theta = (x / width) * 2 * Math.PI;
        const px = sinPhi * Math.cos(theta);
        const py = cosPhi;
        const pz = sinPhi * Math.sin(theta);

        // 1. DOMAIN WARPING FOR ORGANIC TECTONIC CONTOURS (NO LATITUDE BANDING!)
        const wx = fbm3D(plateauN, px * 1.2, py * 1.2, pz * 1.2, 3);
        const wy = fbm3D(plateauN, px * 1.2 + 2.8, py * 1.2 + 1.9, pz * 1.2 + 4.3, 3);
        const wz = fbm3D(plateauN, px * 1.2 + 3.5, py * 1.2 + 4.1, pz * 1.2 + 1.6, 3);
        const qx = px + wx * 0.28;
        const qy = py + wy * 0.28;
        const qz = pz + wz * 0.28;

        // 2. MACRO: Stepped plateaus / mesas crossing lat/long freely
        const rawPlateau = fbm01(plateauN, qx * 1.6, qy * 1.6, qz * 1.6, 4);
        const step = Math.floor(rawPlateau * 3.5) / 3.5;
        const frac = rawPlateau * 3.5 - step;
        const plateauElev = step + smoothstep(0.18, 0.42, frac) * (1.0 / 3.5);

        // Ancient sunken basins
        const basinField = fbm01(basinN, qx * 1.3, qy * 1.3, qz * 1.3, 3);
        const inBasin = smoothstep(0.58, 0.78, basinField);

        // 3. MESO: Escarpments, dry channel networks & local dune fields
        const scarps = ridgedFbm3D(scarpN, qx * 4.5, qy * 4.5, qz * 4.5, 3) * 0.2;

        // Dunes exist strictly in local basin patches (never wrap around the planet)
        const dunePatch =
          smoothstep(0.6, 0.82, fbm01(duneN, qx * 2.8, qy * 2.8, qz * 2.8, 2)) * inBasin;
        const windAngle = fbm3D(duneN, px * 0.6, py * 0.6, pz * 0.6, 2) * Math.PI * 2;
        const duneCoord = px * Math.cos(windAngle) + py * Math.sin(windAngle) + pz * 0.4;
        const duneRipples = (Math.sin(duneCoord * 32.0) * 0.5 + 0.5) * dunePatch * 0.16;

        // Dendritic dry channels / arroyos
        const channelRidge = ridgedFbm3D(channelN, qx * 6.5, qy * 6.5, qz * 6.5, 3);
        const channelCut = smoothstep(0.76, 0.96, channelRidge) * 0.16;

        // 4. MICRO: Sand / regolith grain
        const micro = fbm01(microN, px * 16.0, py * 16.0, pz * 16.0, 2) * 0.05;

        const elevation = clamp(
          plateauElev * 0.62 + scarps + duneRipples - channelCut + micro - inBasin * 0.18,
          0.0,
          1.0
        );

        // 5. PALETTE: Sandstone, ochre, muted copper, pale tan, gray-brown
        // Dark mineral escarpments:
        const darkR = 112,
          darkG = 82,
          darkB = 66;
        // Warm ochre / weathered sandstone midtone:
        const ochreR = 188,
          ochreG = 138,
          ochreB = 96;
        // Pale plateau cap / desert tan:
        const tanR = 218,
          tanG = 182,
          tanB = 142;
        // Salt pan / alkali basin floor:
        const alkaliR = 232,
          alkaliG = 226,
          alkaliB = 212;

        let r = 0,
          g = 0,
          b = 0;
        if (inBasin > 0.72 && elevation < 0.28) {
          // Alkali / salt flat basin floor
          const t = clamp((inBasin * (0.28 - elevation)) / 0.28, 0, 1);
          r = lerp(ochreR, alkaliR, t);
          g = lerp(ochreG, alkaliG, t);
          b = lerp(ochreB, alkaliB, t);
        } else if (elevation < 0.45) {
          const t = elevation / 0.45;
          r = lerp(darkR, ochreR, t);
          g = lerp(darkG, ochreG, t);
          b = lerp(darkB, ochreB, t);
        } else {
          const t = (elevation - 0.45) / 0.55;
          r = lerp(ochreR, tanR, t);
          g = lerp(ochreG, tanG, t);
          b = lerp(ochreB, tanB, t);
        }

        // Dune tint in dune patches
        if (duneRipples > 0.02) {
          const duneTintR = 215,
            duneTintG = 158,
            duneTintB = 112;
          const dt = clamp(duneRipples / 0.16, 0, 1);
          r = lerp(r, duneTintR, dt * 0.4);
          g = lerp(g, duneTintG, dt * 0.4);
          b = lerp(b, duneTintB, dt * 0.4);
        }

        const idx = (y * width + x) * 4;
        diffImg.data[idx] = Math.floor(r);
        diffImg.data[idx + 1] = Math.floor(g);
        diffImg.data[idx + 2] = Math.floor(b);
        diffImg.data[idx + 3] = 255;

        // Bump map
        const bumpVal = Math.floor(elevation * 240);
        bumpImg.data[idx] = bumpVal;
        bumpImg.data[idx + 1] = bumpVal;
        bumpImg.data[idx + 2] = bumpVal;
        bumpImg.data[idx + 3] = 255;

        // Roughness: strictly high matte sand/mineral (0.88-0.96)
        const roughVal = Math.floor(lerp(226, 246, elevation));
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
  readonly bump?: THREE.CanvasTexture;
}

export function createLifeWorldTextures(
  seed: number,
  lod: GeometryLOD = "focus"
): LifeWorldTextures {
  const surfKey = `life:surface:${seed}:${lod}`;
  const cloudKey = `life:clouds:${seed}:${lod}`;
  const roughKey = `life:rough:${seed}:${lod}`;
  const bumpKey = `life:bump:${seed}:${lod}`;

  let surface = textureCache.get(surfKey);
  let clouds = textureCache.get(cloudKey);
  let roughness = textureCache.get(roughKey);
  let bump = textureCache.get(bumpKey);

  if (!surface || !clouds || !roughness || !bump) {
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

    const bumpCanvas = document.createElement("canvas");
    bumpCanvas.width = width;
    bumpCanvas.height = height;
    const bumpCtx = bumpCanvas.getContext("2d")!;
    const bumpImg = bumpCtx.createImageData(width, height);

    const cloudCanvas = document.createElement("canvas");
    cloudCanvas.width = width;
    cloudCanvas.height = height;
    const cloudCtx = cloudCanvas.getContext("2d")!;
    const cloudImg = cloudCtx.createImageData(width, height);

    const continentN = createNoise3D(seed + 10);
    const islandN = createNoise3D(seed + 73);
    const biomeN = createNoise3D(seed + 151);
    const mountainN = createNoise3D(seed + 229);
    const cloudN1 = createNoise3D(seed + 337);
    const cloudN2 = createNoise3D(seed + 419);

    for (let y = 0; y < height; y++) {
      const phi = (y / height) * Math.PI;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      for (let x = 0; x < width; x++) {
        const theta = (x / width) * 2 * Math.PI;
        const px = sinPhi * Math.cos(theta);
        const py = cosPhi;
        const pz = sinPhi * Math.sin(theta);

        // 1. CONTINENTS & OCEANS SEGMENTATION
        const wx = fbm3D(continentN, px * 1.1, py * 1.1, pz * 1.1, 3);
        const wy = fbm3D(continentN, px * 1.1 + 4.1, py * 1.1 + 2.3, pz * 1.1 + 6.7, 3);
        const wz = fbm3D(continentN, px * 1.1 + 1.8, py * 1.1 + 5.5, pz * 1.1 + 3.2, 3);
        const qx = px + wx * 0.35;
        const qy = py + wy * 0.35;
        const qz = pz + wz * 0.35;

        // Large macro continents (3-4 distinct major landmasses)
        const continent = fbm01(continentN, qx * 1.35, qy * 1.35, qz * 1.35, 4);
        // Archipelagos and coastal islands
        const islands =
          smoothstep(0.7, 0.88, fbm01(islandN, px * 4.2, py * 4.2, pz * 4.2, 3)) * 0.18;
        const landMask = continent + islands;

        const isLand = landMask > 0.52;
        let r = 0,
          g = 0,
          b = 0;
        let rough = 0;
        let bumpHeight = 0;

        if (!isLand) {
          // OCEANS: Deep navy / ocean blue / teal continental shelf
          const depth = clamp(landMask / 0.52, 0, 1);
          // Abyssal navy -> open royal ocean -> continental shelf teal
          const abyssalR = 14,
            abyssalG = 34,
            abyssalB = 76;
          const oceanR = 20,
            oceanG = 56,
            oceanB = 115;
          const shelfR = 32,
            shelfG = 120,
            shelfB = 145;

          if (depth < 0.7) {
            const t = depth / 0.7;
            r = lerp(abyssalR, oceanR, t);
            g = lerp(abyssalG, oceanG, t);
            b = lerp(abyssalB, oceanB, t);
          } else {
            const t = (depth - 0.7) / 0.3;
            r = lerp(oceanR, shelfR, t);
            g = lerp(oceanG, shelfG, t);
            b = lerp(oceanB, shelfB, t);
          }
          // Controlled ocean roughness (NO mirror glass, NO giant white circular highlight!)
          rough = 165; // ~0.65 soft natural sheen
          bumpHeight = 35; // flat sea level
        } else {
          // LANDMASSES: Forests, teals, savannas, mountains, snow
          const elev = clamp((landMask - 0.52) / 0.48, 0, 1);
          const biome = fbm01(biomeN, qx * 3.8, qy * 3.8, qz * 3.8, 3);
          const mountain = ridgedFbm3D(mountainN, qx * 5.2, qy * 5.2, qz * 5.2, 3);

          if (elev < 0.42) {
            // Lowlands: Forest green & coastal teal-green
            const forestR = 36,
              forestG = 100,
              forestB = 58;
            const tealR = 30,
              tealG = 125,
              tealB = 105;
            const t = clamp(biome, 0, 1);
            r = lerp(forestR, tealR, t);
            g = lerp(forestG, tealG, t);
            b = lerp(forestB, tealB, t);
          } else if (elev < 0.72) {
            // Interior Savanna & temperate hills
            const savannaR = 145,
              savannaG = 134,
              savannaB = 86;
            const hillsR = 66,
              hillsG = 116,
              hillsB = 68;
            const t = clamp(biome, 0, 1);
            r = lerp(hillsR, savannaR, t);
            g = lerp(hillsG, savannaG, t);
            b = lerp(hillsB, savannaB, t);
          } else {
            // Cordilleras & Snow Peaks
            const rockR = 115,
              rockG = 106,
              rockB = 98;
            const snowR = 238,
              snowG = 245,
              snowB = 252;
            const snowT = smoothstep(0.62, 0.86, mountain * 0.6 + elev * 0.4);
            r = lerp(rockR, snowR, snowT);
            g = lerp(rockG, snowG, snowT);
            b = lerp(rockB, snowB, snowT);
          }

          rough = 235; // ~0.92 matte terrain
          bumpHeight = Math.floor(lerp(60, 255, elev * 0.6 + mountain * 0.4));
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

        bumpImg.data[idx] = bumpHeight;
        bumpImg.data[idx + 1] = bumpHeight;
        bumpImg.data[idx + 2] = bumpHeight;
        bumpImg.data[idx + 3] = 255;

        // 2. CLOUD SHELL: Weather systems with 55%+ clear sky gaps
        const weatherMacro = fbm01(cloudN1, px * 2.2, py * 2.2, pz * 2.2, 4);
        const weatherWarp = domainWarp3D(cloudN2, px * 3.5, py * 3.5, pz * 3.5, 0.6) * 0.5 + 0.5;
        const cloudDensity = weatherMacro * 0.55 + weatherWarp * 0.45;
        const cloudAlpha = clamp(smoothstep(0.48, 0.68, cloudDensity), 0, 1);

        cloudImg.data[idx] = 255;
        cloudImg.data[idx + 1] = 255;
        cloudImg.data[idx + 2] = 255;
        cloudImg.data[idx + 3] = Math.floor(cloudAlpha * 255);
      }
    }

    surfCtx.putImageData(surfImg, 0, 0);
    roughCtx.putImageData(roughImg, 0, 0);
    bumpCtx.putImageData(bumpImg, 0, 0);
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

    bump = new THREE.CanvasTexture(bumpCanvas);
    bump.wrapS = THREE.RepeatWrapping;
    bump.wrapT = THREE.ClampToEdgeWrapping;
    bump.colorSpace = THREE.NoColorSpace;
    textureCache.set(bumpKey, bump);

    clouds = new THREE.CanvasTexture(cloudCanvas);
    clouds.wrapS = THREE.RepeatWrapping;
    clouds.wrapT = THREE.ClampToEdgeWrapping;
    clouds.colorSpace = THREE.SRGBColorSpace;
    textureCache.set(cloudKey, clouds);
  }

  return { surface, clouds, roughness, bump };
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
  const key = `gas:blue:surface:${seed}:${lod}`;
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
    const shearNoise = createNoise3D(seed + 107);
    const eddyNoise = createNoise3D(seed + 219);
    const accentNoise = createNoise3D(seed + 331);

    for (let y = 0; y < height; y++) {
      const phi = (y / height) * Math.PI;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      for (let x = 0; x < width; x++) {
        const theta = (x / width) * 2 * Math.PI;
        const px = sinPhi * Math.cos(theta);
        const py = cosPhi;
        const pz = sinPhi * Math.sin(theta);

        // 1. Broad Fluid Domain Warping (calm, low-frequency 3D distortion)
        const wx = fbm3D(warpNoise, px * 1.3, py * 1.3, pz * 1.3, 3) * 0.32;
        const wy = fbm3D(warpNoise, px * 1.3 + 3.1, py * 1.3 + 1.7, pz * 1.3 + 5.2, 3) * 0.22;
        const wz = fbm3D(warpNoise, px * 1.3 + 1.4, py * 1.3 + 4.6, pz * 1.3 + 2.8, 3) * 0.32;
        const qx = px + wx;
        const qy = py + wy;
        const qz = pz + wz;

        // 2. Unequal, Calm Latitudinal Zones (polar hoods, calm temperate zones, undulating tropical currents)
        // Polar hoods: calm deep abyssal navy near poles
        const absLat = Math.abs(qy);
        const polarHood = smoothstep(0.62, 0.92, absLat);

        // Undulating jet-stream currents with unequal widths (NOT regular periodic sines)
        const current1 = Math.exp(-Math.pow((qy - 0.22) / 0.16, 2)); // North tropical current
        const current2 = Math.exp(-Math.pow((qy + 0.26) / 0.18, 2)); // South tropical current
        const current3 = Math.exp(-Math.pow((qy - 0.52) / 0.14, 2)); // North temperate band
        const current4 = Math.exp(-Math.pow((qy + 0.56) / 0.15, 2)); // South temperate band
        const current5 = Math.exp(-Math.pow(qy / 0.12, 2)) * 0.85; // Equatorial calm zone

        // Longitudinal wave perturbation to make bands bend and drift naturally
        const waveUndulation =
          Math.sin(theta * 3.0 + wx * 2.0) * 0.14 + Math.cos(theta * 5.0 - wz * 1.5) * 0.08;

        const beltField = clamp(
          current1 * 0.95 +
            current2 * 0.9 +
            current3 * 0.75 +
            current4 * 0.7 +
            current5 * 0.6 +
            waveUndulation * (1.0 - polarHood),
          0,
          1
        );

        // 3. Delicate Shear Boundaries & Swirling Eddies between belts
        const shear = fbm3D(shearNoise, qx * 3.6, qy * 3.6, qz * 3.6, 3) * 0.22;
        const eddy = ridgedFbm3D(eddyNoise, qx * 4.2, qy * 4.2, qz * 4.2, 3) * 0.14;

        // Effective atmospheric level
        const atmLevel = clamp((beltField * 0.68 + shear + eddy) * (1.0 - polarHood * 0.8), 0, 1);

        // 4. Subtle sparse cyan streamer accent (only at fastest shear peaks)
        const accentPeak = smoothstep(
          0.72,
          0.92,
          fbm01(accentNoise, qx * 5.5, qy * 5.5, qz * 5.5, 2) * (1.0 - polarHood)
        );

        // 5. Calm, Deep Cinematic Palette
        // Abyssal navy: rgb(14, 26, 62)
        // Deep slate blue: rgb(28, 54, 98)
        // Slate blue midtone: rgb(44, 88, 138)
        // Muted cyan-gray: rgb(68, 138, 178)
        // Pale cloud blue: rgb(145, 195, 228)
        // Bright cyan accent: rgb(56, 189, 248)
        const navyR = 14,
          navyG = 26,
          navyB = 62;
        const slateDeepR = 28,
          slateDeepG = 54,
          slateDeepB = 98;
        const slateMidR = 44,
          slateMidG = 88,
          slateMidB = 138;
        const cyanMutedR = 68,
          cyanMutedG = 138,
          cyanMutedB = 178;
        const cloudPaleR = 145,
          cloudPaleG = 195,
          cloudPaleB = 228;
        const accentCyanR = 56,
          accentCyanG = 189,
          accentCyanB = 248;

        let r = 0,
          g = 0,
          b = 0;
        if (atmLevel < 0.25) {
          const t = atmLevel / 0.25;
          r = lerp(navyR, slateDeepR, t);
          g = lerp(navyG, slateDeepG, t);
          b = lerp(navyB, slateDeepB, t);
        } else if (atmLevel < 0.6) {
          const t = (atmLevel - 0.25) / 0.35;
          r = lerp(slateDeepR, slateMidR, t);
          g = lerp(slateDeepG, slateMidG, t);
          b = lerp(slateDeepB, slateMidB, t);
        } else if (atmLevel < 0.85) {
          const t = (atmLevel - 0.6) / 0.25;
          r = lerp(slateMidR, cyanMutedR, t);
          g = lerp(slateMidG, cyanMutedG, t);
          b = lerp(slateMidB, cyanMutedB, t);
        } else {
          const t = (atmLevel - 0.85) / 0.15;
          r = lerp(cyanMutedR, cloudPaleR, t);
          g = lerp(cyanMutedG, cloudPaleG, t);
          b = lerp(cyanMutedB, cloudPaleB, t);
        }

        // Apply sparse bright cyan jet accent
        if (accentPeak > 0.05) {
          r = lerp(r, accentCyanR, accentPeak * 0.45);
          g = lerp(g, accentCyanG, accentPeak * 0.45);
          b = lerp(b, accentCyanB, accentPeak * 0.45);
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
 * Creates subtle upper cloud haze / cirrus wisps for Blue Atmospheric world.
 * Allows differential rotation and delicate upper atmospheric depth.
 */
export function createBlueAtmosphericCloudTexture(
  seed: number,
  lod: GeometryLOD = "focus"
): THREE.CanvasTexture {
  const key = `gas:blue:clouds:${seed}:${lod}`;
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
    const cirrusNoise = createNoise3D(seed + 419);
    const wispNoise = createNoise3D(seed + 523);

    for (let y = 0; y < height; y++) {
      const phi = (y / height) * Math.PI;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      for (let x = 0; x < width; x++) {
        const theta = (x / width) * 2 * Math.PI;
        const px = sinPhi * Math.cos(theta);
        const py = cosPhi;
        const pz = sinPhi * Math.sin(theta);

        // Delicate elongated cirrus wisps along jet-stream lines
        const cirrus = fbm01(cirrusNoise, px * 2.8, py * 5.2, pz * 2.8, 3);
        const wisps = ridgedFbm3D(wispNoise, px * 4.5, py * 4.5, pz * 4.5, 2) * 0.4;
        const density = cirrus * 0.7 + wisps * 0.3;

        // Cloud coverage: mostly transparent (65%+ clear sky)
        const alpha = clamp(smoothstep(0.56, 0.78, density) * 0.65, 0, 1);

        const idx = (y * width + x) * 4;
        // Soft white / pale azure cirrus
        data[idx] = 228;
        data[idx + 1] = 242;
        data[idx + 2] = 255;
        data[idx + 3] = Math.floor(alpha * 255);
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

    // 1. Primary Great Storm Vortex Coordinates: Southern tropical belt
    const stormTheta = 1.68; // ~96° longitude
    const stormPy = -0.28; // Southern hemisphere latitude
    const stormA = 0.38; // Longitudinal semi-axis
    const stormB = 0.17; // Latitudinal semi-axis

    // 2. Deterministic Secondary Vortices:
    // Eddy 1: North temperate white anticyclone
    const sec1Theta = 4.22;
    const sec1Py = 0.34;
    const sec1A = 0.2;
    const sec1B = 0.1;

    // Eddy 2: South subpolar dark cyclone
    const sec2Theta = 5.78;
    const sec2Py = -0.46;
    const sec2A = 0.16;
    const sec2B = 0.09;

    // Eddy 3: North tropical tawny eddy
    const sec3Theta = 0.78;
    const sec3Py = 0.18;
    const sec3A = 0.15;
    const sec3B = 0.08;

    for (let y = 0; y < height; y++) {
      const phi = (y / height) * Math.PI;
      const cosPhi = Math.cos(phi);

      for (let x = 0; x < width; x++) {
        const theta = (x / width) * 2 * Math.PI;
        const py = cosPhi;

        // -------------------------------------------------------------
        // FLOW-FIELD STREAMLINE DEFLECTION (EMBEDDED VORTEX DYNAMICS)
        // -------------------------------------------------------------

        // 1. Great Storm Flow Field
        const dTheta0 = Math.atan2(Math.sin(theta - stormTheta), Math.cos(theta - stormTheta));
        const dy0 = py - stormPy;
        const stormDist = Math.sqrt(
          Math.pow((dTheta0 * Math.cos(stormPy)) / stormA, 2) + Math.pow(dy0 / stormB, 2)
        );

        // Vector streamline deflection: jets divert smoothly around the storm perimeter
        const stormInfluence = Math.exp(-Math.pow(stormDist / 1.45, 1.8));
        const latSplitSign = Math.tanh(dy0 / 0.07);
        const deflectionY0 = latSplitSign * stormInfluence * 0.22;

        // Cyclonic azimuthal curling around storm core
        const stormAngle = Math.atan2(dy0 * 2.2, dTheta0);
        const curlTheta0 = -Math.sin(stormAngle) * stormInfluence * 0.32;
        const curlY0 = Math.cos(stormAngle) * stormInfluence * 0.14;

        // Trailing turbulent wake downstream of the storm (positive dTheta0)
        let stormWake = 0;
        if (dTheta0 > 0 && dTheta0 < 1.6) {
          const wakeEnvelope =
            Math.exp(-Math.pow(dy0 / 0.14, 2)) * Math.exp(-Math.pow((dTheta0 - 0.6) / 0.8, 2));
          stormWake = Math.sin(dTheta0 * 12.0) * wakeEnvelope * 0.11;
        }

        // 2. Secondary Vortex Streamline Deflections
        // Eddy 1
        const dTheta1 = Math.atan2(Math.sin(theta - sec1Theta), Math.cos(theta - sec1Theta));
        const dy1 = py - sec1Py;
        const dist1 = Math.sqrt(
          Math.pow((dTheta1 * Math.cos(sec1Py)) / sec1A, 2) + Math.pow(dy1 / sec1B, 2)
        );
        const defY1 = Math.tanh(dy1 / 0.06) * Math.exp(-Math.pow(dist1 / 1.3, 2)) * 0.08;

        // Eddy 2
        const dTheta2 = Math.atan2(Math.sin(theta - sec2Theta), Math.cos(theta - sec2Theta));
        const dy2 = py - sec2Py;
        const dist2 = Math.sqrt(
          Math.pow((dTheta2 * Math.cos(sec2Py)) / sec2A, 2) + Math.pow(dy2 / sec2B, 2)
        );
        const defY2 = Math.tanh(dy2 / 0.06) * Math.exp(-Math.pow(dist2 / 1.3, 2)) * 0.07;

        // Eddy 3
        const dTheta3 = Math.atan2(Math.sin(theta - sec3Theta), Math.cos(theta - sec3Theta));
        const dy3 = py - sec3Py;
        const dist3 = Math.sqrt(
          Math.pow((dTheta3 * Math.cos(sec3Py)) / sec3A, 2) + Math.pow(dy3 / sec3B, 2)
        );
        const defY3 = Math.tanh(dy3 / 0.06) * Math.exp(-Math.pow(dist3 / 1.3, 2)) * 0.06;

        // Deformed coordinates: streamlines wrap and curl organically
        const deformedPy = clamp(
          py + deflectionY0 + curlY0 + stormWake + defY1 + defY2 + defY3,
          -0.98,
          0.98
        );
        const deformedTheta = theta + curlTheta0;

        const defSinPhi = Math.sqrt(Math.max(0.001, 1.0 - deformedPy * deformedPy));
        const defPx = defSinPhi * Math.cos(deformedTheta);
        const defPz = defSinPhi * Math.sin(deformedTheta);

        // -------------------------------------------------------------
        // BELTS & SHEAR TURBULENCE ON DEFORMED COORDINATES
        // -------------------------------------------------------------

        // Multi-harmonic non-parallel belts across the warped streamlines
        const belt1 = Math.sin(deformedPy * 17.0 + 0.35);
        const belt2 = Math.sin(deformedPy * 34.0 - 0.85) * 0.45;
        const belt3 = Math.sin(deformedPy * 8.5 + 1.7) * 0.6;
        const baseBelts = (belt1 + belt2 + belt3) * 0.35 + 0.5;

        // Shear turbulence & boundary interactions along deformed streamlines
        const shear = fbm3D(bandNoise, defPx * 4.6, deformedPy * 4.6, defPz * 4.6, 4) * 0.32;
        const vortex =
          ridgedFbm3D(vortexNoise, defPx * 3.2, deformedPy * 3.2, defPz * 3.2, 3) * 0.18;

        const val = clamp(baseBelts + shear + vortex, 0, 1);

        // -------------------------------------------------------------
        // PALETTE: WARM CINEMATIC TAWNY, RUST, MOCHA, PEACH, CREAM
        // -------------------------------------------------------------
        // Deep mocha / umber dark belt: rgb(82, 52, 36)
        // Rich rust / chestnut: rgb(138, 78, 48)
        // Warm tawny midtone: rgb(182, 128, 86)
        // Pale golden peach: rgb(222, 178, 134)
        // Ammonia cream clouds: rgb(248, 236, 216)
        const mochaR = 82,
          mochaG = 52,
          mochaB = 36;
        const rustR = 138,
          rustG = 78,
          rustB = 48;
        const tawnyR = 182,
          tawnyG = 128,
          tawnyB = 86;
        const peachR = 222,
          peachG = 178,
          peachB = 134;
        const creamR = 248,
          creamG = 236,
          creamB = 216;

        let r: number, g: number, b: number;
        if (val < 0.28) {
          const t = val / 0.28;
          r = lerp(mochaR, rustR, t);
          g = lerp(mochaG, rustG, t);
          b = lerp(mochaB, rustB, t);
        } else if (val < 0.65) {
          const t = (val - 0.28) / 0.37;
          r = lerp(rustR, tawnyR, t);
          g = lerp(rustG, tawnyG, t);
          b = lerp(rustB, tawnyB, t);
        } else if (val < 0.88) {
          const t = (val - 0.65) / 0.23;
          r = lerp(tawnyR, peachR, t);
          g = lerp(tawnyG, peachG, t);
          b = lerp(tawnyB, peachB, t);
        } else {
          const t = (val - 0.88) / 0.12;
          r = lerp(peachR, creamR, t);
          g = lerp(peachG, creamG, t);
          b = lerp(peachB, creamB, t);
        }

        // -------------------------------------------------------------
        // EMBEDDED STORM EYE & EDDY CORES
        // -------------------------------------------------------------

        // Great Storm Internal Cyclonic Spiraling Core
        if (stormDist < 1.15) {
          const stormMask = 1.0 - smoothstep(0.2, 1.12, stormDist);
          const spiral = Math.sin(
            stormDist * 16.0 -
              stormAngle * 2.2 +
              fbm3D(stormNoise, defPx * 7.0, deformedPy * 7.0, defPz * 7.0, 2) * 1.6
          );
          const coreT = clamp(spiral * 0.5 + 0.5, 0, 1);

          // Deep terracotta brick amber storm eye (rgb 212, 78, 44) to amber peach margin (rgb 238, 148, 92)
          const stormEyeR = lerp(212, 240, coreT);
          const stormEyeG = lerp(78, 150, coreT);
          const stormEyeB = lerp(44, 96, coreT);

          r = lerp(r, stormEyeR, stormMask * 0.94);
          g = lerp(g, stormEyeG, stormMask * 0.94);
          b = lerp(b, stormEyeB, stormMask * 0.94);
        }

        // Secondary Eddy 1: Cream White Anticyclone Oval
        if (dist1 < 1.05) {
          const m1 = 1.0 - smoothstep(0.15, 1.0, dist1);
          const ovalR = 246,
            ovalG = 238,
            ovalB = 222;
          r = lerp(r, ovalR, m1 * 0.88);
          g = lerp(g, ovalG, m1 * 0.88);
          b = lerp(b, ovalB, m1 * 0.88);
        }

        // Secondary Eddy 2: Dark Chocolate Subpolar Cyclone
        if (dist2 < 1.05) {
          const m2 = 1.0 - smoothstep(0.15, 1.0, dist2);
          const darkR = 76,
            darkG = 44,
            darkB = 28;
          r = lerp(r, darkR, m2 * 0.85);
          g = lerp(g, darkG, m2 * 0.85);
          b = lerp(b, darkB, m2 * 0.85);
        }

        // Secondary Eddy 3: Tawny Tropical Eddy
        if (dist3 < 1.05) {
          const m3 = 1.0 - smoothstep(0.15, 1.0, dist3);
          const eddy3R = 215,
            eddy3G = 155,
            eddy3B = 110;
          r = lerp(r, eddy3R, m3 * 0.8);
          g = lerp(g, eddy3G, m3 * 0.8);
          b = lerp(b, eddy3B, m3 * 0.8);
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
  const key = `ring:${config.style}:${config.seed}:${config.opacity}:v2`;
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
    const clumpNoise = createNoise3D(config.seed + 109);
    const edgeNoise = createNoise3D(config.seed + 211);

    for (let y = 0; y < height; y++) {
      const v = y / height; // Angular coordinate around circumference [0, 1]
      const angle = v * 2 * Math.PI;

      // -----------------------------------------------------------
      // AZIMUTHAL / SECTOR MASKING BY RING STYLE
      // -----------------------------------------------------------
      let angularMask = 1.0;

      if (config.style === "broken") {
        // True angular sector masking with clear voids readable at 84px
        // Angle shifted by deterministic seed
        const seedAngleShift = ((config.seed % 100) / 100) * Math.PI * 2;
        const normAngle = (angle + seedAngleShift) % (2 * Math.PI);

        // Edge jitter for natural jagged break points
        const jaggedEdge =
          fbm3D(edgeNoise, Math.cos(angle) * 3.0, Math.sin(angle) * 3.0, 0.5, 2) * 0.08;
        const effAngle = normAngle + jaggedEdge;

        // Sectors:
        // Sector 1: Major continuous arc (0.15 rad to 2.45 rad, ~132°)
        // Void Gap 1: 2.45 to 3.35 rad (~51° void)
        // Sector 2: Medium arc (3.35 to 4.55 rad, ~69°)
        // Void Gap 2: 4.55 to 5.15 rad (~34° void)
        // Sector 3: Fragmented cluster (5.15 to 5.85 rad, ~40°)
        // Void Gap 3: 5.85 to 2*PI + 0.15 rad (~34° void)
        if (effAngle >= 0.15 && effAngle <= 2.45) {
          // Major arc: solid with soft tapered tips
          const tipIn = smoothstep(0.15, 0.25, effAngle);
          const tipOut = smoothstep(2.45, 2.35, effAngle);
          angularMask = tipIn * tipOut;
        } else if (effAngle >= 3.35 && effAngle <= 4.55) {
          // Medium arc
          const tipIn = smoothstep(3.35, 3.45, effAngle);
          const tipOut = smoothstep(4.55, 4.45, effAngle);
          angularMask = tipIn * tipOut * 0.95;
        } else if (effAngle >= 5.15 && effAngle <= 5.85) {
          // Fragmented arclets cluster: broken into 2-3 discrete clumps
          const clusterEnvelope =
            smoothstep(5.15, 5.25, effAngle) * smoothstep(5.85, 5.75, effAngle);
          const clumpBreaks = Math.sin(effAngle * 28.0) > -0.15 ? 1.0 : 0.0;
          angularMask = clusterEnvelope * clumpBreaks * 0.88;
        } else {
          // Absolute void gaps
          angularMask = 0.0;
        }
      } else if (config.style === "dust") {
        // Dust: particulate clumping and longitudinal density variations along the orbit
        const clumping = fbm3D(clumpNoise, Math.cos(angle) * 1.8, Math.sin(angle) * 1.8, 0.5, 3);
        angularMask = clamp(0.7 + clumping * 0.35, 0.45, 1.0);
      } else {
        // Ice: subtle density ripples around orbit
        angularMask = 0.94 + 0.06 * Math.sin(angle * 6.0 + config.seed);
      }

      for (let x = 0; x < width; x++) {
        const u = x / width; // Radial fraction from inner to outer radius [0, 1]

        let r = 255;
        let g = 255;
        let b = 255;
        let radialDensity = 0.0;
        let baseAlpha = 0.75;

        if (config.style === "ice") {
          // ---------------------------------------------------------
          // ICY RINGS: Multiple fine density lanes & crisp divisions
          // ---------------------------------------------------------
          // Multi-scale concentric ringlets
          const fine1 = Math.sin(u * 120.0) * 0.5 + 0.5;
          const fine2 = Math.sin(u * 320.0 + config.seed) * 0.5 + 0.5;
          const fine3 = Math.sin(u * 680.0 - config.seed) * 0.5 + 0.5;
          const fine4 = Math.sin(u * 1400.0) * 0.5 + 0.5;
          const ringlets = fine1 * 0.4 + fine2 * 0.3 + fine3 * 0.2 + fine4 * 0.1;

          // Crisp transparent division gaps
          const cassini = u > 0.61 && u < 0.67 ? 0.0 : 1.0; // Cassini division
          const encke = u > 0.855 && u < 0.875 ? 0.0 : 1.0; // Encke gap
          const maxwell = u > 0.345 && u < 0.36 ? 0.0 : 1.0; // Maxwell gap

          // Edge fades
          const edgeFade = smoothstep(0.01, 0.08, u) * smoothstep(0.99, 0.94, u);

          radialDensity = (0.35 + ringlets * 0.65) * cassini * encke * maxwell * edgeFade;

          // Radial color and opacity zones
          if (u < 0.22) {
            // Faint inner C-ring: delicate ivory-gray
            baseAlpha = 0.38;
            r = Math.floor(lerp(218, 238, ringlets));
            g = Math.floor(lerp(212, 232, ringlets));
            b = Math.floor(lerp(202, 224, ringlets));
          } else if (u < 0.61) {
            // Dense main B-ring: warm champagne / ivory ice
            baseAlpha = 0.85;
            r = Math.floor(lerp(238, 252, ringlets));
            g = Math.floor(lerp(230, 248, ringlets));
            b = Math.floor(lerp(215, 238, ringlets));
          } else {
            // Crisp outer A-ring: cool azure-white ice
            baseAlpha = 0.78;
            r = Math.floor(lerp(215, 242, ringlets));
            g = Math.floor(lerp(232, 250, ringlets));
            b = Math.floor(lerp(250, 255, ringlets));
          }
        } else if (config.style === "dust") {
          // ---------------------------------------------------------
          // DUST RINGS: Silicate mineral particles, soft edges, matte
          // ---------------------------------------------------------
          // Broad diffuse waves (NO sharp Cassini knife-cuts)
          const wave1 = Math.sin(u * 28.0 + config.seed) * 0.5 + 0.5;
          const wave2 = Math.sin(u * 64.0 - config.seed) * 0.5 + 0.5;
          const broadWaves = wave1 * 0.6 + wave2 * 0.4;

          // Particulate grain and clumping across the radius
          const grain =
            fbm3D(noise, u * 18.0, Math.cos(angle) * 3.0, Math.sin(angle) * 3.0, 2) * 0.25;

          // Soft envelope at boundaries
          const softEnvelope = smoothstep(0.01, 0.14, u) * smoothstep(0.99, 0.82, u);

          radialDensity = clamp((0.45 + broadWaves * 0.55 + grain) * softEnvelope, 0, 1);
          baseAlpha = 0.76; // Visible silicate dust transparency

          // Silicate mineral dust albedo:
          // Inner: warm dusty sand rgb(182, 154, 126)
          // Mid: muted mineral taupe rgb(156, 132, 108)
          // Outer: charcoal silicate rgb(122, 104, 88)
          if (u < 0.5) {
            const t = u / 0.5;
            r = Math.floor(lerp(182, 156, t));
            g = Math.floor(lerp(154, 132, t));
            b = Math.floor(lerp(126, 108, t));
          } else {
            const t = (u - 0.5) / 0.5;
            r = Math.floor(lerp(156, 122, t));
            g = Math.floor(lerp(132, 104, t));
            b = Math.floor(lerp(108, 88, t));
          }
        } else {
          // ---------------------------------------------------------
          // BROKEN / DEBRIS RINGS: Fractured icy/rocky arcs
          // ---------------------------------------------------------
          // Dense fractured lanes
          const b1 = Math.sin(u * 90.0) * 0.5 + 0.5;
          const b2 = Math.sin(u * 240.0 + config.seed) * 0.5 + 0.5;
          const lanes = b1 * 0.55 + b2 * 0.45;

          const edgeFade = smoothstep(0.02, 0.1, u) * smoothstep(0.98, 0.9, u);
          radialDensity = (0.4 + lanes * 0.6) * edgeFade;
          baseAlpha = 0.82;

          // Luminous fractured ice with mineral silicate streaks
          r = Math.floor(lerp(218, 248, lanes));
          g = Math.floor(lerp(228, 250, lanes));
          b = Math.floor(lerp(242, 255, lanes));
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
