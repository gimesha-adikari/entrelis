import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createRockyTextures,
  createGasTexture,
  createIceTextures,
  createStarTextures,
  disposeAllCelestialTextures,
} from "./textures";
import { Celestial3DController } from "./controller";

function setupCanvas2DMock() {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  const mockGetContext = function (this: HTMLCanvasElement, type: string) {
    if (type === "2d") {
      return {
        createImageData: (w: number, h: number) => ({
          width: w,
          height: h,
          data: new Uint8ClampedArray(w * h * 4),
        }),
        putImageData: vi.fn(),
        createRadialGradient: () => ({ addColorStop: vi.fn() }),
        createLinearGradient: () => ({ addColorStop: vi.fn() }),
        fillRect: vi.fn(),
        clearRect: vi.fn(),
        beginPath: vi.fn(),
        closePath: vi.fn(),
        arc: vi.fn(),
        ellipse: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        scale: vi.fn(),
        fillStyle: "#000",
        strokeStyle: "#000",
        lineWidth: 1,
        globalAlpha: 1,
      } as unknown as CanvasRenderingContext2D;
    }
    return originalGetContext.call(this, type as "2d");
  } as unknown as typeof HTMLCanvasElement.prototype.getContext;

  HTMLCanvasElement.prototype.getContext = mockGetContext;
  return () => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  };
}

describe("Celestial 3D Procedural Textures & Shaders", () => {
  let restoreCanvas: () => void;

  beforeEach(() => {
    restoreCanvas = setupCanvas2DMock();
  });

  afterEach(() => {
    disposeAllCelestialTextures();
    restoreCanvas();
  });

  it("generates deterministic rocky textures with diffuse, bump, and roughness maps", () => {
    const tex1 = createRockyTextures(42);
    const tex2 = createRockyTextures(42);

    expect(tex1.diffuse).toBeDefined();
    expect(tex1.bump).toBeDefined();
    expect(tex1.roughness).toBeDefined();

    // Cache returns the same instances for identical seed
    expect(tex1.diffuse).toBe(tex2.diffuse);
    expect(tex1.bump).toBe(tex2.bump);
    expect(tex1.roughness).toBe(tex2.roughness);
  });

  it("generates gas world texture with caching", () => {
    const tex1 = createGasTexture(101);
    const tex2 = createGasTexture(101);

    expect(tex1).toBeDefined();
    expect(tex1).toBe(tex2);
  });

  it("generates ice world diffuse, roughness, and bump textures", () => {
    const tex1 = createIceTextures(202);
    const tex2 = createIceTextures(202);

    expect(tex1.diffuse).toBeDefined();
    expect(tex1.roughness).toBeDefined();
    expect(tex1.bump).toBeDefined();

    expect(tex1.diffuse).toBe(tex2.diffuse);
    expect(tex1.roughness).toBe(tex2.roughness);
    expect(tex1.bump).toBe(tex2.bump);
  });

  it("generates star surface and organic corona billboard textures", () => {
    const tex1 = createStarTextures(303);
    const tex2 = createStarTextures(303);

    expect(tex1.surface).toBeDefined();
    expect(tex1.corona).toBeDefined();
    expect(tex1.surface).toBe(tex2.surface);
    expect(tex1.corona).toBe(tex2.corona);
  });

  it("disposes all cached textures cleanly", () => {
    const texRocky = createRockyTextures(42);
    expect(texRocky.diffuse).not.toBeNull();
    const disposeSpy = vi.spyOn(texRocky.diffuse!, "dispose");

    disposeAllCelestialTextures();
    expect(disposeSpy).toHaveBeenCalled();
  });
});

describe("Celestial 3D Controller Lifecycle & Architecture", () => {
  let canvas: HTMLCanvasElement;
  let restoreCanvas: () => void;

  beforeEach(() => {
    restoreCanvas = setupCanvas2DMock();
    canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => {},
    });
  });

  afterEach(() => {
    disposeAllCelestialTextures();
    restoreCanvas();
    vi.restoreAllMocks();
  });

  it("initializes with 30fps default and sets up 4 archetype meshes and 2 atmosphere shells", () => {
    const onHoverChange = vi.fn();
    const controller = new Celestial3DController({
      canvas,
      onHoverChange,
    });

    expect(controller.getTargetFps()).toBe(30);

    const meshes = controller.getMeshes();
    expect(meshes.length).toBe(4);
    const archetypes = meshes.map((m) => m.archetype);
    expect(archetypes).toContain("star");
    expect(archetypes).toContain("rocky");
    expect(archetypes).toContain("gas");
    expect(archetypes).toContain("ice");

    const atmShells = controller.getAtmosphereShells();
    expect(atmShells.length).toBe(2);
    const atmTypes = atmShells.map((a) => a.archetype);
    expect(atmTypes).toContain("gas");
    expect(atmTypes).toContain("ice");

    controller.dispose();
  });

  it("correctly repositions meshes on resize", () => {
    const controller = new Celestial3DController({
      canvas,
      targetFps: 30,
    });

    controller.resize(1000, 800);
    const meshes = controller.getMeshes();
    const star = meshes.find((m) => m.archetype === "star");
    const rocky = meshes.find((m) => m.archetype === "rocky");

    expect(star).toBeDefined();
    expect(rocky).toBeDefined();
    // Star is top-left: negative X, positive Y
    expect(star!.mesh.position.x).toBeLessThan(0);
    expect(star!.mesh.position.y).toBeGreaterThan(0);

    // Rocky is top-right: positive X, positive Y
    expect(rocky!.mesh.position.x).toBeGreaterThan(0);
    expect(rocky!.mesh.position.y).toBeGreaterThan(0);

    controller.dispose();
  });

  it("handles renderFrame without crashing and applies rotation delta", () => {
    const controller = new Celestial3DController({
      canvas,
      targetFps: 30,
    });

    const meshes = controller.getMeshes();
    const rocky = meshes.find((m) => m.archetype === "rocky")!;
    const initialRotY = rocky.mesh.rotation.y;

    controller.renderFrame(0.5); // 0.5s time step
    expect(rocky.mesh.rotation.y).toBeGreaterThan(initialRotY);

    controller.dispose();
  });

  it("freezes rotation when prefers-reduced-motion is active", () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const controller = new Celestial3DController({
      canvas,
      targetFps: 30,
    });

    const meshes = controller.getMeshes();
    const rocky = meshes.find((m) => m.archetype === "rocky")!;
    const initialRotY = rocky.mesh.rotation.y;

    controller.renderFrame(1.0);
    expect(rocky.mesh.rotation.y).toBe(initialRotY);

    controller.dispose();
    window.matchMedia = originalMatchMedia;
  });

  it("handles visibilitychange events gracefully without jumping", () => {
    const controller = new Celestial3DController({
      canvas,
      targetFps: 30,
    });

    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    expect(() => controller.dispose()).not.toThrow();
  });

  it("disposes cleanly without throwing errors", () => {
    const controller = new Celestial3DController({
      canvas,
      targetFps: 30,
    });

    expect(() => controller.dispose()).not.toThrow();
    expect(controller.getMeshes().length).toBe(0);
    expect(controller.getAtmosphereShells().length).toBe(0);
  });
});
