import type { Concept, Relationship } from "@/domain/knowledge/types";

/**
 * Visual and structural role of a concept node in a local universe scene.
 */
export type UniverseNodeRole = "focus" | "primary" | "context";

/**
 * Node within a local universe scene, holding both knowledge identity and spatial properties.
 */
export interface UniverseNode {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly concept: Concept;
  readonly role: UniverseNodeRole;
  readonly visualMass: number;
  readonly radius: number;
  x: number;
  y: number;
  z?: number;
  opacity: number;
  readonly parentPrimaryId?: string;
  readonly orbitalAngle?: number;
  readonly orbitalDistance?: number;
  labelOffsetX?: number;
  labelOffsetY?: number;
  labelAlignment?: "left" | "center" | "right";
  labelBaseline?: CanvasTextBaseline;
  labelFontSize?: number;
}

/**
 * Visual role of a relationship in the local scene.
 */
export type UniverseRelationshipRole = "focus-connection" | "context-connection";

/**
 * Directed relationship path between nodes in the local universe.
 * Invariant: sourceId and targetId maintain strict SOURCE --TYPE--> TARGET direction.
 */
export interface UniverseRelationship {
  readonly id: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly type: string;
  readonly explanation: string;
  readonly strength: "primary" | "strong" | "supporting";
  readonly relationship: Relationship;
  readonly role: UniverseRelationshipRole;
  readonly curvature: number;
  opacity: number;
}

/**
 * Complete composed local universe scene.
 */
export interface UniverseScene {
  readonly focus: UniverseNode;
  readonly primaryNodes: readonly UniverseNode[];
  readonly contextNodes: readonly UniverseNode[];
  readonly allNodes: readonly UniverseNode[];
  readonly relationships: readonly UniverseRelationship[];
  readonly isMobile: boolean;
}

/**
 * Policy limits for visible scene budget.
 */
export interface SceneBudgetPolicy {
  readonly maxPrimary: number;
  readonly maxContext: number;
  readonly maxTotal: number;
}

/**
 * Default budgets for Desktop and Mobile viewports.
 * Desktop: 1 focus + up to 6 primary + up to 3 context = max 10.
 * Mobile: 1 focus + up to 4 primary + up to 1 context = max 6.
 */
export const DESKTOP_SCENE_BUDGET: SceneBudgetPolicy = {
  maxPrimary: 6,
  maxContext: 3,
  maxTotal: 10,
};

export const MOBILE_SCENE_BUDGET: SceneBudgetPolicy = {
  maxPrimary: 4,
  maxContext: 1,
  maxTotal: 6,
};
