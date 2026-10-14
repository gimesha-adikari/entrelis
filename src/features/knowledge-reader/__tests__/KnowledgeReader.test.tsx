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
});
