import { type UniverseNode, type UniverseRelationship, type UniverseScene } from "./types";

export const SCENE_TRANSITION_DURATION_MS = 420;

/**
 * Single consistent cubic ease-out curve.
 */
export function easeOutCubic(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - clamped, 3);
}

/**
 * Interpolates smoothly between fromScene and toScene given a progress value in [0, 1].
 *
 * Rules:
 * - Persistent nodes interpolate positions (x, y), radii, opacities, and visual mass.
 * - Departing nodes (only in fromScene) smoothly fade out.
 * - Entering nodes (only in toScene) smoothly fade in.
 * - Persistent relationships interpolate opacity.
 * - Progress = 1 returns toScene directly.
 */
export function interpolateScenes(
  fromScene: UniverseScene,
  toScene: UniverseScene,
  progress: number
): UniverseScene {
  if (progress >= 1) {
    return toScene;
  }
  if (progress <= 0) {
    return fromScene;
  }

  const ease = easeOutCubic(progress);

  const fromNodeMap = new Map<string, UniverseNode>();
  for (const node of fromScene.allNodes) {
    fromNodeMap.set(node.id, node);
  }

  const toNodeMap = new Map<string, UniverseNode>();
  for (const node of toScene.allNodes) {
    toNodeMap.set(node.id, node);
  }

  const interpolatedNodes: UniverseNode[] = [];
  const processedNodeIds = new Set<string>();

  // Process nodes present in toScene (persistent + entering)
  for (const toNode of toScene.allNodes) {
    processedNodeIds.add(toNode.id);
    const fromNode = fromNodeMap.get(toNode.id);

    if (fromNode) {
      // Node is in both scenes: interpolate smoothly
      interpolatedNodes.push({
        ...toNode,
        role: progress >= 0.5 ? toNode.role : fromNode.role,
        x: fromNode.x + (toNode.x - fromNode.x) * ease,
        y: fromNode.y + (toNode.y - fromNode.y) * ease,
        radius: fromNode.radius + (toNode.radius - fromNode.radius) * ease,
        visualMass: fromNode.visualMass + (toNode.visualMass - fromNode.visualMass) * ease,
        opacity: fromNode.opacity + (toNode.opacity - fromNode.opacity) * ease,
      });
    } else {
      // Node is entering: fade in
      interpolatedNodes.push({
        ...toNode,
        radius: toNode.radius * (0.65 + 0.35 * ease),
        opacity: toNode.opacity * ease,
      });
    }
  }

  // Process departing nodes (only in fromScene)
  for (const fromNode of fromScene.allNodes) {
    if (!processedNodeIds.has(fromNode.id)) {
      interpolatedNodes.push({
        ...fromNode,
        radius: fromNode.radius * Math.max(0.1, 1 - ease * 0.35),
        opacity: fromNode.opacity * (1 - ease),
      });
    }
  }

  // Relationships interpolation
  const fromRelMap = new Map<string, UniverseRelationship>();
  for (const rel of fromScene.relationships) {
    fromRelMap.set(rel.id, rel);
  }

  const interpolatedRels: UniverseRelationship[] = [];
  const processedRelIds = new Set<string>();

  for (const toRel of toScene.relationships) {
    processedRelIds.add(toRel.id);
    const fromRel = fromRelMap.get(toRel.id);

    if (fromRel) {
      interpolatedRels.push({
        ...toRel,
        opacity: fromRel.opacity + (toRel.opacity - fromRel.opacity) * ease,
      });
    } else {
      interpolatedRels.push({
        ...toRel,
        opacity: toRel.opacity * ease,
      });
    }
  }

  for (const fromRel of fromScene.relationships) {
    if (!processedRelIds.has(fromRel.id)) {
      interpolatedRels.push({
        ...fromRel,
        opacity: fromRel.opacity * (1 - ease),
      });
    }
  }

  // Find current focus node
  const focusNode = interpolatedNodes.find((n) => n.id === toScene.focus.id) ?? toScene.focus;

  const primaryNodes = interpolatedNodes.filter((n) =>
    toScene.primaryNodes.some((p) => p.id === n.id)
  );
  const contextNodes = interpolatedNodes.filter(
    (n) => n.id !== focusNode.id && !primaryNodes.some((p) => p.id === n.id)
  );

  return {
    focus: focusNode,
    primaryNodes,
    contextNodes,
    allNodes: interpolatedNodes,
    relationships: interpolatedRels,
    isMobile: toScene.isMobile,
  };
}
