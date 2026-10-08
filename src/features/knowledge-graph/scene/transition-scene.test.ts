import { describe, expect, it } from "vitest";
import { SEED_DATASET } from "@/data/seed";
import { buildLocalUniverseScene } from "./build-local-scene";
import { layoutLocalUniverseScene } from "./layout-local-scene";
import {
  interpolateScenes,
  easeOutCubic,
  smoothstep,
  roleToDepth,
  interpolateAngle,
  getNodeLabelPlacement,
  SCENE_TRANSITION_DURATION_MS,
} from "./transition-scene";

describe("transition-scene", () => {
  const sceneRust = layoutLocalUniverseScene(
    buildLocalUniverseScene({
      dataset: SEED_DATASET,
      focusSlug: "rust",
      isMobile: false,
    })
  );

  const sceneOwnership = layoutLocalUniverseScene(
    buildLocalUniverseScene({
      dataset: SEED_DATASET,
      focusSlug: "ownership",
      isMobile: false,
    })
  );

  const sceneMemory = layoutLocalUniverseScene(
    buildLocalUniverseScene({
      dataset: SEED_DATASET,
      focusSlug: "memory",
      isMobile: false,
    })
  );

  it("exports reasonable transition duration (350-500ms)", () => {
    expect(SCENE_TRANSITION_DURATION_MS).toBeGreaterThanOrEqual(350);
    expect(SCENE_TRANSITION_DURATION_MS).toBeLessThanOrEqual(500);
  });

  it("implements smooth easeOutCubic curve (0 at 0, 1 at 1, strictly increasing)", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
    expect(easeOutCubic(0.2)).toBeLessThan(easeOutCubic(0.8));
  });

  it("implements smoothstep curve with zero initial and terminal derivative", () => {
    expect(smoothstep(0)).toBe(0);
    expect(smoothstep(1)).toBe(1);
    expect(smoothstep(0.5)).toBe(0.5);
    // Smooth emergence: early progress should rise gently, not spike
    expect(smoothstep(0.1)).toBeCloseTo(0.028, 3);
    expect(smoothstep(0.25)).toBeCloseTo(0.156, 3);
  });

  it("interpolates angles across radians boundary using shortest path", () => {
    const angleClose = interpolateAngle(0.1, 0.5, 0.5);
    expect(angleClose).toBeCloseTo(0.3, 3);

    // Across 0 / 2pi boundary
    const angleWrap = interpolateAngle(0.1, 2 * Math.PI - 0.1, 0.5);
    // Shortest path goes backward from 0.1 towards -0.1 (which wraps to 2pi or 0)
    expect(Math.cos(angleWrap)).toBeGreaterThan(0.95);
  });

  it("computes canonical label placements with correct sector offsets and typography", () => {
    const focusPlacement = getNodeLabelPlacement(sceneRust.focus, false);
    expect(focusPlacement.alignment).toBe("center");
    expect(focusPlacement.baseline).toBe("top");
    expect(focusPlacement.fontSize).toBe(16);

    const primaryPlacement = getNodeLabelPlacement(sceneRust.primaryNodes[0]!, false);
    expect(primaryPlacement.fontSize).toBe(12);
  });

  it("interpolates persistent nodes between fromScene and toScene with continuous x, y, and z depth", () => {
    // Ownership is primary in sceneRust (z=6), focus in sceneOwnership (z=12)
    const midScene = interpolateScenes(sceneRust, sceneOwnership, 0.5);

    const ownershipFrom = sceneRust.allNodes.find((n) => n.slug === "ownership")!;
    const ownershipTo = sceneOwnership.focus;
    const ownershipMid = midScene.allNodes.find((n) => n.slug === "ownership")!;

    expect(ownershipMid).toBeDefined();
    // Midpoint x should be between from and to
    const minX = Math.min(ownershipFrom.x, ownershipTo.x);
    const maxX = Math.max(ownershipFrom.x, ownershipTo.x);
    expect(ownershipMid.x).toBeGreaterThanOrEqual(minX - 1);
    expect(ownershipMid.x).toBeLessThanOrEqual(maxX + 1);

    // Continuous z depth interpolation
    expect(ownershipMid.z).toBeDefined();
    expect(ownershipMid.z).toBeGreaterThan(roleToDepth("primary") - 0.1);
    expect(ownershipMid.z).toBeLessThan(roleToDepth("focus") + 0.1);
  });

  it("guarantees monotonic depth progression during focus promotion and demotion without pops", () => {
    // Test a fine sequence of progress steps
    const steps = [0, 0.2, 0.4, 0.5, 0.6, 0.8, 1.0];
    let prevOwnershipZ = 0;
    let prevRustZ = 100;

    for (const p of steps) {
      const scene = interpolateScenes(sceneRust, sceneOwnership, p);
      const ownership = scene.allNodes.find((n) => n.slug === "ownership")!;
      const rust = scene.allNodes.find((n) => n.slug === "rust")!;

      expect(Number.isFinite(ownership.z)).toBe(true);
      expect(Number.isFinite(rust.z)).toBe(true);

      // Ownership (incoming focus) should monotonically increase in z
      expect(ownership.z!).toBeGreaterThanOrEqual(prevOwnershipZ - 0.001);
      prevOwnershipZ = ownership.z!;

      // Rust (outgoing focus) should monotonically decrease in z
      expect(rust.z!).toBeLessThanOrEqual(prevRustZ + 0.001);
      prevRustZ = rust.z!;
    }
  });

  it("smoothly interpolates label coordinates and font sizes without discontinuities", () => {
    const scene25 = interpolateScenes(sceneRust, sceneOwnership, 0.25);
    const scene75 = interpolateScenes(sceneRust, sceneOwnership, 0.75);

    const own25 = scene25.allNodes.find((n) => n.slug === "ownership")!;
    const own75 = scene75.allNodes.find((n) => n.slug === "ownership")!;

    expect(own25.labelOffsetX).toBeDefined();
    expect(own25.labelOffsetY).toBeDefined();
    expect(own25.labelFontSize).toBeDefined();

    // Font size should grow continuously from primary (12px) toward focus (16px)
    expect(own25.labelFontSize!).toBeGreaterThanOrEqual(12);
    expect(own75.labelFontSize!).toBeGreaterThan(own25.labelFontSize!);
    expect(own75.labelFontSize!).toBeLessThanOrEqual(16);
  });

  it("subtly emerges entering nodes without sudden opacity spikes or negative opacity", () => {
    const scene25 = interpolateScenes(sceneRust, sceneOwnership, 0.25);
    const scene75 = interpolateScenes(sceneRust, sceneOwnership, 0.75);

    const rustIds = new Set(sceneRust.allNodes.map((n) => n.id));
    const newlyEntering = sceneOwnership.allNodes.filter((n) => !rustIds.has(n.id));

    for (const entrant of newlyEntering) {
      const n25 = scene25.allNodes.find((n) => n.id === entrant.id);
      const n75 = scene75.allNodes.find((n) => n.id === entrant.id);
      if (n25 && n75) {
        expect(n25.opacity).toBeGreaterThan(0);
        expect(n25.opacity).toBeLessThan(n75.opacity);
        expect(n75.opacity).toBeLessThanOrEqual(1.0);
        // Entering node scale starts at modest 75% and expands smoothly
        expect(n25.radius).toBeGreaterThan(entrant.radius * 0.7);
        expect(n75.radius).toBeGreaterThan(n25.radius);
      }
    }
  });

  it("gracefully fades and recedes departing nodes without duplicate focus roles", () => {
    const scene50 = interpolateScenes(sceneRust, sceneOwnership, 0.5);
    const sceneOwnershipIds = new Set(sceneOwnership.allNodes.map((n) => n.id));
    const departing = sceneRust.allNodes.filter((n) => !sceneOwnershipIds.has(n.id));

    for (const dep of departing) {
      const depNode = scene50.allNodes.find((n) => n.id === dep.id);
      if (depNode) {
        expect(depNode.opacity).toBeLessThan(dep.opacity);
        expect(depNode.opacity).toBeGreaterThanOrEqual(0);
        // Departing node must never hold the focus role
        expect(depNode.role).not.toBe("focus");
      }
    }

    // Invariant: at progress 0.5, exactly one focus node exists in the scene
    const focusNodes = scene50.allNodes.filter((n) => n.role === "focus");
    expect(focusNodes.length).toBe(1);
    expect(focusNodes[0]!.id).toBe(sceneOwnership.focus.id);
  });

  it("synchronizes relationship opacity with smoothstep curve and keeps endpoints attached", () => {
    const midScene = interpolateScenes(sceneRust, sceneOwnership, 0.5);
    const nodeIds = new Set(midScene.allNodes.map((n) => n.id));

    for (const rel of midScene.relationships) {
      expect(nodeIds.has(rel.sourceId)).toBe(true);
      expect(nodeIds.has(rel.targetId)).toBe(true);
      expect(rel.opacity).toBeGreaterThan(0);
      expect(rel.opacity).toBeLessThanOrEqual(1.0);
    }
  });

  it("handles rapid interruption starting seamlessly from an in-flight interpolated scene", () => {
    // Navigate Rust -> Ownership interrupted at progress 0.35
    const inFlightScene = interpolateScenes(sceneRust, sceneOwnership, 0.35);

    // New navigation begins from in-flight scene towards Memory
    const nextScene = interpolateScenes(inFlightScene, sceneMemory, 0.5);

    // Ownership was halfway between primary and focus; now transitioning toward its Memory role
    const ownership = nextScene.allNodes.find((n) => n.slug === "ownership");
    expect(ownership).toBeDefined();
    expect(Number.isFinite(ownership!.x)).toBe(true);
    expect(Number.isFinite(ownership!.y)).toBe(true);
    expect(Number.isFinite(ownership!.z)).toBe(true);
    expect(ownership!.opacity).toBeGreaterThan(0);
  });

  it("ensures all coordinates, radii, and depths are finite numbers (no NaN or Infinity)", () => {
    for (let progress = 0; progress <= 1; progress += 0.1) {
      const scene = interpolateScenes(sceneRust, sceneOwnership, progress);
      for (const node of scene.allNodes) {
        expect(Number.isFinite(node.x)).toBe(true);
        expect(Number.isFinite(node.y)).toBe(true);
        expect(Number.isFinite(node.z)).toBe(true);
        expect(Number.isFinite(node.radius)).toBe(true);
        expect(Number.isFinite(node.opacity)).toBe(true);
        expect(node.radius).toBeGreaterThan(0);
        expect(node.opacity).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("ensures no duplicate concept IDs exist in interpolated allNodes", () => {
    for (let progress = 0; progress <= 1; progress += 0.25) {
      const scene = interpolateScenes(sceneRust, sceneOwnership, progress);
      const seenIds = new Set<string>();
      for (const node of scene.allNodes) {
        expect(seenIds.has(node.id)).toBe(false);
        seenIds.add(node.id);
      }
    }
  });

  it("returns exact fromScene at progress = 0 and exact toScene at progress = 1", () => {
    const startScene = interpolateScenes(sceneRust, sceneOwnership, 0);
    expect(startScene).toBe(sceneRust);

    const endScene = interpolateScenes(sceneRust, sceneOwnership, 1);
    expect(endScene).toBe(sceneOwnership);
  });
});
