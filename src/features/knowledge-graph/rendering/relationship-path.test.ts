import { describe, expect, it } from "vitest";
import {
  calculateRelationshipGeometry,
  getRelationshipBoundaryRadius,
  quadraticPointAt,
  quadraticTangentAt,
  type RelationshipEndpoint,
} from "./relationship-path";

const source: RelationshipEndpoint = { x: -30, y: 15, radius: 24 };
const target: RelationshipEndpoint = { x: 160, y: 90, radius: 18 };

function distanceToEndpoint(
  point: { x: number; y: number },
  endpoint: RelationshipEndpoint
): number {
  return Math.hypot(point.x - endpoint.x, point.y - endpoint.y);
}

describe("circle-clipped relationship path geometry", () => {
  it("attaches the clipped quadratic to both physical endpoint circles", () => {
    const geometry = calculateRelationshipGeometry(source, target, 0.18);

    expect(geometry).not.toBeNull();
    expect(distanceToEndpoint(geometry!.path.start, source)).toBeCloseTo(source.radius, 5);
    expect(distanceToEndpoint(geometry!.path.end, target)).toBeCloseTo(target.radius, 5);
    expect(geometry!.startT).toBeGreaterThan(0);
    expect(geometry!.endT).toBeLessThan(1);
    expect(geometry!.startT).toBeLessThan(geometry!.endT);
  });

  it("uses the clipped curve tangent for its source-to-target directional cue", () => {
    const geometry = calculateRelationshipGeometry(source, target, -0.24);

    expect(geometry).not.toBeNull();
    if (!geometry) throw new Error("expected a path for separated endpoints");
    const tangent = quadraticTangentAt(geometry.path, geometry.cue!.t);
    expect(geometry.cue!.tangent.x).toBeCloseTo(tangent.x, 7);
    expect(geometry.cue!.tangent.y).toBeCloseTo(tangent.y, 7);
    expect(geometry.cue!.angle).toBeCloseTo(Math.atan2(tangent.y, tangent.x), 7);
    expect(tangent.x * (target.x - source.x) + tangent.y * (target.y - source.y)).toBeGreaterThan(
      0
    );
    expect(quadraticPointAt(geometry.path, geometry.cue!.t).x).toBeCloseTo(
      geometry.cue!.point.x,
      7
    );
  });

  it("keeps the visible middle segment outside both bodies across curvatures", () => {
    for (const curvature of [-0.42, -0.18, 0, 0.18, 0.42]) {
      const geometry = calculateRelationshipGeometry(source, target, curvature);
      expect(geometry, `curvature ${curvature}`).not.toBeNull();
      if (!geometry) throw new Error(`expected a path at curvature ${curvature}`);

      for (let index = 1; index < 40; index += 1) {
        const point = quadraticPointAt(geometry.path, index / 40);
        expect(distanceToEndpoint(point, source)).toBeGreaterThanOrEqual(source.radius - 1e-5);
        expect(distanceToEndpoint(point, target)).toBeGreaterThanOrEqual(target.radius - 1e-5);
      }
    }
  });

  it("anchors a large focus sphere to a small context sphere using their current radii", () => {
    const largeFocus = { x: 0, y: 0, radius: 48 };
    const smallContext = { x: 165, y: -28, radius: 12 };
    const geometry = calculateRelationshipGeometry(largeFocus, smallContext, 0.31);

    expect(geometry).not.toBeNull();
    if (!geometry) throw new Error("expected a path between separated focus and context spheres");
    expect(distanceToEndpoint(geometry.path.start, largeFocus)).toBeCloseTo(largeFocus.radius, 5);
    expect(distanceToEndpoint(geometry.path.end, smallContext)).toBeCloseTo(smallContext.radius, 5);
  });

  it.each([0.3, 0.6, 1, 3])(
    "keeps endpoints on the fixed CSS-pixel body surfaces at zoom %s",
    (zoom) => {
      const sourceRadiusInPathSpace = getRelationshipBoundaryRadius(source.radius, zoom, true)!;
      const targetRadiusInPathSpace = getRelationshipBoundaryRadius(target.radius, zoom, true)!;
      const geometry = calculateRelationshipGeometry(
        { ...source, radius: sourceRadiusInPathSpace },
        { ...target, radius: targetRadiusInPathSpace },
        0.18,
        zoom
      );

      expect(geometry).not.toBeNull();
      if (!geometry) throw new Error("expected paths for projected surface check");
      expect(distanceToEndpoint(geometry.path.start, source) * zoom).toBeCloseTo(source.radius, 5);
      expect(distanceToEndpoint(geometry.path.end, target) * zoom).toBeCloseTo(target.radius, 5);
      expect(
        Math.hypot(
          geometry.cue!.point.x - geometry.path.end.x,
          geometry.cue!.point.y - geometry.path.end.y
        ) * zoom
      ).toBeCloseTo(8, 2);
    }
  );

  it.each([0.3, 0.6, 1, 3])(
    "keeps Canvas-only body and connection radii in the same zoomed scene units at k=%s",
    (zoom) => {
      const geometry = calculateRelationshipGeometry(source, target, 0.18, zoom);

      expect(geometry).not.toBeNull();
      if (!geometry) throw new Error("expected a Canvas-only path");
      expect(distanceToEndpoint(geometry.path.start, source)).toBeCloseTo(source.radius, 5);
      expect(distanceToEndpoint(geometry.path.end, target)).toBeCloseTo(target.radius, 5);
    }
  );

  it.each([0.3, 0.6, 1, 3])("maps fixed screen radii into path coordinates at k=%s", (zoom) => {
    expect(getRelationshipBoundaryRadius(source.radius, zoom, true)).toBeCloseTo(
      source.radius / zoom,
      7
    );
    expect(getRelationshipBoundaryRadius(target.radius, zoom, false)).toBe(target.radius);
  });

  it("suppresses overlapping and subpixel-gap bodies, and omits cues on short strands", () => {
    const largeSource = { x: 0, y: 0, radius: 20 };
    expect(calculateRelationshipGeometry(largeSource, { x: 39, y: 0, radius: 20 }, 0)).toBeNull();
    expect(calculateRelationshipGeometry(largeSource, { x: 40.5, y: 0, radius: 20 }, 0)).toBeNull();

    const shortStrand = calculateRelationshipGeometry(largeSource, { x: 45, y: 0, radius: 20 }, 0);
    expect(shortStrand).not.toBeNull();
    if (!shortStrand) throw new Error("expected the short visible segment to remain available");
    expect(shortStrand.visibleLength).toBeLessThan(10);
    expect(shortStrand.cue).toBeNull();
  });

  it("rejects nonfinite coordinates, dimensions, curvature, and zoom", () => {
    expect(
      calculateRelationshipGeometry({ x: Number.NaN, y: 0, radius: 5 }, target, 0.1)
    ).toBeNull();
    expect(
      calculateRelationshipGeometry(source, { ...target, x: Number.POSITIVE_INFINITY }, 0.1)
    ).toBeNull();
    expect(calculateRelationshipGeometry(source, { ...target, radius: 0 }, 0.1)).toBeNull();
    expect(
      calculateRelationshipGeometry(source, { ...target, radius: Number.NaN }, 0.1)
    ).toBeNull();
    expect(calculateRelationshipGeometry(source, target, Number.POSITIVE_INFINITY)).toBeNull();
    expect(calculateRelationshipGeometry(source, target, 0.1, Number.NaN)).toBeNull();
    expect(calculateRelationshipGeometry(source, target, 0.1, 0)).toBeNull();
  });
});
