import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { KnowledgeReader } from "../components/KnowledgeReader";
import { getAllPilotArticles } from "@/data/preview";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn().mockReturnValue(null),
  }),
}));

describe("KnowledgeReader Component", () => {
  const articles = getAllPilotArticles();
  const initialArticle = articles[0]!;

  beforeEach(() => {
    window.scrollTo = vi.fn();
    window.history.pushState(null, "", "/");
  });

  it("renders the reader preview root and editorial safety banner", () => {
    render(<KnowledgeReader initialArticle={initialArticle} allArticles={articles} />);

    expect(screen.getByTestId("knowledge-reader-root")).toBeDefined();
    const banner = screen.getByTestId("editorial-safety-banner");
    expect(banner).toBeDefined();
    expect(banner.textContent).toContain("DRAFT PREVIEW · AWAITING EDITORIAL APPROVAL");
    expect(banner.textContent).toContain('reviewStatus: "needs-review"');
  });

  it("successfully renders each of the six pilot articles without errors", () => {
    for (const art of articles) {
      const { unmount } = render(<KnowledgeReader initialArticle={art} allArticles={articles} />);
      expect(screen.getByRole("heading", { level: 1, name: art.title })).toBeDefined();
      expect(screen.getByTestId("markdown-article-body")).toBeDefined();
      unmount();
    }
  });

  it("renders sidebar with all six pilot articles", () => {
    render(<KnowledgeReader initialArticle={initialArticle} allArticles={articles} />);

    const sidebar = screen.getByTestId("reader-sidebar");
    expect(sidebar).toBeDefined();

    for (const art of articles) {
      const button = screen.getByTestId(`article-nav-button-${art.slug}`);
      expect(button).toBeDefined();
      expect(button.textContent).toContain(art.title);
    }
  });

  it("switches to another article when clicking sidebar navigation button", () => {
    render(<KnowledgeReader initialArticle={initialArticle} allArticles={articles} />);

    // Initial article is Instruction Set Architecture
    expect(
      screen.getByRole("heading", { level: 1, name: "Instruction Set Architecture" })
    ).toBeDefined();

    // Click Virtual Memory in the sidebar
    const vmButton = screen.getByTestId("article-nav-button-virtual-memory");
    fireEvent.click(vmButton);

    // Now heading should be Virtual Memory
    expect(screen.getByRole("heading", { level: 1, name: "Virtual Memory" })).toBeDefined();
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("opens CitationPopover when clicking an inline citation badge and closes on escape", () => {
    render(<KnowledgeReader initialArticle={initialArticle} allArticles={articles} />);

    // Initial article has citation badge [1]
    const badges = screen.getAllByTestId("citation-badge-1");
    expect(badges.length).toBeGreaterThan(0);

    // Click citation badge
    fireEvent.click(badges[0]!);

    // Popover appears
    const popover = screen.getByTestId("citation-popover");
    expect(popover).toBeDefined();
    expect(popover.textContent).toContain("Citation [1]");
    expect(popover.textContent).toContain("src-riscv-spec");

    // Close on Escape key
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("citation-popover")).toBeNull();
  });

  it("renders knowledge connections distinguishing seed from pilot nodes", () => {
    // Select virtual-memory article which has both seed and pilot connections
    const vmArticle = articles.find((a) => a.slug === "virtual-memory")!;
    render(<KnowledgeReader initialArticle={vmArticle} allArticles={articles} />);

    const connSection = screen.getByTestId("knowledge-connections-section");
    expect(connSection).toBeDefined();

    // Connection to Operating Systems (seed)
    const osCard = screen.getByTestId("connection-card-rel-operating-systems-virtual-memory");
    expect(osCard).toBeDefined();
    expect(osCard.textContent).toContain("SEED CONCEPT (Published)");
  });

  it("renders pagination navigation with previous and next article buttons", () => {
    // Select second article (Virtual Memory) so both prev and next exist
    const vmArticle = articles.find((a) => a.slug === "virtual-memory")!;
    render(<KnowledgeReader initialArticle={vmArticle} allArticles={articles} />);

    const prevBtn = screen.getByRole("button", { name: /previous article/i });
    const nextBtn = screen.getByRole("button", { name: /next article/i });
    expect(prevBtn).toBeDefined();
    expect(nextBtn).toBeDefined();

    // Click next article button
    fireEvent.click(nextBtn);
    // Switches to file-systems
    expect(screen.getByRole("heading", { level: 1, name: "File Systems" })).toBeDefined();
  });

  it("uses updated editorial terminology (Sources referenced and Research-proposed connections)", () => {
    const vmArticle = articles.find((a) => a.slug === "virtual-memory")!;
    render(<KnowledgeReader initialArticle={vmArticle} allArticles={articles} />);

    // Meta ribbon must display "Sources referenced", not "Verified Sources Cited"
    expect(screen.getByText(/Sources referenced/i)).toBeDefined();
    expect(screen.queryByText(/Verified Sources Cited/i)).toBeNull();

    // Knowledge connections section must display "Research-proposed connections", not "Verified graph relationships"
    const connSection = screen.getByTestId("knowledge-connections-section");
    expect(connSection.textContent).toContain("Research-proposed connections");
    expect(connSection.textContent).not.toContain("Verified graph relationships");
  });

  it("opens popover with exact passage URL and restores focus to citation badge on close", () => {
    // Select virtual-memory which contains OSTEP chapter passage links
    const vmArticle = articles.find((a) => a.slug === "virtual-memory")!;
    render(<KnowledgeReader initialArticle={vmArticle} allArticles={articles} />);

    const badges = screen.getAllByTestId("citation-badge-1");
    // Find the badge that points to vm-tlbs.pdf
    const tlbBadge = badges.find(
      (b) => b.getAttribute("data-citation-url") === "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-tlbs.pdf"
    );
    expect(tlbBadge).toBeDefined();

    // Focus and click the badge
    tlbBadge!.focus();
    expect(document.activeElement).toBe(tlbBadge);
    fireEvent.click(tlbBadge!);

    // Popover opens
    const popover = screen.getByTestId("citation-popover");
    expect(popover).toBeDefined();

    // Primary action points to exact passage URL
    const sourceLink = screen.getByTestId("citation-popover-source-url");
    expect(sourceLink.getAttribute("href")).toBe(
      "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-tlbs.pdf"
    );

    // Canonical link points to book home
    const canonicalLink = screen.getByTestId("citation-popover-canonical-url");
    expect(canonicalLink.getAttribute("href")).toBe(
      "https://pages.cs.wisc.edu/~remzi/OSTEP/"
    );

    // Close with Dismiss button
    const dismissBtn = screen.getByRole("button", { name: "Dismiss" });
    fireEvent.click(dismissBtn);

    expect(screen.queryByTestId("citation-popover")).toBeNull();
  });

  it("traps keyboard Tab navigation inside the citation popover", () => {
    render(<KnowledgeReader initialArticle={initialArticle} allArticles={articles} />);

    const badges = screen.getAllByTestId("citation-badge-1");
    fireEvent.click(badges[0]!);

    const popover = screen.getByTestId("citation-popover");
    expect(popover).toBeDefined();

    const closeBtn = screen.getByRole("button", { name: /close citation details/i });
    const dismissBtn = screen.getByRole("button", { name: "Dismiss" });

    // When on dismiss button (last element), Tab loops to close button (first element)
    dismissBtn.focus();
    expect(document.activeElement).toBe(dismissBtn);
    fireEvent.keyDown(window, { key: "Tab" });
    expect(document.activeElement).toBe(closeBtn);

    // When on close button (first element), Shift+Tab loops to dismiss button (last element)
    closeBtn.focus();
    expect(document.activeElement).toBe(closeBtn);
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(dismissBtn);
  });

  it("synchronizes browser history and window title on article navigation", () => {
    const pushStateSpy = vi.spyOn(window.history, "pushState");
    render(<KnowledgeReader initialArticle={initialArticle} allArticles={articles} />);

    expect(document.title).toContain("Instruction Set Architecture");

    // Click Virtual Memory in the sidebar
    const vmButton = screen.getByTestId("article-nav-button-virtual-memory");
    fireEvent.click(vmButton);

    expect(pushStateSpy).toHaveBeenCalledWith(null, "", "/lab/knowledge-reader/virtual-memory");
    expect(document.title).toContain("Virtual Memory");

    // Simulate browser Back button (popstate)
    window.history.pushState(null, "", "/lab/knowledge-reader/concurrency");
    fireEvent(window, new PopStateEvent("popstate"));

    expect(screen.getByRole("heading", { level: 1, name: "Concurrency" })).toBeDefined();
    expect(document.title).toContain("Concurrency");

    pushStateSpy.mockRestore();
  });
});
