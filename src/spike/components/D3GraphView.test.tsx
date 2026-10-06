import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import D3GraphView from "./D3GraphView";
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

describe("D3GraphView Lifecycle and Interaction", () => {
  beforeEach(() => {
    forceSimulationCallCount = 0;
    simulationStopCallCount = 0;
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

  it("renders the canvas, accessible navigation, and controls", () => {
    const { container } = render(<D3GraphView dataset={SEED_DATASET} />);

    expect(container.querySelector("canvas")).toBeDefined();
    expect(screen.getByRole("navigation", { name: "Accessible Concept Navigator" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Reset View" })).toBeDefined();
    expect(screen.getByText("Rust")).toBeDefined();
  });

  it("does not recreate the force simulation when selection changes", () => {
    render(<D3GraphView dataset={SEED_DATASET} />);

    expect(forceSimulationCallCount).toBe(1);

    const rustButton = screen.getByRole("button", { name: "Rust" });
    fireEvent.click(rustButton);

    // Concept details are updated
    expect(screen.getByRole("heading", { name: "Rust" })).toBeDefined();
    expect(rustButton.getAttribute("aria-pressed")).toBe("true");

    // Force simulation must NOT be recreated on selection change
    expect(forceSimulationCallCount).toBe(1);

    const memoryButton = screen.getByRole("button", { name: "Memory" });
    fireEvent.click(memoryButton);

    expect(screen.getByRole("heading", { name: "Memory" })).toBeDefined();
    expect(memoryButton.getAttribute("aria-pressed")).toBe("true");

    // Still exactly 1 call
    expect(forceSimulationCallCount).toBe(1);
  });

  it("stops simulation cleanly on unmount", () => {
    const { unmount } = render(<D3GraphView dataset={SEED_DATASET} />);
    expect(simulationStopCallCount).toBe(0);

    unmount();
    expect(simulationStopCallCount).toBe(1);
  });

  it("honors prefers-reduced-motion when selecting concepts", () => {
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

    render(<D3GraphView dataset={SEED_DATASET} />);

    const rustButton = screen.getByRole("button", { name: "Rust" });
    fireEvent.click(rustButton);

    expect(screen.getByRole("heading", { name: "Rust" })).toBeDefined();
    expect(forceSimulationCallCount).toBe(1);
  });
});
