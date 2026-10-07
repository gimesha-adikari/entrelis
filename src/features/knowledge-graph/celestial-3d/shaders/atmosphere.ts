import * as THREE from "three";

export interface AtmosphereMaterialParams {
  readonly color: THREE.ColorRepresentation;
  readonly fresnelPower?: number;
  readonly intensity?: number;
  readonly litRimBoost?: number;
  readonly lightDirection?: THREE.Vector3;
}

/**
 * Custom Fresnel Atmosphere Shader for Gas, Ice, and Life worlds.
 * Designed for Orthographic camera where view-direction is parallel to Z-axis (0, 0, 1).
 * Provides soft limb scattering that is strongest at grazing angles and transparent face-on.
 */
export function createAtmosphereMaterial(params: AtmosphereMaterialParams): THREE.ShaderMaterial {
  const lightDir = (params.lightDirection ?? new THREE.Vector3(-2.0, 2.4, 3.0)).clone().normalize();

  const vertexShader = `
    varying vec3 vNormal;

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
    uniform float uNodeOpacity;

    varying vec3 vNormal;

    void main() {
      // In orthographic view-space, view direction is strictly (0, 0, 1)
      float NdotV = max(0.0, vNormal.z);
      float fresnel = pow(1.0 - NdotV, uFresnelPower);

      // Light direction in view-space
      float NdotL = max(0.0, dot(vNormal, uLightDir));
      float scatter = clamp(fresnel * (1.0 + NdotL * uLitRimBoost) * uIntensity, 0.0, 1.0);

      gl_FragColor = vec4(uColor, scatter * uNodeOpacity);
    }
  `;

  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(params.color) },
      uFresnelPower: { value: params.fresnelPower ?? 2.8 },
      uIntensity: { value: params.intensity ?? 0.8 },
      uLightDir: { value: lightDir },
      uLitRimBoost: { value: params.litRimBoost ?? 1.2 },
      uNodeOpacity: { value: 1.0 },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    side: THREE.FrontSide,
  });
}
