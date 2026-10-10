export interface PathPoint {
  readonly x: number;
  readonly y: number;
}

export interface RelationshipEndpoint extends PathPoint {
  readonly radius: number;
}

export interface QuadraticPath {
  readonly start: PathPoint;
  readonly control: PathPoint;
  readonly end: PathPoint;
}

export interface RelationshipPathCue {
  /** Parameter in the clipped (reparameterized) path. */
  readonly t: number;
  readonly point: PathPoint;
  /** Derivative points from source to target. */
  readonly tangent: PathPoint;
  readonly angle: number;
}

export interface RelationshipPathGeometry {
  readonly path: QuadraticPath;
  /** Boundary intersection parameters on the original, center-to-center quadratic. */
  readonly startT: number;
  readonly endT: number;
  readonly centerDistance: number;
  /** Approximate visible curve length in world units. */
  readonly visibleLength: number;
  readonly cue: RelationshipPathCue | null;
}

const ROOT_PARAMETER_EPSILON = 1e-8;
const ROOT_VALUE_EPSILON = 1e-10;
const CURVE_CLEARANCE_EPSILON = 1e-6;
const MINIMUM_VISIBLE_GAP_CSS_PX = 1;
const MINIMUM_CUE_LENGTH_CSS_PX = 12;
const CUE_INSET_CSS_PX = 8;
const ARC_LENGTH_SUBDIVISIONS = 64;

interface MutableQuadraticPath {
  start: PathPoint;
  control: PathPoint;
  end: PathPoint;
}

/**
 * Clip the original center-to-center quadratic against both endpoint circles.
 * The retained curve is an exact reparameterized quadratic segment; the cue is
 * inset from the target by a constant CSS-pixel distance.
 */
export function calculateRelationshipGeometry(
  source: RelationshipEndpoint,
  target: RelationshipEndpoint,
  curvature: number,
  zoomK = 1
): RelationshipPathGeometry | null {
  if (
    !isFiniteEndpoint(source) ||
    !isFiniteEndpoint(target) ||
    !Number.isFinite(curvature) ||
    !Number.isFinite(zoomK) ||
    zoomK <= 0
  ) {
    return null;
  }

  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const centerDistance = Math.hypot(dx, dy);
  if (!Number.isFinite(centerDistance) || centerDistance <= source.radius + target.radius) {
    return null;
  }

  const minimumVisibleGap = MINIMUM_VISIBLE_GAP_CSS_PX / zoomK;
  if (centerDistance - source.radius - target.radius <= minimumVisibleGap) return null;

  const normalX = -dy / centerDistance;
  const normalY = dx / centerDistance;
  const midpointX = source.x + dx / 2;
  const midpointY = source.y + dy / 2;
  const control = {
    x: midpointX + normalX * centerDistance * curvature,
    y: midpointY + normalY * centerDistance * curvature,
  };
  if (!Number.isFinite(control.x) || !Number.isFinite(control.y)) return null;

  const originalPath: QuadraticPath = {
    start: { x: source.x, y: source.y },
    control,
    end: { x: target.x, y: target.y },
  };
  const sourceRoots = getCircleBoundaryParameters(originalPath, source, source.radius);
  const targetRoots = getCircleBoundaryParameters(originalPath, target, target.radius);
  if (sourceRoots === null || targetRoots === null) return null;

  const startT = sourceRoots.find((root) => root > ROOT_PARAMETER_EPSILON);
  const endT = [...targetRoots].reverse().find((root) => root < 1 - ROOT_PARAMETER_EPSILON);
  if (startT === undefined || endT === undefined || startT >= endT) return null;

  if (
    !staysOutsideCircle(originalPath, source, source.radius, startT, endT, sourceRoots) ||
    !staysOutsideCircle(originalPath, target, target.radius, startT, endT, targetRoots)
  ) {
    return null;
  }

  const path = extractQuadraticSegment(originalPath, startT, endT);
  const visibleLength = approximateQuadraticLength(path);
  if (!Number.isFinite(visibleLength) || visibleLength <= 0) return null;

  const cue =
    visibleLength * zoomK < MINIMUM_CUE_LENGTH_CSS_PX
      ? null
      : createCue(path, CUE_INSET_CSS_PX / zoomK);

  return { path, startT, endT, centerDistance, visibleLength, cue };
}

/** Evaluate a quadratic Bézier path at a parameter in [0, 1]. */
export function quadraticPointAt(path: QuadraticPath, t: number): PathPoint {
  const inverseT = 1 - t;
  const startWeight = inverseT * inverseT;
  const controlWeight = 2 * inverseT * t;
  const endWeight = t * t;
  return {
    x: startWeight * path.start.x + controlWeight * path.control.x + endWeight * path.end.x,
    y: startWeight * path.start.y + controlWeight * path.control.y + endWeight * path.end.y,
  };
}

/** Evaluate the forward derivative of a quadratic Bézier path. */
export function quadraticTangentAt(path: QuadraticPath, t: number): PathPoint {
  const inverseT = 1 - t;
  return {
    x: 2 * inverseT * (path.control.x - path.start.x) + 2 * t * (path.end.x - path.control.x),
    y: 2 * inverseT * (path.control.y - path.start.y) + 2 * t * (path.end.y - path.control.y),
  };
}

/** Convert a CSS-pixel dimension to Canvas world units at the current zoom. */
export function screenPixelsToWorldUnits(cssPixels: number, zoomK: number): number | null {
  if (!Number.isFinite(cssPixels) || cssPixels < 0 || !Number.isFinite(zoomK) || zoomK <= 0) {
    return null;
  }
  return cssPixels / zoomK;
}

/**
 * Return a rendered body's radius in the Canvas coordinates used by paths.
 * Canvas-only bodies share the path transform; WebGL bodies keep their CSS-pixel
 * radius fixed while path coordinates are scaled by zoom.
 */
export function getRelationshipBoundaryRadius(
  bodyRadiusCssPx: number,
  zoomK: number,
  bodyRenderedInWebGL: boolean
): number | null {
  if (
    !Number.isFinite(bodyRadiusCssPx) ||
    bodyRadiusCssPx <= 0 ||
    !Number.isFinite(zoomK) ||
    zoomK <= 0
  ) {
    return null;
  }

  return bodyRenderedInWebGL ? bodyRadiusCssPx / zoomK : bodyRadiusCssPx;
}

function isFiniteEndpoint(endpoint: RelationshipEndpoint): boolean {
  return (
    Number.isFinite(endpoint.x) &&
    Number.isFinite(endpoint.y) &&
    Number.isFinite(endpoint.radius) &&
    endpoint.radius > 0
  );
}

/** Return every circle intersection parameter, sorted in ascending curve order. */
function getCircleBoundaryParameters(
  path: QuadraticPath,
  center: PathPoint,
  radius: number
): number[] | null {
  const offsetX = path.start.x - center.x;
  const offsetY = path.start.y - center.y;
  const linearX = 2 * (path.control.x - path.start.x);
  const linearY = 2 * (path.control.y - path.start.y);
  const quadraticX = path.start.x - 2 * path.control.x + path.end.x;
  const quadraticY = path.start.y - 2 * path.control.y + path.end.y;

  // |offset + linear*t + quadratic*t^2|^2 - radius^2 is quartic.
  const coefficients = [
    offsetX * offsetX + offsetY * offsetY - radius * radius,
    2 * (offsetX * linearX + offsetY * linearY),
    linearX * linearX + linearY * linearY + 2 * (offsetX * quadraticX + offsetY * quadraticY),
    2 * (linearX * quadraticX + linearY * quadraticY),
    quadraticX * quadraticX + quadraticY * quadraticY,
  ];
  if (!coefficients.every(Number.isFinite)) return null;
  return isolatePolynomialRoots(coefficients, 0, 1);
}

/** Isolate real polynomial roots by recursively partitioning at derivative roots. */
function isolatePolynomialRoots(
  coefficients: readonly number[],
  lower: number,
  upper: number
): number[] {
  const normalized = normalizePolynomial(coefficients);
  const degree = normalized.length - 1;
  if (degree <= 0) return [];

  if (degree === 1) {
    const root = -normalized[0]! / normalized[1]!;
    return root >= lower - ROOT_PARAMETER_EPSILON && root <= upper + ROOT_PARAMETER_EPSILON
      ? [clamp(root, lower, upper)]
      : [];
  }

  const derivative = normalized.slice(1).map((coefficient, index) => coefficient * (index + 1));
  const criticalPoints = isolatePolynomialRoots(derivative, lower, upper)
    .filter(
      (root) => root > lower + ROOT_PARAMETER_EPSILON && root < upper - ROOT_PARAMETER_EPSILON
    )
    .sort((left, right) => left - right);
  const partitions = deduplicateSorted([lower, ...criticalPoints, upper]);
  const roots: number[] = [];

  for (const point of criticalPoints) {
    if (Math.abs(evaluatePolynomial(normalized, point)) <= ROOT_VALUE_EPSILON) roots.push(point);
  }

  for (let index = 0; index < partitions.length - 1; index += 1) {
    const left = partitions[index]!;
    const right = partitions[index + 1]!;
    const leftValue = evaluatePolynomial(normalized, left);
    const rightValue = evaluatePolynomial(normalized, right);

    if (Math.abs(leftValue) <= ROOT_VALUE_EPSILON) roots.push(left);
    if (Math.abs(rightValue) <= ROOT_VALUE_EPSILON) roots.push(right);
    if (leftValue * rightValue < 0) {
      roots.push(bisectPolynomialRoot(normalized, left, right, leftValue));
    }
  }

  return deduplicateSorted(roots.sort((left, right) => left - right));
}

function normalizePolynomial(coefficients: readonly number[]): number[] {
  const normalized = [...coefficients];
  const scale = Math.max(...normalized.map((coefficient) => Math.abs(coefficient)));
  if (!Number.isFinite(scale) || scale === 0) return [0];
  for (let index = 0; index < normalized.length; index += 1)
    normalized[index] = normalized[index]! / scale;

  while (
    normalized.length > 1 &&
    Math.abs(normalized[normalized.length - 1]!) <= Number.EPSILON * 64
  ) {
    normalized.pop();
  }
  return normalized;
}

function evaluatePolynomial(coefficients: readonly number[], value: number): number {
  let result = 0;
  for (let index = coefficients.length - 1; index >= 0; index -= 1) {
    result = result * value + coefficients[index]!;
  }
  return result;
}

function bisectPolynomialRoot(
  coefficients: readonly number[],
  initialLower: number,
  initialUpper: number,
  initialLowerValue: number
): number {
  let lower = initialLower;
  let upper = initialUpper;
  let lowerValue = initialLowerValue;

  for (let iteration = 0; iteration < 80; iteration += 1) {
    const midpoint = lower + (upper - lower) / 2;
    const midpointValue = evaluatePolynomial(coefficients, midpoint);
    if (
      Math.abs(midpointValue) <= Number.EPSILON * 16 ||
      upper - lower <= ROOT_PARAMETER_EPSILON / 4
    ) {
      return midpoint;
    }
    if (lowerValue * midpointValue < 0) {
      upper = midpoint;
    } else {
      lower = midpoint;
      lowerValue = midpointValue;
    }
  }
  return lower + (upper - lower) / 2;
}

function deduplicateSorted(values: readonly number[]): number[] {
  const sorted = [...values].sort((left, right) => left - right);
  const result: number[] = [];
  for (const value of sorted) {
    const previous = result[result.length - 1];
    if (previous === undefined || Math.abs(value - previous) > ROOT_PARAMETER_EPSILON) {
      result.push(value);
    }
  }
  return result;
}

function clamp(value: number, lower: number, upper: number): number {
  return Math.max(lower, Math.min(upper, value));
}

function staysOutsideCircle(
  path: QuadraticPath,
  center: PathPoint,
  radius: number,
  startT: number,
  endT: number,
  intersections: readonly number[]
): boolean {
  const partitions = deduplicateSorted([
    startT,
    ...intersections.filter(
      (root) => root > startT + ROOT_PARAMETER_EPSILON && root < endT - ROOT_PARAMETER_EPSILON
    ),
    endT,
  ]);
  const minimumDistance = Math.max(0, radius - CURVE_CLEARANCE_EPSILON);
  const minimumDistanceSquared = minimumDistance * minimumDistance;

  for (let index = 0; index < partitions.length - 1; index += 1) {
    const midpoint = (partitions[index]! + partitions[index + 1]!) / 2;
    const point = quadraticPointAt(path, midpoint);
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    if (
      !Number.isFinite(dx) ||
      !Number.isFinite(dy) ||
      dx * dx + dy * dy < minimumDistanceSquared
    ) {
      return false;
    }
  }
  return true;
}

function extractQuadraticSegment(path: QuadraticPath, startT: number, endT: number): QuadraticPath {
  const prefix = splitQuadraticPath(path, endT).left;
  const relativeStart = startT / endT;
  return splitQuadraticPath(prefix, relativeStart).right;
}

function splitQuadraticPath(
  path: QuadraticPath,
  t: number
): { left: MutableQuadraticPath; right: MutableQuadraticPath } {
  const startControl = interpolate(path.start, path.control, t);
  const controlEnd = interpolate(path.control, path.end, t);
  const splitPoint = interpolate(startControl, controlEnd, t);
  return {
    left: { start: path.start, control: startControl, end: splitPoint },
    right: { start: splitPoint, control: controlEnd, end: path.end },
  };
}

function interpolate(left: PathPoint, right: PathPoint, t: number): PathPoint {
  return {
    x: left.x + (right.x - left.x) * t,
    y: left.y + (right.y - left.y) * t,
  };
}

function approximateQuadraticLength(path: QuadraticPath): number {
  let length = 0;
  let previous = path.start;
  for (let index = 1; index <= ARC_LENGTH_SUBDIVISIONS; index += 1) {
    const point = quadraticPointAt(path, index / ARC_LENGTH_SUBDIVISIONS);
    length += Math.hypot(point.x - previous.x, point.y - previous.y);
    previous = point;
  }
  return length;
}

function createCue(path: QuadraticPath, distanceFromEnd: number): RelationshipPathCue | null {
  let remainingDistance = distanceFromEnd;
  let previousT = 1;
  let previousPoint = path.end;
  let cueT = 0;

  for (let index = ARC_LENGTH_SUBDIVISIONS; index > 0; index -= 1) {
    const currentT = (index - 1) / ARC_LENGTH_SUBDIVISIONS;
    const currentPoint = quadraticPointAt(path, currentT);
    const segmentLength = Math.hypot(
      previousPoint.x - currentPoint.x,
      previousPoint.y - currentPoint.y
    );

    if (remainingDistance <= segmentLength && segmentLength > 0) {
      cueT = previousT - (previousT - currentT) * (remainingDistance / segmentLength);
      break;
    }
    remainingDistance -= segmentLength;
    previousT = currentT;
    previousPoint = currentPoint;
  }

  const tangent = quadraticTangentAt(path, cueT);
  const tangentLength = Math.hypot(tangent.x, tangent.y);
  if (!Number.isFinite(tangentLength) || tangentLength <= Number.EPSILON) return null;
  return {
    t: cueT,
    point: quadraticPointAt(path, cueT),
    tangent,
    angle: Math.atan2(tangent.y, tangent.x),
  };
}
