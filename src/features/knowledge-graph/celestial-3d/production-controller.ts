import * as THREE from "three";
import type { UniverseNode, UniverseScene } from "../scene/types";
import type { ViewportTransform } from "../types";
import { createCelestialObject, type CelestialBodyInstance } from "./archetypes/factory";
import { getConceptCelestialIdentity, type GeometryLOD } from "./identity";
import { addCelestialSceneLighting, resizeCelestialRenderer } from "./renderer-utils";

const BODY_BASE_RADIUS = 50;
const DEFAULT_TARGET_FPS = 30;
const MAX_WARM_ENTRIES = 8;
const RENDERER_DPR_LIMIT = 2;

interface ProductionEntry {
  readonly id: string;
  identityKey: string;
  /** LOD used to construct this identity; role changes alone do not replace the body. */
  constructionLod: GeometryLOD;
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

export interface ProductionCelestialLifecycleStats {
  readonly activeEntries: number;
  readonly warmEntries: number;
  readonly warmCapacity: number;
  readonly rendererAvailable: boolean;
  readonly sceneChildren: number;
  readonly renderCalls: number;
  readonly triangles: number;
  readonly geometries: number;
  readonly textures: number;
  readonly warmHits: number;
  readonly warmMisses: number;
  readonly warmParks: number;
  readonly warmEvictions: number;
  readonly bodyCreates: number;
  readonly bodyCreateTotalMs: number;
  readonly bodyDisposals: number;
  readonly identityReplacements: number;
}

/** Select the construction LOD for a new body; live scene-role changes do not upgrade it. */
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
  /** Recently exited bodies in least-to-most-recent insertion order. */
  private readonly warmEntries = new Map<string, ProductionEntry>();
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
  private warmHits = 0;
  private warmMisses = 0;
  private warmParks = 0;
  private warmEvictions = 0;
  private bodyCreates = 0;
  private bodyCreateTotalMs = 0;
  private bodyDisposals = 0;
  private identityReplacements = 0;

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

    addCelestialSceneLighting(this.scene);

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

  /** Read-only lifecycle counters for bounded-cache tests and performance diagnostics. */
  public getLifecycleStats(): ProductionCelestialLifecycleStats {
    return {
      activeEntries: this.activeEntries.size,
      warmEntries: this.warmEntries.size,
      warmCapacity: MAX_WARM_ENTRIES,
      rendererAvailable: this.renderer !== null,
      sceneChildren: this.scene.children.length,
      renderCalls: this.renderer?.info?.render.calls ?? 0,
      triangles: this.renderer?.info?.render.triangles ?? 0,
      geometries: this.renderer?.info?.memory.geometries ?? 0,
      textures: this.renderer?.info?.memory.textures ?? 0,
      warmHits: this.warmHits,
      warmMisses: this.warmMisses,
      warmParks: this.warmParks,
      warmEvictions: this.warmEvictions,
      bodyCreates: this.bodyCreates,
      bodyCreateTotalMs: this.bodyCreateTotalMs,
      bodyDisposals: this.bodyDisposals,
      identityReplacements: this.identityReplacements,
    };
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
        this.activeEntries.delete(id);
        this.parkEntry(id, entry);
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
    const constructionLod = roleToGeometryLod(node.role);
    let entry = this.activeEntries.get(node.id);

    if (!entry) {
      const warmEntry = this.warmEntries.get(node.id);
      if (warmEntry) {
        this.warmEntries.delete(node.id);
        if (warmEntry.identityKey === identityKey) {
          entry = warmEntry;
          this.warmHits += 1;
        } else {
          this.warmMisses += 1;
          this.disposeEntry(warmEntry);
        }
      } else {
        this.warmMisses += 1;
      }

      entry ??= this.createEntry(node.id, identity, identityKey, constructionLod);
      this.activeEntries.set(node.id, entry);
      this.scene.add(entry.body.group);
    } else if (entry.identityKey !== identityKey) {
      const nextEntry = this.createEntry(node.id, identity, identityKey, constructionLod);
      copyBodyOrientation(entry.body, nextEntry.body);
      nextEntry.body.setHover(entry.hovered, this.prefersReducedMotion);
      this.scene.remove(entry.body.group);
      this.disposeEntry(entry);
      this.identityReplacements += 1;
      entry = nextEntry;
      this.activeEntries.set(node.id, entry);
      this.scene.add(entry.body.group);
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

  private createEntry(
    id: string,
    identity: ReturnType<typeof getConceptCelestialIdentity>,
    identityKey: string,
    constructionLod: GeometryLOD
  ): ProductionEntry {
    const startedAt = performance.now();
    this.bodyCreates += 1;
    let body: CelestialBodyInstance;
    try {
      body = this.createBody(identity, constructionLod, BODY_BASE_RADIUS)!;
    } finally {
      this.bodyCreateTotalMs += performance.now() - startedAt;
    }
    body.group.userData["conceptId"] = id;
    return {
      id,
      identityKey,
      constructionLod,
      body,
      materialOpacityStates: collectMaterialOpacityStates(body),
      elapsedSeconds: 0,
      hovered: false,
      opacity: -1,
    };
  }

  private parkEntry(id: string, entry: ProductionEntry): void {
    const duplicate = this.warmEntries.get(id);
    if (duplicate) {
      this.warmEntries.delete(id);
      this.disposeEntry(duplicate);
    }

    this.warmEntries.set(id, entry);
    this.warmParks += 1;
    while (this.warmEntries.size > MAX_WARM_ENTRIES) {
      const oldestId = this.warmEntries.keys().next().value as string | undefined;
      if (oldestId === undefined) return;
      const oldest = this.warmEntries.get(oldestId);
      this.warmEntries.delete(oldestId);
      if (oldest) {
        this.disposeEntry(oldest);
        this.warmEvictions += 1;
      }
    }
  }

  private disposeEntry(entry: ProductionEntry): void {
    this.bodyDisposals += 1;
    entry.body.dispose();
  }

  private resize(width: number, height: number): void {
    if (width <= 0 || height <= 0 || (this.width === width && this.height === height)) return;
    this.width = width;
    this.height = height;
    resizeCelestialRenderer(this.camera, this.renderer, width, height);
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
      this.disposeEntry(entry);
    }
    this.activeEntries.clear();
    for (const entry of this.warmEntries.values()) {
      this.disposeEntry(entry);
    }
    this.warmEntries.clear();
    this.renderer?.dispose();
    this.renderer = null;
  }
}

function roleDepth(role: UniverseNode["role"]): number {
  return role === "focus" ? 12 : role === "primary" ? 6 : 0;
}
