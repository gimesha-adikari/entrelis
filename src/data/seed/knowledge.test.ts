import { describe, expect, it } from "vitest";
import {
  assertValidDataset,
  KnowledgeValidationError,
  validateDataset,
} from "@/domain/knowledge/validation";
import type { Concept, KnowledgeDataset, Relationship, Source } from "@/domain/knowledge/types";
import { SEED_DATASET } from "./index";

describe("Entrelis Seed Knowledge Dataset", () => {
  it("passes full schema and relational validation without errors", () => {
    const result = validateDataset(SEED_DATASET);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(() => assertValidDataset(SEED_DATASET)).not.toThrow();
  });

  it("contains all required concepts with unique IDs and slugs", () => {
    const ids = new Set<string>();
    const slugs = new Set<string>();

    for (const concept of SEED_DATASET.concepts) {
      expect(concept.id).toBeTruthy();
      expect(concept.slug).toBeTruthy();
      expect(concept.name).toBeTruthy();
      expect(concept.shortDescription).toBeTruthy();

      expect(ids.has(concept.id)).toBe(false);
      expect(slugs.has(concept.slug)).toBe(false);

      ids.add(concept.id);
      slugs.add(concept.slug);
    }

    expect(ids.size).toBe(SEED_DATASET.concepts.length);
    expect(slugs.size).toBe(SEED_DATASET.concepts.length);
  });

  it("contains unique and well-formed sources", () => {
    const sourceIds = new Set<string>();

    for (const source of SEED_DATASET.sources) {
      expect(source.id).toBeTruthy();
      expect(source.title).toBeTruthy();
      expect(source.url).toMatch(/^https?:\/\//);
      expect(source.publisher).toBeTruthy();

      expect(sourceIds.has(source.id)).toBe(false);
      sourceIds.add(source.id);
    }

    expect(sourceIds.size).toBe(SEED_DATASET.sources.length);
  });

  it("verifies that all concept and relationship source references resolve", () => {
    const sourceIds = new Set(SEED_DATASET.sources.map((s) => s.id));

    // Verify concept provenance
    for (const concept of SEED_DATASET.concepts) {
      expect(concept.sourceIds.length).toBeGreaterThan(0);
      for (const sId of concept.sourceIds) {
        expect(sourceIds.has(sId)).toBe(true);
      }
    }

    // Verify relationship provenance
    for (const rel of SEED_DATASET.relationships) {
      expect(rel.sourceIds.length).toBeGreaterThan(0);
      for (const sId of rel.sourceIds) {
        expect(sourceIds.has(sId)).toBe(true);
      }
    }
  });

  it("verifies that all relationship endpoints resolve and contain explanations", () => {
    const conceptIds = new Set(SEED_DATASET.concepts.map((c) => c.id));

    for (const rel of SEED_DATASET.relationships) {
      expect(rel.id).toBeTruthy();
      expect(conceptIds.has(rel.sourceConceptId)).toBe(true);
      expect(conceptIds.has(rel.targetConceptId)).toBe(true);
      expect(rel.sourceConceptId).not.toBe(rel.targetConceptId);
      expect(rel.explanation.trim().length).toBeGreaterThan(15);
    }
  });

  it("contains the complete required vertical slice path with corrected directional types", () => {
    const expectedChain = [
      {
        sourceId: "concept-rust",
        type: "uses",
        targetId: "concept-ownership",
      },
      {
        sourceId: "concept-ownership",
        type: "manages",
        targetId: "concept-memory",
      },
      {
        sourceId: "concept-memory",
        type: "includes",
        targetId: "concept-stack-and-heap",
      },
      {
        sourceId: "concept-stack-and-heap",
        type: "depends-on",
        targetId: "concept-operating-systems",
      },
      {
        sourceId: "concept-operating-systems",
        type: "depends-on",
        targetId: "concept-cpus",
      },
      {
        sourceId: "concept-cpus",
        type: "implemented-with",
        targetId: "concept-transistors",
      },
    ] as const;

    // Verify all concepts in chain exist
    const conceptMap = new Map(SEED_DATASET.concepts.map((c) => [c.id, c]));
    for (const step of expectedChain) {
      expect(conceptMap.has(step.sourceId)).toBe(true);
      expect(conceptMap.has(step.targetId)).toBe(true);
    }

    // Verify each step in the path has an explicit directed relationship matching expected semantics
    for (const step of expectedChain) {
      const edge = SEED_DATASET.relationships.find(
        (r) =>
          r.sourceConceptId === step.sourceId &&
          r.targetConceptId === step.targetId &&
          r.type === step.type
      );

      expect(edge).toBeDefined();
      expect(edge?.explanation).toBeTruthy();
      expect(edge?.sourceIds.length).toBeGreaterThan(0);
      expect(edge?.reviewStatus).toBe("reviewed");
    }
  });

  it("marks initial seed records as reviewed pending independent verification", () => {
    for (const concept of SEED_DATASET.concepts) {
      expect(concept.reviewStatus).toBe("reviewed");
    }
    for (const rel of SEED_DATASET.relationships) {
      expect(rel.reviewStatus).toBe("reviewed");
    }
  });
});

describe("Knowledge Validation Guardrails", () => {
  const validBaseSource: Source = {
    id: "src-base",
    title: "Base Source",
    url: "https://example.com/source",
    publisher: "Example Publisher",
    type: "official-documentation",
  };

  const validBaseConcept1: Concept = {
    id: "concept-1",
    slug: "concept-1",
    name: "Concept One",
    shortDescription: "A test concept description.",
    domains: ["computer-science"],
    tags: ["test"],
    sourceIds: ["src-base"],
    reviewStatus: "verified",
  };

  const validBaseConcept2: Concept = {
    id: "concept-2",
    slug: "concept-2",
    name: "Concept Two",
    shortDescription: "Another test concept description.",
    domains: ["computer-science"],
    tags: ["test"],
    sourceIds: ["src-base"],
    reviewStatus: "verified",
  };

  const validBaseRelationship: Relationship = {
    id: "rel-1-2",
    sourceConceptId: "concept-1",
    targetConceptId: "concept-2",
    type: "uses",
    explanation: "Concept One uses Concept Two in test context.",
    strength: "primary",
    sourceIds: ["src-base"],
    reviewStatus: "reviewed",
  };

  const createDataset = (overrides?: Partial<KnowledgeDataset>): KnowledgeDataset => ({
    sources: [validBaseSource],
    concepts: [validBaseConcept1, validBaseConcept2],
    relationships: [validBaseRelationship],
    ...overrides,
  });

  it("rejects duplicate concept IDs", () => {
    const dataset = createDataset({
      concepts: [validBaseConcept1, { ...validBaseConcept2, id: "concept-1" }],
    });
    const result = validateDataset(dataset);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "DUPLICATE_CONCEPT_ID")).toBe(true);
  });

  it("rejects duplicate concept slugs", () => {
    const dataset = createDataset({
      concepts: [validBaseConcept1, { ...validBaseConcept2, slug: "concept-1" }],
    });
    const result = validateDataset(dataset);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "DUPLICATE_CONCEPT_SLUG")).toBe(true);
  });

  it("rejects duplicate relationship IDs", () => {
    const dataset = createDataset({
      relationships: [
        validBaseRelationship,
        { ...validBaseRelationship, sourceConceptId: "concept-2", targetConceptId: "concept-1" },
      ],
    });
    const result = validateDataset(dataset);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "DUPLICATE_RELATIONSHIP_ID")).toBe(true);
  });

  it("rejects duplicate source IDs", () => {
    const dataset = createDataset({
      sources: [validBaseSource, { ...validBaseSource, title: "Another Source" }],
    });
    const result = validateDataset(dataset);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "DUPLICATE_SOURCE_ID")).toBe(true);
  });

  it("rejects concepts with missing sources", () => {
    const dataset = createDataset({
      concepts: [{ ...validBaseConcept1, sourceIds: ["non-existent-source"] }],
    });
    const result = validateDataset(dataset);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "UNKNOWN_CONCEPT_SOURCE")).toBe(true);
  });

  it("rejects concepts with empty sources array", () => {
    const dataset = createDataset({
      concepts: [{ ...validBaseConcept1, sourceIds: [] }],
    });
    const result = validateDataset(dataset);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "EMPTY_CONCEPT_SOURCES")).toBe(true);
  });

  it("rejects relationships referencing non-existent concepts", () => {
    const dataset = createDataset({
      relationships: [{ ...validBaseRelationship, targetConceptId: "missing-concept" }],
    });
    const result = validateDataset(dataset);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "UNKNOWN_RELATIONSHIP_TARGET_CONCEPT")).toBe(true);
  });

  it("rejects relationships with self-loops", () => {
    const dataset = createDataset({
      relationships: [
        { ...validBaseRelationship, sourceConceptId: "concept-1", targetConceptId: "concept-1" },
      ],
    });
    const result = validateDataset(dataset);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "RELATIONSHIP_SELF_LOOP")).toBe(true);
  });

  it("rejects relationships without explanations", () => {
    const dataset = createDataset({
      relationships: [{ ...validBaseRelationship, explanation: "   " }],
    });
    const result = validateDataset(dataset);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "EMPTY_REQUIRED_FIELD")).toBe(true);
  });

  it("throws KnowledgeValidationError when asserting on invalid dataset", () => {
    const dataset = createDataset({
      relationships: [{ ...validBaseRelationship, sourceIds: [] }],
    });
    expect(() => assertValidDataset(dataset)).toThrow(KnowledgeValidationError);
  });
});
