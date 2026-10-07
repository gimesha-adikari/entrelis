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
  getConceptUniverseAnchor,
  type UniverseTravelState,
  type TravelOffsets,
  TRAVEL_RATES,
} from "./travel";
