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
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 1;
    } else if (isDimmed) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.15;
    } else {
      ctx.strokeStyle =
        link.strength === "primary" ? "rgba(96, 165, 250, 0.4)" : "rgba(255, 255, 255, 0.18)";
      ctx.lineWidth = link.strength === "primary" ? 2 : 1;
      ctx.globalAlpha = 0.6;
    }
    ctx.stroke();

    // Directional Arrow strictly on SOURCE --TYPE--> TARGET
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const angle = Math.atan2(dy, dx);
    const targetRadius = (target.id === selectedNodeId ? 18 : 12) + 2;
    const arrowX = target.x - Math.cos(angle) * targetRadius;
    const arrowY = target.y - Math.sin(angle) * targetRadius;
    const arrowLength = 7;

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

    ctx.globalAlpha = isDimmed ? 0.22 : 1.0;

    const radius = isSelected ? 18 : isHovered ? 15 : isNeighbor ? 13 : 11;

    // Glowing atmospheric halo for selected concept
    if (isSelected) {
      ctx.save();
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 22;
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = "#38bdf8";
      ctx.fill();
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);

    if (isSelected) {
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#0284c7";
    } else if (isNeighbor) {
      ctx.fillStyle = "#93c5fd";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#38bdf8";
    } else if (isDimmed) {
      ctx.fillStyle = "rgba(51, 65, 85, 0.4)";
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    } else {
      ctx.fillStyle = "#60a5fa";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#bfdbfe";
    }
    ctx.stroke();

    // 3. Selective Labels
    const shouldDrawLabel = isSelected || isNeighbor || (!selectedNodeId && !isMobile);

    if (shouldDrawLabel && !isDimmed) {
      ctx.font = isSelected
        ? "bold 13px system-ui, -apple-system, sans-serif"
        : "12px system-ui, -apple-system, sans-serif";
      ctx.fillStyle = isSelected ? "#f8fafc" : isNeighbor ? "#e2e8f0" : "#cbd5e1";
      ctx.textAlign = "center";
      ctx.fillText(node.name, node.x, node.y + radius + 14);
    }
  }

  ctx.restore();
}
