import { act, render } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import GraphCanvas from "../components/GraphCanvas";
import { SEED_DATASET } from "@/data/seed";
import { renderUniverseScene } from "../rendering/universe-renderer";
const mockLayer = vi.hoisted(() => ({
  bodyUpdate: vi.fn(),
  onRingOcclusionChange: null as (() => void) | null,
}));
vi.mock("../rendering/universe-renderer", () => ({ renderUniverseScene: vi.fn() }));
vi.mock("../celestial-3d/ProductionCelestialLayer", async () => {
  const React = await import("react");
  return {
    default: React.forwardRef(function Layer(
      { onRingOcclusionChange }: { onRingOcclusionChange?: () => void },
      ref
    ) {
      mockLayer.onRingOcclusionChange = onRingOcclusionChange ?? null;
      React.useImperativeHandle(ref, () => ({
        update: mockLayer.bodyUpdate,
        getForegroundRingOcclusions() {
          return {
            masks: [],
            pending: false,
            unreadyNodeIds: new Set(),
            bodyNotReadyNodeIds: new Set(),
          };
        },
      }));
      return null;
    }),
  };
});
let now = 0,
  id = 0,
  reduced = false,
  relationshipVisible = true,
  lastActivatedPulse: {
    relationshipId: string;
    sourceId: string;
    targetId: string;
    startedAt: number;
  } | null = null;
const callbacks = new Map<number, FrameRequestCallback>();
const motionListeners = new Set<() => void>();
function frame(time: number) {
  now = time;
  const pending = [...callbacks.values()];
  callbacks.clear();
  act(() => pending.forEach((fn) => fn(time)));
}
function props(slug: string) {
  return { dataset: SEED_DATASET, selectedConceptSlug: slug, onSelectConcept: vi.fn() };
}
function lastPulse() {
  return vi.mocked(renderUniverseScene).mock.calls.at(-1)?.[5]?.pulse ?? lastActivatedPulse;
}
beforeEach(() => {
  now = 0;
  id = 0;
  reduced = false;
  callbacks.clear();
  motionListeners.clear();
  relationshipVisible = true;
  lastActivatedPulse = null;
  mockLayer.onRingOcclusionChange = null;
  vi.clearAllMocks();
  vi.mocked(renderUniverseScene).mockImplementation(
    (_ctx, _width, _height, _transform, scene, options) => {
      const visibleRelationshipIds = new Set(
        relationshipVisible ? scene.relationships.map((relationship) => relationship.id) : []
      );
      const pending = options?.pendingPulse;
      lastActivatedPulse =
        pending &&
        visibleRelationshipIds.has(pending.relationshipId) &&
        !options?.reducedMotion &&
        !options?.hidden &&
        now - pending.requestedAt < 2_500
          ? {
              relationshipId: pending.relationshipId,
              sourceId: pending.sourceId,
              targetId: pending.targetId,
              startedAt: now,
            }
          : null;
      return { visibleRelationshipIds, activatedPulse: lastActivatedPulse ?? undefined };
    }
  );
  vi.spyOn(performance, "now").mockImplementation(() => now);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    {} as CanvasRenderingContext2D
  );
  vi.stubGlobal("requestAnimationFrame", (fn: FrameRequestCallback) => {
    callbacks.set(++id, fn);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (handle: number) => callbacks.delete(handle));
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return reduced;
    },
    addEventListener: (_: string, fn: () => void) => motionListeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => motionListeners.delete(fn),
  }));
  Object.defineProperty(document, "hidden", { value: false, configurable: true });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe("GraphCanvas bounded filament scheduler", () => {
  it("uses the transition scheduler, continues until energy expires, then stops", () => {
    const view = render(<GraphCanvas {...props("rust")} />);
    view.rerender(<GraphCanvas {...props("ownership")} />);
    expect(lastPulse()?.startedAt).toBe(0);
    frame(100);
    frame(450);
    expect(callbacks.size).toBe(1);
    frame(799);
    expect(lastPulse()).not.toBeNull();
    frame(800);
    expect(lastPulse()).toBeNull();
    expect(callbacks.size).toBe(0);
    view.unmount();
  });
  it("redraws only Canvas during pulse-only frames, preserving the ambient WebGL cadence", () => {
    const view = render(<GraphCanvas {...props("rust")} />);
    view.rerender(<GraphCanvas {...props("ownership")} />);
    frame(450);
    const updates = mockLayer.bodyUpdate.mock.calls.length;
    const draws = vi.mocked(renderUniverseScene).mock.calls.length;
    frame(600);
    expect(mockLayer.bodyUpdate.mock.calls.length).toBe(updates);
    expect(vi.mocked(renderUniverseScene).mock.calls.length).toBeGreaterThan(draws);
    view.unmount();
  });
  it("replaces stale energy during rapid interrupted navigation", () => {
    relationshipVisible = false;
    const view = render(<GraphCanvas {...props("rust")} />);
    view.rerender(<GraphCanvas {...props("ownership")} />);
    frame(250);
    now = 300;
    view.rerender(<GraphCanvas {...props("memory")} />);
    frame(350);
    expect(lastPulse()).toBeNull();
    now = 500;
    relationshipVisible = true;
    act(() => mockLayer.onRingOcclusionChange?.());
    const latestScene = vi.mocked(renderUniverseScene).mock.calls.at(-1)?.[4];
    expect(lastPulse()?.startedAt).toBe(500);
    expect(
      latestScene?.relationships.some(
        (relationship) => relationship.id === lastPulse()?.relationshipId
      )
    ).toBe(true);
    expect(callbacks.size).toBe(1);
    view.unmount();
    expect(callbacks.size).toBe(0);
  });
  it("provides stable filaments without traveling energy for reduced motion", () => {
    reduced = true;
    const view = render(<GraphCanvas {...props("rust")} />);
    view.rerender(<GraphCanvas {...props("ownership")} />);
    expect(lastPulse()).toBeNull();
    expect(callbacks.size).toBe(0);
    view.unmount();
  });
  it.each(["hidden", "reduced"])("cancels finite energy when %s changes", (kind) => {
    const view = render(<GraphCanvas {...props("rust")} />);
    view.rerender(<GraphCanvas {...props("ownership")} />);
    frame(450);
    expect(callbacks.size).toBe(1);
    act(() => {
      if (kind === "hidden") {
        Object.defineProperty(document, "hidden", { value: true, configurable: true });
        document.dispatchEvent(new Event("visibilitychange"));
      } else {
        reduced = true;
        motionListeners.forEach((fn) => fn());
      }
    });
    expect(lastPulse()).toBeNull();
    expect(callbacks.size).toBe(0);
    view.unmount();
  });

  it("starts the 800ms pulse when a delayed safe connection first renders", () => {
    relationshipVisible = false;
    const view = render(<GraphCanvas {...props("rust")} />);
    view.rerender(<GraphCanvas {...props("ownership")} />);
    frame(100);
    expect(lastPulse()).toBeNull();

    now = 420;
    relationshipVisible = true;
    act(() => mockLayer.onRingOcclusionChange?.());
    expect(lastPulse()?.startedAt).toBe(420);
    expect(callbacks.size).toBe(1);

    frame(1_219);
    expect(lastPulse()).not.toBeNull();
    frame(1_220);
    expect(lastPulse()).toBeNull();
    expect(callbacks.size).toBe(0);
    view.unmount();
  });

  it.each(["hidden", "reduced"])(
    "does not activate a pending pulse after %s cancellation",
    (kind) => {
      relationshipVisible = false;
      const view = render(<GraphCanvas {...props("rust")} />);
      view.rerender(<GraphCanvas {...props("ownership")} />);
      frame(100);
      act(() => {
        if (kind === "hidden") {
          Object.defineProperty(document, "hidden", { value: true, configurable: true });
          document.dispatchEvent(new Event("visibilitychange"));
        } else {
          reduced = true;
          motionListeners.forEach((fn) => fn());
        }
      });

      now = 420;
      relationshipVisible = true;
      act(() => mockLayer.onRingOcclusionChange?.());
      expect(lastPulse()).toBeNull();
      view.unmount();
    }
  );
});
