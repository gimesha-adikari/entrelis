import { describe, it, expect } from "vitest";
import {
  getConceptCelestialIdentity,
  CATALOG_ARCHETYPES,
  type CelestialArchetype,
} from "./identity";
import { createNoise3D } from "./procedural/noise3d";
import { SEED_DATASET } from "@/data/seed";

const EXPECTED_SEED_IDENTITIES: Record<
  string,
  { archetype: CelestialArchetype; seed: number; paletteVariant: number }
> = {
  rust: { archetype: "volcanic-rocky", seed: 42, paletteVariant: 0 },
  ownership: { archetype: "ember-star", seed: 108, paletteVariant: 0 },
  memory: { archetype: "blue-atmospheric", seed: 256, paletteVariant: 0 },
  "stack-and-heap": { archetype: "mineral-rocky", seed: 512, paletteVariant: 0 },
  "operating-systems": { archetype: "storm-giant", seed: 1024, paletteVariant: 0 },
  cpus: { archetype: "metallic-world", seed: 2048, paletteVariant: 0 },
  transistors: { archetype: "crystal-world", seed: 4096, paletteVariant: 0 },
};

describe("Celestial 3D Identity Mapping", () => {
  it("maps the 7 core Entrelis seed concepts to their curated archetypes", () => {
    const rust = getConceptCelestialIdentity("rust");
    expect(rust.archetype).toBe("volcanic-rocky");
    expect(rust.rings).toBeUndefined();

    const ownership = getConceptCelestialIdentity("ownership");
    expect(ownership.archetype).toBe("ember-star");

    const memory = getConceptCelestialIdentity("memory");
    expect(memory.archetype).toBe("blue-atmospheric");

    const stackHeap = getConceptCelestialIdentity("stack-and-heap");
    expect(stackHeap.archetype).toBe("mineral-rocky");
    expect(stackHeap.rings).toBeDefined();
    expect(stackHeap.rings?.style).toBe("ice");

    const os = getConceptCelestialIdentity("operating-systems");
    expect(os.archetype).toBe("storm-giant");
    expect(os.rings).toBeDefined();
    expect(os.rings?.style).toBe("ice");

    const cpus = getConceptCelestialIdentity("cpus");
    expect(cpus.archetype).toBe("metallic-world");

    const transistors = getConceptCelestialIdentity("transistors");
    expect(transistors.archetype).toBe("crystal-world");
  });

  it("resolves every actual seed dataset slug to its intended curated identity", () => {
    const seedSlugs = SEED_DATASET.concepts.map(({ slug }) => slug).sort();
    expect(seedSlugs).toEqual(Object.keys(EXPECTED_SEED_IDENTITIES).sort());

    for (const concept of SEED_DATASET.concepts) {
      const expectedIdentity = EXPECTED_SEED_IDENTITIES[concept.slug];
      if (!expectedIdentity) {
        throw new Error(`Missing curated identity expectation for seed slug: ${concept.slug}`);
      }
      expect(getConceptCelestialIdentity(concept.slug)).toMatchObject(expectedIdentity);
    }

    expect(getConceptCelestialIdentity("stack-and-heap")).toMatchObject({
      archetype: "mineral-rocky",
      seed: 512,
      paletteVariant: 0,
      rings: {
        innerRadius: 62,
        outerRadius: 84,
        tilt: 0.35,
        opacity: 0.8,
        style: "ice",
        seed: 512,
        color: 0xc4b5fd,
      },
    });
  });

  it("produces deterministic identities for arbitrary unknown concepts", () => {
    const id1 = getConceptCelestialIdentity("compiler-theory");
    const id2 = getConceptCelestialIdentity("compiler-theory");
    expect(id1).toEqual(id2);
    expect(typeof id1.seed).toBe("number");
    expect(id1.archetype).toBeDefined();
  });

  it("contains all required catalog archetypes", () => {
    const expectedArchetypes: CelestialArchetype[] = [
      "golden-star",
      "blue-star",
      "ember-star",
      "volcanic-rocky",
      "mineral-rocky",
      "life-world",
      "blue-atmospheric",
      "storm-giant",
      "metallic-world",
      "crystal-world",
      "asteroid",
    ];

    for (const archetype of expectedArchetypes) {
      expect(CATALOG_ARCHETYPES.some((item) => item.identity.archetype === archetype)).toBe(true);
    }
  });

  it("maintains identity independent of scene role", () => {
    const rustIdentity = getConceptCelestialIdentity("rust");
    // Verify identity object has no role property
    expect("role" in rustIdentity).toBe(false);
  });

  it("maps the 6 M2 pilot concepts to their curated celestial identities", () => {
    const isa = getConceptCelestialIdentity("instruction-set-architecture");
    expect(isa.archetype).toBe("golden-star");
    expect(isa.seed).toBe(8192);

    const vm = getConceptCelestialIdentity("virtual-memory");
    expect(vm.archetype).toBe("crystal-world");
    expect(vm.seed).toBe(16384);

    const fs = getConceptCelestialIdentity("file-systems");
    expect(fs.archetype).toBe("mineral-rocky");
    expect(fs.seed).toBe(32768);
    expect(fs.rings?.style).toBe("dust");

    const concurrency = getConceptCelestialIdentity("concurrency");
    expect(concurrency.archetype).toBe("storm-giant");
    expect(concurrency.seed).toBe(65536);
    expect(concurrency.moons).toHaveLength(1);

    const aio = getConceptCelestialIdentity("asynchronous-io");
    expect(aio.archetype).toBe("blue-atmospheric");
    expect(aio.seed).toBe(131072);

    const mc = getConceptCelestialIdentity("machine-code");
    expect(mc.archetype).toBe("metallic-world");
    expect(mc.seed).toBe(262144);

    // Verify lookup works seamlessly with conceptId prefix
    expect(getConceptCelestialIdentity("concept-virtual-memory")).toEqual(vm);
    expect(getConceptCelestialIdentity("concept-machine-code")).toEqual(mc);
  });

  it("ensures all 20 Wave 1 concepts have nonzero, collision-free effective 32-bit seeds", () => {
    const wave1Slugs = [
      "compilers",
      "type-systems",
      "garbage-collection",
      "data-structures",
      "database-systems",
      "logic-gates",
      "integrated-circuit",
      "microprocessor-revolution",
      "von-neumann-architecture",
      "history-of-computing",
      "semiconductors",
      "transistor-invention",
      "solid-state-physics",
      "atoms",
      "electrons",
      "boolean-logic",
      "formal-logic",
      "algorithms",
      "computability-theory",
      "alan-turing",
    ];

    const effectiveSeeds = new Set<number>();

    for (const slug of wave1Slugs) {
      const identity = getConceptCelestialIdentity(slug);
      const effectiveSeed = identity.seed >>> 0;

      // Effective seed used by createLcg must be nonzero
      expect(effectiveSeed, `Effective seed for ${slug} must be nonzero`).toBeGreaterThan(0);
      expect(effectiveSeed, `Declared seed must match unsigned 32-bit representation`).toBe(identity.seed);

      // Must be pairwise unique
      expect(
        effectiveSeeds.has(effectiveSeed),
        `Duplicate effective seed detected: ${effectiveSeed} on ${slug}`
      ).toBe(false);
      effectiveSeeds.add(effectiveSeed);

      // Verify moons have valid nonzero, non-colliding seeds if present
      if (identity.moons) {
        for (const moon of identity.moons) {
          const moonEffectiveSeed = moon.seed >>> 0;
          expect(moonEffectiveSeed).toBeGreaterThan(0);
          expect(moonEffectiveSeed).toBe(moon.seed);
          expect(
            effectiveSeeds.has(moonEffectiveSeed),
            `Duplicate effective seed on moon: ${moonEffectiveSeed}`
          ).toBe(false);
          effectiveSeeds.add(moonEffectiveSeed);
        }
      }
    }
  });

  it("verifies the 7 corrected concepts produce independently seeded procedural noise without degenerate states", () => {
    const sevenSlugs = [
      "atoms",
      "electrons",
      "boolean-logic",
      "formal-logic",
      "algorithms",
      "computability-theory",
      "alan-turing",
    ];

    const degenerateNoise = createNoise3D(0);
    const degenerateSample = degenerateNoise(1.23, 4.56, 7.89);

    const noiseSamples = new Set<number>();

    for (const slug of sevenSlugs) {
      const identity = getConceptCelestialIdentity(slug);
      const effectiveSeed = identity.seed >>> 0;

      // Must not equal 0 (the degenerate state)
      expect(effectiveSeed).not.toBe(0);

      const noise = createNoise3D(effectiveSeed);
      const sample = noise(1.23, 4.56, 7.89);

      // Must not produce degenerate noise output
      expect(sample).not.toBe(degenerateSample);

      // Must be independent and distinct from each other
      expect(
        noiseSamples.has(sample),
        `Identical procedural noise produced for ${slug}`
      ).toBe(false);
      noiseSamples.add(sample);
    }

    expect(noiseSamples.size).toBe(sevenSlugs.length);
  });
});
