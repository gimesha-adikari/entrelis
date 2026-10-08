export { UniverseScene, type UniverseSceneOptions, type ParallaxOffsets } from "./UniverseScene";
export {
  generateStarFieldGeometry,
  getStarCountsForTier,
  STAR_TIER_CONFIGS,
  type StarTier,
  type StarTierConfig,
} from "./star-field-generator";
export { createDeepSpaceMaterial } from "./deep-space-shader";
export { createStarMaterial } from "./star-shader";
export { SeededPRNG } from "./prng";
export {
  computeTravelOffsets,
  interpolateTravelOffset,
  easeMonotonic,
  type UniverseTravelState,
  type TravelOffsets,
  TRAVEL_PARALLAX_RATES,
  ZERO_TRAVEL_OFFSETS,
} from "./travel";
