import * as THREE from "three";
import { SeededPRNG } from "./prng";

export type StarTier = "far" | "mid" | "bright";

export interface StarTierConfig {
  readonly tier: StarTier;
  readonly countDesktop: number;
  readonly countMobile: number;
  readonly minSize: number;
  readonly maxSize: number;
  readonly minBrightness: number;
  readonly maxBrightness: number;
  readonly twinkleSpeedMin: number;
  readonly twinkleSpeedMax: number;
  readonly twinkleDepth: number;
}

export const STAR_TIER_CONFIGS: Record<StarTier, StarTierConfig> = {
  far: {
    tier: "far",
    countDesktop: 1900,
    countMobile: 850,
    minSize: 1.0,
    maxSize: 1.8,
    minBrightness: 0.15,
    maxBrightness: 0.4,
    twinkleSpeedMin: 0.3,
    twinkleSpeedMax: 0.8,
    twinkleDepth: 0.1,
  },
  mid: {
    tier: "mid",
    countDesktop: 650,
    countMobile: 280,
    minSize: 1.8,
    maxSize: 3.2,
    minBrightness: 0.35,
    maxBrightness: 0.7,
    twinkleSpeedMin: 0.6,
    twinkleSpeedMax: 1.6,
    twinkleDepth: 0.25,
  },
  bright: {
    tier: "bright",
    countDesktop: 60,
    countMobile: 30,
    minSize: 3.6,
    maxSize: 5.8,
    minBrightness: 0.7,
    maxBrightness: 0.95,
    twinkleSpeedMin: 0.8,
    twinkleSpeedMax: 2.2,
    twinkleDepth: 0.35,
  },
};

/** Palette variants for subtle stellar spectral classes */
const STELLAR_COLORS: readonly [number, number, number][] = [
  [0.94, 0.96, 1.0], // Neutral pure white
  [0.72, 0.84, 1.0], // Young blue-white
  [0.82, 0.88, 1.0], // Soft cyan-tinted
  [1.0, 0.9, 0.75], // Gentle warm amber
  [0.85, 0.8, 0.98], // Soft faint violet
];

export function getStarCountsForTier(tier: StarTier, isMobile: boolean): number {
  const config = STAR_TIER_CONFIGS[tier];
  return isMobile ? config.countMobile : config.countDesktop;
}

export interface GenerateStarFieldOptions {
  readonly tier: StarTier;
  readonly isMobile: boolean;
  readonly seed: number;
  readonly areaWidth: number;
  readonly areaHeight: number;
}

/**
 * Builds a deterministic THREE.BufferGeometry populated with batched star points
 * containing spatial positions and per-vertex shader attributes.
 */
export function generateStarFieldGeometry(options: GenerateStarFieldOptions): THREE.BufferGeometry {
  const { tier, isMobile, seed, areaWidth, areaHeight } = options;
  const config = STAR_TIER_CONFIGS[tier];
  const count = getStarCountsForTier(tier, isMobile);
  const prng = new SeededPRNG(seed);

  const halfW = areaWidth / 2;
  const halfH = areaHeight / 2;

  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const sizes = new Float32Array(count);
  const brightnesses = new Float32Array(count);
  const colors = new Float32Array(count * 3);
  const twinkleSpeeds = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    // 1. Position spread uniformly over the view bounds
    positions[i * 3 + 0] = prng.nextRange(-halfW, halfW);
    positions[i * 3 + 1] = prng.nextRange(-halfH, halfH);
    // Slight z-depth layer separation (far stars deeper)
    const baseZ = tier === "far" ? -100 : tier === "mid" ? -50 : -10;
    positions[i * 3 + 2] = baseZ + prng.nextRange(-5, 5);

    // 2. Random phase seed [0, 1000]
    seeds[i] = prng.nextRange(0, 1000);

    // 3. Point size
    sizes[i] = prng.nextRange(config.minSize, config.maxSize);

    // 4. Base brightness
    brightnesses[i] = prng.nextRange(config.minBrightness, config.maxBrightness);

    // 5. Subtle spectral color
    const colorIdx = Math.floor(prng.next() * STELLAR_COLORS.length);
    const color = STELLAR_COLORS[colorIdx] ?? STELLAR_COLORS[0]!;
    colors[i * 3 + 0] = color[0];
    colors[i * 3 + 1] = color[1];
    colors[i * 3 + 2] = color[2];

    // 6. Twinkle speed
    twinkleSpeeds[i] = prng.nextRange(config.twinkleSpeedMin, config.twinkleSpeedMax);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aBrightness", new THREE.BufferAttribute(brightnesses, 1));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aTwinkleSpeed", new THREE.BufferAttribute(twinkleSpeeds, 1));

  return geometry;
}
