import { type UniverseNode, type UniverseScene } from "./types";

export interface SceneLayoutConfig {
  readonly viewportWidth?: number;
  readonly viewportHeight?: number;
  readonly isMobile?: boolean;
  readonly focalOffsetX?: number;
  readonly focalOffsetY?: number;
}

/**
 * Art-directed asymmetric slot angle templates (in degrees).
 * Designed to avoid mechanical geometric patterns:
 * - 2 neighbors avoid exact 180° opposition
 * - 3 neighbors avoid equilateral triangles
 * - 4 neighbors avoid perfect Cartesian crosses (0°, 90°, 180°, 270°)
 * - 5-6 neighbors maintain organic varied angular intervals
 */
const ASYMMETRIC_SLOT_TEMPLATES: Record<number, readonly number[]> = {
  1: [-35],
  2: [145, -25],
  3: [25, 145, 260],
  4: [25, 115, 205, 305],
  5: [15, 85, 160, 230, 305],
  6: [15, 75, 130, 190, 250, 315],
};

/**
 * Computes deterministic, art-directed 2D positions for the UniverseScene.
 *
 * Rules:
 * - Scaled to actual viewport / canvas dimensions via min(canvasWidth, canvasHeight).
 * - Focus node placed at focal origin (offset slightly left of center on desktop to balance panel).
 * - Primary direct neighbors arranged using asymmetric slot templates rather than mechanical radial divisions.
 * - Context nodes arranged on a distant outer ring continuing the parent primary node's trajectory.
 * - Strictly deterministic, zero physics simulation, zero NaN/infinite coordinates.
 */
export function layoutLocalUniverseScene(
  scene: UniverseScene,
  config: SceneLayoutConfig = {}
): UniverseScene {
  const isMobile = config.isMobile ?? scene.isMobile;

  // 1. Dimensions and responsive scaling
  const viewportWidth = config.viewportWidth ?? (isMobile ? 375 : 1280);
  const viewportHeight = config.viewportHeight ?? (isMobile ? 812 : 800);
  const minDim = Math.min(viewportWidth, viewportHeight);

  // Derive composition scale from available dimensions (55-75% canvas utilization)
  const scaleFactor = isMobile
    ? Math.max(0.85, Math.min(1.25, minDim / 375))
    : Math.max(0.8, Math.min(1.35, minDim / 800));

  // 2. Focal Origin
  const defaultOffsetX = isMobile ? 0 : -100;
  const defaultOffsetY = isMobile ? -30 : 0;
  const originX = config.focalOffsetX ?? defaultOffsetX;
  const originY = config.focalOffsetY ?? defaultOffsetY;

  // 3. Orbital Radii responsive to dimensions
  const basePrimaryX = isMobile ? 135 : 220;
  const basePrimaryY = isMobile ? 120 : 190;
  const primaryRadiusX = Math.round(basePrimaryX * scaleFactor);
  const primaryRadiusY = Math.round(basePrimaryY * scaleFactor);

  const baseContextX = isMobile ? 220 : 345;
  const baseContextY = isMobile ? 195 : 310;
  const contextRadiusX = Math.round(baseContextX * scaleFactor);
  const contextRadiusY = Math.round(baseContextY * scaleFactor);

  // 4. Focus Node Layout
  const focusNode: UniverseNode = {
    ...scene.focus,
    x: originX,
    y: originY,
    orbitalAngle: 0,
    orbitalDistance: 0,
  };

  // 5. Primary Nodes Layout using Art-Directed Asymmetric Slots
  const primaryCount = scene.primaryNodes.length;
  const slotTemplate = ASYMMETRIC_SLOT_TEMPLATES[primaryCount] ?? [];

  // Deterministic subtle base rotation from focus ID (varied by up to +/- 15 deg)
  const hash = scene.focus.id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const baseRotation = (((hash % 8) - 4) * 5 * Math.PI) / 180;

  const primaryAngleMap = new Map<string, number>();

  const primaryNodes: UniverseNode[] = scene.primaryNodes.map((node, index) => {
    let rawAngleDeg: number;
    if (index < slotTemplate.length) {
      rawAngleDeg = slotTemplate[index]!;
    } else {
      rawAngleDeg = (index * 360) / Math.max(1, primaryCount);
    }

    const angle = baseRotation + (rawAngleDeg * Math.PI) / 180;
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

  // 6. Context Nodes Layout: Continue outward from parent primary node
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
      // Fan out naturally along the constellation direction
      const spread = count > 1 ? (sibIndex - (count - 1) / 2) * 0.32 : 0.18;
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
