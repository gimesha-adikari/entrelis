import type { Concept, Relationship } from "@/domain/knowledge/types";

export interface GraphNodeDisplay {
  id: string;
  label: string;
  concept: Concept;
  x?: number;
  y?: number;
  size?: number;
  color?: string;
}

export interface GraphEdgeDisplay {
  id: string;
  source: string;
  target: string;
  type: string;
  explanation: string;
  strength: "primary" | "strong" | "supporting";
  relationship: Relationship;
}

export interface SpikeGraphData {
  nodes: GraphNodeDisplay[];
  edges: GraphEdgeDisplay[];
}

export interface GraphSelectionState {
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  neighborNodeIds: Set<string>;
  connectedEdgeIds: Set<string>;
}
