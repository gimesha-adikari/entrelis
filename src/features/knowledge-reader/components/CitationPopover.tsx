"use client";

import React, { useEffect, useRef, useCallback } from "react";
import type { CitationRecord } from "@/data/preview/types";
import { isSafeUrl } from "@/domain/knowledge/validation";
import styles from "./CitationPopover.module.css";

interface CitationPopoverProps {
  readonly citation: CitationRecord | null;
  readonly onClose: () => void;
  readonly triggerElement?: HTMLElement | null;
}

export function CitationPopover({ citation, onClose, triggerElement }: CitationPopoverProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Store trigger element when citation opens
  useEffect(() => {
    if (citation) {
      triggerRef.current =
        triggerElement ??
        (typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null);
      // Focus the close button or dialog container
      if (closeButtonRef.current) {
        closeButtonRef.current.focus();
      } else if (dialogRef.current) {
        dialogRef.current.focus();
      }
    }
  }, [citation, triggerElement]);

  const handleClose = useCallback(() => {
    const elToFocus = triggerRef.current;
    onClose();
    if (elToFocus && typeof elToFocus.focus === "function") {
      setTimeout(() => {
        elToFocus.focus();
      }, 0);
    }
  }, [onClose]);

  // Focus trap and Escape key handling
  useEffect(() => {
    if (!citation) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
        return;
      }

      if (e.key === "Tab") {
        if (!dialogRef.current) return;
        const focusableElements = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), a[href]:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );

        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (
            document.activeElement === first ||
            !dialogRef.current.contains(document.activeElement)
          ) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (
            document.activeElement === last ||
            !dialogRef.current.contains(document.activeElement)
          ) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [citation, handleClose]);

  if (!citation) return null;

  const hasSafeUrl = isSafeUrl(citation.url);
  const hasSafeCanonical = Boolean(
    citation.canonicalUrl &&
      citation.canonicalUrl !== citation.url &&
      isSafeUrl(citation.canonicalUrl)
  );

  return (
    <div className={styles.backdrop} onClick={handleClose} data-testid="citation-popover-backdrop">
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
            ref={closeButtonRef}
            type="button"
            className={styles.closeButton}
            onClick={handleClose}
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
          <div className={styles.footerActions}>
            {hasSafeUrl ? (
              <a
                href={citation.url}
                target="_blank"
                rel="noreferrer noopener"
                className={styles.sourceButton}
                data-testid="citation-popover-source-url"
              >
                <span>Open Authoritative Source</span>
                <span className={styles.arrow} aria-hidden="true">
                  ↗
                </span>
              </a>
            ) : (
              <span className={styles.disabledLink}>Source link unavailable</span>
            )}

            {hasSafeCanonical && (
              <a
                href={citation.canonicalUrl}
                target="_blank"
                rel="noreferrer noopener"
                className={styles.canonicalLink}
                data-testid="citation-popover-canonical-url"
              >
                <span>Main Reference</span>
                <span className={styles.arrow} aria-hidden="true">
                  ↗
                </span>
              </a>
            )}
          </div>

          <button type="button" className={styles.dismissButton} onClick={handleClose}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
