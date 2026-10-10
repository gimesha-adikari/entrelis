import { describe, expect, it, vi } from "vitest";
import { getRelationshipStyleConfig, renderUniverseScene } from "./universe-renderer";
import type { UniverseNode, UniverseScene } from "../scene/types";
import { calculateRelationshipGeometry } from "./relationship-path";
import { interpolateScenes } from "../scene/transition-scene";
import { SEED_DATASET } from "@/data/seed";
import type { RelationshipType } from "@/domain/knowledge/types";

function createMockContext(): CanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    rect: vi.fn(),
    fillRect: vi.fn(),
    roundRect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 40 })),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    fillStyle: "#ffffff",
    strokeStyle: "#ffffff",
    lineWidth: 1,
  } as unknown as CanvasRenderingContext2D;
}

function createMockUniverseScene(
  options: {
    relOpacity?: number;
    relType?: RelationshipType;
    isMobile?: boolean;
    targetX?: number;
    targetY?: number;
  } = {}
): UniverseScene {
  const rustConcept = SEED_DATASET.concepts.find((c) => c.slug === "rust")!;
  const ownershipConcept = SEED_DATASET.concepts.find((c) => c.slug === "ownership")!;

  const focusNode: UniverseNode = {
    id: "concept-rust",
    slug: "rust",
    name: "Rust",
    concept: rustConcept,
    role: "focus",
    visualMass: 1,
    radius: 34,
    x: 0,
    y: 0,
    opacity: 1,
  };

  const primaryNode: UniverseNode = {
    id: "concept-ownership",
    slug: "ownership",
    name: "Ownership",
    concept: ownershipConcept,
    role: "primary",
    visualMass: 0.65,
    radius: 18,
    x: options.targetX ?? -140,
    y: options.targetY ?? 50,
    opacity: 1,
  };

  const relOpacity = options.relOpacity ?? 0.8;
  const relType = options.relType ?? "uses";

  return {
    focus: focusNode,
    primaryNodes: [primaryNode],
    contextNodes: [],
    allNodes: [focusNode, primaryNode],
    relationships: [
      {
        id: "rel-1",
        sourceId: focusNode.id,
        targetId: primaryNode.id,
        type: relType,
        explanation: `Rust ${relType} ownership`,
        strength: "primary",
        relationship: {
          id: "rel-1",
          sourceConceptId: focusNode.id,
          targetConceptId: primaryNode.id,
          type: relType,
          explanation: `Rust ${relType} ownership`,
          strength: "primary",
          sourceIds: [],
          reviewStatus: "verified",
        },
        role: "focus-connection",
        curvature: 0.2,
        opacity: relOpacity,
      },
    ],
    isMobile: options.isMobile ?? false,
  };
}

describe("renderUniverseScene compositing and layer options", () => {
  const scene = createMockUniverseScene();

  it("skips 2D background stars when skipBackgroundStars option is enabled", () => {
    const ctxNormal = createMockContext();
    renderUniverseScene(ctxNormal, 800, 600, { x: 0, y: 0, k: 1 }, scene, {
      skipBackgroundStars: false,
    });
    const arcCallsWithStars = (ctxNormal.arc as ReturnType<typeof vi.fn>).mock.calls.length;

    const ctxSkip = createMockContext();
    renderUniverseScene(ctxSkip, 800, 600, { x: 0, y: 0, k: 1 }, scene, {
      skipBackgroundStars: true,
    });
    const arcCallsWithoutStars = (ctxSkip.arc as ReturnType<typeof vi.fn>).mock.calls.length;

    // Skipping stars should result in significantly fewer arc calls
    expect(arcCallsWithoutStars).toBeLessThan(arcCallsWithStars);
    expect(arcCallsWithStars - arcCallsWithoutStars).toBeGreaterThanOrEqual(50);
  });

  it("punches out node circles with destination-out when skipBodyRendering is true", () => {
    const ctx = createMockContext();
    const gcoAssignments: string[] = [];

    Object.defineProperty(ctx, "globalCompositeOperation", {
      get() {
        return "source-over";
      },
      set(val: string) {
        gcoAssignments.push(val);
      },
      configurable: true,
    });

    renderUniverseScene(ctx, 800, 600, { x: 0, y: 0, k: 1 }, scene, {
      skipBodyRendering: true,
      skipBackgroundStars: true,
    });

    expect(gcoAssignments).toContain("destination-out");
  });

  it("draws relationship paths from one physical body boundary to the other", () => {
    const ctx = createMockContext();
    const source = scene.allNodes.find((node) => node.id === scene.relationships[0]?.sourceId)!;
    const target = scene.allNodes.find((node) => node.id === scene.relationships[0]?.targetId)!;

    renderUniverseScene(ctx, 800, 600, { x: 0, y: 0, k: 1 }, scene, {
      skipBackgroundStars: true,
      skipBodyRendering: true,
    });

    const start = (ctx.moveTo as ReturnType<typeof vi.fn>).mock.calls[0]!;
    const end = (ctx.quadraticCurveTo as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(Math.hypot(start[0]! - source.x, start[1]! - source.y)).toBeCloseTo(source.radius, 5);
    expect(Math.hypot(end[2]! - target.x, end[3]! - target.y)).toBeCloseTo(target.radius, 5);
  });

  it("anchors to the current interpolated focus radius during a role transition", () => {
    const fromScene = createMockUniverseScene();
    const widenedFocus = { ...fromScene.focus, radius: 48 };
    const toScene: UniverseScene = {
      ...fromScene,
      focus: widenedFocus,
      allNodes: [widenedFocus, ...fromScene.allNodes.filter((node) => node.id !== widenedFocus.id)],
    };
    const displayedScene = interpolateScenes(fromScene, toScene, 0.5);
    const ctx = createMockContext();

    renderUniverseScene(ctx, 800, 600, { x: 0, y: 0, k: 1 }, displayedScene, {
      skipBackgroundStars: true,
      skipBodyRendering: true,
    });

    const start = (ctx.moveTo as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(displayedScene.focus.radius).not.toBe(fromScene.focus.radius);
    expect(
      Math.hypot(start[0]! - displayedScene.focus.x, start[1]! - displayedScene.focus.y)
    ).toBeCloseTo(displayedScene.focus.radius, 5);
  });

  it("places the target marker on the clipped curve and follows its forward tangent", () => {
    const ctx = createMockContext();
    const relationship = scene.relationships[0]!;
    const source = scene.allNodes.find((node) => node.id === relationship.sourceId)!;
    const target = scene.allNodes.find((node) => node.id === relationship.targetId)!;
    const geometry = calculateRelationshipGeometry(source, target, relationship.curvature, 1)!;

    renderUniverseScene(ctx, 800, 600, { x: 0, y: 0, k: 1 }, scene, {
      skipBackgroundStars: true,
      skipNodeRendering: true,
    });

    const cueVertex = (ctx.lineTo as ReturnType<typeof vi.fn>).mock.calls[0]!;
    const spark = (ctx.arc as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(cueVertex[0]).toBeCloseTo(geometry.cue!.point.x, 7);
    expect(cueVertex[1]).toBeCloseTo(geometry.cue!.point.y, 7);
    expect(spark[0]).toBeCloseTo(geometry.cue!.point.x, 7);
    expect(spark[1]).toBeCloseTo(geometry.cue!.point.y, 7);
  });
});

describe("Relationship screen-space sizing", () => {
  const scene = createMockUniverseScene({ targetX: -800, targetY: 50 });

  it.each([0.3, 0.6, 1, 3])("keeps strokes and badges the same CSS size at zoom %s", (zoom) => {
    for (const dpr of [1, 2]) {
      const ctx = createMockContext();
      let lineWidth = 1;
      const assignedLineWidths: number[] = [];
      let font = "10px sans-serif";
      const assignedFonts: string[] = [];
      Object.defineProperty(ctx, "lineWidth", {
        get: () => lineWidth,
        set: (value: number) => {
          lineWidth = value;
          assignedLineWidths.push(value);
        },
        configurable: true,
      });
      Object.defineProperty(ctx, "font", {
        get: () => font,
        set: (value: string) => {
          font = value;
          assignedFonts.push(value);
        },
        configurable: true,
      });
      ctx.measureText = vi.fn(() => ({ width: 40 / zoom }) as TextMetrics);
      Object.defineProperty(window, "devicePixelRatio", { value: dpr, configurable: true });

      renderUniverseScene(ctx, 800 * dpr, 600 * dpr, { x: 0, y: 0, k: zoom }, scene, {
        skipBackgroundStars: true,
        skipBodyRendering: true,
      });

      expect(assignedLineWidths[0]! * zoom).toBeCloseTo(6, 5);
      expect(assignedLineWidths[3]! * zoom).toBeCloseTo(1.2, 5);
      expect(assignedLineWidths[4]! * zoom).toBeCloseTo(1.1, 5);
      expect(Number.parseFloat(assignedFonts[0]!) * zoom).toBeCloseTo(9, 5);
      const badge = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls[0]!;
      expect(badge[2]! * zoom).toBeCloseTo(52, 5);
      expect(badge[3]! * zoom).toBeCloseTo(13, 5);
      expect((ctx.scale as ReturnType<typeof vi.fn>).mock.calls[0]).toEqual([
        zoom * dpr,
        zoom * dpr,
      ]);
    }
    Object.defineProperty(window, "devicePixelRatio", { value: 1, configurable: true });
  });
});

describe("Relationship Visual Hierarchy & Style Config", () => {
  it("enforces clear hierarchy between focus and context connections", () => {
    const focusPrimary = getRelationshipStyleConfig({
      role: "focus-connection",
      strength: "primary",
      opacity: 1.0,
      isIncident: false,
      hasActiveInteraction: false,
      isMobile: false,
      dist: 120,
    });

    const contextConn = getRelationshipStyleConfig({
      role: "context-connection",
      strength: "supporting",
      opacity: 1.0,
      isIncident: false,
      hasActiveInteraction: false,
      isMobile: false,
      dist: 120,
    });

    expect(focusPrimary.isFocus).toBe(true);
    expect(focusPrimary.coreWidth).toBeGreaterThan(contextConn.coreWidth);
    expect(focusPrimary.coreAlpha).toBeGreaterThan(contextConn.coreAlpha);
    expect(focusPrimary.haloAlpha).toBeGreaterThan(0.05);
    expect(contextConn.haloAlpha).toBe(0); // Context connections remain quiet without halo
  });

  it("differentiates primary, strong, and supporting strengths within focus connections", () => {
    const primary = getRelationshipStyleConfig({
      role: "focus-connection",
      strength: "primary",
      opacity: 1.0,
      isIncident: false,
      hasActiveInteraction: false,
      isMobile: false,
      dist: 100,
    });
    const strong = getRelationshipStyleConfig({
      role: "focus-connection",
      strength: "strong",
      opacity: 1.0,
      isIncident: false,
      hasActiveInteraction: false,
      isMobile: false,
      dist: 100,
    });
    const supporting = getRelationshipStyleConfig({
      role: "focus-connection",
      strength: "supporting",
      opacity: 1.0,
      isIncident: false,
      hasActiveInteraction: false,
      isMobile: false,
      dist: 100,
    });

    expect(primary.coreAlpha).toBeGreaterThan(strong.coreAlpha);
    expect(strong.coreAlpha).toBeGreaterThan(supporting.coreAlpha);
    expect(primary.haloAlpha).toBeGreaterThan(strong.haloAlpha);
  });

  it("emphasizes incident relationships and attenuates non-incident relationships during hover", () => {
    const normal = getRelationshipStyleConfig({
      role: "focus-connection",
      strength: "primary",
      opacity: 1.0,
      isIncident: false,
      hasActiveInteraction: false,
      isMobile: false,
      dist: 120,
    });

    const incident = getRelationshipStyleConfig({
      role: "focus-connection",
      strength: "primary",
      opacity: 1.0,
      isIncident: true,
      hasActiveInteraction: true,
      isMobile: false,
      dist: 120,
    });

    const nonIncidentDuringInteraction = getRelationshipStyleConfig({
      role: "focus-connection",
      strength: "primary",
      opacity: 1.0,
      isIncident: false,
      hasActiveInteraction: true,
      isMobile: false,
      dist: 120,
    });

    // Incident path is amplified
    expect(incident.coreWidth).toBeGreaterThan(normal.coreWidth);
    expect(incident.coreAlpha).toBeGreaterThan(normal.coreAlpha);
    expect(incident.haloAlpha).toBeGreaterThan(normal.haloAlpha);

    // Non-incident path recedes into the background
    expect(nonIncidentDuringInteraction.coreAlpha).toBeLessThan(normal.coreAlpha);
  });

  it("renders labels for focus relationships on desktop but suppresses on mobile and short edges", () => {
    const desktopFocusLong = getRelationshipStyleConfig({
      role: "focus-connection",
      strength: "primary",
      opacity: 1.0,
      isIncident: false,
      hasActiveInteraction: false,
      isMobile: false,
      dist: 120,
    });
    expect(desktopFocusLong.renderLabel).toBe(true);

    const mobileFocus = getRelationshipStyleConfig({
      role: "focus-connection",
      strength: "primary",
      opacity: 1.0,
      isIncident: false,
      hasActiveInteraction: false,
      isMobile: true,
      dist: 120,
    });
    expect(mobileFocus.renderLabel).toBe(false);

    const desktopShort = getRelationshipStyleConfig({
      role: "focus-connection",
      strength: "primary",
      opacity: 1.0,
      isIncident: false,
      hasActiveInteraction: false,
      isMobile: false,
      dist: 60,
    });
    expect(desktopShort.renderLabel).toBe(false);
  });
});

describe("Relationship Type Badges & Interaction Emphasis in renderUniverseScene", () => {
  const scene = createMockUniverseScene();

  it("renders relationship type badge text on desktop and suppresses on mobile", () => {
    const ctxDesktop = createMockContext();
    renderUniverseScene(ctxDesktop, 800, 600, { x: 0, y: 0, k: 1 }, scene, {
      isMobile: false,
      skipBackgroundStars: true,
      skipBodyRendering: true,
    });

    const fillTextCallsDesktop = (ctxDesktop.fillText as ReturnType<typeof vi.fn>).mock.calls;
    const hasUsesLabel = fillTextCallsDesktop.some((call) => call[0] === "uses");
    expect(hasUsesLabel).toBe(true);

    const ctxMobile = createMockContext();
    renderUniverseScene(ctxMobile, 800, 600, { x: 0, y: 0, k: 1 }, scene, {
      isMobile: true,
      skipBackgroundStars: true,
      skipBodyRendering: true,
    });

    const fillTextCallsMobile = (ctxMobile.fillText as ReturnType<typeof vi.fn>).mock.calls;
    const hasUsesLabelMobile = fillTextCallsMobile.some((call) => call[0] === "uses");
    expect(hasUsesLabelMobile).toBe(false);
  });
});

describe("Relationship Transition Opacity & Lifecycle (GIM-31)", () => {
  it("strictly produces zero alpha and suppresses labels when opacity is 0", () => {
    const styleZero = getRelationshipStyleConfig({
      role: "focus-connection",
      strength: "primary",
      opacity: 0,
      isIncident: false,
      hasActiveInteraction: false,
      isMobile: false,
      dist: 120,
    });

    expect(styleZero.coreAlpha).toBe(0);
    expect(styleZero.haloAlpha).toBe(0);
    expect(styleZero.cueAlpha).toBe(0);
    expect(styleZero.renderLabel).toBe(false);
  });

  it("scales core, halo, cue, and badge coherently at partial opacities (0.25, 0.5, 1.0)", () => {
    const style25 = getRelationshipStyleConfig({
      role: "focus-connection",
      strength: "primary",
      opacity: 0.25,
      isIncident: false,
      hasActiveInteraction: false,
      isMobile: false,
      dist: 120,
    });

    const style50 = getRelationshipStyleConfig({
      role: "focus-connection",
      strength: "primary",
      opacity: 0.5,
      isIncident: false,
      hasActiveInteraction: false,
      isMobile: false,
      dist: 120,
    });

    const style100 = getRelationshipStyleConfig({
      role: "focus-connection",
      strength: "primary",
      opacity: 1.0,
      isIncident: false,
      hasActiveInteraction: false,
      isMobile: false,
      dist: 120,
    });

    // Check proportional scaling without double-multiplication
    expect(style25.coreAlpha).toBeCloseTo(style100.coreAlpha * 0.25, 3);
    expect(style50.coreAlpha).toBeCloseTo(style100.coreAlpha * 0.5, 3);
    expect(style25.haloAlpha).toBeCloseTo(style100.haloAlpha * 0.25, 3);
    expect(style50.haloAlpha).toBeCloseTo(style100.haloAlpha * 0.5, 3);
    expect(style25.cueAlpha).toBeCloseTo(style100.cueAlpha * 0.25, 3);
    expect(style50.cueAlpha).toBeCloseTo(style100.cueAlpha * 0.5, 3);

    // Labels visible on desktop when opacity >= 0.25
    expect(style25.renderLabel).toBe(true);
    expect(style50.renderLabel).toBe(true);
    expect(style100.renderLabel).toBe(true);
  });

  it("completely skips rendering any relationship paths, cues, or badges when rel.opacity is 0", () => {
    const sceneZero = createMockUniverseScene({ relOpacity: 0 });
    const ctx = createMockContext();

    renderUniverseScene(ctx, 800, 600, { x: 0, y: 0, k: 1 }, sceneZero, {
      isMobile: false,
      skipBackgroundStars: true,
      skipBodyRendering: true,
      skipNodeRendering: true,
    });

    // When opacity is 0, no bezier curves or relationship badge labels should be drawn
    const quadCalls = (ctx.quadraticCurveTo as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(quadCalls).toBe(0);

    const fillTextCalls = (ctx.fillText as ReturnType<typeof vi.fn>).mock.calls;
    const hasRelationshipBadge = fillTextCalls.some((call) => call[0] === "uses");
    expect(hasRelationshipBadge).toBe(false);
    expect((ctx.moveTo as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0);
    expect((ctx.lineTo as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0);
    expect((ctx.arc as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0);
  });

  it("handles entering and departing relationships across scene transitions seamlessly", () => {
    const fromScene = createMockUniverseScene({ relOpacity: 1.0 });
    // toScene has no relationships (the relationship is departing)
    const toScene: UniverseScene = {
      ...fromScene,
      relationships: [],
    };

    // Transition progress = 1 (departed completely): opacity becomes 0
    const finalScene = interpolateScenes(fromScene, toScene, 1.0);
    const ctxFinal = createMockContext();
    renderUniverseScene(ctxFinal, 800, 600, { x: 0, y: 0, k: 1 }, finalScene, {
      skipBackgroundStars: true,
      skipBodyRendering: true,
    });
    expect((ctxFinal.quadraticCurveTo as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0);

    // Transition progress = 0.5: departing relationship is partially faded
    const midScene = interpolateScenes(fromScene, toScene, 0.5);
    expect(midScene.relationships.length).toBe(1);
    expect(midScene.relationships[0]?.opacity).toBeGreaterThan(0);
    expect(midScene.relationships[0]?.opacity).toBeLessThan(1);

    const ctxMid = createMockContext();
    renderUniverseScene(ctxMid, 800, 600, { x: 0, y: 0, k: 1 }, midScene, {
      skipBackgroundStars: true,
      skipBodyRendering: true,
    });
    expect((ctxMid.quadraticCurveTo as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(
      0
    );
  });
});

describe("WebGL-projected relationship boundaries", () => {
  const baseScene = createMockUniverseScene();
  const source = baseScene.focus;
  const target = { ...baseScene.primaryNodes[0]!, x: -300, y: 50 };
  const separatedScene: UniverseScene = {
    ...baseScene,
    primaryNodes: [target],
    allNodes: [source, target],
  };

  it.each([0.3, 0.6, 1, 3])(
    "projects WebGL path endpoints and masks onto the sphere at k=%s across DPRs",
    (zoom) => {
      for (const dpr of [1, 2, 3]) {
        const effectiveDpr = Math.min(dpr, 2);
        Object.defineProperty(window, "devicePixelRatio", { value: dpr, configurable: true });
        const ctx = createMockContext();

        renderUniverseScene(
          ctx,
          800 * effectiveDpr,
          600 * effectiveDpr,
          { x: 21, y: -13, k: zoom },
          separatedScene,
          { skipBackgroundStars: true, skipBodyRendering: true }
        );

        const pathStart = (ctx.moveTo as ReturnType<typeof vi.fn>).mock.calls[0]!;
        const pathEnd = (ctx.quadraticCurveTo as ReturnType<typeof vi.fn>).mock.calls[0]!;
        const startWorldDistance = Math.hypot(pathStart[0]! - source.x, pathStart[1]! - source.y);
        const endWorldDistance = Math.hypot(pathEnd[2]! - target.x, pathEnd[3]! - target.y);
        const startCssDistance = startWorldDistance * zoom;
        const endCssDistance = endWorldDistance * zoom;
        const startBackingDistance = startCssDistance * effectiveDpr;
        const endBackingDistance = endCssDistance * effectiveDpr;

        expect(startCssDistance, `source radius at DPR ${dpr}`).toBeCloseTo(source.radius, 5);
        expect(endCssDistance, `target radius at DPR ${dpr}`).toBeCloseTo(target.radius, 5);
        expect(startBackingDistance / effectiveDpr).toBeCloseTo(source.radius, 5);
        expect(endBackingDistance / effectiveDpr).toBeCloseTo(target.radius, 5);
        expect(startBackingDistance).toBeCloseTo(source.radius * effectiveDpr, 5);
        expect(endBackingDistance).toBeCloseTo(target.radius * effectiveDpr, 5);

        const sourceMask = (ctx.arc as ReturnType<typeof vi.fn>).mock.calls.find(
          (call) => call[0] === source.x && call[1] === source.y
        );
        const targetMask = (ctx.arc as ReturnType<typeof vi.fn>).mock.calls.find(
          (call) => call[0] === target.x && call[1] === target.y
        );
        expect(sourceMask?.[2]).toBeDefined();
        expect((sourceMask?.[2] ?? Number.NaN) * zoom, `source mask at DPR ${dpr}`).toBeCloseTo(
          source.radius,
          5
        );
        expect(targetMask?.[2]).toBeDefined();
        expect((targetMask?.[2] ?? Number.NaN) * zoom, `target mask at DPR ${dpr}`).toBeCloseTo(
          target.radius,
          5
        );
      }
    }
  );

  it.each([0.3, 0.6, 1, 3])(
    "keeps Canvas-only body and path projection consistent at k=%s",
    (zoom) => {
      const ctx = createMockContext();
      renderUniverseScene(ctx, 800, 600, { x: 0, y: 0, k: zoom }, separatedScene, {
        skipBackgroundStars: true,
      });

      const pathStart = (ctx.moveTo as ReturnType<typeof vi.fn>).mock.calls[0]!;
      const pathEnd = (ctx.quadraticCurveTo as ReturnType<typeof vi.fn>).mock.calls[0]!;
      expect(Math.hypot(pathStart[0]! - source.x, pathStart[1]! - source.y)).toBeCloseTo(
        source.radius,
        5
      );
      expect(Math.hypot(pathEnd[2]! - target.x, pathEnd[3]! - target.y)).toBeCloseTo(
        target.radius,
        5
      );
    }
  );

  it("keeps a WebGL body masked throughout its visible opacity fade", () => {
    const fadingSource = { ...source, opacity: 0.005 };
    const fadingScene: UniverseScene = {
      ...separatedScene,
      focus: fadingSource,
      allNodes: [fadingSource, target],
    };
    const ctx = createMockContext();
    renderUniverseScene(ctx, 800, 600, { x: 0, y: 0, k: 1 }, fadingScene, {
      skipBackgroundStars: true,
      skipBodyRendering: true,
    });

    const sourceMask = (ctx.arc as ReturnType<typeof vi.fn>).mock.calls.find(
      (call) => call[0] === fadingSource.x && call[1] === fadingSource.y
    );
    expect(sourceMask?.[2]).toBeCloseTo(fadingSource.radius, 5);
  });

  it("suppresses a strand when zoom makes the WebGL body boundaries overlap", () => {
    const closeTarget = { ...target, x: -100, y: 0 };
    const closeScene: UniverseScene = {
      ...separatedScene,
      primaryNodes: [closeTarget],
      allNodes: [source, closeTarget],
    };
    const hybrid = createMockContext();
    renderUniverseScene(hybrid, 800, 600, { x: 0, y: 0, k: 0.3 }, closeScene, {
      skipBackgroundStars: true,
      skipBodyRendering: true,
      skipNodeRendering: true,
    });
    expect(hybrid.moveTo).not.toHaveBeenCalled();

    const canvasOnly = createMockContext();
    renderUniverseScene(canvasOnly, 800, 600, { x: 0, y: 0, k: 0.3 }, closeScene, {
      skipBackgroundStars: true,
      skipNodeRendering: true,
    });
    expect(canvasOnly.moveTo).toHaveBeenCalled();
  });

  it("uses projected sphere radius and CSS clearance before placing relationship badges", () => {
    const closeScene = createMockUniverseScene({ targetX: -260, targetY: 50 });
    const ctx = createMockContext();
    renderUniverseScene(ctx, 800, 600, { x: 0, y: 0, k: 0.3 }, closeScene, {
      skipBackgroundStars: true,
      skipNodeRendering: true,
      skipBodyRendering: true,
    });

    expect(ctx.roundRect).not.toHaveBeenCalled();
  });
});

describe("foreground ring relationship compositing", () => {
  it("keeps unrelated relationships visible while one endpoint body is pending", () => {
    const scene = createMockUniverseScene();
    const contextNode = {
      ...scene.primaryNodes[0]!,
      id: "concept-memory",
      slug: "memory",
      name: "Memory",
      concept: SEED_DATASET.concepts.find((concept) => concept.slug === "memory")!,
      role: "context" as const,
      x: 220,
      y: 120,
    };
    const independentRelationship = {
      ...scene.relationships[0]!,
      id: "rel-independent",
      sourceId: scene.primaryNodes[0]!.id,
      targetId: contextNode.id,
      role: "context-connection" as const,
      relationship: {
        ...scene.relationships[0]!.relationship,
        id: "rel-independent",
        sourceConceptId: scene.primaryNodes[0]!.id,
        targetConceptId: contextNode.id,
      },
    };
    const sceneWithUnrelatedPath: UniverseScene = {
      ...scene,
      contextNodes: [contextNode],
      allNodes: [...scene.allNodes, contextNode],
      relationships: [...scene.relationships, independentRelationship],
    };
    const ctx = createMockContext();
    renderUniverseScene(ctx, 800, 600, { x: 0, y: 0, k: 1 }, createMockUniverseScene(), {
      skipBodyRendering: true,
      skipBackgroundStars: true,
      skipNodeRendering: true,
      unreadyRelationshipNodeIds: new Set([scene.focus.id]),
    } as Parameters<typeof renderUniverseScene>[5]);

    const isolatedContext = createMockContext();
    renderUniverseScene(isolatedContext, 800, 600, { x: 0, y: 0, k: 1 }, sceneWithUnrelatedPath, {
      skipBodyRendering: true,
      skipBackgroundStars: true,
      skipNodeRendering: true,
      unreadyRelationshipNodeIds: new Set([scene.focus.id]),
    } as Parameters<typeof renderUniverseScene>[5]);

    expect(ctx.quadraticCurveTo).not.toHaveBeenCalled();
    expect(isolatedContext.quadraticCurveTo).toHaveBeenCalledOnce();
  });

  it("does not draw a strand across a missing ring mask when its body is unready", () => {
    const scene = createMockUniverseScene();
    const ctx = createMockContext();
    renderUniverseScene(ctx, 800, 600, { x: 0, y: 0, k: 1 }, scene, {
      skipBodyRendering: true,
      skipBackgroundStars: true,
      skipNodeRendering: true,
      unreadyRelationshipNodeIds: new Set([scene.focus.id, scene.primaryNodes[0]!.id]),
    });

    expect(ctx.moveTo).not.toHaveBeenCalled();
    expect(ctx.stroke).not.toHaveBeenCalled();
    expect(ctx.lineTo).not.toHaveBeenCalled();
    expect(ctx.fillText).not.toHaveBeenCalled();
  });

  it("uses the supplied actual projected ring mask at CSS size, before node labels", () => {
    const scene = createMockUniverseScene();
    const ctx = createMockContext();
    const image = document.createElement("canvas");
    renderUniverseScene(ctx, 800, 600, { x: 12, y: 8, k: 3 }, scene, {
      skipBodyRendering: true,
      skipBackgroundStars: true,
      foregroundRingOcclusions: [{ image, x: 60, y: 32, size: 90, opacity: 0.7 }],
    });
    expect(ctx.drawImage).toHaveBeenCalledWith(image, 16, 8, 30, 30);
  });

  it("draws a geometry-only fallback mask over strands while exact alpha work is pending", () => {
    const ctx = createMockContext();
    const path = {} as Path2D;

    renderUniverseScene(ctx, 800, 600, { x: 0, y: 0, k: 1 }, createMockUniverseScene(), {
      skipBodyRendering: true,
      skipBackgroundStars: true,
      skipNodeRendering: true,
      foregroundRingOcclusions: [{ path, x: 50, y: 30, size: 0.5, opacity: 1 }],
    });

    expect(ctx.fill).toHaveBeenCalledWith(path);
    expect(ctx.translate).toHaveBeenCalledWith(50, 30);
    expect(ctx.scale).toHaveBeenCalledWith(0.5, 0.5);
  });

  it("keeps a safe relationship visible without punching out a shader-pending body", () => {
    const ctx = createMockContext();
    const pendingScene = createMockUniverseScene();
    const pendingTarget = pendingScene.primaryNodes[0]!;
    const readyCtx = createMockContext();
    renderUniverseScene(readyCtx, 800, 600, { x: 0, y: 0, k: 1 }, pendingScene, {
      skipBodyRendering: true,
      skipBackgroundStars: true,
    });
    const result = renderUniverseScene(ctx, 800, 600, { x: 0, y: 0, k: 1 }, pendingScene, {
      skipBodyRendering: true,
      skipBackgroundStars: true,
      bodyNotReadyNodeIds: new Set([pendingTarget.id]),
    });

    expect(result.visibleRelationshipIds).toEqual(new Set([pendingScene.relationships[0]!.id]));
    // The ready source is punched out; the missing target body keeps its endpoint gap intact.
    expect((ctx.arc as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(
      (readyCtx.arc as ReturnType<typeof vi.fn>).mock.calls.length - 1
    );
  });

  it("activates a pending pulse on the first safe edge pass and keeps its semantic direction", () => {
    const scene = createMockUniverseScene();
    const relationship = scene.relationships[0]!;
    const result = renderUniverseScene(createMockContext(), 800, 600, { x: 0, y: 0, k: 1 }, scene, {
      skipBodyRendering: true,
      skipBackgroundStars: true,
      skipNodeRendering: true,
      pendingPulse: {
        relationshipId: relationship.id,
        sourceId: relationship.sourceId,
        targetId: relationship.targetId,
        requestedAt: 100,
      },
      now: 450,
    });

    expect(result.visibleRelationshipIds).toEqual(new Set([relationship.id]));
    expect(result.activatedPulse).toEqual({
      relationshipId: relationship.id,
      sourceId: relationship.sourceId,
      targetId: relationship.targetId,
      startedAt: 450,
    });
  });

  it("does not activate pending energy for an endpoint awaiting safe mask readiness", () => {
    const scene = createMockUniverseScene();
    const relationship = scene.relationships[0]!;
    const result = renderUniverseScene(createMockContext(), 800, 600, { x: 0, y: 0, k: 1 }, scene, {
      skipBodyRendering: true,
      skipBackgroundStars: true,
      skipNodeRendering: true,
      unreadyRelationshipNodeIds: new Set([relationship.targetId]),
      pendingPulse: {
        relationshipId: relationship.id,
        sourceId: relationship.sourceId,
        targetId: relationship.targetId,
        requestedAt: 100,
      },
      now: 450,
    });

    expect(result.visibleRelationshipIds).toEqual(new Set());
    expect(result.activatedPulse).toBeUndefined();
  });

  it("occludes strands before drawing directional cues and readable labels", () => {
    const scene = createMockUniverseScene();
    const ctx = createMockContext();
    const image = document.createElement("canvas");
    const order: string[] = [];
    ctx.stroke = vi.fn(() => order.push("strand"));
    ctx.drawImage = vi.fn((source) => {
      if (source === image) order.push("ring-mask");
    });
    ctx.lineTo = vi.fn(() => order.push("directional-cue"));
    ctx.fillText = vi.fn(() => order.push("label"));

    renderUniverseScene(ctx, 800, 600, { x: 0, y: 0, k: 1 }, scene, {
      skipBodyRendering: true,
      skipBackgroundStars: true,
      foregroundRingOcclusions: [{ image, x: 60, y: 32, size: 90, opacity: 0.7 }],
    });

    const strand = order.indexOf("strand");
    const mask = order.indexOf("ring-mask");
    const cue = order.indexOf("directional-cue");
    const label = order.indexOf("label");
    expect(strand).toBeGreaterThanOrEqual(0);
    expect(mask).toBeGreaterThan(strand);
    expect(cue).toBeGreaterThan(mask);
    expect(label).toBeGreaterThan(mask);
  });
});

describe("quiet filament lifecycle", () => {
  it("suppresses unsafe short labels at low zoom", () => {
    const ctx = createMockContext();
    renderUniverseScene(ctx, 800, 600, { x: 0, y: 0, k: 0.3 }, createMockUniverseScene(), {
      skipBackgroundStars: true,
      skipNodeRendering: true,
    });
    expect(ctx.fillText).not.toHaveBeenCalled();
  });
  it("suppresses labels whose text rectangle collides with another visible body", () => {
    const scene = createMockUniverseScene({ targetX: 350, targetY: 0 });
    const geometry = calculateRelationshipGeometry(
      scene.focus,
      scene.primaryNodes[0]!,
      scene.relationships[0]!.curvature
    )!;
    const midpoint = {
      x: (geometry.path.start.x + 2 * geometry.path.control.x + geometry.path.end.x) / 4,
      y: (geometry.path.start.y + 2 * geometry.path.control.y + geometry.path.end.y) / 4,
    };
    const blocker = {
      ...scene.primaryNodes[0]!,
      id: "blocker",
      x: midpoint.x,
      y: midpoint.y,
      radius: 24,
    };
    const ctx = createMockContext();
    renderUniverseScene(
      ctx,
      800,
      600,
      { x: 0, y: 0, k: 1 },
      { ...scene, allNodes: [...scene.allNodes, blocker] },
      { skipBackgroundStars: true, skipNodeRendering: true }
    );
    expect(ctx.fillText).not.toHaveBeenCalled();
  });
  it("does not draw energy, strokes, cues or labels at zero relationship opacity", () => {
    const ctx = createMockContext();
    renderUniverseScene(
      ctx,
      800,
      600,
      { x: 0, y: 0, k: 1 },
      createMockUniverseScene({ relOpacity: 0 }),
      {
        skipBackgroundStars: true,
        skipNodeRendering: true,
        pulse: {
          relationshipId: "rel-1",
          sourceId: "concept-rust",
          targetId: "concept-ownership",
          startedAt: 0,
        },
        now: 400,
      }
    );
    expect(ctx.stroke).not.toHaveBeenCalled();
    expect(ctx.fillText).not.toHaveBeenCalled();
    expect(ctx.lineTo).not.toHaveBeenCalled();
  });
});
