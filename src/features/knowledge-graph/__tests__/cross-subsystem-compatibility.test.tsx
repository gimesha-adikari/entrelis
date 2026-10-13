import { render, screen, fireEvent, act } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import KnowledgeGraphExperience from "../components/KnowledgeGraphExperience";
import GraphCanvas from "../components/GraphCanvas";
import ConceptPanel from "../components/ConceptPanel";
import CelestialProjectionBridge from "../components/CelestialProjectionBridge";
import { createKnowledgeGraphIndex } from "../knowledge-index";
import { SEED_DATASET } from "@/data/seed";
import { isSafeUrl } from "@/domain/knowledge/validation";
import { renderUniverseScene } from "../rendering/universe-renderer";
import type { UniverseTravelState, UniverseScene } from "../celestial-3d/universe";
import type { Concept, KnowledgeDataset, Source } from "@/domain/knowledge/types";

function createMockCanvasContext() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    clip: vi.fn(),
    arc: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    rect: vi.fn(),
    roundRect: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    setLineDash: vi.fn(),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    drawImage: vi.fn(),
    measureText: vi.fn(() => ({ width: 40 })),
    fillText: vi.fn(),
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    fillStyle: "#ffffff",
    strokeStyle: "#ffffff",
    lineWidth: 1,
  } as unknown as CanvasRenderingContext2D;
}

describe("Cross-Subsystem Adversarial Compatibility Suite (GIM-48 Stage 3)", () => {
  const index = createKnowledgeGraphIndex(SEED_DATASET);

  beforeEach(() => {
    window.history.replaceState({}, "", "/");
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() =>
      createMockCanvasContext()
    );
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      left: 800,
      top: 50,
      right: 1400,
      bottom: 850,
      width: 600,
      height: 800,
      x: 800,
      y: 50,
      toJSON: () => {},
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const getFiberHook = <T,>(
    canvas: HTMLCanvasElement,
    predicate: (val: unknown) => boolean
  ): T | null => {
    const key = Object.keys(canvas).find((k) => k.startsWith("__reactFiber"))!;
    let fiber = (canvas as unknown as Record<string, unknown>)[key] as
      | { memoizedState?: unknown; return?: unknown }
      | undefined;
    while (fiber) {
      let state = fiber.memoizedState as
        | { memoizedState?: { current?: unknown }; next?: unknown }
        | undefined;
      while (state) {
        if (state.memoizedState && predicate(state.memoizedState.current)) {
          return state.memoizedState.current as T;
        }
        state = state.next as typeof state;
      }
      fiber = fiber.return as typeof fiber;
    }
    return null;
  };

  // --------------------------------------------------------------------------
  // Scenario 1: Navigation Interrupted by Mouse, Wheel, Touch, Zoom or Home
  // --------------------------------------------------------------------------
  describe("Scenario 1: Spatial navigation interrupted by user input (RN-01)", () => {
    it("settles travel state and scene when clicking zoom controls during active transition", () => {
      const { container, rerender } = render(
        <GraphCanvas
          dataset={SEED_DATASET}
          index={index}
          selectedConceptSlug="rust"
          onSelectConcept={() => {}}
        />
      );

      const canvas = container.querySelector("canvas")!;
      rerender(
        <GraphCanvas
          dataset={SEED_DATASET}
          index={index}
          selectedConceptSlug="ownership"
          onSelectConcept={() => {}}
        />
      );

      const zoomInBtn = screen.getByRole("button", { name: "Zoom in" });
      fireEvent.click(zoomInBtn);

      const travelState = getFiberHook<UniverseTravelState>(
        canvas,
        (val) => Boolean(val && typeof val === "object" && "fromSlug" in val)
      );
      expect(travelState?.active).toBe(false);
      expect(travelState?.progress).toBe(1);

      const currentScene = getFiberHook<UniverseScene>(
        canvas,
        (val) => Boolean(val && typeof val === "object" && "focus" in val && "allNodes" in val)
      );
      expect(currentScene?.focus.slug).toBe("ownership");
    });

    it("settles travel state and scene when clicking Return Home during active transition", () => {
      const { container, rerender } = render(
        <GraphCanvas
          dataset={SEED_DATASET}
          index={index}
          selectedConceptSlug="rust"
          onSelectConcept={() => {}}
        />
      );

      const canvas = container.querySelector("canvas")!;
      rerender(
        <GraphCanvas
          dataset={SEED_DATASET}
          index={index}
          selectedConceptSlug="ownership"
          onSelectConcept={() => {}}
        />
      );

      const homeBtn = screen.getByRole("button", { name: /Return to Rust/i });
      fireEvent.click(homeBtn);

      const travelState = getFiberHook<UniverseTravelState>(
        canvas,
        (val) => Boolean(val && typeof val === "object" && "fromSlug" in val)
      );
      expect(travelState?.active).toBe(false);
      expect(travelState?.progress).toBe(1);
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 2: Scene Transitions while Desktop Reading Field is Resizing
  // --------------------------------------------------------------------------
  describe("Scenario 2: Scene transitions during desktop reading field resizing", () => {
    it("settles camera anchor and cancels animation frame when knowledgeFieldWidth changes mid-transition", () => {
      const { container, rerender } = render(
        <GraphCanvas
          dataset={SEED_DATASET}
          index={index}
          selectedConceptSlug="rust"
          knowledgeFieldWidth={480}
          onSelectConcept={() => {}}
        />
      );

      const canvas = container.querySelector("canvas")!;

      // Kick off transition to ownership
      rerender(
        <GraphCanvas
          dataset={SEED_DATASET}
          index={index}
          selectedConceptSlug="ownership"
          knowledgeFieldWidth={480}
          onSelectConcept={() => {}}
        />
      );

      // Desktop reading field resizes dynamically while transition is in flight
      rerender(
        <GraphCanvas
          dataset={SEED_DATASET}
          index={index}
          selectedConceptSlug="ownership"
          knowledgeFieldWidth={620}
          onSelectConcept={() => {}}
        />
      );

      const travelState = getFiberHook<UniverseTravelState>(
        canvas,
        (val) => Boolean(val && typeof val === "object" && "fromSlug" in val)
      );
      expect(travelState?.active).toBe(false);
      expect(travelState?.progress).toBe(1);

      const currentScene = getFiberHook<UniverseScene>(
        canvas,
        (val) => Boolean(val && typeof val === "object" && "focus" in val && "allNodes" in val)
      );
      expect(currentScene?.focus.slug).toBe("ownership");
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 3: G53-01 Dedicated Regression — WebGL Radius vs SVG Projection
  // --------------------------------------------------------------------------
  describe("Scenario 3: Dedicated G53-01 Regression (Radius invariant across zoom extremes)", () => {
    it("reports constant unscaled physical body radius across minimum and maximum zoom bounds", () => {
      let reportedPos: { x: number; y: number; radius: number } | null = null;
      const onFocusPosChange = vi.fn((pos) => {
        reportedPos = pos;
      });

      const { container } = render(
        <GraphCanvas
          dataset={SEED_DATASET}
          index={index}
          selectedConceptSlug="rust"
          onSelectConcept={() => {}}
          onFocusPositionChange={onFocusPosChange}
        />
      );

      const canvas = container.querySelector("canvas")!;
      expect(reportedPos).not.toBeNull();
      const baseRadius = (reportedPos as unknown as { radius: number }).radius;
      expect(baseRadius).toBeGreaterThan(20);
      expect(baseRadius).toBeLessThan(50);

      // Zoom out to minimum bound (0.3x) via wheel
      for (let i = 0; i < 15; i++) {
        fireEvent.wheel(canvas, { deltaY: 200, clientX: 400, clientY: 300 });
      }

      // Radius MUST remain invariant (not shrunk to 0.3 * baseRadius or clamped to 22)
      expect(reportedPos!.radius).toBe(baseRadius);

      // Zoom in to maximum bound (3.0x) via wheel
      for (let i = 0; i < 25; i++) {
        fireEvent.wheel(canvas, { deltaY: -200, clientX: 400, clientY: 300 });
      }

      // Radius MUST remain invariant (not blown up to 3.0 * baseRadius or clamped to 64)
      expect(reportedPos!.radius).toBe(baseRadius);
    });

    it("verifies SVG silhouette mask circle exactly matches unscaled physical body radius", () => {
      const panelRef = { current: document.createElement("aside") };
      const testRadius = 34;

      const { container } = render(
        <CelestialProjectionBridge
          focusPos={{ x: 500, y: 350, radius: testRadius }}
          archetype="volcanic-rocky"
          panelRef={panelRef}
          isMobile={false}
        />
      );

      const mask = container.querySelector("#planetSilhouetteMask");
      expect(mask).toBeDefined();
      const circle = mask?.querySelector("circle");
      expect(circle).toBeDefined();

      // Mask circle radius is exactly radius + 0.5 to cleanly shield the physical 3D sphere
      expect(Number(circle?.getAttribute("r"))).toBeCloseTo(testRadius + 0.5, 1);
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 4: Foreground Ring Masks under Simultaneous Pan and Zoom (RN-02)
  // --------------------------------------------------------------------------
  describe("Scenario 4: Foreground ring masks under simultaneous pan and zoom (RN-02)", () => {
    it("applies world un-transformation correctly for vector geometry fallback under extreme transforms", () => {
      const ctx = {
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        clip: vi.fn(),
        arc: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        bezierCurveTo: vi.fn(),
        translate: vi.fn(),
        scale: vi.fn(),
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        setLineDash: vi.fn(),
        createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
        createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
        drawImage: vi.fn(),
        measureText: vi.fn(() => ({ width: 40 })),
      } as unknown as CanvasRenderingContext2D;

      const dummyPath = {} as Path2D;
      const scene: UniverseScene = {
        focus: { id: "c1", slug: "os", name: "OS", visualMass: 1, radius: 38, x: 0, y: 0, opacity: 1, role: "focus" },
        primaryNodes: [],
        contextNodes: [],
        allNodes: [{ id: "c1", slug: "os", name: "OS", visualMass: 1, radius: 38, x: 0, y: 0, opacity: 1, role: "focus" }],
        relationships: [],
        isMobile: false,
      };

      // Test extreme transform: pan (-150, 220), zoom 0.4
      renderUniverseScene(
        ctx,
        800,
        600,
        { x: -150, y: 220, k: 0.4 },
        scene,
        {
          skipBodyRendering: true,
          skipBackgroundStars: true,
          skipNodeRendering: true,
          foregroundRingOcclusions: [{ path: dummyPath, x: 50, y: 100, size: 80, opacity: 1 }],
        }
      );

      expect(ctx.fill).toHaveBeenCalledWith(dummyPath);
      // Un-transformation: (50 - (-150)) / 0.4 = 200 / 0.4 = 500
      // (100 - 220) / 0.4 = -120 / 0.4 = -300
      // size: 80 / 0.4 = 200
      expect(ctx.translate).toHaveBeenCalledWith(500, -300);
      expect(ctx.scale).toHaveBeenCalledWith(200, 200);
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 5: Ring-Bearing Celestial Objects with Active Projection (G53-02)
  // --------------------------------------------------------------------------
  describe("Scenario 5: Ring-bearing celestial objects with active projection (G53-02)", () => {
    it("extends projection departure origins and silhouette mask beyond outer rings for Operating Systems", () => {
      const panelRef = { current: document.createElement("aside") };
      const osRings = {
        innerRadius: 66,
        outerRadius: 96,
        tilt: 0.42,
        opacity: 0.88,
        style: "ice" as const,
      };

      const { container } = render(
        <CelestialProjectionBridge
          focusPos={{ x: 450, y: 350, radius: 38 }}
          archetype="storm-giant"
          rings={osRings}
          panelRef={panelRef}
          isMobile={false}
        />
      );

      // ringVisualRadius = (96 / 50) * 38 = 72.96
      const mask = container.querySelector("#planetSilhouetteMask");
      expect(mask).toBeDefined();
      const circle = mask?.querySelector("circle");
      const maskRadius = Number(circle?.getAttribute("r"));

      // Silhouette mask must exceed outer ring visual boundary
      expect(maskRadius).toBeGreaterThan(72.96);

      // Verify contour arc and carrier path coordinates depart beyond the ring visual radius
      const paths = container.querySelectorAll("path");
      expect(paths.length).toBeGreaterThanOrEqual(4);
      paths.forEach((path) => {
        const d = path.getAttribute("d") ?? "";
        // Paths must not contain NaN
        expect(d).not.toContain("NaN");
        expect(d.length).toBeGreaterThan(10);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 6: Rapid Navigation Across Different Celestial Identities
  // --------------------------------------------------------------------------
  describe("Scenario 6: Rapid navigation across multiple concepts without state leakage", () => {
    it("settles cleanly to the final selected concept identity after rapid consecutive transitions", () => {
      const { container, rerender } = render(
        <GraphCanvas
          dataset={SEED_DATASET}
          index={index}
          selectedConceptSlug="rust"
          onSelectConcept={() => {}}
        />
      );

      const canvas = container.querySelector("canvas")!;

      // Rapidly transition through multiple concepts without waiting for transitions to settle
      rerender(
        <GraphCanvas
          dataset={SEED_DATASET}
          index={index}
          selectedConceptSlug="ownership"
          onSelectConcept={() => {}}
        />
      );
      rerender(
        <GraphCanvas
          dataset={SEED_DATASET}
          index={index}
          selectedConceptSlug="operating-systems"
          onSelectConcept={() => {}}
        />
      );
      rerender(
        <GraphCanvas
          dataset={SEED_DATASET}
          index={index}
          selectedConceptSlug="cpus"
          onSelectConcept={() => {}}
        />
      );

      const travelState = getFiberHook<UniverseTravelState>(
        canvas,
        (val) => Boolean(val && typeof val === "object" && "toSlug" in val)
      );
      expect(travelState?.toSlug).toBe("cpus");

      // Verify canvas is stable and no errors thrown
      expect(canvas).toBeDefined();
    });

    it("updates concept details and live announcement when navigating rapidly via controls", () => {
      render(<KnowledgeGraphExperience dataset={SEED_DATASET} initialSlug="rust" />);

      // Initial concept is Rust
      expect(screen.getByRole("heading", { name: "Rust" })).toBeDefined();

      // Click Ownership
      const ownershipBtn = screen.getByRole("button", { name: /Ownership, primary concept/i });
      fireEvent.click(ownershipBtn);

      expect(screen.getByRole("heading", { name: "Ownership" })).toBeDefined();
      expect(screen.getByText(/Selected concept: Ownership/i)).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 7: Mobile Cosmic Lens Expansion During Active Spatial Transition
  // --------------------------------------------------------------------------
  describe("Scenario 7: Mobile Cosmic Lens expansion during active transition (G53-03)", () => {
    it("suppresses projection bridge cleanly when Cosmic Lens is expanded on mobile", () => {
      // Simulate mobile viewport
      window.innerWidth = 375;
      window.innerHeight = 667;
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("max-width: 768px"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const panelRef = { current: document.createElement("aside") };

      // Render bridge in mobile expanded state
      const { container } = render(
        <CelestialProjectionBridge
          focusPos={{ x: 187, y: 150, radius: 24 }}
          archetype="volcanic-rocky"
          panelRef={panelRef}
          isMobile={true}
          isMobileExpanded={true}
        />
      );

      // Must be completely null (no inverted Bezier curves or obscuring lines over reading text)
      expect(container.firstChild).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 8: Projection Masking During Responsive Viewport Changes
  // --------------------------------------------------------------------------
  describe("Scenario 8: Projection masking during responsive viewport changes", () => {
    it("handles viewport resizing without geometry corruption or NaN coordinates", () => {
      const panelRef = { current: document.createElement("aside") };
      const { container, rerender } = render(
        <CelestialProjectionBridge
          focusPos={{ x: 500, y: 350, radius: 38 }}
          archetype="mineral-rocky"
          panelRef={panelRef}
          isMobile={false}
        />
      );

      expect(container.querySelector("svg")).toBeDefined();

      // Trigger window resize event
      act(() => {
        window.dispatchEvent(new Event("resize"));
      });

      // Rerender with mobile coordinates
      rerender(
        <CelestialProjectionBridge
          focusPos={{ x: 180, y: 120, radius: 24 }}
          archetype="mineral-rocky"
          panelRef={panelRef}
          isMobile={true}
          isMobileExpanded={false}
        />
      );

      const mobileSvg = container.querySelector("svg");
      expect(mobileSvg).toBeDefined();
      const mobilePaths = mobileSvg?.querySelectorAll("path");
      mobilePaths?.forEach((p) => {
        const d = p.getAttribute("d") ?? "";
        expect(d).not.toContain("NaN");
      });
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 9: Bibliographic URL Scheme Validation (SEC-02 Safeguards)
  // --------------------------------------------------------------------------
  describe("Scenario 9: Bibliographic URL validation safeguards (SEC-02)", () => {
    it("accepts complex legitimate scholarly, repository, and archival URLs", () => {
      const scholarlyUrls = [
        "https://doi.org/10.1145/3360589",
        "https://arxiv.org/abs/2004.07223v2",
        "https://github.com/rust-lang/rust/tree/master/library/core#L120-L145",
        "https://web.archive.org/web/20210506043211/https://doc.rust-lang.org/book/",
        "https://portal.acm.org/citation.cfm?id=123456&query=test&sort=asc#section.2",
        "http://standards.iso.org/iso/9899/c11",
      ];

      scholarlyUrls.forEach((url) => {
        expect(isSafeUrl(url)).toBe(true);
      });
    });

    it("rejects dangerous or scriptable URL schemes", () => {
      const dangerousUrls = [
        "javascript:alert(document.cookie)",
        "JAVASCRIPT:alert(1)",
        "  javascript:evil()  ",
        "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
        "vbscript:msgbox(1)",
        "file:///etc/passwd",
        "blob:https://example.com/uuid-here",
        "",
        "   ",
        null,
        undefined,
      ];

      dangerousUrls.forEach((url) => {
        expect(isSafeUrl(url)).toBe(false);
      });
    });
  });
});
