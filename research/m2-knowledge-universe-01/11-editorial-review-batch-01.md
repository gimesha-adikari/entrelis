# Entrelis M2 — First Editorial Review Batch (Wave 1 Pilot Dossier)

> **Document Type:** Focused Human Editorial Review Dossier  
> **Release Target:** Milestone 2 (Wave 1 Connected Pilot Batch)  
> **Batch Scope:** 6 Connected Systems & Architecture Concepts  
> **Pilot Membership:** `concept-instruction-set-architecture`, `concept-virtual-memory`, `concept-file-systems`, `concept-concurrency`, `concept-asynchronous-io`, `concept-machine-code`  
> **Review Status Invariant:** All candidate records remain held strictly at `reviewStatus: "needs-review"` until explicit human editorial sign-off.  
> **Branch:** `research/m2-knowledge-universe-01`  
> **Date:** October 2026  

---

## 1. Executive Summary & Selection Criteria

This dossier packages **six high-confidence, source-grounded candidate knowledge nodes** selected from the 26-node Wave 1 catalog for immediate human editorial evaluation and approval.

### Topological Remediation: Why Machine Code Replaces Boolean Logic in Batch 01
In the preliminary draft of this dossier, `Boolean Logic` was provisionally included alongside five systems programming concepts. An independent topological audit revealed that within the 13-node pilot-plus-seed subgraph (7 seed concepts + 6 candidates), `concept-boolean-logic` formed an isolated disconnected component because its intermediate connector nodes (`Logic Gates` and `Formal Logic`) belong to subsequent review batches.

To deliver a strictly connected, educationally navigable pilot release without fabricating ungrounded edges, **`concept-machine-code` replaces `concept-boolean-logic` in Batch 01**:
1. **Immediate Dual Adjacency:** Machine Code connects directly to existing M1.5 seed concept `concept-cpus` (`rel-machine-code-cpus`) and to pilot candidate `concept-instruction-set-architecture` (`rel-machine-code-instruction-set-architecture`).
2. **Unified Connected Topology:** The resulting 13-node subgraph forms a **single connected component** with 19 active internal relationships and zero isolated nodes.
3. **Preservation of Boolean Logic:** `concept-boolean-logic` remains intact in the 26-node Wave 1 catalog and evidence ledger, scheduled for rollout in Batch 02 alongside its physical instantiation (`Logic Gates`) and mathematical foundation (`Formal Logic`).

### Honest Evidence & Source Access Model
Rather than characterizing the evidence as universally open access, this dossier explicitly categorizes source provenance into three transparent tiers:
1. **Directly Reviewed Open-Access Standards & Textbooks:**
   - `src-riscv-spec`: Andrew Waterman & Krste Asanović (eds.), *The RISC-V Instruction Set Manual, Volume I: Unprivileged Architecture* (RISC-V International open standard).
   - `src-ostep`: Remzi H. Arpaci-Dusseau & Andrea C. Arpaci-Dusseau, *Operating Systems: Three Easy Pieces* (UW-Madison open courseware).
   - `src-posix-base-spec`: The IEEE and The Open Group, *POSIX.1-2017 / IEEE Std 1003.1-2017 Base Specifications* (Open Group public standard).
   - `src-intel-sdm`: Intel Corporation, *Intel® 64 and IA-32 Architectures Software Developer's Manuals* (Intel developer portal open documentation).
2. **Copyrighted Academic Textbooks (Table of Contents & Chapter-Level Syllabus Verified):**
   - `src-patterson-hennessy-cod`: David A. Patterson & John L. Hennessy, *Computer Organization and Design: The Hardware/Software Interface* (MIPS 6th Edition, Morgan Kaufmann / Elsevier, ISBN 978-0-12-820109-1). Chapter and appendix structure confirmed via Elsevier catalog; line-level interior text restricted by copyright.
   - `src-bryant-csapp`: Randal E. Bryant & David R. O'Hallaron, *Computer Systems: A Programmer's Perspective* (3rd Edition, Pearson).
3. **Paywalled Seminal Primary Literature (Abstract & Metadata Confirmed):**
   - `src-denning-virtual-memory`: Peter J. Denning, "Virtual Memory", *ACM Computing Surveys*, 1970 (DOI: 10.1145/356571.356573). Abstract and structural taxonomy confirmed via ACM Digital Library; factual definitions independently corroborated by *OSTEP*.

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
- **Short Description:** The abstract interface between software and hardware that defines supported instructions, registers, addressing modes, and memory models.
- **Full Explanation:** An Instruction Set Architecture (ISA) establishes the programmer-visible contract between software and a central processor. Distinct from the underlying silicon microarchitecture (which governs physical pipeline depth, superscalar execution, and cache topology), modern ISAs explicitly partition the unprivileged user-level instruction set—defining integer/floating-point registers, instruction encodings, and addressing modes for application compilers—from separate privileged architecture specifications that define execution privilege modes (machine, supervisor, user), control and status registers, interrupt handling, and address translation hardware.

#### Authoritative References & Evidence Links
1. `src-riscv-spec`: Andrew Waterman, Krste Asanović (eds.). *The RISC-V Instruction Set Manual, Volume I: Unprivileged Architecture*. RISC-V International, Document Version 20191213, 2019-12.  
   - **URL:** [https://riscv.org/technical/specifications/](https://riscv.org/technical/specifications/)
   - **Evidence Type:** Open International Engineering Standard Specification
   - **Verification Status:** `DIRECT-FULL-TEXT-VERIFIED`
   - **Access Restrictions:** Open Access (RISC-V International official standard)
   - **Exact Location:** Preface, pp. i–iv; Chapter 1 "Introduction", pp. 1–6; Chapter 2 "RV32I Base Integer Instruction Set", pp. 13–28.
   - **Supported Claim:** Formal definition of ISA as the hardware/software interface contract; separation of architectural specification from microarchitectural implementation.
2. `src-patterson-hennessy-cod`: David A. Patterson, John L. Hennessy. *Computer Organization and Design: The Hardware/Software Interface* (MIPS 6th Edition). Morgan Kaufmann / Elsevier, 2020. ISBN: 978-0-12-820109-1.  
   - **URL:** [https://www.elsevier.com/books/computer-organization-and-design-mips-edition/patterson/978-0-12-820109-1](https://www.elsevier.com/books/computer-organization-and-design-mips-edition/patterson/978-0-12-820109-1)
   - **Evidence Type:** Academic Textbook (TOC & Chapter Headings Verified)
   - **Verification Status:** `CHAPTER-TOC-AND-METADATA-CONFIRMED`
   - **Access Restrictions:** Copyrighted Academic Textbook (publisher catalog, official table of contents, and chapter syllabus verified; full internal text not directly examined)
   - **Exact Location:** Chapter 1 "Computer Abstractions and Technology", Section 1.4 "Under the Covers: Instruction Set Architecture", pp. 16–20.

#### Graph Relationships
##### Immediately Active Pilot Relationships (Both Endpoints in Pilot + Seed Subset)
- `concept-cpus --(uses)--> concept-instruction-set-architecture` (`rel-cpus-instruction-set-architecture`, Strength: `primary`): Physical processor pipelines interpret and execute the binary instruction encodings specified by the ISA.
- `concept-machine-code --(implemented-with)--> concept-instruction-set-architecture` (`rel-machine-code-instruction-set-architecture`, Strength: `primary`): Executable machine code binary bit patterns directly implement the instruction formats, opcodes, and addressing modes defined by the processor's ISA.

##### Future Wave Forward Connections (Activate upon subsequent wave imports)
- `concept-compilers --(uses)--> concept-instruction-set-architecture` (Wave 1 Compilers)
- `concept-assembly --(implemented-with)--> concept-instruction-set-architecture` (Wave 1 Assembly)

#### Known Limitations & Pedagogical Nuances
- **Microarchitecture vs. ISA:** Learners frequently confuse the ISA (the abstract specification, e.g., x86-64, ARMv9, RISC-V) with the microarchitecture (the concrete physical implementation, e.g., Intel Golden Cove, AMD Zen 4). Multiple distinct microarchitectures implement the exact same ISA.
- **Privileged vs. Unprivileged Architecture:** Application software targets the unprivileged ISA; operating system kernels require the privileged architecture specification (governing page tables, control/status registers, timers, and trap vectoring).

#### Editorial Decision & Sign-off
- [ ] **Approve for Import** (promote to `reviewed`)
- [ ] **Requires Revisions** (specify below)
- [ ] **Defer to Later Sprint**  
*Status:* Pending Human Review  
*Reviewer:* ____________________ | *Date:* ____________________  
*Editorial Notes:* __________________________________________________

<!-- slide -->
### 02. Virtual Memory (`concept-virtual-memory`)

- **Stable Identifier:** `concept-virtual-memory`
- **Slug:** `virtual-memory`
- **Primary Domains:** `operating-systems`, `systems-programming`, `computer-architecture`
- **Candidate Review Status:** `needs-review`

#### Proposed Educational Wording
- **Short Description:** An architectural memory management scheme that provides an idealized, contiguous abstraction of storage, isolating process address spaces and mapping them to physical storage.
- **Full Explanation:** Virtual memory provides an idealized, contiguous private address space for each executing process, decoupling program addresses from physical RAM locations. Managed jointly through CPU memory management units (MMUs) and operating system page tables, virtual memory translates virtual page addresses into physical frames, enforces memory protection boundaries, and isolates concurrent processes. While secondary backing-store paging allows systems to overcommit memory, swapping inactive pages to disk is an optional operating system memory reclamation policy rather than an inherent architectural requirement of virtual memory.

#### Authoritative References & Evidence Links
1. `src-arpaci-ostep`: Remzi H. Arpaci-Dusseau, Andrea C. Arpaci-Dusseau. *Operating Systems: Three Easy Pieces*. Arpaci-Dusseau Books, Version 1.10, 2023.  
   - **URL:** [https://pages.cs.wisc.edu/~remzi/OSTEP/](https://pages.cs.wisc.edu/~remzi/OSTEP/)
   - **Evidence Type:** Open-Access Academic Textbook (UW-Madison)
   - **Verification Status:** `DIRECT-FULL-TEXT-VERIFIED`
   - **Access Restrictions:** Open Access (University of Wisconsin–Madison online textbook)
   - **Exact Location:** Chapter 13 "The Abstraction: Address Spaces", pp. 1–10; Chapter 18 "Paging: Introduction", pp. 1–18; Chapter 19 "Paging: Faster Translations (TLBs)", pp. 1–14; Chapter 20 "Paging: Smaller Tables", pp. 1–16.
   - **Supported Claim:** Complete paging mechanics, virtual address translation, multi-level page tables, and hardware TLB translation cache behavior.
2. `src-denning-virtual-memory`: Peter J. Denning. "Virtual Memory", *ACM Computing Surveys*, 2(3): 153–189, 1970.  
   - **URL:** [https://doi.org/10.1145/356571.356573](https://doi.org/10.1145/356571.356573)
   - **Evidence Type:** Seminal Primary Survey Paper (ACM Digital Library)
   - **Verification Status:** `AWAITING-STRONGER-EVIDENCE`
   - **Access Restrictions:** Paywalled (ACM Digital Library DOI 10.1145/356571.356573; abstract and survey taxonomy confirmed; full text requires institutional access)
   - **Exact Location:** Section "Introduction and History", pp. 153–158; Section "Principles of Paging", pp. 158–168.
   - **Supported Claim:** Foundational taxonomy of address translation, working sets, and memory hierarchy virtualization.
3. `src-patterson-hennessy-cod`: David A. Patterson, John L. Hennessy. *Computer Organization and Design* (MIPS 6th Edition).  
   - **Exact Location:** Chapter 5 "Large and Fast: Exploiting Memory Hierarchy", Section 5.7 "Virtual Memory", pp. 464–488.
   - **Verification Status:** `CHAPTER-TOC-AND-METADATA-CONFIRMED`
4. `src-bryant-csapp`: Randal E. Bryant, David R. O'Hallaron. *Computer Systems: A Programmer's Perspective* (3rd Edition).  
   - **Exact Location:** Chapter 9 "Virtual Memory", Section 9.2 "Address Spaces", pp. 778–780; Section 9.3 "Virtual Memory as a Tool for Memory Management", pp. 783–786.
   - **Verification Status:** `CHAPTER-TOC-AND-METADATA-CONFIRMED`

#### Graph Relationships
##### Immediately Active Pilot Relationships (Both Endpoints in Pilot + Seed Subset)
- `concept-operating-systems --(manages)--> concept-virtual-memory` (`rel-operating-systems-virtual-memory`, Strength: `primary`): Operating systems construct and manage virtual memory page tables to isolate user processes and coordinate hardware memory management units.
- `concept-virtual-memory --(part-of)--> concept-operating-systems` (`rel-virtual-memory-operating-systems`, Strength: `primary`): Virtual memory subsystems operate as an essential architectural component within modern operating system kernels.
- `concept-virtual-memory --(manages)--> concept-memory` (`rel-virtual-memory-memory`, Strength: `primary`): Virtual memory maps isolated logical process address spaces onto physical memory frames, providing uniform addressing and memory protection, with optional backing store paging or memory compression for inactive pages.
- `concept-virtual-memory --(depends-on)--> concept-cpus` (`rel-virtual-memory-cpus`, Strength: `primary`): Fast virtual-to-physical address translation relies on dedicated hardware memory management units (MMUs) and translation lookaside buffers (TLBs) integrated within CPUs.

#### Known Limitations & Pedagogical Nuances
- **Hardware vs. Software Responsibility:** A common misconception is that virtual memory translation is performed by software. Hardware MMUs translate addresses on every single CPU memory access using TLBs; the operating system kernel is invoked only during page faults, context switches, or page table modifications.
- **Disk Swapping is Optional:** While textbooks often introduce virtual memory alongside disk paging, many modern consumer operating systems (e.g., Apple iOS, Android, and embedded real-time systems) do not swap anonymous memory to disk due to flash wear and latency; they rely instead on memory compression (zram) and aggressive process termination.

#### Editorial Decision & Sign-off
- [ ] **Approve for Import** (promote to `reviewed`)
- [ ] **Requires Revisions** (specify below)
- [ ] **Defer to Later Sprint**  
*Status:* Pending Human Review  
*Reviewer:* ____________________ | *Date:* ____________________  
*Editorial Notes:* __________________________________________________

<!-- slide -->
### 03. File Systems (`concept-file-systems`)

- **Stable Identifier:** `concept-file-systems`
- **Slug:** `file-systems`
- **Primary Domains:** `operating-systems`, `storage`, `software-engineering`
- **Candidate Review Status:** `needs-review`

#### Proposed Educational Wording
- **Short Description:** Operating system abstractions that manage how persistent storage is structured, indexed, retrieved, and protected as hierarchical files and directories.
- **Full Explanation:** File systems bridge volatile main memory and block-oriented persistent storage (such as NVMe SSDs or magnetic hard drives) by organizing storage into named hierarchical byte streams, directories, and indexing metadata structures (such as inodes and extents). To maintain filesystem structural consistency and minimize data loss across unexpected power failures, modern file systems implement write-ahead journaling or copy-on-write trees; however, metadata logging preserves directory structure rather than guaranteeing that uncommitted or in-flight application file payloads survive catastrophic failure without explicit storage cache flushes.

#### Authoritative References & Evidence Links
1. `src-arpaci-ostep`: Remzi H. Arpaci-Dusseau, Andrea C. Arpaci-Dusseau. *Operating Systems: Three Easy Pieces*. Arpaci-Dusseau Books, 2023.  
   - **URL:** [https://pages.cs.wisc.edu/~remzi/OSTEP/](https://pages.cs.wisc.edu/~remzi/OSTEP/)
   - **Evidence Type:** Open-Access Academic Textbook (UW-Madison)
   - **Verification Status:** `DIRECT-FULL-TEXT-VERIFIED`
   - **Access Restrictions:** Open Access (University of Wisconsin–Madison online textbook)
   - **Exact Location:** Chapter 39 "Files and Directories", pp. 1–14; Chapter 40 "File System Implementation", pp. 1–22; Chapter 42 "Crash Consistency: FSCK and Journaling", pp. 1–20.
   - **Supported Claim:** Inode data structures, indirect blocks, directory namespace mappings, and write-ahead journaling for atomic update consistency.

#### Graph Relationships
##### Immediately Active Pilot Relationships (Both Endpoints in Pilot + Seed Subset)
- `concept-file-systems --(part-of)--> concept-operating-systems` (`rel-file-systems-operating-systems`, Strength: `primary`): File systems operate as a core component of operating system kernels to manage structured, durable persistent storage access.

##### Future Wave Forward Connections (Activate upon subsequent wave imports)
- `concept-file-systems --(uses)--> concept-data-structures` (`rel-file-systems-data-structures`, Strength: `primary`): File system implementations organize storage blocks and directory trees using specialized data structures (B-trees, hash tables, extents).
- `concept-database-systems --(depends-on)--> concept-file-systems` (`rel-database-systems-file-systems`, Strength: `primary`): Database engines write data pages, index structures, and transaction write-ahead logs to underlying file systems.

#### Known Limitations & Pedagogical Nuances
- **Filenames vs Inodes:** Beginners often believe that a filename *is* the file. In Unix/POSIX file systems, filenames are directory entries mapping names to numeric inode references; multiple directory entries can hard-link to the same underlying inode.
- **Crash Consistency vs Complete Data Integrity:** Journaling (e.g., ext4 `data=ordered`) ensures that filesystem *metadata* remains structurally intact after a crash, preventing orphaned allocations. It does not ensure that uncommitted user-space data in volatile drive write caches was durably written to physical media unless application software explicitly calls `fsync()` or `fdatasync()`.

#### Editorial Decision & Sign-off
- [ ] **Approve for Import** (promote to `reviewed`)
- [ ] **Requires Revisions** (specify below)
- [ ] **Defer to Later Sprint**  
*Status:* Pending Human Review  
*Reviewer:* ____________________ | *Date:* ____________________  
*Editorial Notes:* __________________________________________________

<!-- slide -->
### 04. Concurrency (`concept-concurrency`)

- **Stable Identifier:** `concept-concurrency`
- **Slug:** `concurrency`
- **Primary Domains:** `computer-science`, `operating-systems`, `systems-programming`
- **Candidate Review Status:** `needs-review`

#### Proposed Educational Wording
- **Short Description:** The compositional property of systems where multiple computational task lifetimes overlap in time, distinct from simultaneous parallel hardware execution.
- **Full Explanation:** Concurrency is the composition and structural organization of independently executing computations whose execution lifetimes overlap in time. Fundamentally distinct from parallelism—which requires multiple physical hardware cores executing instructions simultaneously—concurrency addresses how a system handles many tasks at once (often interleaved on a single core via scheduling and context switching). Coordinating shared mutable state across concurrent threads or asynchronous tasks requires synchronization primitives (such as mutexes, condition variables, and atomics) to prevent race conditions and enforce memory ordering.

#### Authoritative References & Evidence Links
1. `src-arpaci-ostep`: Remzi H. Arpaci-Dusseau, Andrea C. Arpaci-Dusseau. *Operating Systems: Three Easy Pieces*. Arpaci-Dusseau Books, 2023.  
   - **URL:** [https://pages.cs.wisc.edu/~remzi/OSTEP/](https://pages.cs.wisc.edu/~remzi/OSTEP/)
   - **Evidence Type:** Open-Access Academic Textbook (UW-Madison)
   - **Verification Status:** `DIRECT-FULL-TEXT-VERIFIED`
   - **Access Restrictions:** Open Access (University of Wisconsin–Madison online textbook)
   - **Exact Location:** Chapter 26 "Concurrency: An Introduction", pp. 1–14; Chapter 28 "Locks", pp. 1–20; Chapter 30 "Condition Variables", pp. 1–18; Chapter 32 "Common Concurrency Problems", pp. 1–16.
   - **Supported Claim:** Thread lifecycle, race conditions, hardware atomic instructions, mutual exclusion locks, and deadlock conditions.
2. `src-posix-base-spec`: The IEEE and The Open Group. *The Open Group Base Specifications Issue 7 / IEEE Std 1003.1-2017*.  
   - **URL:** [https://pubs.opengroup.org/onlinepubs/9699919799/](https://pubs.opengroup.org/onlinepubs/9699919799/)
   - **Evidence Type:** Open International Engineering Standard Specification
   - **Verification Status:** `DIRECT-FULL-TEXT-VERIFIED`
   - **Access Restrictions:** Open Access (Open Group public standard)
   - **Exact Location:** System Interfaces, Section 2.9 "Threads", pp. 497–505.
   - **Supported Claim:** Standard POSIX thread synchronization semantics, mutexes, condition variables, and memory synchronization barriers.

#### Graph Relationships
##### Immediately Active Pilot Relationships (Both Endpoints in Pilot + Seed Subset)
- `concept-concurrency --(depends-on)--> concept-operating-systems` (`rel-concurrency-operating-systems`, Strength: `primary`): Thread-level concurrency depends on the operating system kernel for thread scheduling, context switching, and inter-thread synchronization primitives.
- `concept-asynchronous-io --(related-to)--> concept-concurrency` (`rel-asynchronous-io-concurrency`, Strength: `primary`): Asynchronous I/O enables efficient concurrent application architectures by overlapping I/O wait latency across operations without allocating a dedicated operating system thread per connection.

##### Future Wave Forward Connections (Activate upon subsequent wave imports)
- `concept-distributed-systems --(includes)--> concept-concurrency` (Wave 1 Distributed Systems)

#### Known Limitations & Pedagogical Nuances
- **Concurrency vs. Parallelism:** A foundational conceptual distinction: concurrency is about system structure (managing many tasks at once via interleaved execution intervals), whereas parallelism is about physical execution (doing many tasks simultaneously on distinct hardware CPU cores). As Rob Pike noted: *"Concurrency is about dealing with lots of things at once. Parallelism is about doing lots of things at once."* Concurrency can occur on a single-core CPU; parallelism requires hardware concurrency.

#### Editorial Decision & Sign-off
- [ ] **Approve for Import** (promote to `reviewed`)
- [ ] **Requires Revisions** (specify below)
- [ ] **Defer to Later Sprint**  
*Status:* Pending Human Review  
*Reviewer:* ____________________ | *Date:* ____________________  
*Editorial Notes:* __________________________________________________

<!-- slide -->
### 05. Asynchronous I/O (`concept-asynchronous-io`)

- **Stable Identifier:** `concept-asynchronous-io`
- **Slug:** `asynchronous-io`
- **Primary Domains:** `systems-programming`, `operating-systems`, `distributed-systems`
- **Candidate Review Status:** `needs-review`

#### Proposed Educational Wording
- **Short Description:** A non-blocking input/output processing mechanism allowing an execution thread to initiate I/O operations and proceed with other work before data transfer completes.
- **Full Explanation:** Asynchronous I/O decouples the initiation of an input/output request from its eventual completion, allowing an execution thread to continue computational progress without blocking on high-latency storage or network hardware. Distinct from synchronous I/O multiplexing readiness notifications (such as Linux epoll or BSD kqueue, which merely signal when a file descriptor can be read without blocking), true asynchronous completion models (such as Linux io_uring, Windows IOCP, or POSIX AIO) transfer data in the background and notify the application only upon the complete arrival or delivery of the requested buffer.

#### Authoritative References & Evidence Links
1. `src-posix-base-spec`: The IEEE and The Open Group. *The Open Group Base Specifications Issue 7 / IEEE Std 1003.1-2017*.  
   - **URL:** [https://pubs.opengroup.org/onlinepubs/9699919799/](https://pubs.opengroup.org/onlinepubs/9699919799/)
   - **Evidence Type:** Open International Engineering Standard Specification
   - **Verification Status:** `DIRECT-FULL-TEXT-VERIFIED`
   - **Access Restrictions:** Open Access (Open Group public standard)
   - **Exact Location:** Section 2.8.2 "Asynchronous I/O", pp. 495–497; Header `<aio.h>`, Functions `aio_read()`, `aio_write()`, `aio_return()`, `aio_error()`.
   - **Supported Claim:** Non-blocking asynchronous I/O request control blocks (`aiocb`), completion signaling, and status retrieval interfaces.
2. `src-arpaci-ostep`: Remzi H. Arpaci-Dusseau, Andrea C. Arpaci-Dusseau. *Operating Systems: Three Easy Pieces*. Arpaci-Dusseau Books, 2023.  
   - **Exact Location:** Chapter 36 "I/O Devices", Sections 36.1–36.4 (DMA and asynchronous device interrupt notifications).
   - **Verification Status:** `DIRECT-FULL-TEXT-VERIFIED`

#### Graph Relationships
##### Immediately Active Pilot Relationships (Both Endpoints in Pilot + Seed Subset)
- `concept-asynchronous-io --(uses)--> concept-operating-systems` (`rel-asynchronous-io-operating-systems`, Strength: `primary`): Asynchronous I/O utilizes operating system kernel completion mechanisms (such as POSIX AIO, Linux io_uring, or Windows IOCP) to execute background data transfers and notify user space upon completion.
- `concept-asynchronous-io --(related-to)--> concept-concurrency` (`rel-asynchronous-io-concurrency`, Strength: `primary`): Asynchronous I/O enables efficient concurrent application architectures by overlapping I/O wait latency across operations without allocating a dedicated operating system thread per connection.

#### Known Limitations & Pedagogical Nuances
- **Readiness vs. Completion Models:** Developers frequently conflate readiness notification (e.g., `select`, `poll`, `epoll`, `kqueue`), where the OS tells you a descriptor is ready to be synchronously read, with asynchronous completion (e.g., POSIX `aio_read`, Linux `io_uring`, Windows IOCP), where the OS kernel or DMA engine actually performs the buffer copy in the background and delivers a completion event.

#### Editorial Decision & Sign-off
- [ ] **Approve for Import** (promote to `reviewed`)
- [ ] **Requires Revisions** (specify below)
- [ ] **Defer to Later Sprint**  
*Status:* Pending Human Review  
*Reviewer:* ____________________ | *Date:* ____________________  
*Editorial Notes:* __________________________________________________

<!-- slide -->
### 06. Machine Code (`concept-machine-code`)

- **Stable Identifier:** `concept-machine-code`
- **Slug:** `machine-code`
- **Primary Domains:** `computer-science`, `computer-architecture`, `hardware`
- **Candidate Review Status:** `needs-review`

#### Proposed Educational Wording
- **Short Description:** The lowest-level stream of raw binary instructions executed directly by a computer's central processing unit.
- **Full Explanation:** Machine code represents software in its purest physical execution format: binary patterns of opcodes, register specifiers, and memory offsets decoded directly by CPU execution units. High-level abstractions are stripped away, leaving arithmetic operations, memory loads, stores, and conditional jumps that manipulate hardware state registers and physical or virtual address spaces.

#### Authoritative References & Evidence Links
1. `src-intel-sdm`: Intel Corporation. *Intel® 64 and IA-32 Architectures Software Developer's Manuals*.  
   - **URL:** [https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html](https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html)
   - **Evidence Type:** Open Official Engineering Architecture Documentation
   - **Verification Status:** `DIRECT-FULL-TEXT-VERIFIED`
   - **Access Restrictions:** Open Access (Intel Developer Portal official documentation)
   - **Exact Location:** Volume 1, Chapter 3 "Basic Execution Environment", Section 3.1; Volume 2 "Instruction Set Reference".
   - **Supported Claim:** Binary instruction bytes fetched sequentially via program counter, decoded by instruction decoders, and executed across hardware registers and execution units.
2. `src-patterson-hennessy-cod`: David A. Patterson, John L. Hennessy. *Computer Organization and Design* (MIPS 6th Edition).  
   - **URL:** [https://www.elsevier.com/books/computer-organization-and-design-mips-edition/patterson/978-0-12-820109-1](https://www.elsevier.com/books/computer-organization-and-design-mips-edition/patterson/978-0-12-820109-1)
   - **Evidence Type:** Academic Textbook (TOC & Chapter Headings Verified)
   - **Verification Status:** `CHAPTER-TOC-AND-METADATA-CONFIRMED`
   - **Access Restrictions:** Copyrighted Academic Textbook (publisher catalog, official table of contents, and chapter syllabus verified; full internal text not directly examined)
   - **Exact Location:** Chapter 2 "Instructions: Language of the Computer", Sections 2.1–2.5, pp. 60–87.
   - **Supported Claim:** Binary machine instruction encoding formats (R-type, I-type, J-type bitfields) and hardware dispatch.

#### Graph Relationships
##### Immediately Active Pilot Relationships (Both Endpoints in Pilot + Seed Subset)
- `concept-machine-code --(depends-on)--> concept-cpus` (`rel-machine-code-cpus`, Strength: `primary`): Machine code instructions are decoded and executed directly by CPU arithmetic logic units, registers, and execution pipelines.
- `concept-machine-code --(implemented-with)--> concept-instruction-set-architecture` (`rel-machine-code-instruction-set-architecture`, Strength: `primary`): Machine code binary bit patterns directly implement the instruction formats, opcodes, and addressing modes defined by the processor's instruction set architecture.

##### Future Wave Forward Connections (Activate upon subsequent wave imports)
- `concept-compilers --(leads-to)--> concept-machine-code` (`rel-compilers-machine-code`, Strength: `primary`): Compilers translate high-level language source code through intermediate optimization passes to emit target machine code.
- `concept-assembly --(leads-to)--> concept-machine-code` (Wave 1 Assembly)

#### Known Limitations & Pedagogical Nuances
- **Machine Code vs. Assembly Language:** Learners often treat assembly language and machine code as synonyms. Assembly language consists of human-readable alphanumeric mnemonics (e.g., `mov rax, rbx`), whereas machine code consists strictly of numeric binary bit patterns (e.g., `48 89 D8`) directly decoded by hardware.
- **Instruction Decoding Complexity:** On modern CISC architectures (such as x86-64), variable-length binary machine instructions are decoded by hardware frontends into simpler, fixed-length internal micro-operations ($\mu\text{ops}$) executed by out-of-order execution cores.

#### Editorial Decision & Sign-off
- [ ] **Approve for Import** (promote to `reviewed`)
- [ ] **Requires Revisions** (specify below)
- [ ] **Defer to Later Sprint**  
*Status:* Pending Human Review  
*Reviewer:* ____________________ | *Date:* ____________________  
*Editorial Notes:* __________________________________________________
````

---

## 3. Pilot Graph Topology & Referential Verification

### Subgraph Membership (13 Nodes Total)
- **M1.5 Curated Seed Nodes (7):** `concept-rust`, `concept-ownership`, `concept-memory`, `concept-stack-and-heap`, `concept-operating-systems`, `concept-cpus`, `concept-transistors`.
- **Batch 01 Pilot Candidates (6):** `concept-instruction-set-architecture`, `concept-virtual-memory`, `concept-file-systems`, `concept-concurrency`, `concept-asynchronous-io`, `concept-machine-code`.

### Active Internal Relationships (19 Total)

| Relationship ID | Source Concept | Type | Target Concept | Strength | Evidence Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `rel-rust-ownership` | `concept-rust` | `uses` | `concept-ownership` | `primary` | Seed Curated |
| `rel-ownership-memory` | `concept-ownership` | `manages` | `concept-memory` | `primary` | Seed Curated |
| `rel-memory-stack-and-heap` | `concept-memory` | `includes` | `concept-stack-and-heap` | `primary` | Seed Curated |
| `rel-stack-and-heap-operating-systems` | `concept-stack-and-heap` | `depends-on` | `concept-operating-systems` | `primary` | Seed Curated |
| `rel-operating-systems-cpus` | `concept-operating-systems` | `depends-on` | `concept-cpus` | `primary` | Seed Curated |
| `rel-cpus-transistors` | `concept-cpus` | `implemented-with` | `concept-transistors` | `primary` | Seed Curated |
| `rel-operating-systems-memory` | `concept-operating-systems` | `manages` | `concept-memory` | `strong` | Seed Curated |
| `rel-rust-memory` | `concept-rust` | `related-to` | `concept-memory` | `supporting` | Seed Curated |
| `rel-cpus-instruction-set-architecture` | `concept-cpus` | `uses` | `concept-instruction-set-architecture` | `primary` | `CHAPTER-TOC-AND-METADATA-CONFIRMED` |
| `rel-machine-code-instruction-set-architecture` | `concept-machine-code` | `implemented-with` | `concept-instruction-set-architecture` | `primary` | `CHAPTER-TOC-AND-METADATA-CONFIRMED` |
| `rel-machine-code-cpus` | `concept-machine-code` | `depends-on` | `concept-cpus` | `primary` | `CHAPTER-TOC-AND-METADATA-CONFIRMED` |
| `rel-operating-systems-virtual-memory` | `concept-operating-systems` | `manages` | `concept-virtual-memory` | `primary` | `DIRECT-FULL-TEXT-VERIFIED` |
| `rel-virtual-memory-operating-systems` | `concept-virtual-memory` | `part-of` | `concept-operating-systems` | `primary` | `DIRECT-FULL-TEXT-VERIFIED` |
| `rel-virtual-memory-memory` | `concept-virtual-memory` | `manages` | `concept-memory` | `primary` | `CHAPTER-TOC-AND-METADATA-CONFIRMED` |
| `rel-virtual-memory-cpus` | `concept-virtual-memory` | `depends-on` | `concept-cpus` | `primary` | `CHAPTER-TOC-AND-METADATA-CONFIRMED` |
| `rel-file-systems-operating-systems` | `concept-file-systems` | `part-of` | `concept-operating-systems` | `primary` | `DIRECT-FULL-TEXT-VERIFIED` |
| `rel-concurrency-operating-systems` | `concept-concurrency` | `depends-on` | `concept-operating-systems` | `primary` | `DIRECT-FULL-TEXT-VERIFIED` |
| `rel-asynchronous-io-operating-systems` | `concept-asynchronous-io` | `uses` | `concept-operating-systems` | `primary` | `DIRECT-FULL-TEXT-VERIFIED` |
| `rel-asynchronous-io-concurrency` | `concept-asynchronous-io` | `related-to` | `concept-concurrency` | `primary` | `DIRECT-FULL-TEXT-VERIFIED` |

### Topological Verification Summary
- **Connected Components:** Exactly 1 (BFS traversal from `concept-rust` reaches all 13 nodes).
- **Isolated Nodes:** 0.
- **Minimum Degree:** 1 (`concept-transistors`: 1, `concept-file-systems`: 1).
- **Average Node Degree:** 2.92 edges per node.
- **Seed Adjacency:** 5 of 6 pilot candidates connect directly to seed nodes (`CPUs`, `Operating Systems`, `Memory`); the 6th (`Asynchronous I/O`) connects directly to seed `Operating Systems` and pilot `Concurrency`.

---

## 4. Human Editorial Sign-Off Procedure

To approve any of the six nodes above for eventual database import:
1. Verify the exact wording and domain classifications against educational curriculum goals.
2. Inspect the linked open-access source URLs and primary document chapters.
3. Check the respective approval box in the markdown document or sign off via GitHub review.
4. **Invariant Check:** Do not change the `reviewStatus` field in `04-concept-candidates.json` or `03-relationship-catalog.json` until written sign-off is completed by an authorized editor.
