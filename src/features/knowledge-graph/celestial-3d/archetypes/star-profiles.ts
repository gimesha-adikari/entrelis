/**
 * Visual profiles for the Entrelis star family.
 *
 * Pure data (no Three.js dependency) so it can be unit tested and shared by the
 * surface shader, the corona shader and the factory.
 *
 * Colours are LINEAR RGB and may exceed 1.0 (HDR). They are tone mapped by the
 * renderer's ACES Filmic operator, which rolls the hottest values toward white.
 */
export type StarArchetype = "golden-star" | "blue-star" | "ember-star";

export type LinearRGB = readonly [number, number, number];

export interface StarProminence {
  /** Position angle around the limb (radians, 0 = +x, counter-clockwise). */
  readonly angle: number;
  /** Angular half-width (radians). */
  readonly width: number;
  /** Radial extent above the limb (in stellar radii). */
  readonly height: number;
  /** Relative brightness. */
  readonly strength: number;
}

export interface StarSurfaceProfile {
  /** Five-stop temperature ramp: [lane, cool, mid, hot, hottest]. */
  readonly ramp: readonly [LinearRGB, LinearRGB, LinearRGB, LinearRGB, LinearRGB];
  /** Temperature positions for ramp[1], ramp[2], ramp[3] (ramp[0] = 0, ramp[4] = 1). */
  readonly stops: readonly [number, number, number];
  /** Extra HDR emission added where the field's `hot` mask is set. */
  readonly hotColor: LinearRGB;
  readonly hotBoost: number;
  /** Limb darkening coefficient (0 = none, 1 = black at limb). */
  readonly limbDarkening: number;
  /** Exponent on mu; < 1 darkens a narrow band, > 1 darkens broadly. */
  readonly limbExponent: number;
  /** Colour multiplier applied toward the limb (limb reddening / cooling). */
  readonly limbTint: LinearRGB;
  /** Thin limb brightening (used by the compact Blue-White star). */
  readonly rimColor: LinearRGB;
  readonly rimStrength: number;
  readonly intensity: number;
}

export interface StarCoronaProfile {
  /** Half-size of the corona plane in stellar radii. */
  readonly extent: number;
  /** Outer envelope scale height in stellar radii (larger = softer, broader). */
  readonly scaleHeight: number;
  readonly outerStrength: number;
  /** Inner, limb-hugging component. */
  readonly innerHeight: number;
  readonly innerStrength: number;
  /** Low-frequency asymmetry of the envelope (no spikes). */
  readonly lobeAmplitude: number;
  readonly lobeFrequency: number;
  readonly innerColor: LinearRGB;
  readonly outerColor: LinearRGB;
  readonly prominences: readonly StarProminence[];
  /** Temporal variation: fraction (0.02–0.04) over the given period, out of phase by region. */
  readonly variationAmplitude: number;
  readonly variationPeriodSec: number;
}

export interface StarProfile {
  readonly archetype: StarArchetype;
  readonly rotationPeriodSec: number;
  readonly tiltZ: number;
  readonly surface: StarSurfaceProfile;
  readonly corona: StarCoronaProfile;
}

export const MAX_STAR_PROMINENCES = 3;

/** Hover response: deliberately tiny. */
export const STAR_HOVER_SURFACE_GAIN = 0.025;
export const STAR_HOVER_CORONA_GAIN = 0.04;

export const STAR_PROFILES: Readonly<Record<StarArchetype, StarProfile>> = {
  /**
   * Mature solar-type star: warm white / pale yellow / restrained gold.
   * Medium, balanced corona with broad irregular lobes and two rare, faint prominences.
   */
  "golden-star": {
    archetype: "golden-star",
    rotationPeriodSec: 86,
    tiltZ: 0.12,
    surface: {
      ramp: [
        [0.42, 0.17, 0.04],
        [0.98, 0.6, 0.22],
        [1.32, 1.0, 0.52],
        [1.62, 1.42, 0.98],
        [2.0, 1.86, 1.5],
      ],
      stops: [0.3, 0.52, 0.72],
      hotColor: [0.55, 0.5, 0.38],
      hotBoost: 0.5,
      limbDarkening: 0.5,
      limbExponent: 0.62,
      limbTint: [1.0, 0.7, 0.42],
      rimColor: [0, 0, 0],
      rimStrength: 0,
      intensity: 1.0,
    },
    corona: {
      extent: 2.2,
      scaleHeight: 0.2,
      outerStrength: 0.42,
      innerHeight: 0.055,
      innerStrength: 0.55,
      lobeAmplitude: 0.42,
      lobeFrequency: 1.15,
      innerColor: [1.25, 1.0, 0.62],
      outerColor: [0.95, 0.55, 0.2],
      prominences: [
        { angle: 0.72, width: 0.075, height: 0.13, strength: 0.32 },
        { angle: 3.95, width: 0.055, height: 0.09, strength: 0.22 },
      ],
      variationAmplitude: 0.03,
      variationPeriodSec: 14,
    },
  },

  /**
   * Extremely hot compact star: white / pale blue-white / subtle cyan.
   * Weak limb darkening, crisp body, tight sharp corona slightly brighter at the limb.
   */
  "blue-star": {
    archetype: "blue-star",
    rotationPeriodSec: 68,
    tiltZ: -0.08,
    surface: {
      ramp: [
        [0.36, 0.58, 1.1],
        [0.86, 1.1, 1.5],
        [1.4, 1.62, 1.95],
        [2.0, 2.15, 2.4],
        [2.7, 2.8, 2.95],
      ],
      stops: [0.3, 0.55, 0.78],
      hotColor: [0.55, 0.6, 0.7],
      hotBoost: 0.55,
      limbDarkening: 0.32,
      limbExponent: 0.9,
      limbTint: [0.62, 0.8, 1.15],
      rimColor: [0.55, 0.78, 1.25],
      rimStrength: 0.35,
      intensity: 1.0,
    },
    corona: {
      extent: 1.65,
      scaleHeight: 0.085,
      outerStrength: 0.36,
      innerHeight: 0.028,
      innerStrength: 1.05,
      lobeAmplitude: 0.16,
      lobeFrequency: 1.6,
      innerColor: [1.25, 1.45, 1.85],
      outerColor: [0.42, 0.68, 1.25],
      prominences: [],
      variationAmplitude: 0.025,
      variationPeriodSec: 11,
    },
  },

  /**
   * Large cool red giant: deep red-orange envelope, obsidian lanes, molten amber cells.
   * Softer, broader, irregular diffuse envelope communicates scale.
   */
  "ember-star": {
    archetype: "ember-star",
    rotationPeriodSec: 122,
    tiltZ: 0.2,
    surface: {
      ramp: [
        [0.03, 0.004, 0.002],
        [0.26, 0.03, 0.01],
        [0.82, 0.18, 0.035],
        [1.25, 0.46, 0.09],
        [1.75, 0.95, 0.34],
      ],
      stops: [0.24, 0.5, 0.74],
      hotColor: [0.9, 0.48, 0.12],
      hotBoost: 0.55,
      limbDarkening: 0.62,
      limbExponent: 0.85,
      limbTint: [0.85, 0.45, 0.3],
      rimColor: [0, 0, 0],
      rimStrength: 0,
      intensity: 1.0,
    },
    corona: {
      extent: 2.75,
      scaleHeight: 0.4,
      outerStrength: 0.34,
      innerHeight: 0.12,
      innerStrength: 0.42,
      lobeAmplitude: 0.5,
      lobeFrequency: 0.95,
      innerColor: [0.95, 0.3, 0.07],
      outerColor: [0.5, 0.08, 0.025],
      prominences: [{ angle: 2.35, width: 0.16, height: 0.26, strength: 0.18 }],
      variationAmplitude: 0.035,
      variationPeriodSec: 17,
    },
  },
};

export function isStarArchetype(value: string): value is StarArchetype {
  return value === "golden-star" || value === "blue-star" || value === "ember-star";
}
