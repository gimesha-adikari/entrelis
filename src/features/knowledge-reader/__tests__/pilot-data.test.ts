import { describe, it, expect } from "vitest";
import {
  PILOT_CONCEPTS,
  PILOT_RELATIONSHIPS,
  PILOT_ARTICLES_METADATA,
  getPilotConceptBySlug,
  getPilotConceptById,
  getConceptConnections,
  loadPilotArticle,
  getAllPilotArticles,
  parseHeadings,
  parseSection7Citations,
} from "@/data/preview";
import { SEED_CONCEPTS } from "@/data/seed";

describe("Pilot Data & Article Loader", () => {
  it("contains exactly 6 pilot candidate concepts held at needs-review", () => {
    expect(PILOT_CONCEPTS).toHaveLength(6);
    expect(PILOT_ARTICLES_METADATA).toHaveLength(6);
    for (const concept of PILOT_CONCEPTS) {
      expect(concept.reviewStatus).toBe("needs-review");
      expect(concept.id).toMatch(/^concept-[a-z0-9-]+$/);
      expect(concept.slug).toBeTruthy();
      expect(concept.name).toBeTruthy();
      expect(concept.sourceIds.length).toBeGreaterThan(0);
    }
  });

  it("ensures zero pilot concepts are imported into the production seed dataset", () => {
    const seedIds = new Set(SEED_CONCEPTS.map((c) => c.id));
    for (const pilot of PILOT_CONCEPTS) {
      expect(seedIds.has(pilot.id)).toBe(false);
    }
  });

  it("contains exactly 11 pilot relationships held at needs-review", () => {
    expect(PILOT_RELATIONSHIPS).toHaveLength(11);
    for (const rel of PILOT_RELATIONSHIPS) {
      expect(rel.reviewStatus).toBe("needs-review");
      expect(rel.explanation).toBeTruthy();
      expect(rel.sourceConceptId).not.toBe(rel.targetConceptId);
    }
  });

  it("loads all six pilot articles from isolated storage with non-empty markdown", () => {
    const articles = getAllPilotArticles();
    expect(articles).toHaveLength(6);

    const expectedSlugs = [
      "instruction-set-architecture",
      "virtual-memory",
      "file-systems",
      "concurrency",
      "asynchronous-io",
      "machine-code",
    ];

    for (const slug of expectedSlugs) {
      const art = articles.find((a) => a.slug === slug);
      expect(art).toBeDefined();
      expect(art?.markdownContent.length).toBeGreaterThan(1000);
      expect(art?.headings.length).toBeGreaterThan(5);
      expect(art?.citations.length).toBeGreaterThan(0);
      expect(art?.connections.length).toBeGreaterThan(0);
    }
  });

  it("correctly maps connections distinguishing seed from pilot concepts", () => {
    const vmConcept = getPilotConceptBySlug("virtual-memory");
    expect(vmConcept).toBeDefined();

    const connections = getConceptConnections(vmConcept!.id);
    expect(connections.length).toBeGreaterThan(0);

    // VM connects to Operating Systems (seed), Memory (seed), and CPUs (seed)
    const osConn = connections.find((c) => c.relatedConcept.slug === "operating-systems");
    expect(osConn).toBeDefined();
    expect(osConn?.relatedConcept.tier).toBe("seed");
    expect(osConn?.relatedConcept.reviewStatus).toBe("reviewed");

    // Asynchronous I/O connects to Concurrency (pilot)
    const aioConcept = getPilotConceptBySlug("asynchronous-io");
    const aioConnections = getConceptConnections(aioConcept!.id);
    const concConn = aioConnections.find((c) => c.relatedConcept.slug === "concurrency");
    expect(concConn).toBeDefined();
    expect(concConn?.relatedConcept.tier).toBe("pilot");
    expect(concConn?.relatedConcept.reviewStatus).toBe("needs-review");
  });

  it("gracefully returns null for non-existent or invalid slugs", () => {
    expect(loadPilotArticle("non-existent-concept")).toBeNull();
    expect(getPilotConceptBySlug("invalid-slug")).toBeUndefined();
    expect(getPilotConceptById("invalid-id")).toBeUndefined();
  });

  it("parses Section 7 citations and headings reliably", () => {
    const sampleMd = `
# Sample Article

## 1. Intro
Some text.

## 7. Authoritative References & Evidence Ledger

1. \`src-test\`: Author Name. *Book Title*. Publisher, 2024.
   - **URL:** [https://example.com/spec](https://example.com/spec)
   - **Evidence Tier:** Tier 1 (Open Standard)
   - **Supported Claims:** Core definitions.
`;

    const headings = parseHeadings(sampleMd);
    expect(headings).toHaveLength(3);
    expect(headings[0]?.id).toBe("sample-article");
    expect(headings[1]?.id).toBe("1-intro");

    const citations = parseSection7Citations(sampleMd);
    expect(citations).toHaveLength(1);
    expect(citations[0]?.index).toBe(1);
    expect(citations[0]?.sourceId).toBe("src-test");
    expect(citations[0]?.url).toBe("https://example.com/spec");
    expect(citations[0]?.evidenceTier).toBe("Tier 1 (Open Standard)");
    expect(citations[0]?.supportedClaims).toBe("Core definitions.");
  });
});
