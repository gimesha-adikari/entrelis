import { describe, expect, it } from "vitest";
import { SEED_DATASET } from "@/data/seed";
import { buildLocalUniverseScene } from "./build-local-scene";
import { layoutLocalUniverseScene } from "./layout-local-scene";
import { interpolateScenes, easeOutCubic, SCENE_TRANSITION_DURATION_MS } from "./transition-scene";

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

  it("interpolates persistent nodes between fromScene and toScene", () => {
    // Ownership is primary in sceneRust, focus in sceneOwnership
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
  });

  it("fades out departing nodes and fades in entering nodes", () => {
    const midScene = interpolateScenes(sceneRust, sceneOwnership, 0.5);

    // Any node entering sceneOwnership should have partial opacity
    for (const node of midScene.allNodes) {
      expect(node.opacity).toBeGreaterThan(0);
      expect(node.opacity).toBeLessThanOrEqual(1.0);
    }
  });

  it("returns exact toScene at progress = 1", () => {
    const finalScene = interpolateScenes(sceneRust, sceneOwnership, 1.0);
    expect(finalScene.focus.slug).toBe(sceneOwnership.focus.slug);
    expect(finalScene.focus.x).toBe(sceneOwnership.focus.x);
    expect(finalScene.focus.y).toBe(sceneOwnership.focus.y);
  });
});
