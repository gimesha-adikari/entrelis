import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as THREE from "three";
import { deformAsteroidGeometry } from "./asteroid";
import { createCelestialObject } from "./factory";
import type { CelestialIdentity } from "../identity";
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

describe("Asteroid Deformation and Celestial Object Factory", () => {
  let restoreCanvas: () => void;

  beforeEach(() => {
    restoreCanvas = setupCanvas2DMock();
    disposeAllCelestialTextures();
  });

  afterEach(() => {
    disposeAllCelestialTextures();
    restoreCanvas();
  });

  it("deforms asteroid geometry into an irregular non-spherical shape", () => {
    const geo = deformAsteroidGeometry(50, 42, 2);
    expect(geo).toBeInstanceOf(THREE.BufferGeometry);

    const pos = geo.attributes["position"] as THREE.BufferAttribute;
    expect(pos).toBeDefined();

    // Verify distance variance from center (not a perfect sphere)
    const distances: number[] = [];
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      distances.push(Math.sqrt(x * x + y * y + z * z));
    }

    const minD = Math.min(...distances);
    const maxD = Math.max(...distances);
    // Non-spherical shape should have at least 15% distance variance
    expect(maxD - minD).toBeGreaterThan(50 * 0.15);

    geo.dispose();
  });

  it("creates a star with surface shader and concentric corona sprite", () => {
    const starIdentity: CelestialIdentity = {
      archetype: "golden-star",
      seed: 101,
    };
    const body = createCelestialObject(starIdentity, "focus", 50);

    expect(body.starShaderMaterial).toBeDefined();
    expect(body.starCoronaSprite).toBeDefined();
    expect(body.primaryMesh).toBeInstanceOf(THREE.Mesh);

    body.dispose();
  });

  it("creates a Life World with surface, cloud shell, and atmosphere shell", () => {
    const lifeIdentity: CelestialIdentity = {
      archetype: "life-world",
      seed: 301,
    };
    const body = createCelestialObject(lifeIdentity, "focus", 50);

    expect(body.cloudShell).toBeDefined();
    expect(body.atmosphereShell).toBeDefined();
    expect(body.cloudRotationSpeed).toBeDefined();

    body.dispose();
  });

  it("creates a ringed world with attached ring mesh", () => {
    const ringedIdentity: CelestialIdentity = {
      archetype: "storm-giant",
      seed: 403,
      rings: {
        innerRadius: 68,
        outerRadius: 110,
        tilt: 0.4,
        opacity: 0.85,
        style: "ice",
        seed: 403,
      },
    };
    const body = createCelestialObject(ringedIdentity, "focus", 50);

    expect(body.ringMesh).toBeDefined();
    expect(body.atmosphereShell).toBeDefined();

    body.dispose();
  });

  it("disposes all child meshes, materials, and geometries cleanly", () => {
    const complexIdentity: CelestialIdentity = {
      archetype: "storm-giant",
      seed: 1024,
      rings: {
        innerRadius: 70,
        outerRadius: 115,
        tilt: 0.4,
        opacity: 0.85,
        style: "ice",
        seed: 1024,
      },
      moons: [
        {
          archetype: "ice",
          relativeRadius: 0.2,
          distance: 130,
          phase: 0.8,
          seed: 1025,
        },
      ],
      debris: {
        count: 3,
        seed: 1026,
        minDistance: 80,
        maxDistance: 120,
        scale: 0.15,
      },
    };
    const body = createCelestialObject(complexIdentity, "focus", 50);

    expect(() => body.dispose()).not.toThrow();
  });
});
