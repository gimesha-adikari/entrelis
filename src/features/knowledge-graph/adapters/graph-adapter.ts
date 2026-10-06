import type { KnowledgeDataset } from "@/domain/knowledge/types";
import type { GraphData, GraphNode, GraphLink } from "../types";

/**
 * Maps Entrelis KnowledgeDataset into production simulation data structures.
 * Strictly preserves the SOURCE --TYPE--> TARGET directional invariant.
 *
 * Positions nodes initially in a stable circular arrangement so layout starts deterministically.
 */
export function createGraphData(dataset: KnowledgeDataset): GraphData {
  const count = dataset.concepts.length;
  const radius = 120;

  const nodes: GraphNode[] = dataset.concepts.map((concept, index) => {
    const angle = count > 0 ? (index / count) * 2 * Math.PI : 0;
    return {
      id: concept.id,
      slug: concept.slug,
      name: concept.name,
      concept,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  });

  const links: GraphLink[] = dataset.relationships.map((rel) => ({
    id: rel.id,
    source: rel.sourceConceptId,
    target: rel.targetConceptId,
    type: rel.type,
    explanation: rel.explanation,
    strength: rel.strength,
    relationship: rel,
  }));

  return { nodes, links };
}
