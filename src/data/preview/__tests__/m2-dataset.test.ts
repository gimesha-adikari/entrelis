import { describe, it, expect } from "vitest";
import { SEED_CONCEPTS, SEED_RELATIONSHIPS, SEED_DATASET } from "@/data/seed";
import { M2_PREVIEW_DATASET, PILOT_CONCEPTS, PILOT_RELATIONSHIPS } from "@/data/preview";
import { validateDataset } from "@/domain/knowledge/validation";

describe("M2 Preview Dataset Integrity", () => {
  it("contains exactly 13 concepts and 19 relationships", () => {
    expect(M2_PREVIEW_DATASET.concepts).toHaveLength(13);
    expect(M2_PREVIEW_DATASET.relationships).toHaveLength(19);
  });

  it("preserves the original production seed dataset unchanged", () => {
    expect(SEED_DATASET.concepts).toHaveLength(7);
    expect(SEED_DATASET.relationships).toHaveLength(8);
    expect(SEED_CONCEPTS).toHaveLength(7);
    expect(SEED_RELATIONSHIPS).toHaveLength(8);
  });

  it("strictly preserves reviewStatus: 'needs-review' for all 6 pilot concepts", () => {
    expect(PILOT_CONCEPTS).toHaveLength(6);
    for (const pilot of PILOT_CONCEPTS) {
      expect(pilot.reviewStatus).toBe("needs-review");
      const inDataset = M2_PREVIEW_DATASET.concepts.find((c) => c.id === pilot.id);
      expect(inDataset).toBeDefined();
      expect(inDataset?.reviewStatus).toBe("needs-review");
    }
  });

  it("strictly preserves reviewStatus: 'needs-review' for all 11 pilot relationships", () => {
    expect(PILOT_RELATIONSHIPS).toHaveLength(11);
    for (const rel of PILOT_RELATIONSHIPS) {
      expect(rel.reviewStatus).toBe("needs-review");
      const inDataset = M2_PREVIEW_DATASET.relationships.find((r) => r.id === rel.id);
      expect(inDataset).toBeDefined();
      expect(inDataset?.reviewStatus).toBe("needs-review");
    }
  });

  it("has unique concept IDs and slugs across all 13 nodes", () => {
    const ids = new Set(M2_PREVIEW_DATASET.concepts.map((c) => c.id));
    const slugs = new Set(M2_PREVIEW_DATASET.concepts.map((c) => c.slug));
    expect(ids.size).toBe(13);
    expect(slugs.size).toBe(13);
  });

  it("has unique relationship IDs across all 19 edges", () => {
    const relIds = new Set(M2_PREVIEW_DATASET.relationships.map((r) => r.id));
    expect(relIds.size).toBe(19);
  });

  it("passes domain dataset validation with zero errors", () => {
    const result = validateDataset(M2_PREVIEW_DATASET);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("forms exactly one connected component with zero isolated nodes", () => {
    const conceptIds = new Set(M2_PREVIEW_DATASET.concepts.map((c) => c.id));
    const adjacency = new Map<string, Set<string>>();

    for (const id of conceptIds) {
      adjacency.set(id, new Set());
    }

    for (const rel of M2_PREVIEW_DATASET.relationships) {
      expect(conceptIds.has(rel.sourceConceptId)).toBe(true);
      expect(conceptIds.has(rel.targetConceptId)).toBe(true);
      adjacency.get(rel.sourceConceptId)!.add(rel.targetConceptId);
      adjacency.get(rel.targetConceptId)!.add(rel.sourceConceptId);
    }

    // Zero isolated nodes
    for (const [id, neighbors] of adjacency.entries()) {
      expect(neighbors.size, `Concept ${id} is isolated`).toBeGreaterThanOrEqual(1);
    }

    // Single connected component via BFS from root 'concept-rust'
    const visited = new Set<string>();
    const queue = ["concept-rust"];
    visited.add("concept-rust");

    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = adjacency.get(current) ?? new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    expect(visited.size).toBe(13);
  });
});
