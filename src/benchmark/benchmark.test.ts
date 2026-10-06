import { describe, it, expect } from "vitest";
import { performance } from "node:perf_hooks";
import { generateSyntheticDataset } from "./generator";
import { buildLocalUniverseScene, layoutLocalUniverseScene } from "@/features/knowledge-graph";

interface UniverseBenchmarkResult {
  nodeCount: number;
  edgeCount: number;
  sceneBuildMs: number;
  layoutMs: number;
  totalMs: number;
  visibleNodes: number;
  visibleRels: number;
}

function runBenchmarkForSize(nodeCount: number): UniverseBenchmarkResult {
  const dataset = generateSyntheticDataset(nodeCount);
  const edgeCount = dataset.relationships.length;
  const targetConcept = dataset.concepts[Math.floor(nodeCount / 2)];
  const targetSlug = targetConcept ? targetConcept.slug : "synth-0";

  // 1. Local scene construction time
  const t0 = performance.now();
  const scene = buildLocalUniverseScene({
    dataset,
    focusSlug: targetSlug,
    isMobile: false,
  });
  const sceneBuildMs = performance.now() - t0;

  // 2. Deterministic layout time
  const t1 = performance.now();
  const laidOutScene = layoutLocalUniverseScene(scene, {
    viewportWidth: 1280,
    viewportHeight: 800,
    isMobile: false,
  });
  const layoutMs = performance.now() - t1;

  const totalMs = performance.now() - t0;

  // Verify bounded scene output
  expect(laidOutScene.allNodes.length).toBeLessThanOrEqual(10);

  return {
    nodeCount,
    edgeCount,
    sceneBuildMs,
    layoutMs,
    totalMs,
    visibleNodes: laidOutScene.allNodes.length,
    visibleRels: laidOutScene.relationships.length,
  };
}

describe("Local Universe Synthetic Benchmarks (Production Engine)", () => {
  it("benchmarks 50, 500, and 5,000 synthetic nodes with strictly bounded scene complexity", () => {
    const sizes = [50, 500, 5000];
    const results: UniverseBenchmarkResult[] = [];

    for (const size of sizes) {
      const res = runBenchmarkForSize(size);
      results.push(res);
    }

    console.table(
      results.map((r) => ({
        "Total Nodes": r.nodeCount,
        "Total Edges": r.edgeCount,
        "Scene Build (ms)": r.sceneBuildMs.toFixed(3),
        "Layout (ms)": r.layoutMs.toFixed(3),
        "Total (ms)": r.totalMs.toFixed(3),
        "Visible Nodes": r.visibleNodes,
        "Visible Edges": r.visibleRels,
      }))
    );

    expect(results.length).toBe(3);
    for (const res of results) {
      expect(res.visibleNodes).toBeLessThanOrEqual(10);
      // Even with 5,000 nodes, local scene composition must be ultra fast (< 25ms)
      expect(res.totalMs).toBeLessThan(25);
    }
  });
});
