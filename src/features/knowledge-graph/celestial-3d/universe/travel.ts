import { SeededPRNG } from "./prng";
import { easeOutCubic } from "../../scene/transition-scene";

export interface UniverseTravelState {
  readonly active: boolean;
  readonly progress: number; // 0..1
  readonly directionX: number;
  readonly directionY: number;
  readonly distance: number;
  readonly fromSlug?: string;
  readonly toSlug?: string;
}

export interface TravelOffsets {
  readonly nebula: { readonly x: number; readonly y: number };
  readonly far: { readonly x: number; readonly y: number };
  readonly mid: { readonly x: number; readonly y: number };
  readonly bright: { readonly x: number; readonly y: number };
  readonly scale: number;
}

export const TRAVEL_RATES = {
  nebula: 0.025,
  far: 0.045,
  mid: 0.085,
  bright: 0.14,
} as const;

/**
 * Deterministically computes a bounded persistent spatial anchor for a concept slug.
 * Bounded strictly within [-50, 50] px to ensure different knowledge regions
 * have subtly distinct environmental celestial orientations without unbounded drift.
 */
export function getConceptUniverseAnchor(slug: string): { x: number; y: number } {
  let hash = 0x811c9dc5;
  for (let i = 0; i < slug.length; i++) {
    hash ^= slug.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const prng = new SeededPRNG(hash >>> 0);
  const x = (prng.next() - 0.5) * 100;
  const y = (prng.next() - 0.5) * 100;
  return { x, y };
}

/**
 * Computes deterministic travel offsets and scale expansion for universe layers.
 * Composes a bounded destination anchor transition with a smooth travel surge.
 */
export function computeTravelOffsets(
  travel: UniverseTravelState | null | undefined,
  prefersReducedMotion: boolean
): TravelOffsets {
  if (!travel || prefersReducedMotion) {
    const slug = travel?.toSlug;
    if (slug && !prefersReducedMotion) {
      const anchor = getConceptUniverseAnchor(slug);
      return {
        nebula: { x: anchor.x * TRAVEL_RATES.nebula, y: -anchor.y * TRAVEL_RATES.nebula },
        far: { x: anchor.x * TRAVEL_RATES.far, y: -anchor.y * TRAVEL_RATES.far },
        mid: { x: anchor.x * TRAVEL_RATES.mid, y: -anchor.y * TRAVEL_RATES.mid },
        bright: { x: anchor.x * TRAVEL_RATES.bright, y: -anchor.y * TRAVEL_RATES.bright },
        scale: 1.0,
      };
    }
    return {
      nebula: { x: 0, y: 0 },
      far: { x: 0, y: 0 },
      mid: { x: 0, y: 0 },
      bright: { x: 0, y: 0 },
      scale: 1.0,
    };
  }

  const p = Math.max(0, Math.min(1, travel.progress));
  const ease = easeOutCubic(p);

  // 1. Destination anchor interpolation
  const fromAnchor = travel.fromSlug ? getConceptUniverseAnchor(travel.fromSlug) : { x: 0, y: 0 };
  const toAnchor = travel.toSlug ? getConceptUniverseAnchor(travel.toSlug) : fromAnchor;

  const anchorX = fromAnchor.x + (toAnchor.x - fromAnchor.x) * ease;
  const anchorY = fromAnchor.y + (toAnchor.y - fromAnchor.y) * ease;

  // 2. Transient travel surge (peaks at midpoint, zero at start and settled end)
  // Apparent motion in screen space moves opposite to travel direction
  const surgeEnvelope = Math.sin(Math.PI * p);
  const cappedDist = Math.min(travel.distance, 450);
  const surgeStrength = cappedDist * 0.22 * surgeEnvelope;
  const surgeX = -travel.directionX * surgeStrength;
  const surgeY = travel.directionY * surgeStrength;

  const totalTravelX = anchorX + surgeX;
  const totalTravelY = anchorY + surgeY;

  // 3. Subtle subconscious depth push-through (1.8% expansion peak)
  const scale = 1.0 + 0.018 * surgeEnvelope;

  return {
    nebula: {
      x: totalTravelX * TRAVEL_RATES.nebula,
      y: -totalTravelY * TRAVEL_RATES.nebula,
    },
    far: {
      x: totalTravelX * TRAVEL_RATES.far,
      y: -totalTravelY * TRAVEL_RATES.far,
    },
    mid: {
      x: totalTravelX * TRAVEL_RATES.mid,
      y: -totalTravelY * TRAVEL_RATES.mid,
    },
    bright: {
      x: totalTravelX * TRAVEL_RATES.bright,
      y: -totalTravelY * TRAVEL_RATES.bright,
    },
    scale,
  };
}
