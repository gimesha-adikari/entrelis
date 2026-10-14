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
  calculateNavigationStep,
  resolveDestinationAnchor,
  registerConceptAnchor,
  getRememberedAnchor,
  type UniverseTravelState,
  type TravelOffsets,
  type ConceptSpatialAnchor,
  type ConceptAnchorMap,
  type SceneNavigationNode,
  TRAVEL_PARALLAX_RATES,
  ZERO_TRAVEL_OFFSETS,
} from "./travel";
