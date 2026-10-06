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
  isMobile?: boolean;
}

interface StarPoint {
  readonly u: number;
  readonly v: number;
  readonly r: number;
  readonly alpha: number;
}

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

  // Apply pan/zoom camera transform to world space
  ctx.translate(width / 2 + transform.x * effectiveDpr, height / 2 + transform.y * effectiveDpr);
  ctx.scale(transform.k * effectiveDpr, transform.k * effectiveDpr);

  // Node lookup map for fast relationship endpoint resolution
  const nodeMap = new Map<string, UniverseNode>();
  for (const node of scene.allNodes) {
    nodeMap.set(node.id, node);
  }

  // 2. Render Relationship Paths (Curved Quadratic Bézier with Luminous Direction Sparks)
  for (const rel of scene.relationships) {
    const source = nodeMap.get(rel.sourceId);
    const target = nodeMap.get(rel.targetId);
    if (!source || !target) continue;

    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) continue;

    const nx = -dy / dist;
    const ny = dx / dist;

    const mx = (source.x + target.x) / 2;
    const my = (source.y + target.y) / 2;
    const cx = mx + nx * dist * rel.curvature;
    const cy = my + ny * dist * rel.curvature;

    const isFocusRel = rel.role === "focus-connection";
    const sourcePalette = getConceptCelestialPalette(source.concept.id);
    const targetPalette = getConceptCelestialPalette(target.concept.id);

    ctx.save();

    // Pass 1: Subtle wide atmospheric glow for focus relationships (blended accents)
    if (isFocusRel) {
      if (typeof ctx.createLinearGradient === "function") {
        const grad = ctx.createLinearGradient(source.x, source.y, target.x, target.y);
        grad.addColorStop(0, sourcePalette.halo.replace("0.45", "0.14").replace("0.40", "0.12"));
        grad.addColorStop(1, targetPalette.halo.replace("0.45", "0.14").replace("0.40", "0.12"));
        ctx.strokeStyle = grad;
      } else {
        ctx.strokeStyle = targetPalette.halo.replace("0.45", "0.14").replace("0.40", "0.12");
      }

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.quadraticCurveTo(cx, cy, target.x, target.y);
      ctx.lineWidth = 3.6;
      ctx.stroke();
    }

    // Pass 2: Crisp core luminous trajectory
    ctx.beginPath();
    ctx.moveTo(source.x, source.y);
    ctx.quadraticCurveTo(cx, cy, target.x, target.y);

    if (isFocusRel) {
      ctx.strokeStyle = `rgba(224, 242, 254, ${rel.opacity * 0.78})`;
      ctx.lineWidth = 1.2;
    } else {
      ctx.strokeStyle = `rgba(148, 163, 184, ${rel.opacity * 0.32})`;
      ctx.lineWidth = 0.8;
    }
    ctx.stroke();

    // Directional indicator: Luminous spark and directional tick along curve (evaluated at t = 0.88)
    const t = 0.88;
    const omt = 1 - t;
    const px = omt * omt * source.x + 2 * omt * t * cx + t * t * target.x;
    const py = omt * omt * source.y + 2 * omt * t * cy + t * t * target.y;

    const tx = 2 * omt * (cx - source.x) + 2 * t * (target.x - cx);
    const ty = 2 * omt * (cy - source.y) + 2 * t * (target.y - cy);
    const tangentAngle = Math.atan2(ty, tx);

    // Luminous target spark
    const sparkRadius = isFocusRel ? 2.4 : 1.5;
    ctx.beginPath();
    ctx.arc(px, py, sparkRadius, 0, 2 * Math.PI);
    ctx.fillStyle = isFocusRel ? "rgba(224, 242, 254, 0.95)" : "rgba(165, 243, 252, 0.65)";
    ctx.fill();

    // Directional chevron tick
    const tickLen = isFocusRel ? 4.5 : 3.0;
    ctx.beginPath();
    ctx.moveTo(
      px - Math.cos(tangentAngle - 0.65) * tickLen,
      py - Math.sin(tangentAngle - 0.65) * tickLen
    );
    ctx.lineTo(px, py);
    ctx.lineTo(
      px - Math.cos(tangentAngle + 0.65) * tickLen,
      py - Math.sin(tangentAngle + 0.65) * tickLen
    );
    ctx.strokeStyle = isFocusRel ? "rgba(224, 242, 254, 0.90)" : "rgba(165, 243, 252, 0.60)";
    ctx.lineWidth = isFocusRel ? 1.2 : 0.8;
    ctx.stroke();

    ctx.restore();
  }

  // 3. Render Celestial Bodies
  // Draw order: context nodes (background) -> primary nodes (midground) -> focus node (foreground)
  const orderedNodes = [...scene.contextNodes, ...scene.primaryNodes, scene.focus];
  const focusGlow = getFocusGlowSprite();

  for (const node of orderedNodes) {
    if (typeof node.x !== "number" || typeof node.y !== "number") continue;
    const opacity = node.opacity ?? 1.0;
    if (opacity <= 0.01) continue;

    ctx.save();
    ctx.globalAlpha = opacity;

    const isHovered = hoveredNodeId === node.id;
    const palette = getConceptCelestialPalette(node.concept.id);

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
      renderNodeLabel(ctx, node, isMobile, true, transform.k);
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
        renderNodeLabel(ctx, node, isMobile, false, transform.k);
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

        renderNodeLabel(ctx, node, isMobile, false, transform.k);
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
  zoomK: number
): void {
  if (!isFocus && zoomK < 0.6) return;

  const fontSize = isFocus ? (isMobile ? 14 : 16) : isMobile ? 11 : 12;
  const fontWeight = isFocus ? "600" : "500";
  ctx.font = `${fontWeight} ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

  ctx.fillStyle = isFocus ? "#f8fafc" : "rgba(226, 232, 240, 0.92)";
  ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 1;

  if (isFocus) {
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(node.name, node.x, node.y + node.radius + (isMobile ? 8 : 12));
  } else {
    // Sector-based directional offset so labels don't bunch mechanically beneath bodies
    const angle = node.orbitalAngle ?? 0;
    const normAngle = Math.atan2(Math.sin(angle), Math.cos(angle));

    if (normAngle >= -Math.PI / 4 && normAngle <= Math.PI / 4) {
      // Right sector: label to the right
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(node.name, node.x + node.radius + 8, node.y);
    } else if (normAngle > Math.PI / 4 && normAngle < (3 * Math.PI) / 4) {
      // Bottom sector: label below
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(node.name, node.x, node.y + node.radius + 8);
    } else if (normAngle < -Math.PI / 4 && normAngle > -(3 * Math.PI) / 4) {
      // Top sector: label above
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(node.name, node.x, node.y - node.radius - 8);
    } else {
      // Left sector: label to the left
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(node.name, node.x - node.radius - 8, node.y);
    }
  }

  ctx.shadowBlur = 0;
}
