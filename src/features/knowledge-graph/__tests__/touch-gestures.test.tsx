import { render, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import GraphCanvas from "../components/GraphCanvas";
import { SEED_DATASET } from "@/data/seed";
import * as hitTestModule from "../rendering/hit-test";
import type { UniverseNode } from "../scene/types";

describe("GraphCanvas Touch Gesture Engine", () => {
  const onSelectConcept = vi.fn();

  const mockOwnershipNode: UniverseNode = {
    id: "concept-ownership",
    slug: "ownership",
    name: "Ownership",
    concept: SEED_DATASET.concepts[1]!,
    role: "primary",
    visualMass: 0.65,
    radius: 14,
    x: 0,
    y: 0,
    opacity: 1,
  };

  beforeEach(() => {
    onSelectConcept.mockClear();
    vi.restoreAllMocks();
  });

  it("selects concept on short one-finger tap", () => {
    vi.spyOn(hitTestModule, "hitTestUniverseNode").mockReturnValue(mockOwnershipNode);

    const { container } = render(
      <GraphCanvas
        dataset={SEED_DATASET}
        selectedConceptSlug="rust"
        onSelectConcept={onSelectConcept}
      />
    );

    const canvas = container.querySelector("canvas")!;

    // Touch start at (100, 100)
    fireEvent.touchStart(canvas, {
      touches: [{ clientX: 100, clientY: 100 }],
    });

    // Touch end at (102, 101) - displacement < 8px
    fireEvent.touchEnd(canvas, {
      touches: [],
      changedTouches: [{ clientX: 102, clientY: 101 }],
    });

    expect(onSelectConcept).toHaveBeenCalledWith("ownership");
  });

  it("does not select concept on one-finger drag/pan", () => {
    vi.spyOn(hitTestModule, "hitTestUniverseNode").mockReturnValue(mockOwnershipNode);

    const { container } = render(
      <GraphCanvas
        dataset={SEED_DATASET}
        selectedConceptSlug="rust"
        onSelectConcept={onSelectConcept}
      />
    );

    const canvas = container.querySelector("canvas")!;

    // Touch start at (100, 100)
    fireEvent.touchStart(canvas, {
      touches: [{ clientX: 100, clientY: 100 }],
    });

    // Drag move to (150, 150)
    fireEvent.touchMove(canvas, {
      touches: [{ clientX: 150, clientY: 150 }],
    });

    // Touch end at (150, 150) - displacement 70px (> 8px)
    fireEvent.touchEnd(canvas, {
      touches: [],
      changedTouches: [{ clientX: 150, clientY: 150 }],
    });

    expect(onSelectConcept).not.toHaveBeenCalled();
  });

  it("does not select concept during or after two-touch pinch zoom", () => {
    vi.spyOn(hitTestModule, "hitTestUniverseNode").mockReturnValue(mockOwnershipNode);

    const { container } = render(
      <GraphCanvas
        dataset={SEED_DATASET}
        selectedConceptSlug="rust"
        onSelectConcept={onSelectConcept}
      />
    );

    const canvas = container.querySelector("canvas")!;

    // Two finger pinch start
    fireEvent.touchStart(canvas, {
      touches: [
        { clientX: 100, clientY: 100 },
        { clientX: 200, clientY: 200 },
      ],
    });

    // Two finger pinch move
    fireEvent.touchMove(canvas, {
      touches: [
        { clientX: 80, clientY: 80 },
        { clientX: 220, clientY: 220 },
      ],
    });

    // Touch end
    fireEvent.touchEnd(canvas, {
      touches: [],
      changedTouches: [{ clientX: 220, clientY: 220 }],
    });

    expect(onSelectConcept).not.toHaveBeenCalled();
  });

  it("safely resets gesture state on touch cancel", () => {
    vi.spyOn(hitTestModule, "hitTestUniverseNode").mockReturnValue(mockOwnershipNode);

    const { container } = render(
      <GraphCanvas
        dataset={SEED_DATASET}
        selectedConceptSlug="rust"
        onSelectConcept={onSelectConcept}
      />
    );

    const canvas = container.querySelector("canvas")!;

    // Touch start
    fireEvent.touchStart(canvas, {
      touches: [{ clientX: 100, clientY: 100 }],
    });

    // OS interrupts with touchCancel
    fireEvent.touchCancel(canvas);

    // Subsequent touchEnd does not trigger selection because state was reset
    fireEvent.touchEnd(canvas, {
      touches: [],
      changedTouches: [{ clientX: 100, clientY: 100 }],
    });

    expect(onSelectConcept).not.toHaveBeenCalled();
  });
});
