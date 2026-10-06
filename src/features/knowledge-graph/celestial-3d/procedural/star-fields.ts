import { createNoise3D, createCellular3D, fbm3D } from "./noise3d";

/**
 * Procedural stellar photosphere fields.
 *
 * Each star family uses a genuinely different generator (not the same recipe at a
 * different frequency):
 *
 * - Golden:     warped supergranulation network + nested granulation cells,
 *               faculae along the network and rare irregular hot regions.
 * - Blue-White: dense, low-contrast turbulent hot field with bright compressed
 *               filaments (inverted ridges) and no dark cellular outlines.
 * - Ember:      a handful of giant, heavily domain-warped convection plumes with
 *               wide dark lanes and isolated molten amber regions.
 *
 * All samplers take a point on the unit sphere and return a normalised
 * `temperature` (0 = coolest lane, 1 = hottest) plus a `hot` mask used by the
 * shader for extra HDR emphasis. Sampling in 3D avoids seams and pole pinching.
 */
export interface StarFieldSample {
  temperature: number;
  hot: number;
}

export type StarFieldSampler = (x: number, y: number, z: number, out: StarFieldSample) => void;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function smoothstep(edge0: number, edge1: number, v: number): number {
  const t = clamp01((v - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/**
 * Golden — mature solar-type star.
 * Macro: broad warped supergranulation regions with soft, darker boundaries.
 * Meso:  granulation cells inside the regions (thin warm lanes, domed centres).
 * Micro: faint supporting granulation only.
 */
export function createGoldenStarField(seed: number): StarFieldSampler {
  const warpNoise = createNoise3D(seed + 11);
  const macroNoise = createNoise3D(seed + 23);
  const detailNoise = createNoise3D(seed + 37);
  const hotNoise = createNoise3D(seed + 51);
  const macroCells = createCellular3D(seed + 5);
  const mesoCells = createCellular3D(seed + 7);

  return (x, y, z, out) => {
    // Gentle large-scale fluid warp so no cell network looks like a Voronoi mosaic
    const wx = fbm3D(warpNoise, x * 1.6, y * 1.6, z * 1.6, 3);
    const wy = fbm3D(warpNoise, x * 1.6 + 5.2, y * 1.6 + 1.3, z * 1.6 + 2.8, 3);
    const wz = fbm3D(warpNoise, x * 1.6 + 9.7, y * 1.6 + 4.1, z * 1.6 + 7.3, 3);
    const qx = x + wx * 0.24;
    const qy = y + wy * 0.24;
    const qz = z + wz * 0.24;

    // Macro supergranulation network
    const macro = macroCells(qx * 2.4, qy * 2.4, qz * 2.4);
    const macroInterior = smoothstep(0.0, 0.5, macro.diff);
    const macroBright = fbm3D(macroNoise, qx * 1.9, qy * 1.9, qz * 1.9, 3);

    // Meso granulation, locally warped so cells are irregular rather than polygonal
    const lw = detailNoise(x * 7.0 + 3.1, y * 7.0, z * 7.0) * 0.07;
    const meso = mesoCells((qx + lw) * 8.0, (qy - lw) * 8.0, (qz + lw) * 8.0);
    const lane = 1 - smoothstep(0.0, 0.17, meso.diff);
    const cellCore = 1 - smoothstep(0.05, 0.6, meso.f1);

    // Micro supporting texture
    const micro = fbm3D(detailNoise, x * 30, y * 30, z * 30, 2);

    // Faculae: fine bright network hugging the macro boundaries
    const faculaRidge = 1 - Math.abs(hotNoise(qx * 6.5, qy * 6.5, qz * 6.5));
    const facula = (1 - macroInterior) * smoothstep(0.55, 0.95, faculaRidge);

    // Rare irregular hot regions
    const hotField = fbm3D(hotNoise, qx * 2.8 + 13.1, qy * 2.8, qz * 2.8, 3);
    const hotSpot = smoothstep(0.24, 0.46, hotField);

    const temperature =
      0.63 +
      0.2 * macroBright -
      0.1 * (1 - macroInterior) -
      0.2 * lane * (0.55 + 0.45 * macroInterior) +
      0.06 * cellCore +
      0.04 * micro +
      0.1 * facula +
      0.16 * hotSpot;

    out.temperature = clamp01(temperature);
    out.hot = clamp01(hotSpot * 0.85 + facula * 0.45);
  };
}

/**
 * Blue-White — extremely hot compact star.
 * Dense turbulent hot field: bright compressed filaments on a near-white base,
 * low cell-to-cell contrast, only restrained cooler zones.
 */
export function createBlueStarField(seed: number): StarFieldSampler {
  const warpNoise = createNoise3D(seed + 101);
  const regionNoise = createNoise3D(seed + 131);
  const filamentNoise = createNoise3D(seed + 157);
  const turbNoise = createNoise3D(seed + 173);
  const coolNoise = createNoise3D(seed + 191);

  return (x, y, z, out) => {
    const wx = fbm3D(warpNoise, x * 2.2, y * 2.2, z * 2.2, 2);
    const wy = fbm3D(warpNoise, x * 2.2 + 4.7, y * 2.2 + 8.1, z * 2.2 + 1.9, 2);
    const wz = fbm3D(warpNoise, x * 2.2 + 7.3, y * 2.2 + 2.6, z * 2.2 + 6.4, 2);
    const qx = x + wx * 0.16;
    const qy = y + wy * 0.16;
    const qz = z + wz * 0.16;

    // Dense hot regions (broad, soft)
    const regions = fbm3D(regionNoise, qx * 2.6, qy * 2.6, qz * 2.6, 4);

    // Compressed granular energy: inverted ridges → bright thin filaments, never dark outlines
    const r1 = 1 - Math.abs(filamentNoise(qx * 13, qy * 13, qz * 13));
    const r2 = 1 - Math.abs(filamentNoise(qx * 26 + 3.1, qy * 26 - 1.7, qz * 26 + 0.4));
    const filaments = r1 * r1 * r1 * 0.65 + r2 * r2 * r2 * r2 * 0.35;

    // Fine turbulence (absolute-value fbm) keeps the field tight and energetic
    let turb = 0;
    let amp = 0.5;
    let freq = 18;
    for (let i = 0; i < 3; i++) {
      turb += Math.abs(turbNoise(qx * freq, qy * freq, qz * freq)) * amp;
      freq *= 2;
      amp *= 0.5;
    }

    // Restrained cooler structure (rare, soft)
    const cool = smoothstep(0.2, 0.5, fbm3D(coolNoise, qx * 1.7, qy * 1.7, qz * 1.7, 3));

    const temperature = 0.73 + 0.13 * regions + 0.09 * filaments - 0.07 * turb - 0.13 * cool;

    out.temperature = clamp01(temperature);
    out.hot = clamp01(smoothstep(0.05, 0.4, regions) * (0.55 + 0.45 * r1));
  };
}

/**
 * Ember — large cool red giant.
 * Few giant convection cells, heavily domain-warped into plumes, wide dark
 * crimson/obsidian lanes and isolated molten amber regions.
 */
export function createEmberStarField(seed: number): StarFieldSampler {
  const warpNoise = createNoise3D(seed + 211);
  const plumeNoise = createNoise3D(seed + 233);
  const subNoise = createNoise3D(seed + 257);
  const amberNoise = createNoise3D(seed + 271);
  const giantCells = createCellular3D(seed + 13);

  return (x, y, z, out) => {
    // Strong, low-frequency warp: convection plumes rather than polygons
    const wx = fbm3D(warpNoise, x * 1.3, y * 1.3, z * 1.3, 4);
    const wy = fbm3D(warpNoise, x * 1.3 + 6.1, y * 1.3 + 2.3, z * 1.3 + 9.4, 4);
    const wz = fbm3D(warpNoise, x * 1.3 + 3.8, y * 1.3 + 7.7, z * 1.3 + 1.2, 4);
    const qx = x + wx * 0.5;
    const qy = y + wy * 0.5;
    const qz = z + wz * 0.5;

    const cell = giantCells(qx * 2.2, qy * 2.2, qz * 2.2);
    const interior = smoothstep(0.02, 0.42, cell.diff);

    // Swirling molten structure inside each giant cell
    const plume = fbm3D(
      plumeNoise,
      qx * 3.6 + wx * 1.2,
      qy * 3.6 + wy * 1.2,
      qz * 3.6 + wz * 1.2,
      4
    );
    const sub = fbm3D(subNoise, qx * 7.5, qy * 7.5, qz * 7.5, 2);

    // Isolated molten amber regions (cell interiors that are also locally hot)
    const amberSeed = fbm3D(amberNoise, qx * 1.8, qy * 1.8, qz * 1.8, 2);
    const amber = smoothstep(0.62, 0.88, interior * (0.55 + plume * 0.9) + amberSeed * 0.55);

    const body = Math.pow(interior, 0.85) * (0.78 + 0.5 * plume);
    const temperature = 0.08 + 0.5 * body + 0.04 * sub + 0.3 * amber;

    out.temperature = clamp01(temperature);
    out.hot = clamp01(amber);
  };
}
