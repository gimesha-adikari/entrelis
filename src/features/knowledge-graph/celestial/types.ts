export type CelestialArchetype = "rocky" | "gas" | "ice" | "star";

export type CelestialRole = "focus" | "primary" | "context";

export interface CelestialPalette {
  readonly name: string;
  readonly label: string;
  readonly core: string; // Center / highlight tint
  readonly primary: string; // Main body base color
  readonly secondary: string; // Deep shadow / terminator color
  readonly limb: string; // Atmospheric rim / fresnel glow
  readonly corona: string; // Outer atmospheric bloom
  readonly darkSide: string; // Deep space terminator shade
}

export interface CelestialIdentity {
  readonly conceptId: string;
  readonly archetype: CelestialArchetype;
  readonly palette: CelestialPalette;
  readonly hash: number;
  readonly seed: number; // Deterministic procedural seed for texture variation
  readonly rotationDuration: string; // e.g. "36s"
  readonly rotationDelay: string; // e.g. "-4.2s"
  readonly breathingDuration: string; // e.g. "8.5s"
  readonly breathingDelay: string; // e.g. "-2.7s"
  readonly lightAngleDeg: number; // Coherent celestial light direction (e.g. 315° / top-left)
}

export interface CelestialNodeProps {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly role: CelestialRole;
  readonly x?: number;
  readonly y?: number;
  readonly isSelected?: boolean;
  readonly isHovered?: boolean;
  readonly isMobile?: boolean;
  readonly onClick?: () => void;
  readonly onHover?: (id: string | null) => void;
  readonly className?: string;
  readonly testId?: string;
  readonly style?: React.CSSProperties;
  readonly showLabel?: boolean;
  /** Explicit archetype override (used in showcase / lab) */
  readonly forcedArchetype?: CelestialArchetype;
  /** Explicit palette override (used in showcase / lab) */
  readonly forcedPalette?: CelestialPalette;
}
