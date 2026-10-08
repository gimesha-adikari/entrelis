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
 * Resolves effective label placement for a node.
 * If the node already has active in-flight label properties (e.g. during an interrupted transition),
 * those properties are preserved directly rather than reverting to canonical placement.
 */
export function getEffectiveNodeLabelPlacement(
  node: UniverseNode,
  isMobile: boolean
): {
  readonly offsetX: number;
  readonly offsetY: number;
  readonly alignment: "left" | "center" | "right";
  readonly baseline: CanvasTextBaseline;
  readonly fontSize: number;
} {
  if (
    typeof node.labelOffsetX === "number" &&
    typeof node.labelOffsetY === "number" &&
    node.labelAlignment !== undefined &&
    node.labelBaseline !== undefined &&
    typeof node.labelFontSize === "number"
  ) {
    return {
      offsetX: node.labelOffsetX,
      offsetY: node.labelOffsetY,
      alignment: node.labelAlignment,
      baseline: node.labelBaseline,
      fontSize: node.labelFontSize,
    };
  }
  return getNodeLabelPlacement(node, isMobile);
}

/**
 * Calculates the visual geometric center of a node's label in world coordinates.
 * Compensates for label alignment and baseline so visual continuity can be verified.
 */
export function getDisplayedLabelCenter(
  node: UniverseNode,
  placement?: {
    offsetX?: number;
    offsetY?: number;
    alignment?: "left" | "center" | "right";
    baseline?: CanvasTextBaseline;
    fontSize?: number;
  }
): { x: number; y: number } {
  const offsetX = placement?.offsetX ?? node.labelOffsetX ?? 0;
  const offsetY = placement?.offsetY ?? node.labelOffsetY ?? 0;
  const alignment =
    placement?.alignment ?? node.labelAlignment ?? (node.role === "focus" ? "center" : "left");
  const baseline =
    placement?.baseline ?? node.labelBaseline ?? (node.role === "focus" ? "top" : "middle");
  const fontSize = placement?.fontSize ?? node.labelFontSize ?? (node.role === "focus" ? 16 : 12);

  const approxWidth = Math.max(1, (node.name || "").length * fontSize * 0.55);
  const approxHeight = fontSize * 0.75;

  let centerX = node.x + offsetX;
  if (alignment === "left") {
    centerX += approxWidth / 2;
  } else if (alignment === "right") {
    centerX -= approxWidth / 2;
  }

  let centerY = node.y + offsetY;
  if (baseline === "top") {
    centerY += approxHeight / 2;
  } else if (baseline === "bottom") {
    centerY -= approxHeight / 2;
  }

  return { x: centerX, y: centerY };
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

      const fromPlacement = getEffectiveNodeLabelPlacement(fromNode, toScene.isMobile);
      const toPlacement = getEffectiveNodeLabelPlacement(toNode, toScene.isMobile);

      const labelFontSize =
        fromPlacement.fontSize + (toPlacement.fontSize - fromPlacement.fontSize) * ease;
      const labelAlignment = progress >= 0.5 ? toPlacement.alignment : fromPlacement.alignment;
      const labelBaseline = progress >= 0.5 ? toPlacement.baseline : fromPlacement.baseline;

      // Approximate text bounds for anchor-shift compensation across alignment and baseline changes
      const fromWidth = Math.max(1, (toNode.name || "").length * fromPlacement.fontSize * 0.55);
      const fromHeight = fromPlacement.fontSize * 0.75;
      const toWidth = Math.max(1, (toNode.name || "").length * toPlacement.fontSize * 0.55);
      const toHeight = toPlacement.fontSize * 0.75;

      let fromCenterX = fromPlacement.offsetX;
      if (fromPlacement.alignment === "left") fromCenterX += fromWidth / 2;
      else if (fromPlacement.alignment === "right") fromCenterX -= fromWidth / 2;

      let fromCenterY = fromPlacement.offsetY;
      if (fromPlacement.baseline === "top") fromCenterY += fromHeight / 2;
      else if (fromPlacement.baseline === "bottom") fromCenterY -= fromHeight / 2;

      let toCenterX = toPlacement.offsetX;
      if (toPlacement.alignment === "left") toCenterX += toWidth / 2;
      else if (toPlacement.alignment === "right") toCenterX -= toWidth / 2;

      let toCenterY = toPlacement.offsetY;
      if (toPlacement.baseline === "top") toCenterY += toHeight / 2;
      else if (toPlacement.baseline === "bottom") toCenterY -= toHeight / 2;

      // Interpolate the visual center offset continuously
      const currentCenterX = fromCenterX + (toCenterX - fromCenterX) * ease;
      const currentCenterY = fromCenterY + (toCenterY - fromCenterY) * ease;

      const currentWidth = Math.max(1, (toNode.name || "").length * labelFontSize * 0.55);
      const currentHeight = labelFontSize * 0.75;

      let labelOffsetX = currentCenterX;
      if (labelAlignment === "left") labelOffsetX -= currentWidth / 2;
      else if (labelAlignment === "right") labelOffsetX += currentWidth / 2;

      let labelOffsetY = currentCenterY;
      if (labelBaseline === "top") labelOffsetY -= currentHeight / 2;
      else if (labelBaseline === "bottom") labelOffsetY += currentHeight / 2;

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
      const toPlacement = getEffectiveNodeLabelPlacement(toNode, toScene.isMobile);
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
      const fromPlacement = getEffectiveNodeLabelPlacement(fromNode, toScene.isMobile);

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
