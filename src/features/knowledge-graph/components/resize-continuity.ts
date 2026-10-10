import type { ViewportTransform } from "../types";

/**
 * Compensates for a right-docked panel changing the canvas center while preserving the visible
 * world positions. A resize from the left edge changes only canvas width; pan and zoom history stay.
 */
export function preserveViewportPositionOnCanvasResize(
  transform: ViewportTransform,
  previousWidth: number,
  nextWidth: number
): ViewportTransform {
  if (!Number.isFinite(previousWidth) || !Number.isFinite(nextWidth)) return transform;

  const widthChange = previousWidth - nextWidth;
  if (Math.abs(widthChange) < 1) return transform;

  return {
    ...transform,
    x: transform.x + widthChange / 2,
  };
}
