# ADR-0002: Local-Universe Deterministic Rendering

## Status

Accepted (Supercedes ADR-0001 layout strategy)

## Context

In Milestone M0.3 / M1, ADR-0001 adopted `d3-force` paired with custom HTML5 2D Canvas rendering to prove the initial interactive graph journey for a small, 7-concept dataset.

While ADR-0001 validated high-DPI Canvas drawing, smooth pan/zoom, and parallel semantic DOM accessibility, product evolution in Milestone M1.5 established a fundamental architectural principle:

> **Local universe, not global graph.**

Entrelis will eventually encompass thousands or millions of interconnected concepts. Rendering the entire knowledge graph globally in the client browser—even with viewport culling—creates fundamental product and performance failure modes:

1. **Visual clutter and lack of artistic focus**: Unconstrained physical force simulations scatter nodes haphazardly across 2D space, destroying intentional composition, focal depth, and celestial atmosphere.
2. **Computational overhead**: Iterating physics simulations across large datasets scales at $O(N \log N)$ (observed main-thread freeze of ~2.5s for 5,000 nodes in M1 benchmarks).
3. **Continuous animation churn**: Running force simulations or permanent `requestAnimationFrame` loops drains mobile battery and wastes CPU cycles even when the user is idle.

## Decision

1. **Local Universe Scene Boundary**: Decouple the knowledge dataset from the rendering pipeline. The client will never attempt to visualize the global graph. Instead, every selected concept dynamically generates a small, art-directed, bounded local scene:
   $$\text{Knowledge Dataset} \longrightarrow \text{Local Neighborhood Selector} \longrightarrow \text{Visible Universe Scene} \longrightarrow \text{Deterministic Layout} \longrightarrow \text{2D Canvas}$$
2. **Strictly Bounded Visual Complexity**:
   - Desktop: exactly 1 focus node, up to 6 direct primary neighbors, up to 3 second-degree context nodes (max 10 total).
   - Mobile: exactly 1 focus node, up to 4 direct primary neighbors, up to 1 second-degree context node (max 6 total).
   - Direct relationships culled visually by the budget policy remain 100% accessible in the semantic detail panel.
3. **Deterministic Orbital Layout**: Replace continuous D3 physics simulation with a deterministic orbital layout:
   - Selected concept sits at the focal origin (offset slightly left of center on desktop to accommodate the detail panel).
   - Direct primary neighbors arrange on an inner elliptical orbital ring using deterministic angular sectors based on relationship strength and stable concept ID hash.
   - Second-degree context concepts cluster on an outer orbital ring aligned near their parent primary neighbor.
4. **Complete Removal of `d3-force`**: `d3-force` and `@types/d3-force` are uninstalled and removed from all production runtime code, types, and benchmarks.
5. **Zero Permanent Idle Animation**: Bounded 420ms transitions animate travel between concepts via a single cubic easing curve. When the transition completes or when `prefers-reduced-motion` is enabled, `requestAnimationFrame` halts completely and CPU falls 100% idle.

## Consequences

### Positive

- **Uncompromising Spatial Beauty**: Concepts render as celestial bodies with luminous multi-layer coronas, spherical gradients, and curved quadratic Bézier relationship paths maintaining strict `SOURCE --TYPE--> TARGET` orientation.
- **Instantaneous Bounded Performance**: Local scene building and layout for 5,000 concepts executes in ~5.7ms (down from 2,480ms with D3 force simulation—a ~435× speedup).
- **Absolute Battery and Thermal Efficiency**: Zero RAF requests while idle; mobile devices experience zero battery drain when resting on a concept.
- **Predictable Spatial Orientation**: Every revisit to a concept reproduces the identical, beautiful constellation.
- **Lean Dependency Footprint**: Zero third-party graph or physics libraries required (`d3-force` removed).

### Negative / Trade-Offs

- **No Emergent Global Layout**: Users cannot pan out to inspect a giant global topology of all concepts at once. This trade-off is intentional: Entrelis is designed for intentional local knowledge journeys, not global network administration.
