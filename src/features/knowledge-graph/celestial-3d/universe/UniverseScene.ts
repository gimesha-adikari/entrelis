import * as THREE from "three";
import type { ViewportTransform } from "../../types";
import { createDeepSpaceMaterial } from "./deep-space-shader";
import { createStarMaterial } from "./star-shader";
import { generateStarFieldGeometry, type StarTier } from "./star-field-generator";
import {
  computeTravelOffsets,
  type TravelOffsets,
  type UniverseTravelState,
  ZERO_TRAVEL_OFFSETS,
} from "./travel";

export interface UniverseSceneOptions {
  readonly width: number;
  readonly height: number;
  readonly isMobile: boolean;
  readonly pixelRatio: number;
  readonly prefersReducedMotion: boolean;
}

export interface ParallaxOffsets {
  readonly nebula: { x: number; y: number };
  readonly far: { x: number; y: number };
  readonly mid: { x: number; y: number };
  readonly bright: { x: number; y: number };
}

// Subordinate parallax rates relative to primary celestial transform (1.0)
const PARALLAX_RATES = {
  nebula: 0.02,
  far: 0.04,
  mid: 0.08,
  bright: 0.14,
} as const;

// Deterministic seed constants
const UNIVERSE_SEEDS = {
  far: 42001,
  mid: 42002,
  bright: 42003,
} as const;

/**
 * Manages the background universe scene (procedural space shader + batched star fields).
 * Runs through the shared production WebGLRenderer before the celestial concept bodies.
 */
export class UniverseScene {
  public readonly scene = new THREE.Scene();
  public readonly camera: THREE.OrthographicCamera;

  private backgroundMesh: THREE.Mesh;
  private backgroundGeometry: THREE.PlaneGeometry;
  private backgroundMaterial: THREE.ShaderMaterial;

  private starPoints = new Map<StarTier, THREE.Points>();
  private starGeometries = new Map<StarTier, THREE.BufferGeometry>();
  private starMaterials = new Map<StarTier, THREE.ShaderMaterial>();

  private width: number;
  private height: number;
  private isMobile: boolean;
  private pixelRatio: number;
  private prefersReducedMotion: boolean;

  private currentOffsets: ParallaxOffsets = ZERO_TRAVEL_OFFSETS;
  private currentTravelOffsets: TravelOffsets = ZERO_TRAVEL_OFFSETS;

  constructor(options: UniverseSceneOptions) {
    this.width = options.width;
    this.height = options.height;
    this.isMobile = options.isMobile;
    this.pixelRatio = options.pixelRatio;
    this.prefersReducedMotion = options.prefersReducedMotion;

    this.camera = new THREE.OrthographicCamera(
      -this.width / 2,
      this.width / 2,
      this.height / 2,
      -this.height / 2,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 100);

    // 1. Fullscreen Procedural Deep-Space Background Plane
    const planeW = Math.max(this.width * 2.2, 3600);
    const planeH = Math.max(this.height * 2.2, 2400);
    this.backgroundGeometry = new THREE.PlaneGeometry(planeW, planeH);
    this.backgroundMaterial = createDeepSpaceMaterial();
    this.backgroundMaterial.uniforms["uResolution"]!.value.set(this.width, this.height);
    this.backgroundMaterial.uniforms["uMotionStrength"]!.value = this.prefersReducedMotion
      ? 0.0
      : 1.0;

    this.backgroundMesh = new THREE.Mesh(this.backgroundGeometry, this.backgroundMaterial);
    this.backgroundMesh.position.set(0, 0, -200);
    this.scene.add(this.backgroundMesh);

    // 2. Batched Star Fields (Far, Mid, Bright)
    const tiers: StarTier[] = ["far", "mid", "bright"];
    const areaW = Math.max(this.width * 2.6, 4200);
    const areaH = Math.max(this.height * 2.6, 3000);

    for (const tier of tiers) {
      const geometry = generateStarFieldGeometry({
        tier,
        isMobile: this.isMobile,
        seed: UNIVERSE_SEEDS[tier],
        areaWidth: areaW,
        areaHeight: areaH,
      });

      const material = createStarMaterial();
      material.uniforms["uPixelRatio"]!.value = this.pixelRatio;
      material.uniforms["uMotionStrength"]!.value = this.prefersReducedMotion ? 0.0 : 1.0;
      material.uniforms["uFieldSize"]!.value.set(areaW, areaH);

      const points = new THREE.Points(geometry, material);
      points.frustumCulled = false;

      this.starGeometries.set(tier, geometry);
      this.starMaterials.set(tier, material);
      this.starPoints.set(tier, points);

      this.scene.add(points);
    }
  }

  public get motionStrength(): number {
    return this.backgroundMaterial.uniforms["uMotionStrength"]!.value;
  }

  public getParallaxOffsets(): ParallaxOffsets {
    return this.currentOffsets;
  }

  public getTravelOffsets(): TravelOffsets {
    return this.currentTravelOffsets;
  }

  public setPrefersReducedMotion(reduced: boolean): void {
    this.prefersReducedMotion = reduced;
    const strength = reduced ? 0.0 : 1.0;
    this.backgroundMaterial.uniforms["uMotionStrength"]!.value = strength;
    for (const material of this.starMaterials.values()) {
      material.uniforms["uMotionStrength"]!.value = strength;
    }
  }

  public resize(width: number, height: number, pixelRatio: number): void {
    if (width <= 0 || height <= 0) return;
    this.width = width;
    this.height = height;
    this.pixelRatio = pixelRatio;

    this.camera.left = -width / 2;
    this.camera.right = width / 2;
    this.camera.top = height / 2;
    this.camera.bottom = -height / 2;
    this.camera.updateProjectionMatrix();

    this.backgroundMaterial.uniforms["uResolution"]!.value.set(width, height);
    for (const material of this.starMaterials.values()) {
      material.uniforms["uPixelRatio"]!.value = pixelRatio;
    }
  }

  public update(
    deltaSec: number,
    elapsedTime: number,
    transform: ViewportTransform,
    travel?: UniverseTravelState | null
  ): void {
    const timeVal = this.prefersReducedMotion ? 0 : elapsedTime;

    // 1. Manual Viewport Parallax Offsets
    const nebX = transform.x * PARALLAX_RATES.nebula;
    const nebY = -transform.y * PARALLAX_RATES.nebula;
    const farX = transform.x * PARALLAX_RATES.far;
    const farY = -transform.y * PARALLAX_RATES.far;
    const midX = transform.x * PARALLAX_RATES.mid;
    const midY = -transform.y * PARALLAX_RATES.mid;
    const brightX = transform.x * PARALLAX_RATES.bright;
    const brightY = -transform.y * PARALLAX_RATES.bright;

    this.currentOffsets = {
      nebula: { x: nebX, y: nebY },
      far: { x: farX, y: farY },
      mid: { x: midX, y: midY },
      bright: { x: brightX, y: brightY },
    };

    // 2. Selection-Driven Universe Travel Displacement & Scale
    const travelOffsets = computeTravelOffsets(travel, this.prefersReducedMotion);
    this.currentTravelOffsets = travelOffsets;

    // Update background shader
    this.backgroundMaterial.uniforms["uTime"]!.value = timeVal;
    this.backgroundMaterial.uniforms["uParallaxOffset"]!.value.set(nebX, nebY);
    this.backgroundMaterial.uniforms["uTravelOffset"]!.value.set(
      travelOffsets.nebula.x,
      travelOffsets.nebula.y
    );

    // Update star fields
    const starTiers: StarTier[] = ["far", "mid", "bright"];
    for (const tier of starTiers) {
      const mat = this.starMaterials.get(tier);
      if (mat) {
        mat.uniforms["uTime"]!.value = timeVal;
        mat.uniforms["uParallaxOffset"]!.value.set(
          this.currentOffsets[tier].x,
          this.currentOffsets[tier].y
        );
        mat.uniforms["uTravelOffset"]!.value.set(travelOffsets[tier].x, travelOffsets[tier].y);
      }
    }
  }

  public render(renderer: THREE.WebGLRenderer): void {
    renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.scene.remove(this.backgroundMesh);
    this.backgroundGeometry.dispose();
    this.backgroundMaterial.dispose();

    for (const [tier, points] of this.starPoints.entries()) {
      this.scene.remove(points);
      this.starGeometries.get(tier)?.dispose();
      this.starMaterials.get(tier)?.dispose();
    }

    this.starPoints.clear();
    this.starGeometries.clear();
    this.starMaterials.clear();
  }
}
