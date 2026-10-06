import { describe, expect, it } from "vitest";
import { hitTestNode } from "./hit-test";
import { SEED_DATASET } from "@/data/seed";
import type { GraphNode } from "../types";

describe("hitTestNode", () => {
  const mockNode: GraphNode = {
    id: "concept-rust",
    slug: "rust",
    name: "Rust",
    concept: SEED_DATASET.concepts[0]!,
    x: 0,
    y: 0,
  };

  const canvasRect = {
    left: 100,
    top: 100,
    width: 800,
    height: 600,
  } as DOMRect;

  it("identifies node hit at center point with identity transform", () => {
    // Canvas center is (100 + 400, 100 + 300) = (500, 400)
    const hit = hitTestNode([mockNode], 500, 400, canvasRect, { x: 0, y: 0, k: 1 });
    expect(hit?.id).toBe("concept-rust");
  });

  it("returns null when clicking away from node", () => {
    const hit = hitTestNode([mockNode], 150, 150, canvasRect, { x: 0, y: 0, k: 1 });
    expect(hit).toBeNull();
  });

  it("accounts for viewport pan and zoom in hit detection", () => {
    // Node at (0, 0), viewport panned by x: 50, y: -30, zoomed 2x
    // Screen position = center + transform = (500 + 50, 400 - 30) = (550, 370)
    const hit = hitTestNode([mockNode], 550, 370, canvasRect, { x: 50, y: -30, k: 2 });
    expect(hit?.id).toBe("concept-rust");
  });
});
