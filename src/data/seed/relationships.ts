import type { Relationship } from "@/domain/knowledge/types";

/**
 * Curated relationships connecting the concepts in the initial vertical slice.
 *
 * Core linear chain:
 * Rust → Ownership → Memory → Stack & Heap → Operating Systems → CPUs → Transistors
 * plus key architectural cross-connections.
 */
export const SEED_RELATIONSHIPS: readonly Relationship[] = [
  // 1. Rust → Ownership
  {
    id: "rel-rust-ownership",
    sourceConceptId: "concept-rust",
    targetConceptId: "concept-ownership",
    type: "enables",
    explanation:
      "Rust relies on an ownership and borrowing model enforced at compile time to guarantee memory safety without garbage collection overhead.",
    strength: "primary",
    sourceIds: ["src-rust-book"],
    reviewStatus: "verified",
  },

  // 2. Ownership → Memory
  {
    id: "rel-ownership-memory",
    sourceConceptId: "concept-ownership",
    targetConceptId: "concept-memory",
    type: "enables",
    explanation:
      "The ownership discipline governs when memory regions are allocated, how references may access them, and exactly when memory is released back to the system.",
    strength: "primary",
    sourceIds: ["src-rust-book", "src-rust-reference"],
    reviewStatus: "verified",
  },

  // 3. Memory → Stack & Heap
  {
    id: "rel-memory-stack-and-heap",
    sourceConceptId: "concept-memory",
    targetConceptId: "concept-stack-and-heap",
    type: "part-of",
    explanation:
      "A program's addressable memory is systematically divided into contiguous execution stack frames and dynamic heap segments to balance allocation speed and value lifetimes.",
    strength: "primary",
    sourceIds: ["src-bryant-csapp"],
    reviewStatus: "verified",
  },

  // 4. Stack & Heap → Operating Systems
  {
    id: "rel-stack-and-heap-operating-systems",
    sourceConceptId: "concept-stack-and-heap",
    targetConceptId: "concept-operating-systems",
    type: "depends-on",
    explanation:
      "Operating system kernels initialize virtual process address spaces, define stack boundaries, and service page allocations that back the heap.",
    strength: "primary",
    sourceIds: ["src-bryant-csapp", "src-arpaci-ostep"],
    reviewStatus: "verified",
  },

  // 5. Operating Systems → CPUs
  {
    id: "rel-operating-systems-cpus",
    sourceConceptId: "concept-operating-systems",
    targetConceptId: "concept-cpus",
    type: "depends-on",
    explanation:
      "Operating systems manage execution by scheduling threads across CPU cores, saving register context, and utilizing hardware privilege rings.",
    strength: "primary",
    sourceIds: ["src-arpaci-ostep", "src-tanenbaum-mos"],
    reviewStatus: "verified",
  },

  // 6. CPUs → Transistors
  {
    id: "rel-cpus-transistors",
    sourceConceptId: "concept-cpus",
    targetConceptId: "concept-transistors",
    type: "implemented-with",
    explanation:
      "CPUs carry out arithmetic and instruction processing through integrated circuits comprised of billions of nanoscale semiconductor transistors acting as binary switches.",
    strength: "primary",
    sourceIds: ["src-patterson-hennessy-cod", "src-sze-semiconductor"],
    reviewStatus: "verified",
  },

  // Supporting edge: Operating Systems → Memory (Core OS virtualization role)
  {
    id: "rel-operating-systems-memory",
    sourceConceptId: "concept-operating-systems",
    targetConceptId: "concept-memory",
    type: "enables",
    explanation:
      "The operating system virtualizes physical RAM into isolated per-process virtual memory spaces using page tables and memory management hardware.",
    strength: "strong",
    sourceIds: ["src-arpaci-ostep", "src-tanenbaum-mos"],
    reviewStatus: "verified",
  },

  // Supporting edge: Rust → Memory (Systems-level abstraction relationship)
  {
    id: "rel-rust-memory",
    sourceConceptId: "concept-rust",
    targetConceptId: "concept-memory",
    type: "related-to",
    explanation:
      "Rust provides zero-cost abstractions over physical and virtual memory layouts while statically eliminating spatial and temporal pointer violations.",
    strength: "supporting",
    sourceIds: ["src-rust-book"],
    reviewStatus: "verified",
  },
];
