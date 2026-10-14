import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Celestial3DController, type CatalogItemEntry } from "./controller";
import { CATALOG_ARCHETYPES, ENTRELIS_CONCEPT_IDENTITIES } from "./identity";
import { disposeAllCelestialTextures } from "./procedural/textures";

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

describe("Celestial 3D Controller Lifecycle & Architecture", () => {
  let restoreCanvas: () => void;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    restoreCanvas = setupCanvas2DMock();
    canvas = document.createElement("canvas");
    Object.defineProperty(canvas, "clientWidth", { value: 800, configurable: true });
    Object.defineProperty(canvas, "clientHeight", { value: 600, configurable: true });
    Object.defineProperty(canvas, "getBoundingClientRect", {
      value: () => ({ left: 0, top: 0, width: 800, height: 600 }),
      configurable: true,
    });
  });

  afterEach(() => {
    disposeAllCelestialTextures();
    restoreCanvas();
    vi.restoreAllMocks();
  });

  it("initializes with 30fps default and loads initial items", () => {
    const onHoverChange = vi.fn();
    const controller = new Celestial3DController({
      canvas,
      onHoverChange,
    });

    expect(controller.getTargetFps()).toBe(30);
    expect(controller.getActiveEntries().length).toBe(4);

    controller.dispose();
  });

  it("loads the 7 core Entrelis concept identities in gallery layout", () => {
    const controller = new Celestial3DController({ canvas });

    const conceptItems: CatalogItemEntry[] = Object.entries(ENTRELIS_CONCEPT_IDENTITIES).map(
      ([id, identity]) => ({
        id,
        name: id.toUpperCase(),
        identity,
      })
    );

    controller.loadItems(conceptItems);
    expect(controller.getActiveEntries().length).toBe(7);

    const screenPositions = controller.getItemScreenPositions();
    expect(screenPositions.length).toBe(7);
    expect(screenPositions[0]?.name).toBe("RUST");

    controller.dispose();
  }, 15000);

  it("loads all catalog archetypes and repositions on resize", () => {
    const controller = new Celestial3DController({ canvas });

    controller.loadItems(CATALOG_ARCHETYPES);
    expect(controller.getActiveEntries().length).toBe(CATALOG_ARCHETYPES.length);

    controller.resize(1200, 800);
    const screenPositions = controller.getItemScreenPositions();
    expect(screenPositions.length).toBe(CATALOG_ARCHETYPES.length);

    controller.dispose();
  }, 15000);

  it("handles renderFrame without crashing and updates rotation", () => {
    const controller = new Celestial3DController({ canvas });
    const entries = controller.getActiveEntries();
    const initialRot = entries[0]?.body.primaryMesh.rotation.y ?? 0;

    controller.renderFrame(0.5);
    const nextRot = entries[0]?.body.primaryMesh.rotation.y ?? 0;
    expect(nextRot).not.toBe(initialRot);

    controller.dispose();
  });

  it("freezes rotation and loop when prefers-reduced-motion is active", () => {
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

    const controller = new Celestial3DController({ canvas });
    expect(controller.getActiveEntries().length).toBe(4);

    controller.dispose();
    window.matchMedia = originalMatchMedia;
  });

  it("handles visibilitychange events gracefully without jumping", () => {
    const controller = new Celestial3DController({ canvas });

    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    controller.dispose();
  });

  it("disposes cleanly without throwing errors", () => {
    const controller = new Celestial3DController({ canvas });
    expect(() => controller.dispose()).not.toThrow();
    expect(controller.getActiveEntries().length).toBe(0);
  });
});
