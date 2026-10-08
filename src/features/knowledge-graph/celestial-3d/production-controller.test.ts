import * as THREE from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SEED_DATASET } from "@/data/seed";
import type { UniverseNode, UniverseScene } from "../scene/types";
import type { ViewportTransform } from "../types";
import type { CelestialBodyInstance } from "./archetypes/factory";
import type { CelestialIdentity, GeometryLOD } from "./identity";
import {
  ProductionCelestialController,
  type ProductionCelestialControllerDependencies,
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
    clear: vi.fn(),
    clearDepth: vi.fn(),
    autoClear: true,
    dispose: vi.fn(),
  } as unknown as THREE.WebGLRenderer;
}

function makeAsyncShaderRenderer(
  compileAsync: THREE.WebGLRenderer["compileAsync"]
): THREE.WebGLRenderer {
  return {
    ...makeRenderer(),
    getContext: () => ({ getExtension: () => null }),
    compileAsync,
  } as unknown as THREE.WebGLRenderer;
}

async function flushPreparationTasks(): Promise<void> {
  for (let index = 0; index < 4; index++) {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
}

function makeDeferredPreparationHarness(deferInitially = true) {
  const preparationResolvers: Array<(object: THREE.Object3D) => void> = [];
  let deferPreparation = deferInitially;
  const compileAsync = vi.fn<THREE.WebGLRenderer["compileAsync"]>((object) => {
    if (deferPreparation) {
      return new Promise<THREE.Object3D>((resolve) => preparationResolvers.push(resolve));
    }
    return Promise.resolve(object);
  });
  const renderer = makeAsyncShaderRenderer(compileAsync);
  const createRenderer = vi.fn(() => renderer);
  const { controller, createdBodies } = makeTrackedController(createRenderer);

  return {
    controller,
    createdBodies,
    compileAsync,
    renderer,
    createRenderer,
    preparationResolvers,
    setDeferred: (deferred: boolean) => {
      deferPreparation = deferred;
    },
  };
}

function showRustWithoutOwnership(controller: ProductionCelestialController) {
  controller.update(
    makeScene(makeNode("rust", "focus", 0, 0)),
    { x: 0, y: 0, k: 1 },
    800,
    600,
    null
  );
}

async function addOwnershipNeighbor(
  controller: ProductionCelestialController,
  focus: UniverseNode
): Promise<UniverseNode> {
  const ownership = makeNode("ownership", "primary", 100, -50);
  controller.update(makeScene(focus, [ownership]), { x: 0, y: 0, k: 1 }, 800, 600, null);
  await flushPreparationTasks();
  return ownership;
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

  async function beginPendingNode(slug: string, id?: string) {
    const harness = makeDeferredPreparationHarness();
    controller = harness.controller;
    const node = makeNode(slug, "focus", 0, 0, id);
    controller.update(makeScene(node), { x: 0, y: 0, k: 1 }, 800, 600, null);
    await flushPreparationTasks();
    return { ...harness, node };
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
    expect(material.transparent).toBe(true);
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

  it("keeps a cold body out of the rendered scene until async shader preparation completes", async () => {
    const {
      controller: activeController,
      createdBodies,
      compileAsync,
      renderer,
      createRenderer,
      preparationResolvers,
      node: rust,
    } = await beginPendingNode("rust");
    expect(compileAsync).toHaveBeenCalledTimes(1);

    const rustGroup = createdBodies[0]!.group;
    preparationResolvers[0]!(rustGroup);
    await flushPreparationTasks();
    expect(activeController.getLifecycleStats().activeEntries).toBe(1);
    expect(activeController.getLifecycleStats()).toMatchObject({
      asyncShaderPreparationSupported: true,
      parallelShaderCompileExtensionAvailable: false,
    });

    const ownership = await addOwnershipNeighbor(activeController, rust);

    expect(compileAsync).toHaveBeenCalledTimes(2);
    const sceneDuringPreparation = vi.mocked(renderer.render).mock.calls.at(-1)?.[0] as THREE.Scene;
    expect(sceneDuringPreparation.children).toContain(rustGroup);
    expect(sceneDuringPreparation.children).not.toContain(createdBodies[1]!.group);

    preparationResolvers[1]!(createdBodies[1]!.group);
    await flushPreparationTasks();

    const sceneAfterPreparation = vi.mocked(renderer.render).mock.calls.at(-1)?.[0] as THREE.Scene;
    expect(sceneAfterPreparation.children).toContain(createdBodies[1]!.group);
    expect(
      sceneAfterPreparation.children.filter((child) => child === createdBodies[1]!.group)
    ).toHaveLength(1);
    expect(activeController.getLifecycleStats().activeEntries).toBe(2);
    expect(createRenderer).toHaveBeenCalledOnce();

    activeController.update(makeScene(rust), { x: 0, y: 0, k: 1 }, 800, 600, null);
    activeController.update(
      makeScene(rust, [makeNode("ownership", "context", 100, -50, ownership.id)]),
      { x: 0, y: 0, k: 1 },
      800,
      600,
      null
    );
    expect(compileAsync).toHaveBeenCalledTimes(2);
    expect(activeController.getLifecycleStats().activeEntries).toBe(2);
    expect(createdBodies[1]!.dispose).not.toHaveBeenCalled();
  });

  it("disposes a pending cold body when its node leaves before preparation completes", async () => {
    const {
      controller: activeController,
      createdBodies,
      compileAsync,
      renderer,
      preparationResolvers,
      node: rust,
    } = await beginPendingNode("rust");
    expect(compileAsync).toHaveBeenCalledOnce();

    const pendingBody = createdBodies[0]!;
    activeController.update(
      makeScene({ ...rust, radius: 0 }),
      { x: 0, y: 0, k: 1 },
      800,
      600,
      null
    );
    expect(pendingBody.dispose).toHaveBeenCalledOnce();

    preparationResolvers[0]!(pendingBody.group);
    await flushPreparationTasks();
    expect(activeController.getLifecycleStats().activeEntries).toBe(0);
    expect(pendingBody.dispose).toHaveBeenCalledOnce();
    const lastRenderedScene = vi.mocked(renderer.render).mock.calls.at(-1)?.[0] as THREE.Scene;
    expect(lastRenderedScene.children).not.toContain(pendingBody.group);
  });

  it("does not activate a pending body after the same concept ID changes identity", async () => {
    const {
      controller: activeController,
      createdBodies,
      compileAsync,
      renderer,
      preparationResolvers,
      node: rust,
    } = await beginPendingNode("rust", "identity-changing-node");
    const ownership = makeNode("ownership", "focus", 0, 0, rust.id);

    const staleBody = createdBodies[0]!;

    activeController.update(makeScene(ownership), { x: 0, y: 0, k: 1 }, 800, 600, null);
    expect(staleBody.dispose).toHaveBeenCalledOnce();
    preparationResolvers[0]!(staleBody.group);
    await flushPreparationTasks();

    expect(compileAsync).toHaveBeenCalledTimes(2);
    expect(activeController.getLifecycleStats().activeEntries).toBe(0);
    const currentBody = createdBodies[1]!;
    expect(currentBody.identity).toMatchObject({ archetype: "ember-star", seed: 108 });
    preparationResolvers[1]!(currentBody.group);
    await flushPreparationTasks();

    const renderedScene = vi.mocked(renderer.render).mock.calls.at(-1)?.[0] as THREE.Scene;
    expect(renderedScene.children).toContain(currentBody.group);
    expect(renderedScene.children).not.toContain(staleBody.group);
    expect(staleBody.dispose).toHaveBeenCalledOnce();
  });

  it("keeps pending entries within the desktop local-scene budget", () => {
    const compileAsync = vi.fn<THREE.WebGLRenderer["compileAsync"]>(
      () => new Promise<THREE.Object3D>(() => undefined)
    );
    const renderer = makeAsyncShaderRenderer(compileAsync);
    const { controller: activeController } = makeTrackedController(() => renderer);
    controller = activeController;
    const rust = makeNode("rust", "focus", 0, 0);
    const neighbors = Array.from({ length: 9 }, (_, index) =>
      makeNode("ownership", "primary", index * 10, 0, `pending-${index}`)
    );

    activeController.update(makeScene(rust, neighbors), { x: 0, y: 0, k: 1 }, 800, 600, null);

    expect(activeController.getLifecycleStats()).toMatchObject({
      activeEntries: 0,
      pendingEntries: 10,
      pendingCapacity: 10,
    });
  });

  it("disposes active, warm, and pending entries exactly once with their single renderer", async () => {
    const {
      controller: activeController,
      createdBodies,
      renderer,
      createRenderer,
      preparationResolvers,
      setDeferred,
    } = makeDeferredPreparationHarness(false);
    controller = activeController;
    const rust = makeNode("rust", "focus", 0, 0);
    await addOwnershipNeighbor(activeController, rust);
    expect(activeController.getLifecycleStats().activeEntries).toBe(2);
    const rustBody = createdBodies[0]!;
    const ownershipBody = createdBodies[1]!;

    activeController.update(makeScene(rust), { x: 0, y: 0, k: 1 }, 800, 600, null);
    setDeferred(true);
    const memory = makeNode("memory", "primary", 100, -50);
    activeController.update(makeScene(rust, [memory]), { x: 0, y: 0, k: 1 }, 800, 600, null);
    await flushPreparationTasks();
    const memoryBody = createdBodies[2]!;
    expect(activeController.getLifecycleStats()).toMatchObject({
      activeEntries: 1,
      warmEntries: 1,
      pendingEntries: 1,
      preparingEntries: 1,
    });

    activeController.dispose();
    expect(rustBody.dispose).toHaveBeenCalledOnce();
    expect(ownershipBody.dispose).toHaveBeenCalledOnce();
    expect(memoryBody.dispose).toHaveBeenCalledOnce();
    expect(renderer.dispose).toHaveBeenCalledOnce();
    expect(createRenderer).toHaveBeenCalledOnce();
    expect(activeController.getLifecycleStats()).toMatchObject({
      activeEntries: 0,
      warmEntries: 0,
      pendingEntries: 0,
      bodyDisposals: 3,
    });

    preparationResolvers[0]!(memoryBody.group);
    await flushPreparationTasks();
    expect(memoryBody.dispose).toHaveBeenCalledOnce();
    expect(activeController.getLifecycleStats().activeEntries).toBe(0);
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
    // One render frame executed, rendering both universe and celestial scenes through shared renderer
    expect(controller.getLifecycleStats().renderFrameCount).toBe(1);
    expect(renderer.render).toHaveBeenCalledTimes(2);
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

    showRustWithoutOwnership(activeController);
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
    showRustWithoutOwnership(activeController);

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
    showRustWithoutOwnership(activeController);

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

  it("renders both universe scene and celestial scene sequentially through the single shared renderer", () => {
    const renderer = makeRenderer();
    const mockUniverseRender = vi.fn();
    const mockUniverseDispose = vi.fn();
    const mockUniverseUpdate = vi.fn();
    const mockUniverseResize = vi.fn();

    const mockUniverseScene = {
      scene: new THREE.Scene(),
      camera: new THREE.OrthographicCamera(-1, 1, 1, -1),
      render: mockUniverseRender,
      dispose: mockUniverseDispose,
      update: mockUniverseUpdate,
      resize: mockUniverseResize,
    } as unknown as ReturnType<
      NonNullable<ProductionCelestialControllerDependencies["createUniverseScene"]>
    >;

    const createUniverseScene = vi.fn(() => mockUniverseScene);

    const canvas = document.createElement("canvas");
    const controller = new ProductionCelestialController(canvas, {
      createRenderer: () => renderer,
      createBody: (identity) => makeBody(identity),
      createUniverseScene,
    });

    expect(createUniverseScene).toHaveBeenCalledOnce();
    expect(controller.getLifecycleStats().universeActive).toBe(true);

    showRustWithoutOwnership(controller);

    expect(renderer.clear).toHaveBeenCalled();
    expect(mockUniverseRender).toHaveBeenCalledWith(renderer);
    expect(renderer.clearDepth).toHaveBeenCalled();
    expect(renderer.render).toHaveBeenCalled();

    controller.dispose();
    expect(mockUniverseDispose).toHaveBeenCalledOnce();
  });

  it("forwards selection travel state to universe scene during update", () => {
    const renderer = makeRenderer();
    const mockUniverseUpdate = vi.fn();
    const mockUniverseScene = {
      scene: new THREE.Scene(),
      camera: new THREE.OrthographicCamera(-1, 1, 1, -1),
      render: vi.fn(),
      dispose: vi.fn(),
      update: mockUniverseUpdate,
      resize: vi.fn(),
    } as unknown as ReturnType<
      NonNullable<ProductionCelestialControllerDependencies["createUniverseScene"]>
    >;

    const canvas = document.createElement("canvas");
    const controller = new ProductionCelestialController(canvas, {
      createRenderer: () => renderer,
      createBody: (identity) => makeBody(identity),
      createUniverseScene: () => mockUniverseScene,
    });

    const rustNode = makeNode("rust", "focus", 0, 0);
    const scene = makeScene(rustNode);
    const travel = {
      active: true,
      progress: 0.5,
      currentOffset: { x: -100, y: 50 },
      fromSlug: "rust",
      toSlug: "ownership",
    };

    controller.update(scene, { x: 10, y: 20, k: 1 }, 800, 600, null, travel);

    expect(mockUniverseUpdate).toHaveBeenCalledWith(
      0,
      expect.any(Number),
      { x: 10, y: 20, k: 1 },
      travel
    );
    expect(controller.getLifecycleStats().travelActive).toBe(true);

    controller.dispose();
  });
});
