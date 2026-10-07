import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { UniverseScene } from "./UniverseScene";
import type { ViewportTransform } from "../../types";
import type { UniverseTravelState } from "./travel";

function createMockRenderer(): THREE.WebGLRenderer {
  return {
    render: vi.fn(),
    setSize: vi.fn(),
    setPixelRatio: vi.fn(),
    getPixelRatio: vi.fn(() => 1),
  } as unknown as THREE.WebGLRenderer;
}

describe("UniverseScene", () => {
  it("initializes background shader and star layers into scene", () => {
    const universe = new UniverseScene({
      width: 1280,
      height: 800,
      isMobile: false,
      pixelRatio: 1,
      prefersReducedMotion: false,
    });

    expect(universe.scene).toBeInstanceOf(THREE.Scene);
    // At minimum: background quad + 3 star layers = 4 objects
    expect(universe.scene.children.length).toBeGreaterThanOrEqual(4);

    universe.dispose();
  });

  it("updates parallax offsets deterministically from ViewportTransform", () => {
    const universe = new UniverseScene({
      width: 1280,
      height: 800,
      isMobile: false,
      pixelRatio: 1,
      prefersReducedMotion: false,
    });

    const transform: ViewportTransform = { x: 100, y: -50, k: 1.2 };
    universe.update(0.033, 1.0, transform);

    const offsets = universe.getParallaxOffsets();
    expect(offsets.far.x).toBeCloseTo(100 * 0.04, 1);
    expect(offsets.far.y).toBeCloseTo(50 * 0.04, 1);
    expect(offsets.mid.x).toBeCloseTo(100 * 0.08, 1);
    expect(offsets.bright.x).toBeCloseTo(100 * 0.14, 1);

    // Far movement should be strictly less than bright movement
    expect(Math.abs(offsets.far.x)).toBeLessThan(Math.abs(offsets.bright.x));

    universe.dispose();
  });

  it("applies selection travel displacement with ordered depth hierarchy", () => {
    const universe = new UniverseScene({
      width: 1280,
      height: 800,
      isMobile: false,
      pixelRatio: 1,
      prefersReducedMotion: false,
    });

    const transform: ViewportTransform = { x: 0, y: 0, k: 1.0 };
    const travel: UniverseTravelState = {
      active: true,
      progress: 0.5,
      directionX: 1,
      directionY: 0,
      distance: 350,
      fromSlug: "rust",
      toSlug: "ownership",
    };

    universe.update(0.033, 1.0, transform, travel);
    const travelOffsets = universe.getTravelOffsets();

    // Baseline parallax is zero because transform is (0, 0)
    expect(universe.getParallaxOffsets().bright.x).toBe(0);

    // Travel offsets exhibit ordered depth response
    const magNeb = Math.hypot(travelOffsets.nebula.x, travelOffsets.nebula.y);
    const magFar = Math.hypot(travelOffsets.far.x, travelOffsets.far.y);
    const magMid = Math.hypot(travelOffsets.mid.x, travelOffsets.mid.y);
    const magBright = Math.hypot(travelOffsets.bright.x, travelOffsets.bright.y);

    expect(magNeb).toBeLessThan(magFar);
    expect(magFar).toBeLessThan(magMid);
    expect(magMid).toBeLessThan(magBright);
    expect(travelOffsets.scale).toBeGreaterThan(1.01);

    universe.dispose();
  });

  it("freezes motion when prefersReducedMotion is enabled", () => {
    const universe = new UniverseScene({
      width: 1280,
      height: 800,
      isMobile: false,
      pixelRatio: 1,
      prefersReducedMotion: true,
    });

    const travel: UniverseTravelState = {
      active: true,
      progress: 0.5,
      directionX: 1,
      directionY: 0,
      distance: 350,
      fromSlug: "rust",
      toSlug: "ownership",
    };

    universe.update(0.033, 1.0, { x: 0, y: 0, k: 1 }, travel);
    expect(universe.motionStrength).toBe(0.0);
    expect(universe.getTravelOffsets().scale).toBe(1.0);
    expect(universe.getTravelOffsets().bright).toEqual({ x: 0, y: 0 });

    universe.setPrefersReducedMotion(false);
    universe.update(0.033, 1.0, { x: 0, y: 0, k: 1 });
    expect(universe.motionStrength).toBe(1.0);

    universe.dispose();
  });

  it("updates camera and background sizing on resize", () => {
    const universe = new UniverseScene({
      width: 800,
      height: 600,
      isMobile: false,
      pixelRatio: 1,
      prefersReducedMotion: false,
    });

    universe.resize(1920, 1080, 2);
    expect(universe.camera.left).toBe(-960);
    expect(universe.camera.right).toBe(960);
    expect(universe.camera.top).toBe(540);
    expect(universe.camera.bottom).toBe(-540);

    universe.dispose();
  });

  it("renders through shared WebGLRenderer", () => {
    const universe = new UniverseScene({
      width: 800,
      height: 600,
      isMobile: false,
      pixelRatio: 1,
      prefersReducedMotion: false,
    });

    const mockRenderer = createMockRenderer();
    universe.render(mockRenderer);

    expect(mockRenderer.render).toHaveBeenCalledWith(universe.scene, universe.camera);
    universe.dispose();
  });

  it("disposes geometry and material resources without errors", () => {
    const universe = new UniverseScene({
      width: 800,
      height: 600,
      isMobile: false,
      pixelRatio: 1,
      prefersReducedMotion: false,
    });

    expect(() => universe.dispose()).not.toThrow();
    expect(universe.scene.children.length).toBe(0);
  });
});
