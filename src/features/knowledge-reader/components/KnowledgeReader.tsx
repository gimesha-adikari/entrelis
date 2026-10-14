"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import type { CitationRecord, PilotArticle } from "@/data/preview/types";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { CitationPopover } from "./CitationPopover";
import { KnowledgeConnections } from "./KnowledgeConnections";
import styles from "./KnowledgeReader.module.css";

interface KnowledgeReaderProps {
  readonly initialArticle: PilotArticle;
  readonly allArticles: readonly PilotArticle[];
  readonly returnFrom?: string;
}

export function KnowledgeReader({
  initialArticle,
  allArticles,
  returnFrom: propReturnFrom,
}: KnowledgeReaderProps) {
  const [, startTransition] = useTransition();

  const [activeSlug, setActiveSlug] = useState<string>(initialArticle.slug);
  const [returnFrom, setReturnFrom] = useState<string | null>(() => {
    if (propReturnFrom) return propReturnFrom;
    if (typeof window !== "undefined") {
      const fromParam = new URLSearchParams(window.location.search).get("from");
      if (fromParam === "m2-universe" || fromParam === "wave1-universe") return fromParam;
    }
    return null;
  });
  const [activeCitation, setActiveCitation] = useState<CitationRecord | null>(null);
  const [activeTrigger, setActiveTrigger] = useState<HTMLElement | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Sync with URL (both pathname /lab/knowledge-reader/[slug] and query param ?article=) on mount and browser navigation
  useEffect(() => {
    function getSlugFromLocation(): string | null {
      if (typeof window === "undefined") return null;
      const pathname = window.location.pathname;
      const pathMatch = pathname.match(/^\/lab\/knowledge-reader\/([a-z0-9-]+)\/?$/);
      if (pathMatch && pathMatch[1]) {
        return pathMatch[1];
      }
      const params = new URLSearchParams(window.location.search);
      const articleParam = params.get("article");
      if (articleParam) {
        return articleParam;
      }
      return null;
    }

    function syncFromUrl() {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      const fromParam = params.get("from");
      if (fromParam === "m2-universe" || fromParam === "wave1-universe") {
        setReturnFrom(fromParam);
      }
      const urlSlug = getSlugFromLocation();
      if (urlSlug && allArticles.some((a) => a.slug === urlSlug)) {
        setActiveSlug(urlSlug);
        return;
      }
      setActiveSlug(initialArticle.slug);
    }

    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, [allArticles, initialArticle.slug]);

  // Track scroll progress for reading progress bar
  useEffect(() => {
    function handleScroll() {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll > 0) {
        const currentProgress = (window.scrollY / totalScroll) * 100;
        setScrollProgress(Math.min(100, Math.max(0, currentProgress)));
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const currentArticle = allArticles.find((a) => a.slug === activeSlug) ?? initialArticle;
  const isSeed = currentArticle.tier === "seed";
  const isFromM2Universe = returnFrom === "m2-universe";
  const isFromWave1Universe = returnFrom === "wave1-universe";
  const backUrl = isFromWave1Universe
    ? `/lab/m2-wave1-universe?concept=${currentArticle.slug}`
    : isFromM2Universe
      ? `/lab/m2-universe?concept=${currentArticle.slug}`
      : isSeed
        ? `/concept/${currentArticle.slug}`
        : "/";
  const backLabel = isFromWave1Universe
    ? `Return to ${currentArticle.title} in Wave 1 Universe`
    : isFromM2Universe
      ? `Return to ${currentArticle.title} in M2 Universe`
      : isSeed
        ? `Return to ${currentArticle.title} in Universe`
        : "Return to Universe";

  // Keep document title in sync with active article
  useEffect(() => {
    if (typeof document !== "undefined" && currentArticle) {
      document.title = `${currentArticle.title} — Knowledge Reader Preview | Entrelis Lab`;
    }
  }, [currentArticle]);

  const currentIndex = allArticles.findIndex((a) => a.slug === currentArticle.slug);
  const prevArticle = currentIndex > 0 ? allArticles[currentIndex - 1] : null;
  const nextArticle = currentIndex < allArticles.length - 1 ? allArticles[currentIndex + 1] : null;

  function handleSelectArticle(slug: string) {
    setActiveSlug(slug);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });

    startTransition(() => {
      if (typeof window !== "undefined") {
        const isQueryStyle =
          window.location.pathname === "/lab/knowledge-reader" &&
          window.location.search.includes("article=");
        const baseTarget = isQueryStyle
          ? `/lab/knowledge-reader?article=${slug}`
          : `/lab/knowledge-reader/${slug}`;
        const targetUrl = isFromWave1Universe
          ? `${baseTarget}${isQueryStyle ? "&" : "?"}from=wave1-universe`
          : isFromM2Universe
          ? `${baseTarget}${isQueryStyle ? "&" : "?"}from=m2-universe`
          : baseTarget;

        window.history.pushState(null, "", targetUrl);
      }
    });
  }

  function handleHeadingClick(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      setSidebarOpen(false);
    }
  }

  return (
    <div className={styles.readerRoot} data-testid="knowledge-reader-root">
      {/* Scroll Reading Progress Bar */}
      <div
        className={styles.progressBar}
        style={{ width: `${scrollProgress}%` }}
        aria-hidden="true"
      />

      {/* Top Navigation Bar */}
      <header className={styles.topBar}>
        <div className={styles.topBarContent}>
          <div className={styles.brandingCol}>
            <Link href="/" className={styles.brandLink} aria-label="Entrelis Home">
              <span className={styles.brandOrb} aria-hidden="true" />
              <span className={styles.brandName}>ENTRELIS</span>
            </Link>
            <span className={styles.brandDivider}>/</span>
            <span className={styles.labBadge}>Lab Preview</span>
          </div>

          <div className={styles.articleIndicator}>
            <span className={styles.indicatorTitle}>{currentArticle.title}</span>
            <span className={styles.indicatorTime}>
              {currentArticle.readingTimeMinutes} min read
            </span>
          </div>

          <div className={styles.topBarActions}>
            <Link
              href={backUrl}
              className={styles.backToUniverseLink}
              data-testid="back-to-universe-link"
              aria-label={backLabel}
            >
              <span className={styles.backArrow} aria-hidden="true">
                ←
              </span>
              <span className={styles.backText}>Back to Universe</span>
            </Link>

            <button
              type="button"
              className={styles.tocToggleButton}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label={sidebarOpen ? "Close navigation drawer" : "Open navigation drawer"}
              aria-expanded={sidebarOpen}
            >
              <span className={styles.menuIcon} aria-hidden="true">
                ☰
              </span>
              <span className={styles.tocButtonLabel}>Articles & Outline</span>
            </button>
          </div>
        </div>
      </header>

      {/* Editorial Safety Banner */}
      <aside
        className={`${styles.editorialBanner} ${isSeed ? styles.editorialBannerSeed : ""}`}
        aria-label="Editorial draft disclaimer"
        data-testid="editorial-safety-banner"
      >
        <div className={styles.editorialBannerInner}>
          <span
            className={`${styles.editorialBadge} ${isSeed ? styles.editorialBadgeSeed : ""}`}
            aria-hidden="true"
          >
            {isSeed
              ? "EDITORIAL PROPOSAL · SEED CONCEPT"
              : "DRAFT PREVIEW · AWAITING EDITORIAL APPROVAL"}
          </span>
          <p className={styles.editorialText}>
            {isSeed ? (
              <>
                This educational knowledge article is a proposed long-form reading experience for
                the published seed concept <strong>&quot;{currentArticle.title}&quot;</strong>. The
                concept itself is part of the published foundation in the universe knowledge graph,
                while this article is an editorial proposal under review.
              </>
            ) : (
              <>
                This educational knowledge article is part of the Milestone 2 Batch 01 Pilot. All
                candidate concepts and relationships are strictly held at{" "}
                <code>reviewStatus: &quot;needs-review&quot;</code> and are not yet published to the
                production knowledge graph.
              </>
            )}
          </p>
        </div>
      </aside>

      {/* Main Layout Container */}
      <div className={styles.mainContainer}>
        {/* Navigation Sidebar / Drawer */}
        <nav
          className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ""}`}
          aria-label="Article Outline and Directory"
          data-testid="reader-sidebar"
        >
          <div className={styles.sidebarHeader}>
            <h2 className={styles.sidebarHeading}>Knowledge Articles ({allArticles.length})</h2>
            <button
              type="button"
              className={styles.closeDrawerButton}
              onClick={() => setSidebarOpen(false)}
              aria-label="Close drawer"
            >
              ✕
            </button>
          </div>

          <ul className={styles.articleList}>
            {allArticles.map((art, idx) => {
              const isActive = art.slug === currentArticle.slug;
              const isArtSeed = art.tier === "seed";
              return (
                <li key={art.slug} className={styles.articleListItem}>
                  <button
                    type="button"
                    className={`${styles.articleButton} ${
                      isActive ? styles.articleButtonActive : ""
                    }`}
                    onClick={() => handleSelectArticle(art.slug)}
                    aria-current={isActive ? "page" : undefined}
                    data-testid={`article-nav-button-${art.slug}`}
                  >
                    <span className={styles.articleNum}>
                      {idx < 9 ? `0${idx + 1}` : `${idx + 1}`}
                    </span>
                    <div className={styles.articleMetaCol}>
                      <span className={styles.articleTitle}>{art.title}</span>
                      <span className={styles.articleMetaLine}>
                        <span className={isArtSeed ? styles.tierLabelSeed : styles.tierLabelPilot}>
                          {isArtSeed ? "Seed" : "Pilot"}
                        </span>
                        {" · "}
                        {art.wordCount.toLocaleString()} words · {art.readingTimeMinutes} min
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Table of Contents for Active Article */}
          {currentArticle.headings.length > 0 && (
            <div className={styles.tocSection}>
              <h3 className={styles.tocHeading}>Table of Contents</h3>
              <ul className={styles.tocList}>
                {currentArticle.headings
                  .filter((h) => h.level <= 2)
                  .map((h) => (
                    <li key={h.id} className={styles.tocItem}>
                      <button
                        type="button"
                        className={styles.tocLink}
                        onClick={() => handleHeadingClick(h.id)}
                      >
                        {h.text}
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </nav>

        {/* Backdrop for mobile drawer */}
        {sidebarOpen && (
          <div
            className={styles.drawerBackdrop}
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Article Reading Pane */}
        <main className={styles.readingPane} data-testid="reading-pane">
          {/* Article Header Ribbon */}
          <div className={styles.articleHeader}>
            <div className={styles.breadcrumbBar}>
              <Link
                href={backUrl}
                className={styles.breadcrumbBackLink}
                aria-label={backLabel}
              >
                <span aria-hidden="true">←</span>
                <span>Back to Universe</span>
              </Link>
            </div>

            <div className={styles.tagRow}>
              {currentArticle.domains.map((dom) => (
                <span key={dom} className={styles.domainTag}>
                  {dom}
                </span>
              ))}
              <span className={isSeed ? styles.seedBadgeTag : styles.pilotBadgeTag}>
                {isSeed ? "Seed Concept (Published)" : "Pilot Candidate (Draft)"}
              </span>
              <span className={styles.statusBadge}>{currentArticle.reviewStatus}</span>
            </div>

            <h1 className={styles.mainTitle}>{currentArticle.title}</h1>
            <p className={styles.leadSummary}>{currentArticle.shortDescription}</p>

            <div className={styles.readingMeta}>
              <span>{currentArticle.wordCount.toLocaleString()} words</span>
              <span>·</span>
              <span>{currentArticle.readingTimeMinutes} min read</span>
              <span>·</span>
              <span>{currentArticle.citations.length} Sources referenced</span>
            </div>
          </div>

          {/* Article Content */}
          <div className={styles.articleContent}>
            <MarkdownRenderer
              markdown={currentArticle.markdownContent.replace(/^#\s+[^\n]+\n*/, "")}
              citations={currentArticle.citations}
              onCitationClick={(citation) => {
                setActiveTrigger(
                  typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null
                );
                setActiveCitation(citation);
              }}
            />
          </div>

          {/* Connected Concepts in the Knowledge Universe */}
          <KnowledgeConnections
            currentConceptName={currentArticle.title}
            connections={currentArticle.connections}
            onSelectArticle={handleSelectArticle}
            returnFrom={returnFrom ?? undefined}
          />

          {/* Next / Prev Article Footer Navigation */}
          <nav className={styles.paginationNav} aria-label="Article Pagination">
            {prevArticle ? (
              <button
                type="button"
                className={styles.navPageButton}
                onClick={() => handleSelectArticle(prevArticle.slug)}
                aria-label={`Previous article: ${prevArticle.title}`}
              >
                <span className={styles.navPageDirection}>← Previous Article</span>
                <span className={styles.navPageTitle}>{prevArticle.title}</span>
              </button>
            ) : (
              <div />
            )}

            {nextArticle && (
              <button
                type="button"
                className={`${styles.navPageButton} ${styles.navPageNext}`}
                onClick={() => handleSelectArticle(nextArticle.slug)}
                aria-label={`Next article: ${nextArticle.title}`}
              >
                <span className={styles.navPageDirection}>Next Article →</span>
                <span className={styles.navPageTitle}>{nextArticle.title}</span>
              </button>
            )}
          </nav>
        </main>
      </div>

      {/* Interactive Citation Popover */}
      <CitationPopover
        citation={activeCitation}
        triggerElement={activeTrigger}
        onClose={() => {
          setActiveCitation(null);
          setActiveTrigger(null);
        }}
      />
    </div>
  );
}
