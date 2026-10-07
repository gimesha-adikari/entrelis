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
  getCachedTexture,
  releaseCelestialTextures,
  retainCelestialTextures,
} from "./textures";

const pixels = new WeakMap<HTMLCanvasElement, Uint8ClampedArray>();

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
            putImageData: (image: ImageData) => pixels.set(canvas, image.data.slice()),
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

  it("generates metallic world textures with regional PBR and recessed plate seams", () => {
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
    expect(crystal.normal).toBeDefined();
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

describe("Structural macro hierarchy", () => {
  beforeEach(() => {
    setupCanvas2DMock();
    disposeAllCelestialTextures();
  });
  afterEach(() => {
    disposeAllCelestialTextures();
    vi.restoreAllMocks();
  });

  it("keeps metallic equatorial seams sparse enough for broad provinces", () => {
    const texture = createMetallicWorldTextures(2048, "focus").bump;
    const data = pixels.get(texture.image as HTMLCanvasElement)!;
    const width = texture.image.width;
    const row = texture.image.height / 2;
    let transitions = 0;
    for (let x = 1; x < width; x++) {
      const a = data[(row * width + x - 1) * 4]! < 100;
      const b = data[(row * width + x) * 4]! < 100;
      if (a !== b) transitions++;
    }
    expect(transitions).toBeLessThanOrEqual(20);
  });

  it("leaves most crystal surface as quiet bright ice rather than a dense fissure mesh", () => {
    const texture = createCrystalWorldTextures(4096, "focus").diffuse;
    const data = pixels.get(texture.image as HTMLCanvasElement)!;
    let bright = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i]! > 150) bright++;
    }
    expect(bright / (data.length / 4)).toBeGreaterThan(0.7);
  });
});

describe("Structural texture identity and lifecycle", () => {
  beforeEach(() => {
    setupCanvas2DMock();
    disposeAllCelestialTextures();
  });
  afterEach(() => {
    disposeAllCelestialTextures();
    vi.restoreAllMocks();
  });

  it.each([createMetallicWorldTextures, createCrystalWorldTextures])(
    "reproduces every map after cache disposal and varies with the concept seed",
    (generate) => {
      const first = generate(2048, "context");
      const bytes = Object.values(first).map((t) => pixels.get(t.image as HTMLCanvasElement)!);
      const disposal = Object.values(first).map((t) => vi.spyOn(t, "dispose"));
      const cached = generate(2048, "context");
      expect(cached.diffuse).toBe(first.diffuse);
      disposeAllCelestialTextures();
      for (const spy of disposal) expect(spy).toHaveBeenCalledOnce();
      const regenerated = generate(2048, "context");
      Object.values(regenerated).forEach((t, i) => {
        expect(pixels.get(t.image as HTMLCanvasElement)).toEqual(bytes[i]);
      });
      const different = generate(4096, "context");
      expect(pixels.get(different.diffuse.image as HTMLCanvasElement)).not.toEqual(bytes[0]);
    }
  );

  it.each(["focus", "primary", "context"] as const)(
    "uses bounded %s texture sizes for both worlds",
    (lod) => {
      const expected = lod === "focus" ? [512, 256] : lod === "primary" ? [256, 128] : [64, 32];
      for (const generate of [createMetallicWorldTextures, createCrystalWorldTextures]) {
        for (const map of Object.values(generate(2048, lod))) {
          expect([map.image.width, map.image.height]).toEqual(expected);
        }
      }
    }
  );

  it("keeps a shared texture cached until its last body releases it", () => {
    const texture = createMetallicWorldTextures(2048, "context").diffuse;
    const disposeSpy = vi.spyOn(texture, "dispose");
    const cacheKey = "metallic:diff:2048:context";

    retainCelestialTextures([texture]);
    retainCelestialTextures([texture]);
    releaseCelestialTextures([texture]);

    expect(disposeSpy).not.toHaveBeenCalled();
    expect(getCachedTexture(cacheKey)).toBe(texture);

    releaseCelestialTextures([texture]);

    expect(disposeSpy).toHaveBeenCalledOnce();
    expect(getCachedTexture(cacheKey)).toBeUndefined();
  });
});
