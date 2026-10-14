import { describe, it, expect } from "vitest";
import { M2_PREVIEW_DATASET } from "@/data/preview/m2-dataset";
import {
  getConceptOverview,
  hasArticleForSlug,
  AVAILABLE_ARTICLE_SLUGS,
} from "@/data/preview/concept-overviews";

function countWords(str: string): number {
  return str.trim().split(/\s+/).filter(Boolean).length;
}

describe("Concept Overviews for All 13 Concepts", () => {
  it("has exactly 13 available article slugs", () => {
    expect(AVAILABLE_ARTICLE_SLUGS.size).toBe(13);
  });

  it("provides an overview for every one of the 13 concepts in M2 preview", () => {
    for (const concept of M2_PREVIEW_DATASET.concepts) {
      const overview = getConceptOverview(concept.id);
      expect(overview, `Overview missing for ${concept.id}`).toBeDefined();
      expect(overview?.conceptId).toBe(concept.id);
      expect(overview?.slug).toBe(concept.slug);
      expect(overview?.paragraphs).toHaveLength(2);

      const totalWords =
        countWords(overview!.paragraphs[0]) + countWords(overview!.paragraphs[1]);
      expect(totalWords, `Overview for ${concept.id} has ${totalWords} words`).toBeGreaterThanOrEqual(
        80
      );
      expect(totalWords, `Overview for ${concept.id} has ${totalWords} words`).toBeLessThanOrEqual(
        130
      );

      // Verify retrieval by slug as well
      const bySlug = getConceptOverview(concept.slug);
      expect(bySlug).toBeDefined();
      expect(bySlug?.conceptId).toBe(concept.id);

      // Verify full article is marked available
      expect(hasArticleForSlug(concept.slug)).toBe(true);
    }
  });
});
