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
  navigationMode?: "production" | "lab" | "wave1";
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

const FIELD_WIDTH_KEY = "entrelis:field-width";

export function getResponsiveFieldWidthLimits(viewportWidth: number): {
  min: number;
  max: number;
  defaultWidth: number;
} {
  if (viewportWidth <= 768) {
    return { min: viewportWidth, max: viewportWidth, defaultWidth: viewportWidth };
  }
  // On wide screens (>= 1440): min 360, max 700, default 480
  // On smaller desktops (e.g. 1024 or 1280): dynamically limit max width so celestial universe retains at least 46% exploration space
  const max = Math.min(700, Math.max(380, Math.floor(viewportWidth * 0.54)));
  const min = Math.min(360, Math.floor(viewportWidth * 0.35));
  const defaultWidth = Math.min(max, Math.max(min, Math.round(viewportWidth * 0.38)));
  return { min: Math.max(320, min), max, defaultWidth };
}

function subscribeToFieldWidth(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener("entrelis:field-width-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("entrelis:field-width-change", callback);
  };
}

function getFieldWidthSnapshot(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(FIELD_WIDTH_KEY);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!Number.isNaN(parsed)) return parsed;
    }
  } catch {}
  return null;
}

export default function KnowledgeGraphExperience({
  dataset = SEED_DATASET,
  initialSlug = "rust",
  initialVariant = "anchored",
  navigationMode = "production",
}: Props) {
  const [selectedSlug, setSelectedSlug] = useState<string>(() => {
    if (typeof window !== "undefined" && (navigationMode === "lab" || navigationMode === "wave1")) {
      const urlConcept = new URLSearchParams(window.location.search).get("concept");
      if (urlConcept) return urlConcept;
    }
    return initialSlug;
  });

  const [prevInitialSlug, setPrevInitialSlug] = useState(initialSlug);
  if (prevInitialSlug !== initialSlug) {
    setPrevInitialSlug(initialSlug);
    setSelectedSlug(initialSlug);
  }

  const [variantOverride, setVariantOverride] = useState<ProjectedVariant | null>(null);
  const [focusPos, setFocusPos] = useState<ProjectionAnchor | null>(null);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const [userCustomWidth, setUserCustomWidth] = useState<number | null>(null);
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

  const windowWidth = useSyncExternalStore(
    subscribeToResize,
    () => (typeof window !== "undefined" ? window.innerWidth : 1440),
    () => 1440
  );

  const storedWidth = useSyncExternalStore(
    subscribeToFieldWidth,
    getFieldWidthSnapshot,
    () => null
  );

  const isMobile = windowWidth <= 768;

  const widthLimits = useMemo(() => getResponsiveFieldWidthLimits(windowWidth), [windowWidth]);

  // Derive active field width reactively from userCustomWidth -> storedWidth -> defaultWidth
  const rawWidth = userCustomWidth ?? storedWidth ?? widthLimits.defaultWidth;
  const fieldWidth = Math.min(widthLimits.max, Math.max(widthLimits.min, rawWidth));

  const handleFieldWidthChange = useCallback((newWidth: number) => {
    const currentLimits = getResponsiveFieldWidthLimits(
      typeof window !== "undefined" ? window.innerWidth : 1440
    );
    const clamped = Math.min(currentLimits.max, Math.max(currentLimits.min, Math.round(newWidth)));
    setUserCustomWidth(clamped);
    try {
      localStorage.setItem(FIELD_WIDTH_KEY, String(clamped));
      window.dispatchEvent(new Event("entrelis:field-width-change"));
    } catch {}
  }, []);

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
  const selectConcept = useCallback(
    (slug: string) => {
      setSelectedSlug(slug);
      if (typeof window !== "undefined") {
        if (navigationMode === "lab" || navigationMode === "wave1") {
          const url = new URL(window.location.href);
          url.searchParams.set("concept", slug);
          if (window.location.search !== url.search) {
            window.history.pushState({ slug }, "", url.toString());
          }
        } else {
          const targetUrl = `/concept/${slug}`;
          if (window.location.pathname !== targetUrl) {
            window.history.pushState({ slug }, "", targetUrl);
          }
        }
      }
    },
    [navigationMode]
  );

  // Listen to popstate for seamless browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window === "undefined") return;
      if (navigationMode === "lab" || navigationMode === "wave1") {
        const params = new URLSearchParams(window.location.search);
        const conceptParam = params.get("concept");
        if (conceptParam) {
          setSelectedSlug(conceptParam);
        } else {
          setSelectedSlug("rust");
        }
      } else {
        const pathname = window.location.pathname;
        const match = pathname.match(/^\/concept\/([^/]+)/);
        if (match && match[1]) {
          setSelectedSlug(match[1]);
        } else if (pathname === "/") {
          setSelectedSlug("rust");
        }
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [navigationMode]);

  // Synchronize document title during client exploration without triggering route remounts
  useEffect(() => {
    if (typeof document === "undefined" || !selectedConcept) return;

    if (navigationMode === "lab") {
      document.title = `${selectedConcept.name} — M2 Connected Universe Preview | Entrelis Lab`;
    } else {
      if (
        selectedSlug === "rust" &&
        typeof window !== "undefined" &&
        window.location.pathname === "/"
      ) {
        document.title = "Entrelis — Everything is connected";
      } else {
        document.title = `${selectedConcept.name} — Entrelis`;
      }
    }
  }, [navigationMode, selectedConcept, selectedSlug]);

  // Reset view to root / default Rust selection
  const handleResetCamera = useCallback(() => {
    setSelectedSlug("rust");
    if (typeof window !== "undefined") {
      if (navigationMode === "lab" || navigationMode === "wave1") {
        const url = new URL(window.location.href);
        url.searchParams.delete("concept");
        window.history.pushState({ slug: "rust" }, "", url.toString());
      } else if (window.location.pathname !== "/") {
        window.history.pushState({ slug: "rust" }, "", "/");
      }
    }
  }, [navigationMode]);

  return (
    <div className={styles.container}>
      {/* Minimal Entrelis brand identity */}
      <header className={styles.brandOverlay}>
        <div className={styles.brandTitleRow}>
          <h1 className={styles.brandTitle}>Entrelis</h1>
          {navigationMode === "lab" && (
            <span className={styles.labBadge} data-testid="m2-preview-badge">
              M2 Preview · 13 Nodes
            </span>
          )}
          {navigationMode === "wave1" && (
            <span className={styles.labBadge} data-testid="wave1-preview-badge">
              Wave 1 Preview · 33 Nodes
            </span>
          )}
        </div>
        <p className={styles.brandTagline}>
          {navigationMode === "lab"
            ? "Editorial Research Universe Preview (13 Nodes · 19 Connections)"
            : navigationMode === "wave1"
            ? "Editorial Research Universe Preview (33 Nodes · 61 Connections)"
            : "Everything is connected"}
        </p>
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
          knowledgeFieldWidth={!isMobile ? fieldWidth : undefined}
        />

        {/* Dynamic Celestial Projection Field Bridge */}
        {variant === "anchored" && (
          <CelestialProjectionBridge
            focusPos={focusPos}
            archetype={celestialIdentity?.archetype}
            rings={celestialIdentity?.rings}
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
          navigationMode={navigationMode}
          isMobileExpanded={isMobileExpanded}
          onToggleMobileExpanded={() => setIsMobileExpanded((prev) => !prev)}
          fieldWidth={fieldWidth}
          minFieldWidth={widthLimits.min}
          maxFieldWidth={widthLimits.max}
          onFieldWidthChange={handleFieldWidthChange}
        />
      </main>
    </div>
  );
}
