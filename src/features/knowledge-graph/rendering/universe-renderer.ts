import type { UniverseNode, UniverseScene } from "../scene/types";
import type { ViewportTransform } from "../types";
import {
  calculateRelationshipGeometry,
  getRelationshipBoundaryRadius,
  quadraticPointAt,
  quadraticTangentAt,
  screenPixelsToWorldUnits,
  type RelationshipPathGeometry,
} from "./relationship-path";
export { calculateRelationshipGeometry } from "./relationship-path";
import {
  getFocusGlowSprite,
  getPrimaryGlowSprite,
  getContextGlowSprite,
  getConceptCelestialPalette,
} from "./glow-cache";

import {
  activatePendingRelationshipPulse,
  isPendingRelationshipPulseActive,
  sampleRelationshipPulse,
  type PendingRelationshipPulse,
  type RelationshipPulse,
} from "./relationship-pulse";
import type { ForegroundRingOcclusion } from "../celestial-3d/ring-occlusion";

export interface UniverseRenderOptions {
  pulse?: RelationshipPulse | null;
  pendingPulse?: PendingRelationshipPulse | null;
  reducedMotion?: boolean;
  hidden?: boolean;
  now?: number;
  foregroundRingOcclusions?: readonly ForegroundRingOcclusion[];
  /** Holds only the incident paths whose WebGL endpoint body is still preparing. */
  unreadyRelationshipNodeIds?: ReadonlySet<string>;
  /** Prevents an endpoint cutout while its matching WebGL body is still preparing. */
  bodyNotReadyNodeIds?: ReadonlySet<string>;
  hoveredNodeId?: string | null;
  focusedNodeId?: string | null;
  isMobile?: boolean;
  skipNodeRendering?: boolean;
  skipBodyRendering?: boolean;
  skipBackgroundStars?: boolean;
}

export interface UniverseRenderResult {
  /** Relationship paths that were actually stroked during this Canvas pass. */
  readonly visibleRelationshipIds: ReadonlySet<string>;
  /** A pending pulse activated on the first frame where its safe path was drawable. */
  readonly activatedPulse?: RelationshipPulse;
}

interface StarPoint {
  readonly u: number;
  readonly v: number;
  readonly r: number;
  readonly alpha: number;
}

interface HorizontalWorldBounds {
  readonly left: number;
  readonly right: number;
}

type LabelAlignment = "center" | "left" | "right";

/**
 * Deterministically generates star positions using a stable pseudo-random LCG.
 * Screen-space coordinates (u, v in [0, 1]) scale to any canvas size.
 */
function generateDeterministicStars(count: number, seed: number): readonly StarPoint[] {
  let s = seed;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };

  const stars: StarPoint[] = [];
  for (let i = 0; i < count; i++) {
    const u = rnd();
    const v = rnd();
    const isBright = rnd() < 0.08;
    const r = isBright ? 1.2 + rnd() * 0.5 : 0.6 + rnd() * 0.6;
    const alpha = isBright ? 0.45 + rnd() * 0.35 : 0.06 + rnd() * 0.16;
    stars.push({ u, v, r, alpha });
  }
  return stars;
}

const DESKTOP_STARS = generateDeterministicStars(110, 42);
const MOBILE_STARS = generateDeterministicStars(50, 42);

export interface RelationshipStyleConfig {
  readonly isFocus: boolean;
  readonly isIncident: boolean;
  readonly hasActiveInteraction: boolean;
  readonly haloWidth: number;
  readonly haloAlpha: number;
  readonly coreWidth: number;
  readonly coreAlpha: number;
  readonly cueAlpha: number;
  readonly opacity: number;
  readonly tickLength: number;
  readonly sparkRadius: number;
  readonly renderLabel: boolean;
}

interface RelationshipOverlay {
  readonly relationship: UniverseScene["relationships"][number];
  readonly sourceEndpoint: UniverseNode;
  readonly targetEndpoint: UniverseNode;
  readonly geometry: RelationshipPathGeometry;
  readonly style: RelationshipStyleConfig;
}

/**
 * Computes stroke hierarchy, halo, and label flags based on relationship role, strength, and interaction state.
 */
export function getRelationshipStyleConfig(options: {
  readonly role: "focus-connection" | "context-connection";
  readonly strength: "primary" | "strong" | "supporting";
  readonly opacity: number;
  readonly isIncident: boolean;
  readonly hasActiveInteraction: boolean;
  readonly isMobile: boolean;
  readonly dist: number;
}): RelationshipStyleConfig {
  const { role, strength, opacity, isIncident, hasActiveInteraction, isMobile, dist } = options;
  const isFocus = role === "focus-connection";

  const clampedOpacity = Math.max(0, Math.min(1, Number.isFinite(opacity) ? opacity : 1));

  const interactionFactor = isIncident ? 1.35 : hasActiveInteraction ? 0.5 : 1.0;

  const baseCoreAlpha = isFocus
    ? strength === "primary"
      ? 0.82
      : strength === "strong"
        ? 0.7
        : 0.58
    : strength === "primary"
      ? 0.38
      : strength === "strong"
        ? 0.28
        : 0.2;

  const maxCoreAlpha = isIncident
    ? Math.min(1.0, baseCoreAlpha * interactionFactor + 0.15)
    : baseCoreAlpha * interactionFactor;
  const coreAlpha = Math.max(0, Math.min(1.0, maxCoreAlpha * clampedOpacity));

  const baseHaloAlpha = isFocus
    ? strength === "primary"
      ? 0.07
      : strength === "strong"
        ? 0.055
        : 0.04
    : isIncident
      ? 0.06
      : 0.0;
  const fullHaloAlpha = isIncident ? baseHaloAlpha * 1.6 : baseHaloAlpha;
  const haloAlpha = Math.max(0, Math.min(1.0, fullHaloAlpha * clampedOpacity));
  const haloWidth = isFocus ? (isIncident ? 7 : 6) : 4;

  const coreWidth = isFocus
    ? isIncident
      ? 1.4
      : strength === "primary"
        ? 1.2
        : 0.95
    : isIncident
      ? 1.1
      : strength === "primary"
        ? 0.85
        : 0.7;

  const baseCueAlpha = isFocus || isIncident ? (isIncident ? 0.68 : 0.5) : 0.3;
  const cueAlpha = Math.max(0, Math.min(1.0, baseCueAlpha * clampedOpacity));

  const tickLength = isFocus ? (isIncident ? 3.6 : 2.8) : 2.4;
  const sparkRadius = isFocus ? (isIncident ? 0.8 : 0.6) : 0.45;

  const renderLabel = !isMobile && (isFocus || isIncident) && dist >= 85 && clampedOpacity >= 0.25;

  return {
    isFocus,
    isIncident,
    hasActiveInteraction,
    haloWidth,
    haloAlpha,
    coreWidth,
    coreAlpha,
    cueAlpha,
    opacity: clampedOpacity,
    tickLength,
    sparkRadius,
    renderLabel,
  };
}

function restrainedFilamentColor(paletteHalo: string, alpha: number): string {
  const channels = paletteHalo
    .match(/[\d.]+/g)
    ?.slice(0, 3)
    .map(Number) ?? [210, 230, 248];
  const base = [210, 230, 248];
  const color = base.map((channel, index) =>
    Math.round(channel * 0.9 + (channels[index] ?? channel) * 0.1)
  );
  return `rgba(${color.join(",")},${alpha.toFixed(3)})`;
}

function renderDirectionalLightCue(
  ctx: CanvasRenderingContext2D,
  geom: RelationshipPathGeometry,
  style: RelationshipStyleConfig,
  zoomK: number
): void {
  const cue = geom.cue;
  if (!cue || style.cueAlpha <= 0.01) return;

  const { x: termX, y: termY } = cue.point;
  const { angle: tangentAngle } = cue;
  const { isFocus, isIncident, cueAlpha } = style;
  const tickLength = screenPixelsToWorldUnits(style.tickLength, zoomK);
  const sparkRadius = screenPixelsToWorldUnits(style.sparkRadius, zoomK);
  if (tickLength === null || sparkRadius === null) return;

  const wingAngle = 0.4;
  const leftX = termX - Math.cos(tangentAngle - wingAngle) * tickLength;
  const leftY = termY - Math.sin(tangentAngle - wingAngle) * tickLength;
  const rightX = termX - Math.cos(tangentAngle + wingAngle) * tickLength;
  const rightY = termY - Math.sin(tangentAngle + wingAngle) * tickLength;

  ctx.beginPath();
  ctx.moveTo(leftX, leftY);
  ctx.lineTo(termX, termY);
  ctx.lineTo(rightX, rightY);

  ctx.strokeStyle =
    isFocus || isIncident
      ? `rgba(224, 242, 254, ${cueAlpha.toFixed(2)})`
      : `rgba(165, 243, 252, ${cueAlpha.toFixed(2)})`;
  const cueWidth = isFocus ? (isIncident ? 1.3 : 1.1) : isIncident ? 1.0 : 0.8;
  ctx.lineWidth = screenPixelsToWorldUnits(cueWidth, zoomK) ?? 0;
  ctx.stroke();

  if (sparkRadius > 0) {
    ctx.beginPath();
    ctx.arc(termX, termY, sparkRadius, 0, 2 * Math.PI);
    ctx.fillStyle =
      isFocus || isIncident
        ? `rgba(240, 249, 255, ${cueAlpha.toFixed(2)})`
        : `rgba(165, 243, 252, ${cueAlpha.toFixed(2)})`;
    ctx.fill();
  }
}

function renderRelationshipTypeBadge(
  ctx: CanvasRenderingContext2D,
  rel: { readonly type: string },
  source: { readonly x: number; readonly y: number; readonly radius: number },
  target: { readonly x: number; readonly y: number; readonly radius: number },
  geom: RelationshipPathGeometry,
  style: RelationshipStyleConfig,
  zoomK: number,
  allNodes: readonly UniverseNode[],
  webglBodies: boolean
): void {
  if (!style.renderLabel || style.opacity <= 0.01) return;
  const midpoint = quadraticPointAt(geom.path, 0.5);
  const tangent = quadraticTangentAt(geom.path, 0.5);
  const length = Math.hypot(tangent.x, tangent.y);
  if (length < 0.001) return;
  const bx = midpoint.x - ((tangent.y / length) * 9) / zoomK;
  const by = midpoint.y + ((tangent.x / length) * 9) / zoomK;
  ctx.save();
  ctx.font = `${9 / zoomK}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const label = rel.type.toLowerCase().trim();
  const width = ctx.measureText(label).width + 12 / zoomK;
  const height = 13 / zoomK;
  const collides = (x: number, y: number, radius: number) => {
    const nearestX = Math.max(bx - width / 2, Math.min(x, bx + width / 2));
    const nearestY = Math.max(by - height / 2, Math.min(y, by + height / 2));
    return Math.hypot(x - nearestX, y - nearestY) < radius + 5 / zoomK;
  };
  if (
    geom.visibleLength < width + 28 / zoomK ||
    collides(source.x, source.y, source.radius) ||
    collides(target.x, target.y, target.radius) ||
    allNodes.some((node) => {
      const radius = getRelationshipBoundaryRadius(node.radius, zoomK, webglBodies);
      return node.opacity > 0.01 && radius !== null && collides(node.x, node.y, radius);
    })
  ) {
    ctx.restore();
    return;
  }
  const scrim = ctx.createLinearGradient(bx - width / 2, by, bx + width / 2, by);
  scrim.addColorStop(0, "rgba(3,8,18,0)");
  scrim.addColorStop(0.25, `rgba(3,8,18,${0.7 * style.opacity})`);
  scrim.addColorStop(0.75, `rgba(3,8,18,${0.7 * style.opacity})`);
  scrim.addColorStop(1, "rgba(3,8,18,0)");
  ctx.fillStyle = scrim;
  ctx.fillRect(bx - width / 2, by - height / 2, width, height);
  ctx.fillStyle = `rgba(190,213,232,${(0.78 * style.opacity).toFixed(3)})`;
  ctx.fillText(label, bx, by + 0.5 / zoomK);
  ctx.restore();
}

/**
 * Draws the local universe scene onto an HTML5 Canvas.
 *
 * Invariants & Visual Design:
 * - Operates strictly on bounded UniverseScene nodes and relationships.
 * - Screen-space static celestial backdrop: stars stay in deep space during pan/zoom.
 * - Multi-layer celestial body hierarchy:
 *   - Focus: 30-38px radius, large atmospheric bloom, partial orbital arcs, spherical gradient, bright offset core.
 *   - Primary: 16-22px radius, deterministic accent palette (cyan, indigo, violet, amber, etc.), core highlight.
 *   - Context: Soft tinted celestial bodies, quiet presence, no gray placeholder appearance.
 * - Curved paths with luminous target sparks and directional chevrons (no clunky triangle arrowheads).
 * - Sector-based directional typography.
 * - Single-pass drawing: zero permanent animation loop during idle.
 */
export function renderUniverseScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  transform: ViewportTransform,
  scene: UniverseScene,
  options: UniverseRenderOptions = {}
): UniverseRenderResult {
  const visibleRelationshipIds = new Set<string>();
  let activatedPulse: RelationshipPulse | undefined;
  const reportedDpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const effectiveDpr =
    Number.isFinite(reportedDpr) && reportedDpr > 0 ? Math.min(reportedDpr, 2) : 1;
  const { hoveredNodeId = null, isMobile = scene.isMobile } = options;
  const clearWidth = Number.isFinite(width) ? Math.max(0, width) : 0;
  const clearHeight = Number.isFinite(height) ? Math.max(0, height) : 0;

  ctx.save();
  ctx.clearRect(0, 0, clearWidth, clearHeight);
  if (
    clearWidth <= 0 ||
    clearHeight <= 0 ||
    !Number.isFinite(transform.k) ||
    transform.k <= 0 ||
    !Number.isFinite(transform.x) ||
    !Number.isFinite(transform.y)
  ) {
    ctx.restore();
    return { visibleRelationshipIds, activatedPulse };
  }

  // 1. Static Screen-Space Celestial Atmosphere (Deep Space)
  // Drawn BEFORE camera translate/scale so stars remain stationary in deep space during interaction
  if (!options.skipBackgroundStars) {
    const stars = isMobile ? MOBILE_STARS : DESKTOP_STARS;
    ctx.save();
    for (const star of stars) {
      const sx = star.u * width;
      const sy = star.v * height;
      ctx.beginPath();
      ctx.arc(sx, sy, star.r, 0, 2 * Math.PI);
      ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
      ctx.fill();
    }
    ctx.restore();
  }

  // Apply pan/zoom camera transform to world space
  ctx.translate(width / 2 + transform.x * effectiveDpr, height / 2 + transform.y * effectiveDpr);
  ctx.scale(transform.k * effectiveDpr, transform.k * effectiveDpr);
  const horizontalBounds = getHorizontalWorldBounds(width, transform, effectiveDpr);

  // Node lookup map for fast relationship endpoint resolution
  const nodeMap = new Map<string, UniverseNode>();
  for (const node of scene.allNodes) {
    nodeMap.set(node.id, node);
  }

  // 2. Render Refined Relationship Light Paths
  const activeHighlightNodeId = hoveredNodeId || options.focusedNodeId || null;
  const hasActiveInteraction = Boolean(activeHighlightNodeId);
  const skipBodies = options.skipBodyRendering ?? false;

  // Partition/sort relationships: background context connections first,
  // focus connections second, incident connections last (on top).
  const sortedRelationships = [...scene.relationships].sort((a, b) => {
    const aIncident = activeHighlightNodeId
      ? a.sourceId === activeHighlightNodeId || a.targetId === activeHighlightNodeId
      : false;
    const bIncident = activeHighlightNodeId
      ? b.sourceId === activeHighlightNodeId || b.targetId === activeHighlightNodeId
      : false;
    if (aIncident !== bIncident) {
      return aIncident ? 1 : -1;
    }
    const aFocus = a.role === "focus-connection";
    const bFocus = b.role === "focus-connection";
    if (aFocus !== bFocus) {
      return aFocus ? 1 : -1;
    }
    return 0;
  });

  const relationshipOverlays: RelationshipOverlay[] = [];
  for (const rel of sortedRelationships) {
    if (typeof rel.opacity === "number" && rel.opacity <= 0.001) {
      continue;
    }
    if (
      options.unreadyRelationshipNodeIds?.has(rel.sourceId) ||
      options.unreadyRelationshipNodeIds?.has(rel.targetId)
    ) {
      continue;
    }

    const source = nodeMap.get(rel.sourceId);
    const target = nodeMap.get(rel.targetId);
    if (!source || !target) continue;

    // The production orthographic camera maps one world unit to one CSS pixel.
    // Its WebGL sphere radius remains `node.radius` at every zoom, while this
    // Canvas path is scaled by `transform.k`; convert only the WebGL boundary.
    const sourceBoundaryRadius = getRelationshipBoundaryRadius(
      source.radius,
      transform.k,
      skipBodies
    );
    const targetBoundaryRadius = getRelationshipBoundaryRadius(
      target.radius,
      transform.k,
      skipBodies
    );
    if (sourceBoundaryRadius === null || targetBoundaryRadius === null) continue;
    const sourceEndpoint = { ...source, radius: sourceBoundaryRadius };
    const targetEndpoint = { ...target, radius: targetBoundaryRadius };

    const geom = calculateRelationshipGeometry(
      sourceEndpoint,
      targetEndpoint,
      rel.curvature,
      transform.k
    );
    if (!geom) continue;

    const isIncident = Boolean(
      activeHighlightNodeId &&
      (rel.sourceId === activeHighlightNodeId || rel.targetId === activeHighlightNodeId)
    );

    const style = getRelationshipStyleConfig({
      role: rel.role,
      strength: rel.strength,
      opacity: rel.opacity,
      isIncident,
      hasActiveInteraction,
      isMobile,
      dist: geom.visibleLength * transform.k,
    });

    if (style.coreAlpha <= 0.005) {
      continue;
    }

    const sourcePalette = getConceptCelestialPalette(source.concept.id);
    const targetPalette = getConceptCelestialPalette(target.concept.id);
    const haloWidth = screenPixelsToWorldUnits(style.haloWidth, transform.k);
    const coreWidth = screenPixelsToWorldUnits(style.coreWidth, transform.k);
    if (haloWidth === null || coreWidth === null) continue;

    if (
      !activatedPulse &&
      options.pendingPulse?.relationshipId === rel.id &&
      isPendingRelationshipPulseActive(
        options.pendingPulse,
        options.now ?? 0,
        options.reducedMotion,
        options.hidden
      )
    ) {
      activatedPulse =
        activatePendingRelationshipPulse(
          options.pendingPulse,
          new Set([rel.id]),
          options.now ?? 0,
          options.reducedMotion,
          options.hidden
        ) ?? undefined;
    }

    ctx.save();

    // One clipped current path, stroked with restrained diffuse layers and a fine core.
    ctx.beginPath();
    ctx.moveTo(geom.path.start.x, geom.path.start.y);
    ctx.quadraticCurveTo(
      geom.path.control.x,
      geom.path.control.y,
      geom.path.end.x,
      geom.path.end.y
    );
    ctx.lineCap = "round";
    const colorGradient = (alpha: number) => {
      if (typeof ctx.createLinearGradient !== "function") return `rgba(215,235,250,${alpha})`;
      const gradient = ctx.createLinearGradient(
        geom.path.start.x,
        geom.path.start.y,
        geom.path.end.x,
        geom.path.end.y
      );
      const inset = Math.min(0.18, 8 / Math.max(1, geom.visibleLength * transform.k));
      gradient.addColorStop(0, restrainedFilamentColor(sourcePalette.halo, alpha * 0.5));
      gradient.addColorStop(inset, restrainedFilamentColor(sourcePalette.halo, alpha));
      gradient.addColorStop(1 - inset, restrainedFilamentColor(targetPalette.halo, alpha));
      gradient.addColorStop(1, restrainedFilamentColor(targetPalette.halo, alpha * 0.5));
      return gradient;
    };
    if (style.haloAlpha > 0.01) {
      ctx.strokeStyle = colorGradient(style.haloAlpha * 0.4);
      ctx.lineWidth = haloWidth;
      ctx.stroke();
      ctx.strokeStyle = colorGradient(style.haloAlpha * 0.65);
      ctx.lineWidth = haloWidth * 0.62;
      ctx.stroke();
      ctx.strokeStyle = colorGradient(style.haloAlpha);
      ctx.lineWidth = haloWidth * 0.38;
      ctx.stroke();
    }
    ctx.strokeStyle = colorGradient(style.coreAlpha);
    ctx.lineWidth = coreWidth;
    ctx.stroke();
    visibleRelationshipIds.add(rel.id);

    const energy = sampleRelationshipPulse(
      activatedPulse ?? options.pulse ?? null,
      rel,
      geom,
      options.now ?? 0
    );
    if (energy && energy.alpha > 0) {
      const tailT = Math.max(0, energy.progress - 9 / (geom.visibleLength * transform.k));
      const tail = quadraticPointAt(geom.path, tailT);
      ctx.beginPath();
      ctx.moveTo(tail.x, tail.y);
      for (let step = 1; step <= 4; step++) {
        const point = quadraticPointAt(geom.path, tailT + ((energy.progress - tailT) * step) / 4);
        ctx.lineTo(point.x, point.y);
      }
      const light = ctx.createLinearGradient(tail.x, tail.y, energy.point.x, energy.point.y);
      light.addColorStop(0, "rgba(220,240,255,0)");
      light.addColorStop(1, `rgba(235,247,255,${energy.alpha * 0.85})`);
      ctx.strokeStyle = light;
      ctx.lineWidth = screenPixelsToWorldUnits(3.2, transform.k) ?? 0;
      ctx.globalAlpha = 0.22;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineWidth = screenPixelsToWorldUnits(1.4, transform.k) ?? 0;
      ctx.stroke();
    }

    relationshipOverlays.push({
      relationship: rel,
      sourceEndpoint,
      targetEndpoint,
      geometry: geom,
      style,
    });
    ctx.restore();
  }

  // Punch foreground ring pixels out of the luminous strands and traveling pulse first.
  // Directional cues and labels are redrawn above this mask for readable semantics.
  if (skipBodies) {
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    for (const mask of options.foregroundRingOcclusions ?? []) {
      ctx.globalAlpha = mask.opacity;
      if (mask.image) {
        ctx.drawImage(
          mask.image,
          (mask.x - transform.x) / transform.k,
          (mask.y - transform.y) / transform.k,
          mask.size / transform.k,
          mask.size / transform.k
        );
      } else if (mask.path) {
        ctx.save();
        ctx.translate(mask.x, mask.y);
        ctx.scale(mask.size, mask.size);
        ctx.fillStyle = "#ffffff";
        ctx.fill(mask.path);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  for (const overlay of relationshipOverlays) {
    ctx.save();
    renderDirectionalLightCue(ctx, overlay.geometry, overlay.style, transform.k);
    if (overlay.style.renderLabel) {
      renderRelationshipTypeBadge(
        ctx,
        overlay.relationship,
        overlay.sourceEndpoint,
        overlay.targetEndpoint,
        overlay.geometry,
        overlay.style,
        transform.k,
        scene.allNodes,
        skipBodies
      );
    }
    ctx.restore();
  }

  // Node-only suppression is used by geometry probes that intentionally leave bodies out.
  if (options.skipNodeRendering) {
    ctx.restore();
    return { visibleRelationshipIds, activatedPulse };
  }

  // Draw order: context nodes (background) -> primary nodes (midground) -> focus node (foreground)
  const orderedNodes = [...scene.contextNodes, ...scene.primaryNodes, scene.focus];
  const focusGlow = getFocusGlowSprite();

  // Solid projected spheres remain in front of every Canvas relationship layer.
  if (skipBodies) {
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.globalAlpha = 1;
    for (const node of orderedNodes) {
      if (options.bodyNotReadyNodeIds?.has(node.id)) continue;
      if (typeof node.x !== "number" || typeof node.y !== "number") continue;
      const opacity = node.opacity ?? 1.0;
      if (opacity <= 0.001) continue;
      const bodyRadius = getRelationshipBoundaryRadius(node.radius, transform.k, true);
      if (bodyRadius === null) continue;
      ctx.beginPath();
      ctx.arc(node.x, node.y, bodyRadius, 0, 2 * Math.PI);
      ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
      ctx.fill();
    }
    ctx.restore();
  }

  // 3. Render Celestial Bodies (unless delegated to hybrid DOM/SVG layer)
  for (const node of orderedNodes) {
    if (typeof node.x !== "number" || typeof node.y !== "number") continue;
    const opacity = node.opacity ?? 1.0;
    if (opacity <= 0.01) continue;

    ctx.save();
    ctx.globalAlpha = opacity;

    const isHovered = hoveredNodeId === node.id;
    const isFocused = options.focusedNodeId === node.id;
    const isHighlighted = isHovered || isFocused;
    const palette = getConceptCelestialPalette(node.concept.id);

    if (isFocused) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius + 6, 0, 2 * Math.PI);
      ctx.strokeStyle = "rgba(56, 189, 248, 0.95)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (skipBodies) {
      if (node.role === "focus" || node.role === "primary" || isHighlighted) {
        renderNodeLabel(
          ctx,
          node,
          isMobile,
          node.role === "focus",
          transform.k,
          horizontalBounds,
          !isHighlighted,
          isHighlighted
        );
      }
      ctx.restore();
      continue;
    }

    if (node.role === "focus") {
      // --- FOCUS CELESTIAL BODY ---
      // 1. Soft atmospheric corona bloom
      if (focusGlow) {
        ctx.drawImage(
          focusGlow.canvas,
          node.x - focusGlow.size / 2,
          node.y - focusGlow.size / 2,
          focusGlow.size,
          focusGlow.size
        );
      }

      // 2. Subtle partial orbital arcs (organic celestial orientation)
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius * 1.5, -0.4, 1.2);
      ctx.strokeStyle = "rgba(165, 243, 252, 0.28)";
      ctx.lineWidth = 0.8;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius * 1.5, 2.3, 3.9);
      ctx.strokeStyle = "rgba(165, 243, 252, 0.22)";
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // 3. Faint secondary rim
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius + 2, 0, 2 * Math.PI);
      ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
      ctx.lineWidth = 0.75;
      ctx.stroke();

      // 4. Spherical celestial body gradient
      const bodyGrad = ctx.createRadialGradient(
        node.x - node.radius * 0.3,
        node.y - node.radius * 0.3,
        2,
        node.x,
        node.y,
        node.radius
      );
      bodyGrad.addColorStop(0, "#e0f2fe");
      bodyGrad.addColorStop(0.28, "#38bdf8");
      bodyGrad.addColorStop(0.65, "#1e3a8a");
      bodyGrad.addColorStop(1, "#090d1a");

      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
      ctx.fillStyle = bodyGrad;
      ctx.fill();

      // 5. Bright offset highlight core
      ctx.beginPath();
      ctx.arc(
        node.x - node.radius * 0.28,
        node.y - node.radius * 0.28,
        node.radius * 0.22,
        0,
        2 * Math.PI
      );
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      // 6. Label
      renderNodeLabel(
        ctx,
        node,
        isMobile,
        true,
        transform.k,
        horizontalBounds,
        false,
        isHighlighted
      );
    } else if (node.role === "primary") {
      // --- PRIMARY NEIGHBOR BODY ---
      // 1. Accent-tinted halo
      const primaryGlow = getPrimaryGlowSprite(palette.name);
      if (primaryGlow) {
        ctx.drawImage(
          primaryGlow.canvas,
          node.x - primaryGlow.size / 2,
          node.y - primaryGlow.size / 2,
          primaryGlow.size,
          primaryGlow.size
        );
      }

      // 2. Spherical celestial body gradient with deterministic concept accent
      const bodyGrad = ctx.createRadialGradient(
        node.x - node.radius * 0.28,
        node.y - node.radius * 0.28,
        1,
        node.x,
        node.y,
        node.radius
      );
      bodyGrad.addColorStop(0, "#ffffff");
      bodyGrad.addColorStop(0.25, palette.primary);
      bodyGrad.addColorStop(0.68, palette.secondary);
      bodyGrad.addColorStop(1, palette.deep);

      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
      ctx.fillStyle = bodyGrad;
      ctx.fill();

      // 3. Offset highlight core
      ctx.beginPath();
      ctx.arc(
        node.x - node.radius * 0.24,
        node.y - node.radius * 0.24,
        node.radius * 0.2,
        0,
        2 * Math.PI
      );
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      // 4. Subtle rim stroke
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius + 1, 0, 2 * Math.PI);
      ctx.strokeStyle = palette.halo;
      ctx.lineWidth = 0.75;
      ctx.stroke();

      // 5. Hover aura
      if (isHovered) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 4, 0, 2 * Math.PI);
        ctx.strokeStyle = palette.primary;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // 6. Label
      if (!isMobile || isHighlighted) {
        renderNodeLabel(
          ctx,
          node,
          isMobile,
          false,
          transform.k,
          horizontalBounds,
          !isHighlighted,
          isHighlighted
        );
      }
    } else {
      // --- CONTEXT CELESTIAL BODY ---
      // Distant tinted body (never a flat gray placeholder dot)
      const contextGlow = getContextGlowSprite(palette.name);
      if (contextGlow) {
        ctx.drawImage(
          contextGlow.canvas,
          node.x - contextGlow.size / 2,
          node.y - contextGlow.size / 2,
          contextGlow.size,
          contextGlow.size
        );
      }

      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
      ctx.fillStyle = palette.secondary;
      ctx.globalAlpha = opacity * 0.65;
      ctx.fill();

      // Subtle luminous center
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius * 0.28, 0, 2 * Math.PI);
      ctx.fillStyle = "#e2e8f0";
      ctx.fill();

      if (isHighlighted) {
        ctx.globalAlpha = 1.0;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 3, 0, 2 * Math.PI);
        ctx.strokeStyle = palette.primary;
        ctx.lineWidth = 1;
        ctx.stroke();

        renderNodeLabel(ctx, node, isMobile, false, transform.k, horizontalBounds, false, true);
      }
    }

    ctx.restore();
  }

  ctx.restore();
  return { visibleRelationshipIds, activatedPulse };
}

/**
 * Renders readable, editorial typography with sector-based directional offsets.
 */
function renderNodeLabel(
  ctx: CanvasRenderingContext2D,
  node: UniverseNode,
  isMobile: boolean,
  isFocus: boolean,
  zoomK: number,
  horizontalBounds: HorizontalWorldBounds,
  hideAtLowZoom = true,
  isHighlighted = false
): void {
  if (!isFocus && !isHighlighted && hideAtLowZoom && zoomK < 0.6) return;

  const hasSmoothLabel =
    typeof node.labelOffsetX === "number" && typeof node.labelOffsetY === "number";

  const fontSize =
    hasSmoothLabel && typeof node.labelFontSize === "number"
      ? Math.round(node.labelFontSize)
      : isFocus
        ? isMobile
          ? 14
          : 16
        : isMobile
          ? 11
          : 12;
  const fontWeight = isFocus || isHighlighted ? "600" : "500";
  ctx.font = `${fontWeight} ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

  ctx.fillStyle = isFocus ? "#f8fafc" : isHighlighted ? "#ffffff" : "rgba(226, 232, 240, 0.92)";
  ctx.shadowColor = isHighlighted ? "rgba(56, 189, 248, 0.65)" : "rgba(0, 0, 0, 0.9)";
  ctx.shadowBlur = isHighlighted ? 8 : 6;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 1;

  let labelX = node.x;
  let labelY = node.y;
  let alignment: LabelAlignment = "center";
  let baseline: CanvasTextBaseline = "middle";

  if (hasSmoothLabel) {
    labelX = node.x + (node.labelOffsetX ?? 0);
    labelY = node.y + (node.labelOffsetY ?? 0);
    alignment = (node.labelAlignment as LabelAlignment) ?? (isFocus ? "center" : "left");
    baseline = node.labelBaseline ?? (isFocus ? "top" : "middle");
  } else if (isFocus) {
    baseline = "top";
    labelY = node.y + node.radius + (isMobile ? 8 : 12);
  } else {
    // Sector-based directional offset so labels don't bunch mechanically beneath bodies
    const angle = node.orbitalAngle ?? 0;
    const normAngle = Math.atan2(Math.sin(angle), Math.cos(angle));

    if (normAngle >= -Math.PI / 4 && normAngle <= Math.PI / 4) {
      // Right sector: label to the right
      alignment = "left";
      labelX = node.x + node.radius + 8;
    } else if (normAngle > Math.PI / 4 && normAngle < (3 * Math.PI) / 4) {
      // Bottom sector: label below
      baseline = "top";
      labelY = node.y + node.radius + 8;
    } else if (normAngle < -Math.PI / 4 && normAngle > -(3 * Math.PI) / 4) {
      // Top sector: label above
      baseline = "bottom";
      labelY = node.y - node.radius - 8;
    } else {
      // Left sector: label to the left
      alignment = "right";
      labelX = node.x - node.radius - 8;
    }
  }

  const placement = fitLabelWithinHorizontalBounds(
    ctx,
    node,
    labelX,
    alignment,
    zoomK,
    horizontalBounds
  );
  ctx.textAlign = placement.alignment;
  ctx.textBaseline = baseline;
  ctx.fillText(node.name, placement.x, labelY);

  ctx.shadowBlur = 0;
}

function getHorizontalWorldBounds(
  width: number,
  transform: ViewportTransform,
  effectiveDpr: number
): HorizontalWorldBounds {
  const scale = transform.k * effectiveDpr;
  const cameraOffset = width / 2 + transform.x * effectiveDpr;
  return {
    left: -cameraOffset / scale,
    right: (width - cameraOffset) / scale,
  };
}

function fitLabelWithinHorizontalBounds(
  ctx: CanvasRenderingContext2D,
  node: UniverseNode,
  x: number,
  alignment: LabelAlignment,
  zoomK: number,
  bounds: HorizontalWorldBounds
): { readonly x: number; readonly alignment: LabelAlignment } {
  if (node.x < bounds.left || node.x > bounds.right) return { x, alignment };

  const textWidth = ctx.measureText(node.name).width;
  const margin = 6 / Math.max(zoomK, 0.01);
  const left = bounds.left + margin;
  const right = bounds.right - margin;

  if (alignment === "left" && x + textWidth > right) {
    const oppositeX = node.x - node.radius - 8;
    if (oppositeX - textWidth >= left) return { x: oppositeX, alignment: "right" };
  } else if (alignment === "right" && x - textWidth < left) {
    const oppositeX = node.x + node.radius + 8;
    if (oppositeX + textWidth <= right) return { x: oppositeX, alignment: "left" };
  }

  const minimumX =
    alignment === "left" ? left : alignment === "right" ? left + textWidth : left + textWidth / 2;
  const maximumX =
    alignment === "left"
      ? right - textWidth
      : alignment === "right"
        ? right
        : right - textWidth / 2;
  if (minimumX <= maximumX) return { x: Math.max(minimumX, Math.min(x, maximumX)), alignment };

  return { x: (left + right) / 2, alignment: "center" };
}
