import { describe, expect, it } from "vitest";
import { createGraphData } from "./graph-adapter";
import { SEED_DATASET } from "@/data/seed";

describe("graph-adapter", () => {
  it("converts KnowledgeDataset into GraphData preserving nodes and relationships", () => {
    const data = createGraphData(SEED_DATASET);
    expect(data.nodes.length).toBe(SEED_DATASET.concepts.length);
    expect(data.links.length).toBe(SEED_DATASET.relationships.length);

    const rustNode = data.nodes.find((n) => n.id === "concept-rust");
    expect(rustNode).toBeDefined();
    expect(rustNode?.slug).toBe("rust");
    expect(rustNode?.name).toBe("Rust");

    const rustOwnershipLink = data.links.find(
      (l) => l.source === "concept-rust" && l.target === "concept-ownership"
    );
    expect(rustOwnershipLink).toBeDefined();
    expect(rustOwnershipLink?.type).toBe("uses");
    expect(rustOwnershipLink?.strength).toBe("primary");
  });

  it("calculates initial geometric layout coordinates for stable initialization", () => {
    const data = createGraphData(SEED_DATASET);
    for (const node of data.nodes) {
      expect(typeof node.x).toBe("number");
      expect(typeof node.y).toBe("number");
    }
  });
});
