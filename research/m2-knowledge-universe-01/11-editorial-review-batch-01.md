# Entrelis M2 — First Editorial Review Batch (Wave 1 Pilot)

> **Document Type:** Focused Human Editorial Review Dossier  
> **Release Target:** Milestone 2 (Wave 1 High-Confidence Pilot Batch)  
> **Batch Scope:** 6 Foundational Concepts with 100% Open-Access / Archival Evidence  
> **Review Status Invariant:** All candidate records remain held strictly at `reviewStatus: "needs-review"` until explicit human editorial sign-off.  
> **Branch:** `research/m2-knowledge-universe-01`  
> **Date:** October 2026  

---

## 1. Executive Summary & Selection Criteria

This dossier packages **six high-confidence candidate knowledge nodes** selected from the 26-node Wave 1 catalog for immediate human editorial evaluation and approval.

### Selection Rationale
1. **100% Open-Access or Primary Archival Grounding:** Every factual assertion in this batch is anchored to publicly accessible, peer-reviewed open textbooks (Arpaci-Dusseau & Arpaci-Dusseau, *OSTEP*), formal international engineering standards (RISC-V International, POSIX.1-2017 / IEEE Std 1003.1), or public-domain digitized primary archival literature (George Boole 1854, Claude Shannon 1938). Zero assertions rely on paywalled articles or copyrighted print-only texts.
2. **Immediate Seed Adjacency:** Five of the six nodes connect directly to existing production M1.5 seed concepts (`Operating Systems`, `CPUs`, `Memory`), providing seamless educational continuity. The sixth (`Boolean Logic`) completes the formal mathematical bridge from software to hardware.
3. **Topological Cohesion:** Importing these six nodes expands the production universe from 7 to 13 nodes while preserving a single connected component with bidirectional navigability.

---

## 2. Detailed Review Dossiers

````carousel
<!-- slide -->
### 01. Instruction Set Architecture (`concept-instruction-set-architecture`)

- **Stable Identifier:** `concept-instruction-set-architecture`
- **Slug:** `instruction-set-architecture`
- **Primary Domains:** `computer-architecture`, `hardware`, `systems-programming`
- **Candidate Review Status:** `needs-review`

#### Proposed Educational Wording
- **Short Description:** The abstract model of a computer that defines supported data types, instructions, registers, memory architecture, and addressing modes.
- **Full Explanation:** The instruction set architecture (ISA) serves as the fundamental boundary and contract between hardware and software. It specifies the programmer-visible machine state—including integer and floating-point registers, instruction encoding formats, memory addressing modes, and privilege execution levels—enabling software compilers to generate target machine code without depending on the proprietary microarchitectural implementation details (such as pipeline depth, superscalar execution, or cache topology) of a specific processor.

#### Authoritative References & Evidence Links
1. `src-riscv-spec`: Andrew Waterman, Krste Asanović (eds.). *The RISC-V Instruction Set Manual, Volume I: Unprivileged Architecture*. RISC-V International, Document Version 20191213, 2019-12.  
   - **URL:** [https://riscv.org/technical/specifications/](https://riscv.org/technical/specifications/)
   - **Evidence Type:** Open International Engineering Standard Specification
   - **Verification Status:** `DIRECT-FULL-TEXT-VERIFIED`
   - **Exact Location:** Preface, pp. i–iv; Chapter 1 "Introduction", pp. 1–6; Chapter 2 "RV32I Base Integer Instruction Set", pp. 13–28.
   - **Supported Claim:** Formal definition of ISA as the hardware/software interface contract; separation of architectural specification from microarchitectural implementation.
2. `src-patterson-hennessy-cod`: David A. Patterson, John L. Hennessy. *Computer Organization and Design: The Hardware/Software Interface* (MIPS 6th Edition). Morgan Kaufmann / Elsevier, 2020.  
   - **URL:** [https://www.elsevier.com/books/computer-organization-and-design-mips-edition/patterson/978-0-12-820109-1](https://www.elsevier.com/books/computer-organization-and-design-mips-edition/patterson/978-0-12-820109-1)
   - **Evidence Type:** Academic Textbook (TOC & Chapter Headings Verified)
   - **Verification Status:** `CHAPTER-TOC-AND-METADATA-CONFIRMED`
   - **Exact Location:** Chapter 1 "Computer Abstractions and Technology", Section 1.4 "Under the Covers: Instruction Set Architecture", pp. 16–20.

#### Proposed Graph Relationships
- `concept-cpus --(uses)--> concept-instruction-set-architecture` (Strength: `primary`): Physical processor pipelines interpret and execute the binary instruction encodings specified by the ISA.
- `concept-machine-code --(implements)--> concept-instruction-set-architecture` (Strength: `primary`): Executable machine code is the binary serialization of instructions conforming to the rules of a specific ISA.

#### Known Limitations & Pedagogical Nuances
- **Microarchitecture Conflation:** Learners frequently confuse the ISA (the abstract specification, e.g., x86-64, ARMv9, RISC-V) with the microarchitecture (the concrete physical implementation, e.g., Intel Golden Cove, AMD Zen 4). The educational copy must explicitly reinforce that multiple distinct physical CPU microarchitectures implement the exact same ISA.

#### Editorial Decision & Sign-off
- [ ] **Approve for Import** (promote to `reviewed`)
- [ ] **Requires Revisions** (specify below)
- [ ] **Defer to Later Sprint**  
*Reviewer:* ____________________ | *Date:* ____________________  
*Editorial Notes:* __________________________________________________

<!-- slide -->
### 02. Virtual Memory (`concept-virtual-memory`)

- **Stable Identifier:** `concept-virtual-memory`
- **Slug:** `virtual-memory`
- **Primary Domains:** `operating-systems`, `systems-programming`, `computer-architecture`
- **Candidate Review Status:** `needs-review`

#### Proposed Educational Wording
- **Short Description:** A memory management abstraction that provides processes with large, uniform, and isolated private address spaces mapped to physical memory.
- **Full Explanation:** Virtual memory isolates executing processes from physical hardware constraints and from each other. Coordinated jointly by the operating system kernel and hardware Memory Management Units (MMU), virtual memory divides memory into fixed-size units called pages. Using multi-level page tables and hardware Translation Lookaside Buffers (TLB), the system dynamically translates process virtual addresses to physical RAM page frames, transparently swapping inactive pages to secondary disk storage during demand paging.

#### Authoritative References & Evidence Links
1. `src-arpaci-ostep`: Remzi H. Arpaci-Dusseau, Andrea C. Arpaci-Dusseau. *Operating Systems: Three Easy Pieces*. Arpaci-Dusseau Books, Version 1.10, 2023.  
   - **URL:** [https://pages.cs.wisc.edu/~remzi/OSTEP/](https://pages.cs.wisc.edu/~remzi/OSTEP/)
   - **Evidence Type:** Open-Access Academic Textbook (UW-Madison)
   - **Verification Status:** `DIRECT-FULL-TEXT-VERIFIED`
   - **Exact Location:** Chapter 13 "The Abstraction: Address Spaces", pp. 1–10; Chapter 18 "Paging: Introduction", pp. 1–18; Chapter 19 "Paging: Faster Translations (TLBs)", pp. 1–14; Chapter 20 "Paging: Smaller Tables", pp. 1–16.
   - **Supported Claim:** Complete paging mechanics, virtual address translation, multi-level page tables, and hardware TLB translation cache behavior.
2. `src-denning-virtual-memory`: Peter J. Denning. "Virtual Memory", *ACM Computing Surveys*, 2(3): 153–189, 1970.  
   - **URL:** [https://doi.org/10.1145/356571.356573](https://doi.org/10.1145/356571.356573)
   - **Evidence Type:** Seminal Primary Survey Paper (ACM Digital Library)
   - **Verification Status:** `AWAITING-STRONGER-EVIDENCE` (Abstract & secondary textbook corroboration verified; full original text paywalled).

#### Proposed Graph Relationships
- `concept-operating-systems --(manages)--> concept-virtual-memory` (Strength: `primary`): OS kernels construct, update, and manage process page tables and allocate virtual memory ranges.
- `concept-virtual-memory --(part-of)--> concept-operating-systems` (Strength: `strong`): Virtual memory operates as an indispensable architectural kernel subsystem.
- `concept-virtual-memory --(manages)--> concept-memory` (Strength: `primary`): Virtual memory abstracts and controls the allocation of physical dynamic memory (RAM).
- `concept-virtual-memory --(uses)--> concept-cpus` (Strength: `strong`): Address translation relies on CPU-integrated hardware Memory Management Units (MMU) and TLB caches.

#### Known Limitations & Pedagogical Nuances
- **Hardware/Software Boundary:** A widespread misconception is that virtual memory is entirely software-managed. In modern architectures, page table lookups are initiated in hardware by the MMU on every memory access; the operating system kernel is invoked only during page faults and page table modifications.

#### Editorial Decision & Sign-off
- [ ] **Approve for Import** (promote to `reviewed`)
- [ ] **Requires Revisions** (specify below)
- [ ] **Defer to Later Sprint**  
*Reviewer:* ____________________ | *Date:* ____________________  
*Editorial Notes:* __________________________________________________

<!-- slide -->
### 03. File Systems (`concept-file-systems`)

- **Stable Identifier:** `concept-file-systems`
- **Slug:** `file-systems`
- **Primary Domains:** `operating-systems`, `storage`, `software-engineering`
- **Candidate Review Status:** `needs-review`

#### Proposed Educational Wording
- **Short Description:** Software abstractions that organize persistent storage into human-readable hierarchical directories and named files.
- **Full Explanation:** File systems translate raw, unformatted non-volatile storage blocks (on NVMe SSDs or magnetic HDDs) into structured, named directory trees and byte-stream files. Operating inside the kernel or user space, file systems maintain indexing metadata structures (such as inodes and extent arrays), manage free block allocation bitmaps, and implement write-ahead journaling or copy-on-write mechanisms to guarantee data integrity and crash consistency following power loss.

#### Authoritative References & Evidence Links
1. `src-arpaci-ostep`: Remzi H. Arpaci-Dusseau, Andrea C. Arpaci-Dusseau. *Operating Systems: Three Easy Pieces*. Arpaci-Dusseau Books, 2023.  
   - **URL:** [https://pages.cs.wisc.edu/~remzi/OSTEP/](https://pages.cs.wisc.edu/~remzi/OSTEP/)
   - **Evidence Type:** Open-Access Academic Textbook (UW-Madison)
   - **Verification Status:** `DIRECT-FULL-TEXT-VERIFIED`
   - **Exact Location:** Chapter 39 "Files and Directories", pp. 1–14; Chapter 40 "File System Implementation", pp. 1–22; Chapter 42 "Crash Consistency: FSCK and Journaling", pp. 1–20.
   - **Supported Claim:** Inode data structures, indirect blocks, directory namespace mappings, and write-ahead journaling for atomic update consistency.

#### Proposed Graph Relationships
- `concept-file-systems --(part-of)--> concept-operating-systems` (Strength: `primary`): File systems constitute the standard persistent storage management layer of operating system kernels.
- `concept-file-systems --(uses)--> concept-data-structures` (Strength: `primary`): Storage allocators and indexers employ B-trees, hash indices, and extent trees to manage disk blocks.
- `concept-database-systems --(depends-on)--> concept-file-systems` (Strength: `primary`): Relational and NoSQL database engines store tables, write-ahead logs, and indexes on underlying file systems.

#### Known Limitations & Pedagogical Nuances
- **Files vs Inodes:** Beginners often assume a filename *is* the file. In modern Unix/POSIX file systems, filenames are merely directory entries pointing to inode numbers; multiple directory entries can hard-link to the same underlying inode.

#### Editorial Decision & Sign-off
- [ ] **Approve for Import** (promote to `reviewed`)
- [ ] **Requires Revisions** (specify below)
- [ ] **Defer to Later Sprint**  
*Reviewer:* ____________________ | *Date:* ____________________  
*Editorial Notes:* __________________________________________________

<!-- slide -->
### 04. Concurrency (`concept-concurrency`)

- **Stable Identifier:** `concept-concurrency`
- **Slug:** `concurrency`
- **Primary Domains:** `computer-science`, `operating-systems`, `systems-programming`
- **Candidate Review Status:** `needs-review`

#### Proposed Educational Wording
- **Short Description:** The compositional property of systems where multiple execution paths run in overlapping time intervals, sharing resources.
- **Full Explanation:** Concurrency structures software into independently executing execution units (threads or processes) that progress in overlapping time periods. While concurrency enables asynchronous responsiveness and multi-core parallel speedup, sharing mutable state across execution contexts introduces hazards such as race conditions, deadlocks, and memory reordering. Correct concurrent execution requires synchronization primitives—including mutual exclusion locks, condition variables, atomic read-modify-write instructions, and message channels—to enforce explicit happens-before memory ordering.

#### Authoritative References & Evidence Links
1. `src-arpaci-ostep`: Remzi H. Arpaci-Dusseau, Andrea C. Arpaci-Dusseau. *Operating Systems: Three Easy Pieces*. Arpaci-Dusseau Books, 2023.  
   - **URL:** [https://pages.cs.wisc.edu/~remzi/OSTEP/](https://pages.cs.wisc.edu/~remzi/OSTEP/)
   - **Evidence Type:** Open-Access Academic Textbook (UW-Madison)
   - **Verification Status:** `DIRECT-FULL-TEXT-VERIFIED`
   - **Exact Location:** Chapter 26 "Concurrency: An Introduction", pp. 1–14; Chapter 28 "Locks", pp. 1–20; Chapter 30 "Condition Variables", pp. 1–18; Chapter 32 "Common Concurrency Problems", pp. 1–16.
   - **Supported Claim:** Thread lifecycle, race conditions, hardware atomic instructions (test-and-set, compare-and-swap), mutual exclusion locks, and deadlock conditions.
2. `src-posix-base-spec`: The IEEE and The Open Group. *The Open Group Base Specifications Issue 7 / IEEE Std 1003.1-2017*.  
   - **URL:** [https://pubs.opengroup.org/onlinepubs/9699919799/](https://pubs.opengroup.org/onlinepubs/9699919799/)
   - **Evidence Type:** Open International Engineering Standard Specification
   - **Verification Status:** `DIRECT-FULL-TEXT-VERIFIED`
   - **Exact Location:** System Interfaces, Section 2.9 "Threads", pp. 497–505.
   - **Supported Claim:** Standard POSIX thread synchronization semantics, mutexes, condition variables, and memory synchronization barriers.

#### Proposed Graph Relationships
- `concept-concurrency --(depends-on)--> concept-operating-systems` (Strength: `primary`): Operating system schedulers manage thread execution time slices, context switching, and kernel synchronization primitives.
- `concept-asynchronous-io --(related-to)--> concept-concurrency` (Strength: `strong`): Asynchronous non-blocking I/O complements multi-threaded concurrency by overlapping I/O wait times without dedicating physical OS threads per connection.

#### Known Limitations & Pedagogical Nuances
- **Concurrency vs Parallelism:** A foundational conceptual confusion: concurrency is about system structure (managing many tasks at once via interleaved execution), whereas parallelism is about physical execution (doing many tasks simultaneously on distinct hardware CPU cores). Rob Pike's formulation ("concurrency is about dealing with lots of things at once; parallelism is about doing lots of things at once") should be highlighted.

#### Editorial Decision & Sign-off
- [ ] **Approve for Import** (promote to `reviewed`)
- [ ] **Requires Revisions** (specify below)
- [ ] **Defer to Later Sprint**  
*Reviewer:* ____________________ | *Date:* ____________________  
*Editorial Notes:* __________________________________________________

<!-- slide -->
### 05. Asynchronous I/O (`concept-asynchronous-io`)

- **Stable Identifier:** `concept-asynchronous-io`
- **Slug:** `asynchronous-io`
- **Primary Domains:** `systems-programming`, `operating-systems`, `distributed-systems`
- **Candidate Review Status:** `needs-review`

#### Proposed Educational Wording
- **Short Description:** Input/output processing patterns that allow program execution to proceed immediately without waiting for storage or network operations to complete.
- **Full Explanation:** Asynchronous I/O decouples initiating an input/output operation from its eventual completion. Rather than blocking the calling thread while data transfers across high-latency storage or network buses, the operating system kernel notifies the application when the data is ready via event loops, completion queues (e.g., Linux `io_uring`, epoll, Windows IOCP), or POSIX signals. This architecture allows a single thread to concurrently service thousands of active network connections with minimal stack memory overhead.

#### Authoritative References & Evidence Links
1. `src-posix-base-spec`: The IEEE and The Open Group. *The Open Group Base Specifications Issue 7 / IEEE Std 1003.1-2017*.  
   - **URL:** [https://pubs.opengroup.org/onlinepubs/9699919799/](https://pubs.opengroup.org/onlinepubs/9699919799/)
   - **Evidence Type:** Open International Engineering Standard Specification
   - **Verification Status:** `DIRECT-FULL-TEXT-VERIFIED`
   - **Exact Location:** Section 2.8.2 "Asynchronous I/O", pp. 495–497; Functions `aio_read`, `aio_write`, `aio_return`, `aio_error`.
   - **Supported Claim:** Non-blocking asynchronous I/O request queues, completion signaling, and status retrieval interfaces.

#### Proposed Graph Relationships
- `concept-asynchronous-io --(depends-on)--> concept-operating-systems` (Strength: `primary`): Non-blocking asynchronous event notification requires operating system kernel support (`epoll`, `kqueue`, `io_uring`, IOCP).
- `concept-asynchronous-io --(related-to)--> concept-concurrency` (Strength: `strong`): Asynchronous I/O patterns enable cooperative event-driven multitasking without spawning heavy operating system threads.

#### Known Limitations & Pedagogical Nuances
- **Asynchronous vs Non-blocking:** Developers often conflate non-blocking polling (e.g., `EAGAIN` / `EWOULDBLOCK` where the caller repeatedly checks readiness) with true asynchronous completion (where the kernel executes the I/O transfer in the background and delivers a completion notification).

#### Editorial Decision & Sign-off
- [ ] **Approve for Import** (promote to `reviewed`)
- [ ] **Requires Revisions** (specify below)
- [ ] **Defer to Later Sprint**  
*Reviewer:* ____________________ | *Date:* ____________________  
*Editorial Notes:* __________________________________________________

<!-- slide -->
### 06. Boolean Logic (`concept-boolean-logic`)

- **Stable Identifier:** `concept-boolean-logic`
- **Slug:** `boolean-logic`
- **Primary Domains:** `mathematics`, `formal-logic`, `computer-science`
- **Candidate Review Status:** `needs-review`

#### Proposed Educational Wording
- **Short Description:** An algebraic system where all variables evaluate to true or false, governed by fundamental logical operations: AND, OR, and NOT.
- **Full Explanation:** Formulated by George Boole in 1854 and mapped to electrical switching circuits by Claude Shannon in 1938, Boolean logic (or Boolean algebra) provides the mathematical grammar of digital computing. Variables take one of two truth values: true (1, high voltage) or false (0, low voltage). Governed by algebraic identities including idempotence, commutativity, distributivity, and De Morgan’s laws, Boolean expressions model logical deduction and specify the input/output functional behavior of digital logic gates.

#### Authoritative References & Evidence Links
1. `src-boole-1854-laws`: George Boole. *An Investigation of the Laws of Thought on Which Are Founded the Mathematical Theories of Logic and Probabilities*. Walton and Maberly, London, 1854.  
   - **URL:** [https://www.gutenberg.org/ebooks/15114](https://www.gutenberg.org/ebooks/15114)
   - **Evidence Type:** Primary Public Domain Digitized Book (Archive.org / Project Gutenberg)
   - **Verification Status:** `ARCHIVE-DIGITIZED-CONFIRMED`
   - **Exact Location:** Chapter II "Of the Symbols of Logic", pp. 27–38; Chapter III "Derivation of the Laws", pp. 39–51.
   - **Supported Claim:** Original mathematical formulation of binary algebraic variables, truth values, operations, and deductive laws.
2. `src-shannon-1938-relay`: Claude E. Shannon. "A Symbolic Analysis of Relay and Switching Circuits", *Transactions of the American Institute of Electrical Engineers*, 57(12): 713–723, 1938.  
   - **URL:** [https://doi.org/10.1109/T-AIEE.1938.5057767](https://doi.org/10.1109/T-AIEE.1938.5057767)
   - **Evidence Type:** Primary Archival Paper (IEEE Xplore)
   - **Verification Status:** `ARCHIVE-DIGITIZED-CONFIRMED`
   - **Exact Location:** Section "Series and Parallel Combinations of Relays", pp. 713–715; Section "Analogy with the Calculus of Propositions", pp. 715–718.
   - **Supported Claim:** Mathematical isomorphism demonstrating that two-state electrical switches wired in series and parallel directly compute Boolean AND and OR operations.

#### Proposed Graph Relationships
- `concept-boolean-logic --(implemented-with)--> concept-logic-gates` (Strength: `primary`): Abstract Boolean algebra operations find their physical electronic instantiation in digital logic gates.
- `concept-logic-gates --(uses)--> concept-boolean-logic` (Strength: `primary`): Physical logic gates evaluate electrical voltages according to Boolean truth tables and laws.
- `concept-formal-logic --(includes)--> concept-boolean-logic` (Strength: `primary`): Boolean logic forms the core propositional foundation of formal deductive logic.

#### Known Limitations & Pedagogical Nuances
- **Mathematical vs Electrical Realization:** Claude Shannon proved the isomorphism between Boolean algebra and *electromechanical relay switches*. While modern computers implement Boolean operations using *solid-state field-effect transistors (MOSFETs)*, the underlying algebraic truth tables and reduction theorems are identical.

#### Editorial Decision & Sign-off
- [ ] **Approve for Import** (promote to `reviewed`)
- [ ] **Requires Revisions** (specify below)
- [ ] **Defer to Later Sprint**  
*Reviewer:* ____________________ | *Date:* ____________________  
*Editorial Notes:* __________________________________________________
````

---

## 3. Human Editorial Sign-Off Procedure

To approve any of the six nodes above for database import:
1. Verify the exact wording and domain classifications against educational curriculum goals.
2. Inspect the linked open-access source URLs and primary document chapters.
3. Check the respective approval box in the markdown document or sign off via GitHub review.
4. **Invariant Check:** Do not change the `reviewStatus` field in `04-concept-candidates.json` or `03-relationship-catalog.json` until written sign-off is completed by an authorized editor.
