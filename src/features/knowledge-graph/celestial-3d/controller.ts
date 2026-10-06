import * as THREE from "three";
import type { CelestialIdentity, GeometryLOD } from "./identity";
import { createCelestialObject, type CelestialBodyInstance } from "./archetypes/factory";
import { disposeAllCelestialTextures } from "./procedural/textures";

export interface CatalogItemEntry {
  readonly id: string;
  readonly name: string;
  readonly identity: CelestialIdentity;
  readonly category?: string;
  readonly radius?: number;
}

export interface Celestial3DConfig {
  readonly canvas: HTMLCanvasElement;
  readonly targetFps?: number; // Defaults to 30fps
  readonly initialItems?: readonly CatalogItemEntry[];
  readonly onHoverChange?: (id: string | null) => void;
}

export interface ActiveCelestialEntry {
  readonly item: CatalogItemEntry;
  readonly body: CelestialBodyInstance;
  readonly basePosition: THREE.Vector3;
}

export interface ItemScreenPosition {
  readonly id: string;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly radius?: number;
}

export class Celestial3DController {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private targetFps: number;
  private onHoverChange?: (id: string | null) => void;

  private activeEntries: ActiveCelestialEntry[] = [];
  private interactiveMeshes: THREE.Mesh[] = [];

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2(-999, -999);
  private hoveredId: string | null = null;

  private animationFrameId: number | null = null;
  private lastFrameTime = 0;
  private elapsedTime = 0;
  private isDisposed = false;
  private isTabHidden = false;
  private prefersReducedMotion = false;

  private width = 800;
  private height = 600;
  private scrollY = 0;

  // Bound event listener references for clean removal
  private handleVisibilityChangeBound: () => void;
  private handlePointerMoveBound: (e: PointerEvent) => void;
  private handlePointerLeaveBound: () => void;

  constructor(config: Celestial3DConfig) {
    this.canvas = config.canvas;
    // Target 30fps as primary performance baseline
    this.targetFps = config.targetFps ?? 30;
    this.onHoverChange = config.onHoverChange;

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-400, 400, 300, -300, 0.1, 2000);
    this.camera.position.set(0, 0, 500);

    this.handleVisibilityChangeBound = this.handleVisibilityChange.bind(this);
    this.handlePointerMoveBound = this.handlePointerMove.bind(this);
    this.handlePointerLeaveBound = this.handlePointerLeave.bind(this);

    this.init(config.initialItems);
  }

  private init(initialItems?: readonly CatalogItemEntry[]): void {
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

    // 2. Coherent Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 3.2);
    keyLight.position.set(-2.0, 2.4, 3.0).normalize();
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.42);
    fillLight.position.set(2.5, -1.5, -1.0).normalize();
    this.scene.add(fillLight);

    // 3. Load initial items (defaults to the 4 main proof archetypes if unspecified)
    if (initialItems && initialItems.length > 0) {
      this.loadItems(initialItems);
    } else {
      const defaultItems: CatalogItemEntry[] = [
        { id: "golden-star", name: "Star", identity: { archetype: "golden-star", seed: 101 } },
        {
          id: "volcanic-rocky",
          name: "Rocky",
          identity: { archetype: "volcanic-rocky", seed: 201 },
        },
        {
          id: "blue-atmospheric",
          name: "Gas",
          identity: { archetype: "blue-atmospheric", seed: 401 },
        },
        { id: "crystal-world", name: "Ice", identity: { archetype: "crystal-world", seed: 502 } },
      ];
      this.loadItems(defaultItems);
    }

    // 4. Reduced Motion Detection
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      this.prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    // 5. Event Listeners
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.handleVisibilityChangeBound);
    }
    this.canvas.addEventListener("pointermove", this.handlePointerMoveBound);
    this.canvas.addEventListener("pointerleave", this.handlePointerLeaveBound);

    // 6. Initial Size Setup
    this.resize(this.canvas.clientWidth || 800, this.canvas.clientHeight || 600);

    // 7. Start Loop or Render Static Frame
    if (this.prefersReducedMotion) {
      this.renderFrame(0);
    } else {
      this.startLoop();
    }
  }

  /**
   * Replaces current bodies with a new set of catalog items.
   */
  public loadItems(items: readonly CatalogItemEntry[], lod: GeometryLOD = "focus"): void {
    // Clear and dispose existing active bodies
    for (const entry of this.activeEntries) {
      this.scene.remove(entry.body.group);
      entry.body.dispose();
    }
    this.activeEntries = [];
    this.interactiveMeshes = [];
    this.hoveredId = null;

    // Body radius scaled based on number of visible items
    const defaultRadius =
      items.length === 1
        ? 110
        : items.length <= 3
          ? 64
          : items.length <= 4
            ? 50
            : items.length <= 8
              ? 44
              : 38;

    for (const item of items) {
      const radius = item.radius ?? defaultRadius;
      const body = createCelestialObject(item.identity, lod, radius);
      this.scene.add(body.group);

      const entry: ActiveCelestialEntry = {
        item,
        body,
        basePosition: new THREE.Vector3(0, 0, 0),
      };
      this.activeEntries.push(entry);
      this.interactiveMeshes.push(body.primaryMesh);
    }

    this.layoutBodies();

    if (this.prefersReducedMotion) {
      this.renderFrame(0);
    }
  }

  /**
   * Calculates 2D grid coordinates for active bodies in orthographic view-space.
   */
  private layoutBodies(): void {
    const count = this.activeEntries.length;
    if (count === 0) return;

    if (count === 1) {
      // Single body centered (close-up inspection)
      const entry = this.activeEntries[0]!;
      entry.basePosition.set(0, 0, 0);
      entry.body.group.position.copy(entry.basePosition);
      return;
    }

    if (count === 3) {
      // 3 items in a centered horizontal line (ideal for 3 stars review)
      const spacingX = Math.min(270, this.width * 0.31);
      const coords = [
        [-spacingX, 0],
        [0, 0],
        [spacingX, 0],
      ];

      for (let i = 0; i < 3; i++) {
        const [x, y] = coords[i]!;
        const entry = this.activeEntries[i]!;
        entry.basePosition.set(x!, y!, 0);
        entry.body.group.position.copy(entry.basePosition);
      }
      return;
    }

    if (count === 4) {
      if (this.activeEntries[0]?.item.category === "CONFUSION_TEST") {
        // Single horizontal line of 4 items for direct side-by-side confusion comparison
        const spacingX = Math.min(220, (this.width * 0.88) / 4);
        for (let i = 0; i < 4; i++) {
          const x = (i - 1.5) * spacingX;
          const entry = this.activeEntries[i]!;
          entry.basePosition.set(x, 0, 0);
          entry.body.group.position.copy(entry.basePosition);
        }
        return;
      }

      // Classic 2x2 presentation
      const spacingX = Math.min(220, this.width * 0.26);
      const spacingY = Math.min(160, this.height * 0.25);

      const coords = [
        [-spacingX, spacingY],
        [spacingX, spacingY],
        [-spacingX, -spacingY],
        [spacingX, -spacingY],
      ];

      for (let i = 0; i < count; i++) {
        const [x, y] = coords[i]!;
        const entry = this.activeEntries[i]!;
        entry.basePosition.set(x!, y!, 0);
        entry.body.group.position.copy(entry.basePosition);
      }
      return;
    }

    if (count === 6) {
      // 2x3 layout (3 top row, 3 bottom row) - ideal for scale comparison
      const spacingX = Math.min(270, this.width * 0.31);
      const spacingY = Math.min(130, this.height * 0.22);
      const coords = [
        [-spacingX, spacingY],
        [0, spacingY],
        [spacingX, spacingY],
        [-spacingX, -spacingY],
        [0, -spacingY],
        [spacingX, -spacingY],
      ];

      for (let i = 0; i < 6; i++) {
        const [x, y] = coords[i]!;
        const entry = this.activeEntries[i]!;
        entry.basePosition.set(x!, y!, 0);
        entry.body.group.position.copy(entry.basePosition);
      }
      return;
    }

    if (count === 7) {
      // 7-Concept gallery layout (4 top row, 3 bottom row)
      const colSpacing = Math.min(180, (this.width * 0.88) / 4);
      const rowSpacing = Math.min(150, this.height * 0.28);

      const row1StartX = -1.5 * colSpacing;
      const row2StartX = -1.0 * colSpacing;

      for (let i = 0; i < 4; i++) {
        const entry = this.activeEntries[i]!;
        entry.basePosition.set(row1StartX + i * colSpacing, rowSpacing * 0.8, 0);
        entry.body.group.position.copy(entry.basePosition);
      }

      for (let i = 4; i < 7; i++) {
        const entry = this.activeEntries[i]!;
        entry.basePosition.set(row2StartX + (i - 4) * colSpacing, -rowSpacing * 0.8, 0);
        entry.body.group.position.copy(entry.basePosition);
      }
      return;
    }

    // Dynamic responsive grid for larger catalog selections
    const cols = this.width > 900 ? 5 : this.width > 640 ? 4 : 3;
    const rows = Math.ceil(count / cols);

    const cellW = Math.min(170, (this.width * 0.92) / cols);
    const cellH = Math.min(145, (this.height * 0.85) / Math.max(2, rows));

    const totalGridW = (cols - 1) * cellW;
    const totalGridH = (rows - 1) * cellH;

    const startX = -totalGridW / 2;
    const startY = totalGridH / 2;

    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);

      const x = startX + col * cellW;
      const y = startY - row * cellH;

      const entry = this.activeEntries[i]!;
      entry.basePosition.set(x, y, 0);
      entry.body.group.position.copy(entry.basePosition);
    }
  }

  /**
   * Resizes viewport and orthographic projection planes.
   */
  public resize(width: number, height: number): void {
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

    this.layoutBodies();

    if (this.prefersReducedMotion) {
      this.renderFrame(0);
    }
  }

  /**
   * Returns screen pixel positions (top-left origin) for overlay labels.
   */
  public getItemScreenPositions(): readonly ItemScreenPosition[] {
    const halfW = this.width / 2;
    const halfH = this.height / 2;

    return this.activeEntries.map((entry) => ({
      id: entry.item.id,
      name: entry.item.name,
      x: halfW + entry.basePosition.x,
      y: halfH - entry.basePosition.y,
      radius:
        entry.item.radius ??
        (this.activeEntries.length === 1
          ? 110
          : this.activeEntries.length <= 3
            ? 64
            : this.activeEntries.length <= 4
              ? 50
              : 44),
    }));
  }

  private handlePointerMove(e: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactiveMeshes, false);

    let nextHoverId: string | null = null;
    if (intersects.length > 0) {
      const hitMesh = intersects[0]?.object;
      const match = this.activeEntries.find((entry) => entry.body.primaryMesh === hitMesh);
      if (match) {
        nextHoverId = match.item.id;
      }
    }

    if (nextHoverId !== this.hoveredId) {
      this.setHoveredItem(nextHoverId);
    }
  }

  private handlePointerLeave(): void {
    if (this.hoveredId !== null) {
      this.setHoveredItem(null);
    }
  }

  public setHoveredItem(id: string | null): void {
    this.hoveredId = id;
    this.onHoverChange?.(this.hoveredId);

    for (const entry of this.activeEntries) {
      const isHovered = entry.item.id === id;
      entry.body.setHover(isHovered);
    }

    if (this.prefersReducedMotion) {
      this.renderFrame(0);
    }
  }

  private handleVisibilityChange(): void {
    this.isTabHidden = typeof document !== "undefined" && document.hidden;
    if (!this.isTabHidden && this.animationFrameId === null && !this.prefersReducedMotion) {
      this.lastFrameTime = performance.now();
      this.startLoop();
    }
  }

  private startLoop(): void {
    if (this.isDisposed || this.isTabHidden || this.prefersReducedMotion) return;

    const frameInterval = 1000 / this.targetFps;

    const tick = (now: number): void => {
      if (this.isDisposed) return;
      if (this.isTabHidden || this.prefersReducedMotion) {
        this.animationFrameId = null;
        return;
      }

      this.animationFrameId = requestAnimationFrame(tick);

      const deltaMs = now - this.lastFrameTime;
      if (deltaMs < frameInterval - 1) return; // 30fps frame throttling

      const deltaSec = Math.min(0.1, deltaMs / 1000);
      this.lastFrameTime = now;
      this.elapsedTime += deltaSec;

      this.renderFrame(deltaSec);
    };

    this.lastFrameTime = performance.now();
    this.animationFrameId = requestAnimationFrame(tick);
  }

  public renderFrame(deltaSec: number): void {
    // Update all active celestial bodies
    for (const entry of this.activeEntries) {
      entry.body.update(deltaSec, this.elapsedTime);
    }

    if (this.renderer) {
      this.renderer.render(this.scene, this.camera);
    }
  }

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

    for (const entry of this.activeEntries) {
      this.scene.remove(entry.body.group);
      entry.body.dispose();
    }
    this.activeEntries = [];
    this.interactiveMeshes = [];

    disposeAllCelestialTextures();

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
  }

  public getActiveEntries(): readonly ActiveCelestialEntry[] {
    return this.activeEntries;
  }

  public getHoveredId(): string | null {
    return this.hoveredId;
  }

  public getTargetFps(): number {
    return this.targetFps;
  }
}
