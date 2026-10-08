import { describe, expect, it, vi } from "vitest";
import {
  calculateRelationshipGeometry,
  getRelationshipStyleConfig,
  renderUniverseScene,
} from "./universe-renderer";
import type { UniverseNode, UniverseScene } from "../scene/types";
import { SEED_DATASET } from "@/data/seed";

function createMockContext(): CanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    rect: vi.fn(),
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

describe("renderUniverseScene compositing and layer options", () => {
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
    x: -120,
    y: 40,
    opacity: 1,
  };

  const scene: UniverseScene = {
    focus: focusNode,
    primaryNodes: [primaryNode],
    contextNodes: [],
    allNodes: [focusNode, primaryNode],
    relationships: [
      {
        id: "rel-1",
        sourceId: focusNode.id,
        targetId: primaryNode.id,
        type: "uses",
        explanation: "Rust uses ownership",
        strength: "primary",
        relationship: {
          id: "rel-1",
          sourceConceptId: focusNode.id,
          targetConceptId: primaryNode.id,
          type: "uses",
          explanation: "Rust uses ownership",
          strength: "primary",
          sourceIds: [],
          reviewStatus: "verified",
        },
        role: "focus-connection",
        curvature: 0.2,
        opacity: 0.8,
      },
    ],
    isMobile: false,
  };

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
});

describe("Relationship Path Geometry & Directionality", () => {
  it("calculates valid bezier control points and terminal cues for valid endpoints", () => {
    const source = { x: 0, y: 0 };
    const target = { x: 120, y: 50, radius: 18 };
    const geom = calculateRelationshipGeometry(source, target, 0.2);

    expect(geom).not.toBeNull();
    expect(geom!.dist).toBeCloseTo(130, 1);
    expect(geom!.cx).not.toBe(60); // Curved control point offset from chord midpoint
    expect(geom!.termT).toBeGreaterThanOrEqual(0.65);
    expect(geom!.termT).toBeLessThanOrEqual(0.89);
    // Target-oriented terminal point must be closer to target than source
    const distToTarget = Math.hypot(geom!.termX - target.x, geom!.termY - target.y);
    const distToSource = Math.hypot(geom!.termX - source.x, geom!.termY - source.y);
    expect(distToTarget).toBeLessThan(distToSource);
  });

  it("safely handles degenerate (<1px) or non-finite coordinates by returning null", () => {
    expect(calculateRelationshipGeometry({ x: 0, y: 0 }, { x: 0, y: 0 }, 0.2)).toBeNull();
    expect(calculateRelationshipGeometry({ x: NaN, y: 0 }, { x: 100, y: 50 }, 0.2)).toBeNull();
    expect(calculateRelationshipGeometry({ x: 0, y: 0 }, { x: Infinity, y: 50 }, 0.2)).toBeNull();
  });

  it("adjusts terminal placement adaptively according to target radius", () => {
    const source = { x: 0, y: 0 };
    const smallTarget = { x: 200, y: 0, radius: 12 };
    const largeTarget = { x: 200, y: 0, radius: 34 };

    const geomSmall = calculateRelationshipGeometry(source, smallTarget, 0.15)!;
    const geomLarge = calculateRelationshipGeometry(source, largeTarget, 0.15)!;

    // Larger target means terminal marker stops earlier along curve so it doesn't enter the body
    expect(geomLarge.termT).toBeLessThan(geomSmall.termT);
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
    x: -140,
    y: 50,
    opacity: 1,
  };

  const scene: UniverseScene = {
    focus: focusNode,
    primaryNodes: [primaryNode],
    contextNodes: [],
    allNodes: [focusNode, primaryNode],
    relationships: [
      {
        id: "rel-1",
        sourceId: focusNode.id,
        targetId: primaryNode.id,
        type: "uses",
        explanation: "Rust uses ownership",
        strength: "primary",
        relationship: {
          id: "rel-1",
          sourceConceptId: focusNode.id,
          targetConceptId: primaryNode.id,
          type: "uses",
          explanation: "Rust uses ownership",
          strength: "primary",
          sourceIds: [],
          reviewStatus: "verified",
        },
        role: "focus-connection",
        curvature: 0.2,
        opacity: 0.8,
      },
    ],
    isMobile: false,
  };

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
