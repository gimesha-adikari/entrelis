# M1: Interactive Knowledge Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first production-facing Entrelis interactive knowledge journey (Rust → Ownership → Memory) using the accepted D3-force + custom HTML5 2D Canvas architecture with synchronized semantic DOM, App Router URL synchronization, and full desktop/mobile responsiveness.

**Architecture:** Next.js App Router Server Components (`/` and `/concept/[slug]`) resolve seed knowledge records and handle metadata/404s, hosting an isolated Client Component `KnowledgeGraphExperience`. The graph engine uses modular adapters, physical simulation, and high-DPI canvas rendering with a strictly decoupled simulation lifecycle (`[dataset]`), camera recentering with ease-out cubic interpolation, and synchronized bidirectional browser history navigation.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript (strict), `d3-force` (`^3.0.0`), Vitest, Testing Library.

**Spec:** Linear task GIM-16 / User prompt specifications.

## Global Constraints

- Target Node.js version: `>=22.12.0 <23`.
- Relationship direction invariant: `SOURCE --TYPE--> TARGET`.
- Simulation lifecycle invariant: Interaction state must not recreate the force simulation; selection and hover only redraw existing coordinates.
- No new runtime dependencies. No three.js, WebGL, Framer Motion, GSAP, or third-party state management/bottom-sheet libraries.
- Server Component boundary kept as high as practical; dynamic `params` handled asynchronously (`Promise<{ slug: string }>`).
- Unknown slugs produce Next.js `notFound()`.
- Responsive for desktop (~1280×800) and mobile (375×812).
- Zero console errors and warnings.

## Review Focus

1. **Direct Route Initialization:** Direct loading of `/concept/rust`, `/concept/ownership`, or `/concept/memory` initializes the graph with that concept focused and centered without requiring prior navigation from `/`.
2. **Not-Found Enforcement:** Invalid concept slug (e.g. `/concept/definitely-not-a-real-concept`) triggers Next.js `notFound()` and displays a styled 404 page rather than silently defaulting or crashing.
3. **Browser History Synchronization:** Selecting concepts updates the URL to `/concept/<slug>` via `window.history.pushState` / router without full page reloads; browser Back and Forward (`popstate`) accurately restore the focused concept and recenter the camera.
4. **Physical Simulation Decoupling:** Hovering or selecting nodes redraws canvas states against settled node coordinates without restarting physics, reheating forces, or cancelling active 300ms recentering animations.
5. **Accessibility & Reduced Motion:** Connections list inside the semantic `<aside>` serves as primary keyboard navigation path with visible focus rings and `aria-live="polite"` updates; `prefers-reduced-motion: reduce` jumps immediately without scheduling `requestAnimationFrame`.

---

## File Structure & Module Decomposition

```
src/
├── app/
│   ├── layout.tsx                     # Existing root layout
│   ├── page.tsx                       # Root route Server Component (Rust default)
│   ├── concept/
│   │   └── [slug]/
│   │       └── page.tsx               # Concept route Server Component with dynamic params
│   ├── not-found.tsx                  # Entrelis-styled 404 page
│   └── globals.css                    # Global design tokens and base styles
├── benchmark/                         # Retained synthetic layout benchmarks
│   ├── benchmark.test.ts
│   └── generator.ts
├── features/
│   └── knowledge-graph/
│       ├── types.ts                   # Viewport, node, link, render option types
│       ├── adapters/
│       │   ├── graph-adapter.ts       # Converts KnowledgeDataset to simulation graph
│       │   └── graph-adapter.test.ts  # Adapter unit tests
│       ├── engine/
│       │   ├── simulation.ts          # D3-force simulation lifecycle & settled coordinates
│       │   └── simulation.test.ts     # Invariant protection & lifecycle tests
│       ├── rendering/
│       │   ├── canvas-renderer.ts     # HiDPI Canvas drawing, glow, arrows, dimming, labels
│       │   └── hit-test.ts            # Viewport-aware point-to-node hit testing
│       ├── components/
│       │   ├── GraphCanvas.tsx        # High-DPI canvas, pointer/touch gestures, RAF camera
│       │   ├── ConceptPanel.tsx       # Semantic DOM panel, connections nav, source disclosure
│       │   ├── KnowledgeGraphExperience.tsx # Client coordinator, URL sync & history listeners
│       │   └── KnowledgeGraph.module.css    # Desktop spatial layout & mobile bottom sheet
│       └── __tests__/
│           ├── KnowledgeGraph.test.tsx      # Comprehensive component & accessibility test
│           └── routes.test.tsx              # Route resolving and not-found behavior tests
```

---

## Tasks

### Task 1: Domain Types and Graph Adapter

**Files:**

- Create: `src/features/knowledge-graph/types.ts`
- Create: `src/features/knowledge-graph/adapters/graph-adapter.ts`
- Create: `src/features/knowledge-graph/adapters/graph-adapter.test.ts`

**Interfaces:**

- Consumes: `KnowledgeDataset`, `Concept`, `Relationship` from `@/domain/knowledge/types`
- Produces: `GraphNode`, `GraphLink`, `GraphData`, `ViewportTransform`, `CanvasRenderOptions`, `createGraphData`

- [ ] **Step 1: Write the failing test for graph-adapter**

```ts
// src/features/knowledge-graph/adapters/graph-adapter.test.ts
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
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test src/features/knowledge-graph/adapters/graph-adapter.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement types and graph-adapter**

```ts
// src/features/knowledge-graph/types.ts
import type { SimulationNodeDatum, SimulationLinkDatum } from "d3-force";
import type { Concept, Relationship } from "@/domain/knowledge/types";

export interface GraphNode extends SimulationNodeDatum {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly concept: Concept;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphLink extends SimulationLinkDatum<GraphNode> {
  readonly id: string;
  readonly source: string | GraphNode;
  readonly target: string | GraphNode;
  readonly type: string;
  readonly explanation: string;
  readonly strength: "primary" | "strong" | "supporting";
  readonly relationship: Relationship;
}

export interface GraphData {
  readonly nodes: GraphNode[];
  readonly links: GraphLink[];
}

export interface ViewportTransform {
  x: number;
  y: number;
  k: number;
}

export interface CanvasRenderOptions {
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  neighborIds: ReadonlySet<string>;
  isMobile?: boolean;
}
```

```ts
// src/features/knowledge-graph/adapters/graph-adapter.ts
import type { KnowledgeDataset } from "@/domain/knowledge/types";
import type { GraphData, GraphNode, GraphLink } from "../types";

export function createGraphData(dataset: KnowledgeDataset): GraphData {
  const nodes: GraphNode[] = dataset.concepts.map((concept, index) => {
    const angle = (index / dataset.concepts.length) * 2 * Math.PI;
    const radius = 120;
    return {
      id: concept.id,
      slug: concept.slug,
      name: concept.name,
      concept,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  });

  const links: GraphLink[] = dataset.relationships.map((rel) => ({
    id: rel.id,
    source: rel.sourceConceptId,
    target: rel.targetConceptId,
    type: rel.type,
    explanation: rel.explanation,
    strength: rel.strength,
    relationship: rel,
  }));

  return { nodes, links };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test src/features/knowledge-graph/adapters/graph-adapter.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/knowledge-graph/types.ts src/features/knowledge-graph/adapters/
git commit -m "feat(graph): add production graph domain types and data adapter"
```

---

### Task 2: Simulation Engine and Invariant Protection

**Files:**

- Create: `src/features/knowledge-graph/engine/simulation.ts`
- Create: `src/features/knowledge-graph/engine/simulation.test.ts`

**Interfaces:**

- Consumes: `GraphNode`, `GraphLink`, `GraphData` from `../types`
- Produces: `createGraphSimulation`, `stopSimulation`

- [ ] **Step 1: Write the failing tests for simulation engine**

```ts
// src/features/knowledge-graph/engine/simulation.test.ts
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
    simulation.tick(10);
    expect(onTick).toHaveBeenCalled();

    const rust = nodes.find((n) => n.id === "concept-rust");
    expect(typeof rust?.x).toBe("number");
    expect(typeof rust?.y).toBe("number");

    simulation.stop();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test src/features/knowledge-graph/engine/simulation.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement simulation engine**

```ts
// src/features/knowledge-graph/engine/simulation.ts
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

export function createGraphSimulation(
  nodes: GraphNode[],
  links: GraphLink[],
  options: SimulationOptions = {}
): Simulation<GraphNode, GraphLink> {
  const { distance = 110, chargeStrength = -240, collideRadius = 35, onTick } = options;

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test src/features/knowledge-graph/engine/simulation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/knowledge-graph/engine/
git commit -m "feat(graph): add physics simulation engine with configurable forces"
```

---

### Task 3: High-DPI Canvas Rendering and Hit-Testing

**Files:**

- Create: `src/features/knowledge-graph/rendering/canvas-renderer.ts`
- Create: `src/features/knowledge-graph/rendering/hit-test.ts`
- Create: `src/features/knowledge-graph/rendering/canvas-renderer.test.ts`

**Interfaces:**

- Consumes: `GraphNode`, `GraphLink`, `GraphData`, `ViewportTransform`, `CanvasRenderOptions`
- Produces: `renderGraphCanvas`, `hitTestNode`

- [ ] **Step 1: Write the failing tests for hit-testing**

```ts
// src/features/knowledge-graph/rendering/canvas-renderer.test.ts
import { describe, expect, it } from "vitest";
import { hitTestNode } from "./hit-test";
import type { GraphNode } from "../types";

describe("hitTestNode", () => {
  const mockNode: GraphNode = {
    id: "concept-rust",
    slug: "rust",
    name: "Rust",
    concept: {} as any,
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test src/features/knowledge-graph/rendering/canvas-renderer.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement hit-test and canvas-renderer**

```ts
// src/features/knowledge-graph/rendering/hit-test.ts
import type { GraphNode, ViewportTransform } from "../types";

export function hitTestNode(
  nodes: readonly GraphNode[],
  clientX: number,
  clientY: number,
  canvasRect: DOMRect,
  transform: ViewportTransform,
  hitRadius: number = 22
): GraphNode | null {
  const { x, y, k } = transform;
  const canvasX = clientX - canvasRect.left;
  const canvasY = clientY - canvasRect.top;

  const worldX = (canvasX - canvasRect.width / 2 - x) / k;
  const worldY = (canvasY - canvasRect.height / 2 - y) / k;

  const radiusSquared = hitRadius * hitRadius;

  for (const node of nodes) {
    if (typeof node.x !== "number" || typeof node.y !== "number") continue;
    const dx = node.x - worldX;
    const dy = node.y - worldY;
    if (dx * dx + dy * dy <= radiusSquared) {
      return node;
    }
  }

  return null;
}
```

```ts
// src/features/knowledge-graph/rendering/canvas-renderer.ts
import type { GraphData, GraphNode, ViewportTransform, CanvasRenderOptions } from "../types";

export function renderGraphCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  transform: ViewportTransform,
  data: GraphData,
  options: CanvasRenderOptions
): void {
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const { selectedNodeId, hoveredNodeId, neighborIds, isMobile = false } = options;

  ctx.save();
  ctx.clearRect(0, 0, width, height);

  // Apply pan/zoom transform
  ctx.translate(width / 2 + transform.x * dpr, height / 2 + transform.y * dpr);
  ctx.scale(transform.k * dpr, transform.k * dpr);

  // 1. Draw Links
  for (const link of data.links) {
    const source = link.source as GraphNode;
    const target = link.target as GraphNode;
    if (typeof source.x !== "number" || typeof source.y !== "number") continue;
    if (typeof target.x !== "number" || typeof target.y !== "number") continue;

    const isConnected =
      Boolean(selectedNodeId) && (source.id === selectedNodeId || target.id === selectedNodeId);
    const isDimmed = Boolean(selectedNodeId) && !isConnected;

    ctx.beginPath();
    ctx.moveTo(source.x, source.y);
    ctx.lineTo(target.x, target.y);

    if (isConnected) {
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 1;
    } else if (isDimmed) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.15;
    } else {
      ctx.strokeStyle =
        link.strength === "primary" ? "rgba(96, 165, 250, 0.4)" : "rgba(255, 255, 255, 0.18)";
      ctx.lineWidth = link.strength === "primary" ? 2 : 1;
      ctx.globalAlpha = 0.6;
    }
    ctx.stroke();

    // Directional Arrow strictly on SOURCE --TYPE--> TARGET
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const angle = Math.atan2(dy, dx);
    const targetRadius = (target.id === selectedNodeId ? 18 : 12) + 2;
    const arrowX = target.x - Math.cos(angle) * targetRadius;
    const arrowY = target.y - Math.sin(angle) * targetRadius;
    const arrowLength = 7;

    ctx.beginPath();
    ctx.moveTo(arrowX, arrowY);
    ctx.lineTo(
      arrowX - arrowLength * Math.cos(angle - Math.PI / 7),
      arrowY - arrowLength * Math.sin(angle - Math.PI / 7)
    );
    ctx.lineTo(
      arrowX - arrowLength * Math.cos(angle + Math.PI / 7),
      arrowY - arrowLength * Math.sin(angle + Math.PI / 7)
    );
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
  }

  // 2. Draw Nodes
  for (const node of data.nodes) {
    if (typeof node.x !== "number" || typeof node.y !== "number") continue;

    const isSelected = node.id === selectedNodeId;
    const isNeighbor = neighborIds.has(node.id);
    const isHovered = node.id === hoveredNodeId;
    const isDimmed = Boolean(selectedNodeId) && !isSelected && !isNeighbor;

    ctx.globalAlpha = isDimmed ? 0.22 : 1.0;

    const radius = isSelected ? 18 : isHovered ? 15 : isNeighbor ? 13 : 11;

    // Glowing halo for selected concept
    if (isSelected) {
      ctx.save();
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 22;
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = "#38bdf8";
      ctx.fill();
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);

    if (isSelected) {
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#0284c7";
    } else if (isNeighbor) {
      ctx.fillStyle = "#93c5fd";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#38bdf8";
    } else if (isDimmed) {
      ctx.fillStyle = "rgba(51, 65, 85, 0.4)";
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    } else {
      ctx.fillStyle = "#60a5fa";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#bfdbfe";
    }
    ctx.stroke();

    // 3. Selective Labels
    // Desktop: selected and neighbor labels; distant labels suppressed when dimmed.
    // Mobile: distant labels strictly suppressed.
    const shouldDrawLabel = isSelected || isNeighbor || (!selectedNodeId && !isMobile);

    if (shouldDrawLabel && !isDimmed) {
      ctx.font = isSelected
        ? "bold 13px system-ui, -apple-system, sans-serif"
        : "12px system-ui, -apple-system, sans-serif";
      ctx.fillStyle = isSelected ? "#f8fafc" : isNeighbor ? "#e2e8f0" : "#cbd5e1";
      ctx.textAlign = "center";
      ctx.fillText(node.name, node.x, node.y + radius + 14);
    }
  }

  ctx.restore();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test src/features/knowledge-graph/rendering/canvas-renderer.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/knowledge-graph/rendering/
git commit -m "feat(graph): add high-DPI canvas renderer and hit-testing engine"
```

---

### Task 4: Interactive GraphCanvas Component

**Files:**

- Create: `src/features/knowledge-graph/components/GraphCanvas.tsx`
- Modify: `src/features/knowledge-graph/components/KnowledgeGraph.module.css`

**Interfaces:**

- Consumes: `GraphData`, `ViewportTransform`, `renderGraphCanvas`, `hitTestNode`
- Produces: `GraphCanvas` component

- [ ] **Step 1: Implement GraphCanvas**
  - High-DPI canvas backing with `ResizeObserver`.
  - Invariant lifecycle decoupling: simulation tick and window resize invoke stable `drawRef.current()`.
  - Mouse/touch drag with anchor-based distance threshold (<5px mouse, <8px touch).
  - Recenter animation: 300ms ease-out cubic `requestAnimationFrame` moving camera to selected node target `(-node.x * k, -node.y * k)`.
  - Immediate snap if `prefers-reduced-motion: reduce`.
  - Cancel animation on user pan, zoom, or unmount.

- [ ] **Step 2: Commit**

```bash
git add src/features/knowledge-graph/components/GraphCanvas.tsx src/features/knowledge-graph/components/KnowledgeGraph.module.css
git commit -m "feat(graph): add interactive GraphCanvas component with gesture and camera handling"
```

---

### Task 5: Semantic Concept Detail Panel & Provenance UI

**Files:**

- Create: `src/features/knowledge-graph/components/ConceptPanel.tsx`
- Modify: `src/features/knowledge-graph/components/KnowledgeGraph.module.css`

**Interfaces:**

- Consumes: `Concept`, `Relationship`, `Source`, `KnowledgeDataset`
- Produces: `ConceptPanel` component

- [ ] **Step 1: Implement ConceptPanel**
  - Semantic `<aside aria-label="Selected Concept Details">`.
  - Live announcement region `aria-live="polite"`.
  - Category / domain tags.
  - Title, `shortDescription`, `description`.
  - Directed Connections section (`<nav aria-label="Concept Connections">`):
    - Lists connections with strictly preserved `Source --type--> Target`.
    - Clicking connected concept name triggers `onSelectConcept(otherConcept.slug)`.
    - Shows explanation and strength badge.
  - Source disclosure:
    - `<details className={styles.sourcesDisclosure}><summary>Sources · {count}</summary>...`
    - Bibliographic title, publisher, author, date.
    - External link: `<a href={source.url} target="_blank" rel="noreferrer noopener">View Source ↗</a>`.
- [ ] **Step 2: Commit**

```bash
git add src/features/knowledge-graph/components/ConceptPanel.tsx src/features/knowledge-graph/components/KnowledgeGraph.module.css
git commit -m "feat(graph): add semantic concept detail panel with connections and provenance"
```

---

### Task 6: KnowledgeGraphExperience Coordinator & Browser History Sync

**Files:**

- Create: `src/features/knowledge-graph/components/KnowledgeGraphExperience.tsx`
- Create: `src/features/knowledge-graph/index.ts`
- Modify: `src/features/knowledge-graph/components/KnowledgeGraph.module.css`

**Interfaces:**

- Consumes: `KnowledgeDataset`, `GraphCanvas`, `ConceptPanel`
- Produces: `KnowledgeGraphExperience` component
- Behavior:
  - Synchronizes selection with URL (`/concept/[slug]` and `/`).
  - Listens to `popstate` to restore selected concept on browser back/forward without full reload.
  - Calling `selectConcept(slug)` pushes `/concept/${slug}` to `window.history.pushState` and updates state.
  - Reset View returns selection to Rust and camera to origin `(0, 0, 1)`.

- [ ] **Step 1: Implement KnowledgeGraphExperience**
- [ ] **Step 2: Commit**

```bash
git add src/features/knowledge-graph/components/KnowledgeGraphExperience.tsx src/features/knowledge-graph/index.ts
git commit -m "feat(graph): add KnowledgeGraphExperience coordinator with URL and history sync"
```

---

### Task 7: Production App Routes (`/` and `/concept/[slug]`) and 404 Page

**Files:**

- Modify: `src/app/page.tsx`
- Create: `src/app/concept/[slug]/page.tsx`
- Create: `src/app/not-found.tsx`
- Create: `src/app/not-found.module.css`
- Modify: `src/app/page.test.tsx`

**Interfaces:**

- Server Components resolving concepts from `SEED_DATASET`.
- `page.tsx` renders `<KnowledgeGraphExperience initialSlug="rust" />`.
- `concept/[slug]/page.tsx` parses async `params.slug`:
  - If valid concept: renders `<KnowledgeGraphExperience initialSlug={concept.slug} />`.
  - If invalid: calls `notFound()`.
- `not-found.tsx`: Styled 404 page ("Concept Not Found in Knowledge Network").

- [ ] **Step 1: Implement routes, not-found, and tests**
- [ ] **Step 2: Run test suite**
- [ ] **Step 3: Commit**

```bash
git add src/app/
git commit -m "feat(app): configure production routes for root, concept slugs, and 404"
```

---

### Task 8: Cleanup Spike Routes & Migrate Synthetic Benchmarks

**Files:**

- Remove: `src/app/spike/` (all 4 spike pages, layout, and CSS)
- Remove: `src/spike/components/` (old spike prototype component and tests)
- Migrate / Retain: `src/benchmark/benchmark.test.ts` and `src/benchmark/generator.ts` (retaining the O(n log n) Barnes-Hut benchmark test)
- Delete: `src/spike/`
- Delete: `src/app/page.module.css`

- [ ] **Step 1: Clean up spike artifacts and migrate benchmarks**
- [ ] **Step 2: Run tests and build to ensure no broken imports**
- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor(cleanup): remove temporary spike routes and migrate benchmark fixtures"
```

---

### Task 9: Comprehensive Feature Tests

**Files:**

- Create: `src/features/knowledge-graph/__tests__/KnowledgeGraph.test.tsx`
- Create: `src/features/knowledge-graph/__tests__/routes.test.tsx`

**Coverage:**

- Root resolves to Rust selection.
- Route `/concept/ownership` and `/concept/memory` load with correct concept.
- Invalid concept slug triggers `notFound()`.
- Connected concept clicking updates selected concept and URL.
- Relationship direction is preserved in the DOM (`Source --type--> Target`).
- Source disclosure reveals bibliographic metadata (title, publisher, URL).
- D3 force simulation is instantiated once per dataset; selection/hover do NOT recreate it.
- Unmount cleans up simulation and listeners.
- `prefers-reduced-motion` suppresses animation frame scheduling.

- [ ] **Step 1: Write and run comprehensive tests**
- [ ] **Step 2: Verify all tests pass**
- [ ] **Step 3: Commit**

```bash
git add src/features/knowledge-graph/__tests__/
git commit -m "test(graph): add comprehensive integration, lifecycle, and route tests"
```

---

### Task 10: Documentation & Validation

**Files:**

- Modify: `README.md`
- Modify: `docs/PLAN.md`

- [ ] **Step 1: Update documentation to document M1 production architecture**
- [ ] **Step 2: Run full verification pipeline (`format:check`, `lint`, `typecheck`, `test`, `build`)**
- [ ] **Step 3: Browser inspection (Desktop 1280×800 and Mobile 375×812) using Chrome DevTools MCP**
- [ ] **Step 4: Commit and push branch `m1-interactive-knowledge-journey`**
- [ ] **Step 5: Create Pull Request for M1**
