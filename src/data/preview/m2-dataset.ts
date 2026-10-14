import type { KnowledgeDataset, Source } from "@/domain/knowledge/types";
import { SEED_CONCEPTS, SEED_RELATIONSHIPS, SEED_SOURCES } from "@/data/seed";
import { PILOT_CONCEPTS, PILOT_RELATIONSHIPS, PILOT_SOURCES } from "./pilot-data";
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
 * The 13-concept, 19-relationship connected preview dataset for Milestone 2 Batch 01.
 * Combines the 7 published production seed concepts with the 6 researched pilot candidates.
 * Strictly maintains reviewStatus: "needs-review" on all pilot entities.
 * Production seed records remain completely isolated and unmodified.
 */
export const M2_PREVIEW_DATASET: KnowledgeDataset = {
  concepts: [...SEED_CONCEPTS, ...PILOT_CONCEPTS],
  relationships: [...SEED_RELATIONSHIPS, ...PILOT_RELATIONSHIPS],
  sources: deduplicateSources([...SEED_SOURCES, ...PILOT_SOURCES]),
};

// Validate integrity at module initialization to guarantee zero schema or relational regressions
assertValidDataset(M2_PREVIEW_DATASET);
