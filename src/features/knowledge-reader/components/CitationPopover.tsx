"use client";

import React, { useEffect, useRef } from "react";
import type { CitationRecord } from "@/data/preview/types";
import { isSafeUrl } from "@/domain/knowledge/validation";
import styles from "./CitationPopover.module.css";

interface CitationPopoverProps {
  readonly citation: CitationRecord | null;
  readonly onClose: () => void;
}

export function CitationPopover({ citation, onClose }: CitationPopoverProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!citation) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [citation, onClose]);

  // Trap focus / focus on mount
  useEffect(() => {
    if (citation && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [citation]);

  if (!citation) return null;

  const hasSafeUrl = isSafeUrl(citation.url);

  return (
    <div className={styles.backdrop} onClick={onClose} data-testid="citation-popover-backdrop">
      <div
        ref={dialogRef}
        className={styles.popover}
        role="dialog"
        aria-modal="true"
        aria-labelledby="citation-dialog-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        data-testid="citation-popover"
      >
        <div className={styles.header}>
          <div className={styles.headerBadges}>
            <span className={styles.citationBadge}>Citation [{citation.index}]</span>
            {citation.sourceId && <span className={styles.sourceIdBadge}>{citation.sourceId}</span>}
            {citation.evidenceTier && (
              <span className={styles.tierBadge}>{citation.evidenceTier}</span>
            )}
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close citation details"
          >
            ✕
          </button>
        </div>

        <h3 id="citation-dialog-title" className={styles.title}>
          {citation.title}
        </h3>

        {citation.supportedClaims && (
          <div className={styles.claimsBox}>
            <span className={styles.claimsLabel}>Supported Claims:</span>
            <p className={styles.claimsText}>{citation.supportedClaims}</p>
          </div>
        )}

        <div className={styles.footer}>
          {hasSafeUrl ? (
            <a
              href={citation.url}
              target="_blank"
              rel="noreferrer noopener"
              className={styles.sourceButton}
            >
              <span>Open Authoritative Source</span>
              <span className={styles.arrow} aria-hidden="true">
                ↗
              </span>
            </a>
          ) : (
            <span className={styles.disabledLink}>Source link unavailable</span>
          )}
          <button type="button" className={styles.dismissButton} onClick={onClose}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
