# Entrelis — Product & Technical Plan

> **Everything is connected. Pick somewhere to start.**

## 1. Product vision

Entrelis is an interactive knowledge-exploration website built around relationships rather than isolated pages.

Users begin at a concept and move through a visual network of related ideas, discovering how subjects connect across science, technology, history, philosophy, psychology, biology, mathematics, and more.

Traditional encyclopedias are optimized to answer:

- What is this?

Entrelis should also answer:

- What is this connected to?
- Why are those things connected?
- Where can I go next?
- Can I understand this concept by interacting with it?

The experience should feel exploratory, cinematic, fast, and intentional—not like a generic wiki and not like an AI chatbot wrapped in a graph.

---

## 2. V1 focus

Entrelis should eventually be able to expand across many fields, but the first version should stay deliberately focused.

### Initial scope

**Science + technology + human thought**

### Seed domains

- Programming & computer science
- AI & mathematics
- Physics & space
- Biology & the human brain
- Psychology & philosophy
- History, inventions & civilization

These domains should connect naturally rather than behave like isolated categories.

Example paths:

**AI → Neural Networks → Neurons → Biology → Evolution → Genetics → DNA → Chemistry → Atoms → Quantum Physics**

**Rust → Memory Safety → Operating Systems → Linux → Open Source → Internet History → ARPANET → Cold War → Space Race**

---

## 3. Core V1 experience

### 3.1 Landing experience

The landing page should immediately communicate the idea with:

> **Everything is connected. Pick somewhere to start.**

The visual focus should be the knowledge network itself, not a large navigation shell or conventional dashboard.

### 3.2 Interactive knowledge graph

Users should be able to:

- pan and zoom the graph
- select a concept
- focus a concept and reveal nearby concepts
- understand which connections are most meaningful
- move between concepts without losing context
- return to previous concepts easily

The graph should feel alive and spatial without becoming visually noisy.

### 3.3 Search and direct navigation

Users should be able to search for a concept and jump directly to it.

Search should remain usable even when the graph contains many nodes.

### 3.4 Concept detail view

Each concept should support:

- concise explanation
- optional deeper content
- key connections
- explanation of why each major connection exists
- suggested next paths
- sources/references
- optional interactive learning module

### 3.5 Relationship explanations

Edges are first-class content.

A connection should not simply say:

**Rust → Ownership**

It should explain why:

> Rust's ownership model controls how memory is accessed and released without requiring a garbage collector.

The explanation of the relationship is as important as the nodes themselves.

### 3.6 Smooth navigation

Graph transitions should communicate spatial movement rather than feeling like page reloads.

Important interactions include:

- focus transitions
- zoom transitions
- concept opening/closing
- back navigation
- history traversal
- search-to-node transitions

### 3.7 Shareable URLs

Concepts should have stable, human-readable URLs so users can directly share a topic.

Example:

`/concept/rust`

The URL should reflect the focused concept without destroying the graph exploration state unnecessarily.

### 3.8 Responsive desktop and mobile

Desktop and mobile should both feel intentionally designed.

Mobile should not simply be a scaled-down desktop graph.

Likely differences include:

- reduced visible graph density
- bottom-sheet or full-screen concept details
- larger touch targets
- simplified gesture behavior
- reduced motion/visual load where necessary

### 3.9 Accessibility fallback

Core knowledge must not be trapped inside canvas or WebGL.

Readable content, links, keyboard navigation, and semantic structure should remain available through normal DOM content.

The graph is a navigation and understanding layer—not the only way to access the information.

### 3.10 Random Journey

A dedicated **Random Journey** experience should create a surprising but meaningful route through connected concepts.

Example:

**Coffee → Caffeine → Adenosine → Sleep → Dreams → Consciousness → Philosophy → Alan Turing → Computing → Rust**

The purpose is curiosity-driven discovery rather than random node selection.

---

## 4. Interactive learning modules

Some concepts should eventually contain small interactive experiences.

Examples:

- visualize Rust ownership and borrowing
- manipulate gravity near a black hole
- explore how neurons fire
- travel through a computing-history timeline
- visualize recursion
- manipulate orbital mechanics
- inspect binary and logic gates

These are not required for the first graph milestone.

The architecture should support them without forcing every concept to become custom application code.

A concept may optionally reference an interactive module with a known interface.

---

## 5. Product principles

### 5.1 Connections must be meaningful

The product should never optimize for producing the largest possible graph.

A smaller graph of strong, understandable relationships is better than thousands of weak AI-generated edges.

### 5.2 Content quality beats graph size

Expansion should happen only when the product can maintain understandable concepts and useful relationship explanations.

### 5.3 AI is an enhancement layer

AI may eventually help with:

- suggesting potential relationships
- simplifying explanations
- answering contextual questions
- recommending journeys
- assisting editors

AI should not be the sole source of core knowledge or silently publish unverified graph relationships.

### 5.4 Graph usability comes before spectacle

Animation, particles, depth, glow, and WebGL effects are useful only when they improve comprehension or delight without harming usability.

### 5.5 Performance is a product feature

Fast startup, responsive interaction, and stable frame rates are core requirements.

### 5.6 Mobile is a real product surface

The mobile experience should be designed independently where necessary rather than treated as an afterthought.

### 5.7 Curiosity should drive the interaction model

Every focused concept should make the user want to click at least one nearby concept.

---

## 6. Initial technical direction

This is a direction, not a frozen architecture.

### Application

- **Framework:** Next.js
- **Language:** TypeScript
- **UI:** React
- **Styling:** modern CSS approach with shared design tokens

### Graph rendering

Start with a proven **2D graph implementation**.

Only introduce Three.js/WebGL where testing proves that it meaningfully improves the experience.

Reasons to avoid starting immediately with a fully custom 3D graph:

- accessibility complexity
- mobile GPU constraints
- difficult interaction design
- label readability
- performance tuning cost
- increased implementation time before validating the product idea

A 2D spatial graph can still feel cinematic through motion, zoom, focus, layering, typography, and lighting effects.

### Content rendering

Use normal DOM rendering for:

- concept text
- links
- metadata
- sources
- accessible navigation
- search
- menus and controls

Use canvas/WebGL only for the spatial graph layer where appropriate.

### Data

Store concepts and relationships as structured first-class entities.

The first dataset may live locally during the earliest prototype, but the model should be database-friendly from the start.

### URLs

Use stable concept slugs.

Examples:

- `/concept/rust`
- `/concept/ownership`
- `/concept/operating-systems`

### AI

Keep AI behind a clear application boundary.

The product must remain functional if AI features are disabled.

---

## 7. Proposed data model

## 7.1 Concept

Suggested fields:

- `id`
- `slug`
- `name`
- `shortDescription`
- `content`
- `domains`
- `tags`
- `references`
- `interactiveModule`
- `createdAt`
- `updatedAt`

Possible later fields:

- difficulty
- aliases
- prerequisites
- visual metadata
- editorial status
- featured state

## 7.2 Relationship

Suggested fields:

- `id`
- `sourceConceptId`
- `targetConceptId`
- `type`
- `explanation`
- `strength`
- `references`
- `verificationStatus`
- `createdAt`
- `updatedAt`

Possible relationship types:

- depends-on
- inspired-by
- part-of
- enables
- contrasts-with
- evolved-from
- applies-to
- explains
- discovered-through
- historically-related
- conceptually-related

Relationship types should remain understandable to users and should not become an overly academic ontology.

---

## 8. Visual direction

The visual identity should feel:

- dark
- spatial
- sophisticated
- quiet
- curious
- futuristic without becoming cyberpunk
- highly readable

Potential characteristics:

- near-black background
- restrained glow
- high-quality typography
- strong contrast
- subtle depth
- meaningful node sizing
- relationship emphasis on focus
- minimal persistent chrome

The graph should be beautiful when idle but become clearer—not busier—when the user interacts.

---

## 9. MVP milestones

## M0 — Foundation

Goal: establish a maintainable project base.

Deliverables:

- Next.js + TypeScript project
- code quality tooling
- formatting/linting
- project structure
- design tokens
- basic application shell
- concept schema
- relationship schema
- seed dataset
- graph-library technical spike
- basic architecture decision record

Exit condition:

The project can load a small typed knowledge dataset and expose it cleanly to the UI.

---

## M1 — First interactive knowledge journey

Goal: prove the central interaction.

Deliverables:

- render curated concept nodes
- render relationships
- pan and zoom
- focus a node
- reveal/fade neighboring nodes appropriately
- open concept details
- navigate from one concept to a neighbor
- basic transition system
- App Router routes (`/`, `/concept/[slug]`, 404)
- provenance sources disclosure

Exit condition:

A user can meaningfully explore the initial Rust-centered knowledge slice through the graph.

---

## M1.5 — Local-universe UI

Goal: transform the experience from a global force graph into a beautiful, lightweight knowledge universe ("Local universe, not global graph").

Deliverables:

- explicit `UniverseScene` boundary separating knowledge dataset from canvas rendering
- strictly bounded visual complexity (Desktop <= 10 nodes, Mobile <= 6 nodes)
- deterministic orbital layout (no live physics or D3 force simulation)
- removal of `d3-force` and `@types/d3-force` runtime dependencies
- celestial body styling with multi-layer halos, cores, and fine orbital rings
- curved quadratic Bézier relationship paths preserving `SOURCE --TYPE--> TARGET` orientation
- bounded 350–500ms scene transitions with single cubic ease-out
- zero permanent `requestAnimationFrame` loop while idle (CPU idle)
- integrated knowledge observatory detail surface with lighter connection hierarchy
- compact spatial Home control

Exit condition:

Every selected concept generates an art-directed local celestial scene that halts animation completely when idle and scales instantly regardless of graph size.

---

## M2 — Discovery & graph growth

Goal: make the universe searchable and expand the connected knowledge corpus.

Deliverables:

- concept search and autocomplete
- direct concept navigation
- exploration history
- expanded seed knowledge across science, technology, and philosophy
- suggested next paths

Exit condition:

Users can search, discover, and traverse an expanded knowledge corpus with seamless local-universe rendering.

---

## M3 — Random Journey

Goal: introduce curiosity-driven exploration.

Deliverables:

- journey generation logic
- meaningful path constraints
- journey presentation
- step-by-step traversal
- restart/new journey controls
- shareable journey where practical

Exit condition:

Users can launch a journey and receive an interesting sequence of meaningfully connected concepts.

---

## M4 — First interactive concept

Goal: prove that Entrelis can go beyond reading and navigation.

Recommended first candidate:

**Rust Ownership**

Possible interactive behavior:

- create values
- move ownership
- borrow immutable references
- borrow mutable references
- visualize scopes
- show invalid borrow states
- explain why the compiler rejects an operation

Exit condition:

One concept contains a polished interactive learning experience integrated naturally into the normal concept model.

---

## 10. First vertical slice

Before expanding the graph broadly, build one excellent connected path:

**Rust → Ownership → Memory → Stack & Heap → Operating Systems → CPUs → Transistors**

This slice should prove:

- node rendering
- edge rendering
- focusing
- relationship explanations
- concept detail UI
- graph-to-content transitions
- URL structure
- history/back behavior
- search
- mobile behavior
- accessibility strategy
- performance expectations
- overall visual direction

### Example relationships

**Rust → Ownership**

Rust uses ownership rules to manage memory safety at compile time.

**Ownership → Memory**

Ownership determines which part of a program is responsible for a value and when its memory may be released.

**Memory → Stack & Heap**

Programs store values in different memory regions depending on lifetime, size, allocation behavior, and execution model.

**Stack & Heap → Operating Systems**

Operating systems provide virtual memory, process address spaces, stack allocation, and heap mechanisms used by applications.

**Operating Systems → CPUs**

Operating systems schedule execution on processors and coordinate hardware resources.

**CPUs → Transistors**

Modern processors implement logic and computation using billions of transistors.

These descriptions are only starting points and should be reviewed for educational clarity during implementation.

---

## 11. Seed content strategy

Do not begin by generating hundreds of nodes.

Start with approximately enough content to validate navigation and graph behavior.

A useful early target might be:

- 20–40 carefully selected concepts
- 40–80 meaningful relationships
- several cross-domain connections
- one complete polished vertical slice

Every relationship should answer:

> Why does this edge deserve to exist?

---

## 12. Content quality and sourcing

Concepts and relationships should support references.

Possible source categories include:

- official documentation
- textbooks
- academic institutions
- research papers
- reputable educational sources
- primary historical sources where appropriate

The product should distinguish between:

- established factual connections
- useful conceptual relationships
- interpretive relationships
- AI-suggested relationships awaiting review

---

## 13. Search and graph growth

As the graph grows, loading the entire knowledge network at once may stop being practical.

The architecture should therefore allow progressive graph expansion.

Possible strategy:

1. load the focused concept
2. load its strongest neighbors
3. load limited second-degree context
4. fetch additional neighborhoods on exploration
5. cache recently visited graph regions

This reduces visual clutter as well as network and rendering cost.

---

## 14. Performance considerations

Important metrics include:

- initial page load
- time until graph is interactive
- transition responsiveness
- graph frame rate
- node count before degradation
- mobile GPU/CPU load
- memory usage

Potential safeguards:

- cap rendered neighborhoods
- level-of-detail behavior
- hide labels based on zoom
- progressive edge rendering
- memoized graph calculations
- Web Workers for heavy layout work if needed
- server-side delivery of concept content
- lazy-loading interactive modules

---

## 15. Accessibility considerations

Minimum expectations:

- semantic concept content
- keyboard-accessible search
- keyboard-accessible concept navigation
- visible focus states
- screen-reader-accessible concept relationships
- reduced-motion mode
- sufficient contrast
- graph-independent content access

A user should not need to manipulate a graphical canvas to access the actual knowledge.

---

## 16. Not in V1

The following are intentionally out of scope for the initial product:

- attempting to cover every field of human knowledge
- social networking features
- public user-generated content
- followers
- comments
- likes/upvotes
- full Wikipedia-style article depth
- AI-generated unreviewed graph expansion
- native iOS or Android applications
- complex account systems
- subscriptions/payments
- collaborative editing
- gamification systems
- achievement systems
- 3D-first graph navigation
- AR/VR experiences

They may be reconsidered later only if they serve the core exploration experience.

---

## 17. Success criteria

The first release succeeds if a new visitor can:

1. understand what Entrelis is within seconds
2. select or search for a concept
3. understand the focused concept
4. see several meaningful nearby connections
5. understand why those connections exist
6. follow multiple concepts without getting lost
7. move backward through their exploration
8. share a concept directly
9. comfortably use the experience on mobile
10. leave wanting to explore another path

The defining product test is:

> Does this feel like exploring a map of ideas rather than browsing a database?

---

## 18. Working principles for development

- Build the smallest version that proves the interaction.
- Validate graph usability before scaling content.
- Prefer typed, explicit data structures.
- Avoid premature backend complexity.
- Avoid visual effects that obscure meaning.
- Measure performance early.
- Keep accessibility in the architecture from the beginning.
- Treat mobile as a first-class surface.
- Keep AI optional and reviewable.
- Document major architecture decisions as they become real rather than guessing too far ahead.

---

## 19. Immediate next steps

1. Initialize the Next.js + TypeScript application.
2. Establish linting, formatting, type checking, and test basics.
3. Define the first Concept and Relationship TypeScript types.
4. Build the initial Rust-centered seed dataset.
5. Prototype 2–3 graph libraries against the same dataset.
6. Choose the graph implementation based on:
   - interaction quality
   - label handling
   - performance
   - mobile behavior
   - React integration
   - accessibility strategy
   - customization potential
7. Build M1 around the winning prototype.
8. Avoid broader content expansion until the first vertical slice feels good.

---

## 20. Project links

- GitHub: https://github.com/gimesha-adikari/entrelis
- Linear: https://linear.app/gimesha/project/entrelis-212445eea42f
