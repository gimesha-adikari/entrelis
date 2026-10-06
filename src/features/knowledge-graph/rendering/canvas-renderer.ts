import type { GraphData, GraphNode, ViewportTransform, CanvasRenderOptions } from "../types";

/**
 * Renders the Entrelis knowledge graph onto a high-DPI HTML5 2D Canvas.
 *
 * Implements:
 * - SOURCE --TYPE--> TARGET directional edge arrows with trigonometric clearance.
 * - Glowing luminous halo for selected concept node.
 * - Highlighting of 1st-degree neighbors.
 * - Substantial fading of unrelated nodes to preserve larger network context.
 * - Responsive label suppression to avoid visual clutter.
 */
const FIXED_STARS: ReadonlyArray<{ x: number; y: number; r: number; alpha: number }> = [
  { x: -350, y: -280, r: 1.2, alpha: 0.08 },
  { x: 280, y: -320, r: 0.8, alpha: 0.06 },
  { x: -180, y: 340, r: 1.0, alpha: 0.07 },
  { x: 390, y: 220, r: 1.4, alpha: 0.09 },
  { x: -450, y: 120, r: 0.9, alpha: 0.05 },
  { x: 120, y: -420, r: 1.1, alpha: 0.08 },
  { x: -220, y: -160, r: 0.7, alpha: 0.04 },
  { x: 310, y: -140, r: 1.0, alpha: 0.06 },
  { x: -120, y: 210, r: 0.8, alpha: 0.05 },
  { x: 230, y: 380, r: 1.2, alpha: 0.07 },
  { x: -400, y: -380, r: 0.9, alpha: 0.05 },
  { x: 420, y: -260, r: 1.3, alpha: 0.08 },
  { x: -290, y: 190, r: 0.8, alpha: 0.06 },
  { x: 160, y: 160, r: 0.7, alpha: 0.04 },
  { x: -80, y: -360, r: 1.1, alpha: 0.07 },
  { x: 340, y: 70, r: 0.8, alpha: 0.05 },
  { x: -330, y: 390, r: 1.0, alpha: 0.06 },
  { x: 470, y: 320, r: 0.9, alpha: 0.05 },
  { x: -160, y: -440, r: 1.2, alpha: 0.07 },
  { x: 260, y: -210, r: 0.8, alpha: 0.06 },
];

export function renderGraphCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  transform: ViewportTransform,
  data: GraphData,
  options: CanvasRenderOptions
): void {
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const { selectedNodeId, hoveredNodeId, neighborIds, isMobile = false } = options;

  ctx.save();
  ctx.clearRect(0, 0, width, height);

  // Apply pan/zoom camera transform
  ctx.translate(width / 2 + transform.x * dpr, height / 2 + transform.y * dpr);
  ctx.scale(transform.k * dpr, transform.k * dpr);

  // Subtle deterministic atmospheric celestial points in world coordinates
  ctx.save();
  for (const star of FIXED_STARS) {
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, 2 * Math.PI);
    ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
    ctx.fill();
  }
  ctx.restore();

  // 1. Draw Links / Edges
  for (const link of data.links) {
    const source = link.source as GraphNode;
    const target = link.target as GraphNode;
    if (typeof source.x !== "number" || typeof source.y !== "number") continue;
    if (typeof target.x !== "number" || typeof target.y !== "number") continue;

    const isConnected =
      Boolean(selectedNodeId) && (source.id === selectedNodeId || target.id === selectedNodeId);
    const isDimmed = Boolean(selectedNodeId) && !isConnected;

    ctx.beginPath();
    ctx.moveTo(source.x, source.y);
    ctx.lineTo(target.x, target.y);

    if (isConnected) {
      const isPrimary = link.strength === "primary";
      ctx.strokeStyle = isPrimary ? "rgba(129, 140, 248, 0.75)" : "rgba(125, 211, 252, 0.55)";
      ctx.lineWidth = isPrimary ? 1.5 : 1.2;
      ctx.globalAlpha = 1;
    } else if (isDimmed) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 0.8;
      ctx.globalAlpha = 0.12;
    } else {
      ctx.strokeStyle =
        link.strength === "primary" ? "rgba(129, 140, 248, 0.35)" : "rgba(255, 255, 255, 0.12)";
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5;
    }
    ctx.stroke();

    // Directional Arrow strictly on SOURCE --TYPE--> TARGET
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const angle = Math.atan2(dy, dx);
    const targetRadius = (target.id === selectedNodeId ? 22 : 13) + 2;
    const arrowX = target.x - Math.cos(angle) * targetRadius;
    const arrowY = target.y - Math.sin(angle) * targetRadius;
    const arrowLength = 6.5;

    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(
      arrowX - arrowLength * Math.cos(angle - Math.PI / 7),
      arrowY - arrowLength * Math.sin(angle - Math.PI / 7)
    );
    ctx.lineTo(
      arrowX - arrowLength * Math.cos(angle + Math.PI / 7),
      arrowY - arrowLength * Math.sin(angle + Math.PI / 7)
    );
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
  }

  // 2. Draw Concept Nodes
  for (const node of data.nodes) {
    if (typeof node.x !== "number" || typeof node.y !== "number") continue;

    const isSelected = node.id === selectedNodeId;
    const isNeighbor = neighborIds.has(node.id);
    const isHovered = node.id === hoveredNodeId;
    const isDimmed = Boolean(selectedNodeId) && !isSelected && !isNeighbor;

    // Determine if connected via a primary relationship to selected concept
    const isPrimaryNeighbor =
      isNeighbor &&
      data.links.some(
        (l) =>
          ((typeof l.source === "object" ? l.source.id : l.source) === selectedNodeId &&
            (typeof l.target === "object" ? l.target.id : l.target) === node.id &&
            l.strength === "primary") ||
          ((typeof l.source === "object" ? l.source.id : l.source) === node.id &&
            (typeof l.target === "object" ? l.target.id : l.target) === selectedNodeId &&
            l.strength === "primary")
      );

    ctx.globalAlpha = isDimmed ? 0.18 : 1.0;

    const radius = isSelected
      ? isMobile
        ? 20
        : 22
      : isHovered
        ? 15
        : isPrimaryNeighbor
          ? 14
          : isNeighbor
            ? 12
            : 10;

    // Luminous soft halo for selected concept
    if (isSelected) {
      ctx.save();
      ctx.shadowColor = "rgba(56, 189, 248, 0.4)";
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + 2, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(56, 189, 248, 0.15)";
      ctx.fill();
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);

    if (isSelected) {
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = "#38bdf8";
    } else if (isPrimaryNeighbor) {
      // Restrained violet for primary neighbors
      ctx.fillStyle = "#818cf8";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(167, 139, 250, 0.85)";
    } else if (isNeighbor) {
      // Desaturated cool blue for secondary neighbors
      ctx.fillStyle = "#7dd3fc";
      ctx.fill();
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = "rgba(56, 189, 248, 0.6)";
    } else if (isDimmed) {
      // Distant concepts receding into darkness
      ctx.fillStyle = "#1e293b";
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    } else {
      ctx.fillStyle = "#64748b";
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(203, 213, 225, 0.4)";
    }
    ctx.stroke();

    // 3. Selective Labels
    const shouldDrawLabel = isSelected || isNeighbor || (!selectedNodeId && !isMobile);

    if (shouldDrawLabel && !isDimmed) {
      ctx.font = isSelected
        ? "600 13px system-ui, -apple-system, sans-serif"
        : "500 11px system-ui, -apple-system, sans-serif";
      ctx.fillStyle = isSelected
        ? "#ffffff"
        : isPrimaryNeighbor
          ? "#c7d2fe"
          : isNeighbor
            ? "#bae6fd"
            : "#94a3b8";
      ctx.textAlign = "center";
      ctx.fillText(node.name, node.x, node.y + radius + 14);
    }
  }

  ctx.restore();
}
