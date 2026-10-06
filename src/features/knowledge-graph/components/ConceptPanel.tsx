"use client";

import { useMemo } from "react";
import type { Concept, KnowledgeDataset, Relationship, Source } from "@/domain/knowledge/types";
import styles from "./KnowledgeGraph.module.css";

interface Props {
  concept: Concept | null;
  dataset: KnowledgeDataset;
  onSelectConcept: (slug: string) => void;
}

export default function ConceptPanel({ concept, dataset, onSelectConcept }: Props) {
  // Find all direct relationships connected to this concept (ensures 100% accessibility even if culled visually)
  const connectedRelationships = useMemo<Relationship[]>(() => {
    if (!concept) return [];
    return dataset.relationships.filter(
      (r) => r.sourceConceptId === concept.id || r.targetConceptId === concept.id
    );
  }, [concept, dataset.relationships]);

  // Find all bibliographic sources referenced by this concept
  const conceptSources = useMemo<Source[]>(() => {
    if (!concept) return [];
    return dataset.sources.filter((s) => concept.sourceIds.includes(s.id));
  }, [concept, dataset.sources]);

  if (!concept) {
    return (
      <aside className={styles.detailPanel} aria-label="Selected Concept Details">
        <p className={styles.conceptSummary}>No concept selected.</p>
      </aside>
    );
  }

  const primaryDomain = concept.domains[0];

  return (
    <aside className={styles.detailPanel} aria-label="Selected Concept Details">
      {/* Live announcement region for assistive technologies */}
      <div className={styles.srOnly} aria-live="polite" aria-atomic="true">
        {`Selected concept: ${concept.name}. ${connectedRelationships.length} connected relationships.`}
      </div>

      <div className={styles.panelScroll}>
        <div className={styles.panelHeader}>
          {primaryDomain && (
            <span className={styles.categoryBadge}>{primaryDomain.replace(/-/g, " ")}</span>
          )}
          <h2 className={styles.conceptTitle}>{concept.name}</h2>
          <p className={styles.conceptSummary}>{concept.shortDescription}</p>
        </div>

        {concept.description && <p className={styles.conceptDescription}>{concept.description}</p>}

        {/* Semantic connection navigation */}
        <nav className={styles.connectionsNav} aria-label="Concept Connections">
          <h3 className={styles.sectionHeading}>
            Connections <span className={styles.countBadge}>({connectedRelationships.length})</span>
          </h3>

          <ul className={styles.connectionsList}>
            {connectedRelationships.map((rel) => {
              const isSource = rel.sourceConceptId === concept.id;
              const otherConceptId = isSource ? rel.targetConceptId : rel.sourceConceptId;
              const otherConcept = dataset.concepts.find((c) => c.id === otherConceptId);

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
                      {otherConcept.name}
                    </button>
                    <span className={styles.typePill}>{rel.type}</span>
                  </div>

                  {/* Strictly maintain SOURCE → TARGET directional invariant */}
                  <div className={styles.connectionPath}>
                    <span className={styles.pathNode}>
                      {isSource ? concept.name : otherConcept.name}
                    </span>
                    <span className={styles.arrowIcon} aria-hidden="true">
                      →
                    </span>
                    <span className={styles.pathNode}>
                      {isSource ? otherConcept.name : concept.name}
                    </span>
                  </div>

                  <p className={styles.connectionExplanation}>{rel.explanation}</p>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Provenance and bibliographic sources disclosure */}
        {conceptSources.length > 0 && (
          <details className={styles.sourcesDisclosure}>
            <summary className={styles.sourcesSummary}>Sources · {conceptSources.length}</summary>
            <ul className={styles.sourcesList}>
              {conceptSources.map((source) => (
                <li key={source.id} className={styles.sourceCard}>
                  <h4 className={styles.sourceTitle}>{source.title}</h4>
                  <p className={styles.sourcePublisher}>
                    {source.publisher}
                    {source.author ? ` · ${source.author}` : ""}
                    {source.publicationDate ? ` (${source.publicationDate})` : ""}
                  </p>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={styles.sourceLink}
                    aria-label={`Open source in new window: ${source.title}`}
                  >
                    View Source ↗
                  </a>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </aside>
  );
}
