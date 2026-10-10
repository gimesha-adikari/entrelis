import * as THREE from "three";

export interface DeepSpaceMaterialUniforms {
  uTime: THREE.IUniform<number>;
  uResolution: THREE.IUniform<THREE.Vector2>;
  uParallaxOffset: THREE.IUniform<THREE.Vector2>;
  uTravelOffset: THREE.IUniform<THREE.Vector2>;
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
  uniform vec2 uTravelOffset;
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

  // 3-octave FBM for organic cloud structure
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
    // Screen aspect normalized coordinate with manual parallax + travel offset
    vec2 totalOffset = uParallaxOffset + uTravelOffset;
    vec2 aspectCoord = (vWorldPos + totalOffset) / max(uResolution.y, 1.0);

    // Imperceptible slow nebula drift
    vec2 drift = vec2(uTime * 0.004, uTime * 0.0025) * uMotionStrength;

    // Subtle domain shear during active selection travel
    vec2 travelShear = vec2(uTravelOffset.y, -uTravelOffset.x) * 0.00015;
    vec2 st = aspectCoord * 1.35 + drift + travelShear;

    // Domain-warped cosmic gas coordinates (Inigo Quilez warp formulation)
    vec2 q = vec2(fbm(st * 0.85), fbm(st * 0.85 + vec2(5.2, 1.3)));
    vec2 r = vec2(
      fbm(st * 1.15 + 1.2 * q + vec2(1.7, 9.2)),
      fbm(st * 1.15 + 1.2 * q + vec2(8.3, 2.8))
    );
    float gas = fbm(st * 1.35 + 1.3 * r);

    // Macro cloud structure vs quiet empty voids
    float cloud = smoothstep(0.32, 0.68, gas);
    float violet = smoothstep(0.36, 0.72, q.y);
    float filament = smoothstep(0.48, 0.78, r.x);

    // Dark molecular absorption dust lanes (subtractive channels)
    float dust = smoothstep(0.04, 0.26, abs(r.y - 0.46));

    // Deep space palette: scientifically restrained, cinematic, clearly legible
    vec3 cVoidBase = vec3(0.012, 0.016, 0.028); // #030407 near-black void
    vec3 cNavy     = vec3(0.055, 0.110, 0.220); // #0e1c38 deep cosmic navy cloud
    vec3 cViolet   = vec3(0.095, 0.055, 0.170); // #180e2b muted cosmic violet dust
    vec3 cIndigo   = vec3(0.080, 0.145, 0.280); // #142547 luminous indigo filament
    vec3 cCyan     = vec3(0.040, 0.110, 0.180); // #0a1c2e subtle cyan haze

    vec3 color = cVoidBase;

    // Blend navy cloud into active macro structures
    color = mix(color, cNavy, cloud * 0.88);

    // Blend muted cosmic violet in secondary folds
    color = mix(color, cViolet, violet * cloud * 0.75);

    // Luminous indigo filamentary ridges
    color += cIndigo * (filament * cloud * 0.65);

    // Subtractive dark molecular dust absorption lanes
    color = mix(cVoidBase * 0.75, color, dust);

    // Subtle unresolved star-cloud haze
    float haze = pow(noise(st * 3.8 + r * 0.4), 3.0) * 0.45 * cloud * dust;
    color += cCyan * haze;

    // Soft vignetting towards edges
    vec2 centerOffset = (vUv - 0.5) * 2.0;
    float vignette = 1.0 - dot(centerOffset, centerOffset) * 0.20;
    color *= clamp(vignette, 0.78, 1.0);

    gl_FragColor = vec4(color, 1.0);
  }
`;

export function createDeepSpaceMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1280, 800) },
      uParallaxOffset: { value: new THREE.Vector2(0, 0) },
      uTravelOffset: { value: new THREE.Vector2(0, 0) },
      uMotionStrength: { value: 1.0 },
    },
    vertexShader,
    fragmentShader,
    depthWrite: false,
    depthTest: false,
    transparent: false,
  });
}
