import { type UniverseNode, type UniverseScene } from "./types";

export interface SceneLayoutConfig {
  readonly viewportWidth?: number;
  readonly viewportHeight?: number;
  readonly isMobile?: boolean;
  readonly focalOffsetX?: number;
  readonly focalOffsetY?: number;
  readonly knowledgeFieldWidth?: number;
}

/**
 * Computes an adaptive, art-directed screen-space focal offset for desktop views.
 * Takes into account available celestial sky, connected celestial bodies, safety buffers,
 * and knowledge field contour position so the celestial universe stays gracefully framed.
 */
export function computeAdaptiveFocalOffset({
  viewportWidth,
  viewportHeight,
  fieldWidth,
  primaryCount,
  hasContextNodes,
}: {
  viewportWidth: number;
  viewportHeight: number;
  fieldWidth: number;
  primaryCount: number;
  hasContextNodes: boolean;
}): { offsetX: number; offsetY: number } {
  // Available open sky width to the left of the knowledge field
  const availableSkyWidth = Math.max(300, viewportWidth - fieldWidth);
  const effectiveDim = Math.min(availableSkyWidth, viewportHeight);
  const scaleFactor = Math.max(0.68, Math.min(1.35, effectiveDim / 800));

  // Determine radial footprint of celestial cluster
  const primaryRadiusX = Math.round(220 * scaleFactor);
  const contextRadiusX = Math.round(345 * scaleFactor);
  const clusterRadiusX = hasContextNodes
    ? contextRadiusX + 32
    : primaryCount > 0
    ? primaryRadiusX + 28
    : 45;

  const skyCenterScreenX = availableSkyWidth / 2;
  const nominalOffsetX = Math.round(skyCenterScreenX - viewportWidth / 2);

  // Clearance limits to ensure celestial bodies do not clip into left window border or right knowledge contour
  const rightSafetyBuffer = 52;
  const leftSafetyBuffer = 60;

  const maxAllowedOffset = Math.round(viewportWidth / 2 - fieldWidth - clusterRadiusX - rightSafetyBuffer);
  const minAllowedOffset = Math.round(leftSafetyBuffer + clusterRadiusX - viewportWidth / 2);

  let adaptiveOffsetX: number;
  if (maxAllowedOffset < minAllowedOffset) {
    adaptiveOffsetX = Math.round((maxAllowedOffset + minAllowedOffset) / 2);
  } else {
    adaptiveOffsetX = Math.max(minAllowedOffset, Math.min(maxAllowedOffset, nominalOffsetX));
  }

  return { offsetX: adaptiveOffsetX, offsetY: 0 };
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
  // On desktop with knowledge field present, derive scale from the open sky area
  const availableSkyWidth = !isMobile && config.knowledgeFieldWidth !== undefined
    ? Math.max(300, viewportWidth - config.knowledgeFieldWidth)
    : viewportWidth;
  const effectiveDim = !isMobile && config.knowledgeFieldWidth !== undefined
    ? Math.min(availableSkyWidth, viewportHeight)
    : minDim;

  const scaleFactor = isMobile
    ? Math.max(0.85, Math.min(1.25, minDim / 375))
    : Math.max(0.68, Math.min(1.35, effectiveDim / 800));

  // 2. Focal Origin
  let originX: number;
  let originY: number;

  const defaultMobileOffsetY = Math.round(
    -130 * Math.max(0.65, Math.min(1.0, viewportHeight / 844))
  );

  if (config.focalOffsetX !== undefined) {
    originX = config.focalOffsetX;
    originY = config.focalOffsetY ?? (isMobile ? defaultMobileOffsetY : 0);
  } else if (!isMobile && config.knowledgeFieldWidth !== undefined) {
    const adaptive = computeAdaptiveFocalOffset({
      viewportWidth,
      viewportHeight,
      fieldWidth: config.knowledgeFieldWidth,
      primaryCount: scene.primaryNodes.length,
      hasContextNodes: scene.contextNodes.length > 0,
    });
    originX = adaptive.offsetX;
    originY = config.focalOffsetY ?? adaptive.offsetY;
  } else {
    originX = isMobile ? 0 : -100;
    originY = config.focalOffsetY ?? (isMobile ? defaultMobileOffsetY : 0);
  }

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
    z: 12,
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
      z: 6,
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
        z: 0,
        orbitalAngle: angle,
        orbitalDistance: dist,
      });
    });
  }

  const rawNodes: UniverseNode[] = [focusNode, ...primaryNodes, ...contextNodes];
  const allNodes = resolveCollisionFreeLabels(rawNodes, {
    viewportWidth,
    viewportHeight,
    isMobile,
  });

  const nodeMap = new Map(allNodes.map((n) => [n.id, n]));
  const resolvedFocus = nodeMap.get(focusNode.id) ?? focusNode;
  const resolvedPrimaryNodes = primaryNodes.map((n) => nodeMap.get(n.id) ?? n);
  const resolvedContextNodes = contextNodes.map((n) => nodeMap.get(n.id) ?? n);

  return {
    ...scene,
    focus: resolvedFocus,
    primaryNodes: resolvedPrimaryNodes,
    contextNodes: resolvedContextNodes,
    allNodes,
  };
}

interface CandidatePlacement {
  readonly offsetX: number;
  readonly offsetY: number;
  readonly alignment: "left" | "center" | "right";
  readonly baseline: CanvasTextBaseline;
  readonly score: number;
}

function getCandidatePlacements(node: UniverseNode, isMobile: boolean): CandidatePlacement[] {
  const isFocus = node.role === "focus";
  const gap = isMobile ? 8 : 10;
  const r = node.radius;

  if (isFocus) {
    return [
      { offsetX: 0, offsetY: r + gap, alignment: "center", baseline: "top", score: 0 },
      { offsetX: 0, offsetY: -(r + gap), alignment: "center", baseline: "bottom", score: 5 },
      { offsetX: r + gap, offsetY: 0, alignment: "left", baseline: "middle", score: 10 },
      { offsetX: -(r + gap), offsetY: 0, alignment: "right", baseline: "middle", score: 10 },
    ];
  }

  const angle = node.orbitalAngle ?? 0;
  const normAngle = Math.atan2(Math.sin(angle), Math.cos(angle));
  const diag = Math.round((r + gap) * 0.707);

  // Sector canonical primary choice (score 0)
  let canonical: CandidatePlacement;
  if (normAngle >= -Math.PI / 4 && normAngle <= Math.PI / 4) {
    canonical = { offsetX: r + gap, offsetY: 0, alignment: "left", baseline: "middle", score: 0 };
  } else if (normAngle > Math.PI / 4 && normAngle < (3 * Math.PI) / 4) {
    canonical = { offsetX: 0, offsetY: r + gap, alignment: "center", baseline: "top", score: 0 };
  } else if (normAngle < -Math.PI / 4 && normAngle > -(3 * Math.PI) / 4) {
    canonical = { offsetX: 0, offsetY: -(r + gap), alignment: "center", baseline: "bottom", score: 0 };
  } else {
    canonical = { offsetX: -(r + gap), offsetY: 0, alignment: "right", baseline: "middle", score: 0 };
  }

  return [
    canonical,
    { offsetX: 0, offsetY: r + gap, alignment: "center", baseline: "top", score: 2 },
    { offsetX: 0, offsetY: -(r + gap), alignment: "center", baseline: "bottom", score: 3 },
    { offsetX: r + gap, offsetY: 0, alignment: "left", baseline: "middle", score: 4 },
    { offsetX: -(r + gap), offsetY: 0, alignment: "right", baseline: "middle", score: 4 },
    { offsetX: diag, offsetY: diag, alignment: "left", baseline: "top", score: 6 },
    { offsetX: -diag, offsetY: diag, alignment: "right", baseline: "top", score: 6 },
    { offsetX: diag, offsetY: -diag, alignment: "left", baseline: "bottom", score: 7 },
    { offsetX: -diag, offsetY: -diag, alignment: "right", baseline: "bottom", score: 7 },
  ];
}

/**
 * Resolves collision-free, screen-bounded label placements for all nodes in the scene.
 * Prioritizes focus node legibility, avoids mutual label overlap and celestial body occlusion,
 * and preserves outward sector legibility.
 */
export function resolveCollisionFreeLabels(
  nodes: UniverseNode[],
  options: {
    viewportWidth: number;
    viewportHeight: number;
    isMobile: boolean;
  }
): UniverseNode[] {
  const { viewportWidth, viewportHeight, isMobile } = options;
  const margin = 8;
  const leftBound = -viewportWidth / 2 + margin;
  const rightBound = viewportWidth / 2 - margin;

  interface PlacedBox {
    readonly id: string;
    readonly left: number;
    readonly right: number;
    readonly top: number;
    readonly bottom: number;
  }

  const placedBoxes: PlacedBox[] = [];

  // On mobile, reserve top-left zone for brand masthead & controls so no label obstructs navigation
  if (isMobile) {
    const controlsWidth = 165;
    const controlsHeight = 90;
    placedBoxes.push({
      id: "ui-masthead-controls",
      left: -viewportWidth / 2,
      right: -viewportWidth / 2 + controlsWidth,
      top: -viewportHeight / 2,
      bottom: -viewportHeight / 2 + controlsHeight,
    });
  }

  // Order nodes by priority: focus first, then primary, then context
  const priorityOrder = [...nodes].sort((a, b) => {
    const roleWeight = (r: string) => (r === "focus" ? 0 : r === "primary" ? 1 : 2);
    return roleWeight(a.role) - roleWeight(b.role);
  });

  const nodeMap = new Map<string, UniverseNode>();

  for (const node of priorityOrder) {
    const isFocus = node.role === "focus";
    const fontSize = isFocus ? (isMobile ? 14 : 16) : isMobile ? 11 : 12;
    const textWidth = Math.max(1, node.name.length * fontSize * 0.58);
    const textHeight = fontSize * 1.15;
    const candidates = getCandidatePlacements(node, isMobile);

    let bestCandidate = candidates[0]!;
    let bestCost = Infinity;

    for (const cand of candidates) {
      let cost = cand.score;

      const lx = node.x + cand.offsetX;
      const ly = node.y + cand.offsetY;

      let boxLeft = lx;
      if (cand.alignment === "center") boxLeft = lx - textWidth / 2;
      else if (cand.alignment === "right") boxLeft = lx - textWidth;

      let boxTop = ly;
      if (cand.baseline === "middle") boxTop = ly - textHeight / 2;
      else if (cand.baseline === "bottom") boxTop = ly - textHeight;

      const box = {
        left: boxLeft - 3,
        right: boxLeft + textWidth + 3,
        top: boxTop - 2,
        bottom: boxTop + textHeight + 2,
      };

      // 1. Screen horizontal boundary penalty
      if (box.left < leftBound) cost += (leftBound - box.left) * 100 + 5000;
      if (box.right > rightBound) cost += (box.right - rightBound) * 100 + 5000;

      // 2. Overlap with already placed label boxes
      for (const placed of placedBoxes) {
        const xOver = Math.max(0, Math.min(box.right, placed.right) - Math.max(box.left, placed.left));
        const yOver = Math.max(0, Math.min(box.bottom, placed.bottom) - Math.max(box.top, placed.top));
        if (xOver > 0 && yOver > 0) {
          cost += xOver * yOver * 1000 + 20000;
        }
      }

      // 3. Overlap with celestial body spheres (other nodes)
      for (const other of nodes) {
        if (other.id === node.id) continue;
        const closestX = Math.max(box.left, Math.min(other.x, box.right));
        const closestY = Math.max(box.top, Math.min(other.y, box.bottom));
        const dist = Math.hypot(other.x - closestX, other.y - closestY);
        if (dist < other.radius + 4) {
          cost += (other.radius + 4 - dist) * 500 + 10000;
        }
      }

      if (cost < bestCost) {
        bestCost = cost;
        bestCandidate = cand;
      }
    }

    const lx = node.x + bestCandidate.offsetX;
    const ly = node.y + bestCandidate.offsetY;
    let boxLeft = lx;
    if (bestCandidate.alignment === "center") boxLeft = lx - textWidth / 2;
    else if (bestCandidate.alignment === "right") boxLeft = lx - textWidth;
    let boxTop = ly;
    if (bestCandidate.baseline === "middle") boxTop = ly - textHeight / 2;
    else if (bestCandidate.baseline === "bottom") boxTop = ly - textHeight;

    placedBoxes.push({
      id: node.id,
      left: boxLeft - 3,
      right: boxLeft + textWidth + 3,
      top: boxTop - 2,
      bottom: boxTop + textHeight + 2,
    });

    nodeMap.set(node.id, {
      ...node,
      labelOffsetX: bestCandidate.offsetX,
      labelOffsetY: bestCandidate.offsetY,
      labelAlignment: bestCandidate.alignment,
      labelBaseline: bestCandidate.baseline,
      labelFontSize: fontSize,
    });
  }

  return nodes.map((node) => nodeMap.get(node.id) ?? node);
}
