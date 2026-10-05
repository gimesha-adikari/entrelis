# M0.3 Graph Rendering Evaluation Spike

## Goal

This technical decision spike evaluates 2D graph rendering approaches to select the architectural foundation for Entrelis Milestone M1. Entrelis is an interactive knowledge exploration medium where ideas connect into a coherent network rather than isolated encyclopedic articles. The rendering engine must support continuous spatial exploration, expressive visual hierarchy, cinematic transitions, and stable mental models across desktop and mobile devices.

The evaluation was performed against the real Entrelis M0.2 curated dataset (`SEED_DATASET` comprising 7 concepts and 8 directed relationships from Rust to Transistors) along with synthetic benchmarks at 50, 500, and 5,000 nodes.

---

## Requirements

Entrelis has domain-specific interaction and visual needs that distinguish it from standard network telemetry or graph analysis tools:

1. **Full-Screen Spatial Exploration:** Smooth panning, zooming, and camera transitions across varying node densities.
2. **Selective Visual Hierarchy:** Glowing focused nodes, emphasized 1st-degree neighbors, dimmed unrelated nodes, and variable node importance.
3. **Directional Semantics:** Explicit visualization of directed relationships strictly adhering to the `SOURCE --TYPE--> TARGET` invariant.
4. **Relationship Storytelling:** Contextual display of relationship types and rich explanations alongside node focus.
5. **Spatial Stability & Mental Map:** Deterministic node coordinates and predictable layout behavior to support progressive neighborhood reveal without disorienting layout reshuffling.
6. **Mobile Interaction:** Responsive viewport adaptation (tested at 375×812), touch gesture support (single-finger pan, tap selection), and separation of graph canvas from DOM details.
7. **Accessibility Parallelism:** Complete DOM-level accessibility (semantic detail panels, relationship summaries, screen-reader announcements, keyboard navigation) paired alongside visual canvas/WebGL.
8. **Modern Next.js Architecture:** Clean client-component boundaries without SSR hydration conflicts, browser-only isolation, and minimal bundle overhead.

---

## Candidates

| Candidate                    | Version Evaluated | Rendering Technology       | Core Ecosystem Packages                                            |
| :--------------------------- | :---------------- | :------------------------- | :----------------------------------------------------------------- |
| **Sigma.js**                 | `v3.0.3`          | WebGL 2 / WebGL            | `sigma`, `graphology` (`v0.26.0`), `graphology-layout-forceatlas2` |
| **Cytoscape.js**             | `v3.34.3`         | Multi-layered HTML5 Canvas | `cytoscape`, `@types/cytoscape`                                    |
| **D3-force + Custom Canvas** | `v3.0.0`          | High-DPI HTML5 Canvas (2D) | `d3-force`, `d3-zoom`, `@types/d3-force`, `@types/d3-zoom`         |

_Evaluation date: October 2026._

---

## Prototype Implementation

Each candidate was evaluated using an isolated adapter pattern that converted `KnowledgeDataset` (`SEED_DATASET`) into renderer-specific representations without contaminating the core domain types (`Concept`, `Relationship`):

- **Sigma.js Adapter (`src/spike/adapters/sigma.ts`):** Constructed a directed `graphology` instance. Concepts were mapped to nodes with geometric positions and colors; relationships were mapped to directed edges with arrow attributes. State reducers (`nodeReducer`, `edgeReducer`) adjusted size, color, and label visibility reactively.
- **Cytoscape.js Adapter (`src/spike/adapters/cytoscape.ts`):** Generated Cytoscape element definitions (`group: "nodes"`, `group: "edges"`). Visual styling was declared via Cytoscape's CSS-like selectors (`node.selected`, `node.neighbor`, `node.dimmed`, `edge.highlighted`), driven by Cytoscape batch classes.
- **D3-force Adapter (`src/spike/adapters/d3.ts`):** Converted concepts to `SimulationNode` objects and relationships to `SimulationLink` objects. An explicit high-DPI HTML5 2D Canvas rendering loop handled node drawing, glow halos, directional arrows, curved strokes, and label typography.

All three adapters strictly enforced the directional invariant:
`Rust --uses--> Ownership --manages--> Memory --includes--> Stack & Heap --depends-on--> Operating Systems --depends-on--> CPUs --implemented-with--> Transistors`.

---

## Interaction Comparison

| Interaction Feature        | Sigma.js                                                      | Cytoscape.js                                                  | D3-force + Custom Canvas                                               |
| :------------------------- | :------------------------------------------------------------ | :------------------------------------------------------------ | :--------------------------------------------------------------------- |
| **Pan & Zoom**             | Built-in mouse & touch camera controls.                       | Built-in multi-touch & wheel gestures.                        | Implemented via mouse/touch drag and wheel zoom with transform matrix. |
| **Node Focus & Selection** | `clickNode` event; camera animated with `camera.animate()`.   | `tap` event; animated via `cy.animate({ center, zoom })`.     | Click/tap hit-testing via inverse transform; animated state redraw.    |
| **Neighbor Highlighting**  | Evaluated via `nodeReducer` and `edgeReducer` on `refresh()`. | Evaluated via `node.neighborhood()` + batch class assignment. | Evaluated via Set membership lookups in 60 FPS draw pass.              |
| **Unrelated Dimming**      | Muted node colors and blanked label strings in `nodeReducer`. | Handled via `.dimmed` CSS selector class (reduced opacity).   | Rendered with subtle alpha (`0.15` line opacity, muted border).        |
| **Selected Node Recenter** | Native `camera.animate()` with ease and duration.             | Native `cy.animate()` targeting node element.                 | Smooth matrix interpolation to target coordinate.                      |
| **Reset View**             | Resets camera to `(0.5, 0.5)` ratio 1.                        | `cy.animate({ fit })`.                                        | Resets transform matrix to `(0, 0)` scale 1.                           |

---

## Visual Control

Entrelis requires nuanced visual design: glowing halos for active concepts, relationship strength-based line weights, directional markers, and selective label display.

- **Sigma.js:**
  - _Hardest to customize._ Sigma renders nodes and edges using fixed WebGL shader programs. Adding custom outer glow halos or multi-colored directional arrows requires writing custom WebGL vertex and fragment shaders.
  - Labels are rendered onto an HTML5 Canvas overlay separate from the WebGL context, leading to potential layering discrepancies during fast camera motion.
- **Cytoscape.js:**
  - _Moderately flexible._ Cytoscape offers a declarative styling stylesheet syntax (`background-color`, `border-width`, `target-arrow-shape`).
  - Limitations: Creating rich visual treatments like radial gradients, soft blur halos, or animated dashes requires canvas extensions (`cytoscape-canvas`) or complex SVG background workarounds.
- **D3-force + Custom Canvas:**
  - _Maximum visual freedom._ Because Entrelis controls the 2D Canvas drawing context directly:
    - Glowing halos (`ctx.shadowColor = "#38bdf8"; ctx.shadowBlur = 18;`) were trivial to add.
    - Directional arrowheads with exact trigonometric offsets around variable-radius node circles were straightforward.
    - Relationship strength (`primary`, `strong`, `supporting`) directly modulated line thickness and alpha without fighting library abstractions.
    - Labels display conditionally based on focus state with crisp typography.

---

## Layout & Spatial Stability

A core Entrelis design principle is **spatial stability**: as a user navigates between concepts, the mental map must remain coherent. Unpredictable force layouts that reshuffle every time a node is clicked destroy user orientation.

- **Sigma.js:** Primarily relies on external Graphology layout algorithms (`graphology-layout-forceatlas2`). Layout calculation is typically run as an offline or synchronous step that writes `x, y` attributes to nodes. Very stable once coordinates are written, but dynamic progressive neighborhood addition requires carefully tuned incremental force passes.
- **Cytoscape.js:** Built-in layouts (`circle`, `grid`, `cose`, `concentric`). The force-directed `cose` layout is computationally heavy and produces nondeterministic positioning across runs unless initialized with saved coordinates.
- **D3-force:**
  - Highly tunable physical forces (`forceLink`, `forceManyBody`, `forceCenter`, `forceCollide`).
  - Simulation can be run for a fixed tick count (e.g. 100 ticks) and frozen immediately (`simulation.stop()`).
  - Node coordinates (`x, y`) can be directly saved, stored in fixtures/databases, and reused.
  - Supports smooth coordinate interpolation when progressively revealing new neighbors, ensuring the existing graph nodes remain locked or gently ease into position without chaotic spring bouncing.

---

## Performance Experiment

### Measured Benchmark Data

Automated synthetic benchmarks were executed in `src/spike/benchmark/benchmark.test.ts` across sparse graph topologies at three scales (50, 500, and 5,000 nodes). All timings represent real node runtime measurements:

| Nodes     | Edges | Sigma Adapter (ms) | Cytoscape Adapter (ms) | D3 Adapter (ms) | D3 Sim 100 Ticks (ms) | Sigma Neighbor Lookup (ms) | Cytoscape Neighbor Lookup (ms) | D3 Neighbor Lookup (ms) |
| :-------- | :---- | :----------------- | :--------------------- | :-------------- | :-------------------- | :------------------------- | :----------------------------- | :---------------------- |
| **50**    | 65    | 1.19 ms            | 0.17 ms                | 0.18 ms         | 21.86 ms              | 0.292 ms                   | 0.038 ms                       | 0.012 ms                |
| **500**   | 665   | 2.78 ms            | 0.16 ms                | 0.16 ms         | 138.87 ms             | 0.043 ms                   | 0.069 ms                       | 0.043 ms                |
| **5,000** | 6,665 | 18.08 ms           | 1.50 ms                | 1.46 ms         | 2,183.29 ms           | 0.049 ms                   | 0.789 ms                       | 0.610 ms                |

### Qualitative Observations & Analysis

1. **Adapter Conversion:** Converting domain datasets to D3 and Cytoscape formats is near-instant (< 1.5 ms even at 5,000 nodes). Graphology graph instantiation has higher object allocation overhead (18.08 ms at 5,000 nodes) due to dual index structures.
2. **Neighbor Lookups:** Graphology's indexed adjacency structure and D3's Set-based queries are both sub-millisecond across all scales.
3. **Layout Cost:** Running 100 ticks of D3's n-body charge simulation takes 21.8 ms for 50 nodes and 138.9 ms for 500 nodes. At 5,000 nodes, unconstrained n-body charge scales quadratically (~2.18 s), indicating that for future large graphs, layout calculation must be precomputed or offloaded to a Web Worker.
4. **Rendering Throughput:**
   - **Sigma (WebGL):** Unmatched raw capacity for 10,000+ nodes rendered simultaneously.
   - **Cytoscape & Canvas:** Effortlessly renders 500–1,000 nodes at a consistent 60 FPS.
   - For Entrelis, typical active viewport displays will focus on a local neighborhood (10 to 60 nodes) within a broader network, making 2D Canvas performance optimal.

---

## Mobile Evaluation

All prototypes were tested at **375 × 812** viewport resolution using browser emulation:

- **Layout Structure:** On desktop, the viewport and detail panel sit side-by-side (`row`). On mobile, the graph viewport occupies the upper 55vh, while the semantic detail panel scrolls naturally beneath (`column`).
- **Touch Interaction:**
  - With `touch-action: none` configured on the canvas wrapper, touch dragging on D3 and Cytoscape allowed responsive single-finger panning without triggering unwanted browser page scrolling.
  - Tap target hit-testing with a 20px radius proved reliable on mobile touch screens for selecting nodes.
  - Detail panels remained legible and accessible on narrow screens with zero overflow.

---

## Accessibility Architecture

Canvas and WebGL elements are fundamentally non-semantic drawing surfaces. Attempting to inject invisible pseudo-DOM elements directly inside canvas viewports is fragile and leads to poor assistive technology support.

### Recommended Dual-Representation Architecture

Entrelis will maintain an accessible DOM representation synchronized with the visual graph:

```
                  ┌────────────────────────────────────────┐
                  │            KnowledgeDataset            │
                  └───────────────────┬────────────────────┘
                                      │
               ┌──────────────────────┴──────────────────────┐
               ▼                                             ▼
┌──────────────────────────────┐              ┌──────────────────────────────┐
│     Visual Canvas Graph      │              │      Semantic DOM Tree       │
├──────────────────────────────┤              ├──────────────────────────────┤
│ • 2D Canvas rendering        │              │ • Concept detail panel (<aside>)
│ • Glowing focus nodes        │ synchronized │ • Connected relationship list│
│ • Camera transitions         │ ◄──────────► │ • Accessible headings (h3/h4)│
│ • Visual arrowheads          │  via State   │ • ARIA live region           │
│ • Progressive reveal         │              │ • Keyboard navigation        │
└──────────────────────────────┘              └──────────────────────────────┘
```

1. **Semantic Detail Panel:** The active concept is rendered in an `<aside aria-label="Selected Concept Details">` containing semantic headings (`<h3>`, `<h4>`) and structured relationship descriptions.
2. **Live Announcements:** An `aria-live="polite"` region announces the focused concept and its degree of connection when selection changes.
3. **Keyboard Navigation:** Tab-accessible concept cards allow users to cycle through connected neighbors using `Tab` and `Enter`, driving both the DOM panel and the camera viewport.
4. **Reduced Motion:** Adheres to `prefers-reduced-motion` media query by disabling camera pan/zoom animations and instantly setting the transform matrix.

---

## Next.js Integration & SSR

All three candidates depend on browser-only APIs (`window`, `HTMLCanvasElement`, `WebGLRenderingContext`).

- **Client Boundary:** Graph views must be Client Components (`"use client"`). In Next.js 16 (Turbopack), `next/dynamic` with `{ ssr: false }` must be called from within a client component boundary.
- **Server Components:** The surrounding Entrelis application (knowledge dataset loading, metadata generation, navigation shells, breadcrumbs) remains 100% Server Components.
- **Hydration & Cleanup:** Canvas ref lifecycle cleanly mounts inside `useEffect` and terminates all simulation timers and event listeners on unmount.

---

## Dependencies & Bundle Impact

### Candidate Bundle Contributions

| Candidate Package          | Production Bundle Contribution (Minified + Gzip) | Companion Requirements                             |
| :------------------------- | :----------------------------------------------- | :------------------------------------------------- |
| **`d3-force` + `d3-zoom`** | **~10 kB**                                       | Zero companion dependencies.                       |
| **`cytoscape`**            | **~120 kB**                                      | Monolithic bundle with built-in layout algorithms. |
| **`sigma` + `graphology`** | **~60 kB**                                       | Requires `graphology`, layout companion libraries. |

D3-force offers a ~12x reduction in client bundle size compared to Cytoscape.js.

---

## Scorecard

Each candidate was scored across key architectural criteria (1–5 scale, where 5 is optimal):

| Criteria                           |  Weight  | Sigma.js | Cytoscape.js | D3-force + Canvas | Notes                                                                                  |
| :--------------------------------- | :------: | :------: | :----------: | :---------------: | :------------------------------------------------------------------------------------- |
| **Visual Flexibility**             |   20%    |    2     |      3       |       **5**       | D3 Canvas allows glowing halos, custom arrows, and styling with zero library fighting. |
| **Interaction & Focus Control**    |   15%    |    4     |      4       |       **4**       | All support pan/zoom/recenter; D3 allows customized easing curves.                     |
| **Spatial Layout Stability**       |   15%    |    4     |      3       |       **5**       | D3 force coordinates can be frozen, precomputed, or gently eased.                      |
| **Progressive Reveal Suitability** |   10%    |    3     |      3       |       **5**       | D3 enables pin-point coordinate control as new neighbors unlock.                       |
| **Bundle & Dependency Cost**       |   10%    |    3     |      1       |       **5**       | D3 is ~10 kB gzipped vs Cytoscape's ~120 kB and Sigma's ~60 kB.                        |
| **Next.js / React Integration**    |   10%    |    2     |      3       |       **5**       | Canvas ref integrates cleanly without multi-canvas DOM injection.                      |
| **Accessibility Integration**      |   10%    |    4     |      4       |       **4**       | All cleanly decouple to a parallel semantic DOM tree.                                  |
| **Performance Headroom**           |   10%    |  **5**   |      3       |         4         | Sigma excels at 50,000+ nodes; D3 Canvas easily handles Entrelis's scale.              |
| **Weighted Total**                 | **100%** | **3.20** |   **3.05**   |     **4.65**      |                                                                                        |

---

## Recommendation

**Recommended: Lightweight D3-force + Custom HTML5 Canvas (HiDPI)**

Entrelis should adopt a tailored **D3-force simulation driving a custom HTML5 2D Canvas renderer** for Milestone M1.

### Three Strongest Reasons

1. **Uncompromised Visual Hierarchy:** Entrelis is a knowledge exploration experience, not an IT network debugger. Direct ownership of the 2D Canvas context enables glowing concept nodes, custom directional arrows, subtle link alpha gradients, and relationship strength styling without wrestling with rigid library CSS or WebGL shader boilerplate.
2. **Spatial Stability & Progressive Reveal:** D3-force simulations can be stepped, stopped, precomputed, or locked deterministically. This guarantees that as users explore connected ideas, existing nodes maintain their mental map positions rather than chaotically jumping.
3. **Minimal Bundle Footprint:** At ~10 kB gzipped, `d3-force` + `d3-zoom` provides an ultra-lightweight client footprint, keeping initial page load fast and avoiding the 120 kB overhead of monolithic alternatives.

### Why Not Cytoscape.js?

Cytoscape.js is a heavyweight graph-theory library (~120 kB gzipped) designed for desktop-style network analysis. Its declarative styling makes advanced visual effects (glows, dynamic halos, custom arrowheads) difficult to implement without writing canvas plugin extensions. Its force layouts (`cose`) are computationally heavy and lack the spatial determinism needed for Entrelis.

### Why Not Sigma.js?

Sigma.js is engineered for massive graph rendering (50,000+ nodes) using WebGL. However, for Entrelis's medium-scale knowledge neighborhoods (10–500 visible nodes), its WebGL architecture imposes severe friction: custom node halos and arrowheads require custom WebGL shaders, label rendering is split across a secondary Canvas layer, and camera lifecycle is cumbersome to synchronize with React state.

---

## Risks & M1 Validation Plan

1. **Self-Managed Viewport Math:** Because D3 does not provide a turnkey camera API, pan/zoom clamping, high-DPI scaling, and coordinate transformations must be cleanly encapsulated in an M1 viewport hook.
2. **Layout Scalability for Large Datasets:** As the dataset expands beyond 1,000 concepts in later milestones, running dynamic force simulations on the main thread could cause frame drops. M1 should support precomputed layout coordinates or run force simulations in a Web Worker.
3. **Hit-Testing Precision:** On high-density graphs, circular hit-testing must account for variable node sizes and edge click zones.
