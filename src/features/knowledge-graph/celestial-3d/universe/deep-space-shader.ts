import * as THREE from "three";

export interface DeepSpaceMaterialUniforms {
  uTime: THREE.IUniform<number>;
  uResolution: THREE.IUniform<THREE.Vector2>;
  uParallaxOffset: THREE.IUniform<THREE.Vector2>;
  uMotionStrength: THREE.IUniform<number>;
}

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec2 vWorldPos;

  void main() {
    vUv = uv;
    vWorldPos = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uParallaxOffset;
  uniform float uMotionStrength;

  varying vec2 vUv;
  varying vec2 vWorldPos;

  // Lightweight 2D hash
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  // Smooth 2D value noise
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  // 3-octave FBM for low-frequency deep space cloud structure
  float fbm(vec2 p) {
    float v = 0.0;
    v += 0.55 * noise(p);
    p = p * 2.02 + vec2(1.3, 0.7);
    v += 0.30 * noise(p);
    p = p * 2.04 - vec2(0.6, 1.1);
    v += 0.15 * noise(p);
    return v;
  }

  void main() {
    // Screen aspect normalized coordinate with subtle parallax shift
    vec2 aspectCoord = (vWorldPos + uParallaxOffset) / max(uResolution.y, 1.0);

    // Imperceptible slow nebula drift
    vec2 drift = vec2(uTime * 0.006, uTime * 0.0035) * uMotionStrength;
    vec2 st = aspectCoord * 1.8 + drift;

    // Macro nebula structure (low frequency)
    float n1 = fbm(st);
    float n2 = fbm(st * 1.4 + vec2(n1 * 0.45, -n1 * 0.35));

    // Deep space palette: near-black, deep navy, dark violet, restrained indigo
    vec3 cNearBlack = vec3(0.008, 0.012, 0.024);   // #020306 base
    vec3 cNavy      = vec3(0.024, 0.040, 0.086);   // #060a16 deep navy lane
    vec3 cViolet    = vec3(0.038, 0.026, 0.078);   // #0a0714 dark violet dust
    vec3 cIndigo    = vec3(0.032, 0.062, 0.130);   // #081021 restrained indigo vein

    // Layer blend: subtle cosmic clouds
    vec3 color = cNearBlack;
    color = mix(color, cNavy, smoothstep(0.25, 0.75, n1) * 0.65);
    color = mix(color, cViolet, smoothstep(0.35, 0.85, n2) * 0.45);
    color = mix(color, cIndigo, smoothstep(0.48, 0.90, n1 * n2) * 0.35);

    // Soft vignetting towards edges to center the scene focus
    vec2 centerOffset = (vUv - 0.5) * 2.0;
    float vignette = 1.0 - dot(centerOffset, centerOffset) * 0.22;
    color *= clamp(vignette, 0.75, 1.0);

    gl_FragColor = vec4(color, 1.0);
  }
`;

export function createDeepSpaceMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1280, 800) },
      uParallaxOffset: { value: new THREE.Vector2(0, 0) },
      uMotionStrength: { value: 1.0 },
    },
    vertexShader,
    fragmentShader,
    depthWrite: false,
    depthTest: false,
    transparent: false,
  });
}
