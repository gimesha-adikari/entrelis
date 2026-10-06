import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as THREE from "three";
import { createRingMesh } from "./rings";
import { createMoonGroup } from "./moons";
import { createDebrisGroup } from "./debris";
import { disposeAllCelestialTextures } from "../procedural/textures";

function setupCanvas2DMock() {
  const originalCreateElement = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
    if (tagName.toLowerCase() === "canvas") {
      const canvas = originalCreateElement("canvas");
      canvas.getContext = vi.fn().mockImplementation((contextId: string) => {
        if (contextId === "2d") {
          return {
            canvas,
            createImageData: (w: number, h: number) => ({
              width: w,
              height: h,
              data: new Uint8ClampedArray(w * h * 4),
            }),
            getImageData: (x: number, y: number, w: number, h: number) => ({
              width: w,
              height: h,
              data: new Uint8ClampedArray(w * h * 4),
            }),
            putImageData: vi.fn(),
            createRadialGradient: vi.fn().mockReturnValue({
              addColorStop: vi.fn(),
            }),
            createLinearGradient: vi.fn().mockReturnValue({
              addColorStop: vi.fn(),
            }),
            fillRect: vi.fn(),
            beginPath: vi.fn(),
            arc: vi.fn(),
            fill: vi.fn(),
            stroke: vi.fn(),
            clearRect: vi.fn(),
            save: vi.fn(),
            restore: vi.fn(),
          };
        }
        return null;
      });
      return canvas;
    }
    return originalCreateElement(tagName);
  });

  return () => {
    vi.restoreAllMocks();
  };
}

describe("Celestial 3D Attachments", () => {
  let restoreCanvas: () => void;

  beforeEach(() => {
    restoreCanvas = setupCanvas2DMock();
    disposeAllCelestialTextures();
  });

  afterEach(() => {
    disposeAllCelestialTextures();
    restoreCanvas();
  });

  it("creates a 3D ring mesh with procedural ring texture and depth testing", () => {
    const ringMesh = createRingMesh({
      innerRadius: 65,
      outerRadius: 105,
      tilt: 0.38,
      opacity: 0.85,
      style: "ice",
      seed: 55,
    });

    expect(ringMesh).toBeInstanceOf(THREE.Mesh);
    expect(ringMesh.geometry).toBeInstanceOf(THREE.RingGeometry);
    const mat = ringMesh.material as THREE.MeshStandardMaterial;
    expect(mat.transparent).toBe(true);
    expect(mat.side).toBe(THREE.DoubleSide);
    expect(mat.depthWrite).toBe(false);
    expect(mat.depthTest).toBe(true);

    ringMesh.geometry.dispose();
    mat.dispose();
  });

  it("creates a broken ring mesh with miniature debris chunks in the ring plane", () => {
    const brokenRing = createRingMesh({
      innerRadius: 65,
      outerRadius: 105,
      tilt: 0.38,
      opacity: 0.85,
      style: "broken",
      seed: 55,
    });

    expect(brokenRing).toBeInstanceOf(THREE.Mesh);
    expect(brokenRing.children.length).toBe(5); // 5 miniature irregular debris rock chunks
    for (const child of brokenRing.children) {
      expect(child).toBeInstanceOf(THREE.Mesh);
    }

    brokenRing.geometry.dispose();
    (brokenRing.material as THREE.Material).dispose();
  });

  it("creates a moon group with pivot and deterministic orbital phase", () => {
    const moon = createMoonGroup(
      {
        archetype: "ice",
        relativeRadius: 0.2,
        distance: 120,
        phase: 0.5,
        seed: 77,
        orbitalSpeed: 0.2,
      },
      50
    );

    expect(moon.pivot).toBeInstanceOf(THREE.Group);
    expect(moon.mesh).toBeInstanceOf(THREE.Mesh);
    expect(moon.mesh.position.x).toBe(120);

    // Verify orbit update advances angle
    const initialRot = moon.pivot.rotation.y;
    moon.update(1.0);
    expect(moon.pivot.rotation.y).toBeCloseTo(initialRot + 0.2, 5);

    moon.dispose();
  });

  it("creates a debris group with 2 to 5 miniature irregular fragments", () => {
    const debris = createDebrisGroup(
      {
        count: 4,
        seed: 88,
        minDistance: 70,
        maxDistance: 110,
        scale: 0.15,
      },
      50
    );

    expect(debris.group).toBeInstanceOf(THREE.Group);
    expect(debris.fragments.length).toBe(4);

    debris.dispose();
  });
});
