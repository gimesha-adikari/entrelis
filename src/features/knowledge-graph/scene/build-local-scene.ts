import type { Concept, KnowledgeDataset, Relationship } from "@/domain/knowledge/types";
import {
  type UniverseNode,
  type UniverseRelationship,
  type UniverseScene,
  type SceneBudgetPolicy,
  DESKTOP_SCENE_BUDGET,
  MOBILE_SCENE_BUDGET,
} from "./types";
import { getOrCreateKnowledgeGraphIndex, type KnowledgeGraphIndex } from "../knowledge-index";

export interface BuildSceneOptions {
  readonly dataset?: KnowledgeDataset;
  readonly index?: KnowledgeGraphIndex;
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
 * Scalability & Invariants:
 * 1. Operates on pre-indexed local adjacency via KnowledgeGraphIndex rather than
 *    scanning the global relationship list on every navigation.
 * 2. Focus concept is visual anchor (visualMass: 1.0, celestial radius 30-38px on desktop).
 * 3. Primary direct neighbors ranked by relationship strength then stable ID order.
 * 4. Context concepts (2nd-degree) selected exclusively through visible primary neighbors.
 * 5. Strict budget bounds enforced (Desktop <= 10, Mobile <= 6).
 * 6. Strict SOURCE --TYPE--> TARGET directional invariant maintained on all relationships.
 */
export function buildLocalUniverseScene(options: BuildSceneOptions): UniverseScene {
  const { focusSlug = "rust", isMobile = false } = options;
  const budget = options.budget ?? (isMobile ? MOBILE_SCENE_BUDGET : DESKTOP_SCENE_BUDGET);

  const index =
    options.index ??
    (options.dataset ? getOrCreateKnowledgeGraphIndex(options.dataset) : undefined);

  if (!index) {
    throw new Error("Cannot build universe scene: neither index nor dataset provided");
  }

  // 1. Resolve focus concept using O(1) index lookup
  const focusConcept =
    (focusSlug ? index.conceptBySlug.get(focusSlug) : undefined) ??
    index.conceptBySlug.get("rust") ??
    index.conceptById.values().next().value;

  if (!focusConcept) {
    throw new Error("Cannot build universe scene: dataset has no concepts");
  }

  const focusRadius = isMobile ? 24 : 34;
  const focusNode: UniverseNode = {
    id: focusConcept.id,
    slug: focusConcept.slug,
    name: focusConcept.name,
    concept: focusConcept,
    role: "focus",
    visualMass: 1.0,
    radius: focusRadius,
    x: 0,
    y: 0,
    opacity: 1.0,
  };

  // 2. Rank direct primary neighbors using local adjacency lookup
  interface PrimaryCandidate {
    concept: Concept;
    maxStrengthScore: number;
    relationshipIds: string[];
  }

  const primaryCandidateMap = new Map<string, PrimaryCandidate>();
  const focusRelationships = index.relationshipsByConceptId.get(focusConcept.id) ?? [];

  for (const rel of focusRelationships) {
    const otherId =
      rel.sourceConceptId === focusConcept.id ? rel.targetConceptId : rel.sourceConceptId;
    const otherConcept = index.conceptById.get(otherId);
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

  // Sort primary candidates deterministically: strength descending, then ID ascending
  const sortedPrimaryCandidates = Array.from(primaryCandidateMap.values()).sort((a, b) => {
    if (b.maxStrengthScore !== a.maxStrengthScore) {
      return b.maxStrengthScore - a.maxStrengthScore;
    }
    return a.concept.id.localeCompare(b.concept.id);
  });

  const cappedPrimary = sortedPrimaryCandidates.slice(0, budget.maxPrimary);
  const primaryRadius = isMobile ? 14 : 18;

  const primaryNodes: UniverseNode[] = cappedPrimary.map((cand) => ({
    id: cand.concept.id,
    slug: cand.concept.slug,
    name: cand.concept.name,
    concept: cand.concept,
    role: "primary",
    visualMass: 0.65,
    radius: primaryRadius,
    x: 0,
    y: 0,
    opacity: 1.0,
  }));

  const primaryIds = new Set(primaryNodes.map((n) => n.id));

  // 3. Select 2nd-degree context concepts exclusively through visible primary neighbors
  interface ContextCandidate {
    concept: Concept;
    parentPrimaryId: string;
    maxStrengthScore: number;
    relationshipId: string;
  }

  const contextCandidateMap = new Map<string, ContextCandidate>();

  for (const primaryNode of primaryNodes) {
    const primaryRels = index.relationshipsByConceptId.get(primaryNode.id) ?? [];
    for (const rel of primaryRels) {
      const otherId =
        rel.sourceConceptId === primaryNode.id ? rel.targetConceptId : rel.sourceConceptId;

      // Exclude focus concept and any already visible primary neighbor
      if (otherId === focusConcept.id || primaryIds.has(otherId)) {
        continue;
      }

      const otherConcept = index.conceptById.get(otherId);
      if (!otherConcept) continue;

      const score = STRENGTH_SCORE[rel.strength] ?? 1;
      const existing = contextCandidateMap.get(otherId);

      if (existing) {
        if (score > existing.maxStrengthScore) {
          existing.maxStrengthScore = score;
          existing.parentPrimaryId = primaryNode.id;
          existing.relationshipId = rel.id;
        }
      } else {
        contextCandidateMap.set(otherId, {
          concept: otherConcept,
          parentPrimaryId: primaryNode.id,
          maxStrengthScore: score,
          relationshipId: rel.id,
        });
      }
    }
  }

  // Sort context candidates deterministically
  const sortedContextCandidates = Array.from(contextCandidateMap.values()).sort((a, b) => {
    if (b.maxStrengthScore !== a.maxStrengthScore) {
      return b.maxStrengthScore - a.maxStrengthScore;
    }
    return a.concept.id.localeCompare(b.concept.id);
  });

  const cappedContext = sortedContextCandidates.slice(0, budget.maxContext);
  const contextRadius = isMobile ? 6 : 9;

  const contextNodes: UniverseNode[] = cappedContext.map((cand) => ({
    id: cand.concept.id,
    slug: cand.concept.slug,
    name: cand.concept.name,
    concept: cand.concept,
    role: "context",
    visualMass: 0.35,
    radius: contextRadius,
    x: 0,
    y: 0,
    opacity: 0.55,
    parentPrimaryId: cand.parentPrimaryId,
  }));

  const allNodes: UniverseNode[] = [focusNode, ...primaryNodes, ...contextNodes];

  // 4. Construct visible relationships from local adjacency
  const focusRelMap = new Map<string, UniverseRelationship>();
  const contextRelMap = new Map<string, UniverseRelationship>();

  // A. Focus-to-primary relationships
  for (const rel of focusRelationships) {
    const otherId =
      rel.sourceConceptId === focusConcept.id ? rel.targetConceptId : rel.sourceConceptId;
    if (!primaryIds.has(otherId)) continue;

    focusRelMap.set(rel.id, {
      id: rel.id,
      sourceId: rel.sourceConceptId,
      targetId: rel.targetConceptId,
      type: rel.type,
      explanation: rel.explanation,
      strength: rel.strength,
      relationship: rel,
      role: "focus-connection",
      curvature: computeStableCurvature(rel.id),
      opacity: 0.85,
    });
  }

  // B. Context-to-primary relationships
  for (const cCand of cappedContext) {
    const parentPrimaryRels = index.relationshipsByConceptId.get(cCand.parentPrimaryId) ?? [];
    const contextRel = parentPrimaryRels.find(
      (r) =>
        (r.sourceConceptId === cCand.parentPrimaryId && r.targetConceptId === cCand.concept.id) ||
        (r.targetConceptId === cCand.parentPrimaryId && r.sourceConceptId === cCand.concept.id)
    );

    if (contextRel && !focusRelMap.has(contextRel.id) && !contextRelMap.has(contextRel.id)) {
      contextRelMap.set(contextRel.id, {
        id: contextRel.id,
        sourceId: contextRel.sourceConceptId,
        targetId: contextRel.targetConceptId,
        type: contextRel.type,
        explanation: contextRel.explanation,
        strength: contextRel.strength,
        relationship: contextRel,
        role: "context-connection",
        curvature: computeStableCurvature(contextRel.id),
        opacity: 0.35,
      });
    }
  }

  // C. Inter-primary relationships (if any connect two visible primary nodes)
  for (const primaryNode of primaryNodes) {
    const pRels = index.relationshipsByConceptId.get(primaryNode.id) ?? [];
    for (const rel of pRels) {
      if (
        primaryIds.has(rel.sourceConceptId) &&
        primaryIds.has(rel.targetConceptId) &&
        !focusRelMap.has(rel.id) &&
        !contextRelMap.has(rel.id)
      ) {
        contextRelMap.set(rel.id, {
          id: rel.id,
          sourceId: rel.sourceConceptId,
          targetId: rel.targetConceptId,
          type: rel.type,
          explanation: rel.explanation,
          strength: rel.strength,
          relationship: rel,
          role: "context-connection",
          curvature: computeStableCurvature(rel.id),
          opacity: 0.45,
        });
      }
    }
  }

  const relationships = [...focusRelMap.values(), ...contextRelMap.values()];

  return {
    focus: focusNode,
    primaryNodes,
    contextNodes,
    allNodes,
    relationships,
    isMobile,
  };
}

/**
 * Computes a deterministic, pleasing curvature displacement based on relationship ID.
 */
function computeStableCurvature(relId: string): number {
  let hash = 0;
  for (let i = 0; i < relId.length; i++) {
    hash = (hash * 31 + relId.charCodeAt(i)) >>> 0;
  }
  const curvatures = [0.12, -0.12, 0.16, -0.16, 0.1, -0.1];
  return curvatures[hash % curvatures.length] ?? 0.12;
}
