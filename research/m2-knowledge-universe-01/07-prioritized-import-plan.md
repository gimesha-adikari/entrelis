# Entrelis M2 — Prioritized Content Import Plan

> **Sprint:** M2 Knowledge Research Sprint 01  
> **Target Rollout:** Post-M1.5 Release  
> **Total Researched Nodes Available:** 120  
> **Recommended First Batch (Wave 1):** 25 Core Bridge Nodes  

---

## 1. Rollout Strategy & Guiding Principles

Importing 120 new nodes and 211 relationships into the production knowledge graph in a single monolithic deployment introduces editorial review bottlenecks, cognitive overwhelm for users, and potential layout instability in the 3D celestial visualization.

We recommend an **incremental, three-wave staged rollout**:
* **Wave 1 (The Core Bridges):** 25 nodes connecting directly to the 7 M1.5 seed concepts and establishing immediate bridges to all 5 new domains.
* **Wave 2 (The Scientific & Cognitive Foundations):** 40 nodes expanding the core principles of physics, mathematics, neurobiology, and philosophy.
* **Wave 3 (The Universal Tapestry):** 55 nodes completing civilization history, advanced algorithmic theory, and deep cross-disciplinary journeys.

---

## 2. Wave 1 Selection Criteria

The 25 nodes selected for Wave 1 were chosen based on four strict objective criteria:
1. **Direct Seed Adjacency:** Every Wave 1 node shares an immediate directed relationship with at least one of the 7 M1.5 seed concepts (`Rust`, `Ownership`, `Memory`, `Stack & Heap`, `Operating Systems`, `CPUs`, `Transistors`).
2. **Domain Representation:** Exactly balanced across all domains to immediately break Entrelis out of its computing-only vertical slice.
3. **High Pedagogical Resonance:** Fundamental concepts that curious non-specialists intuitively recognize and want to explore.
4. **Zero Dangling Dependencies:** All relationships within Wave 1 connect either to other Wave 1 nodes or to existing M1.5 seed nodes.

---

## 3. Wave 1 Catalog: The First 25 Nodes to Import

### Domain A — Programming & Computer Science (5 Nodes)
1. **`concept-compilers` (Compilers)**
   - *Seed Connection:* `concept-rust --implemented-with--> concept-compilers`
   - *Why Wave 1:* Connects high-level programming language semantics to low-level CPU execution.
2. **`concept-type-systems` (Type Systems)**
   - *Seed Connection:* `concept-rust --uses--> concept-type-systems`
   - *Why Wave 1:* Explains how Rust enforces memory safety and lifetimes without runtime garbage collection.
3. **`concept-virtual-memory` (Virtual Memory)**
   - *Seed Connection:* `concept-operating-systems --manages--> concept-virtual-memory`, `concept-virtual-memory --manages--> concept-memory`
   - *Why Wave 1:* Bridges operating system process isolation with physical RAM and hardware MMUs.
4. **`concept-garbage-collection` (Garbage Collection)**
   - *Seed Connection:* `concept-garbage-collection --contrasts-with--> concept-ownership`
   - *Why Wave 1:* Provides the essential conceptual contrast to Rust's compile-time ownership model.
5. **`concept-logic-gates` (Logic Gates)**
   - *Seed Connection:* `concept-logic-gates --implemented-with--> concept-transistors`
   - *Why Wave 1:* Explains how physical semiconductor transistors become binary Boolean calculating devices.

### Domain B — Artificial Intelligence & Mathematics (4 Nodes)
6. **`concept-artificial-intelligence` (Artificial Intelligence)**
   - *Bridge Connection:* `concept-artificial-intelligence --includes--> concept-machine-learning`
   - *Why Wave 1:* The central intellectual hub for computational intelligence.
7. **`concept-boolean-logic` (Boolean Logic)**
   - *Seed Connection:* `concept-boolean-logic --implemented-with--> concept-logic-gates`
   - *Why Wave 1:* Links 19th-century symbolic mathematical logic directly to electronic CPU circuitry.
8. **`concept-alan-turing` (Alan Turing)**
   - *Bridge Connection:* `concept-history-of-computing --includes--> concept-alan-turing`
   - *Why Wave 1:* The foundational figure uniting theoretical computability, codebreaking, and artificial intelligence.
9. **`concept-linear-algebra` (Linear Algebra)**
   - *Bridge Connection:* `concept-artificial-neural-networks --depends-on--> concept-linear-algebra`
   - *Why Wave 1:* The mathematical bedrock of computer graphics, quantum mechanics, and machine learning.

### Domain C — Physics & Space (4 Nodes)
10. **`concept-semiconductors` (Semiconductors)**
    - *Seed Connection:* `concept-transistors --implemented-with--> concept-semiconductors`
    - *Why Wave 1:* The material physics bridge connecting hardware transistors to solid-state quantum physics.
11. **`concept-solid-state-physics` (Solid-State Physics)**
    - *Bridge Connection:* `concept-semiconductors --depends-on--> concept-solid-state-physics`
    - *Why Wave 1:* Explains energy bandgaps and electron transport in crystals.
12. **`concept-atoms` (Atoms)**
    - *Bridge Connection:* `concept-solid-state-physics --depends-on--> concept-atoms`
    - *Why Wave 1:* Anchors the universe in physical matter, connecting physics to chemistry and biology.
13. **`concept-electromagnetism` (Electromagnetism)**
    - *Bridge Connection:* `concept-telecommunications --depends-on--> concept-electromagnetism`
    - *Why Wave 1:* The physical force governing electric circuits, wireless transmission, and atomic electron shells.

### Domain D — Biology & the Human Brain (4 Nodes)
14. **`concept-biological-neurons` (Biological Neurons)**
    - *Bridge Connection:* `concept-artificial-neural-networks --related-to--> concept-biological-neurons`
    - *Why Wave 1:* The biological cells whose synaptic wiring inspired artificial neural network architectures.
15. **`concept-action-potentials` (Action Potentials & Ion Channels)**
    - *Bridge Connection:* `concept-biological-neurons --uses--> concept-action-potentials`
    - *Why Wave 1:* The biophysical electrical pulses that transmit information through the nervous system.
16. **`concept-synapses` (Synapses & Neurotransmission)**
    - *Bridge Connection:* `concept-biological-neurons --uses--> concept-synapses`
    - *Why Wave 1:* The chemical communication junctions that enable neuroplasticity and memory.
17. **`concept-human-brain` (Human Brain & Cerebral Cortex)**
    - *Bridge Connection:* `concept-human-brain --includes--> concept-biological-neurons`
    - *Why Wave 1:* The master cognitive organ of human thought, perception, and voluntary action.

### Domain E — Psychology & Philosophy (4 Nodes)
18. **`concept-learning-psychology` (Learning & Conditioning)**
    - *Bridge Connection:* `concept-learning-psychology --depends-on--> concept-neuroplasticity`
    - *Why Wave 1:* Bridges biological synaptic modification with psychological skill and memory acquisition.
19. **`concept-working-memory` (Working Memory)**
    - *Seed Connection:* `concept-working-memory --related-to--> concept-memory`
    - *Why Wave 1:* Connects computer address space concepts with human conscious cognitive capacity limits.
20. **`concept-scientific-method` (Scientific Method & Falsification)**
    - *Bridge Connection:* `concept-scientific-revolution --leads-to--> concept-scientific-method`
    - *Why Wave 1:* The foundational epistemology of empirical truth, hypothesis testing, and error correction.
21. **`concept-formal-logic` (Formal Logic & Deductive Reasoning)**
    - *Bridge Connection:* `concept-formal-logic --related-to--> concept-type-systems`
    - *Why Wave 1:* Unites mathematical proof theory, Boolean logic, and programming language type safety.

### Domain F — History, Inventions & Civilization (4 Nodes)
22. **`concept-transistor-invention` (Invention of the Transistor)**
    - *Seed Connection:* `concept-transistor-invention --leads-to--> concept-transistors`
    - *Why Wave 1:* Provides the 1947 Bell Labs historical origin story for the physical cornerstone of computing.
23. **`concept-integrated-circuit` (The Integrated Circuit)**
    - *Seed Connection:* `concept-integrated-circuit --uses--> concept-transistors`
    - *Why Wave 1:* The microchip milestone that solved the wiring crisis and launched Silicon Valley.
24. **`concept-von-neumann-architecture` (Von Neumann Architecture)**
    - *Seed Connection:* `concept-von-neumann-architecture --part-of--> concept-cpus`, `concept-von-neumann-architecture --uses--> concept-memory`
    - *Why Wave 1:* The stored-program architectural blueprint governing modern general-purpose digital computers.
25. **`concept-the-printing-press` (The Printing Press & Movable Type)**
    - *Bridge Connection:* `concept-printing-press --leads-to--> concept-scientific-revolution`
    - *Why Wave 1:* The historical technological benchmark for information democratization, anticipating the Internet.

---

## 4. Technical Import Prerequisites & Safety Checklist

Before committing Wave 1 into `src/data/seed/`:
1. **M1.5 Release Guard:** Confirm PR #5 is merged and CI is green on `main`. Never import M2 research during M1.5 release finalization.
2. **Schema Verification:** Run `assertValidDataset` across the combined dataset (7 seed concepts + 25 Wave 1 concepts + seed sources + new sources + all corresponding relationships).
3. **Graph Layout Check:** Run force-directed or procedural 3D positioning checks in Vitest to ensure node clustering converges smoothly without visual overlapping or node collision.
4. **Editorial Sign-off:** Editorial board must review each node description and update `reviewStatus` from `"needs-review"` to `"reviewed"`.

---

## 5. Wave 2 & Wave 3 Roadmap

| Phase | Node Scope | Thematic Focus | Target Milestone |
|---|---|---|---|
| **Wave 1** | 25 nodes (1–25) | Core Cross-Domain Bridges | M2.1 Early Access |
| **Wave 2** | 40 nodes (26–65) | Deep Physics, Cellular Biology, ML Optimization, Epistemology | M2.2 Beta |
| **Wave 3** | 55 nodes (66–120) | Cosmology, Global Telecom/Web History, Cognitive Biases, Evolution | M2.3 General Availability |
