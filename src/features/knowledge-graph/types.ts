import type { Concept, Relationship } from "@/domain/knowledge/types";

export * from "./scene/types";

/**
 * 2D node representation in the knowledge graph.
 */
export interface GraphNode {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly concept: Concept;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

/**
 * Directed link representing a Relationship between Concepts.
 * Directional invariant strictly maintained: SOURCE --TYPE--> TARGET.
 */
export interface GraphLink {
  readonly id: string;
  readonly source: string | GraphNode;
  readonly target: string | GraphNode;
  readonly type: string;
  readonly explanation: string;
  readonly strength: "primary" | "strong" | "supporting";
  readonly relationship: Relationship;
}

/**
 * Container for graph elements.
 */
export interface GraphData {
  readonly nodes: GraphNode[];
  readonly links: GraphLink[];
}

/**
 * 2D pan/zoom camera transform state.
 */
export interface ViewportTransform {
  x: number;
  y: number;
  k: number;
}

/**
 * Visual styling and focus options passed to canvas rendering passes.
 */
export interface CanvasRenderOptions {
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  neighborIds: ReadonlySet<string>;
  isMobile?: boolean;
}
