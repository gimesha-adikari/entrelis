import type { Concept, KnowledgeDataset, Relationship } from "@/domain/knowledge/types";
import {
  type UniverseNode,
  type UniverseRelationship,
  type UniverseScene,
  type SceneBudgetPolicy,
  DESKTOP_SCENE_BUDGET,
  MOBILE_SCENE_BUDGET,
} from "./types";

export interface BuildSceneOptions {
  readonly dataset: KnowledgeDataset;
  readonly focusSlug?: string;
  readonly isMobile?: boolean;
  readonly budget?: SceneBudgetPolicy;
}

const STRENGTH_SCORE: Record<Relationship["strength"], number> = {
  primary: 3,
  strong: 2,
  supporting: 1,
};

/**
 * Deterministically constructs a bounded UniverseScene for the selected concept.
 *
 * Rules:
 * 1. Focus concept is visual anchor (visualMass: 1.0).
 * 2. Primary direct neighbors ranked by relationship strength then stable ID order.
 * 3. Context concepts (2nd-degree) selected exclusively through visible primary neighbors.
 * 4. Strict budget bounds enforced (Desktop <= 10, Mobile <= 6).
 * 5. Strict SOURCE --TYPE--> TARGET directional invariant maintained on all relationships.
 */
export function buildLocalUniverseScene(options: BuildSceneOptions): UniverseScene {
  const { dataset, focusSlug = "rust", isMobile = false } = options;
  const budget = options.budget ?? (isMobile ? MOBILE_SCENE_BUDGET : DESKTOP_SCENE_BUDGET);

  // 1. Resolve focus concept
  const focusConcept =
    dataset.concepts.find((c) => c.slug === focusSlug) ??
    dataset.concepts.find((c) => c.slug === "rust") ??
    dataset.concepts[0];

  if (!focusConcept) {
    throw new Error("Cannot build universe scene: dataset has no concepts");
  }

  const focusNode: UniverseNode = {
    id: focusConcept.id,
    slug: focusConcept.slug,
    name: focusConcept.name,
    concept: focusConcept,
    role: "focus",
    visualMass: 1.0,
    radius: 22,
    x: 0,
    y: 0,
    opacity: 1.0,
  };

  // 2. Rank direct primary neighbors
  interface PrimaryCandidate {
    concept: Concept;
    maxStrengthScore: number;
    relationshipIds: string[];
  }

  const primaryCandidateMap = new Map<string, PrimaryCandidate>();

  for (const rel of dataset.relationships) {
    let otherId: string | null = null;
    if (rel.sourceConceptId === focusConcept.id) {
      otherId = rel.targetConceptId;
    } else if (rel.targetConceptId === focusConcept.id) {
      otherId = rel.sourceConceptId;
    }

    if (!otherId) continue;

    const otherConcept = dataset.concepts.find((c) => c.id === otherId);
    if (!otherConcept) continue;

    const score = STRENGTH_SCORE[rel.strength] ?? 1;
    const existing = primaryCandidateMap.get(otherId);

    if (existing) {
      if (score > existing.maxStrengthScore) {
        existing.maxStrengthScore = score;
      }
      existing.relationshipIds.push(rel.id);
    } else {
      primaryCandidateMap.set(otherId, {
        concept: otherConcept,
        maxStrengthScore: score,
        relationshipIds: [rel.id],
      });
    }
  }

  // Sort primary candidates deterministically
  const sortedPrimaryCandidates = Array.from(primaryCandidateMap.values()).sort((a, b) => {
    if (b.maxStrengthScore !== a.maxStrengthScore) {
      return b.maxStrengthScore - a.maxStrengthScore;
    }
    return a.concept.id.localeCompare(b.concept.id);
  });

  const cappedPrimary = sortedPrimaryCandidates.slice(0, budget.maxPrimary);

  const primaryNodes: UniverseNode[] = cappedPrimary.map((cand) => ({
    id: cand.concept.id,
    slug: cand.concept.slug,
    name: cand.concept.name,
    concept: cand.concept,
    role: "primary",
    visualMass: 0.65,
    radius: 14,
    x: 0,
    y: 0,
    opacity: 1.0,
  }));

  const visiblePrimaryIds = new Set(primaryNodes.map((n) => n.id));

  // 3. Select 2nd-degree context nodes connected through visible primary neighbors
  interface ContextCandidate {
    concept: Concept;
    parentPrimaryId: string;
    maxStrengthScore: number;
  }

  const contextCandidateMap = new Map<string, ContextCandidate>();

  for (const rel of dataset.relationships) {
    let parentPrimaryId: string | null = null;
    let otherId: string | null = null;

    if (visiblePrimaryIds.has(rel.sourceConceptId)) {
      parentPrimaryId = rel.sourceConceptId;
      otherId = rel.targetConceptId;
    } else if (visiblePrimaryIds.has(rel.targetConceptId)) {
      parentPrimaryId = rel.targetConceptId;
      otherId = rel.sourceConceptId;
    }

    if (!parentPrimaryId || !otherId) continue;
    // Context node cannot be focus nor an already visible primary node
    if (otherId === focusConcept.id || visiblePrimaryIds.has(otherId)) continue;

    const otherConcept = dataset.concepts.find((c) => c.id === otherId);
    if (!otherConcept) continue;

    const score = STRENGTH_SCORE[rel.strength] ?? 1;
    const existing = contextCandidateMap.get(otherId);

    if (existing) {
      if (score > existing.maxStrengthScore) {
        existing.maxStrengthScore = score;
        existing.parentPrimaryId = parentPrimaryId;
      }
    } else {
      contextCandidateMap.set(otherId, {
        concept: otherConcept,
        parentPrimaryId,
        maxStrengthScore: score,
      });
    }
  }

  // Sort context candidates deterministically
  const sortedContextCandidates = Array.from(contextCandidateMap.values()).sort((a, b) => {
    if (b.maxStrengthScore !== a.maxStrengthScore) {
      return b.maxStrengthScore - a.maxStrengthScore;
    }
    return a.concept.id.localeCompare(b.concept.id);
  });

  const allowedContextCount = Math.max(
    0,
    Math.min(budget.maxContext, budget.maxTotal - 1 - primaryNodes.length)
  );

  const cappedContext = sortedContextCandidates.slice(0, allowedContextCount);

  const contextNodes: UniverseNode[] = cappedContext.map((cand) => ({
    id: cand.concept.id,
    slug: cand.concept.slug,
    name: cand.concept.name,
    concept: cand.concept,
    role: "context",
    visualMass: 0.35,
    radius: 8,
    x: 0,
    y: 0,
    opacity: 0.45,
    parentPrimaryId: cand.parentPrimaryId,
  }));

  const allNodes: UniverseNode[] = [focusNode, ...primaryNodes, ...contextNodes];
  const sceneNodeIds = new Set(allNodes.map((n) => n.id));

  // 4. Collect relationships between all visible nodes in the scene
  const sceneRelationships: UniverseRelationship[] = [];

  for (const rel of dataset.relationships) {
    if (sceneNodeIds.has(rel.sourceConceptId) && sceneNodeIds.has(rel.targetConceptId)) {
      const isConnectedToFocus =
        rel.sourceConceptId === focusConcept.id || rel.targetConceptId === focusConcept.id;

      // Deterministic slight Bézier curvature based on rel.id hash
      const hash = rel.id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
      const curvature = ((hash % 7) - 3) * 0.05 + 0.12;

      sceneRelationships.push({
        id: rel.id,
        sourceId: rel.sourceConceptId,
        targetId: rel.targetConceptId,
        type: rel.type,
        explanation: rel.explanation,
        strength: rel.strength,
        relationship: rel,
        role: isConnectedToFocus ? "focus-connection" : "context-connection",
        curvature,
        opacity: isConnectedToFocus ? 0.85 : 0.25,
      });
    }
  }

  return {
    focus: focusNode,
    primaryNodes,
    contextNodes,
    allNodes,
    relationships: sceneRelationships,
    isMobile,
  };
}
