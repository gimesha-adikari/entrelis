import type { Concept, KnowledgeDataset, Relationship, Source } from "@/domain/knowledge/types";

/**
 * Read-only pre-indexed knowledge graph structure.
 * Provides O(1) lookup by ID/slug and O(1) access to local adjacency relationships,
 * ensuring local scene construction does not repeatedly scan the global dataset.
 */
export interface KnowledgeGraphIndex {
  readonly conceptById: ReadonlyMap<string, Concept>;
  readonly conceptBySlug: ReadonlyMap<string, Concept>;
  readonly relationshipsByConceptId: ReadonlyMap<string, readonly Relationship[]>;
  readonly sourceById: ReadonlyMap<string, Source>;
}

/**
 * Builds an index from a KnowledgeDataset in O(N + E) time.
 */
export function createKnowledgeGraphIndex(dataset: KnowledgeDataset): KnowledgeGraphIndex {
  const conceptById = new Map<string, Concept>();
  const conceptBySlug = new Map<string, Concept>();

  for (const concept of dataset.concepts) {
    conceptById.set(concept.id, concept);
    conceptBySlug.set(concept.slug, concept);
  }

  const relationshipsByConceptId = new Map<string, Relationship[]>();

  for (const rel of dataset.relationships) {
    let sourceList = relationshipsByConceptId.get(rel.sourceConceptId);
    if (!sourceList) {
      sourceList = [];
      relationshipsByConceptId.set(rel.sourceConceptId, sourceList);
    }
    sourceList.push(rel);

    let targetList = relationshipsByConceptId.get(rel.targetConceptId);
    if (!targetList) {
      targetList = [];
      relationshipsByConceptId.set(rel.targetConceptId, targetList);
    }
    targetList.push(rel);
  }

  const sourceById = new Map<string, Source>();
  for (const source of dataset.sources) {
    sourceById.set(source.id, source);
  }

  return {
    conceptById,
    conceptBySlug,
    relationshipsByConceptId,
    sourceById,
  };
}

const indexCache = new WeakMap<KnowledgeDataset, KnowledgeGraphIndex>();

/**
 * Returns a cached KnowledgeGraphIndex for the provided dataset instance,
 * or creates and caches it if not already present.
 */
export function getOrCreateKnowledgeGraphIndex(dataset: KnowledgeDataset): KnowledgeGraphIndex {
  const existing = indexCache.get(dataset);
  if (existing) {
    return existing;
  }
  const created = createKnowledgeGraphIndex(dataset);
  indexCache.set(dataset, created);
  return created;
}
