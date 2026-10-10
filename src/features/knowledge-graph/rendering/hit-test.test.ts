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

  it("uses CSS client coordinates consistently in desktop and mobile viewports", () => {
    for (const viewport of [
      { width: 1440, height: 900, isMobile: false, left: 17, top: 23 },
      { width: 390, height: 844, isMobile: true, left: 5, top: 11 },
    ]) {
      const viewportScene = layoutLocalUniverseScene(
        buildLocalUniverseScene({
          dataset: SEED_DATASET,
          focusSlug: "rust",
          isMobile: viewport.isMobile,
        }),
        {
          viewportWidth: viewport.width,
          viewportHeight: viewport.height,
          isMobile: viewport.isMobile,
        }
      );
      const primary = viewportScene.primaryNodes[0]!;
      const canvasRect = {
        left: viewport.left,
        top: viewport.top,
        width: viewport.width,
        height: viewport.height,
        right: viewport.left + viewport.width,
        bottom: viewport.top + viewport.height,
      } as DOMRect;
      const camera = { x: 37, y: -21, k: 1.7 };
      const clientX = viewport.left + viewport.width / 2 + camera.x + primary.x * camera.k;
      const clientY = viewport.top + viewport.height / 2 + camera.y + primary.y * camera.k;

      expect(hitTestUniverseNode(viewportScene, clientX, clientY, canvasRect, camera)?.id).toBe(
        primary.id
      );
    }
  });

  it("keeps WebGL body hit padding in CSS pixels across zoom, viewport, and DPR", () => {
    for (const viewport of [
      { width: 1440, height: 900, left: 17, top: 23, isMobile: false },
      { width: 390, height: 844, left: 5, top: 11, isMobile: true },
      { width: 320, height: 700, left: 0, top: 0, isMobile: true },
    ]) {
      const focus = { ...scene.focus, radius: viewport.isMobile ? 24 : 34, x: 0, y: 0 };
      const focusOnlyScene = {
        ...scene,
        focus,
        primaryNodes: [],
        contextNodes: [],
        allNodes: [focus],
      };

      for (const devicePixelRatio of [1, 2, 3]) {
        const backingWidth = viewport.width * devicePixelRatio;
        const backingHeight = viewport.height * devicePixelRatio;
        const cssWidth = backingWidth / devicePixelRatio;
        const cssHeight = backingHeight / devicePixelRatio;
        const canvasRect = {
          left: viewport.left,
          top: viewport.top,
          width: cssWidth,
          height: cssHeight,
          right: viewport.left + cssWidth,
          bottom: viewport.top + cssHeight,
        } as DOMRect;

        for (const k of [0.3, 0.6, 1, 3]) {
          const camera = { x: 19, y: -13, k };
          const centerX = viewport.left + canvasRect.width / 2 + camera.x + focus.x * camera.k;
          const centerY = viewport.top + canvasRect.height / 2 + camera.y + focus.y * camera.k;

          expect(
            hitTestUniverseNode(
              focusOnlyScene,
              centerX + focus.radius,
              centerY,
              canvasRect,
              camera,
              true
            )?.id,
            `visible body rim at ${viewport.width}px, DPR ${devicePixelRatio}, k=${k}`
          ).toBe(focus.id);
          expect(
            hitTestUniverseNode(
              focusOnlyScene,
              centerX + focus.radius + 11.5,
              centerY,
              canvasRect,
              camera,
              true
            )?.id,
            `within 12px padding at ${viewport.width}px, DPR ${devicePixelRatio}, k=${k}`
          ).toBe(focus.id);
          expect(
            hitTestUniverseNode(
              focusOnlyScene,
              centerX + focus.radius + 12.5,
              centerY,
              canvasRect,
              camera,
              true
            ),
            `outside 12px padding at ${viewport.width}px, DPR ${devicePixelRatio}, k=${k}`
          ).toBeNull();
        }
      }
    }
  });

  it("keeps Canvas fallback hit targets attached to zoomed Canvas bodies", () => {
    const focus = { ...scene.focus, radius: 34, x: 0, y: 0 };
    const focusOnlyScene = {
      ...scene,
      focus,
      primaryNodes: [],
      contextNodes: [],
      allNodes: [focus],
    };

    for (const k of [0.3, 0.6, 1, 3]) {
      const camera = { x: 0, y: 0, k };
      const centerX = canvasRect.width / 2;
      const centerY = canvasRect.height / 2;
      const fallbackHitRadius = Math.max(focus.radius + 12, 24) * k;

      expect(
        hitTestUniverseNode(
          focusOnlyScene,
          centerX + fallbackHitRadius - 0.1,
          centerY,
          canvasRect,
          camera
        )?.id
      ).toBe(focus.id);
      expect(
        hitTestUniverseNode(
          focusOnlyScene,
          centerX + fallbackHitRadius + 0.1,
          centerY,
          canvasRect,
          camera
        )
      ).toBeNull();
    }
  });
});
