import { describe, expect, it, vi } from "vitest";
import { renderUniverseScene } from "./universe-renderer";
import type { UniverseNode, UniverseScene } from "../scene/types";
import { SEED_DATASET } from "@/data/seed";

function createMockContext(): CanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 40 })),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    fillStyle: "#ffffff",
    strokeStyle: "#ffffff",
    lineWidth: 1,
  } as unknown as CanvasRenderingContext2D;
}

describe("renderUniverseScene compositing and layer options", () => {
  const rustConcept = SEED_DATASET.concepts.find((c) => c.slug === "rust")!;
  const ownershipConcept = SEED_DATASET.concepts.find((c) => c.slug === "ownership")!;

  const focusNode: UniverseNode = {
    id: "concept-rust",
    slug: "rust",
    name: "Rust",
    concept: rustConcept,
    role: "focus",
    visualMass: 1,
    radius: 34,
    x: 0,
    y: 0,
    opacity: 1,
  };

  const primaryNode: UniverseNode = {
    id: "concept-ownership",
    slug: "ownership",
    name: "Ownership",
    concept: ownershipConcept,
    role: "primary",
    visualMass: 0.65,
    radius: 18,
    x: -120,
    y: 40,
    opacity: 1,
  };

  const scene: UniverseScene = {
    focus: focusNode,
    primaryNodes: [primaryNode],
    contextNodes: [],
    allNodes: [focusNode, primaryNode],
    relationships: [
      {
        id: "rel-1",
        sourceId: focusNode.id,
        targetId: primaryNode.id,
        type: "uses",
        explanation: "Rust uses ownership",
        strength: "primary",
        relationship: {
          id: "rel-1",
          sourceConceptId: focusNode.id,
          targetConceptId: primaryNode.id,
          type: "uses",
          explanation: "Rust uses ownership",
          strength: "primary",
          sourceIds: [],
          reviewStatus: "verified",
        },
        role: "focus-connection",
        curvature: 0.2,
        opacity: 0.8,
      },
    ],
    isMobile: false,
  };

  it("skips 2D background stars when skipBackgroundStars option is enabled", () => {
    const ctxNormal = createMockContext();
    renderUniverseScene(ctxNormal, 800, 600, { x: 0, y: 0, k: 1 }, scene, {
      skipBackgroundStars: false,
    });
    const arcCallsWithStars = (ctxNormal.arc as ReturnType<typeof vi.fn>).mock.calls.length;

    const ctxSkip = createMockContext();
    renderUniverseScene(ctxSkip, 800, 600, { x: 0, y: 0, k: 1 }, scene, {
      skipBackgroundStars: true,
    });
    const arcCallsWithoutStars = (ctxSkip.arc as ReturnType<typeof vi.fn>).mock.calls.length;

    // Skipping stars should result in significantly fewer arc calls
    expect(arcCallsWithoutStars).toBeLessThan(arcCallsWithStars);
    expect(arcCallsWithStars - arcCallsWithoutStars).toBeGreaterThanOrEqual(50);
  });

  it("punches out node circles with destination-out when skipBodyRendering is true", () => {
    const ctx = createMockContext();
    const gcoAssignments: string[] = [];

    Object.defineProperty(ctx, "globalCompositeOperation", {
      get() {
        return "source-over";
      },
      set(val: string) {
        gcoAssignments.push(val);
      },
      configurable: true,
    });

    renderUniverseScene(ctx, 800, 600, { x: 0, y: 0, k: 1 }, scene, {
      skipBodyRendering: true,
      skipBackgroundStars: true,
    });

    expect(gcoAssignments).toContain("destination-out");
  });
});
