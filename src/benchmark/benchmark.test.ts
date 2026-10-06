import { describe, it, expect } from "vitest";
import { performance } from "node:perf_hooks";
import { forceSimulation, forceLink, forceManyBody, forceCenter } from "d3-force";
import { generateSyntheticDataset } from "./generator";
import { createGraphData, type GraphNode, type GraphLink } from "@/features/knowledge-graph";

interface D3BenchmarkResult {
  nodeCount: number;
  edgeCount: number;
  adapterMs: number;
  sim100TicksMs: number;
  neighborLookupMs: number;
}

function runBenchmarkForSize(nodeCount: number): D3BenchmarkResult {
  const dataset = generateSyntheticDataset(nodeCount);
  const edgeCount = dataset.relationships.length;
  const targetConcept = dataset.concepts[Math.floor(nodeCount / 2)];
  const targetNodeId = targetConcept ? targetConcept.id : "";

  // 1. Adapter conversion time
  const t0 = performance.now();
  const graphData = createGraphData(dataset);
  const adapterMs = performance.now() - t0;

  // 2. D3 simulation calculation (100 ticks)
  const t1 = performance.now();
  const sim = forceSimulation(graphData.nodes)
    .force(
      "link",
      forceLink<GraphNode, GraphLink>(graphData.links).id((d) => d.id)
    )
    .force("charge", forceManyBody().strength(-100))
    .force("center", forceCenter(0, 0))
    .stop();

  for (let i = 0; i < 100; i++) {
    sim.tick();
  }
  const sim100TicksMs = performance.now() - t1;

  // 3. Selection / neighbor lookup time
  const t2 = performance.now();
  const neighbors = new Set<string>();
  for (const link of graphData.links) {
    const s = typeof link.source === "object" ? link.source.id : link.source;
    const t = typeof link.target === "object" ? link.target.id : link.target;
    if (s === targetNodeId) neighbors.add(t);
    if (t === targetNodeId) neighbors.add(s);
  }
  const neighborLookupMs = performance.now() - t2;

  expect(neighbors.size).toBeGreaterThan(0);

  return {
    nodeCount,
    edgeCount,
    adapterMs,
    sim100TicksMs,
    neighborLookupMs,
  };
}

describe("D3-force Synthetic Benchmarks (Production Engine)", () => {
  it("benchmarks 50, 500, and 5,000 synthetic nodes accurately", () => {
    const sizes = [50, 500, 5000];
    const results: D3BenchmarkResult[] = [];

    for (const size of sizes) {
      const res = runBenchmarkForSize(size);
      results.push(res);
    }

    console.table(
      results.map((r) => ({
        Nodes: r.nodeCount,
        Edges: r.edgeCount,
        "Adapter (ms)": r.adapterMs.toFixed(2),
        "Sim 100 Ticks (ms)": r.sim100TicksMs.toFixed(2),
        "Neighbor Lookup (ms)": r.neighborLookupMs.toFixed(3),
      }))
    );

    expect(results.length).toBe(3);
    expect(results[0]?.nodeCount).toBe(50);
    expect(results[1]?.nodeCount).toBe(500);
    expect(results[2]?.nodeCount).toBe(5000);
    expect(results[0]?.edgeCount).toBeGreaterThan(0);
    expect(results[1]?.edgeCount).toBeGreaterThan(0);
    expect(results[2]?.edgeCount).toBeGreaterThan(0);
  });
});
