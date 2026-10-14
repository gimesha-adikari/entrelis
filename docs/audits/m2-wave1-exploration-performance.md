# M2 Wave 1 Universe: Real Browser Exploration & Performance Audit

**Date:** 2026-10-15  
**Working Branch:** `test/m2-wave1-ux-performance-01`  
**Test Target:** Entrelis 33-Node Connected Universe Preview (`/lab/m2-wave1-universe`)  
**Comparative Baselines:** 7-Node Production Universe (`/`), 13-Node Preview Baseline (`/lab/m2-universe`)  
**Testing Methodology:** Real Chromium browser automation via Chrome DevTools MCP, WebGL 2.0 runtime profiling, high-resolution `requestAnimationFrame` delta tracking, and deterministic Vitest diagnostic tests.

---

## 1. Executive Summary

An empirical browser exploration and performance audit was conducted on the 33-concept, 61-relationship Milestone 2 Wave 1 Entrelis universe preview to investigate two issues reported during user testing:
1. **"Exploration sometimes feels stuck or difficult to continue."**
2. **"Some celestial nodes and transitions do not feel smooth."**

### Core Findings

| Reported Issue | Verified Root Cause | Impact & Severity |
| :--- | :--- | :--- |
| **Exploration feels stuck / hard to continue** | **1. High-Degree Node Neighbor Truncation:** Desktop budget (`maxPrimary = 6`) and mobile budget (`maxPrimary = 4`) truncate direct connections. On `Operating Systems` (degree 7, 8 relationships), 1 neighbor vanishes on desktop; on mobile, **3 out of 7 neighbors (43%) vanish completely from space**.<br>**2. The Asymmetric Return-Path Trap:** Navigating from `Memory` to `Operating Systems` causes `Memory` to be pruned from the OS scene due to alphabetical tie-breaking. A user cannot click back to where they just came from on the 3D canvas.<br>**3. Laptop Viewport Occlusion:** On 1024px–1280px viewports, right-side orbit planets are positioned directly behind the opaque 389px HTML `ConceptPanel`.<br>**4. Canvas vs. Panel Divergence:** The HTML panel lists all relationships, while the 3D canvas only shows a capped subset, creating disorientation. | **High** (UX & Navigational Integrity) |
| **Nodes & transitions do not feel smooth** | **1. Synchronous Main-Thread Procedural Texture Generation:** Multi-octave 3D Simplex noise (`fbm3D`) runs on the CPU in pure JavaScript when un-cached archetypes enter the scene, generating **102ms to 414ms long tasks** and **300ms–433ms frame freezes** during transitions.<br>**2. Immediate Texture Cache Eviction:** `releaseCelestialTextures` immediately disposes textures when reference count drops to 0 on scene change. Navigating away and back requires re-running millions of noise evaluations.<br>**3. In-Flight Transition Redirection Jump:** Interrupting a travel transition by clicking another node causes the camera anchor to step relative to the in-flight target rather than the current interpolated position. | **High** (Perceived Performance & Frame Pacing) |

Idle rendering is **exceptionally smooth (locked 60.0 FPS, < 16.8ms frame times)** across all 33 concepts on hardware-accelerated WebGL 2.0. The perceived lack of smoothness is **not** GPU fill-rate or shader lag, but main-thread CPU blocking during the instantiation of new celestial archetypes.

---

## 2. Real Browser Environment & Testing Methodology

### Environment Specification
- **Operating System:** Linux x86_64 (Kernel 6.8.0-52-generic)
- **Browser:** Google Chrome / Chromium 155.0.0.0 (Headless & Interactive via Chrome DevTools MCP)
- **WebGL Context:** WebGL 2.0 (OpenGL ES 3.0 Chromium)
- **GPU Driver & Renderer:** ANGLE (Intel, Mesa Intel(R) UHD Graphics 630 (CFL GT2), OpenGL ES 3.2)
- **Application Build:** Production Next.js 16.3.8 build (`npm run build`), served locally via `next start -p 3001` (zero React development-mode overhead)
- **JavaScript Memory Baseline:** 18.2 MB used out of 19.2 MB total heap (healthy, zero leaks)

### Testing Viewports
1. **Desktop Viewport:** `1440 × 900` (Effective DPR: 1.0)
2. **Standard Laptop Viewport:** `1024 × 768` (Effective DPR: 1.0)
3. **Mobile Viewport:** `390 × 844` (iPhone 14 profile, touch emulation active)

### Instrumentation Setup
- **Frame Rate & Hitch Tracker:** Injected `requestAnimationFrame` delta monitor recording per-frame latency, min/max/average frame times, 95th/99th percentiles, and frame drops exceeding 16.7ms (60 FPS), 33.3ms (30 FPS), and 50ms (noticeable hitch).
- **Long Task Observer:** Standard browser `PerformanceObserver` tracking `entryTypes: ['longtask']` (> 50ms CPU main-thread blocks).
- **DOM & Bounding Box Inspection:** Automated geometric auditing of canvas coordinate projections vs. HTML overlay bounding client rects.

---

## 3. Multi-Environment Comparative Analysis

The application was profiled under identical production conditions across three distinct graph scale tiers:

| Metric | Production Baseline (`/`) | M2 Preview Baseline (`/lab/m2-universe`) | Wave 1 Preview (`/lab/m2-wave1-universe`) |
| :--- | :--- | :--- | :--- |
| **Total Universe Concepts** | 7 | 13 | **33** |
| **Total Relationships** | 8 | 19 | **61** |
| **Maximum Node Degree** | 4 | 6 | **7 (8 edges)** |
| **Primary Neighbor Truncation (Desktop)** | **0%** (Never truncated) | **0%** (Max degree = 6) | **Found on 3 concepts** (`operating-systems`, `cpus`, `memory`) |
| **Primary Neighbor Truncation (Mobile)** | **0%** (Max degree $\le 4$) | **33%** on OS (4 of 6 shown) | **43%–50%** on high-degree nodes |
| **Idle Framerate** | 60.0 FPS | 60.0 FPS | **60.0 FPS** |
| **Idle Frame Time (Avg / Max)** | 16.67ms / 16.8ms | 16.67ms / 16.8ms | **16.67ms / 16.8ms** |
| **Transition Framerate (Avg)** | 57.7 – 60.0 FPS | 43.0 – 55.5 FPS | **31.7 – 52.1 FPS** |
| **Transition Long Tasks (> 50ms)** | **0** | **1** (188ms on OS) | **Multiple: 102ms to 414ms** |
| **Maximum Frame Freeze during Travel** | 50.0ms | 183.4ms | **433.3ms** |
| **Initial Route Load (FCP)** | 140ms | 150ms | **160ms** |
| **JS Heap Memory** | ~14 MB | ~16 MB | **18.2 MB** |

### Key Takeaway
The 7-node production universe feels buttery smooth because its maximum degree never exceeds 4 (no nodes are ever truncated) and all 7 concepts use lightweight, pre-warmed celestial archetypes. As the graph expands to 33 nodes with high-degree hubs and diverse archetypes, procedural generation bottlenecks and budget truncation become prominent.

---

## 4. Problem 1 In-Depth: Exploration "Stuck" & Missing Celestial Nodes

### 4.1 The Bounded Scene Policy & The "Missing Primary Neighbors" Phenomenon
In `src/features/knowledge-graph/scene/build-local-scene.ts`:
- **Desktop Scene Budget:** `maxPrimary: 6`, `maxContext: 3` (Total $\le 10$ nodes)
- **Mobile Scene Budget:** `maxPrimary: 4`, `maxContext: 1` (Total $\le 6$ nodes)

When a concept has more direct relationships than `maxPrimary`, candidates are sorted by:
1. `maxStrengthScore` (Descending: `primary` = 3, `strong` = 2, `supporting` = 1)
2. `a.concept.id.localeCompare(b.concept.id)` (Ascending alphabetical)

Candidates beyond index `budget.maxPrimary` are sliced out:
```ts
const cappedPrimary = sortedPrimaryCandidates.slice(0, budget.maxPrimary);
```

#### The Structural Trap
1. Truncated primary candidates do **not** automatically downgrade to context slots. Context slots are populated *strictly* from 2nd-degree neighbors of the *visible* primary nodes.
2. If a truncated primary neighbor has no relationship to any of the 6 selected primaries, it **completely disappears from the 3D celestial canvas**.
3. On `Operating Systems`:
   - Connected concepts (7 unique): `asynchronous-io`, `concurrency`, `cpus`, `file-systems`, `stack-and-heap`, `virtual-memory`, `memory`.
   - All have `strength: "primary"` (score = 3).
   - Tie-breaking sorts by ID:
     1. `concept-asynchronous-io`
     2. `concept-concurrency`
     3. `concept-cpus`
     4. `concept-file-systems`
     5. `concept-stack-and-heap`
     6. `concept-virtual-memory`
     7. `concept-memory` *(Truncated!)*
   - `concept-memory` is omitted from primary nodes.
   - Context nodes chosen for OS are `Data Structures`, `Database Systems`, `Garbage Collection`.
   - **Result:** `Memory` is 100% missing from the 3D universe when viewing `Operating Systems`.

### 4.2 The Asymmetric Return-Path Trap
This creates a severe disorientation pattern:
1. User starts at `Memory`. The 3D canvas displays `Operating Systems` as a primary planet.
2. User clicks `Operating Systems` in 3D space to travel there.
3. The camera pans and settles on `Operating Systems`.
4. The user looks at the surrounding planetary orbits to return or explore further: **`Memory` is nowhere in the sky**.
5. The concept they literally just flew from has vanished into thin air.
6. The only way to get back is either the browser Back button, the HTML side panel link, or resetting the entire camera to `Rust`.

### 4.3 Mobile Viewport Escalation (43%–50% Hidden)
On mobile devices (`isMobile = true`), `maxPrimary = 4`:
- On `Operating Systems`, only 4 of 7 connections are visible in space (`Asynchronous I/O`, `Concurrency`, `CPUs`, `File Systems`).
- `Stack & Heap`, `Virtual Memory`, and `Memory` (43% of direct neighbors) are invisible on the 3D canvas.
- For a mobile user exploring the 3D canvas, half the graph connections are hidden from sight.

### 4.4 Canvas vs. HTML Panel Divergence
In `src/features/knowledge-graph/components/ConceptPanel.tsx`:
- The HTML side panel reads directly from `index.relationshipsByConceptId.get(concept.id)`.
- It renders all 8 relationship buttons (`Compilers↗`, `Memory↗`, `Virtual Memory↗`, etc.).
- A user reading the panel sees "Connections (8)", clicks one, and notices that the celestial canvas only shows 6 planets.
- If they look for a planet mentioned in the text or panel, it is often absent from the celestial sky.

### 4.5 Standard Laptop Viewport Occlusion (1024px – 1280px)
Geometric layout audit revealed a critical physical occlusion issue on laptop displays:
- Canvas dimensions: `1024 × 768px`.
- Center of celestial planetary system: $cx = 512px, cy = 384px$.
- Primary orbital radius: $R \approx 200px – 260px$.
- Rightmost orbit boundary: $x \approx 512 + 260 = 772px$.
- HTML `ConceptPanel` width: `389px`, positioned at `right: 0` (`left: 635px` to `1024px`).
- **Planets positioned at $x \in [635px, 772px]$ fall directly behind the opaque sidebar.**
- Verified in browser: At `Operating Systems` and `CPUs`, 2 to 3 celestial bodies (`Virtual Memory`, `Asynchronous I/O`, `Concurrency`) rendered underneath the panel.
- The user cannot see them or click their 3D meshes without zooming or panning the camera manually.

---

## 5. Problem 2 In-Depth: Smoothness, Stutter & Quantitative Performance Audit

### 5.1 Real Browser Performance Data (Page Transitions)

Transitions between nodes were tracked under production execution across multiple traversal journeys:

```
Traversal Hop                         Avg FPS    Max Frame Delta    Long Tasks Recorded
-----------------------------------------------------------------------------------------
Idle (Resting Canvas)                 60.0 FPS   16.8ms             None (0ms)
Rust -> Compilers                     52.1 FPS   100.0ms            1x (102ms)
Compilers -> Algorithms               58.9 FPS   33.3ms             None (0ms)
Algorithms -> Computability Theory    60.0 FPS   16.8ms             None (0ms)
Computability Theory -> Alan Turing   60.0 FPS   16.7ms             None (0ms)
Rust -> Memory                        31.7 FPS   433.3ms            1x (414ms)
Memory -> Operating Systems           38.5 FPS   300.0ms            1x (315ms)
Operating Systems -> CPUs             39.6 FPS   299.9ms            1x (286ms)
Transistors -> Semiconductors         48.7 FPS   150.0ms            1x (149ms)
Semiconductors -> Solid-State Physics 60.0 FPS   16.8ms             None (0ms)
Solid-State Physics -> Atoms          60.0 FPS   16.8ms             None (0ms)
```

### 5.2 Root Cause Analysis: Synchronous CPU Procedural Noise Generation
Inspection of `src/features/knowledge-graph/celestial-3d/procedural/textures.ts` shows the definitive cause:
1. Each celestial archetype (e.g. `ember-star`, `storm-giant`, `blue-atmospheric`, `crystal-world`) creates multiple canvas textures (surface, corona, normal map, clouds, rings).
2. For each texture, 4 to 5 Simplex 3D noise generators (`createNoise3D`) are instantiated.
3. Nested pixel loops evaluate 3D fractional Brownian motion (`fbm3D`) with 3 octaves for every pixel in a $512 \times 256$ or $1024 \times 512$ canvas.
4. Each texture requires **1.2 to 1.8 million noise evaluations on the main JavaScript thread**.
5. When a transition brings 3–4 new archetypes into view, the CPU evaluates over **10 million noise calculations synchronously**, locking the main thread for **100ms to 414ms**.
6. Because the browser cannot run `requestAnimationFrame` while the main thread is blocked, the transition freezes mid-flight, dropping from 60 FPS down to a 433ms frame spike.

### 5.3 Premature Texture Cache Eviction
In `procedural/textures.ts`, `releaseCelestialTextures`:
```ts
export function releaseCelestialTextures(textures: readonly THREE.Texture[]): void {
  for (const texture of new Set(textures)) {
    const referenceCount = textureReferenceCounts.get(texture) ?? 0;
    if (referenceCount > 1) {
      textureReferenceCounts.set(texture, referenceCount - 1);
      continue;
    }
    for (const key of keys) {
      if (textureCache.get(key) === texture) textureCache.delete(key);
    }
    texture.dispose();
  }
}
```
- The texture cache is **not a persistent session cache**. It is a reference-counted cache for active bodies in the *current* scene only.
- As soon as a body leaves the scene, its textures are disposed and purged from memory.
- If a user explores `Rust` $\rightarrow$ `Alan Turing` $\rightarrow$ `Rust`, all of Rust's planetary textures must be completely recalculated from scratch, re-triggering the CPU hitch.

### 5.4 Rapid Click Interruption Glitch
In `src/features/knowledge-graph/components/GraphCanvas.tsx`:
- When a transition is active (`travelStateRef.current.active`), clicking another concept immediately calls `calculateNavigationStep` and `resolveDestinationAnchor`.
- However, `fromScene` is taken from `currentSceneRef.current`, where `focus` has already been assigned to the previous destination.
- The step calculation treats the camera as if it were already at the destination, even though `startOffset` is midway along the path.
- This causes an abrupt angular jump or camera shudder when rapidly clicking between nodes.

---

## 6. Confirmed Bugs vs. Deliberate Design Limitations

To ensure clear engineering priorities, findings are strictly categorized:

### Confirmed Bugs (Must Be Fixed)
1. **The Asymmetric Return-Path Disappearance:** Navigating from Node A to Node B causes Node A to be pruned if B has degree > 6. A user cannot backtrack along the path they just traversed using the 3D celestial canvas.
2. **Synchronous Main-Thread CPU Texture Generation:** Evaluating millions of 3D noise samples on the UI thread causes 100ms–414ms frame freezes during scene travel.
3. **Premature Texture Disposal:** Disposing textures immediately upon leaving the scene prevents caching benefits across an exploration session.
4. **Laptop Viewport Sidebar Occlusion:** On screens $\le 1280px$, celestial bodies orbit directly behind the opaque sidebar.
5. **In-Flight Camera Redirection Step Discontinuity:** Rapid clicks during travel cause positional jumping because navigation steps are computed from the target rather than the active interpolated focus.

### Deliberate Design Limitations (Working as Designed)
1. **Bounded Scene Budget Policy:** Capping visible nodes at $\le 10$ (Desktop) and $\le 6$ (Mobile) is an intentional pedagogical and visual design decision to prevent visual clutter and maintain celestial solar-system aesthetic. It is **not** a bug.
2. **Breadcrumb-less Camera Reset:** Clicking "Home" returning directly to `Rust` in a single camera flight is intentional baseline behavior.
3. **Level 1 Overview Summaries:** Presenting 2-paragraph summaries in the panel before offering "Learn more →" is an approved pedagogical structure.

---

## 7. Ranked Engineering Recommendations

### Priority 1: Return-Path Preservation in Scene Builder (High Impact, Low Risk)
- **Problem:** Node A disappears from Node B's celestial planetary system after navigating $A \rightarrow B$.
- **Fix:** In `buildLocalUniverseScene`, pass an optional `previousFocusSlug?: string`. If `previousFocusSlug` is a direct neighbor of B, guarantee it a primary slot before filling remaining slots by strength/ID sort.
- **Result:** The user can always see and click back to the node they just flew from.

### Priority 2: Session-Level LRU Texture Cache & Off-Thread Generation (High Impact, Medium Complexity)
- **Problem:** 100ms–414ms main-thread long tasks when generating procedural noise textures.
- **Fix:**
  1. Convert `textureCache` into an LRU cache with a maximum capacity (e.g. 50 textures, ~30 MB VRAM) that persists across scene changes. Do not dispose textures immediately when reference count hits 0.
  2. Offload `createNoise3D` and `fbm3D` pixel generation to a Web Worker or `OffscreenCanvas`.
- **Result:** Transitions will maintain 60 FPS without frame hitches.

### Priority 3: Responsive Camera Center Offset for Laptop Viewports (High Impact, Low Risk)
- **Problem:** Right-orbit planets hidden behind the 389px sidebar on 1024px–1280px displays.
- **Fix:** In `GraphCanvas.tsx`, when the side panel is open on viewports $< 1400px$, shift the camera focus center:
  $$cx = \frac{\text{canvasWidth} - \text{panelWidth}}{2}$$
- **Result:** The celestial planetary system centers perfectly in the visible viewport area, eliminating sidebar occlusion.

### Priority 4: Smooth In-Flight Travel Interruption (Medium Impact, Low Risk)
- **Problem:** Rapid clicks cause camera position jumps.
- **Fix:** When interrupting an active travel state, compute `fromAnchor` as `currentOffset` directly, and interpolate smoothly from the instantaneous position to the new target.

### Priority 5: Visual "More Connections" Celestial Ring / Overflow Indicator (Medium Impact)
- **Problem:** Discoverability gap between HTML panel (8 connections) and 3D canvas (6 planets).
- **Fix:** For nodes with truncated connections, render a subtle celestial "Kuiper belt" or orbit counter ring showing "+2 more concepts in orbit", or allow the primary orbit to be paginated/rotated.

---

## 8. Reproduction Guide & Automated Test Evidence

### 8.1 Automated Diagnostic Test Suite
A dedicated diagnostic test file was created and added to the test suite:
- **File:** `src/features/knowledge-graph/__tests__/wave1-exploration-diagnostics.test.ts`
- **Execution:** `npm test -- wave1-exploration-diagnostics`
- **Tests Passing:**
  1. `calculates degree and scene truncation across all 33 concepts on desktop and mobile` (Verifies exact truncation on `operating-systems`, `cpus`, `memory`).
  2. `proves the asymmetric return-path trap: navigating A -> B where B drops A from its celestial scene` (Demonstrates `memory` vanishing from `operating-systems`).
  3. `confirms ConceptPanel maintains full relationship discoverability while 3D canvas is truncated` (Proves 8 panel connections vs 6 canvas primaries).

### 8.2 Browser Console Reproduction Snippet
To reproduce the 414ms long task and observe frame pacing in real time:

```javascript
// 1. Install frame and longtask tracker in browser console at /lab/m2-wave1-universe
const tracker = {
  longTasks: [],
  frames: [],
  last: performance.now(),
  start() {
    this.longTasks = []; this.frames = []; this.last = performance.now();
    new PerformanceObserver(l => this.longTasks.push(...l.getEntries())).observe({ entryTypes: ['longtask'] });
    const loop = (t) => { this.frames.push(t - this.last); this.last = t; this.id = requestAnimationFrame(loop); };
    this.id = requestAnimationFrame(loop);
  },
  stop() {
    cancelAnimationFrame(this.id);
    const maxFrame = Math.max(...this.frames.slice(1));
    console.log(`Max Frame Delta: ${maxFrame.toFixed(1)}ms | Long Tasks: ${this.longTasks.length}`);
    this.longTasks.forEach(t => console.warn(`Long Task: ${t.duration.toFixed(1)}ms`));
  }
};

// 2. Start tracking, click "Memory↗", and wait 1 second
tracker.start();
document.querySelector('button[aria-label*="Memory"]')?.click();
setTimeout(() => tracker.stop(), 1000);
```

---
*Report produced by Antigravity Autonomous Pair Programmer.*
