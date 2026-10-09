import { describe, it, expect } from "vitest";
import {
  getConceptCelestialIdentity,
  CATALOG_ARCHETYPES,
  type CelestialArchetype,
} from "./identity";
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
});
