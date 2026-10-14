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
}

export function KnowledgeReader({ initialArticle, allArticles }: KnowledgeReaderProps) {
  const [, startTransition] = useTransition();

  const [activeSlug, setActiveSlug] = useState<string>(initialArticle.slug);
  const [activeCitation, setActiveCitation] = useState<CitationRecord | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Sync with URL query parameter on mount and browser navigation
  useEffect(() => {
    function syncFromUrl() {
      if (typeof window === "undefined") return;
      const params = new URLSearchParams(window.location.search);
      const articleParam = params.get("article");
      if (articleParam && allArticles.some((a) => a.slug === articleParam)) {
        setActiveSlug(articleParam);
      }
    }

    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, [allArticles]);

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

  const currentIndex = allArticles.findIndex((a) => a.slug === currentArticle.slug);
  const prevArticle = currentIndex > 0 ? allArticles[currentIndex - 1] : null;
  const nextArticle = currentIndex < allArticles.length - 1 ? allArticles[currentIndex + 1] : null;

  function handleSelectArticle(slug: string) {
    setActiveSlug(slug);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });

    startTransition(() => {
      if (typeof window !== "undefined") {
        window.history.pushState(null, "", `/lab/knowledge-reader?article=${slug}`);
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
        className={styles.editorialBanner}
        aria-label="Editorial draft disclaimer"
        data-testid="editorial-safety-banner"
      >
        <div className={styles.editorialBannerInner}>
          <span className={styles.editorialBadge} aria-hidden="true">
            DRAFT PREVIEW · AWAITING EDITORIAL APPROVAL
          </span>
          <p className={styles.editorialText}>
            This educational knowledge article is part of the Milestone 2 Batch 01 Pilot. All
            candidate concepts and relationships are strictly held at{" "}
            <code>reviewStatus: &quot;needs-review&quot;</code> and are not yet published to the
            production knowledge graph.
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
            <h2 className={styles.sidebarHeading}>Pilot Articles (6)</h2>
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
                    <span className={styles.articleNum}>0{idx + 1}</span>
                    <div className={styles.articleMetaCol}>
                      <span className={styles.articleTitle}>{art.title}</span>
                      <span className={styles.articleMetaLine}>
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
            <div className={styles.tagRow}>
              {currentArticle.domains.map((dom) => (
                <span key={dom} className={styles.domainTag}>
                  {dom}
                </span>
              ))}
              <span className={styles.statusBadge}>{currentArticle.reviewStatus}</span>
            </div>

            <h1 className={styles.mainTitle}>{currentArticle.title}</h1>
            <p className={styles.leadSummary}>{currentArticle.shortDescription}</p>

            <div className={styles.readingMeta}>
              <span>{currentArticle.wordCount.toLocaleString()} words</span>
              <span>·</span>
              <span>{currentArticle.readingTimeMinutes} min read</span>
              <span>·</span>
              <span>{currentArticle.citations.length} Verified Sources Cited</span>
            </div>
          </div>

          {/* Article Content */}
          <div className={styles.articleContent}>
            <MarkdownRenderer
              markdown={currentArticle.markdownContent.replace(/^#\s+[^\n]+\n*/, "")}
              citations={currentArticle.citations}
              onCitationClick={(citation) => setActiveCitation(citation)}
            />
          </div>

          {/* Connected Concepts in the Knowledge Universe */}
          <KnowledgeConnections
            currentConceptName={currentArticle.title}
            connections={currentArticle.connections}
            onSelectArticle={handleSelectArticle}
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
      <CitationPopover citation={activeCitation} onClose={() => setActiveCitation(null)} />
    </div>
  );
}
