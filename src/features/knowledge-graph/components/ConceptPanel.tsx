"use client";

import { useMemo, useRef, useEffect, useState, forwardRef } from "react";
import type {
  Concept,
  KnowledgeDataset,
  Relationship,
  RelationshipStrength,
  ReviewStatus,
  Source,
} from "@/domain/knowledge/types";
import { getOrCreateKnowledgeGraphIndex, type KnowledgeGraphIndex } from "../knowledge-index";
import { getConceptCelestialIdentity } from "../celestial-3d/identity";
import styles from "./KnowledgeGraph.module.css";

export type ProjectedVariant =
  | "anchored"
  | "continuous"
  | "meridian"
  | "corona"
  | "codex"
  | "hybrid";

export interface ConceptPanelProps {
  concept: Concept | null;
  dataset: KnowledgeDataset;
  index?: KnowledgeGraphIndex;
  onSelectConcept: (slug: string) => void;
  variant?: ProjectedVariant;
  isMobileExpanded?: boolean;
  onToggleMobileExpanded?: () => void;
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

const ConceptPanel = forwardRef<HTMLElement, ConceptPanelProps>(function ConceptPanel(
  {
    concept,
    dataset,
    index,
    onSelectConcept,
    variant = "anchored",
    isMobileExpanded: controlledMobileExpanded,
    onToggleMobileExpanded,
  },
  ref
) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [internalMobileExpanded, setInternalMobileExpanded] = useState(false);

  const isExpanded =
    controlledMobileExpanded !== undefined
      ? controlledMobileExpanded
      : internalMobileExpanded;

  const toggleExpanded = () => {
    if (onToggleMobileExpanded) {
      onToggleMobileExpanded();
    } else {
      setInternalMobileExpanded((prev) => !prev);
    }
  };

  // Keyboard accessibility: Escape key collapses mobile expanded lens
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isExpanded) {
        if (onToggleMobileExpanded) onToggleMobileExpanded();
        else setInternalMobileExpanded(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isExpanded, onToggleMobileExpanded]);

  const graphIndex = useMemo(
    () => index ?? getOrCreateKnowledgeGraphIndex(dataset),
    [index, dataset]
  );

  const celestialIdentity = useMemo(() => {
    if (!concept) return null;
    return getConceptCelestialIdentity(concept.slug);
  }, [concept]);

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

  const variantClass = useMemo(() => {
    switch (variant) {
      case "continuous":
        return styles.variantContinuous;
      case "anchored":
        return styles.variantAnchored;
      case "corona":
        return styles.variantCorona;
      case "codex":
        return styles.variantCodex;
      case "hybrid":
        return styles.variantHybrid;
      case "meridian":
      default:
        return styles.variantAnchored;
    }
  }, [variant]);

  if (!concept) {
    return (
      <aside
        ref={ref}
        className={`${styles.detailPanel} ${variantClass}`}
        aria-label="Selected Concept Details"
      >
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
  const archetypeKey = celestialIdentity?.archetype ?? "volcanic-rocky";

  return (
    <aside
      ref={ref}
      className={`${styles.detailPanel} ${variantClass} ${
        isExpanded ? styles.mobileExpanded : styles.mobileCompact
      }`}
      aria-label="Selected Concept Details"
      data-archetype={archetypeKey}
    >
      {/* Mobile Cosmic Lens Header & Expand/Collapse Toggle Affordance */}
      <div className={styles.lensToggleBar}>
        <button
          type="button"
          className={styles.lensToggleBtn}
          onClick={toggleExpanded}
          aria-expanded={isExpanded}
          aria-label={
            isExpanded
              ? "Collapse to compact exploration lens"
              : "Expand to read full knowledge"
          }
        >
          <span className={styles.lensHandleBar} aria-hidden="true" />
          <span className={styles.lensToggleLabel}>
            {isExpanded ? "▼ Compact Universe" : "▲ Expand Reading"}
          </span>
        </button>
      </div>

      {/* Direction A: Planet-Anchored Knowledge Projection atmospheric boundary */}
      {variant === "anchored" && (
        <div className={styles.anchoredBoundary} aria-hidden="true">
          <div className={styles.anchoredAura} />
          <div className={styles.anchoredContourArc} />
          <div className={styles.anchoredGlow} />
        </div>
      )}

      {/* Direction B: Continuous Cosmic Reading Field */}
      {variant === "continuous" && (
        <div className={styles.continuousAtmosphere} aria-hidden="true">
          <div className={styles.continuousAura} />
        </div>
      )}

      {/* Backwards-compatible legacy preview boundaries */}
      {variant === "meridian" && (
        <div className={styles.meridianBoundary} aria-hidden="true">
          <div className={styles.meridianLine} />
          <div className={styles.meridianGlow} />
        </div>
      )}

      {variant === "corona" && (
        <div className={styles.coronaBoundary} aria-hidden="true">
          <div className={styles.coronaAura} />
          <div className={styles.coronaMeniscus} />
        </div>
      )}

      {variant === "codex" && (
        <div className={styles.codexBoundary} aria-hidden="true">
          <div className={styles.codexPrimaryGuide} />
          <div className={styles.codexSecondaryGuide} />
        </div>
      )}

      {variant === "hybrid" && (
        <div className={styles.hybridBoundary} aria-hidden="true">
          <div className={styles.hybridAura} />
          <div className={styles.hybridLine} />
          <div className={styles.hybridGlow} />
        </div>
      )}

      {/* Live announcement region for assistive technologies */}
      <div className={styles.srOnly} aria-live="polite" aria-atomic="true">
        {`Selected concept: ${concept.name}. ${connectedRelationships.length} connected relationships.`}
      </div>

      <div ref={scrollContainerRef} className={styles.panelScroll}>
        {/* Subtle return action matching Option C reference */}
        {concept.slug !== "rust" && (
          <button
            type="button"
            className={styles.projectedBackBtn}
            onClick={() => onSelectConcept("rust")}
            aria-label="Back to Universe Root"
          >
            <span className={styles.projectedBackArrow} aria-hidden="true">
              ←
            </span>
            <span>Return to Universe Root</span>
          </button>
        )}

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

        {/* Mobile Compact State Quick Exploration Prompt */}
        <div className={styles.compactExplorationPrompt} onClick={toggleExpanded}>
          <span className={styles.compactCountBadge}>
            {connectedRelationships.length} Connections
          </span>
          <span className={styles.compactPromptText}>Tap to explore knowledge</span>
          <span className={styles.compactChevron} aria-hidden="true">
            {isExpanded ? "▼" : "▲"}
          </span>
        </div>

        {/* Full Long-Form Description */}
        {concept.description && (
          <p className={styles.conceptDescription}>{concept.description}</p>
        )}

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
            {orderedRelationships.map((rel, idx) => {
              const isSource = rel.sourceConceptId === concept.id;
              const otherConceptId = isSource ? rel.targetConceptId : rel.sourceConceptId;
              const otherConcept = graphIndex.conceptById.get(otherConceptId);

              if (!otherConcept) return null;

              const otherIdentity = getConceptCelestialIdentity(otherConcept.slug);
              const otherArchetype = otherIdentity?.archetype ?? "volcanic-rocky";

              return (
                <li key={rel.id} className={styles.connectionItem} data-index={idx}>
                  {/* Direction A: Orbital anchor pip on the curved contour */}
                  {(variant === "anchored" || variant === "meridian" || variant === "hybrid") && (
                    <span
                      className={styles.anchoredAnchorPip}
                      data-archetype={otherArchetype}
                      aria-hidden="true"
                    />
                  )}

                  <div className={styles.connectionRow}>
                    {/* Mini Procedural Celestial Avatar for Related World */}
                    <div className={styles.connectionAvatarCol}>
                      <span
                        className={styles.celestialOrbMini}
                        data-archetype={otherArchetype}
                        aria-hidden="true"
                      />
                    </div>

                    <div className={styles.connectionMainCol}>
                      <div className={styles.connectionTitleRow}>
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
                        <span className={styles.typePill} data-archetype={otherArchetype}>
                          {rel.type}
                        </span>
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
                    </div>
                  </div>
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
});

export default ConceptPanel;
