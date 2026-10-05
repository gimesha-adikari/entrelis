import type { SimulationNodeDatum, SimulationLinkDatum } from "d3-force";
import type { Concept, KnowledgeDataset, Relationship } from "@/domain/knowledge/types";

export interface D3SimulationNode extends SimulationNodeDatum {
  id: string;
  name: string;
  concept: Concept;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface D3SimulationLink extends SimulationLinkDatum<D3SimulationNode> {
  id: string;
  source: string | D3SimulationNode;
  target: string | D3SimulationNode;
  type: string;
  explanation: string;
  strength: "primary" | "strong" | "supporting";
  relationship: Relationship;
}

export interface D3GraphData {
  nodes: D3SimulationNode[];
  links: D3SimulationLink[];
}

/**
 * Maps Entrelis KnowledgeDataset into D3-force simulation data structures.
 * Preserves the SOURCE --TYPE--> TARGET directional invariant.
 */
export function createD3GraphData(dataset: KnowledgeDataset): D3GraphData {
  const nodes: D3SimulationNode[] = dataset.concepts.map((concept, index) => {
    const angle = (index / dataset.concepts.length) * 2 * Math.PI;
    const radius = 120;
    return {
      id: concept.id,
      name: concept.name,
      concept,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  });

  const links: D3SimulationLink[] = dataset.relationships.map((rel) => ({
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
