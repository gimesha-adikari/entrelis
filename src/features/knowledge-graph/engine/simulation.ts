import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type Simulation,
} from "d3-force";
import type { GraphNode, GraphLink } from "../types";

export interface SimulationOptions {
  distance?: number;
  chargeStrength?: number;
  collideRadius?: number;
  onTick?: () => void;
}

/**
 * Creates and tunes the D3 physical force simulation for the Entrelis knowledge graph.
 *
 * Forces:
 * - forceLink: Maintains edge distances between connected concepts.
 * - forceManyBody: Barnes-Hut quadtree repulsion (~O(n log n)) ensuring readable dispersion.
 * - forceCenter: Centers the network around coordinate origin (0, 0).
 * - forceCollide: Prevents concept nodes from overlapping.
 */
export function createGraphSimulation(
  nodes: GraphNode[],
  links: GraphLink[],
  options: SimulationOptions = {}
): Simulation<GraphNode, GraphLink> {
  const {
    distance = 110,
    chargeStrength = -240,
    collideRadius = 35,
    onTick,
  } = options;

  const sim = forceSimulation<GraphNode>(nodes)
    .force(
      "link",
      forceLink<GraphNode, GraphLink>(links)
        .id((d) => d.id)
        .distance(distance)
    )
    .force("charge", forceManyBody().strength(chargeStrength))
    .force("center", forceCenter(0, 0))
    .force("collide", forceCollide(collideRadius));

  if (onTick) {
    sim.on("tick", onTick);
  }

  return sim;
}
