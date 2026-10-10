import { describe, expect, it } from "vitest";
import { SEED_DATASET } from "@/data/seed";
import { buildLocalUniverseScene } from "./build-local-scene";
import { layoutLocalUniverseScene } from "./layout-local-scene";

describe("layoutLocalUniverseScene", () => {
  it("places focus node at the designated focal origin", () => {
    const scene = buildLocalUniverseScene({
      dataset: SEED_DATASET,
      focusSlug: "rust",
      isMobile: false,
    });

    const laidOut = layoutLocalUniverseScene(scene, {
      viewportWidth: 1280,
      viewportHeight: 800,
      isMobile: false,
      focalOffsetX: -100,
      focalOffsetY: 0,
    });

    expect(laidOut.focus.x).toBe(-100);
    expect(laidOut.focus.y).toBe(0);
  });

  it("places primary nodes on an orbital ring around the focus node", () => {
    const scene = buildLocalUniverseScene({
      dataset: SEED_DATASET,
      focusSlug: "ownership",
      isMobile: false,
    });

    const laidOut = layoutLocalUniverseScene(scene, {
      viewportWidth: 1280,
      viewportHeight: 800,
      isMobile: false,
      focalOffsetX: 0,
      focalOffsetY: 0,
    });

    for (const primary of laidOut.primaryNodes) {
      const dist = Math.hypot(primary.x - laidOut.focus.x, primary.y - laidOut.focus.y);
      // Primary ring radius should be around 180 - 240px
      expect(dist).toBeGreaterThanOrEqual(160);
      expect(dist).toBeLessThanOrEqual(250);
    }
  });

  it("places context nodes on an outer ring beyond the primary ring", () => {
    const scene = buildLocalUniverseScene({
      dataset: SEED_DATASET,
      focusSlug: "rust",
      isMobile: false,
    });

    const laidOut = layoutLocalUniverseScene(scene, {
      viewportWidth: 1280,
      viewportHeight: 800,
      isMobile: false,
    });

    expect(laidOut.contextNodes.length).toBeGreaterThan(0);
    for (const contextNode of laidOut.contextNodes) {
      const dist = Math.hypot(contextNode.x - laidOut.focus.x, contextNode.y - laidOut.focus.y);
      // Context ring should be distinctly further than primary ring (approx 280 - 380px)
      expect(dist).toBeGreaterThanOrEqual(280);
      expect(dist).toBeLessThanOrEqual(400);
    }
  });

  it("produces strictly deterministic coordinates across runs", () => {
    const scene1 = buildLocalUniverseScene({
      dataset: SEED_DATASET,
      focusSlug: "memory",
      isMobile: false,
    });
    const laidOut1 = layoutLocalUniverseScene(scene1, {
      viewportWidth: 1280,
      viewportHeight: 800,
      isMobile: false,
    });

    const scene2 = buildLocalUniverseScene({
      dataset: SEED_DATASET,
      focusSlug: "memory",
      isMobile: false,
    });
    const laidOut2 = layoutLocalUniverseScene(scene2, {
      viewportWidth: 1280,
      viewportHeight: 800,
      isMobile: false,
    });

    for (let i = 0; i < laidOut1.allNodes.length; i++) {
      const n1 = laidOut1.allNodes[i]!;
      const n2 = laidOut2.allNodes[i]!;
      expect(n1.x).toBeCloseTo(n2.x, 5);
      expect(n1.y).toBeCloseTo(n2.y, 5);
    }
  });

  it("contains no NaN, Infinity, or undefined coordinates", () => {
    const scene = buildLocalUniverseScene({
      dataset: SEED_DATASET,
      focusSlug: "operating-systems",
      isMobile: false,
    });

    const laidOut = layoutLocalUniverseScene(scene, {
      viewportWidth: 1280,
      viewportHeight: 800,
      isMobile: false,
    });

    for (const node of laidOut.allNodes) {
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
      expect(Number.isNaN(node.x)).toBe(false);
      expect(Number.isNaN(node.y)).toBe(false);
    }
  });

  it("maintains minimum physical clearance between all visible nodes", () => {
    const scene = buildLocalUniverseScene({
      dataset: SEED_DATASET,
      focusSlug: "memory",
      isMobile: false,
    });

    const laidOut = layoutLocalUniverseScene(scene, {
      viewportWidth: 1280,
      viewportHeight: 800,
      isMobile: false,
    });

    const nodes = laidOut.allNodes;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const ni = nodes[i]!;
        const nj = nodes[j]!;
        const dist = Math.hypot(ni.x - nj.x, ni.y - nj.y);
        const combinedRadii = ni.radius + nj.radius;
        // Nodes must not overlap and should maintain comfortable breathing room (>= 40px)
        expect(dist).toBeGreaterThan(combinedRadii + 30);
      }
    }
  });

  it("adapts layout geometry for mobile viewport", () => {
    const scene = buildLocalUniverseScene({
      dataset: SEED_DATASET,
      focusSlug: "rust",
      isMobile: true,
    });

    const laidOut = layoutLocalUniverseScene(scene, {
      viewportWidth: 375,
      viewportHeight: 812,
      isMobile: true,
    });

    // Mobile focal position centered or elevated slightly for bottom panel
    expect(laidOut.focus.x).toBe(0);

    // Radii on mobile should be more compact than desktop
    for (const primary of laidOut.primaryNodes) {
      const dist = Math.hypot(primary.x - laidOut.focus.x, primary.y - laidOut.focus.y);
      expect(dist).toBeGreaterThanOrEqual(100);
      expect(dist).toBeLessThanOrEqual(180);
    }
  });

  it("scales constellation radii proportionally with viewport dimensions", () => {
    const scene = buildLocalUniverseScene({
      dataset: SEED_DATASET,
      focusSlug: "ownership",
      isMobile: false,
    });

    const smallViewport = layoutLocalUniverseScene(scene, {
      viewportWidth: 800,
      viewportHeight: 600,
      isMobile: false,
    });

    const largeViewport = layoutLocalUniverseScene(scene, {
      viewportWidth: 1600,
      viewportHeight: 1200,
      isMobile: false,
    });

    const smallDist = Math.hypot(
      smallViewport.primaryNodes[0]!.x - smallViewport.focus.x,
      smallViewport.primaryNodes[0]!.y - smallViewport.focus.y
    );
    const largeDist = Math.hypot(
      largeViewport.primaryNodes[0]!.x - largeViewport.focus.x,
      largeViewport.primaryNodes[0]!.y - largeViewport.focus.y
    );

    expect(largeDist).toBeGreaterThan(smallDist);
  });

  it("uses asymmetric slot templates that avoid exact 180° opposition and mechanical symmetry", () => {
    const scene = buildLocalUniverseScene({
      dataset: SEED_DATASET,
      focusSlug: "ownership", // Has exactly 2 primary neighbors: rust & memory
      isMobile: false,
    });

    const laidOut = layoutLocalUniverseScene(scene, {
      viewportWidth: 1280,
      viewportHeight: 800,
      isMobile: false,
    });

    expect(laidOut.primaryNodes.length).toBe(2);
    const n1 = laidOut.primaryNodes[0]!;
    const n2 = laidOut.primaryNodes[1]!;

    const angle1 = Math.atan2(n1.y - laidOut.focus.y, n1.x - laidOut.focus.x);
    const angle2 = Math.atan2(n2.y - laidOut.focus.y, n2.x - laidOut.focus.x);
    let diff = Math.abs(angle1 - angle2);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;

    // Angle difference must NOT be exactly 180° (Math.PI)
    expect(Math.abs(diff - Math.PI)).toBeGreaterThan(0.12);
  });

  it("crossing desktop/mobile breakpoint dynamically changes scene budget and geometry", () => {
    const desktopScene = buildLocalUniverseScene({
      dataset: SEED_DATASET,
      focusSlug: "memory",
      isMobile: false,
    });
    const desktopLaidOut = layoutLocalUniverseScene(desktopScene, {
      viewportWidth: 1024,
      viewportHeight: 768,
      isMobile: false,
    });

    const mobileScene = buildLocalUniverseScene({
      dataset: SEED_DATASET,
      focusSlug: "memory",
      isMobile: true,
    });
    const mobileLaidOut = layoutLocalUniverseScene(mobileScene, {
      viewportWidth: 375,
      viewportHeight: 812,
      isMobile: true,
    });

    expect(desktopLaidOut.primaryNodes.length).toBeGreaterThanOrEqual(
      mobileLaidOut.primaryNodes.length
    );
    expect(desktopLaidOut.contextNodes.length).toBeGreaterThanOrEqual(
      mobileLaidOut.contextNodes.length
    );
    expect(mobileLaidOut.allNodes.length).toBeLessThanOrEqual(6);
    expect(desktopLaidOut.allNodes.length).toBeLessThanOrEqual(10);
    expect(mobileLaidOut.focus.x).toBe(0);
    expect(desktopLaidOut.focus.x).toBe(-100);
  });
});
