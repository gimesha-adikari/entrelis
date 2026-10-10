import { CelestialArchetype, CelestialIdentity, CelestialPalette } from "./types";

export const STAR_PALETTES: readonly CelestialPalette[] = [
  {
    name: "solar-amber",
    label: "Solar Amber",
    core: "#fffbeb",
    primary: "#f59e0b",
    secondary: "#b45309",
    limb: "rgba(245, 158, 11, 0.95)",
    corona: "rgba(245, 158, 11, 0.45)",
    darkSide: "#451a03",
  },
  {
    name: "stellar-cyan",
    label: "Stellar Cyan",
    core: "#e0f2fe",
    primary: "#38bdf8",
    secondary: "#0284c7",
    limb: "rgba(56, 189, 248, 0.95)",
    corona: "rgba(56, 189, 248, 0.45)",
    darkSide: "#082f49",
  },
  {
    name: "supernova-rose",
    label: "Supernova Rose",
    core: "#fff1f2",
    primary: "#f43f5e",
    secondary: "#be123c",
    limb: "rgba(244, 63, 94, 0.95)",
    corona: "rgba(244, 63, 94, 0.45)",
    darkSide: "#4c0519",
  },
];

export const ROCKY_PALETTES: readonly CelestialPalette[] = [
  {
    name: "copper-terrene",
    label: "Copper Terrene",
    core: "#fed7aa",
    primary: "#ea580c",
    secondary: "#9a3412",
    limb: "rgba(251, 146, 60, 0.88)",
    corona: "rgba(234, 88, 12, 0.38)",
    darkSide: "#270e06",
  },
  {
    name: "iron-silicate",
    label: "Iron Silicate",
    core: "#e9d5ff",
    primary: "#8b5cf6",
    secondary: "#5b21b6",
    limb: "rgba(167, 139, 250, 0.88)",
    corona: "rgba(139, 92, 246, 0.38)",
    darkSide: "#1e0a3d",
  },
  {
    name: "amber-regolith",
    label: "Amber Regolith",
    core: "#fde68a",
    primary: "#d97706",
    secondary: "#92400e",
    limb: "rgba(251, 191, 36, 0.88)",
    corona: "rgba(217, 119, 6, 0.38)",
    darkSide: "#2d1302",
  },
];

export const GAS_PALETTES: readonly CelestialPalette[] = [
  {
    name: "neptunian-cyan",
    label: "Neptunian Cyan",
    core: "#cffafe",
    primary: "#06b6d4",
    secondary: "#0e7490",
    limb: "rgba(34, 211, 238, 0.90)",
    corona: "rgba(6, 182, 212, 0.40)",
    darkSide: "#083344",
  },
  {
    name: "jovian-amber",
    label: "Jovian Amber",
    core: "#fef3c7",
    primary: "#f59e0b",
    secondary: "#b45309",
    limb: "rgba(252, 211, 77, 0.90)",
    corona: "rgba(245, 158, 11, 0.40)",
    darkSide: "#3b1802",
  },
  {
    name: "auroral-violet",
    label: "Auroral Violet",
    core: "#e0e7ff",
    primary: "#6366f1",
    secondary: "#3730a3",
    limb: "rgba(129, 140, 248, 0.90)",
    corona: "rgba(99, 102, 241, 0.40)",
    darkSide: "#1e1b4b",
  },
];

export const ICE_PALETTES: readonly CelestialPalette[] = [
  {
    name: "glacial-cyan",
    label: "Glacial Cyan",
    core: "#ecfeff",
    primary: "#22d3ee",
    secondary: "#0891b2",
    limb: "rgba(165, 243, 252, 0.92)",
    corona: "rgba(34, 211, 238, 0.40)",
    darkSide: "#0c3647",
  },
  {
    name: "crystal-lavender",
    label: "Crystal Lavender",
    core: "#f5f3ff",
    primary: "#a78bfa",
    secondary: "#6d28d9",
    limb: "rgba(221, 214, 254, 0.92)",
    corona: "rgba(167, 139, 250, 0.40)",
    darkSide: "#210b47",
  },
  {
    name: "polar-white",
    label: "Polar White",
    core: "#f8fafc",
    primary: "#93c5fd",
    secondary: "#2563eb",
    limb: "rgba(224, 242, 254, 0.92)",
    corona: "rgba(147, 197, 253, 0.40)",
    darkSide: "#172554",
  },
];

export const PALETTES_BY_ARCHETYPE: Record<CelestialArchetype, readonly CelestialPalette[]> = {
  star: STAR_PALETTES,
  rocky: ROCKY_PALETTES,
  gas: GAS_PALETTES,
  ice: ICE_PALETTES,
};

const ARCHETYPES: readonly CelestialArchetype[] = ["rocky", "gas", "ice", "star"];

/**
 * 32-bit FNV-1a hash of string
 */
export function hashString(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
}

const identityCache = new Map<string, CelestialIdentity>();

/**
 * Computes a strictly deterministic celestial identity from concept ID.
 * Stable across any focal orientation, visits, or roles.
 */
export function getCelestialIdentity(conceptId: string): CelestialIdentity {
  const existing = identityCache.get(conceptId);
  if (existing) return existing;

  const hash = hashString(conceptId);

  // Deterministic archetype selection
  const archetype = ARCHETYPES[hash % ARCHETYPES.length]!;

  // Deterministic palette selection within archetype family
  const palettes = PALETTES_BY_ARCHETYPE[archetype];
  const paletteIndex = (hash >>> 2) % palettes.length;
  const palette = palettes[paletteIndex]!;

  // Deterministic procedural seed for surface patterns / flares
  const seed = (hash >>> 8) & 0xffff;

  // Staggered non-synchronous animation durations & negative phase delays
  // Rotation: 32s - 50s
  const rotSec = 32 + ((hash >>> 10) % 18);
  const rotationDuration = `${rotSec}s`;
  // Negative phase offset so bodies are already mid-cycle on mount
  const rotDelaySec = -((hash % 100) / 10 + 0.5);
  const rotationDelay = `${rotDelaySec.toFixed(1)}s`;

  // Breathing / pulse: 7s - 10s
  const breathSec = 7 + ((hash >>> 14) % 4);
  const breathingDuration = `${breathSec}s`;
  const breathDelaySec = -(((hash >>> 4) % 70) / 10 + 0.3);
  const breathingDelay = `${breathDelaySec.toFixed(1)}s`;

  // Coherent lighting angle (290° to 330°, consistent upper-left key light)
  const lightAngleDeg = 300 + ((hash % 30) - 15);

  const identity: CelestialIdentity = {
    conceptId,
    archetype,
    palette,
    hash,
    seed,
    rotationDuration,
    rotationDelay,
    breathingDuration,
    breathingDelay,
    lightAngleDeg,
  };

  identityCache.set(conceptId, identity);
  return identity;
}
