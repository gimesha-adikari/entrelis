import * as THREE from "three";
import {
  createRockyTextures,
  createGasTexture,
  createIceTextures,
  createStarTextures,
  disposeAllCelestialTextures,
} from "./textures";
import { createAtmosphereMaterial, createStarSurfaceMaterial } from "./shaders";

export interface Celestial3DConfig {
  readonly canvas: HTMLCanvasElement;
  readonly targetFps?: number; // Defaults to 30fps
  readonly onHoverChange?: (archetype: string | null) => void;
}

export interface CelestialMeshInfo {
  readonly archetype: "star" | "rocky" | "gas" | "ice";
  readonly mesh: THREE.Mesh;
  readonly basePosition: THREE.Vector3;
  readonly baseRotationSpeed: number; // rad/s
  readonly tiltZ: number; // axial tilt in radians
  baseEmissiveIntensity: number;
}

interface AtmosphereShellInfo {
  readonly archetype: "gas" | "ice";
  readonly mesh: THREE.Mesh;
  readonly material: THREE.ShaderMaterial;
  readonly rotationSpeed: number;
  readonly baseIntensity: number;
}

export class Celestial3DController {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private targetFps: number;
  private onHoverChange?: (archetype: string | null) => void;

  private sharedGeometry: THREE.SphereGeometry | null = null;
  private sharedAtmosphereGeometryGas: THREE.SphereGeometry | null = null;
  private sharedAtmosphereGeometryIce: THREE.SphereGeometry | null = null;

  private meshes: CelestialMeshInfo[] = [];
  private atmosphereShells: AtmosphereShellInfo[] = [];
  private starCoronaSprite: THREE.Sprite | null = null;
  private starShaderMaterial: THREE.ShaderMaterial | null = null;

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2(-999, -999);
  private hoveredArchetype: string | null = null;

  private animationFrameId: number | null = null;
  private lastFrameTime = 0;
  private elapsedTime = 0;
  private isDisposed = false;
  private isTabHidden = false;
  private prefersReducedMotion = false;

  private width = 800;
  private height = 600;

  // Bound event listener references for clean removal
  private handleVisibilityChangeBound: () => void;
  private handlePointerMoveBound: (e: PointerEvent) => void;
  private handlePointerLeaveBound: () => void;

  constructor(config: Celestial3DConfig) {
    this.canvas = config.canvas;
    // Target 30fps as primary performance and battery baseline
    this.targetFps = config.targetFps ?? 30;
    this.onHoverChange = config.onHoverChange;

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-400, 400, 300, -300, 0.1, 2000);
    this.camera.position.set(0, 0, 500);

    this.handleVisibilityChangeBound = this.handleVisibilityChange.bind(this);
    this.handlePointerMoveBound = this.handlePointerMove.bind(this);
    this.handlePointerLeaveBound = this.handlePointerLeave.bind(this);

    this.init();
  }

  private init(): void {
    // 1. WebGLRenderer with capped DPR and ACES Filmic Tone Mapping
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
      const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
      this.renderer.setPixelRatio(dpr);
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.05;
    } catch {
      // In non-WebGL environments (e.g. Node/JSDOM), degrade gracefully without throwing
      this.renderer = null;
    }

    // 2. Coherent Cinematic Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    // Key light from upper-left and slightly front
    const keyLight = new THREE.DirectionalLight(0xfff7ed, 3.2);
    keyLight.position.set(-2.0, 2.4, 3.0).normalize();
    this.scene.add(keyLight);

    // Subtle cool fill from lower-right
    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.42);
    fillLight.position.set(2.5, -1.5, -1.0).normalize();
    this.scene.add(fillLight);

    // 3. Shared Spherical Geometries (radius 50 = 100px diameter)
    const sphereRadius = 50;
    this.sharedGeometry = new THREE.SphereGeometry(sphereRadius, 48, 36);
    this.sharedAtmosphereGeometryGas = new THREE.SphereGeometry(sphereRadius * 1.022, 36, 28);
    this.sharedAtmosphereGeometryIce = new THREE.SphereGeometry(sphereRadius * 1.016, 36, 28);

    // 4. Create the 4 Celestial Worlds
    this.createBodies(sphereRadius);

    // 5. Reduced Motion Detection
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      this.prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    // 6. Event Listeners
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.handleVisibilityChangeBound);
    }
    this.canvas.addEventListener("pointermove", this.handlePointerMoveBound);
    this.canvas.addEventListener("pointerleave", this.handlePointerLeaveBound);

    // 7. Initial Size Setup
    this.resize(this.canvas.clientWidth || 800, this.canvas.clientHeight || 600);

    // 8. Start Loop or Render Static Frame
    if (this.prefersReducedMotion) {
      this.renderFrame(0);
    } else {
      this.startLoop();
    }
  }

  private configureTextureAnisotropy(texture: THREE.Texture | null): void {
    if (!texture || !this.renderer) {
      return;
    }
    const maxAnisotropy = Math.min(this.renderer.capabilities.getMaxAnisotropy(), 8);
    texture.anisotropy = maxAnisotropy;
  }

  private createBodies(radius: number): void {
    if (!this.sharedGeometry) {
      return;
    }

    // --- 1. Luminous Star (Top-Left) ---
    const starTextures = createStarTextures(303);
    if (starTextures.surface) {
      this.configureTextureAnisotropy(starTextures.surface);
      this.starShaderMaterial = createStarSurfaceMaterial(starTextures.surface);
    } else {
      this.starShaderMaterial = new THREE.ShaderMaterial();
    }

    const starMesh = new THREE.Mesh(this.sharedGeometry, this.starShaderMaterial);
    this.scene.add(starMesh);

    // Star Corona Billboard Sprite
    if (starTextures.corona) {
      const coronaMat = new THREE.SpriteMaterial({
        map: starTextures.corona,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0.88,
      });
      const starCorona = new THREE.Sprite(coronaMat);
      starCorona.scale.set(radius * 4.2, radius * 4.2, 1);
      this.scene.add(starCorona);
      this.starCoronaSprite = starCorona;
    }

    this.meshes.push({
      archetype: "star",
      mesh: starMesh,
      basePosition: new THREE.Vector3(),
      baseRotationSpeed: (Math.PI * 2) / 85, // 85s per revolution
      tiltZ: 0.08,
      baseEmissiveIntensity: 0.95,
    });

    // --- 2. Rocky World (Top-Right) ---
    const rockyTextures = createRockyTextures(42);
    this.configureTextureAnisotropy(rockyTextures.diffuse);
    this.configureTextureAnisotropy(rockyTextures.bump);
    this.configureTextureAnisotropy(rockyTextures.roughness);

    const rockyMat = new THREE.MeshStandardMaterial({
      map: rockyTextures.diffuse,
      bumpMap: rockyTextures.bump,
      bumpScale: 2.6,
      roughnessMap: rockyTextures.roughness,
      roughness: 0.78,
      metalness: 0.02,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0.0,
    });
    const rockyMesh = new THREE.Mesh(this.sharedGeometry, rockyMat);
    this.scene.add(rockyMesh);

    this.meshes.push({
      archetype: "rocky",
      mesh: rockyMesh,
      basePosition: new THREE.Vector3(),
      baseRotationSpeed: (Math.PI * 2) / 60, // 60s per revolution
      tiltZ: 0.26, // ~15° axial tilt
      baseEmissiveIntensity: 0.0,
    });

    // --- 3. Atmospheric / Gas World (Bottom-Left) ---
    const gasTexture = createGasTexture(101);
    this.configureTextureAnisotropy(gasTexture);

    const gasMat = new THREE.MeshStandardMaterial({
      map: gasTexture,
      roughness: 0.65,
      metalness: 0.0,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0.0,
    });
    const gasMesh = new THREE.Mesh(this.sharedGeometry, gasMat);
    this.scene.add(gasMesh);

    // Gas Atmosphere Shell
    if (this.sharedAtmosphereGeometryGas) {
      const gasAtmMat = createAtmosphereMaterial({
        color: 0x38bdf8,
        fresnelPower: 2.8,
        intensity: 0.8,
        litRimBoost: 1.4,
      });
      const gasAtmMesh = new THREE.Mesh(this.sharedAtmosphereGeometryGas, gasAtmMat);
      gasMesh.add(gasAtmMesh);

      this.atmosphereShells.push({
        archetype: "gas",
        mesh: gasAtmMesh,
        material: gasAtmMat,
        rotationSpeed: (Math.PI * 2) / 42, // differential rotation (42s vs 48s)
        baseIntensity: 0.8,
      });
    }

    this.meshes.push({
      archetype: "gas",
      mesh: gasMesh,
      basePosition: new THREE.Vector3(),
      baseRotationSpeed: (Math.PI * 2) / 48, // 48s per revolution
      tiltZ: 0.14, // ~8° axial tilt
      baseEmissiveIntensity: 0.0,
    });

    // --- 4. Ice / Crystal World (Bottom-Right) ---
    const iceTextures = createIceTextures(202);
    this.configureTextureAnisotropy(iceTextures.diffuse);
    this.configureTextureAnisotropy(iceTextures.roughness);
    this.configureTextureAnisotropy(iceTextures.bump);

    const iceMat = new THREE.MeshStandardMaterial({
      map: iceTextures.diffuse,
      roughnessMap: iceTextures.roughness,
      bumpMap: iceTextures.bump,
      bumpScale: 1.0,
      roughness: 0.65,
      metalness: 0.02,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0.0,
    });
    const iceMesh = new THREE.Mesh(this.sharedGeometry, iceMat);
    this.scene.add(iceMesh);

    // Ice Atmosphere / Scattering Shell
    if (this.sharedAtmosphereGeometryIce) {
      const iceAtmMat = createAtmosphereMaterial({
        color: 0xbae6fd,
        fresnelPower: 3.8,
        intensity: 0.55,
        litRimBoost: 1.1,
      });
      const iceAtmMesh = new THREE.Mesh(this.sharedAtmosphereGeometryIce, iceAtmMat);
      iceMesh.add(iceAtmMesh);

      this.atmosphereShells.push({
        archetype: "ice",
        mesh: iceAtmMesh,
        material: iceAtmMat,
        rotationSpeed: (Math.PI * 2) / 65,
        baseIntensity: 0.55,
      });
    }

    this.meshes.push({
      archetype: "ice",
      mesh: iceMesh,
      basePosition: new THREE.Vector3(),
      baseRotationSpeed: (Math.PI * 2) / 72, // 72s per revolution
      tiltZ: 0.38, // ~22° axial tilt
      baseEmissiveIntensity: 0.0,
    });

    // Apply axial tilts to planetary coordinate frames
    for (const info of this.meshes) {
      info.mesh.rotation.z = info.tiltZ;
    }
  }

  /**
   * Resizes renderer and updates orthographic projection.
   */
  public resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) {
      return;
    }
    this.width = width;
    this.height = height;

    this.camera.left = -width / 2;
    this.camera.right = width / 2;
    this.camera.top = height / 2;
    this.camera.bottom = -height / 2;
    this.camera.updateProjectionMatrix();

    if (this.renderer) {
      this.renderer.setSize(width, height, false);
    }

    // Position the 4 meshes in a balanced 2x2 layout
    const spacingX = Math.min(200, width * 0.26);
    const spacingY = Math.min(150, height * 0.25);

    for (const info of this.meshes) {
      if (info.archetype === "star") {
        info.basePosition.set(-spacingX, spacingY, 0);
        if (this.starCoronaSprite) {
          this.starCoronaSprite.position.copy(info.basePosition);
        }
      } else if (info.archetype === "rocky") {
        info.basePosition.set(spacingX, spacingY, 0);
      } else if (info.archetype === "gas") {
        info.basePosition.set(-spacingX, -spacingY, 0);
      } else if (info.archetype === "ice") {
        info.basePosition.set(spacingX, -spacingY, 0);
      }
      info.mesh.position.copy(info.basePosition);
    }

    if (this.prefersReducedMotion) {
      this.renderFrame(0);
    }
  }

  private handlePointerMove(e: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return;
    }

    // Convert to Normalized Device Coordinates [-1, 1]
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

    // Raycast hover detection (only test primary planet sphere meshes)
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const interactiveMeshes = this.meshes.map((m) => m.mesh);
    const intersects = this.raycaster.intersectObjects(interactiveMeshes, false);

    let nextHover: string | null = null;
    if (intersects.length > 0) {
      const hit = intersects[0]?.object;
      const match = this.meshes.find((m) => m.mesh === hit);
      if (match) {
        nextHover = match.archetype;
      }
    }

    if (nextHover !== this.hoveredArchetype) {
      this.hoveredArchetype = nextHover;
      this.onHoverChange?.(this.hoveredArchetype);
      if (this.prefersReducedMotion) {
        this.renderFrame(0);
      }
    }
  }

  private handlePointerLeave(): void {
    this.mouse.set(-999, -999);
    if (this.hoveredArchetype !== null) {
      this.hoveredArchetype = null;
      this.onHoverChange?.(null);
      if (this.prefersReducedMotion) {
        this.renderFrame(0);
      }
    }
  }

  private handleVisibilityChange(): void {
    this.isTabHidden = typeof document !== "undefined" && document.hidden;
    if (!this.isTabHidden && this.animationFrameId === null && !this.prefersReducedMotion) {
      // Resume smoothly without an accumulated time delta
      this.lastFrameTime = performance.now();
      this.startLoop();
    }
  }

  private startLoop(): void {
    if (this.isDisposed || this.isTabHidden || this.prefersReducedMotion) {
      return;
    }

    const frameInterval = 1000 / this.targetFps;

    const tick = (now: number): void => {
      if (this.isDisposed) {
        return;
      }
      if (this.isTabHidden || this.prefersReducedMotion) {
        this.animationFrameId = null;
        return;
      }

      this.animationFrameId = requestAnimationFrame(tick);

      const deltaMs = now - this.lastFrameTime;
      if (deltaMs < frameInterval - 1) {
        return; // Throttled frame interval
      }

      const deltaSec = Math.min(0.1, deltaMs / 1000);
      this.lastFrameTime = now;
      this.elapsedTime += deltaSec;

      this.renderFrame(deltaSec);
    };

    this.lastFrameTime = performance.now();
    this.animationFrameId = requestAnimationFrame(tick);
  }

  /**
   * Renders a single frame. Can be called manually for static captures.
   */
  public renderFrame(deltaSec = 0): void {
    const shouldRotate = !this.prefersReducedMotion;

    // 1. Planetary Self-Rotation around own axis
    if (shouldRotate && deltaSec > 0) {
      for (const info of this.meshes) {
        info.mesh.rotation.y += deltaSec * info.baseRotationSpeed;
      }
      for (const atm of this.atmosphereShells) {
        atm.mesh.rotation.y += deltaSec * atm.rotationSpeed;
      }
    }

    // 2. Subtle Star Corona Breathing (8-14s cycle, 3-6% variation)
    if (this.starCoronaSprite && shouldRotate) {
      const breathScale = 1.0 + 0.04 * Math.sin(this.elapsedTime * ((Math.PI * 2) / 10));
      const baseRadius = 50 * 4.2;
      this.starCoronaSprite.scale.set(baseRadius * breathScale, baseRadius * breathScale, 1);
    }

    // 3. Hover Response (Center position strictly stationary, zero geometry translation)
    for (const info of this.meshes) {
      const isHovered = this.hoveredArchetype === info.archetype;
      if (info.archetype === "star") {
        if (this.starShaderMaterial) {
          const targetIntensity = isHovered ? 1.25 : 1.15;
          const current = (this.starShaderMaterial.uniforms["uIntensity"]?.value as number) ?? 1.15;
          this.starShaderMaterial.uniforms["uIntensity"]!.value =
            current + (targetIntensity - current) * 0.15;
        }
      } else {
        const mat = info.mesh.material as THREE.MeshStandardMaterial;
        if (mat && typeof mat.emissiveIntensity === "number") {
          const targetEmissive = isHovered ? 0.05 : 0.0;
          mat.emissiveIntensity += (targetEmissive - mat.emissiveIntensity) * 0.15;
        }
      }
    }

    for (const atm of this.atmosphereShells) {
      const isHovered = this.hoveredArchetype === atm.archetype;
      const targetIntensity = isHovered ? atm.baseIntensity + 0.12 : atm.baseIntensity;
      const current = (atm.material.uniforms["uIntensity"]?.value as number) ?? atm.baseIntensity;
      atm.material.uniforms["uIntensity"]!.value = current + (targetIntensity - current) * 0.15;
    }

    if (this.renderer) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  /**
   * Cleans up all Three.js resources, listeners, geometries, materials, and loops.
   */
  public dispose(): void {
    this.isDisposed = true;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.handleVisibilityChangeBound);
    }
    this.canvas.removeEventListener("pointermove", this.handlePointerMoveBound);
    this.canvas.removeEventListener("pointerleave", this.handlePointerLeaveBound);

    // Dispose atmosphere shells
    for (const atm of this.atmosphereShells) {
      atm.material.dispose();
      atm.mesh.parent?.remove(atm.mesh);
    }
    this.atmosphereShells = [];

    // Dispose meshes & materials
    for (const info of this.meshes) {
      if (info.mesh.material) {
        if (Array.isArray(info.mesh.material)) {
          info.mesh.material.forEach((m) => m.dispose());
        } else {
          info.mesh.material.dispose();
        }
      }
      this.scene.remove(info.mesh);
    }
    this.meshes = [];

    // Dispose star corona sprite
    if (this.starCoronaSprite) {
      if (this.starCoronaSprite.material) {
        this.starCoronaSprite.material.dispose();
      }
      this.starCoronaSprite = null;
    }

    if (this.starShaderMaterial) {
      this.starShaderMaterial.dispose();
      this.starShaderMaterial = null;
    }

    // Dispose shared geometries
    if (this.sharedGeometry) {
      this.sharedGeometry.dispose();
      this.sharedGeometry = null;
    }
    if (this.sharedAtmosphereGeometryGas) {
      this.sharedAtmosphereGeometryGas.dispose();
      this.sharedAtmosphereGeometryGas = null;
    }
    if (this.sharedAtmosphereGeometryIce) {
      this.sharedAtmosphereGeometryIce.dispose();
      this.sharedAtmosphereGeometryIce = null;
    }

    // Dispose cached procedural textures
    disposeAllCelestialTextures();

    // Dispose WebGLRenderer
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
  }

  // Getters for testing
  public getMeshes(): readonly CelestialMeshInfo[] {
    return this.meshes;
  }

  public getAtmosphereShells(): readonly AtmosphereShellInfo[] {
    return this.atmosphereShells;
  }

  public getHoveredArchetype(): string | null {
    return this.hoveredArchetype;
  }

  public getTargetFps(): number {
    return this.targetFps;
  }
}
