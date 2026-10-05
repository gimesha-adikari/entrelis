import type { Concept } from "@/domain/knowledge/types";

/**
 * Curated seed concepts forming the initial vertical slice of the Entrelis knowledge graph.
 *
 * Rust → Ownership → Memory → Stack & Heap → Operating Systems → CPUs → Transistors
 */
export const SEED_CONCEPTS: readonly Concept[] = [
  {
    id: "concept-rust",
    slug: "rust",
    name: "Rust",
    shortDescription:
      "A systems programming language that combines low-level hardware control with compile-time safety guarantees.",
    description:
      "In Safe Rust, ownership, borrowing, and the type system prevent many classes of memory-safety and concurrency errors without requiring an automated garbage collector. Unsafe Rust permits lower-level operations whose safety invariants must be upheld manually by the programmer.",
    domains: ["programming-languages", "computer-science"],
    tags: ["systems-programming", "type-safety", "compilers", "concurrency"],
    sourceIds: ["src-rust-book"],
    reviewStatus: "reviewed",
    aliases: ["Rust-lang"],
  },
  {
    id: "concept-ownership",
    slug: "ownership",
    name: "Ownership",
    shortDescription:
      "The set of rules that governs how a Rust program manages memory and resources at compile time.",
    description:
      "Rust associates each value with an owner. Moves transfer ownership, borrowing grants temporary access without taking ownership, and owned resources are dropped when their owner's lifetime ends.",
    domains: ["programming-languages", "computer-science"],
    tags: ["memory-management", "type-system", "borrow-checker", "lifetimes"],
    sourceIds: ["src-rust-book", "src-rust-reference"],
    reviewStatus: "reviewed",
    aliases: ["Rust Ownership", "Ownership Model"],
    interactiveModule: "module-rust-ownership",
  },
  {
    id: "concept-memory",
    slug: "memory",
    name: "Memory",
    shortDescription:
      "The storage systems and addressable spaces computers use to retain active instructions and runtime data.",
    description:
      "Modern computer architecture divides physical memory into a hierarchy of registers, caches, primary RAM, and persistent storage based on access speed and capacity. Operating systems and hardware memory management units additionally provide virtual memory—an address-space abstraction that translates program addresses into physical memory locations while isolating processes.",
    domains: ["computer-science", "systems-architecture"],
    tags: ["virtual-memory", "ram", "address-space", "computer-architecture"],
    sourceIds: ["src-bryant-csapp", "src-arpaci-ostep"],
    reviewStatus: "reviewed",
    aliases: ["Computer Memory"],
  },
  {
    id: "concept-stack-and-heap",
    slug: "stack-and-heap",
    name: "Stack & Heap",
    shortDescription:
      "Two common memory regions in conventional process address spaces that serve different allocation lifetimes and sizing needs.",
    description:
      "In conventional runtime environments, the stack provides fast, last-in, first-out allocation for function call frames, parameters, and local data bound to scope lifetime. The heap provides dynamic allocation for data whose size or lifetime cannot be determined at compile time or must outlive the function that created it.",
    domains: ["computer-science", "systems-architecture"],
    tags: ["memory-allocation", "stack-frame", "dynamic-memory", "runtime"],
    sourceIds: ["src-bryant-csapp"],
    reviewStatus: "reviewed",
    aliases: ["Call Stack and Dynamic Heap", "Stack Memory and Heap Memory"],
  },
  {
    id: "concept-operating-systems",
    slug: "operating-systems",
    name: "Operating Systems",
    shortDescription:
      "System software that manages physical hardware resources and provides execution environments for applications.",
    description:
      "An operating system kernel virtualizes physical hardware—such as processor cores, physical memory, and storage controllers—into standard abstractions including processes, threads, virtual address spaces, and filesystems, while enforcing privilege separation and process isolation.",
    domains: ["computer-science", "systems-architecture"],
    tags: ["kernel", "process-management", "virtualization", "system-software"],
    sourceIds: ["src-arpaci-ostep", "src-tanenbaum-mos"],
    reviewStatus: "reviewed",
    aliases: ["OS"],
  },
  {
    id: "concept-cpus",
    slug: "cpus",
    name: "CPUs",
    shortDescription:
      "The electronic circuitry that executes machine instructions and coordinates computation within a computer.",
    description:
      "Central processing units interpret and execute the machine instruction stream. Modern microarchitectures use techniques such as instruction pipelining, superscalar execution, branch prediction, and out-of-order execution across arithmetic logic units, registers, and cache hierarchies to maximize throughput.",
    domains: ["hardware", "computer-architecture"],
    tags: ["processors", "microarchitecture", "instruction-set", "silicon"],
    sourceIds: ["src-patterson-hennessy-cod"],
    reviewStatus: "reviewed",
    aliases: ["Central Processing Units", "Processors", "Microprocessors"],
  },
  {
    id: "concept-transistors",
    slug: "transistors",
    name: "Transistors",
    shortDescription:
      "Semiconductor devices that switch or amplify electronic signals, serving as the physical building blocks of digital logic.",
    description:
      "By regulating electrical current through semiconductor channels, transistors function as microscopic electronic switches. When interconnected into logic gates (such as AND, OR, and NOT gates) and bistable storage elements, they physically realize the binary logic and memory of digital processors.",
    domains: ["physics", "electronics", "hardware"],
    tags: ["semiconductors", "mosfet", "digital-logic", "solid-state-physics"],
    sourceIds: ["src-ieee-transistor-milestone", "src-sze-semiconductor"],
    reviewStatus: "reviewed",
    aliases: ["Semiconductor Transistors"],
  },
];
