import fs from "node:fs";
import path from "node:path";
import {
  PILOT_ARTICLES_METADATA,
  getConceptConnections,
  getPilotConceptBySlug,
} from "./pilot-data";
import type { CitationRecord, HeadingItem, PilotArticle } from "./types";

/**
 * Parses markdown headings into structured objects for table-of-contents navigation.
 */
export function parseHeadings(markdown: string): HeadingItem[] {
  const headings: HeadingItem[] = [];
  const lines = markdown.split("\n");

  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.+)$/);
    if (!match || !match[1] || !match[2]) continue;

    const level = match[1].length;
    let text = match[2].trim();

    // Strip concept ID badge from H1 if present, e.g. # Title (`concept-id`)
    text = text.replace(/\s*\(`[^`]+`\)$/, "");

    // Generate safe heading anchor ID
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");

    if (id) {
      headings.push({ id, level, text });
    }
  }

  return headings;
}

/**
 * Parses Section 7 ("Authoritative References & Evidence Ledger") to extract
 * structured citation records for superscript tooltips and evidence provenance.
 */
export function parseSection7Citations(markdown: string): CitationRecord[] {
  const parts = markdown.split(/## 7\.\s+Authoritative References[^\n]*/);
  if (parts.length < 2 || !parts[1]) return [];

  const sec7 = parts[1];
  const items = sec7.split(/\n(?=\d+\.\s+)/);
  const citations: CitationRecord[] = [];

  for (const item of items) {
    const m = item.match(/^(\d+)\.\s+(?:`([^`]+)`:\s+)?([\s\S]+)/);
    if (!m || !m[1] || !m[3]) continue;

    const index = parseInt(m[1], 10);
    const sourceId = m[2] || undefined;
    const body = m[3];
    const firstLine =
      body
        .split("\n")[0]
        ?.trim()
        .replace(/\s{2,}$/, "") ?? "";

    // Extract canonical URL
    let url = "";
    const urlMatch = body.match(
      /-\s+\*\*(?:Primary Reference )?URL:\*\*\s+\[([^\]]+)\]\(([^)]+)\)/
    );
    if (urlMatch && urlMatch[2]) {
      url = urlMatch[2];
    } else {
      const anyUrl = body.match(/\[([^\]]*)\]\((https?:\/\/[^)]+)\)/);
      if (anyUrl && anyUrl[2]) {
        url = anyUrl[2];
      }
    }

    // Extract Evidence Tier
    let evidenceTier: string | undefined;
    const tierMatch = body.match(/-\s+\*\*Evidence Tier:\*\*\s+([^\n]+)/);
    if (tierMatch && tierMatch[1]) {
      evidenceTier = tierMatch[1].trim();
    }

    // Extract Supported Claims
    let supportedClaims: string | undefined;
    const claimsMatch = body.match(/-\s+\*\*Supported Claims:\*\*\s+([^\n]+)/);
    if (claimsMatch && claimsMatch[1]) {
      supportedClaims = claimsMatch[1].trim();
    }

    citations.push({
      index,
      sourceId,
      title: firstLine,
      url,
      evidenceTier,
      supportedClaims,
    });
  }

  return citations;
}

/**
 * Loads a pilot article from the filesystem by slug.
 * Returns null if the slug does not match an approved pilot candidate.
 */
export function loadPilotArticle(slug: string): PilotArticle | null {
  const meta = PILOT_ARTICLES_METADATA.find((a) => a.slug === slug);
  if (!meta) return null;

  const concept = getPilotConceptBySlug(slug);
  if (!concept) return null;

  const filePath = path.join(process.cwd(), "src/data/preview/articles", `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const markdownContent = fs.readFileSync(filePath, "utf-8");
  const headings = parseHeadings(markdownContent);
  const citations = parseSection7Citations(markdownContent);
  const connections = getConceptConnections(concept.id);

  return {
    ...meta,
    markdownContent,
    headings,
    citations,
    connections,
  };
}

/**
 * Loads all six pilot articles.
 */
export function getAllPilotArticles(): PilotArticle[] {
  const articles: PilotArticle[] = [];
  for (const meta of PILOT_ARTICLES_METADATA) {
    const article = loadPilotArticle(meta.slug);
    if (article) {
      articles.push(article);
    }
  }
  return articles;
}
