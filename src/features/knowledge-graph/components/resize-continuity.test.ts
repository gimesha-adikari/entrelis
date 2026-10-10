import { describe, expect, it } from "vitest";
import type { ViewportTransform } from "../types";
import { preserveViewportPositionOnCanvasResize } from "./resize-continuity";

describe("canvas width resize continuity", () => {
  it("keeps visible world positions steady as the left-docked panel changes canvas width", () => {
    const transform: ViewportTransform = { x: 37, y: -21, k: 1.7 };

    expect(preserveViewportPositionOnCanvasResize(transform, 1000, 800)).toEqual({
      x: 137,
      y: -21,
      k: 1.7,
    });
  });

  it("leaves pan and zoom unchanged when the width has not changed", () => {
    const transform: ViewportTransform = { x: -82, y: 23, k: 2.25 };

    expect(preserveViewportPositionOnCanvasResize(transform, 800, 800)).toEqual(transform);
  });
});
