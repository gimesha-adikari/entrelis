import { describe, it, expect } from "vitest";
import { SEED_CONCEPTS, SEED_RELATIONSHIPS, SEED_DATASET } from "@/data/seed";
import {
  M2_PREVIEW_DATASET,
  PILOT_CONCEPTS,
  PILOT_RELATIONSHIPS,
  WAVE1_PREVIEW_DATASET,
  WAVE1_NEW_CONCEPTS,
  WAVE1_CANDIDATE_RELATIONSHIPS,
  getConceptOverview,
  hasArticleForSlug,
  AVAILABLE_ARTICLE_SLUGS,
} from "@/data/preview";
import { validateDataset } from "@/domain/knowledge/validation";
import { getConceptCelestialIdentity } from "@/features/knowledge-graph/celestial-3d/identity";

function countWords(str: string): number {
  return str.trim().split(/\s+/).filter(Boolean).length;
}

describe("Wave 1 Preview Dataset Integrity (33 Nodes, 61 Edges)", () => {
  it("contains exactly 33 unique concepts and 61 unique relationships", () => {
    expect(WAVE1_PREVIEW_DATASET.concepts).toHaveLength(33);
    expect(WAVE1_PREVIEW_DATASET.relationships).toHaveLength(61);
  });

  it("preserves the original production seed dataset unchanged", () => {
    expect(SEED_DATASET.concepts).toHaveLength(7);
    expect(SEED_DATASET.relationships).toHaveLength(8);
    expect(SEED_CONCEPTS).toHaveLength(7);
    expect(SEED_RELATIONSHIPS).toHaveLength(8);
  });

  it("preserves the M2 13-node preview baseline dataset unchanged", () => {
    expect(M2_PREVIEW_DATASET.concepts).toHaveLength(13);
    expect(M2_PREVIEW_DATASET.relationships).toHaveLength(19);
    expect(PILOT_CONCEPTS).toHaveLength(6);
    expect(PILOT_RELATIONSHIPS).toHaveLength(11);
  });

  it("contains exactly 20 new candidate concepts and 53 candidate relationships", () => {
    expect(WAVE1_NEW_CONCEPTS).toHaveLength(20);
    expect(WAVE1_CANDIDATE_RELATIONSHIPS).toHaveLength(53);
  });

  it("strictly preserves reviewStatus: 'needs-review' for all 26 candidate concepts", () => {
    const candidateConcepts = [...PILOT_CONCEPTS, ...WAVE1_NEW_CONCEPTS];
    expect(candidateConcepts).toHaveLength(26);

    for (const c of candidateConcepts) {
      expect(c.reviewStatus).toBe("needs-review");
      const inDataset = WAVE1_PREVIEW_DATASET.concepts.find((item) => item.id === c.id);
      expect(inDataset).toBeDefined();
      expect(inDataset?.reviewStatus).toBe("needs-review");
    }
  });

  it("strictly preserves reviewStatus: 'needs-review' for all 53 candidate relationships", () => {
    expect(WAVE1_CANDIDATE_RELATIONSHIPS).toHaveLength(53);
    for (const r of WAVE1_CANDIDATE_RELATIONSHIPS) {
      expect(r.reviewStatus).toBe("needs-review");
      const inDataset = WAVE1_PREVIEW_DATASET.relationships.find((item) => item.id === r.id);
      expect(inDataset).toBeDefined();
      expect(inDataset?.reviewStatus).toBe("needs-review");
    }
  });

  it("has unique concept IDs and slugs across all 33 nodes", () => {
    const ids = new Set(WAVE1_PREVIEW_DATASET.concepts.map((c) => c.id));
    const slugs = new Set(WAVE1_PREVIEW_DATASET.concepts.map((c) => c.slug));
    expect(ids.size).toBe(33);
    expect(slugs.size).toBe(33);
  });

  it("has unique relationship IDs across all 61 edges", () => {
    const relIds = new Set(WAVE1_PREVIEW_DATASET.relationships.map((r) => r.id));
    expect(relIds.size).toBe(61);
  });

  it("passes domain dataset validation with zero errors", () => {
    const result = validateDataset(WAVE1_PREVIEW_DATASET);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("forms exactly one connected component with zero isolated nodes and all nodes degree >= 2", () => {
    const conceptIds = new Set(WAVE1_PREVIEW_DATASET.concepts.map((c) => c.id));
    const adjacency = new Map<string, Set<string>>();

    for (const id of conceptIds) {
      adjacency.set(id, new Set());
    }

    for (const rel of WAVE1_PREVIEW_DATASET.relationships) {
      expect(conceptIds.has(rel.sourceConceptId)).toBe(true);
      expect(conceptIds.has(rel.targetConceptId)).toBe(true);
      adjacency.get(rel.sourceConceptId)!.add(rel.targetConceptId);
      adjacency.get(rel.targetConceptId)!.add(rel.sourceConceptId);
    }

    // Zero isolated nodes and all nodes degree >= 2
    for (const [id, neighbors] of adjacency.entries()) {
      expect(neighbors.size, `Concept ${id} has degree < 2 (${neighbors.size})`).toBeGreaterThanOrEqual(2);
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

    expect(visited.size).toBe(33);
  });

  it("provides valid Level 1 overviews (80-130 words, 2 paragraphs) for all 33 concepts", () => {
    for (const concept of WAVE1_PREVIEW_DATASET.concepts) {
      const overview = getConceptOverview(concept.id);
      expect(overview, `Overview missing for ${concept.id}`).toBeDefined();
      expect(overview?.conceptId).toBe(concept.id);
      expect(overview?.slug).toBe(concept.slug);
      expect(overview?.paragraphs).toHaveLength(2);

      const totalWords =
        countWords(overview!.paragraphs[0]) + countWords(overview!.paragraphs[1]);
      expect(
        totalWords,
        `Overview for ${concept.id} has ${totalWords} words (must be 80-130)`
      ).toBeGreaterThanOrEqual(80);
      expect(
        totalWords,
        `Overview for ${concept.id} has ${totalWords} words (must be 80-130)`
      ).toBeLessThanOrEqual(130);

      // Verify retrieval by slug as well
      const bySlug = getConceptOverview(concept.slug);
      expect(bySlug).toBeDefined();
      expect(bySlug?.conceptId).toBe(concept.id);
    }
  });

  it("strictly enforces that only the 13 pilot and seed concepts have full articles", () => {
    expect(AVAILABLE_ARTICLE_SLUGS.size).toBe(13);

    const initial13Slugs = new Set([
      "rust",
      "ownership",
      "memory",
      "stack-and-heap",
      "operating-systems",
      "cpus",
      "transistors",
      "instruction-set-architecture",
      "virtual-memory",
      "file-systems",
      "concurrency",
      "asynchronous-io",
      "machine-code",
    ]);

    for (const concept of WAVE1_PREVIEW_DATASET.concepts) {
      if (initial13Slugs.has(concept.slug)) {
        expect(hasArticleForSlug(concept.slug), `Article should exist for ${concept.slug}`).toBe(true);
      } else {
        expect(
          hasArticleForSlug(concept.slug),
          `Article should NOT exist for new Wave 1 concept ${concept.slug}`
        ).toBe(false);
      }
    }
  });

  it("provides deterministic celestial identities for all 33 concepts", () => {
    for (const concept of WAVE1_PREVIEW_DATASET.concepts) {
      const identity = getConceptCelestialIdentity(concept.slug);
      expect(identity).toBeDefined();
      expect(identity.archetype).toBeDefined();
      expect(typeof identity.seed).toBe("number");
    }
  });
});
