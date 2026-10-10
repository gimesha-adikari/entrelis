import { describe, it, expect } from "vitest";
import { performance } from "node:perf_hooks";
import { generateSyntheticDataset } from "./generator";
import {
  createKnowledgeGraphIndex,
  buildLocalUniverseScene,
  layoutLocalUniverseScene,
} from "@/features/knowledge-graph";

interface BenchmarkSummary {
  nodeCount: number;
  edgeCount: number;
  indexBuildMs: number;
  navMedianMs: number;
  navMinMs: number;
  navMaxMs: number;
  visibleNodes: number;
  visibleRels: number;
}

function runBenchmarkForSize(nodeCount: number): BenchmarkSummary {
  const dataset = generateSyntheticDataset(nodeCount);
  const edgeCount = dataset.relationships.length;

  // 1. One-time dataset indexing (scales with total dataset size)
  const t0 = performance.now();
  const index = createKnowledgeGraphIndex(dataset);
  const indexBuildMs = performance.now() - t0;

  expect(index.conceptById.size).toBe(nodeCount);

  // 2. Per-navigation local scene construction (measured across multiple focus points)
  const sampleIndices = [
    0,
    Math.floor(nodeCount * 0.25),
    Math.floor(nodeCount * 0.5),
    Math.floor(nodeCount * 0.75),
    nodeCount - 1,
  ];

  const navTimes: number[] = [];
  let sampleVisibleNodes = 0;
  let sampleVisibleRels = 0;

  for (const idx of sampleIndices) {
    const concept = dataset.concepts[idx];
    if (!concept) continue;

    const navStart = performance.now();
    const scene = buildLocalUniverseScene({
      index,
      focusSlug: concept.slug,
      isMobile: false,
    });
    const laidOutScene = layoutLocalUniverseScene(scene, {
      viewportWidth: 1280,
      viewportHeight: 800,
      isMobile: false,
    });
    const navDuration = performance.now() - navStart;
    navTimes.push(navDuration);

    sampleVisibleNodes = laidOutScene.allNodes.length;
    sampleVisibleRels = laidOutScene.relationships.length;

    // Structural invariant: local scene complexity is strictly bounded
    expect(laidOutScene.allNodes.length).toBeLessThanOrEqual(10);
    expect(laidOutScene.primaryNodes.length).toBeLessThanOrEqual(6);
    expect(laidOutScene.contextNodes.length).toBeLessThanOrEqual(3);
    expect(laidOutScene.focus.id).toBe(concept.id);
  }

  navTimes.sort((a, b) => a - b);
  const navMedianMs = navTimes[Math.floor(navTimes.length / 2)] ?? 0;
  const navMinMs = navTimes[0] ?? 0;
  const navMaxMs = navTimes[navTimes.length - 1] ?? 0;

  return {
    nodeCount,
    edgeCount,
    indexBuildMs,
    navMedianMs,
    navMinMs,
    navMaxMs,
    visibleNodes: sampleVisibleNodes,
    visibleRels: sampleVisibleRels,
  };
}

describe("Local Universe Synthetic Benchmarks (Production Engine)", () => {
  it("benchmarks 50, 500, and 5,000 synthetic nodes with strictly bounded scene complexity", () => {
    const sizes = [50, 500, 5000];
    const results: BenchmarkSummary[] = [];

    for (const size of sizes) {
      const res = runBenchmarkForSize(size);
      results.push(res);
    }

    // Benchmark summary table for evidence logging
    console.table(
      results.map((r) => ({
        "Total Nodes": r.nodeCount,
        "Total Edges": r.edgeCount,
        "Index Build (ms)": r.indexBuildMs.toFixed(3),
        "Nav Median (ms)": r.navMedianMs.toFixed(3),
        "Nav Min-Max (ms)": `${r.navMinMs.toFixed(3)} - ${r.navMaxMs.toFixed(3)}`,
        "Visible Nodes": r.visibleNodes,
        "Visible Edges": r.visibleRels,
      }))
    );

    // Assert strictly structural invariants (no brittle wall-clock pass/fail thresholds)
    expect(results.length).toBe(3);
    for (const res of results) {
      expect(res.visibleNodes).toBeGreaterThan(0);
      expect(res.visibleNodes).toBeLessThanOrEqual(10);
    }
  });
});
