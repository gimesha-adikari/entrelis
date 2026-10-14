import { describe, expect, it } from "vitest";
import { SEED_DATASET } from "@/data/seed";
import { buildLocalUniverseScene } from "../../scene/build-local-scene";
import { layoutLocalUniverseScene } from "../../scene/layout-local-scene";
import {
  calculateNavigationStep,
  computeTravelOffsets,
  easeMonotonic,
  getRememberedAnchor,
  interpolateTravelOffset,
  registerConceptAnchor,
  resolveDestinationAnchor,
  TRAVEL_PARALLAX_RATES,
  type ConceptAnchorMap,
  type ConceptSpatialAnchor,
  type UniverseTravelState,
  ZERO_TRAVEL_OFFSETS,
} from "./travel";

function createLaidOutScene(slug: string) {
  const scene = buildLocalUniverseScene({
    dataset: SEED_DATASET,
    focusSlug: slug,
    isMobile: false,
  });
  return layoutLocalUniverseScene(scene, {
    viewportWidth: 1280,
    viewportHeight: 800,
  });
}

describe("Universe Travel & Spatial Anchoring System", () => {
  describe("Mathematical Easing & Monotonicity", () => {
    it("maps boundary values correctly with zero overshoot", () => {
      expect(easeMonotonic(0)).toBe(0);
      expect(easeMonotonic(1)).toBe(1);
      expect(easeMonotonic(-0.25)).toBe(0);
      expect(easeMonotonic(1.25)).toBe(1);
    });

    it("progresses strictly monotonically without pulse, bounce, or scale", () => {
      const start = { x: 0, y: 0 };
      const target = { x: 160, y: -90 };
      const steps = [0.0, 0.25, 0.5, 0.75, 1.0];
      const offsets = steps.map((p) => interpolateTravelOffset(start, target, p));

      for (let i = 1; i < offsets.length; i++) {
        expect(offsets[i]!.x).toBeGreaterThan(offsets[i - 1]!.x);
        expect(offsets[i]!.y).toBeLessThan(offsets[i - 1]!.y);
      }

      expect(offsets[offsets.length - 1]!.x).toBeCloseTo(target.x, 5);
      expect(offsets[offsets.length - 1]!.y).toBeCloseTo(target.y, 5);

      const computed = computeTravelOffsets(
        { active: true, progress: 0.5, currentOffset: offsets[2]! },
        false
      );
      expect("scale" in computed).toBe(false);
    });
  });

  describe("Real Scene Spatial Consistency & Anchoring Regression", () => {
    const sceneRust = createLaidOutScene("rust");
    const sceneOwnership = createLaidOutScene("ownership");
    const sceneMemory = createLaidOutScene("memory");
    const sceneOS = createLaidOutScene("operating-systems");
    const sceneCPUs = createLaidOutScene("cpus");

    it("verifies asymmetric slot templates create raw geometric disparity", () => {
      const stepForward = calculateNavigationStep({
        fromSceneNodes: sceneRust.allNodes,
        toSceneNodes: sceneOwnership.allNodes,
        fromFocus: sceneRust.focus,
        toFocus: sceneOwnership.focus,
      });

      const stepBackward = calculateNavigationStep({
        fromSceneNodes: sceneOwnership.allNodes,
        toSceneNodes: sceneRust.allNodes,
        fromFocus: sceneOwnership.focus,
        toFocus: sceneRust.focus,
      });

      // Due to asymmetric slot angles, the raw backward step is not exactly the negative of forward
      const sumX = stepForward.x + stepBackward.x;
      const sumY = stepForward.y + stepBackward.y;
      expect(Math.abs(sumX) + Math.abs(sumY)).toBeGreaterThan(5);
    });

    it("returns exactly to original universe coordinate on Rust -> Ownership -> Rust", () => {
      const anchorMap: ConceptAnchorMap = new Map();
      const origin: ConceptSpatialAnchor = { x: 0, y: 0 };
      registerConceptAnchor(anchorMap, sceneRust.focus.id, origin, sceneRust.focus.slug);

      // Hop 1: Rust -> Ownership
      const stepForward = calculateNavigationStep({
        fromSceneNodes: sceneRust.allNodes,
        toSceneNodes: sceneOwnership.allNodes,
        fromFocus: sceneRust.focus,
        toFocus: sceneOwnership.focus,
      });
      const anchorOwnership = resolveDestinationAnchor({
        anchorMap,
        fromKey: sceneRust.focus.id,
        toKey: sceneOwnership.focus.id,
        fromSecondaryKey: sceneRust.focus.slug,
        toSecondaryKey: sceneOwnership.focus.slug,
        step: stepForward,
      });

      expect(anchorOwnership.x).not.toBe(0);
      expect(anchorOwnership.y).not.toBe(0);

      // Hop 2: Ownership -> Rust
      const stepBackward = calculateNavigationStep({
        fromSceneNodes: sceneOwnership.allNodes,
        toSceneNodes: sceneRust.allNodes,
        fromFocus: sceneOwnership.focus,
        toFocus: sceneRust.focus,
      });
      const returnAnchor = resolveDestinationAnchor({
        anchorMap,
        fromKey: sceneOwnership.focus.id,
        toKey: sceneRust.focus.id,
        fromSecondaryKey: sceneOwnership.focus.slug,
        toSecondaryKey: sceneRust.focus.slug,
        step: stepBackward,
      });

      // Spatial anchoring guarantees return to exact origin without drift
      expect(returnAnchor.x).toBe(0);
      expect(returnAnchor.y).toBe(0);
    });

    it("returns correctly on Ownership -> Memory -> Ownership", () => {
      const anchorMap: ConceptAnchorMap = new Map();
      registerConceptAnchor(anchorMap, sceneRust.focus.id, { x: 0, y: 0 }, sceneRust.focus.slug);

      const stepToOwn = calculateNavigationStep({
        fromSceneNodes: sceneRust.allNodes,
        toSceneNodes: sceneOwnership.allNodes,
        fromFocus: sceneRust.focus,
        toFocus: sceneOwnership.focus,
      });
      const anchorOwn = resolveDestinationAnchor({
        anchorMap,
        fromKey: sceneRust.focus.id,
        toKey: sceneOwnership.focus.id,
        step: stepToOwn,
      });

      // Forward: Ownership -> Memory
      const stepToMem = calculateNavigationStep({
        fromSceneNodes: sceneOwnership.allNodes,
        toSceneNodes: sceneMemory.allNodes,
        fromFocus: sceneOwnership.focus,
        toFocus: sceneMemory.focus,
      });
      const anchorMem = resolveDestinationAnchor({
        anchorMap,
        fromKey: sceneOwnership.focus.id,
        toKey: sceneMemory.focus.id,
        step: stepToMem,
      });

      expect(anchorMem).not.toEqual(anchorOwn);

      // Reverse: Memory -> Ownership
      const stepBackToOwn = calculateNavigationStep({
        fromSceneNodes: sceneMemory.allNodes,
        toSceneNodes: sceneOwnership.allNodes,
        fromFocus: sceneMemory.focus,
        toFocus: sceneOwnership.focus,
      });
      const returnedOwnAnchor = resolveDestinationAnchor({
        anchorMap,
        fromKey: sceneMemory.focus.id,
        toKey: sceneOwnership.focus.id,
        step: stepBackToOwn,
      });

      expect(returnedOwnAnchor.x).toBe(anchorOwn.x);
      expect(returnedOwnAnchor.y).toBe(anchorOwn.y);
    });

    it("reaches known coordinates on multi-hop cycles returning to visited concepts", () => {
      const anchorMap: ConceptAnchorMap = new Map();
      registerConceptAnchor(anchorMap, sceneRust.focus.id, { x: 0, y: 0 }, sceneRust.focus.slug);

      const tour = [
        { from: sceneRust, to: sceneOwnership },
        { from: sceneOwnership, to: sceneMemory },
        { from: sceneMemory, to: sceneOS },
        { from: sceneOS, to: sceneCPUs },
      ];

      for (const hop of tour) {
        const step = calculateNavigationStep({
          fromSceneNodes: hop.from.allNodes,
          toSceneNodes: hop.to.allNodes,
          fromFocus: hop.from.focus,
          toFocus: hop.to.focus,
        });
        resolveDestinationAnchor({
          anchorMap,
          fromKey: hop.from.focus.id,
          toKey: hop.to.focus.id,
          fromSecondaryKey: hop.from.focus.slug,
          toSecondaryKey: hop.to.focus.slug,
          step,
        });
      }

      const knownMemoryAnchor = getRememberedAnchor(
        anchorMap,
        sceneMemory.focus.id,
        sceneMemory.focus.slug
      );
      expect(knownMemoryAnchor).toBeDefined();

      // Hop from CPUs directly back to Memory
      const stepToMemory = calculateNavigationStep({
        fromSceneNodes: sceneCPUs.allNodes,
        toSceneNodes: sceneMemory.allNodes,
        fromFocus: sceneCPUs.focus,
        toFocus: sceneMemory.focus,
      });
      const resolvedMem = resolveDestinationAnchor({
        anchorMap,
        fromKey: sceneCPUs.focus.id,
        toKey: sceneMemory.focus.id,
        fromSecondaryKey: sceneCPUs.focus.slug,
        toSecondaryKey: sceneMemory.focus.slug,
        step: stepToMemory,
      });
      expect(resolvedMem).toEqual(knownMemoryAnchor);

      // Hop from Memory directly back to Rust
      const stepToRust = calculateNavigationStep({
        fromSceneNodes: sceneMemory.allNodes,
        toSceneNodes: sceneRust.allNodes,
        fromFocus: sceneMemory.focus,
        toFocus: sceneRust.focus,
      });
      const resolvedRust = resolveDestinationAnchor({
        anchorMap,
        fromKey: sceneMemory.focus.id,
        toKey: sceneRust.focus.id,
        fromSecondaryKey: sceneMemory.focus.slug,
        toSecondaryKey: sceneRust.focus.slug,
        step: stepToRust,
      });
      expect(resolvedRust.x).toBe(0);
      expect(resolvedRust.y).toBe(0);
    });

    it("preserves exact currently displayed background offset when interrupted", () => {
      const start = { x: 0, y: 0 };
      const targetA = { x: 180, y: 90 };

      // User interrupts flight halfway through
      const interruptedOffset = interpolateTravelOffset(start, targetA, 0.45);
      const targetB = { x: -70, y: 140 };

      // Transition smoothly takes off from interruptedOffset with zero snap
      const initialStep = interpolateTravelOffset(interruptedOffset, targetB, 0.0);
      expect(initialStep.x).toBeCloseTo(interruptedOffset.x, 5);
      expect(initialStep.y).toBeCloseTo(interruptedOffset.y, 5);

      const settledStep = interpolateTravelOffset(interruptedOffset, targetB, 1.0);
      expect(settledStep.x).toBeCloseTo(targetB.x, 5);
      expect(settledStep.y).toBeCloseTo(targetB.y, 5);
    });

    it("strictly preserves depth hierarchy ordering (nebula < far < mid < bright)", () => {
      const travel: UniverseTravelState = {
        active: true,
        progress: 0.6,
        currentOffset: { x: 200, y: 150 },
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

    it("disables animated travel when prefers-reduced-motion is true", () => {
      const travel: UniverseTravelState = {
        active: true,
        progress: 0.5,
        currentOffset: { x: 120, y: -80 },
      };

      expect(computeTravelOffsets(travel, true)).toEqual(ZERO_TRAVEL_OFFSETS);
      expect(computeTravelOffsets(null, false)).toEqual(ZERO_TRAVEL_OFFSETS);
    });
  });
});
