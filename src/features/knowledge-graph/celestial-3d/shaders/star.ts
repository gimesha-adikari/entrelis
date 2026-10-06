import * as THREE from "three";

export interface StarSurfaceMaterialParams {
  readonly surfaceTexture: THREE.Texture;
  readonly coreColor?: THREE.ColorRepresentation;
  readonly midColor?: THREE.ColorRepresentation;
  readonly limbColor?: THREE.ColorRepresentation;
  readonly limbDarkening?: number;
  readonly intensity?: number;
}

/**
 * Custom Stellar Surface Shader for Stars (Golden, Blue-White, Ember).
 * Emits self-light with true limb darkening, organic convection cell mixing,
 * and high dynamic range without center burnout.
 */
export function createStarSurfaceMaterial(
  params: StarSurfaceMaterialParams | THREE.Texture
): THREE.ShaderMaterial {
  const config: StarSurfaceMaterialParams =
    params instanceof THREE.Texture ? { surfaceTexture: params } : params;

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

      // Multi-layer granulation mix: cell centers are radiant core, boundaries are limb color
      vec3 surfaceColor = mix(uLimbColor, uMidColor, smoothstep(0.12, 0.55, cellVal));
      surfaceColor = mix(surfaceColor, uCoreColor, smoothstep(0.55, 0.92, cellVal));

      // Apply natural stellar limb darkening
      surfaceColor *= limbFactor;

      gl_FragColor = vec4(surfaceColor * uIntensity, 1.0);
    }
  `;

  return new THREE.ShaderMaterial({
    uniforms: {
      uSurfaceMap: { value: config.surfaceTexture },
      uCoreColor: { value: new THREE.Color(config.coreColor ?? 0xffffff) },
      uMidColor: { value: new THREE.Color(config.midColor ?? 0xfef08a) },
      uLimbColor: { value: new THREE.Color(config.limbColor ?? 0xf59e0b) },
      uLimbDarkening: { value: config.limbDarkening ?? 0.35 },
      uIntensity: { value: config.intensity ?? 1.55 },
    },
    vertexShader,
    fragmentShader,
    side: THREE.FrontSide,
  });
}
