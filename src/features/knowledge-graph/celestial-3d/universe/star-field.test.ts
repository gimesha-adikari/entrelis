import { describe, expect, it } from "vitest";
import { SeededPRNG } from "./prng";
import { generateStarFieldGeometry, getStarCountsForTier } from "./star-field-generator";

describe("SeededPRNG", () => {
  it("produces deterministic numbers from the same seed", () => {
    const prng1 = new SeededPRNG(42);
    const prng2 = new SeededPRNG(42);

    const values1 = Array.from({ length: 20 }, () => prng1.next());
    const values2 = Array.from({ length: 20 }, () => prng2.next());

    expect(values1).toEqual(values2);
  });

  it("produces distinct numbers from different seeds", () => {
    const prng1 = new SeededPRNG(42);
    const prng2 = new SeededPRNG(9999);

    const val1 = prng1.next();
    const val2 = prng2.next();

    expect(val1).not.toBe(val2);
  });
});

describe("Star Field Generator", () => {
  it("adheres to desktop and mobile tier count budgets", () => {
    const farDesktop = getStarCountsForTier("far", false);
    const farMobile = getStarCountsForTier("far", true);
    expect(farDesktop).toBeGreaterThanOrEqual(1600);
    expect(farDesktop).toBeLessThanOrEqual(2200);
    expect(farMobile).toBeGreaterThanOrEqual(700);
    expect(farMobile).toBeLessThanOrEqual(1000);

    const midDesktop = getStarCountsForTier("mid", false);
    const midMobile = getStarCountsForTier("mid", true);
    expect(midDesktop).toBeGreaterThanOrEqual(500);
    expect(midDesktop).toBeLessThanOrEqual(800);
    expect(midMobile).toBeGreaterThanOrEqual(200);
    expect(midMobile).toBeLessThanOrEqual(350);

    const brightDesktop = getStarCountsForTier("bright", false);
    const brightMobile = getStarCountsForTier("bright", true);
    expect(brightDesktop).toBeGreaterThanOrEqual(40);
    expect(brightDesktop).toBeLessThanOrEqual(80);
    expect(brightMobile).toBeGreaterThanOrEqual(20);
    expect(brightMobile).toBeLessThanOrEqual(40);
  });

  it("generates deterministic BufferGeometry with required attributes", () => {
    const geo1 = generateStarFieldGeometry({
      tier: "far",
      isMobile: false,
      seed: 12345,
      areaWidth: 3000,
      areaHeight: 2000,
    });

    const geo2 = generateStarFieldGeometry({
      tier: "far",
      isMobile: false,
      seed: 12345,
      areaWidth: 3000,
      areaHeight: 2000,
    });

    expect(geo1.getAttribute("position")).toBeDefined();
    expect(geo1.getAttribute("aSeed")).toBeDefined();
    expect(geo1.getAttribute("aSize")).toBeDefined();
    expect(geo1.getAttribute("aBrightness")).toBeDefined();
    expect(geo1.getAttribute("aColor")).toBeDefined();
    expect(geo1.getAttribute("aTwinkleSpeed")).toBeDefined();

    const pos1 = geo1.getAttribute("position").array as Float32Array;
    const pos2 = geo2.getAttribute("position").array as Float32Array;

    expect(pos1.length).toBe(pos2.length);
    expect(Array.from(pos1)).toEqual(Array.from(pos2));

    geo1.dispose();
    geo2.dispose();
  });

  it("produces distinct geometries when seed differs", () => {
    const geoA = generateStarFieldGeometry({
      tier: "mid",
      isMobile: false,
      seed: 111,
      areaWidth: 3000,
      areaHeight: 2000,
    });

    const geoB = generateStarFieldGeometry({
      tier: "mid",
      isMobile: false,
      seed: 222,
      areaWidth: 3000,
      areaHeight: 2000,
    });

    const posA = geoA.getAttribute("position").array as Float32Array;
    const posB = geoB.getAttribute("position").array as Float32Array;

    expect(posA[0]).not.toBe(posB[0]);

    geoA.dispose();
    geoB.dispose();
  });
});
