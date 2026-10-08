import * as THREE from "three";
import { DESKTOP_SCENE_BUDGET, type UniverseNode, type UniverseScene } from "../scene/types";
import type { ViewportTransform } from "../types";
import { createCelestialObject, type CelestialBodyInstance } from "./archetypes/factory";
import { getConceptCelestialIdentity, type GeometryLOD } from "./identity";
import { addCelestialSceneLighting, resizeCelestialRenderer } from "./renderer-utils";
import {
  UniverseScene as Universe3DScene,
  type UniverseSceneOptions as Universe3DSceneOptions,
  type UniverseTravelState,
} from "./universe";

const BODY_BASE_RADIUS = 50;
const DEFAULT_TARGET_FPS = 30;
const MAX_WARM_ENTRIES = 8;
const MAX_PENDING_ENTRIES = DESKTOP_SCENE_BUDGET.maxTotal;
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

interface PendingPreparation {
  readonly entry: ProductionEntry;
  node: UniverseNode;
  transform: ViewportTransform;
  hovered: boolean;
  ready: boolean;
  startedAt: number;
}

interface MaterialOpacityState {
  readonly material: THREE.Material;
  readonly opacity: number;
  readonly depthWrite: boolean;
}

export interface ProductionCelestialControllerDependencies {
  readonly createRenderer?: (canvas: HTMLCanvasElement) => THREE.WebGLRenderer;
  readonly createBody?: (
    identity: ReturnType<typeof getConceptCelestialIdentity>,
    lod: GeometryLOD,
    radius: number
  ) => CelestialBodyInstance;
  readonly createUniverseScene?: (options: Universe3DSceneOptions) => Universe3DScene;
}

export interface ProductionCelestialLifecycleStats {
  readonly activeEntries: number;
  readonly warmEntries: number;
  readonly warmCapacity: number;
  readonly pendingEntries: number;
  readonly pendingCapacity: number;
  readonly preparingEntries: number;
  readonly rendererAvailable: boolean;
  readonly universeActive: boolean;
  readonly travelActive?: boolean;
  readonly universeSceneChildren: number;
  readonly asyncShaderPreparationSupported: boolean;
  readonly parallelShaderCompileExtensionAvailable: boolean;
  readonly sceneChildren: number;
  readonly renderFrameCount: number;
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
  readonly shaderPreparationsStarted: number;
  readonly shaderPreparationsCompleted: number;
  readonly shaderPreparationCancellations: number;
  readonly shaderPreparationFailures: number;
  readonly shaderPreparationSetupTotalMs: number;
  readonly shaderPreparationSetupMaxMs: number;
  readonly shaderPreparationWaitTotalMs: number;
  readonly controllerUpdateCount: number;
  readonly controllerUpdateTotalMs: number;
  readonly controllerUpdateMaxMs: number;
  readonly controllerUpdateLastMs: number;
  readonly rendererCallTotalMs: number;
  readonly rendererCallMaxMs: number;
  readonly rendererCallLastMs: number;
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
        // Celestial bodies in the local universe can fade during scene transitions.
        // Ensuring transparent is true ahead of time guarantees compileAsync
        // compiles the transparent shader variant during background preparation,
        // eliminating synchronous shader compilation stalls during active transitions.
        material.transparent = true;
        states.set(material, {
          material,
          opacity: material.opacity,
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
    const nextDepthWrite = shouldFade ? false : state.depthWrite;

    material.opacity = state.opacity * clampedOpacity;
    // depthWrite is dynamic WebGL state (gl.depthMask) that does not invalidate
    // or recompile shaders. We avoid setting material.needsUpdate to maintain
    // sub-33ms frame times and prevent shader re-compilation hitches.
    material.depthWrite = nextDepthWrite;

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
  /** Cold bodies kept off-scene until shared-renderer shader preparation completes. */
  private readonly pendingEntries = new Map<string, PendingPreparation>();
  private readonly targetFps = DEFAULT_TARGET_FPS;
  private readonly createRenderer: (canvas: HTMLCanvasElement) => THREE.WebGLRenderer;
  private readonly createBody: NonNullable<ProductionCelestialControllerDependencies["createBody"]>;
  private readonly asyncShaderPreparationSupported: boolean;
  private readonly parallelShaderCompileExtensionAvailable: boolean;
  private renderer: THREE.WebGLRenderer | null = null;
  private universeScene: Universe3DScene | null = null;
  private latestTransform: ViewportTransform = { x: 0, y: 0, k: 1 };
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
  private preparingPendingEntry: PendingPreparation | null = null;
  private preparationTaskId: number | null = null;
  private preparationTaskKind: "idle" | "timeout" | null = null;
  private shaderPreparationsStarted = 0;
  private shaderPreparationsCompleted = 0;
  private shaderPreparationCancellations = 0;
  private shaderPreparationFailures = 0;
  private shaderPreparationSetupTotalMs = 0;
  private shaderPreparationSetupMaxMs = 0;
  private shaderPreparationWaitTotalMs = 0;
  private renderFrameCount = 0;
  private controllerUpdateCount = 0;
  private controllerUpdateTotalMs = 0;
  private controllerUpdateMaxMs = 0;
  private controllerUpdateLastMs = 0;
  private rendererCallTotalMs = 0;
  private rendererCallMaxMs = 0;
  private rendererCallLastMs = 0;
  private latestTravel: UniverseTravelState | null = null;

  private readonly handleVisibilityChange = (): void => {
    this.isTabHidden = document.hidden;
    if (this.isTabHidden) {
      this.stopLoop();
      this.cancelScheduledPreparation();
      return;
    }

    this.lastFrameTime = performance.now();
    this.renderFrame(0);
    this.activateReadyPendingEntries();
    this.startLoop();
    this.schedulePendingPreparation();
  };

  private readonly handleMotionChange = (event: MediaQueryListEvent): void => {
    this.prefersReducedMotion = event.matches;
    this.universeScene?.setPrefersReducedMotion(this.prefersReducedMotion);
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

    this.asyncShaderPreparationSupported = typeof this.renderer?.compileAsync === "function";
    this.parallelShaderCompileExtensionAvailable = this.hasParallelShaderCompileExtension();

    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      this.motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      this.prefersReducedMotion = this.motionQuery.matches;
      this.motionQuery.addEventListener?.("change", this.handleMotionChange);
    }

    if (typeof document !== "undefined") {
      this.isTabHidden = document.hidden;
      document.addEventListener("visibilitychange", this.handleVisibilityChange);
    }

    if (this.renderer) {
      try {
        const createUniverse =
          dependencies.createUniverseScene ?? ((opts) => new Universe3DScene(opts));
        const effectiveDpr =
          typeof window === "undefined"
            ? 1
            : Math.min(window.devicePixelRatio || 1, RENDERER_DPR_LIMIT);
        this.universeScene = createUniverse({
          width: canvas.clientWidth || 1,
          height: canvas.clientHeight || 1,
          isMobile: (canvas.clientWidth || 1) <= 768,
          pixelRatio: effectiveDpr,
          prefersReducedMotion: this.prefersReducedMotion,
        });
      } catch {
        this.universeScene = null;
      }
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
      pendingEntries: this.pendingEntries.size,
      pendingCapacity: MAX_PENDING_ENTRIES,
      preparingEntries: this.preparingPendingEntry ? 1 : 0,
      rendererAvailable: this.renderer !== null,
      universeActive: this.universeScene !== null,
      travelActive: this.latestTravel?.active ?? false,
      universeSceneChildren: this.universeScene?.scene.children.length ?? 0,
      asyncShaderPreparationSupported: this.asyncShaderPreparationSupported,
      parallelShaderCompileExtensionAvailable: this.parallelShaderCompileExtensionAvailable,
      sceneChildren: this.scene.children.length,
      renderFrameCount: this.renderFrameCount,
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
      shaderPreparationsStarted: this.shaderPreparationsStarted,
      shaderPreparationsCompleted: this.shaderPreparationsCompleted,
      shaderPreparationCancellations: this.shaderPreparationCancellations,
      shaderPreparationFailures: this.shaderPreparationFailures,
      shaderPreparationSetupTotalMs: this.shaderPreparationSetupTotalMs,
      shaderPreparationSetupMaxMs: this.shaderPreparationSetupMaxMs,
      shaderPreparationWaitTotalMs: this.shaderPreparationWaitTotalMs,
      controllerUpdateCount: this.controllerUpdateCount,
      controllerUpdateTotalMs: this.controllerUpdateTotalMs,
      controllerUpdateMaxMs: this.controllerUpdateMaxMs,
      controllerUpdateLastMs: this.controllerUpdateLastMs,
      rendererCallTotalMs: this.rendererCallTotalMs,
      rendererCallMaxMs: this.rendererCallMaxMs,
      rendererCallLastMs: this.rendererCallLastMs,
    };
  }

  public update(
    displayedScene: UniverseScene,
    transform: ViewportTransform,
    width: number,
    height: number,
    hoveredNodeId: string | null,
    travel?: UniverseTravelState | null
  ): void {
    if (this.isDisposed) return;
    const updateStartedAt = performance.now();

    try {
      this.updateScene(displayedScene, transform, width, height, hoveredNodeId, travel);
    } finally {
      const updateDuration = performance.now() - updateStartedAt;
      this.controllerUpdateCount += 1;
      this.controllerUpdateTotalMs += updateDuration;
      this.controllerUpdateMaxMs = Math.max(this.controllerUpdateMaxMs, updateDuration);
      this.controllerUpdateLastMs = updateDuration;
    }
  }

  private updateScene(
    displayedScene: UniverseScene,
    transform: ViewportTransform,
    width: number,
    height: number,
    hoveredNodeId: string | null,
    travel?: UniverseTravelState | null
  ): void {
    if (this.isDisposed) return;

    this.resize(width, height);
    if (!this.renderer) return;

    this.latestTransform = transform;
    if (travel !== undefined) {
      this.latestTravel = travel;
    }
    this.universeScene?.update(0, this.elapsedTime, transform, this.latestTravel);

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

    for (const [id, pending] of this.pendingEntries) {
      if (!visibleIds.has(id)) this.cancelPendingEntry(id, pending);
    }

    if (this.prefersReducedMotion || this.activeEntries.size === 0) {
      this.stopLoop();
      this.renderFrame(0);
    } else {
      if (travel?.active) {
        this.renderFrame(0);
      }
      this.startLoop();
    }
    this.schedulePendingPreparation();
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
      const pending = this.pendingEntries.get(node.id);
      if (pending) {
        if (pending.entry.identityKey === identityKey) {
          pending.node = node;
          pending.transform = transform;
          pending.hovered = isHovered;
          return;
        }
        this.cancelPendingEntry(node.id, pending);
      }

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

      if (!entry && this.shouldPrepareAsynchronously()) {
        this.beginPendingPreparation(
          node,
          identity,
          identityKey,
          constructionLod,
          transform,
          isHovered
        );
        return;
      }

      entry ??= this.createEntry(node.id, identity, identityKey, constructionLod);
      this.activeEntries.set(node.id, entry);
      this.scene.add(entry.body.group);
    } else if (entry.identityKey !== identityKey) {
      if (this.shouldPrepareAsynchronously()) {
        this.scene.remove(entry.body.group);
        this.activeEntries.delete(node.id);
        this.disposeEntry(entry);
        this.identityReplacements += 1;
        this.beginPendingPreparation(
          node,
          identity,
          identityKey,
          constructionLod,
          transform,
          isHovered
        );
        return;
      }

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

    this.applyNodeToEntry(entry, node, transform, isHovered);
  }

  private applyNodeToEntry(
    entry: ProductionEntry,
    node: UniverseNode,
    transform: ViewportTransform,
    isHovered: boolean
  ): void {
    entry.hovered = isHovered;
    const position = projectUniverseNode(node, transform);
    const depth = typeof node.z === "number" ? node.z : roleDepth(node.role);
    entry.body.group.position.set(position.x, position.y, depth);
    entry.body.group.scale.setScalar(node.radius / BODY_BASE_RADIUS);
    entry.body.group.visible = node.opacity > 0.001;
    if (entry.opacity !== node.opacity) {
      applyBodyOpacity(entry, node.opacity);
      entry.opacity = node.opacity;
    }
    entry.body.setHover(isHovered, this.prefersReducedMotion);
  }

  private hasParallelShaderCompileExtension(): boolean {
    try {
      return Boolean(this.renderer?.getContext().getExtension("KHR_parallel_shader_compile"));
    } catch {
      return false;
    }
  }

  private shouldPrepareAsynchronously(): boolean {
    return this.asyncShaderPreparationSupported && this.pendingEntries.size < MAX_PENDING_ENTRIES;
  }

  private beginPendingPreparation(
    node: UniverseNode,
    identity: ReturnType<typeof getConceptCelestialIdentity>,
    identityKey: string,
    constructionLod: GeometryLOD,
    transform: ViewportTransform,
    hovered: boolean
  ): void {
    if (this.pendingEntries.size >= MAX_PENDING_ENTRIES) return;
    const pending: PendingPreparation = {
      entry: this.createEntry(node.id, identity, identityKey, constructionLod),
      node,
      transform,
      hovered,
      ready: false,
      startedAt: 0,
    };
    this.pendingEntries.set(node.id, pending);
    this.schedulePendingPreparation();
  }

  private schedulePendingPreparation(): void {
    if (
      !this.asyncShaderPreparationSupported ||
      !this.renderer ||
      this.isDisposed ||
      this.isTabHidden ||
      this.preparingPendingEntry ||
      this.preparationTaskId !== null ||
      ![...this.pendingEntries.values()].some((pending) => !pending.ready)
    ) {
      return;
    }

    const prepareNext = (): void => {
      this.preparationTaskId = null;
      this.preparationTaskKind = null;
      if (this.isDisposed || this.isTabHidden || this.preparingPendingEntry) return;
      const pending = [...this.pendingEntries.values()].find((candidate) => !candidate.ready);
      if (pending) this.preparePendingEntry(pending);
    };

    if (typeof window.requestIdleCallback === "function") {
      this.preparationTaskKind = "idle";
      this.preparationTaskId = window.requestIdleCallback(
        (deadline) => {
          if (!deadline.didTimeout && deadline.timeRemaining() < 2) {
            this.preparationTaskId = null;
            this.preparationTaskKind = null;
            this.schedulePendingPreparation();
            return;
          }
          prepareNext();
        },
        { timeout: 100 }
      );
    } else {
      this.preparationTaskKind = "timeout";
      this.preparationTaskId = window.setTimeout(prepareNext, 0);
    }
  }

  private preparePendingEntry(pending: PendingPreparation): void {
    const renderer = this.renderer;
    if (!renderer || this.isDisposed || this.isTabHidden) return;

    this.preparingPendingEntry = pending;
    pending.startedAt = performance.now();
    this.shaderPreparationsStarted += 1;

    const setupStartedAt = performance.now();
    let preparation: Promise<THREE.Object3D>;
    try {
      preparation = renderer.compileAsync(pending.entry.body.group, this.camera, this.scene);
    } catch {
      const setupDuration = performance.now() - setupStartedAt;
      this.shaderPreparationSetupTotalMs += setupDuration;
      this.shaderPreparationSetupMaxMs = Math.max(this.shaderPreparationSetupMaxMs, setupDuration);
      this.finishPendingPreparation(pending, false);
      return;
    }
    const setupDuration = performance.now() - setupStartedAt;
    this.shaderPreparationSetupTotalMs += setupDuration;
    this.shaderPreparationSetupMaxMs = Math.max(this.shaderPreparationSetupMaxMs, setupDuration);

    void preparation.then(
      () => this.finishPendingPreparation(pending, true),
      () => this.finishPendingPreparation(pending, false)
    );
  }

  private finishPendingPreparation(pending: PendingPreparation, succeeded: boolean): void {
    if (this.preparingPendingEntry === pending) this.preparingPendingEntry = null;
    this.shaderPreparationWaitTotalMs += performance.now() - pending.startedAt;

    if (!succeeded) this.shaderPreparationFailures += 1;
    if (this.isDisposed) return;

    if (this.pendingEntries.get(pending.entry.id) === pending) {
      pending.ready = true;
      this.shaderPreparationsCompleted += 1;
      if (!this.isTabHidden) this.activatePendingEntry(pending);
    }

    this.schedulePendingPreparation();
  }

  private activateReadyPendingEntries(): void {
    for (const pending of this.pendingEntries.values()) {
      if (pending.ready) this.activatePendingEntry(pending);
    }
  }

  private activatePendingEntry(pending: PendingPreparation): void {
    const id = pending.entry.id;
    if (this.isDisposed || this.isTabHidden || this.pendingEntries.get(id) !== pending) return;
    if (
      getIdentityKey(getConceptCelestialIdentity(pending.node.slug)) !== pending.entry.identityKey
    ) {
      this.cancelPendingEntry(id, pending);
      return;
    }

    this.pendingEntries.delete(id);
    this.activeEntries.set(id, pending.entry);
    this.scene.add(pending.entry.body.group);
    this.applyNodeToEntry(pending.entry, pending.node, pending.transform, pending.hovered);

    if (this.prefersReducedMotion) this.stopLoop();
    this.renderFrame(0);
    this.startLoop();
    this.schedulePendingPreparation();
  }

  private cancelPendingEntry(id: string, pending: PendingPreparation): void {
    if (this.pendingEntries.get(id) !== pending) return;
    this.pendingEntries.delete(id);
    this.shaderPreparationCancellations += 1;
    this.disposeEntry(pending.entry);
  }

  private cancelScheduledPreparation(): void {
    if (this.preparationTaskId === null || this.preparationTaskKind === null) return;
    if (this.preparationTaskKind === "idle") {
      window.cancelIdleCallback(this.preparationTaskId);
    } else {
      window.clearTimeout(this.preparationTaskId);
    }
    this.preparationTaskId = null;
    this.preparationTaskKind = null;
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
    const dpr =
      typeof window === "undefined"
        ? 1
        : Math.min(window.devicePixelRatio || 1, RENDERER_DPR_LIMIT);
    this.universeScene?.resize(width, height, dpr);
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
    this.lastFrameTime = performance.now();
    this.elapsedTime += deltaSec;
    for (const entry of this.activeEntries.values()) {
      entry.elapsedSeconds += deltaSec;
      entry.body.update(deltaSec, this.elapsedTime);
      entry.body.setHover(entry.hovered, this.prefersReducedMotion);
    }
    if (this.universeScene) {
      this.universeScene.update(
        deltaSec,
        this.elapsedTime,
        this.latestTransform,
        this.latestTravel
      );
    }
    if (this.renderer) {
      const renderStartedAt = performance.now();
      try {
        this.renderer.autoClear = false;
        if (typeof this.renderer.clear === "function") {
          this.renderer.clear();
        }
        if (this.universeScene) {
          this.universeScene.render(this.renderer);
        }
        if (typeof this.renderer.clearDepth === "function") {
          this.renderer.clearDepth();
        }
        this.renderer.render(this.scene, this.camera);
      } finally {
        const renderDuration = performance.now() - renderStartedAt;
        this.renderFrameCount += 1;
        this.rendererCallTotalMs += renderDuration;
        this.rendererCallMaxMs = Math.max(this.rendererCallMaxMs, renderDuration);
        this.rendererCallLastMs = renderDuration;
      }
    }
  }

  public dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;
    this.stopLoop();
    this.cancelScheduledPreparation();
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    this.motionQuery?.removeEventListener?.("change", this.handleMotionChange);

    this.universeScene?.dispose();
    this.universeScene = null;

    for (const entry of this.activeEntries.values()) {
      this.scene.remove(entry.body.group);
      this.disposeEntry(entry);
    }
    this.activeEntries.clear();
    for (const pending of this.pendingEntries.values()) {
      this.disposeEntry(pending.entry);
    }
    this.pendingEntries.clear();
    this.preparingPendingEntry = null;
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
