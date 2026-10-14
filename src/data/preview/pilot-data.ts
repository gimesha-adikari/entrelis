import type { Concept, Relationship, Source } from "@/domain/knowledge/types";
import { SEED_CONCEPTS, SEED_RELATIONSHIPS } from "@/data/seed";
import type { ArticleConnection, PilotArticleMetadata, RelatedConceptSummary } from "./types";

/**
 * The six candidate concepts selected for the Milestone 2 Batch 01 Pilot.
 * All records strictly maintain reviewStatus: "needs-review" awaiting editorial approval.
 * None of these are imported into the production seed dataset.
 */
export const PILOT_CONCEPTS: readonly Concept[] = [
  {
    id: "concept-instruction-set-architecture",
    slug: "instruction-set-architecture",
    name: "Instruction Set Architecture",
    shortDescription:
      "The abstract interface between software and hardware that defines supported instructions, registers, addressing modes, and memory models.",
    domains: ["computer-architecture", "hardware"],
    tags: ["isa", "risc", "cisc", "microarchitecture", "hardware-software-interface"],
    sourceIds: ["src-patterson-hennessy-cod", "src-riscv-spec"],
    reviewStatus: "needs-review",
    aliases: ["ISA", "Processor Architecture", "Machine Architecture"],
  },
  {
    id: "concept-virtual-memory",
    slug: "virtual-memory",
    name: "Virtual Memory",
    shortDescription:
      "An architectural memory management scheme that provides an idealized, contiguous abstraction of storage, isolating process address spaces and mapping them to physical storage.",
    domains: ["computer-science", "systems-architecture"],
    tags: ["paging", "mmu", "page-tables", "address-translation", "memory-protection"],
    sourceIds: ["src-denning-virtual-memory", "src-arpaci-ostep"],
    reviewStatus: "needs-review",
    aliases: ["VM", "Demand Paging", "Paged Virtual Memory"],
  },
  {
    id: "concept-file-systems",
    slug: "file-systems",
    name: "File Systems",
    shortDescription:
      "Operating system abstractions that manage how persistent storage is structured, indexed, retrieved, and protected as hierarchical files and directories.",
    domains: ["computer-science", "systems-architecture"],
    tags: ["inodes", "storage", "metadata", "journaling", "directories"],
    sourceIds: ["src-arpaci-ostep", "src-tanenbaum-mos"],
    reviewStatus: "needs-review",
    aliases: ["Filesystem", "FS", "Storage Systems"],
  },
  {
    id: "concept-concurrency",
    slug: "concurrency",
    name: "Concurrency",
    shortDescription:
      "The compositional property of systems where multiple computational task lifetimes overlap in time, distinct from simultaneous parallel hardware execution.",
    domains: ["computer-science", "systems-architecture"],
    tags: ["multithreading", "parallelism", "synchronization", "deadlock", "race-conditions"],
    sourceIds: ["src-lamport-clocks-1978", "src-herlihy-multiprocessor"],
    reviewStatus: "needs-review",
    aliases: ["Concurrent Programming", "Multithreaded Systems"],
  },
  {
    id: "concept-asynchronous-io",
    slug: "asynchronous-io",
    name: "Asynchronous I/O",
    shortDescription:
      "A non-blocking input/output processing mechanism allowing an execution thread to initiate I/O operations and proceed with other work before data transfer completes.",
    domains: ["computer-science", "systems-architecture"],
    tags: ["non-blocking", "event-loop", "epoll", "io-multiplexing", "system-calls"],
    sourceIds: ["src-posix-base-spec", "src-arpaci-ostep"],
    reviewStatus: "needs-review",
    aliases: ["Async I/O", "Non-blocking I/O", "AIO"],
  },
  {
    id: "concept-machine-code",
    slug: "machine-code",
    name: "Machine Code",
    shortDescription:
      "The lowest-level stream of raw binary instructions executed directly by a computer's central processing unit.",
    domains: ["computer-science", "computer-architecture", "hardware"],
    tags: ["binary-instructions", "opcodes", "execution", "assembly", "microarchitecture"],
    sourceIds: ["src-patterson-hennessy-cod", "src-intel-sdm"],
    reviewStatus: "needs-review",
    aliases: ["Machine Language", "Native Code", "Binary Instructions"],
  },
] as const;

/**
 * The 11 verified relationships connecting the six pilot candidates to seed concepts
 * and to one another. All records strictly maintain reviewStatus: "needs-review".
 */
export const PILOT_RELATIONSHIPS: readonly Relationship[] = [
  {
    id: "rel-cpus-instruction-set-architecture",
    sourceConceptId: "concept-cpus",
    targetConceptId: "concept-instruction-set-architecture",
    type: "uses",
    explanation:
      "CPUs realize the architectural specification and instruction encoding defined by their instruction set architecture.",
    strength: "primary",
    sourceIds: ["src-patterson-hennessy-cod", "src-riscv-spec"],
    reviewStatus: "needs-review",
  },
  {
    id: "rel-machine-code-instruction-set-architecture",
    sourceConceptId: "concept-machine-code",
    targetConceptId: "concept-instruction-set-architecture",
    type: "related-to",
    explanation:
      "Machine code binary bit patterns directly represent the instruction formats, opcodes, and addressing modes specified by a processor's instruction set architecture.",
    strength: "primary",
    sourceIds: ["src-patterson-hennessy-cod", "src-intel-sdm"],
    reviewStatus: "needs-review",
  },
  {
    id: "rel-machine-code-cpus",
    sourceConceptId: "concept-machine-code",
    targetConceptId: "concept-cpus",
    type: "depends-on",
    explanation:
      "The physical execution of machine code instructions depends on a compatible central processing unit whose hardware decoders, arithmetic logic units, and execution pipelines interpret the binary bitstream.",
    strength: "primary",
    sourceIds: ["src-patterson-hennessy-cod", "src-intel-sdm"],
    reviewStatus: "needs-review",
  },
  {
    id: "rel-operating-systems-virtual-memory",
    sourceConceptId: "concept-operating-systems",
    targetConceptId: "concept-virtual-memory",
    type: "manages",
    explanation:
      "Operating systems construct and manage virtual memory page tables to isolate user processes and coordinate hardware memory management units.",
    strength: "primary",
    sourceIds: ["src-denning-virtual-memory", "src-arpaci-ostep"],
    reviewStatus: "needs-review",
  },
  {
    id: "rel-virtual-memory-operating-systems",
    sourceConceptId: "concept-virtual-memory",
    targetConceptId: "concept-operating-systems",
    type: "part-of",
    explanation:
      "Virtual memory subsystems operate as an essential architectural component within modern operating system kernels.",
    strength: "primary",
    sourceIds: ["src-denning-virtual-memory", "src-arpaci-ostep"],
    reviewStatus: "needs-review",
  },
  {
    id: "rel-virtual-memory-memory",
    sourceConceptId: "concept-virtual-memory",
    targetConceptId: "concept-memory",
    type: "manages",
    explanation:
      "Virtual memory maps isolated logical process address spaces onto physical memory frames, providing uniform addressing and memory protection, with optional backing store paging or memory compression for inactive pages.",
    strength: "primary",
    sourceIds: ["src-denning-virtual-memory", "src-bryant-csapp"],
    reviewStatus: "needs-review",
  },
  {
    id: "rel-virtual-memory-cpus",
    sourceConceptId: "concept-virtual-memory",
    targetConceptId: "concept-cpus",
    type: "depends-on",
    explanation:
      "Fast virtual-to-physical address translation relies on dedicated hardware memory management units (MMUs) and translation lookaside buffers (TLBs) integrated within CPUs.",
    strength: "primary",
    sourceIds: ["src-denning-virtual-memory", "src-patterson-hennessy-cod"],
    reviewStatus: "needs-review",
  },
  {
    id: "rel-file-systems-operating-systems",
    sourceConceptId: "concept-file-systems",
    targetConceptId: "concept-operating-systems",
    type: "part-of",
    explanation:
      "File systems operate as a core component of operating system kernels to manage structured, durable persistent storage access.",
    strength: "primary",
    sourceIds: ["src-arpaci-ostep", "src-tanenbaum-mos"],
    reviewStatus: "needs-review",
  },
  {
    id: "rel-concurrency-operating-systems",
    sourceConceptId: "concept-concurrency",
    targetConceptId: "concept-operating-systems",
    type: "depends-on",
    explanation:
      "OS-managed thread concurrency depends on the operating system kernel for thread scheduling, preemptive context switching, and inter-thread synchronization primitives, though concurrency itself can also be realized in bare-metal environments or user-space runtimes.",
    strength: "primary",
    sourceIds: ["src-arpaci-ostep", "src-herlihy-multiprocessor"],
    reviewStatus: "needs-review",
  },
  {
    id: "rel-asynchronous-io-operating-systems",
    sourceConceptId: "concept-asynchronous-io",
    targetConceptId: "concept-operating-systems",
    type: "uses",
    explanation:
      "Asynchronous I/O utilizes operating system kernel completion mechanisms (such as POSIX AIO, Linux io_uring, or Windows IOCP) to execute background data transfers and notify user space upon completion.",
    strength: "primary",
    sourceIds: ["src-posix-base-spec", "src-arpaci-ostep"],
    reviewStatus: "needs-review",
  },
  {
    id: "rel-asynchronous-io-concurrency",
    sourceConceptId: "concept-asynchronous-io",
    targetConceptId: "concept-concurrency",
    type: "related-to",
    explanation:
      "Asynchronous I/O enables efficient concurrent application architectures by overlapping I/O wait latency across operations without allocating a dedicated operating system thread per connection.",
    strength: "primary",
    sourceIds: ["src-posix-base-spec", "src-herlihy-multiprocessor"],
    reviewStatus: "needs-review",
  },
] as const;

/**
 * Authoritative sources cited across the six pilot candidates and articles.
 */
export const PILOT_SOURCES: readonly Source[] = [
  {
    id: "src-riscv-spec",
    title: "The RISC-V Instruction Set Manual, Volume I: Unprivileged Architecture",
    url: "https://riscv.org/technical/specifications/",
    publisher: "RISC-V International",
    author: "Andrew Waterman and Krste Asanović (Editors)",
    type: "standards",
    publicationDate: "2019-12-13",
    notes:
      "Open standard defining an open, modular instruction set architecture based on RISC principles.",
  },
  {
    id: "src-patterson-hennessy-cod",
    title: "Computer Organization and Design: The Hardware/Software Interface (6th Edition)",
    url: "https://www.elsevier.com/books/computer-organization-and-design-mips-edition/patterson/978-0-12-820109-1",
    publisher: "Morgan Kaufmann / Elsevier",
    author: "David A. Patterson and John L. Hennessy",
    type: "textbook",
    publicationDate: "2020",
    notes:
      "Standard university textbook explaining processor execution pipelines, logic design, and hardware/software interfaces.",
  },
  {
    id: "src-arpaci-ostep",
    title: "Operating Systems: Three Easy Pieces",
    url: "https://pages.cs.wisc.edu/~remzi/OSTEP/",
    publisher: "Arpaci-Dusseau Books",
    author: "Remzi H. Arpaci-Dusseau and Andrea C. Arpaci-Dusseau",
    type: "textbook",
    publicationDate: "2023-11",
    notes:
      "Foundational operating systems textbook covering virtualization, concurrency, and persistence.",
  },
  {
    id: "src-bryant-csapp",
    title: "Computer Systems: A Programmer's Perspective (3rd Edition)",
    url: "https://csapp.cs.cmu.edu/",
    publisher: "Pearson",
    author: "Randal E. Bryant and David R. O'Hallaron",
    type: "textbook",
    publicationDate: "2015",
    notes:
      "Core systems architecture textbook covering virtual memory, process address spaces, and machine code.",
  },
  {
    id: "src-denning-virtual-memory",
    title: "Virtual Memory",
    url: "https://doi.org/10.1145/356571.356573",
    publisher: "Association for Computing Machinery (ACM)",
    author: "Peter J. Denning",
    type: "academic",
    publicationDate: "1970-09",
    notes:
      "Seminal ACM Computing Surveys monograph articulating the architectural and theoretical foundations of virtual memory.",
  },
  {
    id: "src-herlihy-multiprocessor",
    title: "The Art of Multiprocessor Programming (Revised 1st Edition)",
    url: "https://www.elsevier.com/books/the-art-of-multiprocessor-programming/herlihy/978-0-12-397337-5",
    publisher: "Morgan Kaufmann / Elsevier",
    author: "Maurice Herlihy and Nir Shavit",
    type: "textbook",
    publicationDate: "2012",
    notes:
      "Standard text on shared-memory concurrency, linearizability, mutual exclusion algorithms, and memory models.",
  },
  {
    id: "src-lamport-clocks-1978",
    title: "Time, Clocks, and the Ordering of Events in a Distributed System",
    url: "https://doi.org/10.1145/359545.359563",
    publisher: "Association for Computing Machinery (ACM)",
    author: "Leslie Lamport",
    type: "academic",
    publicationDate: "1978-07",
    notes:
      "Foundational paper introducing partial ordering, logical timestamps, and distributed synchronization.",
  },
  {
    id: "src-posix-base-spec",
    title: "The Open Group Base Specifications Issue 7 / IEEE Std 1003.1-2017",
    url: "https://pubs.opengroup.org/onlinepubs/9699919799/",
    publisher: "IEEE and The Open Group",
    author: "The Austin Common Standards Revision Group",
    type: "standards",
    publicationDate: "2018",
    notes:
      "Official standard defining portable operating system interfaces including POSIX AIO and pthreads.",
  },
  {
    id: "src-intel-sdm",
    title: "Intel® 64 and IA-32 Architectures Software Developer's Manuals",
    url: "https://www.intel.com/content/www/us/en/developer/articles/technical/intel-sdm.html",
    publisher: "Intel Corporation",
    author: "Intel Technical Publications",
    type: "official-documentation",
    publicationDate: "2024-06",
    notes:
      "Official hardware architecture manual detailing instruction encodings, opcodes, and processor execution pipelines.",
  },
  {
    id: "src-tanenbaum-mos",
    title: "Modern Operating Systems (4th Edition)",
    url: "https://www.pearson.com/en-us/subject-catalog/p/modern-operating-systems/P200000003310",
    publisher: "Pearson",
    author: "Andrew S. Tanenbaum and Herbert Bos",
    type: "textbook",
    publicationDate: "2014",
    notes:
      "Comprehensive systems treatise analyzing file systems, kernel abstractions, and storage organization.",
  },
] as const;

/**
 * Pre-compiled metadata for the seven seed article proposals.
 */
export const SEED_ARTICLES_METADATA: readonly PilotArticleMetadata[] = [
  {
    slug: "rust",
    conceptId: "concept-rust",
    title: "Rust",
    shortDescription:
      "A systems programming language that combines low-level hardware control with compile-time safety guarantees.",
    domains: ["programming-languages", "computer-science"],
    tags: ["systems-programming", "type-safety", "compilers", "concurrency"],
    wordCount: 1478,
    readingTimeMinutes: 7,
    reviewStatus: "reviewed",
    tier: "seed",
  },
  {
    slug: "ownership",
    conceptId: "concept-ownership",
    title: "Ownership",
    shortDescription:
      "The set of rules that governs how a Rust program manages memory and resources at compile time.",
    domains: ["programming-languages", "computer-science"],
    tags: ["memory-management", "type-system", "borrow-checker", "lifetimes"],
    wordCount: 1557,
    readingTimeMinutes: 7,
    reviewStatus: "reviewed",
    tier: "seed",
  },
  {
    slug: "memory",
    conceptId: "concept-memory",
    title: "Memory",
    shortDescription:
      "The storage systems and addressable spaces computers use to retain active instructions and runtime data.",
    domains: ["computer-science", "systems-architecture"],
    tags: ["virtual-memory", "ram", "address-space", "computer-architecture"],
    wordCount: 1607,
    readingTimeMinutes: 8,
    reviewStatus: "reviewed",
    tier: "seed",
  },
  {
    slug: "stack-and-heap",
    conceptId: "concept-stack-and-heap",
    title: "Stack & Heap",
    shortDescription:
      "Two common memory regions in conventional process address spaces that serve different allocation lifetimes and sizing needs.",
    domains: ["computer-science", "systems-architecture"],
    tags: ["memory-allocation", "stack-frame", "dynamic-memory", "runtime"],
    wordCount: 1701,
    readingTimeMinutes: 8,
    reviewStatus: "reviewed",
    tier: "seed",
  },
  {
    slug: "operating-systems",
    conceptId: "concept-operating-systems",
    title: "Operating Systems",
    shortDescription:
      "System software that manages physical hardware resources and provides execution environments for applications.",
    domains: ["computer-science", "systems-architecture"],
    tags: ["kernel", "process-management", "virtualization", "system-software"],
    wordCount: 1846,
    readingTimeMinutes: 9,
    reviewStatus: "reviewed",
    tier: "seed",
  },
  {
    slug: "cpus",
    conceptId: "concept-cpus",
    title: "CPUs",
    shortDescription:
      "The electronic circuitry that executes machine instructions and coordinates computation within a computer.",
    domains: ["hardware", "computer-architecture"],
    tags: ["processors", "microarchitecture", "instruction-set", "silicon"],
    wordCount: 1692,
    readingTimeMinutes: 8,
    reviewStatus: "reviewed",
    tier: "seed",
  },
  {
    slug: "transistors",
    conceptId: "concept-transistors",
    title: "Transistors",
    shortDescription:
      "Semiconductor devices that switch or amplify electronic signals, serving as the physical building blocks of digital logic.",
    domains: ["physics", "electronics", "hardware"],
    tags: ["semiconductors", "mosfet", "digital-logic", "solid-state-physics"],
    wordCount: 1769,
    readingTimeMinutes: 8,
    reviewStatus: "reviewed",
    tier: "seed",
  },
] as const;

/**
 * Pre-compiled metadata for the six pilot articles.
 */
export const PILOT_ARTICLES_METADATA: readonly PilotArticleMetadata[] = [
  {
    slug: "instruction-set-architecture",
    conceptId: "concept-instruction-set-architecture",
    title: "Instruction Set Architecture",
    shortDescription:
      "The abstract interface between software and hardware that defines supported instructions, registers, addressing modes, and memory models.",
    domains: ["computer-architecture", "hardware"],
    tags: ["isa", "risc", "cisc", "microarchitecture", "hardware-software-interface"],
    wordCount: 1992,
    readingTimeMinutes: 8,
    reviewStatus: "needs-review",
    tier: "pilot",
  },
  {
    slug: "virtual-memory",
    conceptId: "concept-virtual-memory",
    title: "Virtual Memory",
    shortDescription:
      "An architectural memory management scheme that provides an idealized, contiguous abstraction of storage, isolating process address spaces and mapping them to physical storage.",
    domains: ["computer-science", "systems-architecture"],
    tags: ["paging", "mmu", "page-tables", "address-translation", "memory-protection"],
    wordCount: 2233,
    readingTimeMinutes: 9,
    reviewStatus: "needs-review",
    tier: "pilot",
  },
  {
    slug: "file-systems",
    conceptId: "concept-file-systems",
    title: "File Systems",
    shortDescription:
      "Operating system abstractions that manage how persistent storage is structured, indexed, retrieved, and protected as hierarchical files and directories.",
    domains: ["computer-science", "systems-architecture"],
    tags: ["inodes", "storage", "metadata", "journaling", "directories"],
    wordCount: 2300,
    readingTimeMinutes: 10,
    reviewStatus: "needs-review",
    tier: "pilot",
  },
  {
    slug: "concurrency",
    conceptId: "concept-concurrency",
    title: "Concurrency",
    shortDescription:
      "The compositional property of systems where multiple computational task lifetimes overlap in time, distinct from simultaneous parallel hardware execution.",
    domains: ["computer-science", "systems-architecture"],
    tags: ["multithreading", "parallelism", "synchronization", "deadlock", "race-conditions"],
    wordCount: 2387,
    readingTimeMinutes: 10,
    reviewStatus: "needs-review",
    tier: "pilot",
  },
  {
    slug: "asynchronous-io",
    conceptId: "concept-asynchronous-io",
    title: "Asynchronous I/O",
    shortDescription:
      "A non-blocking input/output processing mechanism allowing an execution thread to initiate I/O operations and proceed with other work before data transfer completes.",
    domains: ["computer-science", "systems-architecture"],
    tags: ["non-blocking", "event-loop", "epoll", "io-multiplexing", "system-calls"],
    wordCount: 2032,
    readingTimeMinutes: 8,
    reviewStatus: "needs-review",
    tier: "pilot",
  },
  {
    slug: "machine-code",
    conceptId: "concept-machine-code",
    title: "Machine Code",
    shortDescription:
      "The lowest-level stream of raw binary instructions executed directly by a computer's central processing unit.",
    domains: ["computer-science", "computer-architecture", "hardware"],
    tags: ["binary-instructions", "opcodes", "execution", "assembly", "microarchitecture"],
    wordCount: 1779,
    readingTimeMinutes: 7,
    reviewStatus: "needs-review",
    tier: "pilot",
  },
] as const;

/**
 * Combined catalog of all 13 available knowledge preview articles (7 seed proposals + 6 pilot candidates).
 */
export const ALL_ARTICLES_METADATA: readonly PilotArticleMetadata[] = [
  ...SEED_ARTICLES_METADATA,
  ...PILOT_ARTICLES_METADATA,
] as const;

/**
 * Finds a concept by slug across both pilot and seed concepts.
 */
export function getConceptBySlug(slug: string): Concept | undefined {
  return PILOT_CONCEPTS.find((c) => c.slug === slug) ?? SEED_CONCEPTS.find((c) => c.slug === slug);
}

/**
 * Finds a concept by ID across both pilot and seed concepts.
 */
export function getConceptById(id: string): Concept | undefined {
  return PILOT_CONCEPTS.find((c) => c.id === id) ?? SEED_CONCEPTS.find((c) => c.id === id);
}

/**
 * Finds a pilot concept by slug (kept for backwards compatibility).
 */
export function getPilotConceptBySlug(slug: string): Concept | undefined {
  return PILOT_CONCEPTS.find((c) => c.slug === slug);
}

/**
 * Finds a pilot concept by ID (kept for backwards compatibility).
 */
export function getPilotConceptById(id: string): Concept | undefined {
  return PILOT_CONCEPTS.find((c) => c.id === id);
}

/**
 * Resolves all graph connections for a given concept ID within the 13-node graph.
 * Explicitly marks each related concept as either "seed" (Published) or "pilot" (Draft Preview).
 * Strictly preserves the SOURCE --TYPE--> TARGET directional invariant.
 */
export function getConceptConnections(conceptId: string): readonly ArticleConnection[] {
  const allKnownConcepts = new Map<string, RelatedConceptSummary>();

  for (const c of SEED_CONCEPTS) {
    allKnownConcepts.set(c.id, {
      id: c.id,
      slug: c.slug,
      name: c.name,
      shortDescription: c.shortDescription,
      tier: "seed",
      reviewStatus: c.reviewStatus,
    });
  }

  for (const c of PILOT_CONCEPTS) {
    allKnownConcepts.set(c.id, {
      id: c.id,
      slug: c.slug,
      name: c.name,
      shortDescription: c.shortDescription,
      tier: "pilot",
      reviewStatus: c.reviewStatus,
    });
  }

  const connections: ArticleConnection[] = [];
  const allRelationships: readonly Relationship[] = [...SEED_RELATIONSHIPS, ...PILOT_RELATIONSHIPS];

  for (const rel of allRelationships) {
    if (rel.sourceConceptId === conceptId) {
      const target = allKnownConcepts.get(rel.targetConceptId);
      if (target) {
        connections.push({
          id: rel.id,
          direction: "outgoing",
          type: rel.type,
          explanation: rel.explanation,
          strength: rel.strength,
          relatedConcept: target,
        });
      }
    } else if (rel.targetConceptId === conceptId) {
      const source = allKnownConcepts.get(rel.sourceConceptId);
      if (source) {
        connections.push({
          id: rel.id,
          direction: "incoming",
          type: rel.type,
          explanation: rel.explanation,
          strength: rel.strength,
          relatedConcept: source,
        });
      }
    }
  }

  return connections;
}
