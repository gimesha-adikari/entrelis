import * as THREE from "three";
import type { UniverseNode, UniverseScene } from "../scene/types";
import type { ViewportTransform } from "../types";
import { createCelestialObject, type CelestialBodyInstance } from "./archetypes/factory";
import { getConceptCelestialIdentity, type GeometryLOD } from "./identity";

const BODY_BASE_RADIUS = 50;
const DEFAULT_TARGET_FPS = 30;
const RENDERER_DPR_LIMIT = 2;

interface ProductionEntry {
  readonly id: string;
  identityKey: string;
  lod: GeometryLOD;
  body: CelestialBodyInstance;
  materialOpacityStates: readonly MaterialOpacityState[];
  elapsedSeconds: number;
  hovered: boolean;
  opacity: number;
}

interface MaterialOpacityState {
  readonly material: THREE.Material;
  readonly opacity: number;
  readonly transparent: boolean;
  readonly depthWrite: boolean;
}

export interface ProductionCelestialControllerDependencies {
  readonly createRenderer?: (canvas: HTMLCanvasElement) => THREE.WebGLRenderer;
  readonly createBody?: (
    identity: ReturnType<typeof getConceptCelestialIdentity>,
    lod: GeometryLOD,
    radius: number
  ) => CelestialBodyInstance;
}

/** Map production scene roles directly onto the catalog's existing geometry levels. */
export function roleToGeometryLod(role: UniverseNode["role"]): GeometryLOD {
  return role;
}

/** Project a Canvas scene point into orthographic WebGL view coordinates. */
export function projectUniverseNode(
  node: Pick<UniverseNode, "x" | "y">,
  transform: ViewportTransform
): { x: number; y: number } {
  return {
    x: transform.x + node.x * transform.k,
    y: -(transform.y + node.y * transform.k),
  };
}

function getIdentityKey(identity: ReturnType<typeof getConceptCelestialIdentity>): string {
  return JSON.stringify(identity);
}

function copyBodyOrientation(source: CelestialBodyInstance, target: CelestialBodyInstance): void {
  target.group.rotation.copy(source.group.rotation);
  target.primaryMesh.rotation.copy(source.primaryMesh.rotation);
  target.cloudShell?.rotation.copy(source.cloudShell?.rotation ?? new THREE.Euler());
  target.atmosphereShell?.rotation.copy(source.atmosphereShell?.rotation ?? new THREE.Euler());

  for (
    let index = 0;
    index < Math.min(source.moonInstances.length, target.moonInstances.length);
    index++
  ) {
    const sourceMoon = source.moonInstances[index]!;
    const targetMoon = target.moonInstances[index]!;
    targetMoon.pivot.rotation.copy(sourceMoon.pivot.rotation);
    targetMoon.mesh.rotation.copy(sourceMoon.mesh.rotation);
  }

  for (
    let clusterIndex = 0;
    clusterIndex < Math.min(source.debrisInstances.length, target.debrisInstances.length);
    clusterIndex++
  ) {
    const sourceFragments = source.debrisInstances[clusterIndex]!.fragments;
    const targetFragments = target.debrisInstances[clusterIndex]!.fragments;
    for (let index = 0; index < Math.min(sourceFragments.length, targetFragments.length); index++) {
      targetFragments[index]!.rotation.copy(sourceFragments[index]!.rotation);
    }
  }
}

function collectMaterialOpacityStates(body: CelestialBodyInstance): MaterialOpacityState[] {
  const states = new Map<THREE.Material, MaterialOpacityState>();
  body.group.traverse((object) => {
    if (!(object instanceof THREE.Mesh) && !(object instanceof THREE.Sprite)) return;

    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!states.has(material)) {
        states.set(material, {
          material,
          opacity: material.opacity,
          transparent: material.transparent,
          depthWrite: material.depthWrite,
        });
      }
    }
  });
  return [...states.values()];
}

function applyBodyOpacity(entry: ProductionEntry, opacity: number): void {
  for (const state of entry.materialOpacityStates) {
    const { material } = state;
    const clampedOpacity = Math.max(0, Math.min(1, opacity));
    const shouldFade = clampedOpacity < 0.999;
    const nextTransparent = shouldFade || state.transparent;
    const nextDepthWrite = shouldFade ? false : state.depthWrite;

    material.opacity = state.opacity * clampedOpacity;
    if (material.transparent !== nextTransparent || material.depthWrite !== nextDepthWrite) {
      material.transparent = nextTransparent;
      material.depthWrite = nextDepthWrite;
      material.needsUpdate = true;
    }

    if (material instanceof THREE.ShaderMaterial) {
      const nodeOpacity = material.uniforms["uNodeOpacity"];
      if (nodeOpacity) nodeOpacity.value = clampedOpacity;
    }
  }
}

/** Owns the one transparent WebGL renderer used by the production local universe. */
export class ProductionCelestialController {
  private readonly canvas: HTMLCanvasElement;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 2000);
  private readonly activeEntries = new Map<string, ProductionEntry>();
  private readonly targetFps = DEFAULT_TARGET_FPS;
  private readonly createRenderer: (canvas: HTMLCanvasElement) => THREE.WebGLRenderer;
  private readonly createBody: NonNullable<ProductionCelestialControllerDependencies["createBody"]>;
  private renderer: THREE.WebGLRenderer | null = null;
  private motionQuery: MediaQueryList | null = null;
  private animationFrameId: number | null = null;
  private lastFrameTime = 0;
  private elapsedTime = 0;
  private width = 1;
  private height = 1;
  private isDisposed = false;
  private isTabHidden = false;
  private prefersReducedMotion = false;

  private readonly handleVisibilityChange = (): void => {
    this.isTabHidden = document.hidden;
    if (this.isTabHidden) {
      this.stopLoop();
      return;
    }

    this.lastFrameTime = performance.now();
    this.renderFrame(0);
    this.startLoop();
  };

  private readonly handleMotionChange = (event: MediaQueryListEvent): void => {
    this.prefersReducedMotion = event.matches;
    if (this.prefersReducedMotion) {
      this.stopLoop();
      this.renderFrame(0);
      return;
    }

    this.startLoop();
  };

  constructor(
    canvas: HTMLCanvasElement,
    dependencies: ProductionCelestialControllerDependencies = {}
  ) {
    this.canvas = canvas;
    this.createRenderer =
      dependencies.createRenderer ??
      ((targetCanvas) =>
        new THREE.WebGLRenderer({
          canvas: targetCanvas,
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }));
    this.createBody = dependencies.createBody ?? createCelestialObject;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 3.2);
    keyLight.position.set(-2.0, 2.4, 3.0).normalize();
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.42);
    fillLight.position.set(2.5, -1.5, -1.0).normalize();
    this.scene.add(fillLight);

    if (dependencies.createRenderer || typeof WebGL2RenderingContext !== "undefined") {
      try {
        this.renderer = this.createRenderer(canvas);
        this.renderer.setPixelRatio(
          typeof window === "undefined"
            ? 1
            : Math.min(window.devicePixelRatio || 1, RENDERER_DPR_LIMIT)
        );
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.05;
        this.renderer.setClearColor(0x000000, 0);
      } catch {
        // Keep semantic access and Canvas rendering alive when WebGL is unavailable.
        this.renderer = null;
      }
    }

    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      this.motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      this.prefersReducedMotion = this.motionQuery.matches;
      this.motionQuery.addEventListener?.("change", this.handleMotionChange);
    }

    if (typeof document !== "undefined") {
      this.isTabHidden = document.hidden;
      document.addEventListener("visibilitychange", this.handleVisibilityChange);
    }

    this.camera.position.set(0, 0, 500);
    this.resize(canvas.clientWidth || 1, canvas.clientHeight || 1);
  }

  public get isAvailable(): boolean {
    return this.renderer !== null;
  }

  public update(
    displayedScene: UniverseScene,
    transform: ViewportTransform,
    width: number,
    height: number,
    hoveredNodeId: string | null
  ): void {
    if (this.isDisposed) return;

    this.resize(width, height);
    if (!this.renderer) return;

    const visibleIds = new Set<string>();

    for (const node of displayedScene.allNodes) {
      if (!Number.isFinite(node.x) || !Number.isFinite(node.y) || node.radius <= 0) continue;
      visibleIds.add(node.id);
      this.reconcileNode(node, transform, hoveredNodeId === node.id);
    }

    for (const [id, entry] of this.activeEntries) {
      if (!visibleIds.has(id)) {
        this.scene.remove(entry.body.group);
        entry.body.dispose();
        this.activeEntries.delete(id);
      }
    }

    if (this.prefersReducedMotion || this.activeEntries.size === 0) {
      this.stopLoop();
      this.renderFrame(0);
    } else {
      this.startLoop();
    }
  }

  private reconcileNode(
    node: UniverseNode,
    transform: ViewportTransform,
    isHovered: boolean
  ): void {
    const identity = getConceptCelestialIdentity(node.slug);
    const identityKey = getIdentityKey(identity);
    const lod = roleToGeometryLod(node.role);
    let entry = this.activeEntries.get(node.id);

    if (!entry) {
      const body = this.createBody(identity, lod, BODY_BASE_RADIUS)!;
      entry = {
        id: node.id,
        identityKey,
        lod,
        body,
        materialOpacityStates: collectMaterialOpacityStates(body),
        elapsedSeconds: 0,
        hovered: false,
        opacity: -1,
      };
      this.activeEntries.set(node.id, entry);
      body.group.userData["conceptId"] = node.id;
      this.scene.add(body.group);
    } else if (entry.identityKey !== identityKey || entry.lod !== lod) {
      const nextBody = this.createBody(identity, lod, BODY_BASE_RADIUS)!;
      copyBodyOrientation(entry.body, nextBody);
      nextBody.setHover(entry.hovered, this.prefersReducedMotion);
      this.scene.remove(entry.body.group);
      entry.body.dispose();
      entry.body = nextBody;
      entry.identityKey = identityKey;
      entry.lod = lod;
      entry.materialOpacityStates = collectMaterialOpacityStates(nextBody);
      entry.opacity = -1;
      nextBody.group.userData["conceptId"] = node.id;
      this.scene.add(nextBody.group);
    }

    entry.hovered = isHovered;
    const position = projectUniverseNode(node, transform);
    entry.body.group.position.set(position.x, position.y, roleDepth(node.role));
    entry.body.group.scale.setScalar(node.radius / BODY_BASE_RADIUS);
    entry.body.group.visible = node.opacity > 0.001;
    if (entry.opacity !== node.opacity) {
      applyBodyOpacity(entry, node.opacity);
      entry.opacity = node.opacity;
    }
    entry.body.setHover(isHovered, this.prefersReducedMotion);
  }

  private resize(width: number, height: number): void {
    if (width <= 0 || height <= 0 || (this.width === width && this.height === height)) return;
    this.width = width;
    this.height = height;
    this.camera.left = -width / 2;
    this.camera.right = width / 2;
    this.camera.top = height / 2;
    this.camera.bottom = -height / 2;
    this.camera.updateProjectionMatrix();
    this.renderer?.setSize(width, height, false);
  }

  private startLoop(): void {
    if (
      this.isDisposed ||
      this.isTabHidden ||
      this.prefersReducedMotion ||
      this.activeEntries.size === 0 ||
      this.animationFrameId !== null
    ) {
      return;
    }

    const frameInterval = 1000 / this.targetFps;
    this.lastFrameTime = performance.now();

    const tick = (now: number): void => {
      this.animationFrameId = null;
      if (this.isDisposed || this.isTabHidden || this.prefersReducedMotion) return;

      if (now - this.lastFrameTime >= frameInterval - 1) {
        const deltaSec = Math.min(0.1, (now - this.lastFrameTime) / 1000);
        this.lastFrameTime = now;
        this.renderFrame(deltaSec);
      }

      if (this.activeEntries.size > 0) {
        this.animationFrameId = requestAnimationFrame(tick);
      }
    };

    this.animationFrameId = requestAnimationFrame(tick);
  }

  private stopLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private renderFrame(deltaSec: number): void {
    if (this.isDisposed || this.isTabHidden) return;
    this.elapsedTime += deltaSec;
    for (const entry of this.activeEntries.values()) {
      entry.elapsedSeconds += deltaSec;
      entry.body.update(deltaSec, this.elapsedTime);
      entry.body.setHover(entry.hovered, this.prefersReducedMotion);
    }
    this.renderer?.render(this.scene, this.camera);
  }

  public dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;
    this.stopLoop();
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    this.motionQuery?.removeEventListener?.("change", this.handleMotionChange);

    for (const entry of this.activeEntries.values()) {
      this.scene.remove(entry.body.group);
      entry.body.dispose();
    }
    this.activeEntries.clear();
    this.renderer?.dispose();
    this.renderer = null;
  }
}

function roleDepth(role: UniverseNode["role"]): number {
  return role === "focus" ? 12 : role === "primary" ? 6 : 0;
}
