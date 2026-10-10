import * as THREE from "three";
import { getRingTextureAlphaData } from "./procedural/textures";

export interface ForegroundRingOcclusion {
  readonly image?: HTMLCanvasElement;
  /** Geometry-only path used immediately while texture-alpha raster work is pending. */
  readonly path?: Path2D;
  /** CSS coordinates relative to the viewport center, with Canvas Y orientation. */
  x: number;
  y: number;
  size: number;
  opacity: number;
}

export interface ForegroundRingOcclusionSnapshot {
  readonly masks: readonly ForegroundRingOcclusion[];
  /** True while exact alpha masks or visible production bodies are still preparing. */
  readonly pending: boolean;
  /** Bodies whose foreground ring cannot yet be occluded safely. */
  readonly unreadyNodeIds: ReadonlySet<string>;
  /** Bodies not yet present in WebGL; their endpoint circle must not be punched out. */
  readonly bodyNotReadyNodeIds: ReadonlySet<string>;
}

export interface RasterizedForegroundRing {
  readonly rgba: Uint8ClampedArray;
  readonly size: number;
  readonly extent: number;
}

interface ProjectedVertex {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly u: number;
  readonly v: number;
}

interface TriangleRasterState {
  readonly a: ProjectedVertex;
  readonly b: ProjectedVertex;
  readonly c: ProjectedVertex;
  readonly ax: number;
  readonly ay: number;
  readonly bx: number;
  readonly by: number;
  readonly cx: number;
  readonly cy: number;
  readonly denominator: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
  x: number;
  y: number;
}

export interface ForegroundRingRasterizer {
  readonly result: RasterizedForegroundRing;
  readonly totalPixelCandidates: number;
  readonly processedPixelCandidates: number;
  readonly lastStepPixelCandidates: number;
  /** Processes bounded pixel candidates and optionally stops at a short time budget. */
  step(maxPixelCandidates: number, maxDurationMs?: number): boolean;
}

export interface CachedForegroundRingMask {
  readonly ringMatrix: THREE.Matrix4;
  readonly groupRotation: THREE.Quaternion;
  readonly extent: number;
  /** Geometry-only masks are conservative until the exact texture-alpha mask is ready. */
  readonly isExact: boolean;
  readonly draw: ForegroundRingOcclusion;
}

export interface ForegroundRingMaskBuilder {
  /** False if the body/ring orientation changed after this build started. */
  isCurrent(): boolean;
  step(maxPixelCandidates: number, maxDurationMs: number): boolean;
  /** Creates the Canvas image and publishes it to the ring-mesh weak cache. */
  commit(): CachedForegroundRingMask | null;
}

const masks = new WeakMap<THREE.Mesh, CachedForegroundRingMask>();
const RING_MASK_TIME_CHECK_PIXEL_INTERVAL = 2;

function intersectionAtForegroundPlane(a: ProjectedVertex, b: ProjectedVertex): ProjectedVertex {
  const amount = a.z / (a.z - b.z);
  return {
    x: a.x + (b.x - a.x) * amount,
    y: a.y + (b.y - a.y) * amount,
    z: 0,
    u: a.u + (b.u - a.u) * amount,
    v: a.v + (b.v - a.v) * amount,
  };
}

/** Clip a ring triangle to the foreground half-space used by the exact rasterizer. */
function clipForegroundTriangle(
  triangle: readonly [ProjectedVertex, ProjectedVertex, ProjectedVertex]
): ProjectedVertex[] {
  const clipped: ProjectedVertex[] = [];
  for (let index = 0; index < triangle.length; index++) {
    const current = triangle[index]!;
    const next = triangle[(index + 1) % triangle.length]!;
    const currentFront = current.z > 0;
    const nextFront = next.z > 0;
    if (currentFront && nextFront) {
      clipped.push(next);
    } else if (currentFront && !nextFront) {
      clipped.push(intersectionAtForegroundPlane(current, next));
    } else if (!currentFront && nextFront) {
      clipped.push(intersectionAtForegroundPlane(current, next), next);
    }
  }
  return clipped;
}

function makeEmptyRasterizer(size: number, extent: number): ForegroundRingRasterizer {
  let lastStepPixelCandidates = 0;
  return {
    result: { rgba: new Uint8ClampedArray(size * size * 4), size, extent },
    totalPixelCandidates: 0,
    processedPixelCandidates: 0,
    get lastStepPixelCandidates() {
      return lastStepPixelCandidates;
    },
    step() {
      lastStepPixelCandidates = 0;
      return true;
    },
  };
}

/**
 * Creates a resumable CPU rasterizer for the actual indexed ring triangles.
 * Pixel work is kept separate from setup so production can yield between small batches.
 */
export function createForegroundRingRasterizer(
  geometry: THREE.BufferGeometry,
  matrix: THREE.Matrix4,
  textureAlpha: Uint8Array | Uint8ClampedArray,
  textureWidth: number,
  textureHeight: number,
  size = 384
): ForegroundRingRasterizer {
  const safeSize = Number.isFinite(size) && size > 0 ? Math.floor(size) : 0;
  const position = geometry.getAttribute("position");
  const uv = geometry.getAttribute("uv");
  const index = geometry.index;
  if (
    safeSize === 0 ||
    !position ||
    !uv ||
    !index ||
    !Number.isFinite(textureWidth) ||
    !Number.isFinite(textureHeight) ||
    textureWidth <= 0 ||
    textureHeight <= 0 ||
    (textureAlpha.length !== textureWidth * textureHeight &&
      textureAlpha.length !== textureWidth * textureHeight * 4)
  ) {
    return makeEmptyRasterizer(safeSize, 1);
  }

  const vertices: ProjectedVertex[] = [];
  const point = new THREE.Vector3();
  let extent = 1;
  for (let i = 0; i < position.count; i++) {
    point.fromBufferAttribute(position, i).applyMatrix4(matrix);
    const vertex = {
      x: point.x,
      y: point.y,
      z: point.z,
      u: uv.getX(i),
      v: uv.getY(i),
    };
    vertices.push(vertex);
    extent = Math.max(extent, Math.abs(vertex.x) + 1, Math.abs(vertex.y) + 1);
  }

  const rgba = new Uint8ClampedArray(safeSize * safeSize * 4);
  const pixelScale = safeSize / (extent * 2);
  const triangles: TriangleRasterState[] = [];
  let totalPixelCandidates = 0;
  for (let triangle = 0; triangle + 2 < index.count; triangle += 3) {
    const ia = index.getX(triangle);
    const ib = index.getX(triangle + 1);
    const ic = index.getX(triangle + 2);
    const a = vertices[ia];
    const b = vertices[ib];
    const c = vertices[ic];
    if (!a || !b || !c || Math.max(a.z, b.z, c.z) <= 0) continue;

    const ax = (a.x + extent) * pixelScale;
    const ay = (extent - a.y) * pixelScale;
    const bx = (b.x + extent) * pixelScale;
    const by = (extent - b.y) * pixelScale;
    const cx = (c.x + extent) * pixelScale;
    const cy = (extent - c.y) * pixelScale;
    const denominator = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
    if (Math.abs(denominator) < 1e-8) continue;

    const left = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
    const right = Math.min(safeSize - 1, Math.ceil(Math.max(ax, bx, cx)));
    const top = Math.max(0, Math.floor(Math.min(ay, by, cy)));
    const bottom = Math.min(safeSize - 1, Math.ceil(Math.max(ay, by, cy)));
    if (left > right || top > bottom) continue;

    totalPixelCandidates += (right - left + 1) * (bottom - top + 1);
    triangles.push({
      a,
      b,
      c,
      ax,
      ay,
      bx,
      by,
      cx,
      cy,
      denominator,
      left,
      right,
      top,
      bottom,
      x: left,
      y: top,
    });
  }

  const alphaOnly = textureAlpha.length === textureWidth * textureHeight;
  let triangleIndex = 0;
  let processedPixelCandidates = 0;
  let lastStepPixelCandidates = 0;
  const result = { rgba, size: safeSize, extent };

  return {
    result,
    totalPixelCandidates,
    get processedPixelCandidates() {
      return processedPixelCandidates;
    },
    get lastStepPixelCandidates() {
      return lastStepPixelCandidates;
    },
    step(maxPixelCandidates: number, maxDurationMs = Number.POSITIVE_INFINITY) {
      const limit = Number.isFinite(maxPixelCandidates)
        ? Math.max(0, Math.floor(maxPixelCandidates))
        : Number.MAX_SAFE_INTEGER;
      const hasTimeBudget = Number.isFinite(maxDurationMs);
      const startedAt = hasTimeBudget ? performance.now() : 0;
      let processed = 0;

      while (triangleIndex < triangles.length && processed < limit) {
        const current = triangles[triangleIndex]!;
        if (current.y > current.bottom) {
          triangleIndex++;
          continue;
        }
        if (current.x > current.right) {
          current.x = current.left;
          current.y++;
          continue;
        }

        const x = current.x + 0.5;
        const y = current.y + 0.5;
        const wa =
          ((current.by - current.cy) * (x - current.cx) +
            (current.cx - current.bx) * (y - current.cy)) /
          current.denominator;
        const wb =
          ((current.cy - current.ay) * (x - current.cx) +
            (current.ax - current.cx) * (y - current.cy)) /
          current.denominator;
        const wc = 1 - wa - wb;

        if (Math.min(wa, wb, wc) >= -1e-6) {
          const z = wa * current.a.z + wb * current.b.z + wc * current.c.z;
          if (z > 0) {
            const u = wa * current.a.u + wb * current.b.u + wc * current.c.u;
            const v = wa * current.a.v + wb * current.b.v + wc * current.c.v;
            const tx = Math.min(textureWidth - 1, Math.max(0, Math.floor(u * textureWidth)));
            // CanvasTexture's default flipY maps UV v=1 to the CPU image's top row.
            const ty = Math.min(
              textureHeight - 1,
              Math.max(0, Math.floor((1 - v) * textureHeight))
            );
            const textureIndex = ty * textureWidth + tx;
            rgba[(current.y * safeSize + current.x) * 4 + 3] =
              textureAlpha[alphaOnly ? textureIndex : textureIndex * 4 + 3] ?? 0;
          }
        }

        current.x++;
        processed++;
        processedPixelCandidates++;
        if (
          hasTimeBudget &&
          processed % RING_MASK_TIME_CHECK_PIXEL_INTERVAL === 0 &&
          performance.now() - startedAt >= maxDurationMs
        ) {
          break;
        }
      }

      lastStepPixelCandidates = processed;
      return triangleIndex >= triangles.length;
    },
  };
}

/** Synchronous reference helper for deterministic tests and offline probes. */
export function rasterizeForegroundRing(
  geometry: THREE.BufferGeometry,
  matrix: THREE.Matrix4,
  textureAlpha: Uint8Array | Uint8ClampedArray,
  textureWidth: number,
  textureHeight: number,
  size = 384
): RasterizedForegroundRing {
  const rasterizer = createForegroundRingRasterizer(
    geometry,
    matrix,
    textureAlpha,
    textureWidth,
    textureHeight,
    size
  );
  while (!rasterizer.step(Number.MAX_SAFE_INTEGER)) {
    // Finish the reference raster in one call; production uses short resumable steps.
  }
  return rasterizer.result;
}

export function getCachedForegroundRingMask(
  body: THREE.Group,
  ring: THREE.Mesh
): CachedForegroundRingMask | null {
  ring.updateMatrix();
  const cached = masks.get(ring);
  return cached?.ringMatrix.equals(ring.matrix) && cached.groupRotation.equals(body.quaternion)
    ? cached
    : null;
}

/** Remove a ring's CPU mask with its disposed celestial mesh. */
export function disposeCachedForegroundRingMask(ring: THREE.Mesh): boolean {
  const hadMask = masks.has(ring);
  masks.delete(ring);
  return hadMask;
}

function captureRingMaskTransform(body: THREE.Group, ring: THREE.Mesh) {
  ring.updateMatrix();
  const ringMatrix = ring.matrix.clone();
  const groupRotation = body.quaternion.clone();
  const matrix = new THREE.Matrix4().makeRotationFromQuaternion(groupRotation).multiply(ringMatrix);
  return { ringMatrix, groupRotation, matrix };
}

/**
 * Publishes a conservative, geometry-only occlusion path without sampling texture pixels.
 * The exact texture-alpha mask replaces it after the incremental raster completes.
 */
export function createForegroundRingGeometryFallback(
  body: THREE.Group,
  ring: THREE.Mesh
): CachedForegroundRingMask | null {
  const cached = getCachedForegroundRingMask(body, ring);
  if (cached) return cached;
  if (typeof Path2D === "undefined") return null;
  const position = ring.geometry.getAttribute("position");
  const index = ring.geometry.index;
  if (!position) return null;

  const { ringMatrix, groupRotation, matrix } = captureRingMaskTransform(body, ring);
  const vertices: ProjectedVertex[] = [];
  const point = new THREE.Vector3();
  let extent = 1;
  for (let vertexIndex = 0; vertexIndex < position.count; vertexIndex++) {
    point.fromBufferAttribute(position, vertexIndex).applyMatrix4(matrix);
    const vertex = { x: point.x, y: point.y, z: point.z, u: 0, v: 0 };
    vertices.push(vertex);
    extent = Math.max(extent, Math.abs(vertex.x) + 1, Math.abs(vertex.y) + 1);
  }

  const path = new Path2D();
  const triangleCount = index ? index.count / 3 : Math.floor(position.count / 3);
  for (let triangleIndex = 0; triangleIndex < triangleCount; triangleIndex++) {
    const base = triangleIndex * 3;
    const ia = index ? index.getX(base) : base;
    const ib = index ? index.getX(base + 1) : base + 1;
    const ic = index ? index.getX(base + 2) : base + 2;
    const a = vertices[ia];
    const b = vertices[ib];
    const c = vertices[ic];
    if (!a || !b || !c) continue;
    const polygon = clipForegroundTriangle([a, b, c]);
    if (polygon.length < 3) continue;
    path.moveTo(polygon[0]!.x, -polygon[0]!.y);
    for (let vertexIndex = 1; vertexIndex < polygon.length; vertexIndex++) {
      path.lineTo(polygon[vertexIndex]!.x, -polygon[vertexIndex]!.y);
    }
    path.closePath();
  }

  const fallback: CachedForegroundRingMask = {
    ringMatrix,
    groupRotation,
    extent,
    isExact: false,
    draw: { path, x: 0, y: 0, size: 0, opacity: 0 },
  };
  masks.set(ring, fallback);
  return fallback;
}

/** Starts a mask build only from retained CPU alpha; it never reads pixels from a live CanvasTexture. */
export function createForegroundRingMaskBuilder(
  body: THREE.Group,
  ring: THREE.Mesh
): ForegroundRingMaskBuilder | null {
  const material = ring.material;
  if (!(material instanceof THREE.MeshStandardMaterial) || !material.map) return null;
  const source = material.map.image as HTMLCanvasElement;
  if (!source || source.width <= 0 || source.height <= 0) return null;

  const textureAlpha = getRingTextureAlphaData(source);
  // All production rings retain this alpha plane during texture generation. If an external
  // texture lacks it, fail closed so the Canvas does not draw unmasked strands over its ring.
  if (!textureAlpha) return null;

  const { ringMatrix, groupRotation, matrix } = captureRingMaskTransform(body, ring);
  const rasterizer = createForegroundRingRasterizer(
    ring.geometry,
    matrix,
    textureAlpha,
    source.width,
    source.height
  );
  let committed: CachedForegroundRingMask | null = null;

  const isCurrent = () => {
    ring.updateMatrix();
    return ringMatrix.equals(ring.matrix) && groupRotation.equals(body.quaternion);
  };

  return {
    isCurrent,
    step(maxPixelCandidates, maxDurationMs) {
      return rasterizer.step(maxPixelCandidates, maxDurationMs);
    },
    commit() {
      if (committed) return committed;
      if (!isCurrent() || rasterizer.processedPixelCandidates < rasterizer.totalPixelCandidates) {
        return null;
      }

      const image = document.createElement("canvas");
      image.width = image.height = rasterizer.result.size;
      const context = image.getContext("2d");
      if (!context) return null;
      const imageData = context.createImageData(rasterizer.result.size, rasterizer.result.size);
      imageData.data.set(rasterizer.result.rgba);
      context.putImageData(imageData, 0, 0);

      committed = {
        ringMatrix: ringMatrix.clone(),
        groupRotation: groupRotation.clone(),
        extent: rasterizer.result.extent,
        isExact: true,
        draw: { image, x: 0, y: 0, size: 0, opacity: 0 },
      };
      masks.set(ring, committed);
      return committed;
    },
  };
}
