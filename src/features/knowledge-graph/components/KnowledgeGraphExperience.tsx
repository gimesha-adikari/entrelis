"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { KnowledgeDataset, Concept } from "@/domain/knowledge/types";
import { SEED_DATASET } from "@/data/seed";
import GraphCanvas from "./GraphCanvas";
import ConceptPanel from "./ConceptPanel";
import styles from "./KnowledgeGraph.module.css";

interface Props {
  dataset?: KnowledgeDataset;
  initialSlug?: string;
}

export default function KnowledgeGraphExperience({
  dataset = SEED_DATASET,
  initialSlug = "rust",
}: Props) {
  const [selectedSlug, setSelectedSlug] = useState<string>(initialSlug);

  // Find the active concept, falling back cleanly to rust
  const selectedConcept = useMemo<Concept>(() => {
    const found = dataset.concepts.find((c) => c.slug === selectedSlug);
    if (found) return found;
    return dataset.concepts.find((c) => c.slug === "rust") || dataset.concepts[0];
  }, [dataset.concepts, selectedSlug]);

  // Synchronize selection changes with browser history and URL
  const selectConcept = useCallback((slug: string) => {
    setSelectedSlug(slug);
    if (typeof window !== "undefined") {
      const targetUrl = `/concept/${slug}`;
      if (window.location.pathname !== targetUrl) {
        window.history.pushState({ slug }, "", targetUrl);
      }
    }
  }, []);

  // Listen to popstate for seamless browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window === "undefined") return;
      const pathname = window.location.pathname;
      const match = pathname.match(/^\/concept\/([^/]+)/);
      if (match && match[1]) {
        setSelectedSlug(match[1]);
      } else if (pathname === "/") {
        setSelectedSlug("rust");
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Reset view to root / default Rust selection
  const handleResetCamera = useCallback(() => {
    setSelectedSlug("rust");
    if (typeof window !== "undefined" && window.location.pathname !== "/") {
      window.history.pushState({ slug: "rust" }, "", "/");
    }
  }, []);

  return (
    <div className={styles.container}>
      {/* Minimal Entrelis brand identity */}
      <header className={styles.brandOverlay}>
        <h1 className={styles.brandTitle}>Entrelis</h1>
        <p className={styles.brandTagline}>Everything is connected</p>
      </header>

      {/* Main 2D Canvas viewport */}
      <GraphCanvas
        dataset={dataset}
        selectedConceptSlug={selectedSlug}
        onSelectConcept={selectConcept}
        onResetCamera={handleResetCamera}
      />

      {/* Semantic Right / Lower Detail Panel */}
      <ConceptPanel
        concept={selectedConcept}
        dataset={dataset}
        onSelectConcept={selectConcept}
      />
    </div>
  );
}
