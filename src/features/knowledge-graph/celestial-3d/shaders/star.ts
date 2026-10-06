import * as THREE from "three";

export interface StarSurfaceMaterialParams {
  readonly surfaceTexture: THREE.Texture;
  readonly coreColor?: THREE.ColorRepresentation;
  readonly midColor?: THREE.ColorRepresentation;
  readonly limbColor?: THREE.ColorRepresentation;
  readonly limbDarkening?: number;
  readonly intensity?: number;
  readonly rimColor?: THREE.ColorRepresentation;
  readonly rimStrength?: number;
  readonly hover?: number;
}

/**
 * Custom Stellar Surface Shader for Stars (Golden, Blue-White, Ember).
 * Emits self-light with true limb darkening, organic convection dynamics,
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
    uniform vec3 uRimColor;
    uniform float uRimStrength;
    uniform float uHover;

    varying vec2 vUv;
    varying vec3 vNormal;

    void main() {
      vec4 tex = texture2D(uSurfaceMap, vUv);
      vec3 surfaceColor = tex.rgb;
      float hotBoost = tex.a;

      // In orthographic projection, view-space NdotV is vNormal.z
      float NdotV = max(0.0, vNormal.z);
      float limbFactor = 1.0 - uLimbDarkening * pow(1.0 - NdotV, 1.25);

      // Hottest core maintains radiance even near limb; darker lanes darken strongly
      float dynamicLimb = mix(limbFactor, 1.0, clamp(hotBoost * 0.7, 0.0, 1.0));
      surfaceColor *= dynamicLimb;

      // Subtle limb rim brightening for compact stars (Blue-White)
      if (uRimStrength > 0.0) {
        float rim = pow(1.0 - NdotV, 3.0) * uRimStrength;
        surfaceColor += uRimColor * rim;
      }

      // Very subtle hover gain (+2.5%)
      float hoverGain = 1.0 + uHover * 0.025;

      gl_FragColor = vec4(surfaceColor * uIntensity * hoverGain, 1.0);
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
      uRimColor: { value: new THREE.Color(config.rimColor ?? 0x7dd3fc) },
      uRimStrength: { value: config.rimStrength ?? 0.0 },
      uHover: { value: config.hover ?? 0.0 },
    },
    vertexShader,
    fragmentShader,
    side: THREE.FrontSide,
  });
}
