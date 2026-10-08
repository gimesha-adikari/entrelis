import {
  type UniverseNode,
  type UniverseNodeRole,
  type UniverseRelationship,
  type UniverseScene,
} from "./types";

export const SCENE_TRANSITION_DURATION_MS = 420;

/**
 * Single consistent cubic ease-out curve for spatial coordinate and radius interpolation.
 */
export function easeOutCubic(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - clamped, 3);
}

/**
 * Smooth Hermite interpolation (smoothstep) for gentle, organic opacity transitions.
 * Zero slope at t=0 and t=1 eliminates sudden emergence spikes and jarring drop-offs.
 */
export function smoothstep(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped * clamped * (3 - 2 * clamped);
}

/**
 * Canonical depth for universe node roles.
 */
export function roleToDepth(role: UniverseNodeRole): number {
  return role === "focus" ? 12 : role === "primary" ? 6 : 0;
}

/**
 * Computes canonical relative label placement offset and typography for a node.
 */
export function getNodeLabelPlacement(
  node: UniverseNode,
  isMobile: boolean
): {
  readonly offsetX: number;
  readonly offsetY: number;
  readonly alignment: "left" | "center" | "right";
  readonly baseline: CanvasTextBaseline;
  readonly fontSize: number;
} {
  const isFocus = node.role === "focus";
  const fontSize = isFocus ? (isMobile ? 14 : 16) : isMobile ? 11 : 12;
  if (isFocus) {
    return {
      offsetX: 0,
      offsetY: node.radius + (isMobile ? 8 : 12),
      alignment: "center",
      baseline: "top",
      fontSize,
    };
  }

  const angle = node.orbitalAngle ?? 0;
  const normAngle = Math.atan2(Math.sin(angle), Math.cos(angle));

  if (normAngle >= -Math.PI / 4 && normAngle <= Math.PI / 4) {
    return {
      offsetX: node.radius + 8,
      offsetY: 0,
      alignment: "left",
      baseline: "middle",
      fontSize,
    };
  } else if (normAngle > Math.PI / 4 && normAngle < (3 * Math.PI) / 4) {
    return {
      offsetX: 0,
      offsetY: node.radius + 8,
      alignment: "center",
      baseline: "top",
      fontSize,
    };
  } else if (normAngle < -Math.PI / 4 && normAngle > -(3 * Math.PI) / 4) {
    return {
      offsetX: 0,
      offsetY: -(node.radius + 8),
      alignment: "center",
      baseline: "bottom",
      fontSize,
    };
  } else {
    return {
      offsetX: -(node.radius + 8),
      offsetY: 0,
      alignment: "right",
      baseline: "middle",
      fontSize,
    };
  }
}

/**
 * Shortest angular path interpolation between two angles in radians.
 */
export function interpolateAngle(fromAngle: number, toAngle: number, t: number): number {
  let diff = (toAngle - fromAngle) % (2 * Math.PI);
  if (diff > Math.PI) diff -= 2 * Math.PI;
  if (diff < -Math.PI) diff += 2 * Math.PI;
  return fromAngle + diff * t;
}

/**
 * Interpolates smoothly between fromScene and toScene given a progress value in [0, 1].
 *
 * Rules:
 * - Persistent nodes continuously interpolate spatial coordinates (x, y, z), radii, visual mass, and opacity.
 * - Role handoff maintains monotonic z-depth progression without popping.
 * - Departing nodes smoothly fade out and gently recede into background space.
 * - Entering nodes subtly emerge without popping or elastic jumps.
 * - Relationships fade coherently with connected node opacity.
 * - Progress = 1 returns toScene directly; progress = 0 returns fromScene directly.
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
  const opacityProgress = smoothstep(progress);

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
      const fromZ = typeof fromNode.z === "number" ? fromNode.z : roleToDepth(fromNode.role);
      const toZ = typeof toNode.z === "number" ? toNode.z : roleToDepth(toNode.role);
      const z = fromZ + (toZ - fromZ) * ease;

      let orbitalAngle: number | undefined = toNode.orbitalAngle;
      if (typeof fromNode.orbitalAngle === "number" && typeof toNode.orbitalAngle === "number") {
        orbitalAngle = interpolateAngle(fromNode.orbitalAngle, toNode.orbitalAngle, ease);
      } else if (typeof fromNode.orbitalAngle === "number") {
        orbitalAngle = fromNode.orbitalAngle;
      }

      const fromPlacement = getNodeLabelPlacement(fromNode, toScene.isMobile);
      const toPlacement = getNodeLabelPlacement(toNode, toScene.isMobile);
      const labelOffsetX =
        fromPlacement.offsetX + (toPlacement.offsetX - fromPlacement.offsetX) * ease;
      const labelOffsetY =
        fromPlacement.offsetY + (toPlacement.offsetY - fromPlacement.offsetY) * ease;
      const labelFontSize =
        fromPlacement.fontSize + (toPlacement.fontSize - fromPlacement.fontSize) * ease;
      const labelAlignment = progress >= 0.5 ? toPlacement.alignment : fromPlacement.alignment;
      const labelBaseline = progress >= 0.5 ? toPlacement.baseline : fromPlacement.baseline;

      interpolatedNodes.push({
        ...toNode,
        role: progress >= 0.5 ? toNode.role : fromNode.role,
        x: fromNode.x + (toNode.x - fromNode.x) * ease,
        y: fromNode.y + (toNode.y - fromNode.y) * ease,
        z,
        radius: fromNode.radius + (toNode.radius - fromNode.radius) * ease,
        visualMass: fromNode.visualMass + (toNode.visualMass - fromNode.visualMass) * ease,
        opacity: fromNode.opacity + (toNode.opacity - fromNode.opacity) * opacityProgress,
        orbitalAngle,
        labelOffsetX,
        labelOffsetY,
        labelAlignment,
        labelBaseline,
        labelFontSize,
      });
    } else {
      // Node is entering: subtle emergence from slightly deeper in space
      const toZ = typeof toNode.z === "number" ? toNode.z : roleToDepth(toNode.role);
      const toPlacement = getNodeLabelPlacement(toNode, toScene.isMobile);
      interpolatedNodes.push({
        ...toNode,
        z: toZ - (1 - ease) * 4,
        radius: toNode.radius * (0.75 + 0.25 * ease),
        opacity: toNode.opacity * opacityProgress,
        labelOffsetX: toPlacement.offsetX,
        labelOffsetY: toPlacement.offsetY,
        labelAlignment: toPlacement.alignment,
        labelBaseline: toPlacement.baseline,
        labelFontSize: toPlacement.fontSize,
      });
    }
  }

  // Process departing nodes (only in fromScene)
  for (const fromNode of fromScene.allNodes) {
    if (!processedNodeIds.has(fromNode.id)) {
      const fromZ = typeof fromNode.z === "number" ? fromNode.z : roleToDepth(fromNode.role);
      // Avoid duplicate focus role if departing node was previous focus
      const departingRole: UniverseNodeRole = fromNode.role === "focus" ? "primary" : fromNode.role;
      const fromPlacement = getNodeLabelPlacement(fromNode, toScene.isMobile);

      interpolatedNodes.push({
        ...fromNode,
        role: departingRole,
        z: fromZ - ease * 4,
        radius: fromNode.radius * Math.max(0.1, 1 - ease * 0.25),
        opacity: fromNode.opacity * (1 - opacityProgress),
        labelOffsetX: fromPlacement.offsetX,
        labelOffsetY: fromPlacement.offsetY,
        labelAlignment: fromPlacement.alignment,
        labelBaseline: fromPlacement.baseline,
        labelFontSize: fromPlacement.fontSize,
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
        opacity: fromRel.opacity + (toRel.opacity - fromRel.opacity) * opacityProgress,
      });
    } else {
      interpolatedRels.push({
        ...toRel,
        opacity: toRel.opacity * opacityProgress,
      });
    }
  }

  for (const fromRel of fromScene.relationships) {
    if (!processedRelIds.has(fromRel.id)) {
      interpolatedRels.push({
        ...fromRel,
        opacity: fromRel.opacity * (1 - opacityProgress),
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
