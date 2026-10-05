import type { Relationship } from "@/domain/knowledge/types";

/**
 * Curated relationships connecting the concepts in the initial vertical slice.
 *
 * Directional invariant: Every edge reads naturally as:
 *   SOURCE --TYPE--> TARGET
 *
 * Core linear chain:
 *   Rust --uses--> Ownership --manages--> Memory --includes--> Stack & Heap
 *   --depends-on--> Operating Systems --depends-on--> CPUs --implemented-with--> Transistors
 * plus key architectural cross-connections.
 */
export const SEED_RELATIONSHIPS: readonly Relationship[] = [
  // 1. Rust --uses--> Ownership
  {
    id: "rel-rust-ownership",
    sourceConceptId: "concept-rust",
    targetConceptId: "concept-ownership",
    type: "uses",
    explanation:
      "Rust uses its ownership and borrowing system to enforce memory safety and prevent data races at compile time in Safe Rust without needing an automated garbage collector.",
    strength: "primary",
    sourceIds: ["src-rust-book"],
    reviewStatus: "reviewed",
  },

  // 2. Ownership --manages--> Memory
  {
    id: "rel-ownership-memory",
    sourceConceptId: "concept-ownership",
    targetConceptId: "concept-memory",
    type: "manages",
    explanation:
      "The ownership discipline manages the lifecycle of owned resources and values, ensuring that allocations such as heap-backed data structures are released deterministically when their owner is dropped.",
    strength: "primary",
    sourceIds: ["src-rust-book", "src-rust-reference"],
    reviewStatus: "reviewed",
  },

  // 3. Memory --includes--> Stack & Heap
  {
    id: "rel-memory-stack-and-heap",
    sourceConceptId: "concept-memory",
    targetConceptId: "concept-stack-and-heap",
    type: "includes",
    explanation:
      "In conventional process address spaces, memory typically includes contiguous stack frames for scoped execution data alongside a dynamic heap for flexible-lifetime allocations.",
    strength: "primary",
    sourceIds: ["src-bryant-csapp"],
    reviewStatus: "reviewed",
  },

  // 4. Stack & Heap --depends-on--> Operating Systems
  {
    id: "rel-stack-and-heap-operating-systems",
    sourceConceptId: "concept-stack-and-heap",
    targetConceptId: "concept-operating-systems",
    type: "depends-on",
    explanation:
      "Stack and heap memory segments rely on the operating system kernel to establish virtual process address spaces, define stack limits, and service dynamic memory growth requests.",
    strength: "primary",
    sourceIds: ["src-bryant-csapp", "src-arpaci-ostep"],
    reviewStatus: "reviewed",
  },

  // 5. Operating Systems --depends-on--> CPUs
  {
    id: "rel-operating-systems-cpus",
    sourceConceptId: "concept-operating-systems",
    targetConceptId: "concept-cpus",
    type: "depends-on",
    explanation:
      "Operating systems rely on CPU execution units to schedule threads, manage processor state transitions, and enforce protection boundaries via hardware privilege modes.",
    strength: "primary",
    sourceIds: ["src-arpaci-ostep", "src-tanenbaum-mos"],
    reviewStatus: "reviewed",
  },

  // 6. CPUs --implemented-with--> Transistors
  {
    id: "rel-cpus-transistors",
    sourceConceptId: "concept-cpus",
    targetConceptId: "concept-transistors",
    type: "implemented-with",
    explanation:
      "Digital CPUs are implemented using integrated transistor circuits that realize logic gates, storage elements, control logic, and datapaths.",
    strength: "primary",
    sourceIds: ["src-patterson-hennessy-cod", "src-sze-semiconductor"],
    reviewStatus: "reviewed",
  },

  // Supporting edge: Operating Systems --manages--> Memory
  {
    id: "rel-operating-systems-memory",
    sourceConceptId: "concept-operating-systems",
    targetConceptId: "concept-memory",
    type: "manages",
    explanation:
      "Operating systems manage physical and virtual memory using page tables, swapping mechanisms, and memory protection hardware to isolate processes from one another.",
    strength: "strong",
    sourceIds: ["src-arpaci-ostep", "src-tanenbaum-mos"],
    reviewStatus: "reviewed",
  },

  // Supporting edge: Rust --related-to--> Memory
  {
    id: "rel-rust-memory",
    sourceConceptId: "concept-rust",
    targetConceptId: "concept-memory",
    type: "related-to",
    explanation:
      "Rust provides fine-grained control over memory layouts and pointer semantics while using its type system to prevent common memory errors in safe code.",
    strength: "supporting",
    sourceIds: ["src-rust-book"],
    reviewStatus: "reviewed",
  },
];
