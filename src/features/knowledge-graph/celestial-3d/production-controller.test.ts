import * as THREE from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SEED_DATASET } from "@/data/seed";
import type { UniverseNode, UniverseScene } from "../scene/types";
import type { ViewportTransform } from "../types";
import type { CelestialBodyInstance } from "./archetypes/factory";
import type { CelestialIdentity, GeometryLOD } from "./identity";
import {
  ProductionCelestialController,
  projectUniverseNode,
  roleToGeometryLod,
} from "./production-controller";

function makeNode(slug: string, role: UniverseNode["role"], x: number, y: number): UniverseNode {
  const concept = SEED_DATASET.concepts.find((item) => item.slug === slug)!;
  return {
    id: concept.id,
    slug,
    name: concept.name,
    concept,
    role,
    visualMass: role === "focus" ? 1 : role === "primary" ? 0.65 : 0.35,
    radius: role === "focus" ? 34 : role === "primary" ? 18 : 9,
    x,
    y,
    opacity: role === "context" ? 0.55 : 1,
  };
}

function makeScene(focus: UniverseNode, others: readonly UniverseNode[] = []): UniverseScene {
  const primaryNodes = others.filter((node) => node.role === "primary");
  const contextNodes = others.filter((node) => node.role === "context");
  return {
    focus,
    primaryNodes,
    contextNodes,
    allNodes: [focus, ...others],
    relationships: [],
    isMobile: false,
  };
}

function makeBody(identity: CelestialIdentity) {
  const group = new THREE.Group();
  const primaryMesh = new THREE.Mesh(new THREE.SphereGeometry(1), new THREE.MeshBasicMaterial());
  group.add(primaryMesh);

  const body: CelestialBodyInstance = {
    group,
    primaryMesh,
    identity,
    baseRotationSpeed: 1,
    tiltZ: 0,
    moonInstances: [],
    debrisInstances: [],
    setHover: vi.fn(),
    update: vi.fn((deltaSec: number) => {
      primaryMesh.rotation.y += deltaSec;
    }),
    dispose: vi.fn(),
  };
  return body;
}

function makeRenderer() {
  return {
    setPixelRatio: vi.fn(),
    setSize: vi.fn(),
    setClearColor: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
  } as unknown as THREE.WebGLRenderer;
}

describe("production celestial scene controller", () => {
  const originalMatchMedia = window.matchMedia;
  let controller: ProductionCelestialController | null = null;

  beforeEach(() => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  afterEach(() => {
    controller?.dispose();
    controller = null;
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
  });

  it.each([
    ["focus", "focus"],
    ["primary", "primary"],
    ["context", "context"],
  ] as const)("maps %s scene nodes to %s geometry", (role, expected) => {
    expect(roleToGeometryLod(role)).toBe(expected satisfies GeometryLOD);
  });

  it("projects the Canvas world point through the existing pan and zoom transform", () => {
    const node = makeNode("ownership", "primary", 100, -50);
    const transform: ViewportTransform = { x: 10, y: -20, k: 2 };

    expect(projectUniverseNode(node, transform)).toEqual({ x: 210, y: 120 });
  });

  it("reports an unavailable renderer when WebGL construction fails", () => {
    controller = new ProductionCelestialController(document.createElement("canvas"), {
      createRenderer: () => {
        throw new Error("WebGL unavailable");
      },
    });

    expect(controller.isAvailable).toBe(false);
  });

  it("applies the interpolated scene opacity to the body's materials", () => {
    const renderer = makeRenderer();
    const bodies: CelestialBodyInstance[] = [];
    controller = new ProductionCelestialController(document.createElement("canvas"), {
      createRenderer: () => renderer,
      createBody: (identity) => {
        const body = makeBody(identity);
        bodies.push(body);
        return body;
      },
    });

    const fadingFocus = { ...makeNode("rust", "focus", 0, 0), opacity: 0.25 };
    controller.update(makeScene(fadingFocus), { x: 0, y: 0, k: 1 }, 800, 600, null);

    const material = bodies[0]!.primaryMesh.material as THREE.MeshBasicMaterial;
    expect(material.opacity).toBe(0.25);
    expect(material.transparent).toBe(true);
    expect(material.depthWrite).toBe(false);

    controller.update(
      makeScene({ ...fadingFocus, opacity: 1 }),
      { x: 0, y: 0, k: 1 },
      800,
      600,
      null
    );
    expect(material.opacity).toBe(1);
    expect(material.transparent).toBe(false);
    expect(material.depthWrite).toBe(true);
  });

  it("applies hovered state immediately when reduced motion is active", () => {
    const body = makeBody({ archetype: "volcanic-rocky", seed: 201 });
    controller = new ProductionCelestialController(document.createElement("canvas"), {
      createRenderer: makeRenderer,
      createBody: () => body,
    });

    const focus = makeNode("rust", "focus", 0, 0);
    controller.update(makeScene(focus), { x: 0, y: 0, k: 1 }, 800, 600, focus.id);

    expect(body.setHover).toHaveBeenLastCalledWith(true, true);
  });

  it("renders once to clear bodies when the displayed scene becomes empty", () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    const renderer = makeRenderer();
    controller = new ProductionCelestialController(document.createElement("canvas"), {
      createRenderer: () => renderer,
      createBody: (identity) => makeBody(identity),
    });

    controller.update(
      makeScene(makeNode("rust", "focus", 0, 0)),
      { x: 0, y: 0, k: 1 },
      800,
      600,
      null
    );
    controller.update(
      makeScene({ ...makeNode("rust", "focus", 0, 0), radius: 0 }),
      { x: 0, y: 0, k: 1 },
      800,
      600,
      null
    );

    expect(renderer.render).toHaveBeenCalledOnce();
  });

  it("does not render updates while the document is hidden", () => {
    const renderer = makeRenderer();
    controller = new ProductionCelestialController(document.createElement("canvas"), {
      createRenderer: () => renderer,
      createBody: (identity) => makeBody(identity),
    });
    const originalHidden = Object.getOwnPropertyDescriptor(document, "hidden");

    try {
      controller.update(
        makeScene(makeNode("rust", "focus", 0, 0)),
        { x: 0, y: 0, k: 1 },
        800,
        600,
        null
      );
      const rendersBeforeHiding = vi.mocked(renderer.render).mock.calls.length;
      Object.defineProperty(document, "hidden", { configurable: true, value: true });
      document.dispatchEvent(new Event("visibilitychange"));
      controller.update(
        makeScene(makeNode("rust", "focus", 1, 1)),
        { x: 0, y: 0, k: 1 },
        800,
        600,
        null
      );

      expect(renderer.render).toHaveBeenCalledTimes(rendersBeforeHiding);
    } finally {
      if (originalHidden) {
        Object.defineProperty(document, "hidden", originalHidden);
      } else {
        Reflect.deleteProperty(document, "hidden");
      }
    }
  });

  it("retains curated identity and axial phase when a primary concept is promoted to focus", () => {
    const createRenderer = vi.fn(() => makeRenderer());
    const createdBodies: Array<{ lod: GeometryLOD; body: CelestialBodyInstance }> = [];
    const createBody = vi.fn((identity: CelestialIdentity, lod: GeometryLOD) => {
      const body = makeBody(identity);
      createdBodies.push({ lod, body });
      return body;
    });

    controller = new ProductionCelestialController(document.createElement("canvas"), {
      createRenderer,
      createBody,
    });

    const rust = makeNode("rust", "focus", 0, 0);
    const ownershipPrimary = makeNode("ownership", "primary", 100, -50);
    controller.update(makeScene(rust, [ownershipPrimary]), { x: 0, y: 0, k: 1 }, 800, 600, null);

    const primaryEntry = createdBodies.find(
      (entry) => entry.lod === "primary" && entry.body.identity.seed === 108
    )!;
    primaryEntry.body.primaryMesh.rotation.y = 0.73;

    const ownershipFocus = makeNode("ownership", "focus", 0, 0);
    controller.update(
      makeScene(ownershipFocus, [makeNode("rust", "primary", -100, 0)]),
      { x: 0, y: 0, k: 1 },
      800,
      600,
      null
    );

    const promotedEntry = createdBodies.find(
      (entry) => entry.lod === "focus" && entry.body.identity.seed === 108
    )!;
    expect(primaryEntry.body.identity).toMatchObject({ archetype: "ember-star", seed: 108 });
    expect(promotedEntry.body.identity).toMatchObject({ archetype: "ember-star", seed: 108 });
    expect(promotedEntry.body.primaryMesh.rotation.y).toBe(0.73);
    expect(primaryEntry.body.dispose).toHaveBeenCalledOnce();
    expect(createRenderer).toHaveBeenCalledOnce();
  });

  it("disposes a concept when it leaves the displayed scene and keeps the active object count bounded", () => {
    const renderer = makeRenderer();
    const createRenderer = vi.fn(() => renderer);
    const createdBodies: CelestialBodyInstance[] = [];
    const createBody = vi.fn((identity: CelestialIdentity) => {
      const body = makeBody(identity);
      createdBodies.push(body);
      return body;
    });

    controller = new ProductionCelestialController(document.createElement("canvas"), {
      createRenderer,
      createBody,
    });

    const rust = makeNode("rust", "focus", 0, 0);
    const ownership = makeNode("ownership", "primary", 100, -50);
    controller.update(makeScene(rust, [ownership]), { x: 0, y: 0, k: 1 }, 800, 600, null);
    const ownershipBody = createdBodies[1];

    const sceneWithoutOwnership = makeScene(makeNode("rust", "focus", 0, 0));
    controller.update(sceneWithoutOwnership, { x: 10, y: 5, k: 1.2 }, 800, 600, null);

    const renderedScene = vi.mocked(renderer.render).mock.calls.at(-1)?.[0] as THREE.Scene;
    const visibleBodyIds = renderedScene.children
      .filter((child) => child.userData["conceptId"])
      .map((child) => child.userData["conceptId"]);
    expect(visibleBodyIds).toEqual([rust.id]);
    expect(ownershipBody?.dispose).toHaveBeenCalledOnce();
    expect(createRenderer).toHaveBeenCalledOnce();
  });
});
