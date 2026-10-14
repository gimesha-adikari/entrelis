# Entrelis M2 — Prioritized Content Import Plan (Recalculated)

> **Sprint:** M2 Knowledge Research Sprint 01 — Post-Audit Correction  
> **Target Release Stage:** Milestone 2 Progressive Universe Rollout  
> **Total Researched Nodes Available:** 120 Candidates (Across 6 Domains)  
> **Original Seed Baseline:** 7 M1.5 Production Concepts, 8 Seed Relationships  
> **Corrected Wave 1 Selection:** 26 High-Value Connected Nodes (33 Total Nodes in Subgraph)  
> **Review Status Invariant:** All candidate records remain at `needs-review` pending editorial board review.  

---

## 1. Topological Audit of Previous Rollout & Root Cause Analysis

An independent audit of the initial 25-node Wave 1 import plan revealed severe structural graph defects:

1. **Failure of Direct Seed Adjacency:** While the original plan claimed all 25 nodes had direct seed connections, graph analysis revealed that **16 of the 25 nodes lacked direct adjacency** to any of the 7 production seed concepts (`Rust`, `Ownership`, `Memory`, `Stack & Heap`, `Operating Systems`, `CPUs`, `Transistors`).
2. **Topological Fragmentation (Isolated Orphan Nodes):** In the combined (Seed + previous Wave 1) subgraph, **six nodes had zero relationships remaining**:
   - `concept-alan-turing` (depended on `computability-theory`, `algorithms`, and `history-of-computing`, none of which were in Wave 1)
   - `concept-linear-algebra` (depended on unimported math/ML nodes)
   - `concept-electromagnetism` (depended on unimported field physics nodes)
   - `concept-learning-psychology` (depended on unimported neuroscience nodes)
   - `concept-working-memory` (depended on unimported cognitive nodes)
   - `concept-printing-press` (depended on unimported historical nodes)
3. **Cognitive Discontinuity:** Attempting to force representation from all six domains simultaneously in Wave 1 broke graph connectivity because higher-order domains (e.g., Neuroscience, Epistemology, World History) require prerequisite foundations in Cellular Biology, Physics, and Logic.

### Corrective Strategy
Rather than inventing weak or speculative relationships to force disconnected domains into Wave 1, we:
- Recalculated graph connectivity from first principles using actual JSON relationship records.
- Selected **26 high-quality nodes** that form a **fully connected, cyclic subgraph** anchored directly to the 7 seed nodes.
- Preserved necessary prerequisite chains by moving advanced domains into Wave 2 and Wave 3, where their conceptual anchors are already established.

---

## 2. Graph Metrics Comparison: Previous vs. Corrected Wave 1

| Metric | Previous Wave 1 (32 Nodes) | Corrected Wave 1 (33 Nodes) | Status |
|---|---|---|---|
| **Candidate Nodes Imported** | 25 | **26** | +1 node |
| **Combined Subgraph Nodes (Seed + Wave 1)** | 32 (7 seed + 25) | **33** (7 seed + 26) | Verified |
| **Active Subgraph Relationships** | 33 | **61** (53 candidate + 8 seed) | +84.8% edge density |
| **Isolated Nodes (Degree 0)** | **6** (`turing`, `linalg`, `em`, `learning`, `wmem`, `press`) | **0** | **100% resolved** |
| **Leaf Nodes (Degree 1)** | 11 | **0** (all nodes degree $\ge 2$) | **100% resolved** |
| **Connected Components** | 8 disjoint components | **1 single component** | **Unified Graph** |
| **Direct Seed Adjacencies** | 9 of 25 (36.0%) | **15 of 26 (57.7%)** | +60.3% direct anchor |
| **Prerequisite Completeness** | Broken (isolated islands) | **100% complete bridging cycles** | Robust navigation |

---

## 3. Wave 1 Catalog: The 26 Connected Seed-Expansion Nodes

Wave 1 expands out from the seven seed nodes across four natural, deeply interconnected thematic arcs:

```
Seed Nodes (7)
  ├── Systems, Languages & Runtime (8)
  ├── Computer Architecture & Microelectronics (7)
  ├── Physical & Material Foundations (6)
  └── Theoretical Computer Science & Logic (5)
```

### 3.1 Systems, Languages & Runtime (8 Nodes)

1. **`concept-compilers` (Compilers)**
   - *Adjacency:* `concept-rust --(depends-on)--> concept-compilers`
   - *Internal Edges:* Connects to `Machine Code`, `Type Systems`, `Algorithms`, `Data Structures`.
   - *Educational Role:* Explains how high-level human abstractions become low-level machine instructions.
2. **`concept-type-systems` (Type Systems)**
   - *Adjacency:* `concept-rust --(uses)--> concept-type-systems`
   - *Internal Edges:* Connects to `Compilers`, `Formal Logic`.
   - *Educational Role:* Explains static verification, compile-time memory guarantees, and the Curry-Howard isomorphism.
3. **`concept-garbage-collection` (Garbage Collection)**
   - *Adjacency:* `concept-garbage-collection --(contrasts-with)--> concept-ownership`
   - *Internal Edges:* Connects to `Stack & Heap`.
   - *Educational Role:* Provides the essential operational contrast to Rust's deterministic ownership discipline.
4. **`concept-virtual-memory` (Virtual Memory)**
   - *Adjacency:* `concept-operating-systems --(manages)--> concept-virtual-memory`, `concept-virtual-memory --(manages)--> concept-memory`, `concept-virtual-memory --(depends-on)--> concept-cpus`
   - *Internal Edges:* Connects to `Operating Systems`, `Memory`, `CPUs`.
   - *Educational Role:* Explains process isolation, page tables, and hardware MMU translation.
5. **`concept-data-structures` (Data Structures)**
   - *Adjacency:* `concept-data-structures --(depends-on)--> concept-memory`
   - *Internal Edges:* Connects to `Algorithms`, `Compilers`, `File Systems`, `Database Systems`.
   - *Educational Role:* Establishes how information is organized in physical address space.
6. **`concept-concurrency` (Concurrency)**
   - *Adjacency:* `concept-concurrency --(depends-on)--> concept-operating-systems`
   - *Internal Edges:* Connects to `Asynchronous I/O`.
   - *Educational Role:* Explains multi-threaded execution, race conditions, synchronization, and happens-before ordering.
7. **`concept-file-systems` (File Systems)**
   - *Adjacency:* `concept-file-systems --(part-of)--> concept-operating-systems`
   - *Internal Edges:* Connects to `Data Structures`, `Database Systems`.
   - *Educational Role:* Bridges volatile memory to persistent disk storage hierarchies and journaling crash consistency.
8. **`concept-asynchronous-io` (Asynchronous I/O)**
   - *Adjacency:* `concept-asynchronous-io --(uses)--> concept-operating-systems`
   - *Internal Edges:* Connects to `Concurrency`.
   - *Educational Role:* Explains non-blocking event-driven architectures (epoll, kqueue, io_uring).

### 3.2 Computer Architecture & Microelectronics (7 Nodes)

9. **`concept-machine-code` (Machine Code)**
   - *Adjacency:* `concept-machine-code --(depends-on)--> concept-cpus`
   - *Internal Edges:* Connects to `Compilers`, `Instruction Set Architecture`.
   - *Educational Role:* Bridges compiler output to raw binary processor instruction streams.
10. **`concept-instruction-set-architecture` (Instruction Set Architecture)**
    - *Adjacency:* `concept-cpus --(uses)--> concept-instruction-set-architecture`
    - *Internal Edges:* Connects to `Machine Code`.
    - *Educational Role:* Defines the hardware/software boundary (x86, ARM, RISC-V).
11. **`concept-logic-gates` (Logic Gates)**
    - *Adjacency:* `concept-logic-gates --(implemented-with)--> concept-transistors`
    - *Internal Edges:* Connects to `Boolean Logic`, `Integrated Circuit`.
    - *Educational Role:* Demonstrates how physical transistor switches execute elementary Boolean operations.
12. **`concept-integrated-circuit` (The Integrated Circuit)**
    - *Adjacency:* `concept-integrated-circuit --(uses)--> concept-transistors`
    - *Internal Edges:* Connects to `Semiconductors`, `Logic Gates`, `Microprocessor Revolution`.
    - *Educational Role:* Explains the planar fabrication breakthrough that solved the "tyranny of numbers".
13. **`concept-microprocessor-revolution` (The Microprocessor Revolution)**
    - *Adjacency:* `concept-microprocessor-revolution --(leads-to)--> concept-cpus`
    - *Internal Edges:* Connects to `Integrated Circuit`, `History of Computing`.
    - *Educational Role:* Charts the transition from room-sized computing machinery to single-chip silicon CPUs.
14. **`concept-von-neumann-architecture` (Von Neumann Architecture)**
    - *Adjacency:* `concept-von-neumann-architecture --(includes)--> concept-cpus`, `concept-von-neumann-architecture --(uses)--> concept-memory`
    - *Internal Edges:* Connects to `History of Computing`.
    - *Educational Role:* Explains the stored-program computing model and the memory bus bottleneck.
15. **`concept-history-of-computing` (History of Computing)**
    - *Adjacency:* Bridges to seed via `Von Neumann Architecture` and `Microprocessor Revolution`.
    - *Internal Edges:* Connects to `Alan Turing`, `Von Neumann Architecture`, `Microprocessor Revolution`.
    - *Educational Role:* Provides historical context from mechanical computing to electronic digital systems.

### 3.3 Physical & Material Foundations (6 Nodes)

16. **`concept-semiconductors` (Semiconductors)**
    - *Adjacency:* `concept-transistors --(implemented-with)--> concept-semiconductors`
    - *Internal Edges:* Connects to `Solid-State Physics`, `Transistor Invention`, `Integrated Circuit`, `Electrons`.
    - *Educational Role:* Explains energy bandgaps, atomic doping, and electrical conductivity modulation.
17. **`concept-transistor-invention` (Invention of the Transistor)**
    - *Adjacency:* `concept-transistor-invention --(leads-to)--> concept-transistors`
    - *Internal Edges:* Connects to `Semiconductors`.
    - *Educational Role:* Documents the 1947 Bell Laboratories breakthrough replacing vacuum tubes with solid-state devices.
18. **`concept-solid-state-physics` (Solid-State Physics)**
    - *Adjacency:* Bridges to seed via `Semiconductors`.
    - *Internal Edges:* Connects to `Semiconductors`, `Atoms`.
    - *Educational Role:* Explains crystal lattices, electron wavefunctions in periodic potentials, and band theory.
19. **`concept-atoms` (Atoms)**
    - *Adjacency:* Bridges to seed via `Solid-State Physics`.
    - *Internal Edges:* Connects to `Solid-State Physics`, `Electrons`.
    - *Educational Role:* Grounds physical computing in atomic structure (protons, neutrons, electron clouds).
20. **`concept-electrons` (Electrons)**
    - *Adjacency:* Bridges to seed via `Semiconductors` and `Atoms`.
    - *Internal Edges:* Connects to `Atoms`, `Semiconductors`.
    - *Educational Role:* Explains elementary charge, leptonic properties, and mobile charge carriers in circuits.
21. **`concept-database-systems` (Database Systems)**
    - *Adjacency:* Bridges to seed via `File Systems`, `Data Structures`, and `Memory`.
    - *Internal Edges:* Connects to `File Systems`, `Data Structures`, `Algorithms`.
    - *Educational Role:* Grounds enterprise systems, query processing, and ACID transactional durability.

### 3.4 Theoretical Computer Science & Logic (5 Nodes)

22. **`concept-boolean-logic` (Boolean Logic)**
    - *Adjacency:* Bridges to seed via `Logic Gates`.
    - *Internal Edges:* Connects to `Logic Gates`, `Formal Logic`.
    - *Educational Role:* Formalizes the algebraic calculus of binary truth values underlying digital circuits.
23. **`concept-formal-logic` (Formal Logic & Deductive Reasoning)**
    - *Adjacency:* Bridges to seed via `Type Systems` and `Boolean Logic`.
    - *Internal Edges:* Connects to `Boolean Logic`, `Type Systems`, `Computability Theory`.
    - *Educational Role:* Establishes valid deductive argumentation, proof theory, and formal semantic systems.
24. **`concept-algorithms` (Algorithms)**
    - *Adjacency:* Bridges to seed via `Data Structures` and `Compilers`.
    - *Internal Edges:* Connects to `Data Structures`, `Computability Theory`, `Compilers`, `Database Systems`, `Alan Turing`.
    - *Educational Role:* Formalizes effective computational procedures and asymptotic complexity analysis.
25. **`concept-computability-theory` (Computability Theory)**
    - *Adjacency:* Bridges to seed via `Algorithms` and `Formal Logic`.
    - *Internal Edges:* Connects to `Algorithms`, `Formal Logic`, `Alan Turing`.
    - *Educational Role:* Demonstrates the mathematical limits of computation (the Halting Problem, decidability).
26. **`concept-alan-turing` (Alan Turing)**
    - *Adjacency:* Bridges to seed via `History of Computing`, `Algorithms`, and `Computability Theory`.
    - *Internal Edges:* Connects to `History of Computing`, `Computability Theory`, `Algorithms`.
    - *Educational Role:* Celebrates the foundational pioneer of universal computation, cryptanalysis, and early AI.

---

## 4. Staged Rollout Horizon: Waves 2 and 3

With the 26 nodes of Wave 1 firmly established, subsequent waves expand outward into deeper domains without encountering dangling dependencies:

```mermaid
flowchart LR
  subgraph W1 ["Wave 1: Connected Bedrock (26 Nodes)"]
    direction TB
    w1_sys["Systems & Languages"]
    w1_arch["Architecture & Hardware"]
    w1_phys["Atoms, Electrons & Solids"]
    w1_math["Logic, Algorithms & Turing"]
  end

  subgraph W2 ["Wave 2: Science & Computation (46 Nodes)"]
    direction TB
    w2_ai["AI & Machine Learning"]
    w2_math["Linear Algebra & Calculus"]
    w2_phys["Electromagnetism & Quantum"]
    w2_bio["Cells, DNA & Proteins"]
    w2_net["Networks, Internet & Crypto"]
  end

  subgraph W3 ["Wave 3: Mind, Cosmos & Society (48 Nodes)"]
    direction TB
    w3_neuro["Neuroscience & Brain"]
    w3_psych["Cognitive Psychology"]
    w3_phil["Philosophy & Epistemology"]
    w3_cosmo["Cosmology & Astrophysics"]
    w3_hist["Industrial & Modern History"]
  end

  W1 -->|Foundation| W2
  W2 -->|Foundation| W3
```

### Wave 2: Scientific & Computational Foundations (46 Nodes)
- **Mathematical Pillars:** Linear Algebra, Calculus, Probability Theory, Statistics, Information Theory, Computational Complexity.
- **AI & Modern Computing:** Artificial Intelligence, Machine Learning, Artificial Neural Networks, Deep Learning, Gradient Descent, Natural Language Processing, Computer Vision.
- **Core Physics:** Electromagnetism, Maxwell's Equations, Quantum Mechanics, Quantum Entanglement, Thermodynamics, Entropy, Special Relativity, General Relativity, Gravity, Stars, Nuclear Fusion.
- **Molecular Biology:** Cells, Cell Membrane, DNA, Genes, Gene Expression, Proteins and Enzymes.
- **Networking & Distributed Systems:** Computer Networks, Internet Protocol Suite, Client-Server Architecture, Distributed Systems, Cryptography, Open Source Movement.

### Wave 3: Universal Tapestry (48 Nodes)
- **Neurobiology:** Biological Neurons, Action Potentials, Synapses, Neurotransmitters, Human Brain, Sensory Perception, Neuroplasticity, Memory Formation, Consciousness Studies.
- **Cognitive Science & Psychology:** Cognitive Biases, Decision-Making, Learning, Attention, Working Memory.
- **Philosophy:** Epistemology, Scientific Method, Philosophy of Mind, Ethics, Free Will.
- **Cosmology & Astrophysics:** Big Bang, Cosmic Microwave Background, Black Holes, Cosmology, Space Exploration.
- **Human History & Technological Eras:** Printing Press, Scientific Revolution, Industrial Revolution, Steam Engine, Telecommunications, Space Race, Cold War Technology.

---

## 5. Technical Migration & Verification Gates

Before executing database import for Wave 1:

1. **Schema Integrity:** Verify candidate objects match the TypeScript `Concept` and `Relationship` definitions in `src/domain/knowledge/types.ts`.
2. **Referential Integrity:** Ensure all 53 relationship records reference valid IDs present in `04-concept-candidates.json` or `src/data/seed/concepts.ts`.
3. **Bibliographic Grounding:** Verify all 32 referenced sources exist in `02-source-registry.json` and maintain active, verified URLs.
4. **Rendering Simulation:** Validate that the 33-node celestial layout computes stable 3D positions without node overlap or physics simulation instability.
5. **Human Sign-off:** Editorial board must inspect `09-wave-1-editorial-package.md` before migrating review status from `needs-review` to `reviewed`.
