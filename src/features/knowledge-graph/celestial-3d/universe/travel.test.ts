import { describe, expect, it } from "vitest";
import {
  computeTravelOffsets,
  easeMonotonic,
  interpolateTravelOffset,
  TRAVEL_PARALLAX_RATES,
  type UniverseTravelState,
  ZERO_TRAVEL_OFFSETS,
} from "./travel";

describe("Universe Travel System", () => {
  describe("easeMonotonic", () => {
    it("maps boundary values correctly", () => {
      expect(easeMonotonic(0)).toBe(0);
      expect(easeMonotonic(1)).toBe(1);
      expect(easeMonotonic(-0.5)).toBe(0);
      expect(easeMonotonic(1.5)).toBe(1);
    });

    it("is strictly monotonic without bounce or overshoot", () => {
      const steps = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0];
      const values = steps.map(easeMonotonic);

      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThan(values[i - 1]!);
        expect(values[i]).toBeLessThanOrEqual(1.0);
      }
    });
  });

  describe("interpolateTravelOffset", () => {
    it("progresses monotonically from start to target without overshoot", () => {
      const start = { x: 0, y: 0 };
      const target = { x: 100, y: -50 };

      const atQuarter = interpolateTravelOffset(start, target, 0.25);
      const atHalf = interpolateTravelOffset(start, target, 0.5);
      const atThreeQuarters = interpolateTravelOffset(start, target, 0.75);
      const atEnd = interpolateTravelOffset(start, target, 1.0);

      expect(atQuarter.x).toBeGreaterThan(start.x);
      expect(atHalf.x).toBeGreaterThan(atQuarter.x);
      expect(atThreeQuarters.x).toBeGreaterThan(atHalf.x);
      expect(atEnd.x).toBeCloseTo(target.x, 5);

      expect(atQuarter.y).toBeLessThan(start.y);
      expect(atHalf.y).toBeLessThan(atQuarter.y);
      expect(atThreeQuarters.y).toBeLessThan(atHalf.y);
      expect(atEnd.y).toBeCloseTo(target.y, 5);
    });

    it("handles interrupted transitions seamlessly from current position", () => {
      const startA = { x: 0, y: 0 };
      const targetA = { x: 200, y: 100 };

      // Interrupt halfway through flight
      const midFlightPos = interpolateTravelOffset(startA, targetA, 0.5);
      const targetB = { x: -100, y: 50 };

      // New transition takes off immediately from midFlightPos
      const interruptStart = interpolateTravelOffset(midFlightPos, targetB, 0.0);
      expect(interruptStart.x).toBeCloseTo(midFlightPos.x, 5);
      expect(interruptStart.y).toBeCloseTo(midFlightPos.y, 5);

      const interruptSettled = interpolateTravelOffset(midFlightPos, targetB, 1.0);
      expect(interruptSettled.x).toBeCloseTo(targetB.x, 5);
      expect(interruptSettled.y).toBeCloseTo(targetB.y, 5);
    });

    it("supports coherent reverse navigation back to origin", () => {
      const origin = { x: 0, y: 0 };
      const step = { x: 120, y: -80 };

      // Forward flight A -> B
      const targetB = { x: origin.x + step.x, y: origin.y + step.y };
      const settledB = interpolateTravelOffset(origin, targetB, 1.0);

      // Reverse flight B -> A
      const targetA = { x: settledB.x - step.x, y: settledB.y - step.y };
      const settledA = interpolateTravelOffset(settledB, targetA, 1.0);

      expect(settledA.x).toBeCloseTo(origin.x, 5);
      expect(settledA.y).toBeCloseTo(origin.y, 5);
    });

    it("chains persistent offsets across multi-hop navigation (A -> B -> C)", () => {
      const offsetA = { x: 0, y: 0 };
      const stepAB = { x: -90, y: 40 };
      const stepBC = { x: -60, y: -70 };

      const offsetB = interpolateTravelOffset(
        offsetA,
        { x: offsetA.x + stepAB.x, y: offsetA.y + stepAB.y },
        1.0
      );
      const offsetC = interpolateTravelOffset(
        offsetB,
        { x: offsetB.x + stepBC.x, y: offsetB.y + stepBC.y },
        1.0
      );

      expect(offsetC.x).toBeCloseTo(stepAB.x + stepBC.x, 5);
      expect(offsetC.y).toBeCloseTo(stepAB.y + stepBC.y, 5);
    });
  });

  describe("computeTravelOffsets", () => {
    it("returns canonical zero offsets when travel state is null or undefined", () => {
      expect(computeTravelOffsets(null, false)).toEqual(ZERO_TRAVEL_OFFSETS);
      expect(computeTravelOffsets(undefined, false)).toEqual(ZERO_TRAVEL_OFFSETS);
    });

    it("disables travel animation when prefers-reduced-motion is true", () => {
      const travel: UniverseTravelState = {
        active: true,
        progress: 0.5,
        currentOffset: { x: 250, y: -150 },
      };

      expect(computeTravelOffsets(travel, true)).toEqual(ZERO_TRAVEL_OFFSETS);
    });

    it("strictly preserves depth hierarchy ordering (nebula < far < mid < bright)", () => {
      const travel: UniverseTravelState = {
        active: true,
        progress: 0.6,
        currentOffset: { x: 180, y: 120 },
      };

      const offsets = computeTravelOffsets(travel, false);

      const dNebula = Math.hypot(offsets.nebula.x, offsets.nebula.y);
      const dFar = Math.hypot(offsets.far.x, offsets.far.y);
      const dMid = Math.hypot(offsets.mid.x, offsets.mid.y);
      const dBright = Math.hypot(offsets.bright.x, offsets.bright.y);

      expect(dNebula).toBeLessThan(dFar);
      expect(dFar).toBeLessThan(dMid);
      expect(dMid).toBeLessThan(dBright);

      expect(TRAVEL_PARALLAX_RATES.nebula).toBeLessThan(TRAVEL_PARALLAX_RATES.far);
      expect(TRAVEL_PARALLAX_RATES.far).toBeLessThan(TRAVEL_PARALLAX_RATES.mid);
      expect(TRAVEL_PARALLAX_RATES.mid).toBeLessThan(TRAVEL_PARALLAX_RATES.bright);
    });

    it("verifies absence of midpoint scale pulse and surge peak", () => {
      const travelQuarter: UniverseTravelState = {
        active: true,
        progress: 0.25,
        currentOffset: { x: 50, y: 25 },
      };
      const travelMid: UniverseTravelState = {
        active: true,
        progress: 0.5,
        currentOffset: { x: 100, y: 50 },
      };
      const travelThreeQuarter: UniverseTravelState = {
        active: true,
        progress: 0.75,
        currentOffset: { x: 150, y: 75 },
      };

      const offQuarter = computeTravelOffsets(travelQuarter, false);
      const offMid = computeTravelOffsets(travelMid, false);
      const offThreeQuarter = computeTravelOffsets(travelThreeQuarter, false);

      // Offsets scale purely with coordinate displacement, monotonic progression
      expect(offMid.bright.x).toBeGreaterThan(offQuarter.bright.x);
      expect(offThreeQuarter.bright.x).toBeGreaterThan(offMid.bright.x);

      // Verify no 'scale' property exists on TravelOffsets interface
      expect("scale" in offMid).toBe(false);
    });

    it("computes deterministic offsets for identical states", () => {
      const travel: UniverseTravelState = {
        active: true,
        progress: 0.42,
        currentOffset: { x: -84.5, y: 122.3 },
      };

      const first = computeTravelOffsets(travel, false);
      const second = computeTravelOffsets(travel, false);

      expect(first).toEqual(second);
    });
  });
});
