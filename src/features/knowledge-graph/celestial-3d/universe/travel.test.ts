import { describe, expect, it } from "vitest";
import {
  computeTravelOffsets,
  getConceptUniverseAnchor,
  TRAVEL_RATES,
  type UniverseTravelState,
} from "./travel";

describe("Universe Travel System", () => {
  it("computes deterministic concept universe anchors", () => {
    const anchorRust1 = getConceptUniverseAnchor("rust");
    const anchorRust2 = getConceptUniverseAnchor("rust");
    const anchorOwnership = getConceptUniverseAnchor("ownership");

    expect(anchorRust1).toEqual(anchorRust2);
    expect(anchorRust1).not.toEqual(anchorOwnership);

    // Anchors are bounded within [-50, 50]
    expect(Math.abs(anchorRust1.x)).toBeLessThanOrEqual(50);
    expect(Math.abs(anchorRust1.y)).toBeLessThanOrEqual(50);
    expect(Math.abs(anchorOwnership.x)).toBeLessThanOrEqual(50);
    expect(Math.abs(anchorOwnership.y)).toBeLessThanOrEqual(50);
  });

  it("returns zero travel offsets when travel state is null and reduced motion is off", () => {
    const offsets = computeTravelOffsets(null, false);
    expect(offsets.nebula).toEqual({ x: 0, y: 0 });
    expect(offsets.far).toEqual({ x: 0, y: 0 });
    expect(offsets.mid).toEqual({ x: 0, y: 0 });
    expect(offsets.bright).toEqual({ x: 0, y: 0 });
    expect(offsets.scale).toBe(1.0);
  });

  it("disables travel animation when prefers-reduced-motion is true", () => {
    const travel: UniverseTravelState = {
      active: true,
      progress: 0.5,
      directionX: 1,
      directionY: 0,
      distance: 300,
      fromSlug: "rust",
      toSlug: "ownership",
    };

    const offsets = computeTravelOffsets(travel, true);
    expect(offsets.scale).toBe(1.0);
    expect(offsets.nebula).toEqual({ x: 0, y: 0 });
    expect(offsets.far).toEqual({ x: 0, y: 0 });
    expect(offsets.mid).toEqual({ x: 0, y: 0 });
    expect(offsets.bright).toEqual({ x: 0, y: 0 });
  });

  it("enforces strict depth hierarchy during active travel", () => {
    const travel: UniverseTravelState = {
      active: true,
      progress: 0.5,
      directionX: 1,
      directionY: 0.5,
      distance: 350,
      fromSlug: "rust",
      toSlug: "ownership",
    };

    const offsets = computeTravelOffsets(travel, false);

    const magNebula = Math.hypot(offsets.nebula.x, offsets.nebula.y);
    const magFar = Math.hypot(offsets.far.x, offsets.far.y);
    const magMid = Math.hypot(offsets.mid.x, offsets.mid.y);
    const magBright = Math.hypot(offsets.bright.x, offsets.bright.y);

    // Nearer cosmic layers move more; far cosmic layers move less
    expect(magNebula).toBeLessThan(magFar);
    expect(magFar).toBeLessThan(magMid);
    expect(magMid).toBeLessThan(magBright);

    // Subtle push-through scale expansion at midpoint (~1.8%)
    expect(offsets.scale).toBeGreaterThan(1.01);
    expect(offsets.scale).toBeLessThanOrEqual(1.03);
  });

  it("settles cleanly when travel finishes (progress = 1.0)", () => {
    const travel: UniverseTravelState = {
      active: false,
      progress: 1.0,
      directionX: 1,
      directionY: 0,
      distance: 350,
      fromSlug: "rust",
      toSlug: "ownership",
    };

    const offsets = computeTravelOffsets(travel, false);

    // Scale returns smoothly to 1.0
    expect(offsets.scale).toBe(1.0);

    // Offsets settle strictly to the destination concept anchor
    const destAnchor = getConceptUniverseAnchor("ownership");
    expect(offsets.bright.x).toBeCloseTo(destAnchor.x * TRAVEL_RATES.bright, 4);
    expect(offsets.bright.y).toBeCloseTo(-destAnchor.y * TRAVEL_RATES.bright, 4);
  });

  it("produces deterministic results for identical inputs", () => {
    const travel: UniverseTravelState = {
      active: true,
      progress: 0.35,
      directionX: -0.707,
      directionY: 0.707,
      distance: 280,
      fromSlug: "memory",
      toSlug: "operating-systems",
    };

    const run1 = computeTravelOffsets(travel, false);
    const run2 = computeTravelOffsets(travel, false);

    expect(run1).toEqual(run2);
  });
});
