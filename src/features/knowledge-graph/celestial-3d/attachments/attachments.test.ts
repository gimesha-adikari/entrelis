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

  it("creates a debris group with 3 to 7 miniature irregular fragments", () => {
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
    expect(debris.fragments.length).toBeGreaterThanOrEqual(3);
    expect(debris.fragments.length).toBeLessThanOrEqual(7);

    debris.dispose();
  });

  it("scales fragment count by LOD while keeping it sparse", () => {
    const config = { count: 4, seed: 88, minDistance: 68, maxDistance: 81, scale: 0.12 };
    const context = createDebrisGroup(config, 50, "context");
    const primary = createDebrisGroup(config, 50, "primary");
    const focus = createDebrisGroup(config, 50, "focus");
    const tooFew = createDebrisGroup({ ...config, count: 1 }, 50, "primary");
    const tooMany = createDebrisGroup({ ...config, count: 12 }, 50, "primary");

    expect(context.fragments.length).toBeGreaterThanOrEqual(3);
    expect(context.fragments.length).toBeLessThan(primary.fragments.length);
    expect(focus.fragments.length).toBeGreaterThan(primary.fragments.length);
    expect(focus.fragments.length).toBeLessThanOrEqual(7);
    expect(tooFew.fragments).toHaveLength(3);
    expect(tooMany.fragments).toHaveLength(7);

    context.dispose();
    primary.dispose();
    focus.dispose();
    tooFew.dispose();
    tooMany.dispose();
  });

  it("creates deterministic irregular fragments and scales their field with the parent", () => {
    const config = { count: 4, seed: 88, minDistance: 68, maxDistance: 81, scale: 0.12 };
    const first = createDebrisGroup(config, 50, "primary");
    const repeat = createDebrisGroup(config, 50, "primary");
    const larger = createDebrisGroup(config, 100, "primary");

    expect(first.fragments).toHaveLength(repeat.fragments.length);
    first.fragments.forEach((fragment, index) => {
      const repeated = repeat.fragments[index]!;
      expect(fragment.position.toArray()).toEqual(repeated.position.toArray());
      expect(Array.from(fragment.geometry.attributes["position"]!.array)).toEqual(
        Array.from(repeated.geometry.attributes["position"]!.array)
      );
    });
    expect(first.fragments[0]!.geometry).not.toBe(first.fragments[1]!.geometry);
    expect(Array.from(first.fragments[0]!.geometry.attributes["position"]!.array)).not.toEqual(
      Array.from(first.fragments[1]!.geometry.attributes["position"]!.array)
    );

    const firstDistance = first.fragments[0]!.position.length();
    const largerDistance = larger.fragments[0]!.position.length();
    expect(largerDistance / firstDistance).toBeCloseTo(2, 5);

    first.dispose();
    repeat.dispose();
    larger.dispose();
  });

  it("keeps debris stationary while fragment self-rotation stays subtle", () => {
    const debris = createDebrisGroup(
      { count: 4, seed: 88, minDistance: 68, maxDistance: 81, scale: 0.12 },
      50,
      "primary"
    );
    const positionsBefore = debris.fragments.map((fragment) => fragment.position.toArray());
    const rotationsBefore = debris.fragments.map((fragment) => fragment.rotation.y);

    debris.update(10);

    expect(debris.group.rotation.y).toBe(0);
    debris.fragments.forEach((fragment, index) => {
      expect(fragment.position.toArray()).toEqual(positionsBefore[index]);
      const rotationChange = fragment.rotation.y - rotationsBefore[index]!;
      expect(rotationChange).toBeGreaterThan(0);
      expect(rotationChange).toBeLessThan(0.2);
    });

    debris.dispose();
  });

  it("disposes each debris geometry and the shared material once", () => {
    const debris = createDebrisGroup(
      { count: 4, seed: 88, minDistance: 68, maxDistance: 81, scale: 0.12 },
      50,
      "primary"
    );
    const geometries = debris.fragments.map((fragment) => fragment.geometry);
    const material = debris.fragments[0]!.material as THREE.Material;
    const geometryDisposals = geometries.map((geometry) => vi.spyOn(geometry, "dispose"));
    const materialDispose = vi.spyOn(material, "dispose");

    expect(debris.fragments.every((fragment) => fragment.material === material)).toBe(true);
    debris.dispose();

    for (const dispose of geometryDisposals) expect(dispose).toHaveBeenCalledTimes(1);
    expect(materialDispose).toHaveBeenCalledTimes(1);
  });
});
