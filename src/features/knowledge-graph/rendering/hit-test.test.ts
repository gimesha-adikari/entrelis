import { describe, expect, it } from "vitest";
import { SEED_DATASET } from "@/data/seed";
import { buildLocalUniverseScene } from "../scene/build-local-scene";
import { layoutLocalUniverseScene } from "../scene/layout-local-scene";
import { hitTestUniverseNode } from "./hit-test";

describe("hitTestUniverseNode", () => {
  const scene = layoutLocalUniverseScene(
    buildLocalUniverseScene({
      dataset: SEED_DATASET,
      focusSlug: "rust",
      isMobile: false,
    }),
    { focalOffsetX: 0, focalOffsetY: 0 }
  );

  const canvasRect = {
    left: 0,
    top: 0,
    width: 800,
    height: 600,
    right: 800,
    bottom: 600,
    x: 0,
    y: 0,
    toJSON: () => {},
  } as DOMRect;

  const transform = { x: 0, y: 0, k: 1 };

  it("detects click on focus node at origin", () => {
    // Focus node is at (0, 0) world, which corresponds to screen (400, 300)
    const hit = hitTestUniverseNode(scene, 400, 300, canvasRect, transform);
    expect(hit).toBeDefined();
    expect(hit?.slug).toBe("rust");
  });

  it("detects click on a primary neighbor within hit radius", () => {
    const primary = scene.primaryNodes[0]!;
    // World coordinates to screen coordinates
    const screenX = 400 + primary.x;
    const screenY = 300 + primary.y;

    const hit = hitTestUniverseNode(scene, screenX, screenY, canvasRect, transform);
    expect(hit).toBeDefined();
    expect(hit?.id).toBe(primary.id);
  });

  it("returns null when clicking empty space", () => {
    const hit = hitTestUniverseNode(scene, 50, 50, canvasRect, transform);
    expect(hit).toBeNull();
  });

  it("does not hit nodes that are not in the visible UniverseScene", () => {
    // In Rust focus scene, Operating Systems is not a visible node if not in scene.allNodes
    const nonVisibleSlug = "operating-systems";
    const isInScene = scene.allNodes.some((n) => n.slug === nonVisibleSlug);
    if (!isInScene) {
      // Coordinates of where it might be
      const hit = hitTestUniverseNode(scene, 700, 500, canvasRect, transform);
      expect(hit?.slug).not.toBe(nonVisibleSlug);
    }
  });

  it("takes camera zoom and pan transform into account", () => {
    const zoomedTransform = { x: 50, y: -20, k: 1.5 };
    // Focus node (0, 0) world is now at:
    // screenX = 400 + 50 + 0 * 1.5 = 450
    // screenY = 300 - 20 + 0 * 1.5 = 280
    const hit = hitTestUniverseNode(scene, 450, 280, canvasRect, zoomedTransform);
    expect(hit?.slug).toBe("rust");
  });
});
