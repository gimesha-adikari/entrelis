import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ConceptPanel from "./ConceptPanel";
import { SEED_DATASET } from "@/data/seed";
import type { Concept, KnowledgeDataset, Relationship, Source } from "@/domain/knowledge/types";

describe("ConceptPanel Knowledge Observatory", () => {
  it("renders selected concept title, domain classification, Level 1 overview, and Learn more link", () => {
    const rustConcept = SEED_DATASET.concepts.find((c) => c.slug === "rust")!;
    render(<ConceptPanel concept={rustConcept} dataset={SEED_DATASET} onSelectConcept={vi.fn()} />);

    expect(screen.getByRole("heading", { level: 2, name: "Rust" })).toBeDefined();
    expect(screen.getByText("programming languages")).toBeDefined();
    expect(
      screen.getByText(
        "A systems programming language that combines low-level hardware control with compile-time safety guarantees."
      )
    ).toBeDefined();

    // Enhanced 2-paragraph Level 1 overview
    const overviewContainer = screen.getByTestId("concept-overview");
    expect(overviewContainer).toBeDefined();
    expect(overviewContainer.textContent).toContain("Rust is a modern programming language");
    expect(overviewContainer.textContent).toContain("Rust solves this dilemma");

    // Level 1 -> Level 2 Learn more link
    const learnMoreLink = screen.getByTestId("learn-more-link");
    expect(learnMoreLink).toBeDefined();
    expect(learnMoreLink.getAttribute("href")).toBe("/lab/knowledge-reader/rust");
    expect(learnMoreLink.textContent).toContain("Learn more");
  });

  it("falls back to concept.description when no enhanced overview is present and omits learn more if no article exists", () => {
    const customConcept: Concept = {
      id: "concept-custom-fallback",
      slug: "custom-fallback",
      name: "Custom Fallback Concept",
      shortDescription: "Short summary.",
      description: "Fallback description paragraph.",
      domains: ["testing"],
      tags: [],
      sourceIds: [],
      reviewStatus: "reviewed",
    };
    render(<ConceptPanel concept={customConcept} dataset={SEED_DATASET} onSelectConcept={vi.fn()} />);

    expect(screen.getByText("Fallback description paragraph.")).toBeDefined();
    expect(screen.queryByTestId("concept-overview")).toBeNull();
    expect(screen.queryByTestId("learn-more-link")).toBeNull();
  });

  it("renders honest review status without inflated claims", () => {
    const rustConcept = SEED_DATASET.concepts.find((c) => c.slug === "rust")!;
    render(<ConceptPanel concept={rustConcept} dataset={SEED_DATASET} onSelectConcept={vi.fn()} />);

    const reviewBadge = screen.getByLabelText("Verification status: Reviewed");
    expect(reviewBadge).toBeDefined();
    expect(reviewBadge.textContent).toContain("Reviewed");
  });

  it("handles empty / no-selected-concept state gracefully", () => {
    render(<ConceptPanel concept={null} dataset={SEED_DATASET} onSelectConcept={vi.fn()} />);

    expect(screen.getByText("No concept selected.")).toBeDefined();
    expect(
      screen.getByText(
        "Select a celestial body in the universe to explore its knowledge connections."
      )
    ).toBeDefined();
  });

  it("renders accurate direct relationship count and connection elements", () => {
    const rustConcept = SEED_DATASET.concepts.find((c) => c.slug === "rust")!;
    render(<ConceptPanel concept={rustConcept} dataset={SEED_DATASET} onSelectConcept={vi.fn()} />);

    // Rust connects directly to Ownership and Memory in SEED_DATASET
    expect(screen.getByRole("heading", { level: 3, name: /Connections\s*\(2\)/i })).toBeDefined();
    expect(screen.getByText("Meaningful knowledge bridges")).toBeDefined();
    expect(
      screen.getByRole("button", { name: /Explore connected concept: Ownership/i })
    ).toBeDefined();
    expect(
      screen.getByRole("button", { name: /Explore connected concept: Memory/i })
    ).toBeDefined();
  });

  it("strictly preserves SOURCE → TARGET directional invariant for outgoing relationships", () => {
    const rustConcept = SEED_DATASET.concepts.find((c) => c.slug === "rust")!;
    const { container } = render(
      <ConceptPanel concept={rustConcept} dataset={SEED_DATASET} onSelectConcept={vi.fn()} />
    );

    // Rust --uses--> Ownership is outgoing from Rust
    expect(screen.getByText("uses")).toBeDefined();
    const pathNodes = container.querySelectorAll(`.${styles_connectionPath(container)}`);
    expect(pathNodes.length).toBeGreaterThan(0);

    // Check that Rust is source, Ownership is target
    const ownershipRow = screen
      .getByRole("button", { name: /Explore connected concept: Ownership/i })
      .closest("li")!;
    expect(ownershipRow.textContent).toContain("Rust");
    expect(ownershipRow.textContent).toContain("→");
    expect(ownershipRow.textContent).toContain("Ownership");
    expect(ownershipRow.textContent).toContain("outgoing");
  });

  it("strictly preserves SOURCE → TARGET directional invariant for incoming relationships", () => {
    const ownershipConcept = SEED_DATASET.concepts.find((c) => c.slug === "ownership")!;
    render(
      <ConceptPanel concept={ownershipConcept} dataset={SEED_DATASET} onSelectConcept={vi.fn()} />
    );

    // Rust --uses--> Ownership is incoming to Ownership
    const rustRow = screen
      .getByRole("button", { name: /Explore connected concept: Rust/i })
      .closest("li")!;
    expect(rustRow.textContent).toContain("Rust");
    expect(rustRow.textContent).toContain("→");
    expect(rustRow.textContent).toContain("Ownership");
    expect(rustRow.textContent).toContain("incoming");

    // Ownership --manages--> Memory is outgoing from Ownership
    const memoryRow = screen
      .getByRole("button", { name: /Explore connected concept: Memory/i })
      .closest("li")!;
    expect(memoryRow.textContent).toContain("Ownership");
    expect(memoryRow.textContent).toContain("→");
    expect(memoryRow.textContent).toContain("Memory");
    expect(memoryRow.textContent).toContain("outgoing");
  });

  it("calls onSelectConcept with the correct target slug when an exploration button is clicked", () => {
    const onSelectConcept = vi.fn();
    const rustConcept = SEED_DATASET.concepts.find((c) => c.slug === "rust")!;
    render(
      <ConceptPanel
        concept={rustConcept}
        dataset={SEED_DATASET}
        onSelectConcept={onSelectConcept}
      />
    );

    const exploreOwnership = screen.getByRole("button", {
      name: /Explore connected concept: Ownership/i,
    });
    fireEvent.click(exploreOwnership);

    expect(onSelectConcept).toHaveBeenCalledTimes(1);
    expect(onSelectConcept).toHaveBeenCalledWith("ownership");
  });

  it("orders relationships deterministically (primary strength first, then strong, then supporting; alphabetically by connected concept name)", () => {
    // Create a mock concept with multiple relationships of varying strengths
    const mockConcept: Concept = {
      id: "concept-test",
      slug: "test-concept",
      name: "Test Concept",
      shortDescription: "A concept for testing ordering.",
      domains: ["testing"],
      tags: [],
      sourceIds: [],
      reviewStatus: "reviewed",
    };

    const targetA: Concept = {
      id: "concept-a",
      slug: "concept-a",
      name: "Alpha Concept",
      shortDescription: "A",
      domains: [],
      tags: [],
      sourceIds: [],
      reviewStatus: "reviewed",
    };

    const targetB: Concept = {
      id: "concept-b",
      slug: "concept-b",
      name: "Beta Concept",
      shortDescription: "B",
      domains: [],
      tags: [],
      sourceIds: [],
      reviewStatus: "reviewed",
    };

    const targetC: Concept = {
      id: "concept-c",
      slug: "concept-c",
      name: "Gamma Concept",
      shortDescription: "C",
      domains: [],
      tags: [],
      sourceIds: [],
      reviewStatus: "reviewed",
    };

    const relSupporting: Relationship = {
      id: "rel-supp",
      sourceConceptId: "concept-test",
      targetConceptId: "concept-a",
      type: "related-to",
      explanation: "Supporting relationship to Alpha.",
      strength: "supporting",
      sourceIds: [],
      reviewStatus: "reviewed",
    };

    const relPrimary: Relationship = {
      id: "rel-prim",
      sourceConceptId: "concept-test",
      targetConceptId: "concept-c",
      type: "manages",
      explanation: "Primary relationship to Gamma.",
      strength: "primary",
      sourceIds: [],
      reviewStatus: "reviewed",
    };

    const relStrong: Relationship = {
      id: "rel-strong",
      sourceConceptId: "concept-test",
      targetConceptId: "concept-b",
      type: "uses",
      explanation: "Strong relationship to Beta.",
      strength: "strong",
      sourceIds: [],
      reviewStatus: "reviewed",
    };

    const customDataset: KnowledgeDataset = {
      concepts: [mockConcept, targetA, targetB, targetC],
      relationships: [relSupporting, relPrimary, relStrong],
      sources: [],
    };

    render(
      <ConceptPanel concept={mockConcept} dataset={customDataset} onSelectConcept={vi.fn()} />
    );

    const buttons = screen.getAllByRole("button", { name: /Explore connected concept:/i });
    expect(buttons).toHaveLength(3);
    // Primary first: Gamma Concept
    expect(buttons[0]!.textContent).toContain("Gamma Concept");
    // Strong second: Beta Concept
    expect(buttons[1]!.textContent).toContain("Beta Concept");
    // Supporting third: Alpha Concept
    expect(buttons[2]!.textContent).toContain("Alpha Concept");
  });

  it("handles missing linked concepts without crashing", () => {
    const mockConcept: Concept = {
      id: "concept-orphan-rel",
      slug: "orphan-rel",
      name: "Orphan Concept",
      shortDescription: "Has a relationship to a missing concept.",
      domains: ["testing"],
      tags: [],
      sourceIds: [],
      reviewStatus: "reviewed",
    };

    const brokenRel: Relationship = {
      id: "rel-broken",
      sourceConceptId: "concept-orphan-rel",
      targetConceptId: "concept-non-existent",
      type: "uses",
      explanation: "Points to non-existent target.",
      strength: "primary",
      sourceIds: [],
      reviewStatus: "reviewed",
    };

    const customDataset: KnowledgeDataset = {
      concepts: [mockConcept],
      relationships: [brokenRel],
      sources: [],
    };

    render(
      <ConceptPanel concept={mockConcept} dataset={customDataset} onSelectConcept={vi.fn()} />
    );

    expect(screen.getByRole("heading", { level: 2, name: "Orphan Concept" })).toBeDefined();
    // Broken relationship is skipped without crashing
    expect(screen.queryByRole("button", { name: /Explore connected concept:/i })).toBeNull();
  });

  it("handles concepts without sources without rendering a broken disclosure", () => {
    const mockConcept: Concept = {
      id: "concept-no-sources",
      slug: "no-sources",
      name: "No Sources Concept",
      shortDescription: "Has no linked bibliographic sources.",
      domains: ["testing"],
      tags: [],
      sourceIds: [],
      reviewStatus: "draft",
    };

    const customDataset: KnowledgeDataset = {
      concepts: [mockConcept],
      relationships: [],
      sources: [],
    };

    render(
      <ConceptPanel concept={mockConcept} dataset={customDataset} onSelectConcept={vi.fn()} />
    );

    expect(screen.queryByText(/Sources ·/i)).toBeNull();
  });

  it("renders sources with full bibliographic metadata and secure target=_blank attributes", () => {
    const rustConcept = SEED_DATASET.concepts.find((c) => c.slug === "rust")!;
    render(<ConceptPanel concept={rustConcept} dataset={SEED_DATASET} onSelectConcept={vi.fn()} />);

    expect(screen.getByText(/Sources · 1/i)).toBeDefined();
    expect(
      screen.getByRole("heading", { level: 4, name: "The Rust Programming Language" })
    ).toBeDefined();
    expect(screen.getByText(/The Rust Project/i)).toBeDefined();
    expect(screen.getByText(/Steve Klabnik/i)).toBeDefined();
    expect(screen.getByText("official documentation")).toBeDefined();
    expect(screen.getByText(/MIT \/ Apache-2.0 dual license/i)).toBeDefined();

    const link = screen.getByRole("link", {
      name: /Open source in new window: The Rust Programming Language/i,
    });
    expect(link.getAttribute("href")).toBe("https://doc.rust-lang.org/book/");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noreferrer");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("does not render active link for unsafe URL schemes (SEC-02)", () => {
    const maliciousSource: Source = {
      id: "source-evil",
      title: "Evil Script",
      url: "javascript:alert('xss')",
      publisher: "Attacker",
      type: "official-documentation",
    };
    const testConcept: Concept = {
      ...SEED_DATASET.concepts[0]!,
      id: "concept-test",
      slug: "test-sec",
      name: "Test Sec",
      sourceIds: ["source-evil"],
    };
    const dataset: KnowledgeDataset = {
      ...SEED_DATASET,
      concepts: [testConcept],
      sources: [maliciousSource],
    };
    render(<ConceptPanel concept={testConcept} dataset={dataset} onSelectConcept={vi.fn()} />);

    // Unsafe link should not be rendered with javascript: href
    expect(screen.queryByRole("link", { name: /Open source in new window: Evil Script/i })).toBeNull();
  });

  it("maintains assistive technologies live announcement region", () => {
    const rustConcept = SEED_DATASET.concepts.find((c) => c.slug === "rust")!;
    render(<ConceptPanel concept={rustConcept} dataset={SEED_DATASET} onSelectConcept={vi.fn()} />);

    const announcement = screen.getByText(/Selected concept: Rust\. 2 connected relationships\./i);
    expect(announcement).toBeDefined();
    expect(announcement.getAttribute("aria-live")).toBe("polite");
    expect(announcement.getAttribute("aria-atomic")).toBe("true");
  });

  it("resets scroll container scrollTop to 0 when selected concept changes", () => {
    const rustConcept = SEED_DATASET.concepts.find((c) => c.slug === "rust")!;
    const memoryConcept = SEED_DATASET.concepts.find((c) => c.slug === "memory")!;

    const { rerender, container } = render(
      <ConceptPanel concept={rustConcept} dataset={SEED_DATASET} onSelectConcept={vi.fn()} />
    );

    const scrollContainer =
      container.querySelector(".panelScroll") ||
      container.querySelector("div[class*='panelScroll']");
    expect(scrollContainer).toBeDefined();
    if (scrollContainer) {
      // Simulate user scrolling down
      scrollContainer.scrollTop = 350;
      expect(scrollContainer.scrollTop).toBe(350);
    }

    // Switch concept to Memory
    rerender(
      <ConceptPanel concept={memoryConcept} dataset={SEED_DATASET} onSelectConcept={vi.fn()} />
    );

    if (scrollContainer) {
      expect(scrollContainer.scrollTop).toBe(0);
    }
  });

  it("supports mobile compact state with toggle button and aria-expanded=false", () => {
    const rustConcept = SEED_DATASET.concepts.find((c) => c.slug === "rust")!;
    render(
      <ConceptPanel
        concept={rustConcept}
        dataset={SEED_DATASET}
        onSelectConcept={vi.fn()}
      />
    );

    const expandBtn = screen.getByRole("button", { name: /Expand to read full knowledge/i });
    expect(expandBtn).toBeDefined();
    expect(expandBtn.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByText("▲ Expand Reading")).toBeDefined();
  });

  it("toggles to expanded state when expand button is clicked", () => {
    const rustConcept = SEED_DATASET.concepts.find((c) => c.slug === "rust")!;
    render(
      <ConceptPanel
        concept={rustConcept}
        dataset={SEED_DATASET}
        onSelectConcept={vi.fn()}
      />
    );

    const expandBtn = screen.getByRole("button", { name: /Expand to read full knowledge/i });
    fireEvent.click(expandBtn);

    const collapseBtn = screen.getByRole("button", { name: /Collapse to compact exploration lens/i });
    expect(collapseBtn).toBeDefined();
    expect(collapseBtn.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("▼ Compact Universe")).toBeDefined();
  });

  it("collapses expanded state when Escape key is pressed", () => {
    const rustConcept = SEED_DATASET.concepts.find((c) => c.slug === "rust")!;
    render(
      <ConceptPanel
        concept={rustConcept}
        dataset={SEED_DATASET}
        onSelectConcept={vi.fn()}
      />
    );

    const expandBtn = screen.getByRole("button", { name: /Expand to read full knowledge/i });
    fireEvent.click(expandBtn);

    expect(screen.getByRole("button", { name: /Collapse to compact exploration lens/i })).toBeDefined();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.getByRole("button", { name: /Expand to read full knowledge/i })).toBeDefined();
  });

  it("renders mini celestial avatar orbs next to connected concepts", () => {
    const rustConcept = SEED_DATASET.concepts.find((c) => c.slug === "rust")!;
    const { container } = render(
      <ConceptPanel
        concept={rustConcept}
        dataset={SEED_DATASET}
        onSelectConcept={vi.fn()}
      />
    );

    const miniOrbs = container.querySelectorAll("[class*='celestialOrbMini']");
    expect(miniOrbs.length).toBeGreaterThan(0);
  });

  it("renders accessible desktop field extent slider and responds to change events", () => {
    const onWidthChange = vi.fn();
    const rustConcept = SEED_DATASET.concepts.find((c) => c.slug === "rust")!;
    render(
      <ConceptPanel
        concept={rustConcept}
        dataset={SEED_DATASET}
        onSelectConcept={vi.fn()}
        variant="anchored"
        fieldWidth={480}
        minFieldWidth={360}
        maxFieldWidth={700}
        onFieldWidthChange={onWidthChange}
      />
    );

    const slider = screen.getByRole("slider", { name: /Knowledge field extent/i });
    expect(slider).toBeDefined();
    expect(slider.getAttribute("aria-valuenow")).toBe("480");
    expect(slider.getAttribute("aria-valuemin")).toBe("360");
    expect(slider.getAttribute("aria-valuemax")).toBe("700");

    fireEvent.change(slider, { target: { value: "540" } });
    expect(onWidthChange).toHaveBeenCalledWith(540);
  });

  it("renders contour drag handle with slider role and responds to arrow keys", () => {
    const onWidthChange = vi.fn();
    const rustConcept = SEED_DATASET.concepts.find((c) => c.slug === "rust")!;
    render(
      <ConceptPanel
        concept={rustConcept}
        dataset={SEED_DATASET}
        onSelectConcept={vi.fn()}
        variant="anchored"
        fieldWidth={480}
        minFieldWidth={360}
        maxFieldWidth={700}
        onFieldWidthChange={onWidthChange}
      />
    );

    const dragHandle = screen.getByRole("slider", { name: /Knowledge field contour width/i });
    expect(dragHandle).toBeDefined();
    expect(dragHandle.getAttribute("aria-valuenow")).toBe("480");

    // ArrowLeft expands (+16)
    fireEvent.keyDown(dragHandle, { key: "ArrowLeft" });
    expect(onWidthChange).toHaveBeenCalledWith(496);

    // ArrowRight contracts (-16)
    fireEvent.keyDown(dragHandle, { key: "ArrowRight" });
    expect(onWidthChange).toHaveBeenCalledWith(464);

    // Home jumps to min (360)
    fireEvent.keyDown(dragHandle, { key: "Home" });
    expect(onWidthChange).toHaveBeenCalledWith(360);

    // End jumps to max (700)
    fireEvent.keyDown(dragHandle, { key: "End" });
    expect(onWidthChange).toHaveBeenCalledWith(700);
  });

  it("applies fieldWidth to panel container style", () => {
    const rustConcept = SEED_DATASET.concepts.find((c) => c.slug === "rust")!;
    const { container } = render(
      <ConceptPanel
        concept={rustConcept}
        dataset={SEED_DATASET}
        onSelectConcept={vi.fn()}
        variant="anchored"
        fieldWidth={520}
      />
    );

    const aside = container.querySelector("aside");
    expect(aside).toBeDefined();
    expect(aside?.style.width).toBe("520px");
  });

  it("renders return to root button with matching visible label and accessible name (WCAG 2.5.3)", () => {
    const nonRootConcept = SEED_DATASET.concepts.find((c) => c.slug !== "rust")!;
    render(
      <ConceptPanel
        concept={nonRootConcept}
        dataset={SEED_DATASET}
        onSelectConcept={vi.fn()}
      />
    );

    const returnBtn = screen.getByRole("button", { name: "Return to Universe Root" });
    expect(returnBtn).toBeDefined();
    expect(returnBtn.textContent).toContain("Return to Universe Root");
    expect(returnBtn.getAttribute("aria-label")).toBe("Return to Universe Root");
  });
});

// Helper to find connection path class name in rendered container
function styles_connectionPath(container: HTMLElement): string {
  const el = container.querySelector("[class*='connectionPath']");
  if (!el) return "connectionPath";
  return el.className.split(" ")[0] ?? "connectionPath";
}
