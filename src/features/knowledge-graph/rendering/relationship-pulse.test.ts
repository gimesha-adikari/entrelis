import { describe, it, expect } from "vitest";
import {
  activatePendingRelationshipPulse,
  beginRelationshipPulse,
  isPendingRelationshipPulseActive,
  sampleRelationshipPulse,
  isRelationshipPulseActive,
  requestRelationshipPulse,
  RELATIONSHIP_PULSE_READINESS_TIMEOUT_MS,
} from "./relationship-pulse";
import { calculateRelationshipGeometry, quadraticPointAt } from "./relationship-path";
import type { UniverseRelationship } from "../scene/types";
const relationship = {
  id: "r",
  sourceId: "source",
  targetId: "target",
  opacity: 1,
} as UniverseRelationship;
const geometry = calculateRelationshipGeometry(
  { x: 0, y: 0, radius: 20 },
  { x: 200, y: 80, radius: 30 },
  0.25
)!;
describe("finite semantic relationship energy", () => {
  it("keeps source-target direction even when navigation is target to source", () => {
    const pulse = beginRelationshipPulse([relationship], "target", "source", 100)!;
    expect(pulse.sourceId).toBe("source");
    expect(pulse.targetId).toBe("target");
    const early = sampleRelationshipPulse(pulse, relationship, geometry, 200)!;
    const later = sampleRelationshipPulse(pulse, relationship, geometry, 600)!;
    expect(early.progress).toBeLessThan(later.progress);
    expect(early.point).toEqual(quadraticPointAt(geometry.path, early.progress));
  });
  it("uses a real incoming focus edge when navigation has no direct edge", () => {
    const incoming = {
      ...relationship,
      id: "incoming",
      sourceId: "memory",
      targetId: "target",
      strength: "primary",
      role: "focus-connection",
    } as UniverseRelationship;
    const outgoing = {
      ...relationship,
      id: "outgoing",
      sourceId: "target",
      targetId: "systems",
      strength: "primary",
      role: "focus-connection",
    } as UniverseRelationship;
    const pulse = requestRelationshipPulse([outgoing, incoming], "rust", "target", 100)!;

    expect(pulse).toMatchObject({
      relationshipId: "incoming",
      sourceId: "memory",
      targetId: "target",
      requestedAt: 100,
    });
  });
  it("gathers and dissolves within 800ms and cannot schedule after expiry", () => {
    const pulse = beginRelationshipPulse([relationship], "source", "target", 100)!;
    expect(sampleRelationshipPulse(pulse, relationship, geometry, 100)?.alpha).toBe(0);
    expect(sampleRelationshipPulse(pulse, relationship, geometry, 500)?.alpha).toBeGreaterThan(0.5);
    expect(sampleRelationshipPulse(pulse, relationship, geometry, 900)).toBeNull();
    expect(isRelationshipPulseActive(pulse, 900)).toBe(false);
  });
  it("suppresses hidden, reduced-motion, zero-opacity and stale relationships", () => {
    const pulse = beginRelationshipPulse([relationship], "source", "target", 100)!;
    expect(isRelationshipPulseActive(pulse, 200, true, false)).toBe(false);
    expect(isRelationshipPulseActive(pulse, 200, false, true)).toBe(false);
    expect(
      sampleRelationshipPulse(pulse, { ...relationship, opacity: 0 }, geometry, 200)
    ).toBeNull();
    expect(
      sampleRelationshipPulse(pulse, { ...relationship, targetId: "other" }, geometry, 200)
    ).toBeNull();
  });
  it("replaces one pulse on navigation and suppresses unrelated exploration", () => {
    const first = beginRelationshipPulse([relationship], "source", "target", 100)!;
    const next = beginRelationshipPulse([relationship], "target", "source", 300)!;
    expect(next.startedAt).toBe(300);
    expect(first.startedAt).toBe(100);
    expect(beginRelationshipPulse([relationship], "source", "other", 300)).toBeNull();
    expect(beginRelationshipPulse([relationship], "source", "source", 300)).toBeNull();
    expect(beginRelationshipPulse([relationship], "source", "target", NaN)).toBeNull();
  });
  it("follows the current clipped path after size and position interpolation", () => {
    const pulse = beginRelationshipPulse([relationship], "source", "target", 0)!;
    const moved = calculateRelationshipGeometry(
      { x: 15, y: 4, radius: 30 },
      { x: 180, y: 70, radius: 20 },
      0.25
    )!;
    const sample = sampleRelationshipPulse(pulse, relationship, moved, 400)!;
    expect(sample.point).toEqual(quadraticPointAt(moved.path, 0.5));
    expect(sample.point).not.toEqual(quadraticPointAt(geometry.path, 0.5));
  });
  it("starts its unchanged 800ms lifetime when the safe directed edge first becomes visible", () => {
    const pending = requestRelationshipPulse([relationship], "target", "source", 100)!;
    expect(activatePendingRelationshipPulse(pending, new Set(), 200)).toBeNull();

    const visible = activatePendingRelationshipPulse(pending, new Set(["r"]), 450)!;
    expect(visible).toMatchObject({
      relationshipId: "r",
      sourceId: "source",
      targetId: "target",
      startedAt: 450,
    });
    expect(sampleRelationshipPulse(visible, relationship, geometry, 850)?.alpha).toBe(1);
    expect(sampleRelationshipPulse(visible, relationship, geometry, 1_250)).toBeNull();
  });
  it("expires an unready request and rejects hidden or reduced-motion activation", () => {
    const pending = requestRelationshipPulse([relationship], "source", "target", 100)!;
    const visibility = new Set(["r"]);

    expect(activatePendingRelationshipPulse(pending, visibility, 200, true, false)).toBeNull();
    expect(activatePendingRelationshipPulse(pending, visibility, 200, false, true)).toBeNull();
    expect(
      isPendingRelationshipPulseActive(pending, 100 + RELATIONSHIP_PULSE_READINESS_TIMEOUT_MS)
    ).toBe(false);
    expect(
      activatePendingRelationshipPulse(
        pending,
        visibility,
        100 + RELATIONSHIP_PULSE_READINESS_TIMEOUT_MS
      )
    ).toBeNull();
  });
});
