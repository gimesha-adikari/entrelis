"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import type { KnowledgeDataset, Concept } from "@/domain/knowledge/types";
import { SEED_DATASET } from "@/data/seed";
import { getOrCreateKnowledgeGraphIndex } from "../knowledge-index";
import { getConceptCelestialIdentity } from "../celestial-3d/identity";
import GraphCanvas from "./GraphCanvas";
import ConceptPanel, { type ProjectedVariant } from "./ConceptPanel";
import CelestialProjectionBridge, { type ProjectionAnchor } from "./CelestialProjectionBridge";
import styles from "./KnowledgeGraph.module.css";

interface Props {
  dataset?: KnowledgeDataset;
  initialSlug?: string;
  initialVariant?: ProjectedVariant;
}

function parseVariantFromSearch(search: string, fallback: ProjectedVariant): ProjectedVariant {
  const params = new URLSearchParams(search);
  const v = params.get("variant");
  if (v === "b" || v === "continuous") return "continuous";
  if (v === "a" || v === "anchored") return "anchored";
  if (v === "1" || v === "meridian") return "meridian";
  if (v === "2" || v === "corona") return "corona";
  if (v === "3" || v === "codex") return "codex";
  if (v === "4" || v === "hybrid") return "hybrid";
  return fallback;
}

function subscribeToLocation(callback: () => void) {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}

function subscribeToResize(callback: () => void) {
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
}

export default function KnowledgeGraphExperience({
  dataset = SEED_DATASET,
  initialSlug = "rust",
  initialVariant = "anchored",
}: Props) {
  const [selectedSlug, setSelectedSlug] = useState<string>(initialSlug);
  const [variantOverride, setVariantOverride] = useState<ProjectedVariant | null>(null);
  const [focusPos, setFocusPos] = useState<ProjectionAnchor | null>(null);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const panelRef = useRef<HTMLElement>(null);

  // Synchronize URL search params safely with external store (zero SSR hydration mismatch or cascading render)
  const urlVariant = useSyncExternalStore(
    subscribeToLocation,
    () => (typeof window !== "undefined" ? parseVariantFromSearch(window.location.search, initialVariant) : initialVariant),
    () => initialVariant
  );
  const variant = variantOverride ?? urlVariant;

  const showDevSwitcher = useSyncExternalStore(
    subscribeToLocation,
    () => (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("switcher") === "true" : false),
    () => false
  );

  const isMobile = useSyncExternalStore(
    subscribeToResize,
    () => (typeof window !== "undefined" ? window.innerWidth <= 768 : false),
    () => false
  );

  const handleSelectVariant = useCallback((newVariant: ProjectedVariant) => {
    setVariantOverride(newVariant);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("variant", newVariant);
      window.history.replaceState(window.history.state, "", url.toString());
    }
  }, []);

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

  const celestialIdentity = useMemo(() => {
    if (!selectedConcept) return null;
    return getConceptCelestialIdentity(selectedConcept.slug);
  }, [selectedConcept]);

  /**
   * Synchronize selection changes with browser history and URL.
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

      {/* Exploration Variant Switcher Pill - only displayed in dev mode with ?switcher=true */}
      {showDevSwitcher && (
        <aside className={styles.variantSwitcher} aria-label="Visual Exploration Variant Switcher">
          <span className={styles.variantSwitcherLabel}>Option C Field:</span>
          <div className={styles.variantBtnGroup} role="radiogroup" aria-label="Projected Field Variant">
            <button
              type="button"
              role="radio"
              aria-checked={variant === "anchored"}
              className={`${styles.variantBtn} ${variant === "anchored" ? styles.variantBtnActive : ""}`}
              onClick={() => handleSelectVariant("anchored")}
              title="Direction A: Planet-Anchored Knowledge Projection"
            >
              A · Anchored
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={variant === "continuous"}
              className={`${styles.variantBtn} ${variant === "continuous" ? styles.variantBtnActive : ""}`}
              onClick={() => handleSelectVariant("continuous")}
              title="Direction B: Continuous Cosmic Reading Field"
            >
              B · Continuous
            </button>
          </div>
        </aside>
      )}

      <main className={styles.mainContent}>
        {/* Main 2D Canvas viewport */}
        <GraphCanvas
          dataset={dataset}
          index={index}
          selectedConceptSlug={selectedSlug}
          onSelectConcept={selectConcept}
          onResetCamera={handleResetCamera}
          onFocusPositionChange={setFocusPos}
        />

        {/* Dynamic Celestial Projection Field Bridge */}
        {variant === "anchored" && (
          <CelestialProjectionBridge
            focusPos={focusPos}
            archetype={celestialIdentity?.archetype}
            panelRef={panelRef}
            isMobile={isMobile}
            isMobileExpanded={isMobileExpanded}
          />
        )}

        {/* Semantic Right / Lower Detail Panel */}
        <ConceptPanel
          ref={panelRef}
          concept={selectedConcept}
          dataset={dataset}
          index={index}
          onSelectConcept={selectConcept}
          variant={variant}
          isMobileExpanded={isMobileExpanded}
          onToggleMobileExpanded={() => setIsMobileExpanded((prev) => !prev)}
        />
      </main>
    </div>
  );
}
