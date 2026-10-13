import { render, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import GraphCanvas from "./GraphCanvas";
import { createKnowledgeGraphIndex } from "../knowledge-index";
import { SEED_DATASET } from "@/data/seed";
import type { UniverseTravelState } from "../celestial-3d/universe";
import type { UniverseScene } from "../scene/types";

describe("GraphCanvas - Transition Cancellation & Settling (RN-01)", () => {
  const index = createKnowledgeGraphIndex(SEED_DATASET);

  beforeEach(() => {
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

  const getFiberHook = <T,>(canvas: HTMLCanvasElement, predicate: (val: unknown) => boolean): T | null => {
    const key = Object.keys(canvas).find((k) => k.startsWith("__reactFiber"))!;
    let fiber = (canvas as unknown as Record<string, unknown>)[key] as
      | { memoizedState?: unknown; return?: unknown }
      | undefined;
    while (fiber) {
      let state = fiber.memoizedState as
        | { memoizedState?: { current?: unknown }; next?: unknown }
        | undefined;
      while (state) {
        if (state.memoizedState && predicate(state.memoizedState.current)) {
          return state.memoizedState.current as T;
        }
        state = state.next as typeof state;
      }
      fiber = fiber.return as typeof fiber;
    }
    return null;
  };

  it("settles travel state and scene when user interacts via mouseDown during in-flight transition", () => {
    const { container, rerender } = render(
      <GraphCanvas
        dataset={SEED_DATASET}
        index={index}
        selectedConceptSlug="rust"
        onSelectConcept={() => {}}
      />
    );

    const canvas = container.querySelector("canvas")!;

    // Initial mount: rust is settled
    let travelState = getFiberHook<UniverseTravelState>(
      canvas,
      (val) => Boolean(val && typeof val === "object" && "fromSlug" in val)
    );
    expect(travelState?.active).toBe(false);
    expect(travelState?.toSlug).toBe("rust");

    // Trigger transition to ownership
    rerender(
      <GraphCanvas
        dataset={SEED_DATASET}
        index={index}
        selectedConceptSlug="ownership"
        onSelectConcept={() => {}}
      />
    );

    // Transition has started in background
    travelState = getFiberHook<UniverseTravelState>(
      canvas,
      (val) => Boolean(val && typeof val === "object" && "fromSlug" in val)
    );
    expect(travelState?.toSlug).toBe("ownership");

    // User interacts (mouse down to pan or drag) while transition is in-flight
    fireEvent.mouseDown(canvas, { clientX: 300, clientY: 200 });

    // Assert that travel state is settled cleanly rather than frozen mid-flight
    travelState = getFiberHook<UniverseTravelState>(
      canvas,
      (val) => Boolean(val && typeof val === "object" && "fromSlug" in val)
    );
    expect(travelState?.active).toBe(false);
    expect(travelState?.progress).toBe(1);

    const currentScene = getFiberHook<UniverseScene>(
      canvas,
      (val) => Boolean(val && typeof val === "object" && "focus" in val && "allNodes" in val)
    );
    expect(currentScene?.focus.slug).toBe("ownership");
  });

  it("settles travel state and scene when user interacts via wheel during in-flight transition", () => {
    const { container, rerender } = render(
      <GraphCanvas
        dataset={SEED_DATASET}
        index={index}
        selectedConceptSlug="rust"
        onSelectConcept={() => {}}
      />
    );

    const canvas = container.querySelector("canvas")!;

    rerender(
      <GraphCanvas
        dataset={SEED_DATASET}
        index={index}
        selectedConceptSlug="ownership"
        onSelectConcept={() => {}}
      />
    );

    // User scrolls wheel to zoom while transition is in flight
    fireEvent.wheel(canvas, { deltaY: -100, clientX: 400, clientY: 300 });

    const travelState = getFiberHook<UniverseTravelState>(
      canvas,
      (val) => Boolean(val && typeof val === "object" && "fromSlug" in val)
    );
    expect(travelState?.active).toBe(false);
    expect(travelState?.progress).toBe(1);

    const currentScene = getFiberHook<UniverseScene>(
      canvas,
      (val) => Boolean(val && typeof val === "object" && "focus" in val && "allNodes" in val)
    );
    expect(currentScene?.focus.slug).toBe("ownership");
  });

  it("settles travel state and scene when user interacts via touchStart during in-flight transition", () => {
    const { container, rerender } = render(
      <GraphCanvas
        dataset={SEED_DATASET}
        index={index}
        selectedConceptSlug="rust"
        onSelectConcept={() => {}}
      />
    );

    const canvas = container.querySelector("canvas")!;

    rerender(
      <GraphCanvas
        dataset={SEED_DATASET}
        index={index}
        selectedConceptSlug="ownership"
        onSelectConcept={() => {}}
      />
    );

    // User touches canvas while transition is in flight
    fireEvent.touchStart(canvas, {
      touches: [{ clientX: 200, clientY: 200 }],
    });

    const travelState = getFiberHook<UniverseTravelState>(
      canvas,
      (val) => Boolean(val && typeof val === "object" && "fromSlug" in val)
    );
    expect(travelState?.active).toBe(false);
    expect(travelState?.progress).toBe(1);

    const currentScene = getFiberHook<UniverseScene>(
      canvas,
      (val) => Boolean(val && typeof val === "object" && "focus" in val && "allNodes" in val)
    );
    expect(currentScene?.focus.slug).toBe("ownership");
  });
});
