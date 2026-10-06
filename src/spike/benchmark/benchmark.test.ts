import { describe, it, expect } from "vitest";
import { performance } from "node:perf_hooks";
import { forceSimulation, forceLink, forceManyBody, forceCenter } from "d3-force";
import { generateSyntheticDataset } from "./generator";
import { createD3GraphData, type D3SimulationNode, type D3SimulationLink } from "../adapters/d3";

interface D3BenchmarkResult {
  nodeCount: number;
  edgeCount: number;
  d3AdapterMs: number;
  d3Sim100TicksMs: number;
  d3NeighborLookupMs: number;
}

function runD3BenchmarkForSize(nodeCount: number): D3BenchmarkResult {
  const dataset = generateSyntheticDataset(nodeCount);
  const edgeCount = dataset.relationships.length;
  const targetConcept = dataset.concepts[Math.floor(nodeCount / 2)];
  const targetNodeId = targetConcept ? targetConcept.id : "";

  // 1. Adapter conversion time
  const t0 = performance.now();
  const d3Data = createD3GraphData(dataset);
  const d3AdapterMs = performance.now() - t0;

  // 2. D3 simulation calculation (100 ticks)
  const t1 = performance.now();
  const sim = forceSimulation(d3Data.nodes)
    .force(
      "link",
      forceLink<D3SimulationNode, D3SimulationLink>(d3Data.links).id((d) => d.id)
    )
    .force("charge", forceManyBody().strength(-100))
    .force("center", forceCenter(0, 0))
    .stop();

  for (let i = 0; i < 100; i++) {
    sim.tick();
  }
  const d3Sim100TicksMs = performance.now() - t1;

  // 3. Selection / neighbor lookup time
  const t2 = performance.now();
  const d3Neighbors = new Set<string>();
  for (const link of d3Data.links) {
    const s = typeof link.source === "object" ? link.source.id : link.source;
    const t = typeof link.target === "object" ? link.target.id : link.target;
    if (s === targetNodeId) d3Neighbors.add(t);
    if (t === targetNodeId) d3Neighbors.add(s);
  }
  const d3NeighborLookupMs = performance.now() - t2;

  expect(d3Neighbors.size).toBeGreaterThan(0);

  return {
    nodeCount,
    edgeCount,
    d3AdapterMs,
    d3Sim100TicksMs,
    d3NeighborLookupMs,
  };
}

describe("D3-force Synthetic Benchmarks (M0.3 Chosen Engine)", () => {
  it("benchmarks 50, 500, and 5,000 synthetic nodes accurately", () => {
    const sizes = [50, 500, 5000];
    const results: D3BenchmarkResult[] = [];

    for (const size of sizes) {
      const res = runD3BenchmarkForSize(size);
      results.push(res);
    }

    console.table(
      results.map((r) => ({
        Nodes: r.nodeCount,
        Edges: r.edgeCount,
        "D3 Adapter (ms)": r.d3AdapterMs.toFixed(2),
        "D3 Sim 100 Ticks (ms)": r.d3Sim100TicksMs.toFixed(2),
        "D3 Neighbor Lookup (ms)": r.d3NeighborLookupMs.toFixed(3),
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
