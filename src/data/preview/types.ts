import type { ReviewStatus } from "@/domain/knowledge/types";

export type ConceptTier = "seed" | "pilot";

export interface RelatedConceptSummary {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly shortDescription: string;
  readonly tier: ConceptTier;
  readonly reviewStatus: ReviewStatus;
}

export interface ArticleConnection {
  readonly id: string;
  readonly direction: "incoming" | "outgoing";
  readonly type: string;
  readonly explanation: string;
  readonly strength: string;
  readonly relatedConcept: RelatedConceptSummary;
}

export interface CitationRecord {
  readonly index: number;
  readonly sourceId?: string;
  readonly title: string;
  readonly url: string;
  readonly canonicalUrl?: string;
  readonly publisher?: string;
  readonly author?: string;
  readonly evidenceTier?: string;
  readonly supportedClaims?: string;
}

export interface HeadingItem {
  readonly id: string;
  readonly level: number;
  readonly text: string;
}

export interface PilotArticleMetadata {
  readonly slug: string;
  readonly conceptId: string;
  readonly title: string;
  readonly shortDescription: string;
  readonly domains: readonly string[];
  readonly tags: readonly string[];
  readonly wordCount: number;
  readonly readingTimeMinutes: number;
  readonly reviewStatus: ReviewStatus;
  readonly tier?: ConceptTier;
}

export interface PilotArticle extends PilotArticleMetadata {
  readonly markdownContent: string;
  readonly headings: readonly HeadingItem[];
  readonly citations: readonly CitationRecord[];
  readonly connections: readonly ArticleConnection[];
}
