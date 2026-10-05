import type { KnowledgeDataset } from "@/domain/knowledge/types";
import { SEED_CONCEPTS } from "./concepts";
import { SEED_RELATIONSHIPS } from "./relationships";
import { SEED_SOURCES } from "./sources";

export { SEED_CONCEPTS } from "./concepts";
export { SEED_RELATIONSHIPS } from "./relationships";
export { SEED_SOURCES } from "./sources";

/**
 * The initial curated seed dataset for Entrelis.
 */
export const SEED_DATASET: KnowledgeDataset = {
  concepts: SEED_CONCEPTS,
  relationships: SEED_RELATIONSHIPS,
  sources: SEED_SOURCES,
};

/**
 * Helper to retrieve the active seed dataset.
 */
export function getSeedDataset(): KnowledgeDataset {
  return SEED_DATASET;
}
