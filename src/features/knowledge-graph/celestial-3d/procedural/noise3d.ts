/**
 * Deterministic pseudo-random Linear Congruential Generator (LCG).
 */
export function createLcg(seed: number): () => number {
  let s = seed >>> 0;
  return (): number => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * 3D Gradient Noise generator with deterministic permutation table.
 */
export function createNoise3D(seed: number): (x: number, y: number, z: number) => number {
  const rnd = createLcg(seed);
  const p = new Uint8Array(512);
  const perm = new Uint8Array(256);

  for (let i = 0; i < 256; i++) {
    perm[i] = i;
  }

  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = perm[i] ?? 0;
    perm[i] = perm[j] ?? 0;
    perm[j] = tmp;
  }

  for (let i = 0; i < 512; i++) {
    p[i] = perm[i & 255] ?? 0;
  }

  const fade = (t: number): number => {
    return t * t * t * (t * (t * 6 - 15) + 10);
  };

  const lerp = (t: number, a: number, b: number): number => {
    return a + t * (b - a);
  };

  const grad = (hash: number, x: number, y: number, z: number): number => {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  };

  return (x: number, y: number, z: number): number => {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;

    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const zf = z - Math.floor(z);

    const u = fade(xf);
    const v = fade(yf);
    const w = fade(zf);

    const pX = p[X] ?? 0;
    const pX1 = p[X + 1] ?? 0;

    const A = (pX + Y) & 255;
    const AA = (p[A] ?? 0) + Z;
    const AB = (p[(A + 1) & 255] ?? 0) + Z;

    const B = (pX1 + Y) & 255;
    const BA = (p[B] ?? 0) + Z;
    const BB = (p[(B + 1) & 255] ?? 0) + Z;

    return lerp(
      w,
      lerp(
        v,
        lerp(u, grad(p[AA & 511] ?? 0, xf, yf, zf), grad(p[BA & 511] ?? 0, xf - 1, yf, zf)),
        lerp(u, grad(p[AB & 511] ?? 0, xf, yf - 1, zf), grad(p[BB & 511] ?? 0, xf - 1, yf - 1, zf))
      ),
      lerp(
        v,
        lerp(
          u,
          grad(p[(AA + 1) & 511] ?? 0, xf, yf, zf - 1),
          grad(p[(BA + 1) & 511] ?? 0, xf - 1, yf, zf - 1)
        ),
        lerp(
          u,
          grad(p[(AB + 1) & 511] ?? 0, xf, yf - 1, zf - 1),
          grad(p[(BB + 1) & 511] ?? 0, xf - 1, yf - 1, zf - 1)
        )
      )
    );
  };
}

/**
 * Multi-octave fractal Brownian motion in 3D.
 */
export function fbm3D(
  noise: (x: number, y: number, z: number) => number,
  x: number,
  y: number,
  z: number,
  octaves = 4,
  lacunarity = 2.0,
  gain = 0.5
): number {
  let total = 0;
  let amplitude = 1;
  let frequency = 1;
  let max = 0;

  for (let i = 0; i < octaves; i++) {
    total += noise(x * frequency, y * frequency, z * frequency) * amplitude;
    max += amplitude;
    frequency *= lacunarity;
    amplitude *= gain;
  }

  if (max === 0) {
    return 0;
  }
  return total / max;
}

/**
 * Ridged multifractal 3D noise for sharp ridges and mountain crests.
 */
export function ridgedFbm3D(
  noise: (x: number, y: number, z: number) => number,
  x: number,
  y: number,
  z: number,
  octaves = 4,
  lacunarity = 2.0,
  gain = 0.5
): number {
  let total = 0;
  let amplitude = 1;
  let frequency = 1;
  let max = 0;

  for (let i = 0; i < octaves; i++) {
    const n = Math.abs(noise(x * frequency, y * frequency, z * frequency));
    const signal = 1.0 - n;
    total += signal * signal * amplitude;
    max += amplitude;
    frequency *= lacunarity;
    amplitude *= gain;
  }

  if (max === 0) {
    return 0;
  }
  return total / max;
}

/**
 * 3D Voronoi / Cellular noise generator (Euclidean distance).
 * Returns { f1: distance to nearest point, f2: distance to second nearest point, diff: f2 - f1 }.
 */
export function createCellular3D(
  seed: number
): (x: number, y: number, z: number) => { f1: number; f2: number; diff: number } {
  const hash = (ix: number, iy: number, iz: number): [number, number, number] => {
    const s = Math.sin(ix * 12.9898 + iy * 78.233 + iz * 37.719 + seed * 0.17) * 43758.5453;
    const r1 = s - Math.floor(s);
    const s2 = Math.sin((ix + r1) * 39.34 + (iy + r1) * 11.23 + (iz + r1) * 91.12) * 23421.631;
    const r2 = s2 - Math.floor(s2);
    const s3 = Math.sin((ix + r2) * 73.12 + (iy + r2) * 55.45 + (iz + r2) * 19.87) * 51234.123;
    const r3 = s3 - Math.floor(s3);
    return [r1, r2, r3];
  };

  return (x: number, y: number, z: number) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const iz = Math.floor(z);

    let d1 = 9999.0;
    let d2 = 9999.0;

    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        for (let oz = -1; oz <= 1; oz++) {
          const cx = ix + ox;
          const cy = iy + oy;
          const cz = iz + oz;
          const [rx, ry, rz] = hash(cx, cy, cz);
          const px = cx + rx;
          const py = cy + ry;
          const pz = cz + rz;

          const dx = px - x;
          const dy = py - y;
          const dz = pz - z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < d1) {
            d2 = d1;
            d1 = dist;
          } else if (dist < d2) {
            d2 = dist;
          }
        }
      }
    }

    return { f1: d1, f2: d2, diff: d2 - d1 };
  };
}

/**
 * 3D Manhattan / Grid Cellular noise generator (L1 distance).
 * Produces rectilinear wafer/circuit partitions for metallic & engineered worlds.
 */
export function createCellularManhattan3D(
  seed: number
): (x: number, y: number, z: number) => { f1: number; f2: number; diff: number } {
  const hash = (ix: number, iy: number, iz: number): [number, number, number] => {
    const s = Math.sin(ix * 17.13 + iy * 61.27 + iz * 29.43 + seed * 0.31) * 31415.9265;
    const r1 = s - Math.floor(s);
    const s2 = Math.sin((ix + r1) * 47.19 + (iy + r1) * 83.21 + (iz + r1) * 13.91) * 27182.818;
    const r2 = s2 - Math.floor(s2);
    const s3 = Math.sin((ix + r2) * 59.33 + (iy + r2) * 31.77 + (iz + r2) * 97.53) * 16180.339;
    const r3 = s3 - Math.floor(s3);
    return [r1, r2, r3];
  };

  return (x: number, y: number, z: number) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const iz = Math.floor(z);

    let d1 = 9999.0;
    let d2 = 9999.0;

    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        for (let oz = -1; oz <= 1; oz++) {
          const cx = ix + ox;
          const cy = iy + oy;
          const cz = iz + oz;
          const [rx, ry, rz] = hash(cx, cy, cz);
          const px = cx + rx;
          const py = cy + ry;
          const pz = cz + rz;

          // Manhattan distance (L1 norm) produces rectilinear rectangular tiles
          const dist = Math.abs(px - x) + Math.abs(py - y) + Math.abs(pz - z);

          if (dist < d1) {
            d2 = d1;
            d1 = dist;
          } else if (dist < d2) {
            d2 = dist;
          }
        }
      }
    }

    return { f1: d1, f2: d2, diff: d2 - d1 };
  };
}

/**
 * Domain-warped 3D noise for atmospheric fluid swirl and planetary turbulence.
 */
export function domainWarp3D(
  noise: (x: number, y: number, z: number) => number,
  x: number,
  y: number,
  z: number,
  warpScale = 1.0
): number {
  const qx = fbm3D(noise, x, y, z, 3);
  const qy = fbm3D(noise, x + 5.2, y + 1.3, z + 2.8, 3);
  const qz = fbm3D(noise, x + 1.7, y + 9.2, z + 3.4, 3);

  const rx = fbm3D(noise, x + warpScale * qx + 1.7, y + warpScale * qy + 9.2, z + warpScale * qz + 0.5, 3);
  const ry = fbm3D(noise, x + warpScale * qx + 8.3, y + warpScale * qy + 2.8, z + warpScale * qz + 1.9, 3);
  const rz = fbm3D(noise, x + warpScale * qx + 2.1, y + warpScale * qy + 4.7, z + warpScale * qz + 6.3, 3);

  return fbm3D(noise, x + warpScale * rx, y + warpScale * ry, z + warpScale * rz, 4);
}
