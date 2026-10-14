import { describe, expect, it } from "vitest";
import { SEED_DATASET } from "@/data/seed";
import { generateSyntheticDataset } from "@/benchmark/generator";
import { buildLocalUniverseScene } from "./build-local-scene";
import { DESKTOP_SCENE_BUDGET, MOBILE_SCENE_BUDGET } from "./types";

describe("buildLocalUniverseScene", () => {
  it("builds a scene with the focus concept as the visual anchor", () => {
    const scene = buildLocalUniverseScene({
      dataset: SEED_DATASET,
      focusSlug: "rust",
      isMobile: false,
    });

    expect(scene.focus.slug).toBe("rust");
    expect(scene.focus.role).toBe("focus");
    expect(scene.focus.visualMass).toBe(1.0);
    expect(scene.allNodes.some((n) => n.slug === "rust")).toBe(true);
  });

  it("ranks primary neighbors deterministically by relationship strength and stable tie-breaker", () => {
    const scene = buildLocalUniverseScene({
      dataset: SEED_DATASET,
      focusSlug: "ownership",
      isMobile: false,
    });

    // Ownership connects to:
    // Rust (Rust --uses--> Ownership, strength: primary)
    // Memory (Ownership --manages--> Memory, strength: primary)
    expect(scene.primaryNodes.length).toBe(2);
    const slugs = scene.primaryNodes.map((n) => n.slug);
    expect(slugs).toContain("rust");
    expect(slugs).toContain("memory");
  });

  it("enforces desktop budget (max 6 primary, max 3 context, max 10 total)", () => {
    const scene = buildLocalUniverseScene({
      dataset: SEED_DATASET,
      focusSlug: "memory",
      isMobile: false,
      budget: DESKTOP_SCENE_BUDGET,
    });

    expect(scene.primaryNodes.length).toBeLessThanOrEqual(DESKTOP_SCENE_BUDGET.maxPrimary);
    expect(scene.contextNodes.length).toBeLessThanOrEqual(DESKTOP_SCENE_BUDGET.maxContext);
    expect(scene.allNodes.length).toBeLessThanOrEqual(DESKTOP_SCENE_BUDGET.maxTotal);
    // Focus + primary + context = allNodes
    expect(scene.allNodes.length).toBe(1 + scene.primaryNodes.length + scene.contextNodes.length);
  });

  it("enforces mobile budget (max 4 primary, max 1 context, max 6 total)", () => {
    const scene = buildLocalUniverseScene({
      dataset: SEED_DATASET,
      focusSlug: "memory",
      isMobile: true,
      budget: MOBILE_SCENE_BUDGET,
    });

    expect(scene.primaryNodes.length).toBeLessThanOrEqual(MOBILE_SCENE_BUDGET.maxPrimary);
    expect(scene.contextNodes.length).toBeLessThanOrEqual(MOBILE_SCENE_BUDGET.maxContext);
    expect(scene.allNodes.length).toBeLessThanOrEqual(MOBILE_SCENE_BUDGET.maxTotal);
  });

  it("selects second-degree context connected through visible primary neighbors only", () => {
    const scene = buildLocalUniverseScene({
      dataset: SEED_DATASET,
      focusSlug: "rust",
      isMobile: false,
    });

    // In SEED_DATASET, Rust connects directly to Ownership (primary) and Memory (supporting).
    // From Memory, Stack & Heap and Operating Systems are reachable as second-degree context!
    expect(scene.primaryNodes.some((n) => n.slug === "ownership")).toBe(true);
    expect(scene.primaryNodes.some((n) => n.slug === "memory")).toBe(true);
    expect(scene.contextNodes.some((n) => n.slug === "stack-and-heap")).toBe(true);

    // Neither focus (Rust) nor direct primary (Ownership, Memory) should appear in contextNodes
    expect(scene.contextNodes.some((n) => n.slug === "rust")).toBe(false);
    expect(scene.contextNodes.some((n) => n.slug === "ownership")).toBe(false);
    expect(scene.contextNodes.some((n) => n.slug === "memory")).toBe(false);

    // Context node must identify its parent visible primary neighbor
    const stackHeapNode = scene.contextNodes.find((n) => n.slug === "stack-and-heap");
    expect(stackHeapNode?.parentPrimaryId).toBe("concept-memory");
  });

  it("strictly preserves SOURCE --TYPE--> TARGET directional invariant in relationships", () => {
    const scene = buildLocalUniverseScene({
      dataset: SEED_DATASET,
      focusSlug: "ownership",
      isMobile: false,
    });

    // Rust --uses--> Ownership: source is rust, target is ownership
    const rustRel = scene.relationships.find((r) => r.type === "uses");
    expect(rustRel).toBeDefined();
    expect(rustRel?.sourceId).toBe("concept-rust");
    expect(rustRel?.targetId).toBe("concept-ownership");

    // Ownership --manages--> Memory: source is ownership, target is memory
    const memoryRel = scene.relationships.find((r) => r.type === "manages");
    expect(memoryRel).toBeDefined();
    expect(memoryRel?.sourceId).toBe("concept-ownership");
    expect(memoryRel?.targetId).toBe("concept-memory");
  });

  it("bounds scene construction strictly on a synthetic 50-concept dataset", () => {
    // Generate synthetic 50-concept dataset with star + tree connectivity
    const syntheticDataset = generateSyntheticDataset(50);

    const desktopScene = buildLocalUniverseScene({
      dataset: syntheticDataset,
      focusSlug: "synthetic-concept-0",
      isMobile: false,
    });

    // Must be bounded to desktop budget: max 10
    expect(desktopScene.allNodes.length).toBeLessThanOrEqual(10);
    expect(desktopScene.primaryNodes.length).toBeLessThanOrEqual(6);
    expect(desktopScene.contextNodes.length).toBeLessThanOrEqual(3);

    const mobileScene = buildLocalUniverseScene({
      dataset: syntheticDataset,
      focusSlug: "synthetic-concept-0",
      isMobile: true,
    });

    // Must be bounded to mobile budget: max 6
    expect(mobileScene.allNodes.length).toBeLessThanOrEqual(6);
    expect(mobileScene.primaryNodes.length).toBeLessThanOrEqual(4);
    expect(mobileScene.contextNodes.length).toBeLessThanOrEqual(1);
  });

  it("produces deterministic output across multiple invocations", () => {
    const run1 = buildLocalUniverseScene({
      dataset: SEED_DATASET,
      focusSlug: "memory",
      isMobile: false,
    });
    const run2 = buildLocalUniverseScene({
      dataset: SEED_DATASET,
      focusSlug: "memory",
      isMobile: false,
    });

    expect(run1.focus.id).toBe(run2.focus.id);
    expect(run1.primaryNodes.map((n) => n.id)).toEqual(run2.primaryNodes.map((n) => n.id));
    expect(run1.contextNodes.map((n) => n.id)).toEqual(run2.contextNodes.map((n) => n.id));
    expect(run1.relationships.map((r) => r.id)).toEqual(run2.relationships.map((r) => r.id));
  });

  it("computes expected visible node and relationship counts for key seed concepts", () => {
    const keySlugs = ["rust", "ownership", "memory", "operating-systems"];
    const desktopResults = keySlugs.map((slug) => {
      const scene = buildLocalUniverseScene({
        dataset: SEED_DATASET,
        focusSlug: slug,
        isMobile: false,
      });
      return {
        slug,
        focus: scene.focus.name,
        primaryCount: scene.primaryNodes.length,
        contextCount: scene.contextNodes.length,
        totalVisibleNodes: scene.allNodes.length,
        relationshipsCount: scene.relationships.length,
        primarySlugs: scene.primaryNodes.map((n) => n.slug),
        contextSlugs: scene.contextNodes.map((n) => n.slug),
      };
    });

    // Pristine test execution without noisy console.log

    const rust = desktopResults.find((r) => r.slug === "rust")!;
    expect(rust.totalVisibleNodes).toBeLessThanOrEqual(10);
    expect(rust.primaryCount).toBe(2); // Ownership, Memory
    expect(rust.contextCount).toBe(2); // Stack & Heap, Operating Systems

    const ownership = desktopResults.find((r) => r.slug === "ownership")!;
    expect(ownership.primaryCount).toBe(2); // Rust, Memory
    expect(ownership.contextCount).toBe(2); // Stack & Heap, Operating Systems

    const memory = desktopResults.find((r) => r.slug === "memory")!;
    expect(memory.primaryCount).toBe(4); // Ownership, Stack & Heap, Operating Systems, Rust
    expect(memory.contextCount).toBe(1); // CPUs

    const os = desktopResults.find((r) => r.slug === "operating-systems")!;
    expect(os.primaryCount).toBe(3); // Stack & Heap, CPUs, Memory
    expect(os.contextCount).toBe(3); // Transistors, Ownership, Rust
  });

  it("builds identical bounded scene using a pre-created KnowledgeGraphIndex", async () => {
    const { createKnowledgeGraphIndex } = await import("../knowledge-index");
    const index = createKnowledgeGraphIndex(SEED_DATASET);

    const sceneFromDataset = buildLocalUniverseScene({
      dataset: SEED_DATASET,
      focusSlug: "rust",
      isMobile: false,
    });

    const sceneFromIndex = buildLocalUniverseScene({
      index,
      focusSlug: "rust",
      isMobile: false,
    });

    expect(sceneFromIndex.focus.id).toBe(sceneFromDataset.focus.id);
    expect(sceneFromIndex.primaryNodes.map((n) => n.id)).toEqual(
      sceneFromDataset.primaryNodes.map((n) => n.id)
    );
    expect(sceneFromIndex.contextNodes.map((n) => n.id)).toEqual(
      sceneFromDataset.contextNodes.map((n) => n.id)
    );
    expect(sceneFromIndex.relationships.map((r) => r.id)).toEqual(
      sceneFromDataset.relationships.map((r) => r.id)
    );
  });

  it("builds bounded scene from synthetic 500-node index without scanning global dataset", async () => {
    const { createKnowledgeGraphIndex } = await import("../knowledge-index");
    const largeDataset = generateSyntheticDataset(500);
    const index = createKnowledgeGraphIndex(largeDataset);

    const scene = buildLocalUniverseScene({
      index,
      focusSlug: largeDataset.concepts[250]!.slug,
      isMobile: false,
    });

    expect(scene.allNodes.length).toBeLessThanOrEqual(DESKTOP_SCENE_BUDGET.maxTotal);
    expect(scene.primaryNodes.length).toBeLessThanOrEqual(DESKTOP_SCENE_BUDGET.maxPrimary);
    expect(scene.contextNodes.length).toBeLessThanOrEqual(DESKTOP_SCENE_BUDGET.maxContext);
  });

  describe("previousFocusSlug Return-Path Reservation", () => {
    it("reserves a primary slot for previous direct neighbor on Memory -> Operating Systems (desktop & mobile)", async () => {
      const { WAVE1_PREVIEW_DATASET } = await import("@/data/preview");
      const { createKnowledgeGraphIndex } = await import("../knowledge-index");
      const index = createKnowledgeGraphIndex(WAVE1_PREVIEW_DATASET);

      // Without previousFocusSlug: Memory is truncated from Operating Systems (7th alphabetically)
      const osWithoutPrevious = buildLocalUniverseScene({
        index,
        focusSlug: "operating-systems",
        isMobile: false,
      });
      expect(osWithoutPrevious.primaryNodes.map((n) => n.slug)).not.toContain("memory");

      // With previousFocusSlug = 'memory': Memory is guaranteed a primary slot on desktop
      const osDesktop = buildLocalUniverseScene({
        index,
        focusSlug: "operating-systems",
        previousFocusSlug: "memory",
        isMobile: false,
      });
      expect(osDesktop.primaryNodes.map((n) => n.slug)).toContain("memory");
      expect(osDesktop.primaryNodes.length).toBe(DESKTOP_SCENE_BUDGET.maxPrimary); // exactly 6
      expect(new Set(osDesktop.allNodes.map((n) => n.id)).size).toBe(osDesktop.allNodes.length); // 0 duplicates

      // With previousFocusSlug = 'memory': Memory is guaranteed a primary slot on mobile (max 4)
      const osMobile = buildLocalUniverseScene({
        index,
        focusSlug: "operating-systems",
        previousFocusSlug: "memory",
        isMobile: true,
      });
      expect(osMobile.primaryNodes.map((n) => n.slug)).toContain("memory");
      expect(osMobile.primaryNodes.length).toBe(MOBILE_SCENE_BUDGET.maxPrimary); // exactly 4
      expect(osMobile.allNodes.length).toBeLessThanOrEqual(MOBILE_SCENE_BUDGET.maxTotal); // <= 6
      expect(new Set(osMobile.allNodes.map((n) => n.id)).size).toBe(osMobile.allNodes.length); // 0 duplicates
    });

    it("completes full round-trip navigation: Memory -> Operating Systems -> Memory", async () => {
      const { WAVE1_PREVIEW_DATASET } = await import("@/data/preview");
      const { createKnowledgeGraphIndex } = await import("../knowledge-index");
      const index = createKnowledgeGraphIndex(WAVE1_PREVIEW_DATASET);

      // Hop 1: Memory (starting from rust)
      const memHop1 = buildLocalUniverseScene({
        index,
        focusSlug: "memory",
        previousFocusSlug: "rust",
        isMobile: false,
      });
      expect(memHop1.primaryNodes.map((n) => n.slug)).toContain("rust");

      // Hop 2: Operating Systems (coming from memory)
      const osHop2 = buildLocalUniverseScene({
        index,
        focusSlug: "operating-systems",
        previousFocusSlug: "memory",
        isMobile: false,
      });
      expect(osHop2.primaryNodes.map((n) => n.slug)).toContain("memory");

      // Hop 3: Memory (returning from operating-systems)
      const memHop3 = buildLocalUniverseScene({
        index,
        focusSlug: "memory",
        previousFocusSlug: "operating-systems",
        isMobile: false,
      });
      expect(memHop3.primaryNodes.map((n) => n.slug)).toContain("operating-systems");
    });

    it("preserves return paths for other high-degree concepts (CPUs & Memory)", async () => {
      const { WAVE1_PREVIEW_DATASET } = await import("@/data/preview");
      const { createKnowledgeGraphIndex } = await import("../knowledge-index");
      const index = createKnowledgeGraphIndex(WAVE1_PREVIEW_DATASET);

      // CPUs has 7 direct neighbors in Wave 1
      // Navigating from transistors to cpus:
      const cpusScene = buildLocalUniverseScene({
        index,
        focusSlug: "cpus",
        previousFocusSlug: "transistors",
        isMobile: false,
      });
      expect(cpusScene.primaryNodes.map((n) => n.slug)).toContain("transistors");
      expect(cpusScene.primaryNodes.length).toBe(DESKTOP_SCENE_BUDGET.maxPrimary);

      // Navigating from cpus to transistors:
      const transScene = buildLocalUniverseScene({
        index,
        focusSlug: "transistors",
        previousFocusSlug: "cpus",
        isMobile: false,
      });
      expect(transScene.primaryNodes.map((n) => n.slug)).toContain("cpus");
    });

    it("does not reserve a primary slot for concepts that are not direct neighbors", async () => {
      const { WAVE1_PREVIEW_DATASET } = await import("@/data/preview");
      const { createKnowledgeGraphIndex } = await import("../knowledge-index");
      const index = createKnowledgeGraphIndex(WAVE1_PREVIEW_DATASET);

      // 'rust' is NOT a direct neighbor of 'operating-systems'
      const osWithUnrelated = buildLocalUniverseScene({
        index,
        focusSlug: "operating-systems",
        previousFocusSlug: "rust",
        isMobile: false,
      });
      expect(osWithUnrelated.primaryNodes.map((n) => n.slug)).not.toContain("rust");
      expect(osWithUnrelated.primaryNodes.length).toBe(DESKTOP_SCENE_BUDGET.maxPrimary);
    });

    it("preserves strict relationship direction and source/target IDs when return slot is reserved", async () => {
      const { WAVE1_PREVIEW_DATASET } = await import("@/data/preview");
      const { createKnowledgeGraphIndex } = await import("../knowledge-index");
      const index = createKnowledgeGraphIndex(WAVE1_PREVIEW_DATASET);

      const scene = buildLocalUniverseScene({
        index,
        focusSlug: "operating-systems",
        previousFocusSlug: "memory",
        isMobile: false,
      });

      for (const rel of scene.relationships) {
        const originalRel = WAVE1_PREVIEW_DATASET.relationships.find((r) => r.id === rel.id);
        expect(originalRel).toBeDefined();
        expect(rel.sourceId).toBe(originalRel?.sourceConceptId);
        expect(rel.targetId).toBe(originalRel?.targetConceptId);
        expect(rel.type).toBe(originalRel?.type);
      }
    });
  });
});
