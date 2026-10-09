"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { KnowledgeDataset, Concept } from "@/domain/knowledge/types";
import { SEED_DATASET } from "@/data/seed";
import { getOrCreateKnowledgeGraphIndex } from "../knowledge-index";
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

  // Memoize knowledge index once per dataset reference
  const index = useMemo(() => getOrCreateKnowledgeGraphIndex(dataset), [dataset]);

  // Find the active concept using O(1) index lookup
  const selectedConcept = useMemo<Concept | null>(() => {
    return (
      index.conceptBySlug.get(selectedSlug) ??
      index.conceptBySlug.get("rust") ??
      index.conceptById.values().next().value ??
      null
    );
  }, [index, selectedSlug]);

  /**
   * Synchronize selection changes with browser history and URL.
   *
   * Architecture note on native History API:
   * We intentionally use window.history.pushState and popstate rather than full router transitions:
   * 1. URLs remain shareable and deep-linkable (/concept/<slug>).
   * 2. Direct App Router routes work cleanly on initial load, static SSG generation, and reload.
   * 3. In-graph client exploration preserves the active canvas simulation and spatial camera
   *    without unmounting components, flashing, or recreating physics layouts.
   */
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

  // Synchronize document title during client exploration without triggering route remounts
  useEffect(() => {
    if (typeof document === "undefined" || !selectedConcept) return;

    if (
      selectedSlug === "rust" &&
      typeof window !== "undefined" &&
      window.location.pathname === "/"
    ) {
      document.title = "Entrelis — Everything is connected";
    } else {
      document.title = `${selectedConcept.name} — Entrelis`;
    }
  }, [selectedConcept, selectedSlug]);

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

      <main className={styles.mainContent}>
        {/* Main 2D Canvas viewport */}
        <GraphCanvas
          dataset={dataset}
          index={index}
          selectedConceptSlug={selectedSlug}
          onSelectConcept={selectConcept}
          onResetCamera={handleResetCamera}
        />

        {/* Semantic Right / Lower Detail Panel */}
        <ConceptPanel
          concept={selectedConcept}
          dataset={dataset}
          index={index}
          onSelectConcept={selectConcept}
        />
      </main>
    </div>
  );
}
