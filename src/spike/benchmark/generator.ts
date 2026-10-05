import type {
  Concept,
  KnowledgeDataset,
  Relationship,
  RelationshipStrength,
} from "@/domain/knowledge/types";

/**
 * Generates a synthetic KnowledgeDataset fixture for performance benchmarking.
 * This is strictly a benchmark fixture and must never be committed to permanent seed data.
 */
export function generateSyntheticDataset(nodeCount: number): KnowledgeDataset {
  const concepts: Concept[] = [];
  const relationships: Relationship[] = [];

  for (let i = 0; i < nodeCount; i++) {
    concepts.push({
      id: `synthetic-concept-${i}`,
      name: `Synthetic Concept ${i}`,
      slug: `synthetic-concept-${i}`,
      shortDescription: `Benchmark concept ${i} for graph rendering performance evaluation.`,
      domains: ["systems-engineering"],
      tags: ["synthetic", "benchmark"],
      sourceIds: ["source-synthetic"],
      reviewStatus: "draft",
    });
  }

  // Create a realistic sparse graph structure (average degree ~ 2-3)
  const strengths: readonly RelationshipStrength[] = ["primary", "strong", "supporting"];
  for (let i = 0; i < nodeCount - 1; i++) {
    const strength = strengths[i % strengths.length] ?? "supporting";

    // Chain / backbone edge
    relationships.push({
      id: `synthetic-rel-backbone-${i}`,
      sourceConceptId: concepts[i]!.id,
      targetConceptId: concepts[i + 1]!.id,
      type: "related-to",
      strength,
      explanation: `Synthetic connection from node ${i} to ${i + 1}.`,
      sourceIds: ["source-synthetic"],
      reviewStatus: "draft",
    });

    // Cross-links for a subset of nodes (every 3rd node links forward)
    if (i % 3 === 0 && i + 4 < nodeCount) {
      relationships.push({
        id: `synthetic-rel-cross-${i}`,
        sourceConceptId: concepts[i]!.id,
        targetConceptId: concepts[i + 4]!.id,
        type: "depends-on",
        strength: "supporting",
        explanation: `Synthetic cross-connection from node ${i} to ${i + 4}.`,
        sourceIds: ["source-synthetic"],
        reviewStatus: "draft",
      });
    }
  }

  return {
    concepts,
    relationships,
    sources: [
      {
        id: "source-synthetic",
        title: "Synthetic Benchmark Fixture Source",
        url: "https://entrelis.dev/benchmarks",
        publisher: "Entrelis Internal Benchmark",
        type: "reference",
      },
    ],
  };
}
