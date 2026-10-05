/**
 * Review and verification lifecycle status for concepts and relationships.
 *
 * - draft: Initial entry or unverified claim under authoring.
 * - needs-review: Authored claim with proposed sources awaiting independent verification.
 * - reviewed: Content reviewed by an editor for clarity, accuracy, and tone.
 * - verified: Manually cross-checked against referenced primary/authoritative sources.
 */
export type ReviewStatus = "draft" | "needs-review" | "reviewed" | "verified";

/**
 * Controlled taxonomy of semantic relationship types between concepts.
 */
export type RelationshipType =
  | "depends-on"
  | "enables"
  | "part-of"
  | "implemented-with"
  | "related-to"
  | "leads-to"
  | "contrasts-with";

/**
 * Qualitative relevance and strength of a relationship for exploration and graph layout.
 *
 * - primary: Core defining relationship fundamental to understanding the concept.
 * - strong: High-significance relationship frequently relevant when exploring the topic.
 * - supporting: Supplementary, contextual, or historical connection providing deeper breadth.
 */
export type RelationshipStrength = "primary" | "strong" | "supporting";

/**
 * Classification of reference sources establishing provenance.
 */
export type SourceType =
  | "official-documentation"
  | "textbook"
  | "academic"
  | "standards"
  | "educational"
  | "primary-source"
  | "reference";

/**
 * First-class bibliographic source entity providing provenance for concepts and relationships.
 */
export interface Source {
  readonly id: string;
  readonly title: string;
  readonly url: string;
  readonly publisher: string;
  readonly author?: string;
  readonly type: SourceType;
  readonly publicationDate?: string;
  readonly accessDate?: string;
  readonly notes?: string;
  readonly license?: string;
}

/**
 * First-class concept node representing an idea within the Entrelis knowledge network.
 */
export interface Concept {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly shortDescription: string;
  readonly description?: string;
  readonly domains: readonly string[];
  readonly tags: readonly string[];
  readonly sourceIds: readonly string[];
  readonly reviewStatus: ReviewStatus;
  readonly aliases?: readonly string[];
  readonly interactiveModule?: string;
}

/**
 * First-class directed relationship edge connecting two concepts with an explicit explanation.
 */
export interface Relationship {
  readonly id: string;
  readonly sourceConceptId: string;
  readonly targetConceptId: string;
  readonly type: RelationshipType;
  readonly explanation: string;
  readonly strength: RelationshipStrength;
  readonly sourceIds: readonly string[];
  readonly reviewStatus: ReviewStatus;
}

/**
 * Immutable container representing a self-contained knowledge dataset.
 */
export interface KnowledgeDataset {
  readonly concepts: readonly Concept[];
  readonly relationships: readonly Relationship[];
  readonly sources: readonly Source[];
}
