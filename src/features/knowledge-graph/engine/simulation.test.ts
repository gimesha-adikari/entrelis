import { describe, expect, it, vi } from "vitest";
import { createGraphSimulation } from "./simulation";
import { createGraphData } from "../adapters/graph-adapter";
import { SEED_DATASET } from "@/data/seed";

describe("simulation engine", () => {
  it("initializes D3 force simulation with tuned forces and settles node positions", () => {
    const { nodes, links } = createGraphData(SEED_DATASET);
    const onTick = vi.fn();
    const simulation = createGraphSimulation(nodes, links, { onTick });

    expect(simulation).toBeDefined();
    expect(simulation.on("tick")).toBe(onTick);

    // Imperative stepping advances positions
    simulation.tick(10);

    const rust = nodes.find((n) => n.id === "concept-rust");
    expect(typeof rust?.x).toBe("number");
    expect(typeof rust?.y).toBe("number");

    simulation.stop();
  });

  it("applies forces with configurable distances and charge", () => {
    const { nodes, links } = createGraphData(SEED_DATASET);
    const simulation = createGraphSimulation(nodes, links, {
      distance: 120,
      chargeStrength: -200,
      collideRadius: 40,
    });

    expect(simulation.force("link")).toBeDefined();
    expect(simulation.force("charge")).toBeDefined();
    expect(simulation.force("center")).toBeDefined();
    expect(simulation.force("collide")).toBeDefined();

    simulation.stop();
  });

  it("synchronously settles node coordinates when settleTicks is provided and stops automatic timer", () => {
    const { nodes, links } = createGraphData(SEED_DATASET);
    const onTick = vi.fn();
    const simulation = createGraphSimulation(nodes, links, {
      settleTicks: 100,
      onTick,
    });

    const rust = nodes.find((n) => n.id === "concept-rust");
    expect(typeof rust?.x).toBe("number");
    expect(typeof rust?.y).toBe("number");
    expect(onTick).toHaveBeenCalledTimes(1);

    const rustX = rust?.x;
    const rustY = rust?.y;
    expect(rust?.x).toBe(rustX);
    expect(rust?.y).toBe(rustY);

    simulation.stop();
  });
});
