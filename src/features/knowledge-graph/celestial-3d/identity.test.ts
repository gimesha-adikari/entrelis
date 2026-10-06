import { describe, it, expect } from "vitest";
import {
  getConceptCelestialIdentity,
  CATALOG_ARCHETYPES,
  type CelestialArchetype,
} from "./identity";

describe("Celestial 3D Identity Mapping", () => {
  it("maps the 7 core Entrelis seed concepts to their curated archetypes", () => {
    const rust = getConceptCelestialIdentity("rust");
    expect(rust.archetype).toBe("volcanic-rocky");
    expect(rust.rings).toBeUndefined();

    const ownership = getConceptCelestialIdentity("ownership");
    expect(ownership.archetype).toBe("ember-star");

    const memory = getConceptCelestialIdentity("memory");
    expect(memory.archetype).toBe("blue-atmospheric");

    const stackHeap = getConceptCelestialIdentity("stack-heap");
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
