import { describe, it, expect } from "vitest";
import { SEED_DATASET } from "@/data/seed";
import { createKnowledgeGraphIndex, getOrCreateKnowledgeGraphIndex } from "./knowledge-index";

describe("KnowledgeGraphIndex", () => {
  it("indexes concepts by ID and slug", () => {
    const index = createKnowledgeGraphIndex(SEED_DATASET);

    expect(index.conceptById.size).toBe(SEED_DATASET.concepts.length);
    expect(index.conceptBySlug.size).toBe(SEED_DATASET.concepts.length);

    const rustById = index.conceptById.get("concept-rust");
    expect(rustById).toBeDefined();
    expect(rustById?.name).toBe("Rust");

    const rustBySlug = index.conceptBySlug.get("rust");
    expect(rustBySlug).toBe(rustById);
  });

  it("indexes relationships by concept ID preserving both inbound and outbound adjacency", () => {
    const index = createKnowledgeGraphIndex(SEED_DATASET);

    const rustRels = index.relationshipsByConceptId.get("concept-rust") ?? [];
    expect(rustRels.length).toBeGreaterThan(0);

    // Every relationship connected to Rust in the seed dataset must be present
    const expectedRustRels = SEED_DATASET.relationships.filter(
      (r) => r.sourceConceptId === "concept-rust" || r.targetConceptId === "concept-rust"
    );
    expect(rustRels.length).toBe(expectedRustRels.length);

    // Verify all relationships in dataset are indexed without omission
    let totalIndexedReferences = 0;
    for (const rels of index.relationshipsByConceptId.values()) {
      totalIndexedReferences += rels.length;
    }
    // Each undirected connection appears in 2 concept buckets
    expect(totalIndexedReferences).toBe(SEED_DATASET.relationships.length * 2);
  });

  it("indexes sources by ID", () => {
    const index = createKnowledgeGraphIndex(SEED_DATASET);

    expect(index.sourceById.size).toBe(SEED_DATASET.sources.length);
    for (const source of SEED_DATASET.sources) {
      expect(index.sourceById.get(source.id)).toBe(source);
    }
  });

  it("memoizes index via getOrCreateKnowledgeGraphIndex for identical dataset references", () => {
    const index1 = getOrCreateKnowledgeGraphIndex(SEED_DATASET);
    const index2 = getOrCreateKnowledgeGraphIndex(SEED_DATASET);
    expect(index1).toBe(index2);
  });
});
