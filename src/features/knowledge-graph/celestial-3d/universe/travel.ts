export interface UniverseTravelState {
  readonly active: boolean;
  readonly progress: number; // 0..1
  readonly currentOffset: { readonly x: number; readonly y: number };
  readonly startOffset?: { readonly x: number; readonly y: number };
  readonly targetOffset?: { readonly x: number; readonly y: number };
  readonly fromSlug?: string;
  readonly toSlug?: string;
}

export interface TravelOffsets {
  readonly nebula: { readonly x: number; readonly y: number };
  readonly far: { readonly x: number; readonly y: number };
  readonly mid: { readonly x: number; readonly y: number };
  readonly bright: { readonly x: number; readonly y: number };
}

export const ZERO_TRAVEL_OFFSETS: TravelOffsets = {
  nebula: { x: 0, y: 0 },
  far: { x: 0, y: 0 },
  mid: { x: 0, y: 0 },
  bright: { x: 0, y: 0 },
};

/**
 * Depth-ordered parallax rates for selection navigation travel.
 * Strictly maintains: nebula < far < mid < bright.
 */
export const TRAVEL_PARALLAX_RATES = {
  nebula: 0.02,
  far: 0.045,
  mid: 0.085,
  bright: 0.14,
} as const;

/**
 * Single consistent monotonic easing curve for directional travel.
 * Matches celestial scene interpolation (zero bounce, zero overshoot, zero reversal).
 */
export function easeMonotonic(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - clamped, 3);
}

/**
 * Monotonically interpolates camera spatial offset between two positions.
 */
export function interpolateTravelOffset(
  start: { readonly x: number; readonly y: number },
  target: { readonly x: number; readonly y: number },
  progress: number
): { x: number; y: number } {
  const ease = easeMonotonic(progress);
  return {
    x: start.x + (target.x - start.x) * ease,
    y: start.y + (target.y - start.y) * ease,
  };
}

/**
 * Computes directional camera-like travel offsets for deep-space layers.
 * Progresses monotonically with differential depth parallax; zero pulse or scaling.
 */
export function computeTravelOffsets(
  travel: UniverseTravelState | null | undefined,
  prefersReducedMotion: boolean
): TravelOffsets {
  if (!travel || prefersReducedMotion) {
    return ZERO_TRAVEL_OFFSETS;
  }

  const { x, y } = travel.currentOffset;

  return {
    nebula: {
      x: x * TRAVEL_PARALLAX_RATES.nebula,
      y: y * TRAVEL_PARALLAX_RATES.nebula,
    },
    far: {
      x: x * TRAVEL_PARALLAX_RATES.far,
      y: y * TRAVEL_PARALLAX_RATES.far,
    },
    mid: {
      x: x * TRAVEL_PARALLAX_RATES.mid,
      y: y * TRAVEL_PARALLAX_RATES.mid,
    },
    bright: {
      x: x * TRAVEL_PARALLAX_RATES.bright,
      y: y * TRAVEL_PARALLAX_RATES.bright,
    },
  };
}
