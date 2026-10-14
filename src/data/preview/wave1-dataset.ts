import type { KnowledgeDataset, Source } from "@/domain/knowledge/types";
import { SEED_CONCEPTS, SEED_RELATIONSHIPS, SEED_SOURCES } from "@/data/seed";
import { PILOT_CONCEPTS, PILOT_SOURCES } from "./pilot-data";
import { WAVE1_NEW_CONCEPTS, WAVE1_CANDIDATE_RELATIONSHIPS, WAVE1_NEW_SOURCES } from "./wave1-data";
import { assertValidDataset } from "@/domain/knowledge/validation";

/**
 * Deduplicates sources by unique ID, keeping the authoritative entry.
 */
function deduplicateSources(sources: readonly Source[]): readonly Source[] {
  const map = new Map<string, Source>();
  for (const s of sources) {
    if (!map.has(s.id)) {
      map.set(s.id, s);
    }
  }
  return Array.from(map.values());
}

/**
 * The 33-concept, 61-relationship connected preview dataset for Milestone 2 Wave 1.
 * Combines the 7 published production seed concepts, the 6 researched pilot candidates,
 * and the 20 new Wave 1 candidate concepts into a unified connected graph.
 *
 * Topological guarantees:
 * - Exactly 33 unique concepts
 * - Exactly 61 unique relationships (8 seed + 53 candidate relationships)
 * - Exactly 1 single connected component (0 isolated nodes, degree >= 2 for every node)
 * - All 26 candidate concepts and 53 relationships strictly maintain reviewStatus: "needs-review"
 * - Production seed records remain completely isolated and unmodified.
 */
export const WAVE1_PREVIEW_DATASET: KnowledgeDataset = {
  concepts: [...SEED_CONCEPTS, ...PILOT_CONCEPTS, ...WAVE1_NEW_CONCEPTS],
  relationships: [...SEED_RELATIONSHIPS, ...WAVE1_CANDIDATE_RELATIONSHIPS],
  sources: deduplicateSources([...SEED_SOURCES, ...PILOT_SOURCES, ...WAVE1_NEW_SOURCES]),
};

// Validate integrity at module initialization to guarantee zero schema or relational regressions
assertValidDataset(WAVE1_PREVIEW_DATASET);
