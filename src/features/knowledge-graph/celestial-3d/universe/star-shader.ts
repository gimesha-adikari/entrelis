import * as THREE from "three";

const starVertexShader = /* glsl */ `
  attribute float aSeed;
  attribute float aSize;
  attribute float aBrightness;
  attribute vec3 aColor;
  attribute float aTwinkleSpeed;

  uniform float uTime;
  uniform float uMotionStrength;
  uniform float uPixelRatio;
  uniform vec2 uParallaxOffset;
  uniform vec2 uTravelOffset;
  uniform float uScale;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec3 pos = position;
    // Subtle depth push-through scale expansion
    pos.xy *= uScale;
    // Composed manual parallax + selection travel displacement
    pos.xy += uParallaxOffset + uTravelOffset;

    // GPU-driven subtle twinkle
    float twinkleTime = uTime * aTwinkleSpeed * uMotionStrength;
    float twinkle = sin(twinkleTime * 1.5 + aSeed * 6.2831853);
    // Subtle amplitude (+/- 20% modulation)
    float currentBrightness = clamp(aBrightness + twinkle * (aBrightness * 0.22), 0.05, 1.0);

    vColor = aColor;
    vAlpha = currentBrightness;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = max(1.0, aSize * uPixelRatio);
  }
`;

const starFragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    // Distance from center of point sprite [-0.5, 0.5]
    vec2 coord = gl_PointCoord - vec2(0.5);
    float distSq = dot(coord, coord);
    if (distSq > 0.25) {
      discard;
    }

    // Soft Gaussian-like radial falloff
    float r = sqrt(distSq) * 2.0; // [0, 1]
    float radialFalloff = smoothstep(1.0, 0.1, r);

    // Subtle hot core highlight
    vec3 color = mix(vColor, vec3(1.0), radialFalloff * radialFalloff * 0.35);

    gl_FragColor = vec4(color, vAlpha * radialFalloff);
  }
`;

export function createStarMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uMotionStrength: { value: 1.0 },
      uPixelRatio: { value: 1.0 },
      uParallaxOffset: { value: new THREE.Vector2(0, 0) },
      uTravelOffset: { value: new THREE.Vector2(0, 0) },
      uScale: { value: 1.0 },
    },
    vertexShader: starVertexShader,
    fragmentShader: starFragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  });
}
