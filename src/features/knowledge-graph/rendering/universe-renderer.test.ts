import { describe, expect, it, vi } from "vitest";
import { SEED_DATASET } from "@/data/seed";
import { buildLocalUniverseScene } from "../scene/build-local-scene";
import { layoutLocalUniverseScene } from "../scene/layout-local-scene";
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
});
