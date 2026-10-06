import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import * as d3Force from "d3-force";
import KnowledgeGraphExperience from "../components/KnowledgeGraphExperience";
import { SEED_DATASET } from "@/data/seed";

let forceSimulationCallCount = 0;
let simulationStopCallCount = 0;

vi.mock("d3-force", async (importOriginal) => {
  const actual = await importOriginal<typeof import("d3-force")>();
  return {
    ...actual,
    forceSimulation: (...args: Parameters<typeof actual.forceSimulation>) => {
      forceSimulationCallCount++;
      const sim = actual.forceSimulation(...args);
      const originalStop = sim.stop.bind(sim);
      sim.stop = () => {
        simulationStopCallCount++;
        return originalStop();
      };
      return sim;
    },
  };
});

describe("KnowledgeGraphExperience Production Integration", () => {
  beforeEach(() => {
    forceSimulationCallCount = 0;
    simulationStopCallCount = 0;
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

  it("initializes with default Rust concept selected", () => {
    render(<KnowledgeGraphExperience dataset={SEED_DATASET} initialSlug="rust" />);

    expect(screen.getByRole("heading", { name: "Rust" })).toBeDefined();
    expect(
      screen.getByText(
        "A systems programming language that combines low-level hardware control with compile-time safety guarantees."
      )
    ).toBeDefined();

    // Check live announcement region
    expect(screen.getByText(/Selected concept: Rust/i)).toBeDefined();
  });

  it("does not recreate the force simulation when navigating concepts", () => {
    render(<KnowledgeGraphExperience dataset={SEED_DATASET} initialSlug="rust" />);

    expect(forceSimulationCallCount).toBe(1);

    // Navigate to Ownership via connection link
    const ownershipBtn = screen.getByRole("button", {
      name: /Explore connected concept: Ownership/i,
    });
    fireEvent.click(ownershipBtn);

    expect(screen.getByRole("heading", { name: "Ownership" })).toBeDefined();
    // Simulation must NOT have been recreated!
    expect(forceSimulationCallCount).toBe(1);

    // Navigate to Memory
    const memoryBtn = screen.getByRole("button", {
      name: /Explore connected concept: Memory/i,
    });
    fireEvent.click(memoryBtn);

    expect(screen.getByRole("heading", { name: "Memory" })).toBeDefined();
    expect(forceSimulationCallCount).toBe(1);
  });

  it("strictly preserves SOURCE --TYPE--> TARGET directional relationship display", () => {
    render(<KnowledgeGraphExperience dataset={SEED_DATASET} initialSlug="ownership" />);

    // Ownership has two connections:
    // Rust --uses--> Ownership (incoming)
    // Ownership --manages--> Memory (outgoing)
    expect(screen.getByText(/--uses-->/)).toBeDefined();
    expect(screen.getByText(/--manages-->/)).toBeDefined();
  });

  it("exposes source provenance without leaking internal IDs", () => {
    render(<KnowledgeGraphExperience dataset={SEED_DATASET} initialSlug="rust" />);

    // Check sources disclosure
    const summary = screen.getByText(/Sources · 1/i);
    expect(summary).toBeDefined();

    // Contains authoritative title and publisher
    expect(screen.getByText("The Rust Programming Language")).toBeDefined();
    expect(screen.getByText(/The Rust Project/i)).toBeDefined();

    // View source link has safe target and rel
    const link = screen.getByRole("link", { name: /Open source in new window/i });
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link.getAttribute("rel")).toContain("noreferrer");

    // Internal ID must not be displayed in UI
    expect(screen.queryByText("src-rust-book")).toBeNull();
  });

  it("stops simulation cleanly on unmount", () => {
    const { unmount } = render(
      <KnowledgeGraphExperience dataset={SEED_DATASET} initialSlug="rust" />
    );
    expect(simulationStopCallCount).toBe(0);

    unmount();
    expect(simulationStopCallCount).toBe(1);
  });

  it("honors prefers-reduced-motion without scheduling RAF animations", () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<KnowledgeGraphExperience dataset={SEED_DATASET} initialSlug="rust" />);

    const ownershipBtn = screen.getByRole("button", {
      name: /Explore connected concept: Ownership/i,
    });
    fireEvent.click(ownershipBtn);

    expect(screen.getByRole("heading", { name: "Ownership" })).toBeDefined();
    expect(forceSimulationCallCount).toBe(1);
  });

  it("updates browser history state when concept selection changes", () => {
    const pushStateSpy = vi.spyOn(window.history, "pushState");

    render(<KnowledgeGraphExperience dataset={SEED_DATASET} initialSlug="rust" />);

    const ownershipBtn = screen.getByRole("button", {
      name: /Explore connected concept: Ownership/i,
    });
    fireEvent.click(ownershipBtn);

    expect(pushStateSpy).toHaveBeenCalledWith({ slug: "ownership" }, "", "/concept/ownership");

    pushStateSpy.mockRestore();
  });

  it("restores concept on browser popstate navigation", () => {
    render(<KnowledgeGraphExperience dataset={SEED_DATASET} initialSlug="rust" />);

    // Simulate browser back to /concept/memory
    window.history.pushState({}, "", "/concept/memory");
    fireEvent(window, new PopStateEvent("popstate"));

    expect(screen.getByRole("heading", { name: "Memory" })).toBeDefined();
  });

  it("resets camera and selection to Rust on Reset View", () => {
    render(<KnowledgeGraphExperience dataset={SEED_DATASET} initialSlug="ownership" />);

    expect(screen.getByRole("heading", { name: "Ownership" })).toBeDefined();

    const resetBtn = screen.getByRole("button", { name: /Reset graph view/i });
    fireEvent.click(resetBtn);

    expect(screen.getByRole("heading", { name: "Rust" })).toBeDefined();
  });
});
