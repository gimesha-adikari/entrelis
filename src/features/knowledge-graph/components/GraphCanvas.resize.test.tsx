import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SEED_DATASET } from "@/data/seed";
import { getOrCreateKnowledgeGraphIndex } from "../knowledge-index";
import type { UniverseScene } from "../scene/types";
import GraphCanvas from "./GraphCanvas";
import { renderUniverseScene } from "../rendering/universe-renderer";

interface DrawSnapshot {
  readonly width: number;
  readonly height: number;
  readonly transform: { readonly x: number; readonly y: number; readonly k: number };
  readonly nodes: readonly { readonly id: string; readonly x: number; readonly y: number }[];
}

const drawSnapshots: DrawSnapshot[] = [];
let resizeObservedCanvas: (() => void) | null = null;
let measuredWidth = 1000;
let measuredHeight = 900;

vi.mock("../rendering/universe-renderer", () => ({
  renderUniverseScene: vi.fn(),
}));

class ControlledResizeObserver {
  constructor(private readonly callback: ResizeObserverCallback) {}

  observe(target: Element) {
    if (target.className.toString().includes("canvasArea")) {
      resizeObservedCanvas = () => this.callback([], this as unknown as ResizeObserver);
    }
  }

  disconnect() {}
}

describe("GraphCanvas resizing continuity", () => {
  beforeEach(() => {
    drawSnapshots.length = 0;
    resizeObservedCanvas = null;
    measuredWidth = 1000;
    measuredHeight = 900;
    vi.stubGlobal("ResizeObserver", ControlledResizeObserver);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (
      this: HTMLElement
    ) {
      return this.className.toString().includes("canvasArea") ? measuredWidth : 0;
    });
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(function (
      this: HTMLElement
    ) {
      return this.className.toString().includes("canvasArea") ? measuredHeight : 0;
    });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(((type: string) =>
      type === "2d" ? ({} as CanvasRenderingContext2D) : null) as HTMLCanvasElement["getContext"]);

    vi.mocked(renderUniverseScene).mockImplementation(
      (_context, width, height, transform, scene) => {
        drawSnapshots.push({
          width,
          height,
          transform: { ...transform },
          nodes: (scene as UniverseScene).allNodes.map((node) => ({
            id: node.id,
            x: node.x,
            y: node.y,
          })),
        });
        return { activatedPulse: undefined } as ReturnType<typeof renderUniverseScene>;
      }
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("synchronizes canvas backing size and preserves scene and camera through a panel resize", async () => {
    const onSelectConcept = vi.fn();
    const { container } = render(
      <GraphCanvas
        dataset={SEED_DATASET}
        index={getOrCreateKnowledgeGraphIndex(SEED_DATASET)}
        selectedConceptSlug="rust"
        onSelectConcept={onSelectConcept}
        isMobileViewport={false}
      />
    );

    const canvas = container.querySelector<HTMLCanvasElement>(
      "canvas:not([data-production-celestial-layer])"
    )!;
    await waitFor(() => expect(drawSnapshots.length).toBeGreaterThan(0));
    expect(resizeObservedCanvas).not.toBeNull();

    fireEvent.mouseDown(canvas, { clientX: 200, clientY: 200 });
    fireEvent.mouseMove(canvas, { clientX: 240, clientY: 180 });
    fireEvent.mouseUp(canvas, { clientX: 240, clientY: 180 });
    fireEvent.wheel(canvas, { deltaY: -100, clientX: 420, clientY: 350 });
    const beforeResize = drawSnapshots.at(-1)!;
    expect(beforeResize.transform.k).toBeGreaterThan(1);
    expect(onSelectConcept).not.toHaveBeenCalled();

    measuredWidth = 800;
    act(() => resizeObservedCanvas?.());

    await waitFor(() => expect(drawSnapshots.at(-1)?.width).toBe(800));
    const afterResize = drawSnapshots.at(-1)!;

    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(900);
    expect(canvas.style.width).toBe("800px");
    expect(canvas.style.height).toBe("900px");
    expect(afterResize.transform.x).toBeCloseTo(beforeResize.transform.x + 100);
    expect(afterResize.transform.y).toBe(beforeResize.transform.y);
    expect(afterResize.transform.k).toBe(beforeResize.transform.k);
    expect(afterResize.nodes).toEqual(beforeResize.nodes);
    expect(afterResize.nodes.find((node) => node.id === "concept-rust")).toBeDefined();
  });
});
