# Entrelis M2 — Editorial Quality & Citation Coverage Report

> **Document ID:** `REP-EDITORIAL-2026-01`  
> **Target:** Milestone 2 Article Pilot & Seed Proposals  
> **Scope:** 6 Wave 1 Pilot Articles + 7 Seed Concept Proposals (13 Comprehensive Educational Articles)  
> **Standard:** [`STD-KNOWLEDGE-2026-01` (Knowledge Writing Standard)](file:///home/gimesha/My_Projects/entrelis/research/m2-knowledge-universe-01/12-knowledge-writing-standard.md)  
> **Branch:** `research/m2-knowledge-universe-01`  
> **Date:** October 2026  

---

## 1. Executive Summary

This report establishes the baseline quality audit, citation-coverage analysis, technical correction ledger, and phased expansion strategy for the educational knowledge articles in the Entrelis Knowledge Universe.

In accordance with the [Knowledge Writing Standard (`12-knowledge-writing-standard.md`)](file:///home/gimesha/My_Projects/entrelis/research/m2-knowledge-universe-01/12-knowledge-writing-standard.md), thirteen complete, flowing, textbook-grade articles have been produced:
1. **Six Batch 01 Pilot Articles:** Located under `research/m2-knowledge-universe-01/articles/pilot/`.
2. **Seven Seed Proposal Drafts:** Located under `research/m2-knowledge-universe-01/articles/seed-proposals/`.

Every article avoids terse bullet points and fragmented summaries in favor of continuous, chapter-style educational prose (~1,400–2,200 words per article; 23,637 total words across all 13 articles). Significant technical assertions and historical landmarks are supported by compact, clickable inline references placed immediately adjacent to the relevant text.

---

## 2. Comprehensive Article Audit & Citation-Coverage Matrix

The table below details the word count, inline citation appearances, unique sources cited in Section 7, and primary evidence tiers for all 13 articles.

| Article File | Concept ID | Word Count | Inline Citation Appearances | Unique Sources Cited in Ref Section | Primary Evidence Tiers |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `pilot/instruction-set-architecture.md` | `concept-instruction-set-architecture` | 1,992 | 12 | `src-patterson-hennessy-cod`, `src-riscv-spec` | Tier 1 (Open Standard), Tier 2 (Academic Text) |
| `pilot/virtual-memory.md` | `concept-virtual-memory` | 2,132 | 14 | `src-arpaci-ostep`, `src-bryant-csapp`, `src-denning-virtual-memory`, `src-patterson-hennessy-cod` | Tier 1 (Open Text), Tier 2 (Academic Text), Tier 3 (Paywalled Paper) |
| `pilot/file-systems.md` | `concept-file-systems` | 1,976 | 10 | `src-arpaci-ostep` | Tier 1 (Open Textbook) |
| `pilot/concurrency.md` | `concept-concurrency` | 2,218 | 13 | `src-arpaci-ostep`, `src-herlihy-multiprocessor`, `src-lamport-clocks-1978`, `src-posix-base-spec` | Tier 1 (Open Text / Std), Tier 2 (Academic Text), Tier 3 (Paywalled Paper) |
| `pilot/asynchronous-io.md` | `concept-asynchronous-io` | 1,890 | 10 | `src-arpaci-ostep`, `src-posix-base-spec` | Tier 1 (Open Text & International Standard) |
| `pilot/machine-code.md` | `concept-machine-code` | 1,779 | 10 | `src-intel-sdm`, `src-patterson-hennessy-cod` | Tier 1 (Architecture Manual), Tier 2 (Academic Text) |
| `seed-proposals/rust.md` | `concept-rust` | 1,478 | 7 | `src-rust-book` | Tier 1 (Official Living Documentation) |
| `seed-proposals/ownership.md` | `concept-ownership` | 1,557 | 10 | `src-rust-book`, `src-rust-reference` | Tier 1 (Official Docs & Reference) |
| `seed-proposals/memory.md` | `concept-memory` | 1,607 | 10 | `src-arpaci-ostep`, `src-bryant-csapp` | Tier 1 (Open Textbook), Tier 2 (Academic Text) |
| `seed-proposals/stack-and-heap.md` | `concept-stack-and-heap` | 1,701 | 7 | `src-arpaci-ostep`, `src-bryant-csapp` | Tier 1 (Open Textbook), Tier 2 (Academic Text) |
| `seed-proposals/operating-systems.md` | `concept-operating-systems` | 1,846 | 10 | `src-arpaci-ostep`, `src-tanenbaum-mos` | Tier 1 (Open Textbook), Tier 2 (Academic Text) |
| `seed-proposals/cpus.md` | `concept-cpus` | 1,692 | 8 | `src-patterson-hennessy-cod` | Tier 2 (Academic Textbook) |
| `seed-proposals/transistors.md` | `concept-transistors` | 1,769 | 11 | `src-ieee-transistor-milestone`, `src-patterson-hennessy-cod`, `src-sze-semiconductor` | Tier 2 (Academic Text), Tier 4 (Archival Milestone) |

**Totals:**
- **Total Word Count:** 23,637 words across 13 articles.
- **Pilot Batch 01 Word Count:** 11,987 words across 6 pilot articles.
- **Seed Proposals Word Count:** 11,650 words across 7 seed proposals.
- **Total Inline Citation Appearances in Article Bodies:** 132 (69 pilot + 63 seed proposals).
- **Starting Baseline Inline Appearances (at commit `ff14f37`):** 124 (61 pilot + 63 seed proposals).
- **Unique Cited Reference Sources:** 14 registry sources.

---

## 3. Reconciled Citation Metrics & Epistemic Boundaries

### Reconciliation of the "96 Citations" Metric

A previous draft of this report stated "96 verified inline citations." An independent inspection identified **124 numbered inline hyperlink appearances** across the markdown bodies of the 13 articles at starting commit `ff14f37`, and **132 appearances** following the precision citations added during the current quality gate.

To ensure editorial clarity and statistical integrity, the metrics are formally defined and categorized below:

1. **Inline Citation Appearances in Prose (132 Total Appearances):**
   - Counts every rendered numbered markdown hyperlink `[n](url)` within Sections 1 through 6 across all 13 articles.
   - At starting commit `ff14f37`: exactly 124 appearances (61 pilot + 63 seed).
   - Current count: exactly 132 appearances (69 pilot + 63 seed), reflecting additional targeted citations for RV32 compressed instructions, IBM System/360 history, POSIX mutex specifications, OSTEP small page tables, and OSTEP concurrency bugs.
   - *Origin of "96":* The number 96 was an outdated estimate from early outline drafting prior to full text expansion and was carried forward without recounting the final markdown bodies.

2. **Unique Cited Registry Sources (14 Sources):**
   - Counts the distinct source entities defined in `02-source-registry.json` that appear in Section 7 of the articles:
     - `src-arpaci-ostep`, `src-bryant-csapp`, `src-denning-virtual-memory`, `src-herlihy-multiprocessor`, `src-ieee-transistor-milestone`, `src-intel-sdm`, `src-lamport-clocks-1978`, `src-patterson-hennessy-cod`, `src-posix-base-spec`, `src-riscv-spec`, `src-rust-book`, `src-rust-reference`, `src-sze-semiconductor`, `src-tanenbaum-mos`.

3. **Unique Claim-to-Source Mappings (97 Claims):**
   - Counts the distinct claim entries in `03-evidence-ledger.json` supporting the Wave 1 research package.

4. **Epistemic Boundaries — What "Verified" Means:**
   - **Hyperlink validity does not equal factual truth:** Confirming that a URL resolves with HTTP status 200 verifies only source accessibility, not the accuracy of claims in the text.
   - **Catalog metadata does not equal internal verification:** Confirming that an ISBN exists in a publisher catalog (e.g., Elsevier or Wiley) establishes publication metadata, but does not verify the technical propositions within the book.
   - **Tier-Specific Verification Scope:**
     - *Tier 1 (Direct Full-Text):* Verified directly against the full text of primary documentation and open textbooks (RISC-V specifications, OSTEP chapter PDFs, Rust book/reference chapters, POSIX base specifications, Intel SDM).
     - *Tier 2 (Academic Textbooks):* Verified against publisher catalogs, detailed tables of contents, chapter headings, and topic alignment (Patterson & Hennessy, Bryant & O'Hallaron, Tanenbaum & Bos, Herlihy & Shavit, Sze & Lee). Interior page numbers are cited only where corroborated, without claiming exhaustive word-by-word audits.
     - *Tier 3 (Paywalled Primary Papers):* Verified via published abstracts, digital object identifiers (DOIs), and corroboration in open textbooks (Denning 1970, Lamport 1978).
     - *Tier 4 (Archival Primary Records):* Verified against official historical records and dedication citations (IEEE Transistor Milestone).
   - **No Claim of Absolute Scientific Certainty:** In accordance with rigorous editorial practice, no claim is made that every factual statement has been exhaustively proven; the scope and limitations of verification are explicitly stated.

---

## 4. Technical Corrections & Evidence Improvements

During this quality gate, several substantive technical issues and generic citation links across the six pilot articles and seven seed proposals were corrected.

### 1. Instruction Set Architecture (`pilot/instruction-set-architecture.md`)
- **Binary Compatibility Qualification:** Qualified the assertion that an ISA guarantees binary portability across computers. Execution depends on matching instruction set extensions (e.g., floating point, vector), binary interfaces (ABIs), operating system system call conventions, and shared dynamic libraries.
- **Instruction Encodings (RV32I vs. Compressed 'C'):** Clarified that while base RV32I uses uniform 32-bit instruction words, the standard compressed extension ('C') introduces variable-length 16-bit instructions. Linked directly to the official specification: [https://docs.riscv.org/reference/isa/unpriv/c-st-ext.html](https://docs.riscv.org/reference/isa/unpriv/c-st-ext.html).
- **Security Nuance:** Replaced unqualified claims that hardware privilege rings provide absolute security with a discussion of microarchitectural side-channels (Spectre, Meltdown), physical fault injection, and kernel-mode software flaws.
- **IBM System/360 Historical Context:** Qualified claims regarding System/360 as the first family of compatible computers by citing the 1964 Amdahl, Blaauw, and Brooks paper and linking to official IBM historical records: [https://www.ibm.com/history/system-360](https://www.ibm.com/history/system-360).
- **Architectural vs. Microarchitectural Distinction:** Reinforced the difference between ISA specification (program-visible registers, instructions, memory semantics) and microarchitectural implementation (pipeline depth, superscalar issue width, branch predictors).

### 2. Virtual Memory (`pilot/virtual-memory.md`)
- **TLB Miss vs. Page Fault Distinction:** Formally differentiated a TLB miss from a page fault. A TLB miss is a hardware cache miss in the MMU translation buffer, resolved in single-digit nanoseconds by a hardware page-table walker without halting instruction execution or trapping to the operating system (provided the page table entry is marked present). A page fault occurs when the entry is missing or invalid, or violates permission bits; this halts instruction retirement and triggers an operating system trap to allocate memory or terminate the process.
- **Hardware Page-Table Walking:** Explained how the MMU autonomously walks multi-level hierarchical radix trees in DRAM (e.g., traversing CR3 on x86-64 or satp on RISC-V).
- **Access Latency Corrections:** Corrected memory access timings to reflect realistic physical latencies (TLB hit ~1 cycle / < 1 ns; DRAM access 50–100 ns).
- **Process Isolation & Physical Vulnerabilities:** Qualified isolation guarantees by discussing microarchitectural vulnerabilities (Rowhammer DRAM disturbance, Spectre/Meltdown speculative execution attacks).
- **Precise OSTEP Links:** Replaced generic textbook links with specific open chapter PDFs: `vm-intro.pdf`, `vm-paging.pdf`, `vm-tlbs.pdf`, and `vm-smalltables.pdf`.

### 3. Concurrency (`pilot/concurrency.md`)
- **Undefined Behavior in C Counter Example:** Removed the unsynchronized `volatile int` multi-threaded counter example. Documented that in standard C (ISO/IEC 9899:2011 §5.1.2.4), concurrent unsynchronized access where at least one thread writes constitutes a data race resulting in undefined behavior, and that `volatile` provides neither atomicity nor hardware memory barriers.
- **Assembly Interleaving Demonstration:** Replaced the flawed C code with an explicitly labeled conceptual machine-instruction trace (`load`, `increment`, `store`) showing how thread preemption between instructions corrupts intermediate state.
- **Mutex Semantics & Memory Ordering:** Clarified that a mutex enforces mutual exclusion via hardware atomic instructions and memory barriers (acquire on lock, release on unlock), rather than making arbitrary sequences of CPU instructions physically indivisible in silicon.
- **Herlihy Textbook Reconciliation:** Reconciled the Herlihy & Shavit reference with the research registry: *The Art of Multiprocessor Programming*, Revised 1st Edition, 2012, ISBN `978-0-12-397337-5`, published by Morgan Kaufmann / Elsevier.
- **Precise Links:** Linked to OSTEP chapter PDFs (`threads-intro.pdf`, `threads-locks.pdf`, `threads-cv.pdf`, `threads-bugs.pdf`) and POSIX standard documentation (`pthread_mutex_lock.html`).

### 4. Asynchronous I/O (`pilot/asynchronous-io.md`)
- **POSIX AIO Code Corrections:** Corrected the C code walkthrough into an executable, standard-conforming POSIX AIO implementation, including required headers (`<aio.h>`, `<fcntl.h>`, `<unistd.h>`, `<errno.h>`), explicit error handling (`aio_error()` returning `EINPROGRESS`), correct return value extraction (`aio_return()` returning `ssize_t`), non-blocking polling, and resource cleanup (`close(fd)`).
- **Resource Lifecycle Guardrails:** Documented that the `struct aiocb` control block and data buffer must remain allocated and untouched in memory until `aio_return()` completes.
- **Readiness vs. Completion:** Clarified the distinction between synchronous readiness-notification mechanisms (`select`, `poll`, `epoll`) and true asynchronous completion frameworks (Linux `io_uring`, Windows IOCP, POSIX AIO).
- **Implementation Divergence:** Clarified that user-space POSIX AIO (`glibc`) relies on background worker thread pools, whereas modern kernel subsystems (`io_uring`) and DMA controllers provide true hardware asynchronous operation.
- **Precise Links:** Linked to OSTEP `file-devices.pdf` and POSIX specifications for `aio.h`, `aio_read`, `aio_error`, and `aio_return`.

### 5. File Systems (`pilot/file-systems.md`)
- **Universal vs. Implementation-Specific Concepts:** Delineated universal abstractions (hierarchical directory tree, open file descriptors, separation of data and metadata) from implementation choices (inodes vs. FAT cluster chains vs. NTFS Master File Tables; direct block pointers vs. extents; write-ahead journaling vs. Copy-on-Write B-trees).
- **Crash Consistency & Persistence Prerequisites:** Documented the requirement to issue `fsync()` on the parent directory when creating new files, ensuring that directory entries are persisted to disk across unexpected crashes.
- **Precise Links:** Linked to OSTEP chapter PDFs: `file-intro.pdf`, `file-implementation.pdf`, and `file-journaling.pdf`.

### 6. Machine Code (`pilot/machine-code.md`)
- **Instruction Encoding Qualification:** Qualified the `mov eax, 42` (`B8 2A 00 00 00`) example as an illustrative architectural demonstration, explaining compiler optimization behaviors (constant folding, dead code elimination, register allocation under optimization flags `-O2`/`-O3`).
- **Citation Precision:** Updated Intel 64 and IA-32 Architectures Software Developer's Manual citations to specify Volume 1 Chapter 3 and Volume 2A Chapter 3 (MOV instruction).

### 7. Seed Concept Proposals (`articles/seed-proposals/`)
- **Rust (`rust.md`):** Updated generic Rust Book links to specific chapter URLs: `ch01-01-installation.html`, `ch04-01-what-is-ownership.html`, `ch04-02-references-and-borrowing.html`, and `ch19-01-unsafe-rust.html`.
- **Ownership (`ownership.md`):** Updated links to specific Rust Book and Reference chapters: `ch04-01-what-is-ownership.html`, `ch04-02-references-and-borrowing.html`, `ch10-03-lifetime-syntax.html`, and `reference/destructors.html`.
- **Memory (`memory.md`):** Updated generic OSTEP links to specific open PDFs: `vm-intro.pdf`, `vm-paging.pdf`, and `vm-tlbs.pdf`.
- **Stack & Heap (`stack-and-heap.md`):** Updated OSTEP links to `vm-intro.pdf` (address spaces) and `vm-api.pdf` (dynamic memory API and fragmentation).
- **Operating Systems (`operating-systems.md`):** Updated OSTEP links to `intro.pdf`, `cpu-intro.pdf`, `cpu-mechanisms.pdf`, and `file-intro.pdf`.

---

## 5. Phased Rollout Plan for the Remaining 114 Candidates

The Entrelis knowledge catalog contains **120 researched candidate concepts** distributed equally across six foundational educational domains (20 candidates per domain).

The six Batch 01 pilot articles belong to **Domain A (Programming & Computer Science)**. The remaining **114 candidate nodes** span the full breadth of human knowledge represented in `04-concept-candidates.json` and will be authored across four subsequent waves following pilot sign-off.

```
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 1: Pilot Calibration (Current Sprint — 6 Candidates)             │
│ Domain A: ISA, Virtual Memory, Concurrency, Async I/O, File Systems,   │
│           Machine Code (under human editorial review)                  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 2: Wave 1 Completion — Foundational Bridges & Systems (20 Nodes) │
│ - Domain A (Remaining 14): Compilers, Type Systems, Networks,          │
│   Distributed Systems, Cryptography, Algorithms, Data Structures,      │
│   Logic Gates, Semiconductors, Garbage Collection, Functional Prog.,   │
│   Computer Graphics, Open Source, Database Systems                     │
│ - Bridging Candidates (6): Boolean Logic, Computability Theory,        │
│   Alan Turing, Solid-State Physics, Integrated Circuit, History of Comp│
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 3: Wave 2 — Intelligence, Mind & Reasoning (32 Nodes)            │
│ - Domain B (17 Nodes): AI, Machine Learning, Neural Networks, Deep     │
│   Learning, Backpropagation, Gradient Descent, Linear Algebra,         │
│   Probability, Statistics, Information Theory, Complexity, Bayesian    │
│   Inference, Reinforcement Learning, NLP, Vision, Loss, Optimization   │
│ - Domain E (15 Nodes): Learning & Conditioning, Attention, Cognitive   │
│   Biases, Decision-Making, Working Memory, Epistemology, Formal Logic, │
│   Scientific Method, Ethics, Philosophy of Mind, Free Will, Empiricism,│
│   Rationalism, Cognitive Load Theory, Metacognition                    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 4: Wave 3 — Physical Universe, Life & the Brain (34 Nodes)       │
│ - Domain C (19 Nodes): Atoms, Electromagnetism, Quantum Mechanics,     │
│   Special Relativity, General Relativity, Gravity, Thermodynamics,     │
│   Entropy, Stars, Nuclear Fusion, Black Holes, Cosmology, Photons,     │
│   Electrons, Energy Conservation, Space Exploration, Entanglement,     │
│   Wave-Particle Duality, Particle Physics / Standard Model             │
│ - Domain D (15 Nodes): Cells, DNA, Genes, Evolution, Natural Selection,│
│   Biological Neurons, Synapses, Neuroplasticity, Action Potentials,    │
│   Human Brain, Visual Perception, Memory Consolidation, Consciousness, │
│   Proteins & Enzymes, Neurotransmitters                                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 5: Wave 4 — Civilization, Inventions & Synthesis (28 Nodes)      │
│ - Domain D (Remaining 5): Sensory Systems, Circadian Rhythms,          │
│   Homeostasis, Motor Control, Epigenetics                              │
│ - Domain E (Remaining 5): Perception / Gestalt, Philosophy of Science, │
│   Semantics / Semiotics, Heuristics, Pragmatism                        │
│ - Domain F (Remaining 18): Printing Press, Scientific Revolution,      │
│   Industrial Revolution, Harnessing Electricity, Telecommunications,   │
│   Transistor Invention, Turing 1936 Machine, Internet History, ARPANET,│
│   World Wide Web, Space Race, Satellites, Information Age, Steam       │
│   Engine, Cold War R&D, Microprocessor Revolution, Von Neumann,        │
│   Writing Systems                                                      │
└────────────────────────────────────────────────────────────────────────┘
```

### Complete Breakdown of the Remaining 114 Candidates

#### Domain A: Programming & Computer Science (14 Remaining Candidates)
1. `concept-compilers` — Compilers
2. `concept-type-systems` — Type Systems
3. `concept-computer-networks` — Computer Networks
4. `concept-distributed-systems` — Distributed Systems
5. `concept-cryptography` — Cryptography
6. `concept-algorithms` — Algorithms
7. `concept-data-structures` — Data Structures
8. `concept-logic-gates` — Logic Gates
9. `concept-semiconductors` — Semiconductors
10. `concept-garbage-collection` — Garbage Collection
11. `concept-functional-programming` — Functional Programming
12. `concept-computer-graphics` — Computer Graphics
13. `concept-open-source` — Open Source Software
14. `concept-database-systems` — Database Systems

#### Domain B: Artificial Intelligence & Mathematics (20 Candidates)
1. `concept-artificial-intelligence` — Artificial Intelligence
2. `concept-machine-learning` — Machine Learning
3. `concept-artificial-neural-networks` — Artificial Neural Networks
4. `concept-deep-learning` — Deep Learning
5. `concept-backpropagation` — Backpropagation
6. `concept-gradient-descent` — Gradient Descent
7. `concept-linear-algebra` — Linear Algebra
8. `concept-probability-theory` — Probability Theory
9. `concept-statistics` — Statistical Inference
10. `concept-information-theory` — Information Theory
11. `concept-computability-theory` — Computability Theory
12. `concept-alan-turing` — Alan Turing
13. `concept-computational-complexity` — Computational Complexity
14. `concept-boolean-logic` — Boolean Logic
15. `concept-bayesian-inference` — Bayesian Inference
16. `concept-reinforcement-learning` — Reinforcement Learning
17. `concept-natural-language-processing` — Natural Language Processing
18. `concept-computer-vision` — Computer Vision
19. `concept-loss-functions` — Loss Functions
20. `concept-mathematical-optimization` — Mathematical Optimization

#### Domain C: Physics & Space (20 Candidates)
1. `concept-atoms` — Atoms
2. `concept-electromagnetism` — Electromagnetism
3. `concept-quantum-mechanics` — Quantum Mechanics
4. `concept-special-relativity` — Special Relativity
5. `concept-general-relativity` — General Relativity
6. `concept-gravity` — Gravity
7. `concept-thermodynamics` — Thermodynamics
8. `concept-entropy-physics` — Entropy & Statistical Mechanics
9. `concept-stars` — Stars & Stellar Evolution
10. `concept-nuclear-fusion` — Nuclear Fusion
11. `concept-black-holes` — Black Holes
12. `concept-cosmology` — Cosmology & The Big Bang
13. `concept-photons` — Photons
14. `concept-electrons` — Electrons
15. `concept-solid-state-physics` — Solid-State Physics
16. `concept-energy-conservation` — Conservation of Energy
17. `concept-space-exploration` — Space Exploration & Orbital Mechanics
18. `concept-quantum-entanglement` — Quantum Entanglement
19. `concept-wave-particle-duality` — Wave-Particle Duality
20. `concept-particle-physics` — Particle Physics & The Standard Model

#### Domain D: Biology & the Human Brain (20 Candidates)
1. `concept-cells` — Cells & Cellular Biology
2. `concept-dna` — DNA & Genetic Code
3. `concept-genes` — Genes & Gene Expression
4. `concept-evolution` — Evolution & Modern Synthesis
5. `concept-natural-selection` — Natural Selection
6. `concept-biological-neurons` — Biological Neurons
7. `concept-synapses` — Synapses & Neurotransmission
8. `concept-neuroplasticity` — Neuroplasticity
9. `concept-action-potentials` — Action Potentials & Ion Channels
10. `concept-human-brain` — Human Brain & Cerebral Cortex
11. `concept-visual-perception` — Visual Perception
12. `concept-memory-consolidation` — Memory Consolidation & Hippocampus
13. `concept-consciousness-studies` — Consciousness Research
14. `concept-proteins-and-enzymes` — Proteins & Enzymes
15. `concept-neurotransmitters` — Neurotransmitters & Neuromodulation
16. `concept-sensory-systems` — Sensory Systems & Transduction
17. `concept-circadian-rhythms` — Circadian Rhythms
18. `concept-homeostasis` — Homeostasis
19. `concept-motor-control` — Motor Control & Motor Cortex
20. `concept-epigenetics` — Epigenetics & Gene Regulation

#### Domain E: Psychology & Philosophy (20 Candidates)
1. `concept-learning-psychology` — Learning & Conditioning
2. `concept-attention` — Attention & Selective Processing
3. `concept-cognitive-biases` — Cognitive Biases & Heuristics
4. `concept-decision-making` — Decision-Making & Rational Choice
5. `concept-working-memory` — Working Memory
6. `concept-epistemology` — Epistemology
7. `concept-formal-logic` — Formal Logic & Deductive Reasoning
8. `concept-scientific-method` — Scientific Method & Falsification
9. `concept-ethics` — Ethics & Moral Philosophy
10. `concept-philosophy-of-mind` — Philosophy of Mind
11. `concept-free-will` — Free Will & Determinism
12. `concept-empiricism` — Empiricism
13. `concept-rationalism` — Rationalism
14. `concept-cognitive-load-theory` — Cognitive Load Theory
15. `concept-metacognition` — Metacognition
16. `concept-perception-psychology` — Perceptual Organization & Gestalt
17. `concept-philosophy-of-science` — Philosophy of Science & Paradigm Shifts
18. `concept-semantics-and-semiotics` — Philosophy of Language & Semantics
19. `concept-heuristics` — Heuristics & Bounded Rationality
20. `concept-pragmatism` — Pragmatism

#### Domain F: History, Inventions & Civilization (20 Candidates)
1. `concept-printing-press` — The Printing Press & Movable Type
2. `concept-scientific-revolution` — The Scientific Revolution
3. `concept-industrial-revolution` — The Industrial Revolution
4. `concept-harnessing-electricity` — Harnessing Electricity
5. `concept-telecommunications` — Telecommunications & Telegraphy
6. `concept-transistor-invention` — Invention of the Transistor
7. `concept-integrated-circuit` — The Integrated Circuit
8. `concept-history-of-computing` — History of Computing
9. `concept-turing-machine-history` — The 1936 Turing Universal Machine
10. `concept-internet-history` — History of the Internet & TCP/IP
11. `concept-arpanet` — ARPANET & Packet Switching
12. `concept-world-wide-web` — The World Wide Web
13. `concept-space-race` — The Space Race & Apollo Program
14. `concept-satellite-technology` — Satellite Technology & Orbital Communications
15. `concept-information-age` — The Information Age & Digital Revolution
16. `concept-steam-engine` — The Steam Engine & Thermodynamics
17. `concept-cold-war-technology` — Cold War & Defense-Driven R&D
18. `concept-microprocessor-revolution` — The Microprocessor Revolution
19. `concept-von-neumann-architecture` — Von Neumann Architecture
20. `concept-writing-systems` — Writing Systems & Knowledge Records

**Grand Total:** 6 Pilot Candidates + 114 Remaining Candidates = **120 Researched Candidates**.

---

## 6. Transparent Disclosures & Limitations

1. **Academic Copyrighted Textbooks (`Tier 2`):** Textbooks by Patterson & Hennessy (*COD*), Bryant & O'Hallaron (*CS:APP*), Tanenbaum & Bos (*MOS*), Herlihy & Shavit, and Sze & Lee are protected by academic copyright. Their chapter headings, syllabus coverage, and table of contents were verified; line-level interior text was not ingested into automated training sets. Specific section headings and chapter titles are cited without invented interior page numbers.
2. **Paywalled Primary Literature (`Tier 3`):** Peter J. Denning's 1970 *Virtual Memory* survey and Leslie Lamport's 1978 *Logical Clocks* paper are maintained behind commercial ACM Digital Library paywalls. Their abstracts, DOIs, and structural taxonomies were verified and corroborated against open academic courseware (*OSTEP*), but institutional access is required to inspect full interior proofs.
3. **Candidate Review Status Invariant:** All six candidate pilot nodes retain `reviewStatus: "needs-review"` in catalog files until formal human editorial sign-off. The seven seed proposals are kept strictly in `articles/seed-proposals/` and do not alter production seed data.

---

## 7. Quality Gate & Validation Results

1. **Research Validator (`validate-research.mjs`):**
   - 8/8 test suites passing cleanly with **0 errors**.
   - 100% referential integrity across all 120 concepts, 211 relationships, and 96 sources.
   - All 120 candidate nodes strictly held at `reviewStatus: "needs-review"`.
   - Single connected component verified for Wave 1 (size 33) and Batch 01 (size 13).
2. **Application Code Integrity:**
   - Production seed files in `src/data/seed/` untouched.
   - Application components, types, and database schemas untouched.
   - `npm run typecheck` and `npm test` passing with **0 errors**.
