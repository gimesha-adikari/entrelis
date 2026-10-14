"use client";

import React from "react";
import Link from "next/link";
import type { ArticleConnection } from "@/data/preview/types";
import styles from "./KnowledgeConnections.module.css";

interface KnowledgeConnectionsProps {
  readonly currentConceptName: string;
  readonly connections: readonly ArticleConnection[];
  readonly onSelectArticle?: (slug: string) => void;
  readonly returnFrom?: string;
}

export function KnowledgeConnections({
  currentConceptName,
  connections,
  onSelectArticle,
  returnFrom,
}: KnowledgeConnectionsProps) {
  if (connections.length === 0) return null;

  return (
    <section
      className={styles.connectionsSection}
      aria-label="Connected Knowledge Universe"
      data-testid="knowledge-connections-section"
    >
      <div className={styles.sectionHeader}>
        <div className={styles.titleRow}>
          <span className={styles.subTitle}>Knowledge Bridges</span>
          <h2 className={styles.sectionTitle}>Connected Concepts in the Universe</h2>
        </div>
        <p className={styles.sectionDesc}>
          Research-proposed connections linking this topic to the broader knowledge architecture.
          Pilot concepts are preview drafts; seed concepts are part of the published foundation.
        </p>
      </div>

      <div className={styles.connectionsGrid}>
        {connections.map((conn) => {
          const isSeed = conn.relatedConcept.tier === "seed";
          const isOutgoing = conn.direction === "outgoing";

          return (
            <div
              key={conn.id}
              className={`${styles.connectionCard} ${isSeed ? styles.seedCard : styles.pilotCard}`}
              data-testid={`connection-card-${conn.id}`}
              data-related-concept={conn.relatedConcept.slug}
            >
              <div className={styles.cardHeader}>
                <div className={styles.badgesRow}>
                  {isSeed ? (
                    <span className={styles.seedBadge}>SEED CONCEPT (Published)</span>
                  ) : (
                    <span className={styles.pilotBadge}>PILOT CANDIDATE (Draft Preview)</span>
                  )}
                  <span className={styles.typePill}>{conn.type}</span>
                </div>
                <span className={styles.directionTag}>
                  {isOutgoing ? "outgoing →" : "← incoming"}
                </span>
              </div>

              {/* Directional Path Representation */}
              <div className={styles.pathRepresentation}>
                <span className={isOutgoing ? styles.nodeCurrent : styles.nodeConnected}>
                  {isOutgoing ? currentConceptName : conn.relatedConcept.name}
                </span>
                <span className={styles.pathArrow} aria-hidden="true">
                  ──[{conn.type}]──▶
                </span>
                <span className={!isOutgoing ? styles.nodeCurrent : styles.nodeConnected}>
                  {!isOutgoing ? currentConceptName : conn.relatedConcept.name}
                </span>
              </div>

              <p className={styles.explanation}>{conn.explanation}</p>

              <div className={styles.cardFooter}>
                {returnFrom === "m2-universe" || returnFrom === "wave1-universe" ? (
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                    <Link
                      href={
                        returnFrom === "wave1-universe"
                          ? `/lab/m2-wave1-universe?concept=${conn.relatedConcept.slug}`
                          : `/lab/m2-universe?concept=${conn.relatedConcept.slug}`
                      }
                      className={styles.exploreLink}
                      aria-label={`Explore ${conn.relatedConcept.name} in Universe`}
                    >
                      <span>Explore in Universe</span>
                      <span className={styles.arrow} aria-hidden="true">
                        ↗
                      </span>
                    </Link>
                    <button
                      type="button"
                      className={styles.readArticleButton}
                      onClick={() => onSelectArticle?.(conn.relatedConcept.slug)}
                      aria-label={`Read article for ${conn.relatedConcept.name}`}
                    >
                      <span>Read Article</span>
                      <span className={styles.arrow} aria-hidden="true">
                        →
                      </span>
                    </button>
                  </div>
                ) : isSeed ? (
                  <Link
                    href={`/concept/${conn.relatedConcept.slug}`}
                    className={styles.exploreLink}
                    aria-label={`Explore seed concept ${conn.relatedConcept.name} in graph`}
                  >
                    <span>Explore in Graph</span>
                    <span className={styles.arrow} aria-hidden="true">
                      ↗
                    </span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    className={styles.readArticleButton}
                    onClick={() => onSelectArticle?.(conn.relatedConcept.slug)}
                    aria-label={`Read pilot article for ${conn.relatedConcept.name}`}
                  >
                    <span>Read Pilot Article</span>
                    <span className={styles.arrow} aria-hidden="true">
                      →
                    </span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
