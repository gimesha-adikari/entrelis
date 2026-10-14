/**
 * Core celestial archetype and identity types for the Entrelis 3D knowledge universe.
 * Concepts retain stable deterministic identities that are completely decoupled from
 * their scene role (focus, primary, context).
 */

export type CelestialArchetype =
  | "golden-star"
  | "blue-star"
  | "ember-star"
  | "volcanic-rocky"
  | "mineral-rocky"
  | "life-world"
  | "blue-atmospheric"
  | "storm-giant"
  | "metallic-world"
  | "crystal-world"
  | "asteroid";

export type RingStyle = "ice" | "dust" | "broken";

export interface RingConfig {
  readonly innerRadius: number;
  readonly outerRadius: number;
  readonly tilt: number; // in radians
  readonly opacity: number;
  readonly style: RingStyle;
  readonly seed: number;
  readonly color?: string | number;
}

export interface MoonConfig {
  readonly archetype: "rocky" | "ice";
  readonly relativeRadius: number; // relative to primary body (e.g. 0.2)
  readonly distance: number; // orbital distance
  readonly phase: number; // initial orbital angle in radians
  readonly seed: number;
  readonly orbitalSpeed?: number; // rad/s
}

export interface DebrisConfig {
  readonly count: number; // 3–7 fragments before LOD adjustment
  readonly seed: number;
  readonly minDistance: number; // world units at a 50-unit parent radius
  readonly maxDistance: number; // rescaled to the actual parent radius
  readonly scale: number; // fragment radius relative to the parent radius
}

export interface CelestialIdentity {
  readonly archetype: CelestialArchetype;
  readonly seed: number;
  readonly paletteVariant?: number;
  readonly rings?: RingConfig;
  readonly moons?: readonly MoonConfig[];
  readonly debris?: DebrisConfig;
  readonly asteroidVariant?: "carbon" | "mineral";
}

export type SceneRole = "focus" | "primary" | "context";
export type GeometryLOD = "focus" | "primary" | "context";

/**
 * Curated 7 Entrelis seed concept identities.
 * These establish the foundational visual diversity of the initial universe.
 */
export const ENTRELIS_CONCEPT_IDENTITIES: Readonly<Record<string, CelestialIdentity>> = {
  rust: {
    archetype: "volcanic-rocky",
    seed: 42,
    paletteVariant: 0,
    // Volcanic rocky with copper/basalt/ember veins; no rings
  },
  ownership: {
    archetype: "ember-star",
    seed: 108,
    paletteVariant: 0,
    // Convective red/orange/gold star with darker lanes and corona
  },
  memory: {
    archetype: "blue-atmospheric",
    seed: 256,
    paletteVariant: 0,
    // Deep blue/cyan/violet bands, cyclonic storm, atmosphere shell
  },
  "stack-and-heap": {
    archetype: "mineral-rocky",
    seed: 512,
    paletteVariant: 0,
    rings: {
      innerRadius: 62,
      outerRadius: 84,
      tilt: 0.35,
      opacity: 0.8,
      style: "ice",
      seed: 512,
      color: 0xc4b5fd,
    },
  },
  "operating-systems": {
    archetype: "storm-giant",
    seed: 1024,
    paletteVariant: 0,
    rings: {
      innerRadius: 66,
      outerRadius: 96,
      tilt: 0.42,
      opacity: 0.88,
      style: "ice",
      seed: 1024,
      color: 0x93c5fd,
    },
    moons: [
      {
        archetype: "ice",
        relativeRadius: 0.18,
        distance: 140,
        phase: 1.2,
        seed: 1025,
        orbitalSpeed: 0.12,
      },
    ],
  },
  cpus: {
    archetype: "metallic-world",
    seed: 2048,
    paletteVariant: 0,
    // Graphite / steel-blue with geometric wafer facets and cyan accents
  },
  transistors: {
    archetype: "crystal-world",
    seed: 4096,
    paletteVariant: 0,
    // Translucent glacial body with sapphire fissures and frosty limb haze
  },
};

/**
 * Curated 6 Entrelis Milestone 2 Batch 01 Pilot Candidate identities.
 * Isolated from seed records until formal editorial promotion.
 */
export const M2_PILOT_CONCEPT_IDENTITIES: Readonly<Record<string, CelestialIdentity>> = {
  "instruction-set-architecture": {
    archetype: "golden-star",
    seed: 8192,
    paletteVariant: 0,
  },
  "virtual-memory": {
    archetype: "crystal-world",
    seed: 16384,
    paletteVariant: 0,
  },
  "file-systems": {
    archetype: "mineral-rocky",
    seed: 32768,
    paletteVariant: 0,
    rings: {
      innerRadius: 60,
      outerRadius: 82,
      tilt: 0.28,
      opacity: 0.75,
      style: "dust",
      seed: 32768,
      color: 0xd97706,
    },
  },
  concurrency: {
    archetype: "storm-giant",
    seed: 65536,
    paletteVariant: 0,
    moons: [
      {
        archetype: "rocky",
        relativeRadius: 0.2,
        distance: 135,
        phase: 2.1,
        seed: 65537,
        orbitalSpeed: 0.15,
      },
    ],
  },
  "asynchronous-io": {
    archetype: "blue-atmospheric",
    seed: 131072,
    paletteVariant: 0,
  },
  "machine-code": {
    archetype: "metallic-world",
    seed: 262144,
    paletteVariant: 0,
  },
};

/**
 * Curated 20 Entrelis Milestone 2 Wave 1 Candidate identities.
 * Stable, deterministic celestial identities using the existing archetype system.
 */
export const WAVE1_CONCEPT_IDENTITIES: Readonly<Record<string, CelestialIdentity>> = {
  compilers: {
    archetype: "blue-star",
    seed: 524288,
    paletteVariant: 0,
  },
  "type-systems": {
    archetype: "crystal-world",
    seed: 1048576,
    paletteVariant: 1,
  },
  "garbage-collection": {
    archetype: "storm-giant",
    seed: 2097152,
    paletteVariant: 0,
    rings: {
      innerRadius: 60,
      outerRadius: 80,
      tilt: 0.3,
      opacity: 0.7,
      style: "dust",
      seed: 2097152,
      color: 0x64748b,
    },
  },
  "data-structures": {
    archetype: "mineral-rocky",
    seed: 4194304,
    paletteVariant: 0,
    rings: {
      innerRadius: 62,
      outerRadius: 85,
      tilt: 0.38,
      opacity: 0.82,
      style: "ice",
      seed: 4194304,
      color: 0x38bdf8,
    },
  },
  "database-systems": {
    archetype: "metallic-world",
    seed: 8388608,
    paletteVariant: 0,
    moons: [
      {
        archetype: "rocky",
        relativeRadius: 0.22,
        distance: 130,
        phase: 0.9,
        seed: 8388609,
        orbitalSpeed: 0.1,
      },
    ],
  },
  "logic-gates": {
    archetype: "crystal-world",
    seed: 16777216,
    paletteVariant: 0,
  },
  "integrated-circuit": {
    archetype: "metallic-world",
    seed: 33554432,
    paletteVariant: 1,
  },
  "microprocessor-revolution": {
    archetype: "ember-star",
    seed: 67108864,
    paletteVariant: 0,
  },
  "von-neumann-architecture": {
    archetype: "golden-star",
    seed: 134217728,
    paletteVariant: 0,
    rings: {
      innerRadius: 70,
      outerRadius: 95,
      tilt: 0.25,
      opacity: 0.85,
      style: "dust",
      seed: 134217728,
      color: 0xf59e0b,
    },
  },
  "history-of-computing": {
    archetype: "volcanic-rocky",
    seed: 268435456,
    paletteVariant: 0,
    moons: [
      {
        archetype: "rocky",
        relativeRadius: 0.25,
        distance: 145,
        phase: 1.8,
        seed: 268435457,
        orbitalSpeed: 0.08,
      },
    ],
  },
  semiconductors: {
    archetype: "mineral-rocky",
    seed: 536870912,
    paletteVariant: 0,
  },
  "transistor-invention": {
    archetype: "ember-star",
    seed: 1073741824,
    paletteVariant: 0,
  },
  "solid-state-physics": {
    archetype: "blue-atmospheric",
    seed: 2147483648,
    paletteVariant: 0,
  },
  atoms: {
    archetype: "blue-star",
    seed: 4294967296,
    paletteVariant: 0,
    moons: [
      {
        archetype: "ice",
        relativeRadius: 0.15,
        distance: 120,
        phase: 0.4,
        seed: 4294967297,
        orbitalSpeed: 0.2,
      },
    ],
  },
  electrons: {
    archetype: "asteroid",
    seed: 8589934592,
    asteroidVariant: "mineral",
  },
  "boolean-logic": {
    archetype: "crystal-world",
    seed: 17179869184,
    paletteVariant: 0,
  },
  "formal-logic": {
    archetype: "life-world",
    seed: 34359738368,
    paletteVariant: 0,
  },
  algorithms: {
    archetype: "blue-atmospheric",
    seed: 68719476736,
    paletteVariant: 0,
  },
  "computability-theory": {
    archetype: "storm-giant",
    seed: 137438953472,
    paletteVariant: 0,
  },
  "alan-turing": {
    archetype: "golden-star",
    seed: 274877906944,
    paletteVariant: 0,
  },
};

export const ALL_CONCEPT_IDENTITIES: Readonly<Record<string, CelestialIdentity>> = {
  ...ENTRELIS_CONCEPT_IDENTITIES,
  ...M2_PILOT_CONCEPT_IDENTITIES,
  ...WAVE1_CONCEPT_IDENTITIES,
};

/**
 * Full Archetype Catalog entries for testing and review in `/lab/celestial-3d`.
 */
export interface CatalogItem {
  readonly id: string;
  readonly name: string;
  readonly category:
    "STARS" | "ROCKY" | "BIOLOGICAL" | "ATMOSPHERIC" | "STRUCTURAL" | "SMALL BODIES";
  readonly identity: CelestialIdentity;
}

export const CATALOG_ARCHETYPES: readonly CatalogItem[] = [
  // Stars
  {
    id: "golden-star",
    name: "Golden Star",
    category: "STARS",
    identity: { archetype: "golden-star", seed: 101 },
  },
  {
    id: "blue-star",
    name: "Blue-White Star",
    category: "STARS",
    identity: { archetype: "blue-star", seed: 102 },
  },
  {
    id: "ember-star",
    name: "Ember Star",
    category: "STARS",
    identity: { archetype: "ember-star", seed: 103 },
  },

  // Rocky
  {
    id: "volcanic-rocky",
    name: "Volcanic World",
    category: "ROCKY",
    identity: { archetype: "volcanic-rocky", seed: 201 },
  },
  {
    id: "mineral-rocky",
    name: "Mineral Desert",
    category: "ROCKY",
    identity: { archetype: "mineral-rocky", seed: 202 },
  },

  // Biological
  {
    id: "life-world",
    name: "Life World",
    category: "BIOLOGICAL",
    identity: { archetype: "life-world", seed: 301 },
  },

  // Atmospheric
  {
    id: "blue-atmospheric",
    name: "Blue Atmospheric",
    category: "ATMOSPHERIC",
    identity: { archetype: "blue-atmospheric", seed: 401 },
  },
  {
    id: "storm-giant",
    name: "Storm Gas Giant",
    category: "ATMOSPHERIC",
    identity: { archetype: "storm-giant", seed: 402 },
  },
  {
    id: "ringed-gas-giant",
    name: "Ringed Gas Giant",
    category: "ATMOSPHERIC",
    identity: {
      archetype: "storm-giant",
      seed: 403,
      rings: {
        innerRadius: 66,
        outerRadius: 96,
        tilt: 0.4,
        opacity: 0.85,
        style: "ice",
        seed: 403,
      },
    },
  },

  // Structural
  {
    id: "metallic-world",
    name: "Metallic World",
    category: "STRUCTURAL",
    identity: { archetype: "metallic-world", seed: 501 },
  },
  {
    id: "crystal-world",
    name: "Crystal World",
    category: "STRUCTURAL",
    identity: { archetype: "crystal-world", seed: 502 },
  },
  {
    id: "ringed-rocky",
    name: "Ringed Structured",
    category: "STRUCTURAL",
    identity: {
      archetype: "mineral-rocky",
      seed: 503,
      rings: {
        innerRadius: 62,
        outerRadius: 84,
        tilt: 0.32,
        opacity: 0.75,
        style: "dust",
        seed: 503,
      },
    },
  },
  {
    id: "broken-ring-world",
    name: "Broken Ring World",
    category: "STRUCTURAL",
    identity: {
      archetype: "mineral-rocky",
      seed: 504,
      rings: {
        innerRadius: 64,
        outerRadius: 88,
        tilt: 0.38,
        opacity: 0.82,
        style: "broken",
        seed: 504,
      },
    },
  },

  // Small Bodies
  {
    id: "asteroid-carbon",
    name: "Carbon Asteroid",
    category: "SMALL BODIES",
    identity: {
      archetype: "asteroid",
      seed: 601,
      asteroidVariant: "carbon",
    },
  },
  {
    id: "asteroid-mineral",
    name: "Mineral Asteroid",
    category: "SMALL BODIES",
    identity: {
      archetype: "asteroid",
      seed: 602,
      asteroidVariant: "mineral",
    },
  },
  {
    id: "asteroid-debris",
    name: "Asteroid + Debris",
    category: "SMALL BODIES",
    identity: {
      archetype: "asteroid",
      seed: 603,
      asteroidVariant: "carbon",
      debris: {
        count: 4,
        seed: 603,
        minDistance: 68,
        maxDistance: 81,
        scale: 0.12,
      },
    },
  },
];

/**
 * Deterministically compute a numeric hash from a string.
 */
function hashString(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

const ALL_ARCHETYPES: readonly CelestialArchetype[] = [
  "golden-star",
  "blue-star",
  "ember-star",
  "volcanic-rocky",
  "mineral-rocky",
  "life-world",
  "blue-atmospheric",
  "storm-giant",
  "metallic-world",
  "crystal-world",
  "asteroid",
];

/**
 * Returns the celestial identity for any concept ID.
 * Uses curated assignment for known seed concepts, and deterministic hash fallback for any other ID.
 */
export function getConceptCelestialIdentity(conceptId: string): CelestialIdentity {
  const normalized = conceptId.toLowerCase().trim();
  const stripped = normalized.startsWith("concept-") ? normalized.slice(8) : normalized;
  const curated =
    ALL_CONCEPT_IDENTITIES[normalized] ??
    ALL_CONCEPT_IDENTITIES[stripped];
  if (curated) {
    return curated;
  }

  const hash = hashString(normalized);
  const archetypeIndex = hash % ALL_ARCHETYPES.length;
  const archetype = ALL_ARCHETYPES[archetypeIndex]!;

  return {
    archetype,
    seed: hash,
  };
}
