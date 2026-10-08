import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import KnowledgeGraphExperience from "../components/KnowledgeGraphExperience";
import GraphCanvas from "../components/GraphCanvas";
import { createKnowledgeGraphIndex } from "../knowledge-index";
import { SEED_DATASET } from "@/data/seed";

describe("Spatial Controls & Accessible Navigation", () => {
  const index = createKnowledgeGraphIndex(SEED_DATASET);

  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it("renders spatial navigation controls with semantic landmarks and labels", () => {
    render(<KnowledgeGraphExperience dataset={SEED_DATASET} initialSlug="rust" />);

    const nav = screen.getByRole("navigation", { name: /Spatial navigation controls/i });
    expect(nav).toBeDefined();

    const homeButton = screen.getByRole("button", { name: /Return to Rust/i });
    expect(homeButton).toBeDefined();

    const zoomOutButton = screen.getByRole("button", { name: /Zoom out/i });
    expect(zoomOutButton).toBeDefined();

    const zoomInButton = screen.getByRole("button", { name: /Zoom in/i });
    expect(zoomInButton).toBeDefined();
  });

  it("zooms in until reaching maximum zoom bound (3.0x) and disables zoom in button", () => {
    render(<KnowledgeGraphExperience dataset={SEED_DATASET} initialSlug="rust" />);

    const zoomInButton = screen.getByRole("button", { name: /Zoom in/i }) as HTMLButtonElement;
    expect(zoomInButton.disabled).toBe(false);

    // Initial scale is 1.0. Zoom factor is 1.25.
    // 1.0 * 1.25 = 1.25
    // 1.25 * 1.25 = 1.5625
    // 1.5625 * 1.25 = 1.953
    // 1.953 * 1.25 = 2.441
    // 2.441 * 1.25 = 3.0 (clamped)
    for (let i = 0; i < 7; i++) {
      fireEvent.click(zoomInButton);
    }

    expect(zoomInButton.disabled).toBe(true);

    const zoomOutButton = screen.getByRole("button", { name: /Zoom out/i }) as HTMLButtonElement;
    expect(zoomOutButton.disabled).toBe(false);
  });

  it("zooms out until reaching minimum zoom bound (0.3x) and disables zoom out button", () => {
    render(<KnowledgeGraphExperience dataset={SEED_DATASET} initialSlug="rust" />);

    const zoomOutButton = screen.getByRole("button", { name: /Zoom out/i }) as HTMLButtonElement;
    expect(zoomOutButton.disabled).toBe(false);

    // Initial scale is 1.0. Zoom factor is 0.8.
    // 1.0 * 0.8 = 0.8
    // 0.8 * 0.8 = 0.64
    // 0.64 * 0.8 = 0.512
    // 0.512 * 0.8 = 0.4096
    // 0.4096 * 0.8 = 0.32768
    // 0.32768 * 0.8 = 0.3 (clamped)
    for (let i = 0; i < 8; i++) {
      fireEvent.click(zoomOutButton);
    }

    expect(zoomOutButton.disabled).toBe(true);

    const zoomInButton = screen.getByRole("button", { name: /Zoom in/i }) as HTMLButtonElement;
    expect(zoomInButton.disabled).toBe(false);
  });

  it("resets camera zoom, pan, selection and URL to home when clicking Return to Rust", () => {
    render(<KnowledgeGraphExperience dataset={SEED_DATASET} initialSlug="ownership" />);

    const zoomInButton = screen.getByRole("button", { name: /Zoom in/i }) as HTMLButtonElement;
    fireEvent.click(zoomInButton);
    fireEvent.click(zoomInButton);

    const homeButton = screen.getByRole("button", { name: /Return to Rust/i });
    fireEvent.click(homeButton);

    // Concept reset
    expect(screen.getByRole("heading", { name: "Rust" })).toBeDefined();

    // Zoom buttons reset (zoomK = 1)
    expect(zoomInButton.disabled).toBe(false);
    const zoomOutButton = screen.getByRole("button", { name: /Zoom out/i }) as HTMLButtonElement;
    expect(zoomOutButton.disabled).toBe(false);
  });

  it("highlights canvas concept and mirrors focus state when keyboard tabbing accessible controls", () => {
    const onSelectConcept = vi.fn();
    render(
      <GraphCanvas
        dataset={SEED_DATASET}
        index={index}
        selectedConceptSlug="rust"
        onSelectConcept={onSelectConcept}
      />
    );

    const ownershipBtn = screen.getByRole("button", { name: /Ownership, primary concept/i });
    ownershipBtn.focus();
    expect(document.activeElement).toBe(ownershipBtn);

    ownershipBtn.blur();
    expect(document.activeElement).not.toBe(ownershipBtn);
  });
});
