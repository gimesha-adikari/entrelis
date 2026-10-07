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

function makeNode(
  slug: string,
  role: UniverseNode["role"],
  x: number,
  y: number,
  id?: string
): UniverseNode {
  const concept = SEED_DATASET.concepts.find((item) => item.slug === slug)!;
  return {
    id: id ?? concept.id,
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

function makeTrackedController(createRenderer = makeRenderer) {
  const createdBodies: CelestialBodyInstance[] = [];
  const createBody = vi.fn((identity: CelestialIdentity) => {
    const body = makeBody(identity);
    createdBodies.push(body);
    return body;
  });
  const controller = new ProductionCelestialController(document.createElement("canvas"), {
    createRenderer,
    createBody,
  });

  return { controller, createdBodies, createBody };
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

  function makeTrackedScene(createRenderer: () => THREE.WebGLRenderer = makeRenderer) {
    const tracked = makeTrackedController(createRenderer);
    controller = tracked.controller;
    const rust = makeNode("rust", "focus", 0, 0);
    const ownership = makeNode("ownership", "primary", 100, -50);
    controller.update(makeScene(rust, [ownership]), { x: 0, y: 0, k: 1 }, 800, 600, null);
    return { ...tracked, rust, ownership };
  }

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

  it.each([
    ["primary", "focus"],
    ["focus", "primary"],
    ["primary", "context"],
    ["context", "primary"],
  ] as const)("reuses the same body when its role changes from %s to %s", (fromRole, toRole) => {
    const createdBodies: Array<{ lod: GeometryLOD; body: CelestialBodyInstance }> = [];
    const createBody = vi.fn((identity: CelestialIdentity, lod: GeometryLOD) => {
      const body = makeBody(identity);
      createdBodies.push({ lod, body });
      return body;
    });

    controller = new ProductionCelestialController(document.createElement("canvas"), {
      createRenderer: makeRenderer,
      createBody,
    });

    const ownership = makeNode("ownership", fromRole, 100, -50);
    const firstScene =
      fromRole === "focus"
        ? makeScene(ownership, [makeNode("rust", "primary", -100, 0)])
        : makeScene(makeNode("rust", "focus", -100, 0), [ownership]);
    controller.update(firstScene, { x: 0, y: 0, k: 1 }, 800, 600, null);

    const originalBody = createdBodies.find((entry) => entry.body.identity.seed === 108)!.body;
    originalBody.primaryMesh.rotation.y = 0.73;

    const nextOwnership = makeNode("ownership", toRole, 25, 40);
    const nextScene =
      toRole === "focus"
        ? makeScene(nextOwnership, [makeNode("rust", "primary", -100, 0)])
        : makeScene(makeNode("rust", "focus", -100, 0), [nextOwnership]);
    controller.update(nextScene, { x: 0, y: 0, k: 1 }, 800, 600, null);

    const createdOwnershipEntry = createdBodies.find((entry) => entry.body.identity.seed === 108)!;
    expect(createdBodies).toHaveLength(2);
    expect(createdOwnershipEntry.body).toBe(originalBody);
    expect(createdOwnershipEntry.lod).toBe(fromRole);
    expect(originalBody.primaryMesh.rotation.y).toBe(0.73);
    expect(originalBody.group.position.x).toBe(25);
    expect(originalBody.group.position.y).toBe(-40);
    expect(originalBody.group.scale.x).toBe(
      toRole === "focus" ? 34 / 50 : toRole === "primary" ? 18 / 50 : 9 / 50
    );
    expect(originalBody.dispose).not.toHaveBeenCalled();
  });

  it("replaces a body when its celestial identity changes", () => {
    const {
      controller: activeController,
      createdBodies,
      createBody,
      ownership,
    } = makeTrackedScene();
    const originalOwnershipBody = createdBodies.find((body) => body.identity.seed === 108)!;

    const changedIdentityNode = { ...makeNode("memory", "primary", 120, -60), id: ownership.id };
    activeController.update(
      makeScene(makeNode("rust", "focus", 0, 0), [changedIdentityNode]),
      { x: 0, y: 0, k: 1 },
      800,
      600,
      null
    );

    const replacementBody = createdBodies.at(-1)!;
    expect(createBody).toHaveBeenCalledTimes(3);
    expect(replacementBody).not.toBe(originalOwnershipBody);
    expect(replacementBody.identity).toMatchObject({ archetype: "blue-atmospheric", seed: 256 });
    expect(originalOwnershipBody.dispose).toHaveBeenCalledOnce();
    expect(activeController.getLifecycleStats()).toMatchObject({
      identityReplacements: 1,
      bodyCreates: 3,
      bodyDisposals: 1,
    });
  });

  it("removes an exited body from the scene and reuses it when the concept re-enters", () => {
    const renderer = makeRenderer();
    const createRenderer = vi.fn(() => renderer);
    const {
      controller: activeController,
      createdBodies,
      createBody,
      rust,
    } = makeTrackedScene(createRenderer);
    const ownershipBody = createdBodies[1];
    ownershipBody!.primaryMesh.rotation.y = 0.73;

    const sceneWithoutOwnership = makeScene(makeNode("rust", "focus", 0, 0));
    activeController.update(sceneWithoutOwnership, { x: 10, y: 5, k: 1.2 }, 800, 600, null);

    const renderedScene = vi.mocked(renderer.render).mock.calls.at(-1)?.[0] as THREE.Scene;
    const visibleBodyIds = renderedScene.children
      .filter((child) => child.userData["conceptId"])
      .map((child) => child.userData["conceptId"]);
    expect(visibleBodyIds).toEqual([rust.id]);
    expect(ownershipBody?.dispose).not.toHaveBeenCalled();
    expect(createRenderer).toHaveBeenCalledOnce();

    activeController.update(
      makeScene(makeNode("rust", "focus", 0, 0), [makeNode("ownership", "context", 50, 25)]),
      { x: 10, y: 5, k: 1.2 },
      800,
      600,
      null
    );

    expect(createBody).toHaveBeenCalledTimes(2);
    expect(createdBodies[1]).toBe(ownershipBody);
    expect(ownershipBody?.dispose).not.toHaveBeenCalled();
    expect(ownershipBody?.primaryMesh.rotation.y).toBe(0.73);
    const restoredScene = vi.mocked(renderer.render).mock.calls.at(-1)?.[0] as THREE.Scene;
    expect(restoredScene.children).toContain(ownershipBody?.group);
    expect(activeController.getLifecycleStats()).toMatchObject({
      activeEntries: 2,
      warmEntries: 0,
      warmCapacity: 8,
      warmHits: 1,
      warmMisses: 2,
      warmParks: 1,
      warmEvictions: 0,
      bodyCreates: 2,
      bodyDisposals: 0,
    });
  });

  it("revives a warm body across role changes without constructing or disposing it", () => {
    const {
      controller: activeController,
      createdBodies,
      createBody,
      ownership,
    } = makeTrackedScene();
    const ownershipBody = createdBodies[1]!;

    activeController.update(
      makeScene(makeNode("rust", "focus", 0, 0)),
      { x: 0, y: 0, k: 1 },
      800,
      600,
      null
    );
    activeController.update(
      makeScene(makeNode("rust", "focus", 0, 0), [
        makeNode("ownership", "context", 90, 40, ownership.id),
      ]),
      { x: 0, y: 0, k: 1 },
      800,
      600,
      ownership.id
    );

    expect(createBody).toHaveBeenCalledTimes(2);
    expect(createdBodies[1]).toBe(ownershipBody);
    expect(ownershipBody.dispose).not.toHaveBeenCalled();
    expect(ownershipBody.group.position.x).toBe(90);
    expect(ownershipBody.group.position.y).toBe(-40);
    expect(ownershipBody.group.scale.x).toBe(9 / 50);
    expect(ownershipBody.setHover).toHaveBeenLastCalledWith(true, true);
  });

  it("evicts and disposes the least recently parked body when the warm cache is full", () => {
    const { controller: activeController, createdBodies } = makeTrackedScene();
    const rust = makeNode("rust", "focus", 0, 0);
    const syntheticNodes = Array.from({ length: 9 }, (_, index) =>
      makeNode("rust", "primary", index * 10, 0, `synthetic-${index}`)
    );
    activeController.update(makeScene(rust, syntheticNodes), { x: 0, y: 0, k: 1 }, 800, 600, null);
    const bodyById = new Map(
      createdBodies.map((body) => [body.group.userData["conceptId"] as string, body])
    );

    activeController.update(makeScene(rust), { x: 0, y: 0, k: 1 }, 800, 600, null);

    expect(bodyById.get("synthetic-0")?.dispose).toHaveBeenCalledOnce();
    for (const node of syntheticNodes.slice(1)) {
      expect(bodyById.get(node.id)?.dispose).not.toHaveBeenCalled();
    }
    expect(activeController.getLifecycleStats()).toMatchObject({
      activeEntries: 1,
      warmEntries: 8,
      warmCapacity: 8,
      warmParks: 10,
      warmEvictions: 2,
      bodyDisposals: 2,
    });
  });

  it("disposes a stale warm body and constructs the current identity when a concept changes identity", () => {
    const {
      controller: activeController,
      createdBodies,
      createBody,
      ownership,
    } = makeTrackedScene();
    const originalOwnershipBody = createdBodies[1]!;
    activeController.update(
      makeScene(makeNode("rust", "focus", 0, 0)),
      { x: 0, y: 0, k: 1 },
      800,
      600,
      null
    );

    const changedIdentityNode = makeNode("memory", "primary", 120, -60, ownership.id);
    activeController.update(
      makeScene(makeNode("rust", "focus", 0, 0), [changedIdentityNode]),
      { x: 0, y: 0, k: 1 },
      800,
      600,
      null
    );

    expect(createBody).toHaveBeenCalledTimes(3);
    expect(createdBodies[2]).not.toBe(originalOwnershipBody);
    expect(createdBodies[2]?.identity).toMatchObject({ archetype: "blue-atmospheric", seed: 256 });
    expect(originalOwnershipBody.dispose).toHaveBeenCalledOnce();
    expect(activeController.getLifecycleStats()).toMatchObject({
      warmHits: 0,
      warmMisses: 3,
      identityReplacements: 0,
      bodyCreates: 3,
      bodyDisposals: 1,
    });
  });

  it("keeps a restored body recent for LRU eviction", () => {
    const { controller: activeController, createdBodies } = makeTrackedScene();
    const rust = makeNode("rust", "focus", 0, 0);
    const aToH = Array.from({ length: 8 }, (_, index) =>
      makeNode("rust", "primary", index, 0, `concept-${String.fromCharCode(65 + index)}`)
    );
    activeController.update(makeScene(rust, aToH), { x: 0, y: 0, k: 1 }, 800, 600, null);
    const bodyById = new Map(
      createdBodies.map((body) => [body.group.userData["conceptId"] as string, body])
    );
    const nodeA = aToH[0]!;
    const nodeI = makeNode("rust", "primary", 20, 0, "concept-I");

    activeController.update(makeScene(rust), { x: 0, y: 0, k: 1 }, 800, 600, null);
    activeController.update(makeScene(rust, [nodeA]), { x: 0, y: 0, k: 1 }, 800, 600, null);
    activeController.update(makeScene(rust), { x: 0, y: 0, k: 1 }, 800, 600, null);
    activeController.update(makeScene(rust, [nodeI]), { x: 0, y: 0, k: 1 }, 800, 600, null);
    const bodyI = createdBodies.at(-1)!;
    bodyById.set("concept-I", bodyI);
    activeController.update(makeScene(rust), { x: 0, y: 0, k: 1 }, 800, 600, null);

    expect(bodyById.get("concept-A")?.dispose).not.toHaveBeenCalled();
    expect(bodyById.get("concept-B")?.dispose).toHaveBeenCalledOnce();
    expect(bodyI.dispose).not.toHaveBeenCalled();
    expect(activeController.getLifecycleStats()).toMatchObject({
      warmEntries: 8,
      warmEvictions: 2,
    });
  });

  it("disposes active and warm bodies exactly once when the controller is disposed", () => {
    const renderer = makeRenderer();
    const { controller: activeController, createdBodies } = makeTrackedScene(() => renderer);
    const ownershipBody = createdBodies[1]!;
    activeController.update(
      makeScene(makeNode("rust", "focus", 0, 0)),
      { x: 0, y: 0, k: 1 },
      800,
      600,
      null
    );

    activeController.dispose();
    activeController.dispose();

    expect(createdBodies[0]?.dispose).toHaveBeenCalledOnce();
    expect(ownershipBody.dispose).toHaveBeenCalledOnce();
    expect(renderer.dispose).toHaveBeenCalledOnce();
    expect(activeController.getLifecycleStats()).toMatchObject({
      activeEntries: 0,
      warmEntries: 0,
      bodyDisposals: 2,
    });
  });
});
