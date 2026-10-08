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

export interface ConceptSpatialAnchor {
  readonly x: number;
  readonly y: number;
}

export type ConceptAnchorMap = Map<string, ConceptSpatialAnchor>;

/**
 * Retrieves a remembered spatial anchor for a concept by primary or secondary key.
 */
export function getRememberedAnchor(
  anchorMap: ConceptAnchorMap,
  key: string,
  secondaryKey?: string
): ConceptSpatialAnchor | undefined {
  return anchorMap.get(key) ?? (secondaryKey ? anchorMap.get(secondaryKey) : undefined);
}

/**
 * Registers a concept's spatial anchor in the session map under primary and optional secondary key.
 */
export function registerConceptAnchor(
  anchorMap: ConceptAnchorMap,
  key: string,
  anchor: ConceptSpatialAnchor,
  secondaryKey?: string
): void {
  anchorMap.set(key, anchor);
  if (secondaryKey) {
    anchorMap.set(secondaryKey, anchor);
  }
}

export interface SceneNavigationNode {
  readonly id: string;
  readonly slug?: string;
  readonly x: number;
  readonly y: number;
}

/**
 * Derives a directional camera travel displacement step from local scene geometry.
 * When the target node is located at (+dx, +dy) relative to focus in canvas coordinates:
 * - Apparent shift in screen X: -dirX * dist
 * - Apparent shift in screen Y (Three.js inverted from Canvas): +dirY * dist
 */
export function calculateNavigationStep(options: {
  readonly fromSceneNodes: readonly SceneNavigationNode[];
  readonly toSceneNodes: readonly SceneNavigationNode[];
  readonly fromFocus: SceneNavigationNode;
  readonly toFocus: SceneNavigationNode;
  readonly maxDistance?: number;
}): { x: number; y: number } {
  const { fromSceneNodes, toSceneNodes, fromFocus, toFocus, maxDistance = 400 } = options;

  const targetInFrom = fromSceneNodes.find(
    (n) => n.id === toFocus.id || (n.slug && n.slug === toFocus.slug)
  );
  const originInTo = toSceneNodes.find(
    (n) => n.id === fromFocus.id || (n.slug && n.slug === fromFocus.slug)
  );

  let dirX = 0;
  let dirY = 0;
  let distance = 0;

  if (targetInFrom) {
    dirX = targetInFrom.x - fromFocus.x;
    dirY = targetInFrom.y - fromFocus.y;
  } else if (originInTo) {
    dirX = -(originInTo.x - toFocus.x);
    dirY = -(originInTo.y - toFocus.y);
  }

  const distLen = Math.hypot(dirX, dirY);
  if (distLen > 0) {
    distance = distLen;
    dirX /= distLen;
    dirY /= distLen;
  }

  const cappedDist = Math.min(distance, maxDistance);
  return {
    x: -dirX * cappedDist,
    y: dirY * cappedDist,
  };
}

/**
 * Resolves the destination spatial camera coordinate:
 * - If previously visited in this session, returns its remembered coordinate.
 * - If unvisited, anchors it at fromAnchor + step, and registers it.
 */
export function resolveDestinationAnchor(options: {
  readonly anchorMap: ConceptAnchorMap;
  readonly fromKey: string;
  readonly toKey: string;
  readonly fromSecondaryKey?: string;
  readonly toSecondaryKey?: string;
  readonly step: { readonly x: number; readonly y: number };
  readonly fallbackOffset?: { readonly x: number; readonly y: number };
}): ConceptSpatialAnchor {
  const {
    anchorMap,
    fromKey,
    toKey,
    fromSecondaryKey,
    toSecondaryKey,
    step,
    fallbackOffset = { x: 0, y: 0 },
  } = options;

  const existing = getRememberedAnchor(anchorMap, toKey, toSecondaryKey);
  if (existing) {
    return existing;
  }

  const fromAnchor = getRememberedAnchor(anchorMap, fromKey, fromSecondaryKey) ?? fallbackOffset;
  const targetX = Number.isFinite(fromAnchor.x + step.x) ? fromAnchor.x + step.x : fromAnchor.x;
  const targetY = Number.isFinite(fromAnchor.y + step.y) ? fromAnchor.y + step.y : fromAnchor.y;
  const newAnchor: ConceptSpatialAnchor = { x: targetX, y: targetY };

  registerConceptAnchor(anchorMap, toKey, newAnchor, toSecondaryKey);
  return newAnchor;
}
