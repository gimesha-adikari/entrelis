import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { createAtmosphereMaterial } from "./atmosphere";
import { createStarSurfaceMaterial } from "./star";

describe("Celestial 3D Shaders", () => {
  it("creates atmosphere shader material with orthographic normal Fresnel uniforms", () => {
    const mat = createAtmosphereMaterial({
      color: 0x38bdf8,
      fresnelPower: 2.6,
      intensity: 0.9,
    });

    expect(mat).toBeInstanceOf(THREE.ShaderMaterial);
    expect(mat.transparent).toBe(true);
    expect(mat.depthWrite).toBe(false);
    expect(mat.uniforms["uColor"]).toBeDefined();
    expect(mat.uniforms["uFresnelPower"]?.value).toBe(2.6);
    expect(mat.uniforms["uIntensity"]?.value).toBe(0.9);

    mat.dispose();
  });

  it("creates star surface shader material with custom palette uniforms for golden, blue, and ember stars", () => {
    const tex = new THREE.Texture();

    const goldenMat = createStarSurfaceMaterial({
      surfaceTexture: tex,
      coreColor: 0xffffff,
      midColor: 0xfef08a,
      limbColor: 0xf59e0b,
      intensity: 1.55,
    });
    expect(goldenMat.uniforms["uMidColor"]?.value.getHex()).toBe(0xfef08a);

    const blueMat = createStarSurfaceMaterial({
      surfaceTexture: tex,
      coreColor: 0xffffff,
      midColor: 0x67e8f9,
      limbColor: 0x2563eb,
      intensity: 1.7,
    });
    expect(blueMat.uniforms["uMidColor"]?.value.getHex()).toBe(0x67e8f9);

    const emberMat = createStarSurfaceMaterial({
      surfaceTexture: tex,
      coreColor: 0xffedd5,
      midColor: 0xf97316,
      limbColor: 0x7f1d1d,
      intensity: 1.4,
    });
    expect(emberMat.uniforms["uMidColor"]?.value.getHex()).toBe(0xf97316);

    goldenMat.dispose();
    blueMat.dispose();
    emberMat.dispose();
    tex.dispose();
  });
});
