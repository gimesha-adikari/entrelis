import type { SimulationNodeDatum, SimulationLinkDatum } from "d3-force";
import type { Concept, Relationship } from "@/domain/knowledge/types";

/**
 * Production simulation node representing a Concept in the force simulation.
 */
export interface GraphNode extends SimulationNodeDatum {
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
 * Production simulation link representing a directed Relationship between Concepts.
 * Directional invariant strictly maintained: SOURCE --TYPE--> TARGET.
 */
export interface GraphLink extends SimulationLinkDatum<GraphNode> {
  readonly id: string;
  readonly source: string | GraphNode;
  readonly target: string | GraphNode;
  readonly type: string;
  readonly explanation: string;
  readonly strength: "primary" | "strong" | "supporting";
  readonly relationship: Relationship;
}

/**
 * Container for graph elements processed by adapters and engine.
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
