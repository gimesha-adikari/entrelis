import * as THREE from "three";

/**
 * Custom Fresnel Atmosphere Shader for Gas and Ice worlds.
 * Designed for Orthographic camera where view-direction is parallel to Z-axis (0, 0, 1).
 * Provides soft limb scattering that is strongest at grazing angles and transparent face-on.
 */
export function createAtmosphereMaterial(params: {
  color: THREE.ColorRepresentation;
  fresnelPower?: number;
  intensity?: number;
  litRimBoost?: number;
  lightDirection?: THREE.Vector3;
}): THREE.ShaderMaterial {
  const lightDir = (params.lightDirection ?? new THREE.Vector3(-2.0, 2.4, 3.0)).clone().normalize();

  const vertexShader = `
    varying vec3 vNormal;
    varying vec3 vViewNormal;

    void main() {
      // Normal in view-space
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform vec3 uColor;
    uniform float uFresnelPower;
    uniform float uIntensity;
    uniform vec3 uLightDir;
    uniform float uLitRimBoost;

    varying vec3 vNormal;

    void main() {
      // In orthographic view-space, view direction is strictly (0, 0, 1)
      float NdotV = max(0.0, vNormal.z);
      float fresnel = pow(1.0 - NdotV, uFresnelPower);

      // Light direction in view-space
      float NdotL = max(0.0, dot(vNormal, uLightDir));
      float scatter = clamp(fresnel * (1.0 + NdotL * uLitRimBoost) * uIntensity, 0.0, 1.0);

      gl_FragColor = vec4(uColor, scatter);
    }
  `;

  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(params.color) },
      uFresnelPower: { value: params.fresnelPower ?? 2.8 },
      uIntensity: { value: params.intensity ?? 0.8 },
      uLightDir: { value: lightDir },
      uLitRimBoost: { value: params.litRimBoost ?? 1.2 },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    side: THREE.FrontSide,
  });
}

/**
 * Custom Stellar Surface Shader for Luminous Star.
 * Emits self-light with true limb darkening, organic convection cell mixing,
 * and high dynamic range without center burnout or perspective parallax.
 */
export function createStarSurfaceMaterial(surfaceTexture: THREE.Texture): THREE.ShaderMaterial {
  const vertexShader = `
    varying vec2 vUv;
    varying vec3 vNormal;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform sampler2D uSurfaceMap;
    uniform vec3 uCoreColor;
    uniform vec3 uMidColor;
    uniform vec3 uLimbColor;
    uniform float uLimbDarkening;
    uniform float uIntensity;

    varying vec2 vUv;
    varying vec3 vNormal;

    void main() {
      vec4 tex = texture2D(uSurfaceMap, vUv);
      float cellVal = tex.r;

      // In orthographic projection, view-space NdotV is simply vNormal.z
      float NdotV = max(0.0, vNormal.z);
      float limbFactor = 1.0 - uLimbDarkening * (1.0 - NdotV);

      // Multi-layer granulation mix: cell centers are white-gold, intergranular lanes are amber
      vec3 surfaceColor = mix(uLimbColor, uMidColor, smoothstep(0.12, 0.55, cellVal));
      surfaceColor = mix(surfaceColor, uCoreColor, smoothstep(0.55, 0.92, cellVal));

      // Apply natural stellar limb darkening
      surfaceColor *= limbFactor;

      gl_FragColor = vec4(surfaceColor * uIntensity, 1.0);
    }
  `;

  return new THREE.ShaderMaterial({
    uniforms: {
      uSurfaceMap: { value: surfaceTexture },
      uCoreColor: { value: new THREE.Color(0xffffff) }, // Radiant white-gold core
      uMidColor: { value: new THREE.Color(0xfef08a) }, // Brilliant solar gold
      uLimbColor: { value: new THREE.Color(0xf59e0b) }, // Warm intergranular amber
      uLimbDarkening: { value: 0.35 },
      uIntensity: { value: 1.55 },
    },
    vertexShader,
    fragmentShader,
    side: THREE.FrontSide,
  });
}
