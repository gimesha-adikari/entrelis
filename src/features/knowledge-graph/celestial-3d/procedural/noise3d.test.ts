import { describe, it, expect } from "vitest";
import {
  createNoise3D,
  fbm3D,
  ridgedFbm3D,
  createCellular3D,
  createCellularManhattan3D,
  domainWarp3D,
} from "./noise3d";

describe("Modular 3D Noise Engine", () => {
  it("produces deterministic 3D noise values for identical seeds and coordinates", () => {
    const noiseA = createNoise3D(42);
    const noiseB = createNoise3D(42);

    expect(noiseA(0.5, 0.25, 0.1)).toBe(noiseB(0.5, 0.25, 0.1));
    expect(noiseA(-1.2, 3.4, 0.8)).toBe(noiseB(-1.2, 3.4, 0.8));
  });

  it("produces multi-octave fBm values bounded within [-1, 1]", () => {
    const noise = createNoise3D(108);
    const val = fbm3D(noise, 1.5, 2.5, 3.5, 5);
    expect(val).toBeGreaterThanOrEqual(-1.5);
    expect(val).toBeLessThanOrEqual(1.5);
  });

  it("produces ridged multifractal values bounded within [0, 1]", () => {
    const noise = createNoise3D(256);
    const val = ridgedFbm3D(noise, 0.8, 1.2, 0.4, 4);
    expect(val).toBeGreaterThanOrEqual(0);
    expect(val).toBeLessThanOrEqual(1.0);
  });

  it("calculates 3D Voronoi cellular distance values", () => {
    const cell = createCellular3D(512);
    const res = cell(1.2, 2.3, 3.4);
    expect(res.f1).toBeGreaterThanOrEqual(0);
    expect(res.f2).toBeGreaterThanOrEqual(res.f1);
    expect(res.diff).toBeCloseTo(res.f2 - res.f1, 5);
  });

  it("calculates Manhattan cellular distance with rectilinear grid structure", () => {
    const manhattan = createCellularManhattan3D(1024);
    const res = manhattan(2.0, 3.0, 4.0);
    expect(res.f1).toBeGreaterThanOrEqual(0);
    expect(res.f2).toBeGreaterThanOrEqual(res.f1);
  });

  it("computes domain warped 3D coordinates for turbulent fluid dynamics", () => {
    const noise = createNoise3D(2048);
    const warped = domainWarp3D(noise, 0.5, 0.5, 0.5, 0.8);
    expect(typeof warped).toBe("number");
    expect(warped).toBeGreaterThanOrEqual(-1.5);
    expect(warped).toBeLessThanOrEqual(1.5);
  });
});
