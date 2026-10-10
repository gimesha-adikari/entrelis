import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import {
  createForegroundRingGeometryFallback,
  createForegroundRingMaskBuilder,
  createForegroundRingRasterizer,
  getCachedForegroundRingMask,
  rasterizeForegroundRing,
} from "./ring-occlusion";

function ring(alpha = 255) {
  const geometry = new THREE.RingGeometry(20, 40, 64, 8);
  const uv = geometry.getAttribute("uv");
  for (let i = 0; i <= 8; i++) for (let j = 0; j <= 64; j++) uv.setXY(i * 65 + j, i / 8, j / 64);
  const pixels = new Uint8ClampedArray(32 * 32 * 4);
  for (let i = 3; i < pixels.length; i += 4) pixels[i] = alpha;
  return { geometry, pixels, matrix: new THREE.Matrix4().makeRotationX(Math.PI / 3) };
}

describe("foreground ring mask from actual mesh triangles", () => {
  it("masks only positive camera-facing depth, leaving back half and ring hole clear", () => {
    const { geometry, pixels, matrix } = ring();
    const mask = rasterizeForegroundRing(geometry, matrix, pixels, 32, 32, 128);
    const sample = (x: number, y: number) => mask.rgba[(y * mask.size + x) * 4 + 3]!;
    expect(sample(64, 40)).toBeGreaterThan(200);
    expect(sample(64, 88)).toBe(0);
    expect(sample(64, 64)).toBe(0);
    geometry.dispose();
  });
  it("retains texture transparency and radial gaps", () => {
    const { geometry, pixels, matrix } = ring(90);
    for (let y = 0; y < 32; y++) for (let x = 10; x < 20; x++) pixels[(y * 32 + x) * 4 + 3] = 0;
    const mask = rasterizeForegroundRing(geometry, matrix, pixels, 32, 32, 128);
    expect(Math.max(...Array.from(mask.rgba).filter((_, i) => i % 4 === 3))).toBeLessThanOrEqual(
      90
    );
    expect(mask.rgba[(40 * 128 + 64) * 4 + 3]).toBe(0);
    geometry.dispose();
  });
  it("produces identical masks from cached alpha-only and RGBA texture data", () => {
    const { geometry, pixels, matrix } = ring(128);
    for (let y = 0; y < 32; y++) for (let x = 10; x < 20; x++) pixels[(y * 32 + x) * 4 + 3] = 0;
    const alpha = new Uint8Array(32 * 32);
    for (let i = 0; i < alpha.length; i++) alpha[i] = pixels[i * 4 + 3]!;
    const fromRgba = rasterizeForegroundRing(geometry, matrix, pixels, 32, 32, 128);
    const fromAlpha = rasterizeForegroundRing(geometry, matrix, alpha, 32, 32, 128);
    expect(fromAlpha).toEqual(fromRgba);
    geometry.dispose();
  });
  it("rasterizes the production-size mask in bounded batches without changing its pixels", () => {
    const { geometry, pixels, matrix } = ring();
    const expected = rasterizeForegroundRing(geometry, matrix, pixels, 32, 32, 384);
    const rasterizer = createForegroundRingRasterizer(geometry, matrix, pixels, 32, 32, 384);
    const batches: number[] = [];

    expect(rasterizer.step(8_192, 0)).toBe(false);
    expect(rasterizer.lastStepPixelCandidates).toBeLessThanOrEqual(32);
    while (!rasterizer.step(2_048, Number.POSITIVE_INFINITY)) {
      batches.push(rasterizer.lastStepPixelCandidates);
    }
    batches.push(rasterizer.lastStepPixelCandidates);

    expect(batches.length).toBeGreaterThan(1);
    expect(batches.every((count) => count <= 2_048)).toBe(true);
    expect(rasterizer.result).toEqual(expected);
    geometry.dispose();
  });
  it("uses the actual rotated mesh orientation rather than a generic ellipse", () => {
    const { geometry, pixels, matrix } = ring();
    const first = rasterizeForegroundRing(geometry, matrix, pixels, 32, 32, 64);
    matrix.premultiply(new THREE.Matrix4().makeRotationZ(Math.PI / 2));
    const rotated = rasterizeForegroundRing(geometry, matrix, pixels, 32, 32, 64);
    expect(rotated.rgba).not.toEqual(first.rgba);
    geometry.dispose();
  });
  it("returns an empty mask for an edge-on ring", () => {
    const { geometry, pixels } = ring();
    const mask = rasterizeForegroundRing(
      geometry,
      new THREE.Matrix4().makeRotationX(Math.PI / 2),
      pixels,
      32,
      32,
      64
    );
    expect(mask.rgba.every((value) => value === 0)).toBe(true);
    geometry.dispose();
  });

  it("does not synchronously read pixels when a texture has no retained CPU alpha", () => {
    const source = document.createElement("canvas");
    source.width = source.height = 32;
    const getContext = vi.fn();
    Object.defineProperty(source, "getContext", { value: getContext });
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(20, 40, 16),
      new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(source) })
    );

    expect(createForegroundRingMaskBuilder(new THREE.Group(), ring)).toBeNull();
    expect(getContext).not.toHaveBeenCalled();
    ring.geometry.dispose();
    (ring.material as THREE.Material).dispose();
  });

  it("publishes a conservative foreground-geometry fallback without retained texture alpha", () => {
    class RecordingPath2D {
      moveTo = vi.fn();
      lineTo = vi.fn();
      closePath = vi.fn();
    }
    vi.stubGlobal("Path2D", RecordingPath2D);
    try {
      const source = document.createElement("canvas");
      source.width = source.height = 32;
      const mesh = new THREE.Mesh(
        new THREE.RingGeometry(20, 40, 16, 4),
        new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(source) })
      );
      mesh.rotation.x = Math.PI / 3;
      const body = new THREE.Group();

      expect(createForegroundRingMaskBuilder(body, mesh)).toBeNull();
      const fallback = createForegroundRingGeometryFallback(body, mesh);

      expect(fallback?.isExact).toBe(false);
      expect(fallback?.draw.path).toBeInstanceOf(RecordingPath2D);
      expect((fallback?.draw.path as unknown as RecordingPath2D).moveTo).toHaveBeenCalled();
      expect((fallback?.draw.path as unknown as RecordingPath2D).closePath).toHaveBeenCalled();
      expect(getCachedForegroundRingMask(body, mesh)).toBe(fallback);
      expect(createForegroundRingGeometryFallback(body, mesh)).toBe(fallback);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      (mesh.material as THREE.MeshStandardMaterial).map?.dispose();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
