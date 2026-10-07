import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createDeepSpaceMaterial } from "./deep-space-shader";
import { createStarMaterial } from "./star-shader";

describe("Deep-Space Shader Material", () => {
  it("creates a shader material with required uniform properties", () => {
    const mat = createDeepSpaceMaterial();
    expect(mat).toBeInstanceOf(THREE.ShaderMaterial);
    expect(mat.uniforms["uTime"]).toBeDefined();
    expect(mat.uniforms["uResolution"]).toBeDefined();
    expect(mat.uniforms["uParallaxOffset"]).toBeDefined();
    expect(mat.uniforms["uTravelOffset"]).toBeDefined();
    expect(mat.uniforms["uMotionStrength"]).toBeDefined();

    expect(mat.depthWrite).toBe(false);
    expect(mat.transparent).toBe(false);

    mat.dispose();
  });

  it("updates motion strength uniform for reduced motion", () => {
    const mat = createDeepSpaceMaterial();
    expect(mat.uniforms["uMotionStrength"]!.value).toBe(1.0);

    mat.uniforms["uMotionStrength"]!.value = 0.0;
    expect(mat.uniforms["uMotionStrength"]!.value).toBe(0.0);

    mat.dispose();
  });
});

describe("Star Shader Material", () => {
  it("creates a points material with required uniforms and blending", () => {
    const mat = createStarMaterial();
    expect(mat).toBeInstanceOf(THREE.ShaderMaterial);
    expect(mat.uniforms["uTime"]).toBeDefined();
    expect(mat.uniforms["uMotionStrength"]).toBeDefined();
    expect(mat.uniforms["uPixelRatio"]).toBeDefined();
    expect(mat.uniforms["uParallaxOffset"]).toBeDefined();
    expect(mat.uniforms["uTravelOffset"]).toBeDefined();
    expect(mat.uniforms["uScale"]).toBeDefined();

    expect(mat.transparent).toBe(true);
    expect(mat.depthWrite).toBe(false);
    expect(mat.blending).toBe(THREE.AdditiveBlending);

    mat.dispose();
  });
});
