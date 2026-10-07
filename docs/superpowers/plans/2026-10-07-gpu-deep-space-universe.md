# GIM-30: GPU-Driven Deep-Space Universe Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a lightweight, living, deterministic GPU-driven deep-space universe background (procedural space shader + batched multi-tier star fields + restrained parallax) behind the local knowledge scene using the existing single `THREE.WebGLRenderer`.

**Architecture:** A modular `UniverseScene` encapsulates a fullscreen procedural deep-space shader (2D/2.5D noise) and three batched star fields (`StarFieldFar`, `StarFieldMid`, `StarFieldBright`) rendered via `THREE.Points` and deterministic seeded PRNG. The single production `THREE.WebGLRenderer` sequentially renders `UniverseScene` then `CelestialScene` with depth clearing. Compositing preserves Canvas 2D relationship paths and labels through clear circular node masking (`destination-out`) and DOM semantic accessibility.

**Tech Stack:** Three.js (^0.186.1), WebGL2 / GLSL shaders, React 19, TypeScript, Vitest, Next.js 16.3.8 Turbopack.

**Spec:** Linear GIM-30 / PR #5 handoff requirements in prompt.

## Global Constraints

- Exactly ONE `THREE.WebGLRenderer` instance across the entire application (zero second renderer or context).
- No volumetric raymarching; use lightweight layered 2D/2.5D procedural noise.
- Deterministic star generation using seeded PRNG (zero raw `Math.random()`).
- Subtle GPU-driven twinkle in shaders; zero per-frame JS star iteration.
- Restrained parallax derived from `ViewportTransform` (`x, y, k`).
- Single animation loop in `ProductionCelestialController`; pause on `document.hidden` without time jump.
- Under `prefers-reduced-motion: reduce`, background drift and twinkle freeze.
- Star draw calls budget: ~1 per star layer + 1 for background shader (~4 total).
- Clean disposal of universe-specific resources without disposing shared renderer or celestial resources.
- Do not migrate Canvas 2D relationship paths to WebGL.

## Review Focus

- WebGL / Canvas 2D layer order and compositing (relationships and labels stay visible; 3D bodies unobstructed).
- Viewport resize handling (proper aspect ratio, fullscreen quad sizing, orthographic camera updates).
- Star buffer determinism (identical seed yields bit-for-bit identical vertex attributes).
- Reduced-motion and page visibility pausing (zero CPU/GPU drift when paused; no time delta jump on tab resume).
- Performance budget non-regression (preserving GIM-29 16.8 ms cold navigation baseline and 30fps steady-state).

---

### Task 1: Compositing Scaffold & Canvas 2D Node Masking

**Files:**

- Modify: `src/features/knowledge-graph/rendering/universe-renderer.ts`
- Modify: `src/features/knowledge-graph/components/KnowledgeGraph.module.css`
- Modify: `src/features/knowledge-graph/components/GraphCanvas.tsx`
- Test: `src/features/knowledge-graph/rendering/canvas-renderer.test.ts`

**Interfaces:**

- Consumes: `UniverseScene`, `ViewportTransform`, `UniverseRenderOptions`
- Produces: `skipBackgroundStars` in `UniverseRenderOptions`, node masking with `destination-out` in `renderUniverseScene`, CSS layer order with WebGL canvas behind Canvas 2D.

- [ ] **Step 1: Write the failing test for node masking and star skipping**
      Add unit tests in `src/features/knowledge-graph/rendering/canvas-renderer.test.ts` verifying that when `skipBackgroundStars` is enabled, 2D stars are skipped, and when `skipBodyRendering` is enabled, relationship lines are punched out at node radii so they do not overlap celestial bodies.

- [ ] **Step 2: Run test to verify it fails**
      Run: `npx vitest run src/features/knowledge-graph/rendering/canvas-renderer.test.ts`
      Expected: FAIL (options not supported).

- [ ] **Step 3: Implement node masking and canvas layering**
      In `universe-renderer.ts`, add `skipBackgroundStars` to `UniverseRenderOptions`. When `skipBackgroundStars` is true, omit drawing 2D static stars. After drawing relationship paths and before drawing labels, punch out circular regions at `node.x, node.y` with `node.radius` using `ctx.globalCompositeOperation = "destination-out"` when `skipBodyRendering` is true.
      In `KnowledgeGraph.module.css`, adjust `.canvas` and `.productionCelestialCanvas` so the WebGL canvas sits at `z-index: 1` (with `pointer-events: none`) and the Canvas 2D canvas sits at `z-index: 2` (with transparent background and pointer events).

- [ ] **Step 4: Run test to verify it passes**
      Run: `npx vitest run src/features/knowledge-graph/rendering/canvas-renderer.test.ts`
      Expected: PASS.

- [ ] **Step 5: Verify in browser**
      Check that relationships, labels, and 3D celestial bodies remain visible and interactive.

---

### Task 2: Deterministic Seeded PRNG & Star Field Generator

**Files:**

- Create: `src/features/knowledge-graph/celestial-3d/universe/prng.ts`
- Create: `src/features/knowledge-graph/celestial-3d/universe/star-field-generator.ts`
- Test: `src/features/knowledge-graph/celestial-3d/universe/star-field.test.ts`

**Interfaces:**

- Consumes: seed number, star tier counts (`far`, `mid`, `bright`), bounds
- Produces: typed arrays / `THREE.BufferGeometry` attributes (`position`, `aSeed`, `aSize`, `aBrightness`, `aColor`)

- [ ] **Step 1: Write the failing test for deterministic star generation**
      Create `star-field.test.ts` asserting:
  - Same seed produces identical star positions, sizes, and colors.
  - Different seed produces different distributions.
  - Mobile tier produces lower counts (~700-1000 far, ~200-350 mid, ~20-40 bright) vs desktop (~1600-2200 far, ~500-800 mid, ~40-80 bright).

- [ ] **Step 2: Run test to verify it fails**
      Run: `npx vitest run src/features/knowledge-graph/celestial-3d/universe/star-field.test.ts`
      Expected: FAIL (modules not found).

- [ ] **Step 3: Implement seeded PRNG and star field generator**
      Create `prng.ts` with a 32-bit linear congruential generator / Mulberry32.
      Create `star-field-generator.ts` building `THREE.BufferGeometry` for Far, Mid, and Bright star fields with position, seed, size, brightness, and temperature color tint attributes.

- [ ] **Step 4: Run test to verify it passes**
      Run: `npx vitest run src/features/knowledge-graph/celestial-3d/universe/star-field.test.ts`
      Expected: PASS.

---

### Task 3: Deep-Space Procedural Shader & Star Shaders

**Files:**

- Create: `src/features/knowledge-graph/celestial-3d/universe/deep-space-shader.ts`
- Create: `src/features/knowledge-graph/celestial-3d/universe/star-shader.ts`
- Test: `src/features/knowledge-graph/celestial-3d/universe/shaders.test.ts`

**Interfaces:**

- Consumes: `uTime`, `uResolution`, `uParallaxOffset`, `uMotionStrength`
- Produces: `createDeepSpaceMaterial()`, `createStarMaterial(tier)`

- [ ] **Step 1: Write the failing test for shader material creation and uniforms**
      Create `shaders.test.ts` testing uniform structures, compilation viability, and reduced-motion zero motion strength behavior.

- [ ] **Step 2: Run test to verify it fails**
      Run: `npx vitest run src/features/knowledge-graph/celestial-3d/universe/shaders.test.ts`
      Expected: FAIL (modules not found).

- [ ] **Step 3: Implement deep-space procedural shader and star shaders**
      In `deep-space-shader.ts`, write GLSL with 2D/2.5D layered simplex/value noise:
  - Deep palette: near-black `#020307`, deep navy `#080b18`, dark violet `#0f0a1c`, restrained indigo `#0a1226`.
  - Faint cosmic dust and soft low-frequency luminosity variation.
    In `star-shader.ts`, write vertex & fragment shaders:
  - GPU-driven twinkle using `sin(uTime * speed + aSeed * phase)` with subtle amplitude.
  - Soft circular star point rendering with limb falloff (Gaussian / smoothstep).

- [ ] **Step 4: Run test to verify it passes**
      Run: `npx vitest run src/features/knowledge-graph/celestial-3d/universe/shaders.test.ts`
      Expected: PASS.

---

### Task 4: UniverseScene Subsystem & Parallax Management

**Files:**

- Create: `src/features/knowledge-graph/celestial-3d/universe/UniverseScene.ts`
- Create: `src/features/knowledge-graph/celestial-3d/universe/index.ts`
- Test: `src/features/knowledge-graph/celestial-3d/universe/UniverseScene.test.ts`

**Interfaces:**

- Consumes: `ViewportTransform`, `isMobile`, `prefersReducedMotion`, width/height
- Produces: `UniverseScene` class with `update(deltaSec, elapsedTime, transform)`, `resize(width, height)`, `render(renderer)`, `dispose()`

- [ ] **Step 1: Write the failing test for UniverseScene lifecycle and parallax**
      Create `UniverseScene.test.ts` testing initialization, resize updating camera & uniforms, parallax derivation from `ViewportTransform` at different depth tiers, and clean resource disposal.

- [ ] **Step 2: Run test to verify it fails**
      Run: `npx vitest run src/features/knowledge-graph/celestial-3d/universe/UniverseScene.test.ts`
      Expected: FAIL.

- [ ] **Step 3: Implement UniverseScene**
      Assemble fullscreen background quad, far/mid/bright star points, and subtle dust layer.
      Apply depth-proportional parallax offsets:
  - Nebula: 0.02x transform shift
  - Far stars: 0.04x
  - Mid stars: 0.08x
  - Bright stars: 0.14x
    Ensure complete disposal of universe geometries, materials, and textures without touching outside resources.

- [ ] **Step 4: Run test to verify it passes**
      Run: `npx vitest run src/features/knowledge-graph/celestial-3d/universe/UniverseScene.test.ts`
      Expected: PASS.

---

### Task 5: Production Controller Integration (Single Shared Renderer)

**Files:**

- Modify: `src/features/knowledge-graph/celestial-3d/production-controller.ts`
- Test: `src/features/knowledge-graph/celestial-3d/production-controller.test.ts`

**Interfaces:**

- Consumes: Single `THREE.WebGLRenderer`, `UniverseScene`
- Produces: Coordinated render sequence (`render(universeScene)` then `clearDepth()` then `render(celestialScene)`), updated lifecycle stats, unified animation loop, and clean subsystem teardown.

- [ ] **Step 1: Write the failing test for universe scene integration in controller**
      Update `production-controller.test.ts` to assert that:
  - Both universe and celestial scenes participate in rendering with 1 shared renderer.
  - Lifecycle stats expose universe draw calls and render metrics.
  - Warm cache, cold preparation, and role reuse remain 100% functional.
  - Tab hiding and reduced motion pause universe animation cleanly.

- [ ] **Step 2: Run test to verify it fails**
      Run: `npx vitest run src/features/knowledge-graph/celestial-3d/production-controller.test.ts`
      Expected: FAIL.

- [ ] **Step 3: Implement controller integration**
      Instantiate `UniverseScene` inside `ProductionCelestialController`.
      In `renderFrame(deltaSec)`:
  - Set `renderer.autoClear = false`.
  - `renderer.clear()`.
  - `universeScene.render(renderer)`.
  - `renderer.clearDepth()`.
  - `renderer.render(this.scene, this.camera)`.
    In `resize(width, height)`, pass dimensions to `universeScene.resize`.
    In `dispose()`, call `universeScene.dispose()` without leaking.

- [ ] **Step 4: Run test to verify it passes**
      Run: `npx vitest run src/features/knowledge-graph/celestial-3d/production-controller.test.ts`
      Expected: PASS.

---

### Task 6: Full Test Suite, Benchmarking & Visual Evidence

**Files:**

- Verify all tests: `npm run test`
- Verify lint, format, typecheck, build: `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm run build`
- Capture visual evidence:
  `universe_rust_desktop.png`, `universe_ownership_desktop.png`, `universe_memory_desktop.png`, `universe_operating_systems_desktop.png`, `universe_wide_desktop.png`, `universe_parallax_before.png`, `universe_parallax_after.png`, `universe_reduced_motion.png`, `universe_mobile.png`
- Benchmark transitions and steady-state performance.

- [ ] **Step 1: Run full verification suite**
      Run `npm run test`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build`.

- [ ] **Step 2: Profile post-implementation performance**
      Execute transition benchmarks (Rust → Ownership → Memory → OS → CPUs) and steady-state 20s recording.
      Verify GIM-29 baseline (16.8 ms max) and warm cache cycle.

- [ ] **Step 3: Capture all required screenshots**
      Capture desktop, mobile, reduced-motion, and parallax screenshots. Package into `screenshots.zip`.

- [ ] **Step 4: Commit and push**
      Verify `git diff --check`, commit with `feat(universe): add GPU-driven deep-space background`, push to `origin m1-5-local-universe-ui`.
