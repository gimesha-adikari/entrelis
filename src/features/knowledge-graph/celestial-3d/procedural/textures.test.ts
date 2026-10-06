import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createGoldenStarTextures,
  createBlueStarTextures,
  createEmberStarTextures,
  createVolcanicRockyTextures,
  createMineralDesertTextures,
  createLifeWorldTextures,
  createBlueAtmosphericTexture,
  createBlueAtmosphericCloudTexture,
  createStormGiantTexture,
  createMetallicWorldTextures,
  createCrystalWorldTextures,
  createAsteroidTextures,
  createRingTexture,
  disposeAllCelestialTextures,
} from "./textures";

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

describe("Procedural Texture Engines", () => {
  let restoreCanvas: () => void;

  beforeEach(() => {
    restoreCanvas = setupCanvas2DMock();
    disposeAllCelestialTextures();
  });

  afterEach(() => {
    disposeAllCelestialTextures();
    restoreCanvas();
  });

  it("generates distinct star textures for Golden, Blue-White, and Ember stars", () => {
    const golden = createGoldenStarTextures(101, "focus");
    const blue = createBlueStarTextures(102, "focus");
    const ember = createEmberStarTextures(103, "focus");

    expect(golden.surface).toBeDefined();
    expect(golden.corona).toBeDefined();
    expect(blue.surface).toBeDefined();
    expect(blue.corona).toBeDefined();
    expect(ember.surface).toBeDefined();
    expect(ember.corona).toBeDefined();

    // Verify caching: calling with same seed and LOD returns cached instance
    const goldenCached = createGoldenStarTextures(101, "focus");
    expect(golden.surface).toBe(goldenCached.surface);
  });

  it("generates volcanic rocky textures with glowing fissures and mineral desert textures with sediment layers", () => {
    const volcanic = createVolcanicRockyTextures(201, "focus");
    const desert = createMineralDesertTextures(202, "focus");

    expect(volcanic.diffuse).toBeDefined();
    expect(volcanic.bump).toBeDefined();
    expect(volcanic.roughness).toBeDefined();
    expect(volcanic.emissive).toBeDefined(); // Volcanic has glowing fissures

    expect(desert.diffuse).toBeDefined();
    expect(desert.bump).toBeDefined();
    expect(desert.roughness).toBeDefined();
    expect(desert.emissive).toBeUndefined(); // Desert has no lava
  });

  it("generates life world textures with independent surface, cloud, roughness, and bump maps", () => {
    const life = createLifeWorldTextures(301, "focus");

    expect(life.surface).toBeDefined();
    expect(life.clouds).toBeDefined();
    expect(life.roughness).toBeDefined();
    expect(life.bump).toBeDefined();
  });

  it("generates atmospheric gas textures and storm giant textures with distinct generators", () => {
    const blueGas = createBlueAtmosphericTexture(401, "focus");
    const blueClouds = createBlueAtmosphericCloudTexture(401, "focus");
    const stormGiant = createStormGiantTexture(402, "focus");

    expect(blueGas).toBeDefined();
    expect(blueClouds).toBeDefined();
    expect(stormGiant).toBeDefined();
  });

  it("generates metallic world textures with high metalness and silicon wafer bump maps", () => {
    const metallic = createMetallicWorldTextures(501, "focus");

    expect(metallic.diffuse).toBeDefined();
    expect(metallic.roughness).toBeDefined();
    expect(metallic.metalness).toBeDefined();
    expect(metallic.bump).toBeDefined();
  });

  it("generates crystal world textures with fracture boundaries", () => {
    const crystal = createCrystalWorldTextures(502, "focus");

    expect(crystal.diffuse).toBeDefined();
    expect(crystal.roughness).toBeDefined();
    expect(crystal.bump).toBeDefined();
  });

  it("generates carbon and mineral asteroid textures", () => {
    const carbon = createAsteroidTextures(601, "focus", "carbon");
    const mineral = createAsteroidTextures(602, "focus", "mineral");

    expect(carbon.diffuse).toBeDefined();
    expect(mineral.diffuse).toBeDefined();
  });

  it("generates procedural ring textures for ice, dust, and broken ring styles", () => {
    const iceRing = createRingTexture({
      innerRadius: 65,
      outerRadius: 100,
      tilt: 0.35,
      opacity: 0.85,
      style: "ice",
      seed: 701,
    });
    const dustRing = createRingTexture({
      innerRadius: 65,
      outerRadius: 100,
      tilt: 0.35,
      opacity: 0.75,
      style: "dust",
      seed: 702,
    });
    const brokenRing = createRingTexture({
      innerRadius: 65,
      outerRadius: 100,
      tilt: 0.35,
      opacity: 0.8,
      style: "broken",
      seed: 703,
    });

    expect(iceRing).toBeDefined();
    expect(dustRing).toBeDefined();
    expect(brokenRing).toBeDefined();
  });
});
