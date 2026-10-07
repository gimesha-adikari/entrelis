import { describe, expect, it, vi } from "vitest";
import { SEED_DATASET } from "@/data/seed";
import { buildLocalUniverseScene } from "../scene/build-local-scene";
import { layoutLocalUniverseScene } from "../scene/layout-local-scene";
import type { UniverseScene } from "../scene/types";
import { renderUniverseScene } from "./universe-renderer";

function createMockContext(): CanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    clearRect: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    closePath: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 7 })),
    setLineDash: vi.fn(),
    createRadialGradient: vi.fn().mockReturnValue({
      addColorStop: vi.fn(),
    }),
    createLinearGradient: vi.fn().mockReturnValue({
      addColorStop: vi.fn(),
    }),
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

describe("renderUniverseScene", () => {
  const scene = layoutLocalUniverseScene(
    buildLocalUniverseScene({
      dataset: SEED_DATASET,
      focusSlug: "rust",
      isMobile: false,
    })
  );

  it("executes without errors on mock 2D canvas context", () => {
    const ctx = createMockContext();
    expect(() => {
      renderUniverseScene(ctx, 1280, 800, { x: 0, y: 0, k: 1 }, scene);
    }).not.toThrow();

    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 1280, 800);
    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.restore).toHaveBeenCalled();
  });

  it("draws quadratic curves for relationships", () => {
    const ctx = createMockContext();
    renderUniverseScene(ctx, 1280, 800, { x: 0, y: 0, k: 1 }, scene);

    expect(ctx.quadraticCurveTo).toHaveBeenCalled();
  });

  it("renders labels for visible focus and primary concepts", () => {
    const ctx = createMockContext();
    renderUniverseScene(ctx, 1280, 800, { x: 0, y: 0, k: 1 }, scene);

    expect(ctx.fillText).toHaveBeenCalledWith("Rust", expect.any(Number), expect.any(Number));
  });

  it("keeps labels and paths in Canvas while skipping 2D bodies for the WebGL layer", () => {
    const ctx = createMockContext();
    renderUniverseScene(ctx, 1280, 800, { x: 0, y: 0, k: 1 }, scene, {
      skipBodyRendering: true,
    });

    expect(ctx.fillText).toHaveBeenCalledWith("Rust", expect.any(Number), expect.any(Number));
    expect(ctx.arc).not.toHaveBeenCalledWith(
      scene.focus.x,
      scene.focus.y,
      scene.focus.radius,
      0,
      2 * Math.PI
    );
    expect(ctx.quadraticCurveTo).toHaveBeenCalled();
  });

  it("draws a visible ring for the keyboard-focused concept", () => {
    const ctx = createMockContext();
    const focusedNode = scene.primaryNodes[0]!;

    renderUniverseScene(ctx, 1280, 800, { x: 0, y: 0, k: 1 }, scene, {
      focusedNodeId: focusedNode.id,
      skipBodyRendering: true,
    });

    expect(ctx.arc).toHaveBeenCalledWith(
      focusedNode.x,
      focusedNode.y,
      focusedNode.radius + 6,
      0,
      2 * Math.PI
    );
  });

  it("keeps an edge label visible by placing it on the available side of its body", () => {
    const ctx = createMockContext();
    const edgeNode = {
      ...scene.primaryNodes[0]!,
      x: -140,
      y: 0,
      orbitalAngle: Math.PI,
    };
    const edgeScene: UniverseScene = {
      ...scene,
      primaryNodes: [edgeNode],
      contextNodes: [],
      allNodes: [scene.focus, edgeNode],
      relationships: [],
    };

    renderUniverseScene(ctx, 390, 844, { x: 0, y: 0, k: 1 }, edgeScene, {
      skipBodyRendering: true,
    });

    const labelCall = vi.mocked(ctx.fillText).mock.calls.find(([label]) => label === edgeNode.name);
    expect(labelCall?.[1]).toBeGreaterThan(edgeNode.x - edgeNode.radius - 8);
    expect(labelCall?.[1]).toBeLessThan(0);
  });
});
