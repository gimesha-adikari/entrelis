import type { UniverseNode, UniverseScene } from "../scene/types";
import type { ViewportTransform, GraphNode } from "../types";

/**
 * Performs inverse-matrix hit testing from screen pointer coordinates
 * to nodes present strictly in the active UniverseScene.
 *
 * Requirements:
 * - Operates ONLY on the active UniverseScene.
 * - Nodes not in the visible scene cannot be hit-tested.
 * - Provides comfortable hit area (radius + padding, min 24px) for desktop clicks and mobile taps.
 * - Respects hierarchy: focus first, then primary, then context.
 */
export function hitTestUniverseNode(
  scene: UniverseScene,
  clientX: number,
  clientY: number,
  canvasRect: DOMRect,
  transform: ViewportTransform
): UniverseNode | null {
  const { x, y, k } = transform;
  if (!k || k <= 0) return null;

  const canvasX = clientX - canvasRect.left;
  const canvasY = clientY - canvasRect.top;

  const worldX = (canvasX - canvasRect.width / 2 - x) / k;
  const worldY = (canvasY - canvasRect.height / 2 - y) / k;

  // Search hierarchy: focus, then primary, then context
  const orderedNodes = [scene.focus, ...scene.primaryNodes, ...scene.contextNodes];

  for (const node of orderedNodes) {
    if (typeof node.x !== "number" || typeof node.y !== "number") continue;
    // Generous hit target: node.radius + 12, minimum 24px
    const effectiveHitRadius = Math.max(node.radius + 12, 24);
    const dx = node.x - worldX;
    const dy = node.y - worldY;

    if (dx * dx + dy * dy <= effectiveHitRadius * effectiveHitRadius) {
      return node;
    }
  }

  return null;
}

/**
 * Backwards compatibility helper for existing legacy tests if needed.
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
