import type {
  KnowledgeDataset,
  RelationshipStrength,
  RelationshipType,
  ReviewStatus,
  SourceType,
} from "./types";

export type ValidationErrorCode =
  | "DUPLICATE_CONCEPT_ID"
  | "DUPLICATE_CONCEPT_SLUG"
  | "DUPLICATE_RELATIONSHIP_ID"
  | "DUPLICATE_SOURCE_ID"
  | "UNKNOWN_CONCEPT_SOURCE"
  | "UNKNOWN_RELATIONSHIP_SOURCE"
  | "EMPTY_CONCEPT_SOURCES"
  | "EMPTY_RELATIONSHIP_SOURCES"
  | "UNKNOWN_RELATIONSHIP_SOURCE_CONCEPT"
  | "UNKNOWN_RELATIONSHIP_TARGET_CONCEPT"
  | "RELATIONSHIP_SELF_LOOP"
  | "INVALID_RELATIONSHIP_STRENGTH"
  | "INVALID_RELATIONSHIP_TYPE"
  | "INVALID_REVIEW_STATUS"
  | "INVALID_SOURCE_TYPE"
  | "EMPTY_REQUIRED_FIELD";

export interface ValidationError {
  readonly code: ValidationErrorCode;
  readonly message: string;
  readonly entityId?: string;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ValidationError[];
}

export class KnowledgeValidationError extends Error {
  readonly errors: readonly ValidationError[];

  constructor(errors: readonly ValidationError[]) {
    const errorDetails = errors
      .map((e) => `[${e.code}]${e.entityId ? ` (${e.entityId})` : ""}: ${e.message}`)
      .join("\n");
    super(`Knowledge dataset validation failed with ${errors.length} error(s):\n${errorDetails}`);
    this.name = "KnowledgeValidationError";
    this.errors = errors;
  }
}

const VALID_REVIEW_STATUSES: ReadonlySet<ReviewStatus> = new Set([
  "draft",
  "needs-review",
  "reviewed",
  "verified",
]);

const VALID_RELATIONSHIP_TYPES: ReadonlySet<RelationshipType> = new Set([
  "depends-on",
  "enables",
  "part-of",
  "implemented-with",
  "related-to",
  "leads-to",
  "contrasts-with",
]);

const VALID_RELATIONSHIP_STRENGTHS: ReadonlySet<RelationshipStrength> = new Set([
  "primary",
  "strong",
  "supporting",
]);

const VALID_SOURCE_TYPES: ReadonlySet<SourceType> = new Set([
  "official-documentation",
  "textbook",
  "academic",
  "standards",
  "educational",
  "primary-source",
  "reference",
]);

function isBlank(value: unknown): boolean {
  return typeof value !== "string" || value.trim().length === 0;
}

/**
 * Validates an entire KnowledgeDataset ensuring relational integrity,
 * unique identifiers, provenance links, and field correctness.
 */
export function validateDataset(dataset: KnowledgeDataset): ValidationResult {
  const errors: ValidationError[] = [];

  const sourceIds = new Set<string>();
  const conceptIds = new Set<string>();
  const conceptSlugs = new Set<string>();
  const relationshipIds = new Set<string>();

  // 1. Validate Sources
  for (const source of dataset.sources) {
    if (isBlank(source.id)) {
      errors.push({
        code: "EMPTY_REQUIRED_FIELD",
        message: "Source ID must not be blank.",
      });
    } else if (sourceIds.has(source.id)) {
      errors.push({
        code: "DUPLICATE_SOURCE_ID",
        message: `Duplicate source ID: '${source.id}'.`,
        entityId: source.id,
      });
    } else {
      sourceIds.add(source.id);
    }

    if (isBlank(source.title)) {
      errors.push({
        code: "EMPTY_REQUIRED_FIELD",
        message: `Source '${source.id}' has a blank title.`,
        entityId: source.id,
      });
    }

    if (isBlank(source.url)) {
      errors.push({
        code: "EMPTY_REQUIRED_FIELD",
        message: `Source '${source.id}' has a blank URL.`,
        entityId: source.id,
      });
    }

    if (isBlank(source.publisher)) {
      errors.push({
        code: "EMPTY_REQUIRED_FIELD",
        message: `Source '${source.id}' has a blank publisher.`,
        entityId: source.id,
      });
    }

    if (!VALID_SOURCE_TYPES.has(source.type)) {
      errors.push({
        code: "INVALID_SOURCE_TYPE",
        message: `Source '${source.id}' has unrecognized type '${String(source.type)}'.`,
        entityId: source.id,
      });
    }
  }

  // 2. Validate Concepts
  for (const concept of dataset.concepts) {
    if (isBlank(concept.id)) {
      errors.push({
        code: "EMPTY_REQUIRED_FIELD",
        message: "Concept ID must not be blank.",
      });
    } else if (conceptIds.has(concept.id)) {
      errors.push({
        code: "DUPLICATE_CONCEPT_ID",
        message: `Duplicate concept ID: '${concept.id}'.`,
        entityId: concept.id,
      });
    } else {
      conceptIds.add(concept.id);
    }

    if (isBlank(concept.slug)) {
      errors.push({
        code: "EMPTY_REQUIRED_FIELD",
        message: `Concept '${concept.id}' has a blank slug.`,
        entityId: concept.id,
      });
    } else if (conceptSlugs.has(concept.slug)) {
      errors.push({
        code: "DUPLICATE_CONCEPT_SLUG",
        message: `Duplicate concept slug: '${concept.slug}'.`,
        entityId: concept.id,
      });
    } else {
      conceptSlugs.add(concept.slug);
    }

    if (isBlank(concept.name)) {
      errors.push({
        code: "EMPTY_REQUIRED_FIELD",
        message: `Concept '${concept.id}' has a blank name.`,
        entityId: concept.id,
      });
    }

    if (isBlank(concept.shortDescription)) {
      errors.push({
        code: "EMPTY_REQUIRED_FIELD",
        message: `Concept '${concept.id}' has a blank shortDescription.`,
        entityId: concept.id,
      });
    }

    if (!VALID_REVIEW_STATUSES.has(concept.reviewStatus)) {
      errors.push({
        code: "INVALID_REVIEW_STATUS",
        message: `Concept '${concept.id}' has invalid review status '${String(concept.reviewStatus)}'.`,
        entityId: concept.id,
      });
    }

    // Provenance requirement
    if (!concept.sourceIds || concept.sourceIds.length === 0) {
      errors.push({
        code: "EMPTY_CONCEPT_SOURCES",
        message: `Concept '${concept.id}' requires at least one source ID for provenance.`,
        entityId: concept.id,
      });
    } else {
      for (const sId of concept.sourceIds) {
        if (!sourceIds.has(sId)) {
          errors.push({
            code: "UNKNOWN_CONCEPT_SOURCE",
            message: `Concept '${concept.id}' references missing source ID '${sId}'.`,
            entityId: concept.id,
          });
        }
      }
    }
  }

  // 3. Validate Relationships
  for (const rel of dataset.relationships) {
    if (isBlank(rel.id)) {
      errors.push({
        code: "EMPTY_REQUIRED_FIELD",
        message: "Relationship ID must not be blank.",
      });
    } else if (relationshipIds.has(rel.id)) {
      errors.push({
        code: "DUPLICATE_RELATIONSHIP_ID",
        message: `Duplicate relationship ID: '${rel.id}'.`,
        entityId: rel.id,
      });
    } else {
      relationshipIds.add(rel.id);
    }

    if (isBlank(rel.explanation)) {
      errors.push({
        code: "EMPTY_REQUIRED_FIELD",
        message: `Relationship '${rel.id}' must provide a human-readable explanation.`,
        entityId: rel.id,
      });
    }

    if (!VALID_RELATIONSHIP_TYPES.has(rel.type)) {
      errors.push({
        code: "INVALID_RELATIONSHIP_TYPE",
        message: `Relationship '${rel.id}' has invalid type '${String(rel.type)}'.`,
        entityId: rel.id,
      });
    }

    if (!VALID_RELATIONSHIP_STRENGTHS.has(rel.strength)) {
      errors.push({
        code: "INVALID_RELATIONSHIP_STRENGTH",
        message: `Relationship '${rel.id}' has invalid strength '${String(rel.strength)}'.`,
        entityId: rel.id,
      });
    }

    if (!VALID_REVIEW_STATUSES.has(rel.reviewStatus)) {
      errors.push({
        code: "INVALID_REVIEW_STATUS",
        message: `Relationship '${rel.id}' has invalid review status '${String(rel.reviewStatus)}'.`,
        entityId: rel.id,
      });
    }

    // Endpoint validity
    const hasSource = conceptIds.has(rel.sourceConceptId);
    const hasTarget = conceptIds.has(rel.targetConceptId);

    if (!hasSource) {
      errors.push({
        code: "UNKNOWN_RELATIONSHIP_SOURCE_CONCEPT",
        message: `Relationship '${rel.id}' references missing source concept '${rel.sourceConceptId}'.`,
        entityId: rel.id,
      });
    }

    if (!hasTarget) {
      errors.push({
        code: "UNKNOWN_RELATIONSHIP_TARGET_CONCEPT",
        message: `Relationship '${rel.id}' references missing target concept '${rel.targetConceptId}'.`,
        entityId: rel.id,
      });
    }

    if (hasSource && hasTarget && rel.sourceConceptId === rel.targetConceptId) {
      errors.push({
        code: "RELATIONSHIP_SELF_LOOP",
        message: `Relationship '${rel.id}' has self-loop on concept '${rel.sourceConceptId}'.`,
        entityId: rel.id,
      });
    }

    // Provenance requirement
    if (!rel.sourceIds || rel.sourceIds.length === 0) {
      errors.push({
        code: "EMPTY_RELATIONSHIP_SOURCES",
        message: `Relationship '${rel.id}' requires at least one source ID for provenance.`,
        entityId: rel.id,
      });
    } else {
      for (const sId of rel.sourceIds) {
        if (!sourceIds.has(sId)) {
          errors.push({
            code: "UNKNOWN_RELATIONSHIP_SOURCE",
            message: `Relationship '${rel.id}' references missing source ID '${sId}'.`,
            entityId: rel.id,
          });
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Asserts that a dataset passes all validation rules, throwing a KnowledgeValidationError if invalid.
 */
export function assertValidDataset(dataset: KnowledgeDataset): void {
  const result = validateDataset(dataset);
  if (!result.valid) {
    throw new KnowledgeValidationError(result.errors);
  }
}
