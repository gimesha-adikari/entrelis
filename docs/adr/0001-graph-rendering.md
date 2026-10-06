# ADR-0001: Graph rendering approach

## Status

Accepted

## Context

Entrelis requires a 2D spatial graph rendering foundation for Milestone M1 to display interconnected concept networks (starting with the 7-concept chain from Rust to Transistors in M0.2).

Unlike typical network analysis tools, Entrelis is an exploratory knowledge medium that requires:

- High visual control (glowing focused nodes, variable node importance, customized directional arrows, relationship strength styling).
- Spatial stability (deterministic node coordinates to preserve the user's mental map during progressive neighborhood reveal).
- Clean Next.js App Router integration with isolated client boundaries and minimal bundle overhead.
- Parallel semantic DOM accessibility for screen readers and keyboard navigation.

In Milestone M0.3, a technical spike evaluated three primary candidate architectures:

1. **Sigma.js (`v3.0.3`)**: WebGL rendering with Graphology.
2. **Cytoscape.js (`v3.34.3`)**: Multi-layered Canvas rendering with built-in styling selectors.
3. **D3-force (`v3.0.0`) + Custom HTML5 2D Canvas**: Physics-driven layout with full drawing ownership.

## Decision

Entrelis will adopt **D3-force (`d3-force`) paired with a custom high-DPI HTML5 2D Canvas renderer** as its 2D graph rendering engine for Milestone M1.

A parallel accessible DOM architecture will mirror the visual graph state, providing semantic headings, relationship explanations, screen-reader announcements, and keyboard navigation.

## Alternatives Considered

- **Cytoscape.js (`v3.34.3`)**: Rejected due to a heavy monolithic bundle footprint, inflexible Canvas styling abstractions that hinder custom glowing halos and custom directional arrow styling, and nondeterministic layout jumps during progressive reveal.
- **Sigma.js (`v3.0.3`)**: Rejected due to high development friction for Entrelis's medium scale (10–500 visible nodes). Sigma requires custom WebGL shader boilerplate for customized node halos and directional arrow markers, splits label rendering into a secondary canvas layer, and complicates state synchronization with React.

## Consequences

### Positive

- **Complete Visual Freedom**: Direct access to the 2D Canvas API enables rich visual hierarchy (custom glows, directional arrow markers, relationship strength styling, selective label rendering) without fighting third-party library abstractions.
- **Spatial Predictability**: D3-force simulations can be frozen, precalculated, or clamped to preserve user orientation during progressive neighborhood exploration.
- **Minimal Dependency Overhead**: Retaining only `d3-force` introduces the smallest dependency footprint among evaluated options, avoiding heavy monolithic client bundles.
- **Clean Architecture**: Decoupled simulation and rendering logic integrates smoothly into standard React state and Next.js App Router client components.

### Negative / Trade-Offs

- **Self-Managed Viewport Logic**: Entrelis must own and maintain its camera math (pan, zoom, high-DPI resolution scaling, coordinate transformations, and hit testing).
- **Scale Limits for Dynamic Simulation**: While 2D Canvas easily handles local neighborhood rendering, unconstrained N-body force simulations for thousands of nodes (~O(n log n) with Barnes–Hut approximation) take noticeable computation time for dozens of ticks on the main thread (~2.1s for 5,000 nodes observed). For larger datasets in future milestones, layout calculations must be precomputed or offloaded to a Web Worker.
