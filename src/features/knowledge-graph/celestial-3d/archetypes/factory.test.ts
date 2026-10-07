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

  it("keeps asteroid silhouettes deterministic, seed-driven, and distinct by family", () => {
    const carbon = deformAsteroidGeometry(42, 601, 2, "carbon");
    const carbonRepeat = deformAsteroidGeometry(42, 601, 2, "carbon");
    const carbonOtherSeed = deformAsteroidGeometry(42, 602, 2, "carbon");
    const mineral = deformAsteroidGeometry(42, 601, 2, "mineral");

    const positions = (geometry: THREE.BufferGeometry) =>
      Array.from((geometry.attributes["position"] as THREE.BufferAttribute).array);
    const aspectRatio = (geometry: THREE.BufferGeometry) => {
      geometry.computeBoundingBox();
      const size = new THREE.Vector3();
      geometry.boundingBox!.getSize(size);
      return size.x / size.y;
    };

    expect(positions(carbonRepeat)).toEqual(positions(carbon));
    expect(positions(carbonOtherSeed)).not.toEqual(positions(carbon));
    expect(positions(mineral)).not.toEqual(positions(carbon));
    expect(aspectRatio(carbon)).toBeLessThan(1.45);
    expect(aspectRatio(mineral)).toBeGreaterThan(1.4);

    for (const geometry of [carbon, carbonRepeat, carbonOtherSeed, mineral]) {
      geometry.computeBoundingSphere();
      expect(geometry.boundingSphere!.radius).toBeGreaterThan(42 * 0.5);
      expect(geometry.boundingSphere!.radius).toBeLessThan(42 * 2);

      const position = geometry.attributes["position"] as THREE.BufferAttribute;
      for (let i = 0; i < position.count; i++) {
        expect(Number.isFinite(position.getX(i))).toBe(true);
        expect(Number.isFinite(position.getY(i))).toBe(true);
        expect(Number.isFinite(position.getZ(i))).toBe(true);
      }
      geometry.dispose();
    }
  });

  it("keeps asteroid family profiles recognizable across context and focus LOD", () => {
    const contextCarbon = deformAsteroidGeometry(42, 601, 1, "carbon");
    const primaryCarbon = deformAsteroidGeometry(42, 601, 2, "carbon");
    const focusCarbon = deformAsteroidGeometry(42, 601, 3, "carbon");
    const contextMineral = deformAsteroidGeometry(42, 602, 1, "mineral");
    const primaryMineral = deformAsteroidGeometry(42, 602, 2, "mineral");
    const focusMineral = deformAsteroidGeometry(42, 602, 3, "mineral");

    const aspectRatio = (geometry: THREE.BufferGeometry) => {
      geometry.computeBoundingBox();
      const size = new THREE.Vector3();
      geometry.boundingBox!.getSize(size);
      return size.x / size.y;
    };

    expect(Math.abs(aspectRatio(contextCarbon) - aspectRatio(focusCarbon))).toBeLessThan(0.2);
    expect(Math.abs(aspectRatio(contextMineral) - aspectRatio(focusMineral))).toBeLessThan(0.2);
    expect(primaryCarbon.attributes["position"]!.count).toBeGreaterThan(
      contextCarbon.attributes["position"]!.count
    );
    expect(focusCarbon.attributes["position"]!.count).toBeGreaterThan(
      primaryCarbon.attributes["position"]!.count
    );
    expect(primaryMineral.attributes["position"]!.count).toBeGreaterThan(
      contextMineral.attributes["position"]!.count
    );
    expect(focusMineral.attributes["position"]!.count).toBeGreaterThan(
      primaryMineral.attributes["position"]!.count
    );

    contextCarbon.dispose();
    primaryCarbon.dispose();
    focusCarbon.dispose();
    contextMineral.dispose();
    primaryMineral.dispose();
    focusMineral.dispose();
  });

  it("uses variant-specific asteroid geometry and slow rotation in the factory", () => {
    const carbon = createCelestialObject(
      { archetype: "asteroid", seed: 601, asteroidVariant: "carbon" },
      "focus",
      50
    );
    const mineral = createCelestialObject(
      { archetype: "asteroid", seed: 602, asteroidVariant: "mineral" },
      "focus",
      50
    );

    const carbonPeriod = (2 * Math.PI) / carbon.baseRotationSpeed;
    const mineralPeriod = (2 * Math.PI) / mineral.baseRotationSpeed;
    expect(carbonPeriod).toBeGreaterThanOrEqual(55);
    expect(carbonPeriod).toBeLessThanOrEqual(90);
    expect(mineralPeriod).toBeGreaterThanOrEqual(45);
    expect(mineralPeriod).toBeLessThanOrEqual(80);
    expect(carbon.baseRotationSpeed).not.toBe(mineral.baseRotationSpeed);
    expect(carbon.tiltZ).not.toBe(mineral.tiltZ);
    expect(Array.from(carbon.primaryMesh.geometry.attributes["position"]!.array)).not.toEqual(
      Array.from(mineral.primaryMesh.geometry.attributes["position"]!.array)
    );

    const initialRotation = mineral.primaryMesh.rotation.y;
    mineral.update(1, 1);
    expect(mineral.primaryMesh.rotation.y).toBeGreaterThan(initialRotation);

    carbon.dispose();
    mineral.dispose();
  });

  it("selects a stable asteroid silhouette with progressively finer factory LOD", () => {
    const identity: CelestialIdentity = {
      archetype: "asteroid",
      seed: 601,
      asteroidVariant: "carbon",
    };
    const context = createCelestialObject(identity, "context", 42);
    const primary = createCelestialObject(identity, "primary", 42);
    const focus = createCelestialObject(identity, "focus", 42);
    const contextGeometry = context.primaryMesh.geometry as THREE.BufferGeometry;
    const primaryGeometry = primary.primaryMesh.geometry as THREE.BufferGeometry;
    const focusGeometry = focus.primaryMesh.geometry as THREE.BufferGeometry;

    expect(primaryGeometry.attributes["position"]!.count).toBeGreaterThan(
      contextGeometry.attributes["position"]!.count
    );
    expect(focusGeometry.attributes["position"]!.count).toBeGreaterThan(
      primaryGeometry.attributes["position"]!.count
    );

    context.dispose();
    primary.dispose();
    focus.dispose();
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
