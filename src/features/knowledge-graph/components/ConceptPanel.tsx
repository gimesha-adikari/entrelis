"use client";

import { useMemo, useRef, useEffect } from "react";
import type {
  Concept,
  KnowledgeDataset,
  Relationship,
  RelationshipStrength,
  ReviewStatus,
  Source,
} from "@/domain/knowledge/types";
import { getOrCreateKnowledgeGraphIndex, type KnowledgeGraphIndex } from "../knowledge-index";
import styles from "./KnowledgeGraph.module.css";

interface Props {
  concept: Concept | null;
  dataset: KnowledgeDataset;
  index?: KnowledgeGraphIndex;
  onSelectConcept: (slug: string) => void;
}

const STRENGTH_WEIGHT: Record<RelationshipStrength, number> = {
  primary: 1,
  strong: 2,
  supporting: 3,
};

const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  draft: "Draft",
  "needs-review": "Needs review",
  reviewed: "Reviewed",
  verified: "Verified",
};

export default function ConceptPanel({ concept, dataset, index, onSelectConcept }: Props) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const graphIndex = useMemo(
    () => index ?? getOrCreateKnowledgeGraphIndex(dataset),
    [index, dataset]
  );

  // Reset scroll position to top whenever active concept changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [concept?.id]);

  // Find all direct relationships connected to this concept using O(1) indexed adjacency lookup
  const connectedRelationships = useMemo<readonly Relationship[]>(() => {
    if (!concept) return [];
    return graphIndex.relationshipsByConceptId.get(concept.id) ?? [];
  }, [concept, graphIndex]);

  // Deterministic ordering: primary first, then strong, then supporting; alphabetically by connected concept name
  const orderedRelationships = useMemo(() => {
    if (!concept) return [];
    return [...connectedRelationships].sort((a, b) => {
      const weightDiff = (STRENGTH_WEIGHT[a.strength] ?? 99) - (STRENGTH_WEIGHT[b.strength] ?? 99);
      if (weightDiff !== 0) return weightDiff;
      const otherIdA = a.sourceConceptId === concept.id ? a.targetConceptId : a.sourceConceptId;
      const otherIdB = b.sourceConceptId === concept.id ? b.targetConceptId : b.sourceConceptId;
      const nameA = graphIndex.conceptById.get(otherIdA)?.name ?? "";
      const nameB = graphIndex.conceptById.get(otherIdB)?.name ?? "";
      return nameA.localeCompare(nameB);
    });
  }, [connectedRelationships, concept, graphIndex]);

  // Find all bibliographic sources referenced by this concept using O(1) indexed source lookup
  const conceptSources = useMemo<Source[]>(() => {
    if (!concept) return [];
    return concept.sourceIds
      .map((id) => graphIndex.sourceById.get(id))
      .filter((s): s is Source => Boolean(s));
  }, [concept, graphIndex]);

  if (!concept) {
    return (
      <aside className={styles.detailPanel} aria-label="Selected Concept Details">
        <div ref={scrollContainerRef} className={styles.panelScroll}>
          <p className={styles.conceptSummary}>No concept selected.</p>
          <p className={styles.emptyPrompt}>
            Select a celestial body in the universe to explore its knowledge connections.
          </p>
        </div>
      </aside>
    );
  }

  const primaryDomain = concept.domains[0];
  const reviewStatusLabel = REVIEW_STATUS_LABELS[concept.reviewStatus] ?? "Reviewed";

  return (
    <aside className={styles.detailPanel} aria-label="Selected Concept Details">
      {/* Live announcement region for assistive technologies */}
      <div className={styles.srOnly} aria-live="polite" aria-atomic="true">
        {`Selected concept: ${concept.name}. ${connectedRelationships.length} connected relationships.`}
      </div>

      <div ref={scrollContainerRef} className={styles.panelScroll}>
        {/* Region A: Concept Identity */}
        <header className={styles.panelHeader}>
          <div className={styles.metaRow}>
            {primaryDomain && (
              <span className={styles.categoryBadge}>{primaryDomain.replace(/-/g, " ")}</span>
            )}
            <span
              className={styles.reviewBadge}
              title={`Verification status: ${reviewStatusLabel}`}
              aria-label={`Verification status: ${reviewStatusLabel}`}
            >
              <span className={styles.reviewDot} aria-hidden="true" />
              {reviewStatusLabel}
            </span>
          </div>

          <h2 className={styles.conceptTitle}>{concept.name}</h2>
          <p className={styles.conceptSummary}>{concept.shortDescription}</p>
        </header>

        {concept.description && <p className={styles.conceptDescription}>{concept.description}</p>}

        {/* Region B: Knowledge Connections */}
        <nav className={styles.connectionsNav} aria-label="Concept Connections">
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionHeading}>
              Connections{" "}
              <span className={styles.countBadge}>({connectedRelationships.length})</span>
            </h3>
            <span className={styles.sectionCaption}>Meaningful knowledge bridges</span>
          </div>

          <ul className={styles.connectionsList}>
            {orderedRelationships.map((rel) => {
              const isSource = rel.sourceConceptId === concept.id;
              const otherConceptId = isSource ? rel.targetConceptId : rel.sourceConceptId;
              const otherConcept = graphIndex.conceptById.get(otherConceptId);

              if (!otherConcept) return null;

              return (
                <li key={rel.id} className={styles.connectionItem}>
                  <div className={styles.connectionRow}>
                    <button
                      type="button"
                      className={styles.connectionLink}
                      onClick={() => onSelectConcept(otherConcept.slug)}
                      aria-label={`Explore connected concept: ${otherConcept.name}`}
                    >
                      <span>{otherConcept.name}</span>
                      <span className={styles.exploreArrow} aria-hidden="true">
                        ↗
                      </span>
                    </button>
                    <span className={styles.typePill}>{rel.type}</span>
                  </div>

                  {/* Strictly maintain SOURCE → TARGET directional invariant */}
                  <div className={styles.connectionPath}>
                    <span className={isSource ? styles.pathNodeCurrent : styles.pathNode}>
                      {isSource ? concept.name : otherConcept.name}
                    </span>
                    <span className={styles.arrowIcon} aria-hidden="true">
                      →
                    </span>
                    <span className={!isSource ? styles.pathNodeCurrent : styles.pathNode}>
                      {isSource ? otherConcept.name : concept.name}
                    </span>
                    <span className={styles.directionTag}>
                      {isSource ? "outgoing" : "incoming"}
                    </span>
                  </div>

                  <p className={styles.connectionExplanation}>{rel.explanation}</p>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Region C: Sources and Provenance */}
        {conceptSources.length > 0 && (
          <section className={styles.sourcesSection} aria-label="Sources and Provenance">
            <details className={styles.sourcesDisclosure}>
              <summary className={styles.sourcesSummary}>
                <span className={styles.summaryTitle}>
                  <span className={styles.disclosureChevron} aria-hidden="true">
                    ▾
                  </span>
                  Sources · {conceptSources.length}
                </span>
              </summary>
              <ul className={styles.sourcesList}>
                {conceptSources.map((source) => (
                  <li key={source.id} className={styles.sourceCard}>
                    <div className={styles.sourceHeader}>
                      <h4 className={styles.sourceTitle}>{source.title}</h4>
                      <span className={styles.sourceTypeTag}>{source.type.replace(/-/g, " ")}</span>
                    </div>
                    <p className={styles.sourcePublisher}>
                      {source.publisher}
                      {source.author ? ` · ${source.author}` : ""}
                      {source.publicationDate ? ` (${source.publicationDate})` : ""}
                    </p>
                    {source.license && (
                      <p className={styles.sourceLicenseRow}>
                        <span className={styles.licenseLabel}>License:</span> {source.license}
                      </p>
                    )}
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className={styles.sourceLink}
                      aria-label={`Open source in new window: ${source.title}`}
                    >
                      <span>View Source</span>
                      <span className={styles.externalIcon} aria-hidden="true">
                        ↗
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          </section>
        )}
      </div>
    </aside>
  );
}
