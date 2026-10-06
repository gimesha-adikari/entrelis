import { type UniverseNode, type UniverseScene } from "./types";

export interface SceneLayoutConfig {
  readonly viewportWidth?: number;
  readonly viewportHeight?: number;
  readonly isMobile?: boolean;
  readonly focalOffsetX?: number;
  readonly focalOffsetY?: number;
}

/**
 * Computes deterministic, art-directed 2D positions for the UniverseScene.
 *
 * Rules:
 * - Focus node placed at focal origin (offset slightly left of center on desktop to accommodate detail panel).
 * - Primary direct neighbors arranged on an elliptical orbital ring.
 * - Context nodes arranged on a distant outer ring clustered near their parent primary neighbor.
 * - Strictly deterministic, zero physics simulation, zero NaN/infinite coordinates.
 */
export function layoutLocalUniverseScene(
  scene: UniverseScene,
  config: SceneLayoutConfig = {}
): UniverseScene {
  const isMobile = config.isMobile ?? scene.isMobile;

  // 1. Focal Origin
  const defaultOffsetX = isMobile ? 0 : -100;
  const defaultOffsetY = isMobile ? -30 : 0;
  const originX = config.focalOffsetX ?? defaultOffsetX;
  const originY = config.focalOffsetY ?? defaultOffsetY;

  // 2. Orbital Radii
  const primaryRadiusX = isMobile ? 135 : 210;
  const primaryRadiusY = isMobile ? 120 : 185;

  const contextRadiusX = isMobile ? 220 : 330;
  const contextRadiusY = isMobile ? 200 : 300;

  // 3. Focus Node Layout
  const focusNode: UniverseNode = {
    ...scene.focus,
    x: originX,
    y: originY,
    orbitalAngle: 0,
    orbitalDistance: 0,
  };

  // 4. Primary Nodes Layout
  // Derive stable base angle from focus ID
  const hash = scene.focus.id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const baseRotation = ((hash % 12) * 30 * Math.PI) / 180;

  const primaryCount = scene.primaryNodes.length;
  const primaryAngleMap = new Map<string, number>();

  const primaryNodes: UniverseNode[] = scene.primaryNodes.map((node, index) => {
    const angle = baseRotation + (index * 2 * Math.PI) / Math.max(1, primaryCount);
    primaryAngleMap.set(node.id, angle);

    const x = originX + Math.cos(angle) * primaryRadiusX;
    const y = originY + Math.sin(angle) * primaryRadiusY;
    const dist = Math.hypot(x - originX, y - originY);

    return {
      ...node,
      x,
      y,
      orbitalAngle: angle,
      orbitalDistance: dist,
    };
  });

  // 5. Context Nodes Layout
  // Group context nodes by their parent primary neighbor
  const contextByParent = new Map<string, UniverseNode[]>();
  for (const cNode of scene.contextNodes) {
    const parentId = cNode.parentPrimaryId ?? "";
    const list = contextByParent.get(parentId) ?? [];
    list.push(cNode);
    contextByParent.set(parentId, list);
  }

  const contextNodes: UniverseNode[] = [];

  for (const [parentId, siblings] of contextByParent.entries()) {
    const parentAngle = primaryAngleMap.get(parentId) ?? baseRotation;
    const count = siblings.length;

    siblings.forEach((cNode, sibIndex) => {
      // Fan out around parent angle
      const spread = count > 1 ? (sibIndex - (count - 1) / 2) * 0.38 : 0.22;
      const angle = parentAngle + spread;

      const x = originX + Math.cos(angle) * contextRadiusX;
      const y = originY + Math.sin(angle) * contextRadiusY;
      const dist = Math.hypot(x - originX, y - originY);

      contextNodes.push({
        ...cNode,
        x,
        y,
        orbitalAngle: angle,
        orbitalDistance: dist,
      });
    });
  }

  const allNodes: UniverseNode[] = [focusNode, ...primaryNodes, ...contextNodes];

  return {
    ...scene,
    focus: focusNode,
    primaryNodes,
    contextNodes,
    allNodes,
  };
}
