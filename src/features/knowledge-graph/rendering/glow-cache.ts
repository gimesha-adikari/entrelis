/**
 * Performance-friendly cached offscreen glow sprites.
 *
 * Avoids creating expensive multi-pass blurs or radial gradients per-frame
 * by stamping pre-rendered offscreen canvases with drawImage.
 */

interface GlowSprite {
  canvas: HTMLCanvasElement;
  size: number;
}

let focusSprite: GlowSprite | null = null;
let primarySprite: GlowSprite | null = null;
let contextSprite: GlowSprite | null = null;

function createOffscreenCanvas(size: number): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    return canvas;
  } catch {
    return null;
  }
}

export function getFocusGlowSprite(): GlowSprite | null {
  if (focusSprite) return focusSprite;
  const size = 160;
  const canvas = createOffscreenCanvas(size);
  if (!canvas) return null;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const center = size / 2;
  const grad = ctx.createRadialGradient(center, center, 4, center, center, center);
  grad.addColorStop(0, "rgba(165, 243, 252, 0.65)");
  grad.addColorStop(0.25, "rgba(129, 140, 248, 0.35)");
  grad.addColorStop(0.55, "rgba(99, 102, 241, 0.12)");
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(center, center, center, 0, Math.PI * 2);
  ctx.fill();

  focusSprite = { canvas, size };
  return focusSprite;
}

export function getPrimaryGlowSprite(): GlowSprite | null {
  if (primarySprite) return primarySprite;
  const size = 100;
  const canvas = createOffscreenCanvas(size);
  if (!canvas) return null;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const center = size / 2;
  const grad = ctx.createRadialGradient(center, center, 2, center, center, center);
  grad.addColorStop(0, "rgba(129, 140, 248, 0.5)");
  grad.addColorStop(0.35, "rgba(99, 102, 241, 0.2)");
  grad.addColorStop(0.7, "rgba(67, 56, 202, 0.06)");
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(center, center, center, 0, Math.PI * 2);
  ctx.fill();

  primarySprite = { canvas, size };
  return primarySprite;
}

export function getContextGlowSprite(): GlowSprite | null {
  if (contextSprite) return contextSprite;
  const size = 60;
  const canvas = createOffscreenCanvas(size);
  if (!canvas) return null;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const center = size / 2;
  const grad = ctx.createRadialGradient(center, center, 1, center, center, center);
  grad.addColorStop(0, "rgba(148, 163, 184, 0.3)");
  grad.addColorStop(0.5, "rgba(100, 116, 139, 0.08)");
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(center, center, center, 0, Math.PI * 2);
  ctx.fill();

  contextSprite = { canvas, size };
  return contextSprite;
}
