# Celestial Archetype Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a modular, reusable 3D celestial identity and archetype catalog in Three.js featuring diverse stars, rocky worlds, life worlds, gas giants, ringed worlds, metallic worlds, crystal worlds, and irregular asteroids with visual attachments (rings, moons, debris) and LOD support, showcased in `/lab/celestial-3d`.

**Architecture:** Separate concept identity (`CelestialIdentity`) from scene role (`focus`, `primary`, `context`). Implement distinct procedural generation algorithms for each archetype family with zero recolor reuse. Refactor the monolithic controller into modular archetypes, attachments, procedural generators, and shaders. Showcase both the full archetype catalog and the curated 7 Entrelis concept identities in the isolated `/lab/celestial-3d` lab surface.

**Tech Stack:** Three.js (v0.186.1), WebGL, GLSL Shaders, Next.js 16 (App Router), React 19, TypeScript 5, Vitest.

**Spec:** User prompt specification for GIM-18 — M1.5a Celestial Archetype Catalog.

## Global Constraints

- Work strictly on branch `m1-5-local-universe-ui`.
- PR #5 remains open; do NOT merge.
- Do NOT integrate into production graph scene (`GraphCanvas`) or replace `CelestialNode` yet.
- Do NOT redesign graph paths, panel, background, search, or routing.
- Two different archetype families must NEVER share the same procedural texture generator with only a color swap.
- All procedural generation must be 100% deterministic based on seeds (zero `Math.random()`).
- Attachments (rings, moons, debris) are visual attachments, not clickable knowledge nodes.
- Performance baseline: single WebGL renderer, 30fps frame throttling, DPR capped at 2, tab visibility pause, reduced motion freezing animations.
- Full resource disposal on unmount.

## Review Focus

1. **Equirectangular distortion / polar pinching**: Every spherical procedural generator must sample 3D space on the unit sphere $(p_x, p_y, p_z) = (\sin\phi \cos\theta, \cos\phi, \sin\phi \sin\theta)$ to prevent distorted poles.
2. **Ring 3D occlusion**: Transparent ring planes must respect depth testing so the planetary sphere occludes the ring's rear half while the front half renders cleanly in front.
3. **Asteroid silhouette irregularity**: Asteroids must use true deformed 3D geometry (`IcosahedronGeometry` with 3D noise vertex displacement and crater indentations), not spherical meshes with bump maps.
4. **Life World multi-layer synchronization**: Life World must assemble surface + cloud shell + atmosphere shell where the cloud shell rotates at a distinct differential speed without z-fighting.
5. **Reduced motion completeness**: When `prefers-reduced-motion: reduce` is active, all continuous RAF execution must halt and planetary rotations, differential clouds/atmospheres, moon orbits, and star corona breathing must freeze in a static frame.

---

### Task 1: Type Definitions & Seed Concept Identity Mapping

**Files:**
- Create: `src/features/knowledge-graph/celestial-3d/identity.ts`
- Test: `src/features/knowledge-graph/celestial-3d/identity.test.ts`

**Interfaces:**
- Produces: `CelestialArchetype`, `RingConfig`, `MoonConfig`, `DebrisConfig`, `CelestialIdentity`, `SceneRole`, `GeometryLOD`, `ENTRELIS_CONCEPT_IDENTITIES`, `getConceptCelestialIdentity(conceptId: string)`, `CATALOG_ARCHETYPES`.

- [ ] **Step 1: Write the failing test**
Create `src/features/knowledge-graph/celestial-3d/identity.test.ts` testing:
  - Mapping for all 7 concepts ("rust", "ownership", "memory", "stack-heap", "operating-systems", "cpus", "transistors") returns the exact specified archetype and parameters.
  - Deterministic fallback for unknown concept IDs returns a valid `CelestialIdentity` derived from string hashing.
  - Role (`focus` | `primary` | `context`) is decoupled from `CelestialIdentity`.

- [ ] **Step 2: Run test to verify it fails**
Run: `npm run test -- identity.test.ts`
Expected: FAIL ("cannot find module identity").

- [ ] **Step 3: Implement `identity.ts`**
Write `src/features/knowledge-graph/celestial-3d/identity.ts` declaring all types, the 7 curated mappings, and helper functions.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm run test -- identity.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
`git add src/features/knowledge-graph/celestial-3d/identity.* && git commit -m "feat(celestial-3d): define celestial identity types and curated concept mappings"`

---

### Task 2: Modular 3D Noise Engine Expansion

**Files:**
- Move & Modify: `src/features/knowledge-graph/celestial-3d/procedural/noise3d.ts` (from `noise3d.ts`)
- Test: `src/features/knowledge-graph/celestial-3d/procedural/noise3d.test.ts`

**Interfaces:**
- Produces: `createNoise3D`, `fbm3D`, `ridgedFbm3D`, `createCellular3D`, `cellularManhattan3D`, `domainWarp3D`.

- [ ] **Step 1: Write tests for noise utilities**
Add unit tests verifying deterministic outputs across repeated calls with identical seeds, cellular distance calculations, and Manhattan/grid metrics.

- [ ] **Step 2: Run test to verify failure**
Run: `npm run test -- noise3d.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement modular noise utilities**
Implement `cellularManhattan3D` (for rectilinear wafer/metallic features) and `domainWarp3D` (for storm/atmospheric swirls).

- [ ] **Step 4: Run test to verify it passes**
Run: `npm run test -- noise3d.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
`git add src/features/knowledge-graph/celestial-3d/procedural/noise3d.* && git commit -m "feat(celestial-3d): expand modular 3D noise engine with Manhattan and domain warping"`

---

### Task 3: Procedural Texture Engines for All Archetypes & Rings

**Files:**
- Create: `src/features/knowledge-graph/celestial-3d/procedural/textures.ts`
- Test: `src/features/knowledge-graph/celestial-3d/procedural/textures.test.ts`

**Interfaces:**
- Consumes: `noise3d.ts`, `identity.ts`
- Produces:
  - `createGoldenStarTextures(seed, lod)`
  - `createBlueStarTextures(seed, lod)`
  - `createEmberStarTextures(seed, lod)`
  - `createVolcanicRockyTextures(seed, lod)`
  - `createMineralDesertTextures(seed, lod)`
  - `createLifeWorldTextures(seed, lod)` (returns `{ surface, clouds, roughness }`)
  - `createBlueAtmosphericTexture(seed, lod)`
  - `createStormGiantTexture(seed, lod)`
  - `createMetallicWorldTextures(seed, lod)` (returns `{ diffuse, roughness, metalness, bump }`)
  - `createCrystalWorldTextures(seed, lod)`
  - `createAsteroidTextures(seed, lod, variant)`
  - `createRingTexture(config)`
  - `getCachedTexture`, `disposeAllCelestialTextures`

- [ ] **Step 1: Write tests for unique texture generators**
Test that:
  - Each generator outputs valid `THREE.CanvasTexture` instances.
  - Rocky vs Mineral use different generator logic and produce different patterns.
  - Life World produces both surface and transparent cloud textures.
  - Metallic produces high metallic/roughness data maps.
  - Ring texture generates radial bands with transparency gaps.
  - Caching correctly reuses textures for identical `archetype:seed:lod` keys.

- [ ] **Step 2: Run test to verify failure**
Run: `npm run test -- textures.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement procedural texture generators**
Implement procedural generators guaranteeing distinct visual identities, proper `sRGB` vs `NoColorSpace` tagging, and LOD resolution scaling (`512x256` for focus, `256x128` for primary, `64x32` for context).

- [ ] **Step 4: Run test to verify it passes**
Run: `npm run test -- textures.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
`git add src/features/knowledge-graph/celestial-3d/procedural/textures.* && git commit -m "feat(celestial-3d): implement unique procedural texture generators for all archetypes"`

---

### Task 4: Shaders (Atmosphere, Star Surface & Granulation)

**Files:**
- Create: `src/features/knowledge-graph/celestial-3d/shaders/atmosphere.ts`
- Create: `src/features/knowledge-graph/celestial-3d/shaders/star.ts`
- Test: `src/features/knowledge-graph/celestial-3d/shaders/shaders.test.ts`

**Interfaces:**
- Produces: `createAtmosphereMaterial`, `createStarSurfaceMaterial` with configurable palette uniforms for Golden, Blue-White, and Ember stars.

- [ ] **Step 1: Write tests for shader factories**
Test that `createAtmosphereMaterial` and `createStarSurfaceMaterial` return valid `THREE.ShaderMaterial` instances with appropriate uniforms and blending.

- [ ] **Step 2: Run test to verify failure**
Run: `npm run test -- shaders.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement modular shader factories**
Implement customizable star shader with uniforms for core, mid, limb colors, limb darkening, and intensity.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm run test -- shaders.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
`git add src/features/knowledge-graph/celestial-3d/shaders/ && git commit -m "feat(celestial-3d): modularize star and atmosphere shaders with configurable palettes"`

---

### Task 5: Visual Attachments (Rings, Moons, Debris)

**Files:**
- Create: `src/features/knowledge-graph/celestial-3d/attachments/rings.ts`
- Create: `src/features/knowledge-graph/celestial-3d/attachments/moons.ts`
- Create: `src/features/knowledge-graph/celestial-3d/attachments/debris.ts`
- Test: `src/features/knowledge-graph/celestial-3d/attachments/attachments.test.ts`

**Interfaces:**
- Produces:
  - `createRingMesh(config: RingConfig): THREE.Mesh`
  - `createMoonGroup(config: MoonConfig): THREE.Group`
  - `createDebrisGroup(config: DebrisConfig): THREE.Group`

- [ ] **Step 1: Write tests for visual attachments**
Test that:
  - `createRingMesh` builds a `THREE.RingGeometry` with proper inner/outer radius, tilt orientation, double-sided rendering, and depth writing.
  - `createMoonGroup` creates a pivot group at the specified orbital distance with child mesh.
  - `createDebrisGroup` creates 2-5 miniature irregular debris fragments.
  - None of these attachments contain clickable or semantic knowledge attributes.

- [ ] **Step 2: Run test to verify failure**
Run: `npm run test -- attachments.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement attachment builders**
Implement rings with proper 3D depth-testing so planets occlude the rear half and the front half renders in front. Implement moons and debris with deterministic offsets.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm run test -- attachments.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
`git add src/features/knowledge-graph/celestial-3d/attachments/ && git commit -m "feat(celestial-3d): implement reusable ring, moon, and debris attachment systems"`

---

### Task 6: Deformed Asteroid Geometry & Archetype Factory

**Files:**
- Create: `src/features/knowledge-graph/celestial-3d/archetypes/asteroid.ts`
- Create: `src/features/knowledge-graph/celestial-3d/archetypes/factory.ts`
- Test: `src/features/knowledge-graph/celestial-3d/archetypes/factory.test.ts`

**Interfaces:**
- Produces: `deformAsteroidGeometry(radius, seed, detail)`, `createCelestialObject(identity, lod)`

- [ ] **Step 1: Write tests for asteroid deformation and celestial object factory**
Test that:
  - Asteroid geometry is verified non-spherical (vertex distance variance > 15%).
  - `createCelestialObject` builds expected hierarchies:
    - Stars have core + corona sprite.
    - Life World has base + cloud shell + atmosphere shell.
    - Ringed worlds contain ring mesh attachment.
    - Disposing an object frees geometries and materials.

- [ ] **Step 2: Run test to verify failure**
Run: `npm run test -- factory.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement asteroid deformation and archetype factory**
Implement procedural vertex displacement on `IcosahedronGeometry` with craters and normal recomputation. Implement `createCelestialObject` assembling all archetypes.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm run test -- factory.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
`git add src/features/knowledge-graph/celestial-3d/archetypes/ && git commit -m "feat(celestial-3d): implement deformed asteroid geometry and celestial object factory"`

---

### Task 7: Refactor Controller & Catalog Layout in `/lab/celestial-3d`

**Files:**
- Modify: `src/features/knowledge-graph/celestial-3d/controller.ts`
- Modify: `src/features/knowledge-graph/celestial-3d/Celestial3DLab.tsx`
- Modify: `src/features/knowledge-graph/celestial-3d/Celestial3DLab.module.css`
- Modify: `src/features/knowledge-graph/celestial-3d/index.ts`
- Test: `src/features/knowledge-graph/celestial-3d/celestial-3d.test.ts`

**Interfaces:**
- Controller supports loading either the full archetype catalog or the current 7 concept identities.
- Clean grid navigation and category inspection in the lab.

- [ ] **Step 1: Write integration tests for controller and lab**
Test catalog switching, 30fps default, reduced-motion freezing of rotations/clouds/moons, visibility pause, and unmount disposal.

- [ ] **Step 2: Run test to verify failure**
Run: `npm run test -- celestial-3d.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement refactored controller and lab UI**
Implement clean tabbed/sectioned catalog view in `/lab/celestial-3d` allowing inspection of all archetypes (STARS, ROCKY, BIOLOGICAL, ATMOSPHERIC, STRUCTURAL, SMALL BODIES) and the CURRENT 7 CONCEPTS gallery.

- [ ] **Step 4: Run test to verify it passes**
Run: `npm run test -- celestial-3d.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
`git add src/features/knowledge-graph/celestial-3d/ && git commit -m "feat(celestial-3d): refactor controller and expand lab UI with full archetype catalog and concept gallery"`

---

### Task 8: Verification, Profiling, Screenshots & Documentation

**Files:**
- Capture screenshots via Chrome DevTools MCP.
- Run full automated suite: format, lint, typecheck, test, build.
- Profile performance metrics (draw calls, triangles, texture memory, FPS).
- Update PR #5 with detailed visual catalog documentation.

- [ ] **Step 1: Run full verification suite**
Run:
`npm run format:check`
`npm run lint`
`npm run typecheck`
`npm run test`
`npm run build`

- [ ] **Step 2: Capture required screenshots via DevTools MCP**
Capture:
1. Full archetype catalog
2. Star family (Golden / Blue / Ember)
3. Rocky family (Volcanic / Mineral)
4. Life World close-up
5. Gas family (Blue Atmospheric / Storm / Ringed giant)
6. Ring close-ups (icy rings & broken/debris rings)
7. Metallic World close-up
8. Crystal World close-up
9. Asteroid close-up
10. Current 7 Entrelis identities gallery
11. Rotation pairs (t0 vs t1) for Life World, Ringed Giant, and Asteroid
Bundle into `screenshots.zip`.

- [ ] **Step 3: Update PR #5 description**
Update GitHub PR #5 with complete architecture, profiling data, and visual catalog summary.

- [ ] **Step 4: Final commit and push**
Commit and push to `origin/m1-5-local-universe-ui`.
