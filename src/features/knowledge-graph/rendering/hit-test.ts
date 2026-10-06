import type { GraphNode, ViewportTransform } from "../types";

/**
 * Performs inverse-matrix hit testing from screen pointer coordinates
 * to graph node coordinates.
 */
export function hitTestNode(
  nodes: readonly GraphNode[],
  clientX: number,
  clientY: number,
  canvasRect: DOMRect,
  transform: ViewportTransform,
  hitRadius: number = 22
): GraphNode | null {
  const { x, y, k } = transform;
  const canvasX = clientX - canvasRect.left;
  const canvasY = clientY - canvasRect.top;

  const worldX = (canvasX - canvasRect.width / 2 - x) / k;
  const worldY = (canvasY - canvasRect.height / 2 - y) / k;

  const radiusSquared = hitRadius * hitRadius;

  for (const node of nodes) {
    if (typeof node.x !== "number" || typeof node.y !== "number") continue;
    const dx = node.x - worldX;
    const dy = node.y - worldY;
    if (dx * dx + dy * dy <= radiusSquared) {
      return node;
    }
  }

  return null;
}
