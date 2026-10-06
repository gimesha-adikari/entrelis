/**
 * Performance-friendly cached offscreen glow sprites for celestial rendering.
 *
 * Avoids creating expensive multi-pass blurs or radial gradients per-frame
 * by stamping pre-rendered offscreen canvases with drawImage.
 */

export interface GlowSprite {
  readonly canvas: HTMLCanvasElement;
  readonly size: number;
}

export interface CelestialPalette {
  readonly name: string;
  readonly primary: string;
  readonly secondary: string;
  readonly halo: string;
  readonly deep: string;
}

export const CELESTIAL_ACCENT_PALETTES: readonly CelestialPalette[] = [
  {
    name: "cyan",
    primary: "#38bdf8",
    secondary: "#0284c7",
    halo: "rgba(56, 189, 248, 0.45)",
    deep: "#091424",
  },
  {
    name: "indigo",
    primary: "#818cf8",
    secondary: "#4338ca",
    halo: "rgba(129, 140, 248, 0.45)",
    deep: "#0c0e24",
  },
  {
    name: "violet",
    primary: "#a78bfa",
    secondary: "#7c3aed",
    halo: "rgba(167, 139, 250, 0.45)",
    deep: "#120d26",
  },
  {
    name: "amber",
    primary: "#fbbf24",
    secondary: "#d97706",
    halo: "rgba(251, 191, 36, 0.40)",
    deep: "#1e1406",
  },
  {
    name: "emerald",
    primary: "#34d399",
    secondary: "#059669",
    halo: "rgba(52, 211, 153, 0.40)",
    deep: "#061a12",
  },
  {
    name: "rose",
    primary: "#f472b6",
    secondary: "#db2777",
    halo: "rgba(244, 114, 182, 0.40)",
    deep: "#1f0917",
  },
];

/**
 * Deterministically derives an accent palette from concept ID.
 * Stable across any focal orientation.
 */
export function getConceptCelestialPalette(conceptId: string): CelestialPalette {
  let hash = 2166136261;
  for (let i = 0; i < conceptId.length; i++) {
    hash ^= conceptId.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return CELESTIAL_ACCENT_PALETTES[hash % CELESTIAL_ACCENT_PALETTES.length]!;
}

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

let focusSprite: GlowSprite | null = null;
const primarySpriteMap = new Map<string, GlowSprite>();
const contextSpriteMap = new Map<string, GlowSprite>();

/**
 * Large atmospheric bloom corona for the selected focal concept.
 */
export function getFocusGlowSprite(): GlowSprite | null {
  if (focusSprite) return focusSprite;
  const size = 220;
  const canvas = createOffscreenCanvas(size);
  if (!canvas) return null;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const center = size / 2;
  const grad = ctx.createRadialGradient(center, center, 12, center, center, center);
  grad.addColorStop(0, "rgba(224, 242, 254, 0.60)");
  grad.addColorStop(0.18, "rgba(56, 189, 248, 0.42)");
  grad.addColorStop(0.42, "rgba(129, 140, 248, 0.20)");
  grad.addColorStop(0.75, "rgba(99, 102, 241, 0.05)");
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(center, center, center, 0, Math.PI * 2);
  ctx.fill();

  focusSprite = { canvas, size };
  return focusSprite;
}

/**
 * Accent-tinted atmospheric halo sprite for primary neighbors.
 */
export function getPrimaryGlowSprite(paletteName: string = "cyan"): GlowSprite | null {
  const existing = primarySpriteMap.get(paletteName);
  if (existing) return existing;

  const size = 130;
  const canvas = createOffscreenCanvas(size);
  if (!canvas) return null;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const palette =
    CELESTIAL_ACCENT_PALETTES.find((p) => p.name === paletteName) ?? CELESTIAL_ACCENT_PALETTES[0]!;

  const center = size / 2;
  const grad = ctx.createRadialGradient(center, center, 6, center, center, center);
  grad.addColorStop(0, palette.halo);
  grad.addColorStop(0.45, palette.halo.replace("0.45", "0.15").replace("0.40", "0.12"));
  grad.addColorStop(0.8, "rgba(10, 15, 30, 0.03)");
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(center, center, center, 0, Math.PI * 2);
  ctx.fill();

  const sprite: GlowSprite = { canvas, size };
  primarySpriteMap.set(paletteName, sprite);
  return sprite;
}

/**
 * Soft, dim tinted halo sprite for 2nd-degree context concepts.
 */
export function getContextGlowSprite(paletteName: string = "cyan"): GlowSprite | null {
  const existing = contextSpriteMap.get(paletteName);
  if (existing) return existing;

  const size = 70;
  const canvas = createOffscreenCanvas(size);
  if (!canvas) return null;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const palette =
    CELESTIAL_ACCENT_PALETTES.find((p) => p.name === paletteName) ?? CELESTIAL_ACCENT_PALETTES[0]!;

  const center = size / 2;
  const grad = ctx.createRadialGradient(center, center, 2, center, center, center);
  grad.addColorStop(0, palette.halo.replace("0.45", "0.20").replace("0.40", "0.18"));
  grad.addColorStop(0.6, "rgba(30, 41, 59, 0.04)");
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(center, center, center, 0, Math.PI * 2);
  ctx.fill();

  const sprite: GlowSprite = { canvas, size };
  contextSpriteMap.set(paletteName, sprite);
  return sprite;
}
