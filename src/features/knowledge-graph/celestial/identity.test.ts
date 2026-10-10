import { describe, expect, it } from "vitest";
import { getCelestialIdentity, hashString } from "./identity";

describe("Celestial Identity System", () => {
  it("computes deterministic identity repeatedly for the same concept ID", () => {
    const id1 = getCelestialIdentity("concept-rust");
    const id2 = getCelestialIdentity("concept-rust");

    expect(id1).toEqual(id2);
    expect(id1.archetype).toBe("rocky");
    expect(id1.palette.name).toBe("copper-terrene");
  });

  it("assigns distinct archetypes and palettes to diverse seed concepts", () => {
    const concepts = [
      "concept-rust",
      "concept-ownership",
      "concept-memory",
      "concept-operating-systems",
    ];

    const identities = concepts.map(getCelestialIdentity);

    // Ensure all 4 archetypes are represented across our primary journey
    const archetypes = new Set(identities.map((i) => i.archetype));
    expect(archetypes.size).toBe(4);
    expect(archetypes.has("rocky")).toBe(true);
    expect(archetypes.has("star")).toBe(true);
    expect(archetypes.has("gas")).toBe(true);
    expect(archetypes.has("ice")).toBe(true);
  });

  it("generates negative animation delays to prevent synchronous lockstep animation", () => {
    const identity = getCelestialIdentity("concept-ownership");

    expect(identity.rotationDelay.startsWith("-")).toBe(true);
    expect(identity.breathingDelay.startsWith("-")).toBe(true);
    expect(parseFloat(identity.rotationDuration)).toBeGreaterThanOrEqual(30);
    expect(parseFloat(identity.breathingDuration)).toBeGreaterThanOrEqual(6);
  });

  it("guarantees coherent upper-left key light direction", () => {
    const idRust = getCelestialIdentity("concept-rust");
    const idMem = getCelestialIdentity("concept-memory");

    expect(idRust.lightAngleDeg).toBeGreaterThanOrEqual(285);
    expect(idRust.lightAngleDeg).toBeLessThanOrEqual(335);

    expect(idMem.lightAngleDeg).toBeGreaterThanOrEqual(285);
    expect(idMem.lightAngleDeg).toBeLessThanOrEqual(335);
  });

  it("hashString produces stable 32-bit FNV-1a hashes", () => {
    const h1 = hashString("concept-rust");
    const h2 = hashString("concept-rust");
    expect(h1).toBe(h2);
    expect(h1).toBe(3301811688);
  });
});
