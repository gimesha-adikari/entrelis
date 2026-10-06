import type { UniverseNode, UniverseScene } from "../scene/types";
import type { ViewportTransform } from "../types";
import { getFocusGlowSprite, getPrimaryGlowSprite, getContextGlowSprite } from "./glow-cache";

export interface UniverseRenderOptions {
  hoveredNodeId?: string | null;
  isMobile?: boolean;
}

const STATIC_STARS: ReadonlyArray<{ x: number; y: number; r: number; alpha: number }> = [
  { x: -450, y: -320, r: 1.1, alpha: 0.12 },
  { x: 380, y: -380, r: 0.8, alpha: 0.08 },
  { x: -220, y: 360, r: 1.0, alpha: 0.09 },
  { x: 420, y: 260, r: 1.3, alpha: 0.1 },
  { x: -520, y: 140, r: 0.7, alpha: 0.06 },
  { x: 180, y: -440, r: 1.2, alpha: 0.11 },
  { x: -310, y: -190, r: 0.8, alpha: 0.07 },
  { x: 340, y: -180, r: 0.9, alpha: 0.08 },
  { x: -160, y: 240, r: 0.7, alpha: 0.06 },
  { x: 260, y: 410, r: 1.1, alpha: 0.09 },
  { x: -420, y: -420, r: 0.9, alpha: 0.07 },
  { x: 490, y: -290, r: 1.2, alpha: 0.1 },
  { x: -360, y: 220, r: 0.8, alpha: 0.08 },
  { x: 190, y: 190, r: 0.7, alpha: 0.05 },
  { x: -90, y: -390, r: 1.0, alpha: 0.09 },
  { x: 390, y: 90, r: 0.8, alpha: 0.07 },
  { x: -380, y: 440, r: 1.1, alpha: 0.08 },
  { x: 510, y: 350, r: 0.9, alpha: 0.07 },
  { x: -190, y: -480, r: 1.3, alpha: 0.1 },
  { x: 290, y: -240, r: 0.8, alpha: 0.08 },
];

/**
 * Draws the local universe scene onto an HTML5 Canvas.
 *
 * Requirements:
 * - Operates strictly on the bounded UniverseScene (focus, primaries, context).
 * - Multi-layer celestial body styling (corona, halo, spherical gradient, core, orbital ring).
 * - Curved quadratic Bézier relationship paths maintaining SOURCE --TYPE--> TARGET invariant.
 * - Performance-friendly cached glow sprites.
 * - Effective DPR capped to Math.min(window.devicePixelRatio, 2) to eliminate waste.
 * - Single-pass drawing: zero permanent animation loop while idle.
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

  // Apply pan/zoom camera transform
  ctx.translate(width / 2 + transform.x * effectiveDpr, height / 2 + transform.y * effectiveDpr);
  ctx.scale(transform.k * effectiveDpr, transform.k * effectiveDpr);

  // 1. Celestial background atmosphere
  ctx.save();
  for (const star of STATIC_STARS) {
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, 2 * Math.PI);
    ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
    ctx.fill();
  }
  ctx.restore();

  // Create node lookup map for relationship path endpoints
  const nodeMap = new Map<string, UniverseNode>();
  for (const node of scene.allNodes) {
    nodeMap.set(node.id, node);
  }

  // 2. Render Relationship Paths (Curved Quadratic Bézier)
  for (const rel of scene.relationships) {
    const source = nodeMap.get(rel.sourceId);
    const target = nodeMap.get(rel.targetId);
    if (!source || !target) continue;

    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) continue;

    // Normal vector perpendicular to chord
    const nx = -dy / dist;
    const ny = dx / dist;

    // Midpoint displaced by curvature
    const mx = (source.x + target.x) / 2;
    const my = (source.y + target.y) / 2;
    const cx = mx + nx * dist * rel.curvature;
    const cy = my + ny * dist * rel.curvature;

    const isFocusRel = rel.role === "focus-connection";
    const baseOpacity = isFocusRel ? rel.opacity * 0.75 : rel.opacity * 0.35;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(source.x, source.y);
    ctx.quadraticCurveTo(cx, cy, target.x, target.y);

    ctx.strokeStyle = isFocusRel
      ? `rgba(165, 243, 252, ${baseOpacity})`
      : `rgba(148, 163, 184, ${baseOpacity})`;
    ctx.lineWidth = isFocusRel ? 1.2 : 0.8;
    ctx.stroke();

    // Directional indicator strictly on SOURCE --TYPE--> TARGET
    // Evaluate quadratic Bézier near target end (t = 0.88)
    const t = 0.88;
    const omt = 1 - t;
    const px = omt * omt * source.x + 2 * omt * t * cx + t * t * target.x;
    const py = omt * omt * source.y + 2 * omt * t * cy + t * t * target.y;

    // Tangent derivative vector
    const tx = 2 * omt * (cx - source.x) + 2 * t * (target.x - cx);
    const ty = 2 * omt * (cy - source.y) + 2 * t * (target.y - cy);
    const tangentAngle = Math.atan2(ty, tx);

    const arrowLength = isFocusRel ? 5 : 3.5;
    const arrowWidth = isFocusRel ? 3 : 2;

    ctx.fillStyle = isFocusRel
      ? `rgba(165, 243, 252, ${baseOpacity * 1.1})`
      : `rgba(148, 163, 184, ${baseOpacity})`;

    ctx.beginPath();
    ctx.moveTo(
      px + Math.cos(tangentAngle) * arrowLength,
      py + Math.sin(tangentAngle) * arrowLength
    );
    ctx.lineTo(
      px - Math.cos(tangentAngle) * arrowLength + Math.sin(tangentAngle) * arrowWidth,
      py - Math.sin(tangentAngle) * arrowLength - Math.cos(tangentAngle) * arrowWidth
    );
    ctx.lineTo(
      px - Math.cos(tangentAngle) * arrowLength - Math.sin(tangentAngle) * arrowWidth,
      py - Math.sin(tangentAngle) * arrowLength + Math.cos(tangentAngle) * arrowWidth
    );
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // 3. Render Celestial Nodes
  // Draw order: context nodes first, then primary nodes, then focus node
  const orderedNodes = [...scene.contextNodes, ...scene.primaryNodes, scene.focus];

  const focusGlow = getFocusGlowSprite();
  const primaryGlow = getPrimaryGlowSprite();
  const contextGlow = getContextGlowSprite();

  for (const node of orderedNodes) {
    if (typeof node.x !== "number" || typeof node.y !== "number") continue;
    const opacity = node.opacity ?? 1.0;
    if (opacity <= 0.01) continue;

    ctx.save();
    ctx.globalAlpha = opacity;

    const isHovered = hoveredNodeId === node.id;

    if (node.role === "focus") {
      // --- FOCUS NODE ---
      // 1. Soft atmospheric halo
      if (focusGlow) {
        ctx.drawImage(
          focusGlow.canvas,
          node.x - focusGlow.size / 2,
          node.y - focusGlow.size / 2,
          focusGlow.size,
          focusGlow.size
        );
      }

      // 2. Delicate orbital focus ring
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius * 1.6, 0, 2 * Math.PI);
      ctx.strokeStyle = "rgba(165, 243, 252, 0.4)";
      ctx.lineWidth = 0.75;
      ctx.setLineDash([4, 6]);
      ctx.stroke();
      ctx.setLineDash([]);

      // 3. Spherical body
      const bodyGrad = ctx.createRadialGradient(
        node.x - node.radius * 0.3,
        node.y - node.radius * 0.3,
        1,
        node.x,
        node.y,
        node.radius
      );
      bodyGrad.addColorStop(0, "#a5f3fc");
      bodyGrad.addColorStop(0.35, "#38bdf8");
      bodyGrad.addColorStop(0.7, "#1e3a8a");
      bodyGrad.addColorStop(1, "#0f172a");

      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
      ctx.fillStyle = bodyGrad;
      ctx.fill();

      // 4. Luminous inner core
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius * 0.28, 0, 2 * Math.PI);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      // 5. Label
      renderNodeLabel(ctx, node, isMobile, true, transform.k);
    } else if (node.role === "primary") {
      // --- PRIMARY NEIGHBOR ---
      if (primaryGlow) {
        ctx.drawImage(
          primaryGlow.canvas,
          node.x - primaryGlow.size / 2,
          node.y - primaryGlow.size / 2,
          primaryGlow.size,
          primaryGlow.size
        );
      }

      // Spherical body
      const bodyGrad = ctx.createRadialGradient(
        node.x - node.radius * 0.25,
        node.y - node.radius * 0.25,
        1,
        node.x,
        node.y,
        node.radius
      );
      bodyGrad.addColorStop(0, "#c7d2fe");
      bodyGrad.addColorStop(0.4, "#818cf8");
      bodyGrad.addColorStop(0.8, "#3730a3");
      bodyGrad.addColorStop(1, "#1e1b4b");

      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
      ctx.fillStyle = bodyGrad;
      ctx.fill();

      // Inner core
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius * 0.25, 0, 2 * Math.PI);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      // Hover aura
      if (isHovered) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 4, 0, 2 * Math.PI);
        ctx.strokeStyle = "rgba(165, 243, 252, 0.85)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Label (desktop or hovered)
      if (!isMobile || isHovered) {
        renderNodeLabel(ctx, node, isMobile, false, transform.k);
      }
    } else {
      // --- CONTEXT NODE ---
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
      ctx.fillStyle = "rgba(148, 163, 184, 0.75)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius * 0.3, 0, 2 * Math.PI);
      ctx.fillStyle = "#ffffff";
      ctx.fill();

      if (isHovered) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 3, 0, 2 * Math.PI);
        ctx.strokeStyle = "rgba(165, 243, 252, 0.7)";
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
 * Helper to render crisp, readable typography beneath celestial nodes.
 */
function renderNodeLabel(
  ctx: CanvasRenderingContext2D,
  node: UniverseNode,
  isMobile: boolean,
  isFocus: boolean,
  zoomK: number
): void {
  // Suppress small labels when zoomed out far on non-focus nodes
  if (!isFocus && zoomK < 0.65) return;

  const fontSize = isFocus ? (isMobile ? 13 : 14) : 11;
  const fontWeight = isFocus ? "600" : "500";
  ctx.font = `${fontWeight} ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  const labelY = node.y + node.radius + (isFocus ? 10 : 8);

  // Subtle dark halo backing for legibility
  ctx.fillStyle = isFocus ? "#f8fafc" : "rgba(226, 232, 240, 0.9)";
  ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 1;

  ctx.fillText(node.name, node.x, labelY);
  ctx.shadowBlur = 0;
}
