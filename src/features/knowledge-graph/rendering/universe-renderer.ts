import type { UniverseNode, UniverseScene } from "../scene/types";
import type { ViewportTransform } from "../types";
import {
  getFocusGlowSprite,
  getPrimaryGlowSprite,
  getContextGlowSprite,
  getConceptCelestialPalette,
} from "./glow-cache";

export interface UniverseRenderOptions {
  hoveredNodeId?: string | null;
  focusedNodeId?: string | null;
  isMobile?: boolean;
  skipNodeRendering?: boolean;
  skipBodyRendering?: boolean;
  skipBackgroundStars?: boolean;
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

export interface RelationshipPathGeometry {
  readonly dx: number;
  readonly dy: number;
  readonly dist: number;
  readonly cx: number;
  readonly cy: number;
  readonly termT: number;
  readonly termX: number;
  readonly termY: number;
  readonly tangentAngle: number;
}

export interface RelationshipStyleConfig {
  readonly isFocus: boolean;
  readonly isIncident: boolean;
  readonly hasActiveInteraction: boolean;
  readonly haloWidth: number;
  readonly haloAlpha: number;
  readonly coreWidth: number;
  readonly coreAlpha: number;
  readonly tickLength: number;
  readonly sparkRadius: number;
  readonly renderLabel: boolean;
}

/**
 * Calculates geometric coordinates and tangent angles for a curved relationship path.
 */
export function calculateRelationshipGeometry(
  source: { readonly x: number; readonly y: number },
  target: { readonly x: number; readonly y: number; readonly radius?: number },
  curvature: number
): RelationshipPathGeometry | null {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const dist = Math.hypot(dx, dy);
  if (
    dist < 1 ||
    !Number.isFinite(dist) ||
    !Number.isFinite(source.x) ||
    !Number.isFinite(source.y) ||
    !Number.isFinite(target.x) ||
    !Number.isFinite(target.y)
  ) {
    return null;
  }

  const nx = -dy / dist;
  const ny = dx / dist;
  const mx = (source.x + target.x) / 2;
  const my = (source.y + target.y) / 2;
  const cx = mx + nx * dist * curvature;
  const cy = my + ny * dist * curvature;

  const targetRadius = typeof target.radius === "number" ? target.radius : 18;
  const termT = Math.max(0.65, Math.min(0.89, 1 - (targetRadius + 12) / dist));

  const omt = 1 - termT;
  const termX = omt * omt * source.x + 2 * omt * termT * cx + termT * termT * target.x;
  const termY = omt * omt * source.y + 2 * omt * termT * cy + termT * termT * target.y;

  const tx = 2 * omt * (cx - source.x) + 2 * termT * (target.x - cx);
  const ty = 2 * omt * (cy - source.y) + 2 * termT * (target.y - cy);
  const tangentAngle = Math.atan2(ty, tx);

  return { dx, dy, dist, cx, cy, termT, termX, termY, tangentAngle };
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

  const interactionFactor = isIncident ? 1.35 : hasActiveInteraction ? 0.5 : 1.0;

  let baseCoreAlpha = isFocus
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

  baseCoreAlpha *= opacity;
  const coreAlpha = Math.max(
    0.08,
    Math.min(
      1.0,
      isIncident ? baseCoreAlpha * interactionFactor + 0.15 : baseCoreAlpha * interactionFactor
    )
  );

  const baseHaloAlpha = isFocus
    ? strength === "primary"
      ? 0.14
      : strength === "strong"
        ? 0.1
        : 0.06
    : isIncident
      ? 0.06
      : 0.0;
  const haloAlpha = isIncident ? baseHaloAlpha * 1.6 : baseHaloAlpha;
  const haloWidth = isFocus ? (isIncident ? 4.8 : 3.4) : 2.2;

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

  const tickLength = isFocus ? (isIncident ? 5.2 : 4.2) : isIncident ? 4.0 : 3.0;
  const sparkRadius = isFocus ? (isIncident ? 2.2 : 1.6) : 1.2;

  const renderLabel = !isMobile && (isFocus || isIncident) && dist >= 85;

  return {
    isFocus,
    isIncident,
    hasActiveInteraction,
    haloWidth,
    haloAlpha,
    coreWidth,
    coreAlpha,
    tickLength,
    sparkRadius,
    renderLabel,
  };
}

function formatHaloColor(paletteHalo: string, targetAlpha: number): string {
  return paletteHalo.replace(/[\d.]+\)$/, `${targetAlpha.toFixed(2)})`);
}

function renderDirectionalLightCue(
  ctx: CanvasRenderingContext2D,
  geom: RelationshipPathGeometry,
  style: RelationshipStyleConfig
): void {
  const { termX, termY, tangentAngle } = geom;
  const { tickLength, sparkRadius, isFocus, isIncident } = style;

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
      ? `rgba(224, 242, 254, ${isIncident ? 0.95 : 0.85})`
      : "rgba(165, 243, 252, 0.55)";
  ctx.lineWidth = isFocus ? (isIncident ? 1.3 : 1.1) : isIncident ? 1.0 : 0.8;
  ctx.stroke();

  if (sparkRadius > 0) {
    ctx.beginPath();
    ctx.arc(termX, termY, sparkRadius, 0, 2 * Math.PI);
    ctx.fillStyle =
      isFocus || isIncident
        ? `rgba(240, 249, 255, ${isIncident ? 0.95 : 0.85})`
        : "rgba(165, 243, 252, 0.55)";
    ctx.fill();
  }
}

function renderRelationshipTypeBadge(
  ctx: CanvasRenderingContext2D,
  rel: { readonly type: string },
  source: { readonly x: number; readonly y: number; readonly radius?: number },
  target: { readonly x: number; readonly y: number; readonly radius?: number },
  cx: number,
  cy: number,
  isIncident: boolean
): void {
  const t = 0.5;
  const omt = 0.5;
  const mx = omt * omt * source.x + 2 * omt * t * cx + t * t * target.x;
  const my = omt * omt * source.y + 2 * omt * t * cy + t * t * target.y;

  const sourceRad = source.radius ?? 18;
  const targetRad = target.radius ?? 18;
  const dSrc = Math.hypot(mx - source.x, my - source.y);
  const dTgt = Math.hypot(mx - target.x, my - target.y);
  if (dSrc < sourceRad + 16 || dTgt < targetRad + 16) {
    return;
  }

  const tx = 2 * omt * (cx - source.x) + 2 * t * (target.x - cx);
  const ty = 2 * omt * (cy - source.y) + 2 * t * (target.y - cy);
  const tLen = Math.hypot(tx, ty);
  if (tLen < 0.001) return;

  const nx = -ty / tLen;
  const ny = tx / tLen;

  const offsetDistance = 9;
  const bx = mx + nx * offsetDistance;
  const by = my + ny * offsetDistance;

  const label = rel.type.toLowerCase().trim();
  ctx.save();
  ctx.font = "9px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const metrics = ctx.measureText(label);
  const textWidth = metrics.width;
  const badgeW = textWidth + 8;
  const badgeH = 13;
  const radius = 3;

  ctx.beginPath();
  const left = bx - badgeW / 2;
  const top = by - badgeH / 2;
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(left, top, badgeW, badgeH, radius);
  } else if (typeof ctx.rect === "function") {
    ctx.rect(left, top, badgeW, badgeH);
  }

  ctx.fillStyle = "rgba(6, 11, 23, 0.78)";
  ctx.fill();

  ctx.strokeStyle = isIncident ? "rgba(56, 189, 248, 0.45)" : "rgba(56, 189, 248, 0.20)";
  ctx.lineWidth = 0.8;
  ctx.stroke();

  ctx.fillStyle = isIncident ? "rgba(240, 249, 255, 0.95)" : "rgba(224, 242, 254, 0.75)";
  ctx.fillText(label, bx, by + 0.5);
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
): void {
  const effectiveDpr = Math.min(
    typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
    2
  );
  const { hoveredNodeId = null, isMobile = scene.isMobile } = options;

  ctx.save();
  ctx.clearRect(0, 0, width, height);

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

  for (const rel of sortedRelationships) {
    const source = nodeMap.get(rel.sourceId);
    const target = nodeMap.get(rel.targetId);
    if (!source || !target) continue;

    const geom = calculateRelationshipGeometry(source, target, rel.curvature);
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
      dist: geom.dist,
    });

    const sourcePalette = getConceptCelestialPalette(source.concept.id);
    const targetPalette = getConceptCelestialPalette(target.concept.id);

    ctx.save();

    // Pass 1: Atmospheric luminous halo
    if (style.haloAlpha > 0.01) {
      if (typeof ctx.createLinearGradient === "function") {
        const grad = ctx.createLinearGradient(source.x, source.y, target.x, target.y);
        grad.addColorStop(0, formatHaloColor(sourcePalette.halo, style.haloAlpha));
        grad.addColorStop(1, formatHaloColor(targetPalette.halo, style.haloAlpha));
        ctx.strokeStyle = grad;
      } else {
        ctx.strokeStyle = formatHaloColor(targetPalette.halo, style.haloAlpha);
      }

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.quadraticCurveTo(geom.cx, geom.cy, target.x, target.y);
      ctx.lineWidth = style.haloWidth;
      ctx.stroke();
    }

    // Pass 2: Fine, crisp luminous core trajectory
    ctx.beginPath();
    ctx.moveTo(source.x, source.y);
    ctx.quadraticCurveTo(geom.cx, geom.cy, target.x, target.y);

    if (style.isFocus || style.isIncident) {
      if (typeof ctx.createLinearGradient === "function") {
        const coreGrad = ctx.createLinearGradient(source.x, source.y, target.x, target.y);
        coreGrad.addColorStop(0, `rgba(240, 249, 255, ${style.coreAlpha.toFixed(2)})`);
        coreGrad.addColorStop(1, `rgba(224, 242, 254, ${style.coreAlpha.toFixed(2)})`);
        ctx.strokeStyle = coreGrad;
      } else {
        ctx.strokeStyle = `rgba(224, 242, 254, ${style.coreAlpha.toFixed(2)})`;
      }
    } else {
      ctx.strokeStyle = `rgba(148, 163, 184, ${style.coreAlpha.toFixed(2)})`;
    }
    ctx.lineWidth = style.coreWidth;
    ctx.stroke();

    // Pass 3: Restrained directional terminal cue (sleek light dart & micro-spark)
    renderDirectionalLightCue(ctx, geom, style);

    // Pass 4: Concise relationship type badge
    if (style.renderLabel) {
      renderRelationshipTypeBadge(ctx, rel, source, target, geom.cx, geom.cy, style.isIncident);
    }

    ctx.restore();
  }

  // 3. Render Celestial Bodies (unless delegated to hybrid DOM/SVG layer)
  if (options.skipNodeRendering) {
    ctx.restore();
    return;
  }

  // Draw order: context nodes (background) -> primary nodes (midground) -> focus node (foreground)
  const orderedNodes = [...scene.contextNodes, ...scene.primaryNodes, scene.focus];
  const skipBodies = options.skipBodyRendering ?? false;
  const focusGlow = getFocusGlowSprite();

  // When 3D bodies are rendered in WebGL behind Canvas 2D, punch out node circles
  // so relationship paths terminate cleanly at body perimeters without crossing faces.
  if (skipBodies) {
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    for (const node of orderedNodes) {
      if (typeof node.x !== "number" || typeof node.y !== "number") continue;
      const opacity = node.opacity ?? 1.0;
      if (opacity <= 0.01) continue;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
      ctx.fillStyle = "#000000";
      ctx.fill();
    }
    ctx.restore();
  }

  for (const node of orderedNodes) {
    if (typeof node.x !== "number" || typeof node.y !== "number") continue;
    const opacity = node.opacity ?? 1.0;
    if (opacity <= 0.01) continue;

    ctx.save();
    ctx.globalAlpha = opacity;

    const isHovered = hoveredNodeId === node.id;
    const isFocused = options.focusedNodeId === node.id;
    const palette = getConceptCelestialPalette(node.concept.id);

    if (isFocused) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius + 6, 0, 2 * Math.PI);
      ctx.strokeStyle = "rgba(56, 189, 248, 0.95)";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (skipBodies) {
      if (node.role === "focus" || node.role === "primary" || isHovered) {
        renderNodeLabel(
          ctx,
          node,
          isMobile,
          node.role === "focus",
          transform.k,
          horizontalBounds,
          false
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
      renderNodeLabel(ctx, node, isMobile, true, transform.k, horizontalBounds);
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
      if (!isMobile || isHovered) {
        renderNodeLabel(ctx, node, isMobile, false, transform.k, horizontalBounds);
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

      if (isHovered) {
        ctx.globalAlpha = 1.0;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 3, 0, 2 * Math.PI);
        ctx.strokeStyle = palette.primary;
        ctx.lineWidth = 1;
        ctx.stroke();

        renderNodeLabel(ctx, node, isMobile, false, transform.k, horizontalBounds);
      }
    }

    ctx.restore();
  }

  ctx.restore();
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
  hideAtLowZoom = true
): void {
  if (!isFocus && hideAtLowZoom && zoomK < 0.6) return;

  const fontSize = isFocus ? (isMobile ? 14 : 16) : isMobile ? 11 : 12;
  const fontWeight = isFocus ? "600" : "500";
  ctx.font = `${fontWeight} ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

  ctx.fillStyle = isFocus ? "#f8fafc" : "rgba(226, 232, 240, 0.92)";
  ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 1;

  let labelX = node.x;
  let labelY = node.y;
  let alignment: LabelAlignment = "center";
  let baseline: CanvasTextBaseline = "middle";

  if (isFocus) {
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
