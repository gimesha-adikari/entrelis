import type { UniverseRelationship } from "../scene/types";
import { quadraticPointAt, type RelationshipPathGeometry } from "./relationship-path";

export interface RelationshipPulse {
  readonly relationshipId: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly startedAt: number;
}

export interface PendingRelationshipPulse {
  readonly relationshipId: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly requestedAt: number;
}

export const RELATIONSHIP_PULSE_DURATION_MS = 800;
export const RELATIONSHIP_PULSE_READINESS_TIMEOUT_MS = 2_500;

function findNavigatedRelationship(
  relationships: readonly UniverseRelationship[],
  fromId: string,
  toId: string,
  now: number
): UniverseRelationship | null {
  if (fromId === toId || !Number.isFinite(now)) return null;
  const direct = relationships.find(
    (rel) =>
      rel.opacity > 0 &&
      ((rel.sourceId === fromId && rel.targetId === toId) ||
        (rel.sourceId === toId && rel.targetId === fromId))
  );
  if (direct) return direct;

  // Local scenes can expose a contextual node reached through another concept. If
  // there is no direct edge from the prior focus, pulse a real incoming edge on
  // the newly focused node, preserving the dataset's actual source-to-target flow.
  const strengthRank = { primary: 3, strong: 2, supporting: 1 } as const;
  const byMeaning = (left: UniverseRelationship, right: UniverseRelationship) =>
    strengthRank[right.strength] - strengthRank[left.strength] ||
    Number(right.role === "focus-connection") - Number(left.role === "focus-connection") ||
    right.opacity - left.opacity;
  const incoming = relationships
    .filter((rel) => rel.opacity > 0 && rel.targetId === toId)
    .sort(byMeaning);
  if (incoming[0]) return incoming[0];

  return (
    relationships.filter((rel) => rel.opacity > 0 && rel.sourceId === toId).sort(byMeaning)[0] ??
    null
  );
}

/** Navigation chooses one edge; its semantic direction always belongs to the dataset. */
export function beginRelationshipPulse(
  relationships: readonly UniverseRelationship[],
  fromId: string,
  toId: string,
  now: number
): RelationshipPulse | null {
  const relationship = findNavigatedRelationship(relationships, fromId, toId, now);
  return relationship
    ? {
        relationshipId: relationship.id,
        sourceId: relationship.sourceId,
        targetId: relationship.targetId,
        startedAt: now,
      }
    : null;
}

/** Record one cancellable navigation pulse request without starting its 800ms clock. */
export function requestRelationshipPulse(
  relationships: readonly UniverseRelationship[],
  fromId: string,
  toId: string,
  now: number
): PendingRelationshipPulse | null {
  const relationship = findNavigatedRelationship(relationships, fromId, toId, now);
  return relationship
    ? {
        relationshipId: relationship.id,
        sourceId: relationship.sourceId,
        targetId: relationship.targetId,
        requestedAt: now,
      }
    : null;
}

export function isPendingRelationshipPulseActive(
  pulse: PendingRelationshipPulse | null,
  now: number,
  reducedMotion = false,
  hidden = false
): boolean {
  return Boolean(
    pulse &&
    !reducedMotion &&
    !hidden &&
    Number.isFinite(now) &&
    now >= pulse.requestedAt &&
    now - pulse.requestedAt < RELATIONSHIP_PULSE_READINESS_TIMEOUT_MS
  );
}

/** Start only after the renderer reports that this semantic edge is safe to show. */
export function activatePendingRelationshipPulse(
  pending: PendingRelationshipPulse | null,
  visibleRelationshipIds: ReadonlySet<string>,
  now: number,
  reducedMotion = false,
  hidden = false
): RelationshipPulse | null {
  if (
    !pending ||
    !visibleRelationshipIds.has(pending.relationshipId) ||
    !isPendingRelationshipPulseActive(pending, now, reducedMotion, hidden)
  ) {
    return null;
  }
  return {
    relationshipId: pending.relationshipId,
    sourceId: pending.sourceId,
    targetId: pending.targetId,
    startedAt: now,
  };
}

export function isRelationshipPulseActive(
  pulse: RelationshipPulse | null,
  now: number,
  reducedMotion = false,
  hidden = false
): boolean {
  return Boolean(
    pulse &&
    !reducedMotion &&
    !hidden &&
    Number.isFinite(now) &&
    now >= pulse.startedAt &&
    now - pulse.startedAt < RELATIONSHIP_PULSE_DURATION_MS
  );
}

/** Evaluate against the displayed clipped curve, never a cached pre-transition path. */
export function sampleRelationshipPulse(
  pulse: RelationshipPulse | null,
  relationship: UniverseRelationship,
  geometry: RelationshipPathGeometry,
  now: number
): { point: { x: number; y: number }; progress: number; alpha: number } | null {
  if (
    !pulse ||
    !isRelationshipPulseActive(pulse, now) ||
    relationship.opacity <= 0 ||
    relationship.id !== pulse.relationshipId ||
    relationship.sourceId !== pulse.sourceId ||
    relationship.targetId !== pulse.targetId
  )
    return null;
  const progress = (now - pulse.startedAt) / RELATIONSHIP_PULSE_DURATION_MS;
  const alpha = Math.min(1, progress / 0.15, (1 - progress) / 0.2) * relationship.opacity;
  return { point: quadraticPointAt(geometry.path, progress), progress, alpha };
}
