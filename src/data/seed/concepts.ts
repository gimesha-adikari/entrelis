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
      "A systems programming language designed for performance and memory safety without relying on an automated garbage collector.",
    description:
      "Rust achieves compile-time safety through an innovative type system centered around ownership, borrowing, and strict concurrency rules. It provides fine-grained hardware control comparable to C and C++ while preventing data races and invalid memory accesses at compile time.",
    domains: ["programming-languages", "computer-science"],
    tags: ["systems-programming", "type-safety", "compilers", "concurrency"],
    sourceIds: ["src-rust-book"],
    reviewStatus: "verified",
    aliases: ["Rust-lang"],
  },
  {
    id: "concept-ownership",
    slug: "ownership",
    name: "Ownership",
    shortDescription:
      "A compile-time memory management discipline where every resource has a unique owner and an automatic lifetime.",
    description:
      "In ownership-based systems, each value is bound to a single variable binding at any given moment. When the owner goes out of scope, the associated resource is automatically deallocated. Controlled borrowing allows immutable or exclusive mutable access without transferring ownership.",
    domains: ["programming-languages", "computer-science"],
    tags: ["memory-management", "type-system", "borrow-checker", "lifetimes"],
    sourceIds: ["src-rust-book", "src-rust-reference"],
    reviewStatus: "verified",
    aliases: ["Borrowing and Ownership", "Affine Types"],
    interactiveModule: "module-rust-ownership",
  },
  {
    id: "concept-memory",
    slug: "memory",
    name: "Memory",
    shortDescription:
      "The physical and virtual storage space computers use to retain active instructions and runtime data.",
    description:
      "In modern computing architecture, memory is organized as a hierarchy spanning high-speed processor registers and caches down to primary RAM and virtual memory backed by storage. Operating systems provide virtual address spaces so programs can read and write data safely and predictably.",
    domains: ["computer-science", "systems-architecture"],
    tags: ["virtual-memory", "ram", "address-space", "computer-architecture"],
    sourceIds: ["src-bryant-csapp", "src-arpaci-ostep"],
    reviewStatus: "verified",
    aliases: ["Computer Memory", "Primary Storage"],
  },
  {
    id: "concept-stack-and-heap",
    slug: "stack-and-heap",
    name: "Stack & Heap",
    shortDescription:
      "Two fundamental memory segments in a process address space that serve different allocation lifetimes and sizing needs.",
    description:
      "The stack is a highly efficient, contiguous memory region managed in last-in, first-out order to store local function frames and statically sized variables. The heap provides flexible, dynamic memory allocation whose size and lifetime can outlive individual function invocations.",
    domains: ["computer-science", "systems-architecture"],
    tags: ["memory-allocation", "stack-frame", "dynamic-memory", "runtime"],
    sourceIds: ["src-bryant-csapp"],
    reviewStatus: "verified",
    aliases: ["Call Stack and Dynamic Heap", "Stack Memory and Heap Memory"],
  },
  {
    id: "concept-operating-systems",
    slug: "operating-systems",
    name: "Operating Systems",
    shortDescription:
      "The fundamental system software that manages hardware resources and provides execution environments for applications.",
    description:
      "An operating system kernel virtualizes physical hardware—such as processor cores, physical memory, and peripheral devices—into coherent abstractions including processes, threads, virtual memory pages, and filesystems, while enforcing process isolation and security boundaries.",
    domains: ["computer-science", "systems-architecture"],
    tags: ["kernel", "process-management", "virtualization", "system-software"],
    sourceIds: ["src-arpaci-ostep", "src-tanenbaum-mos"],
    reviewStatus: "verified",
    aliases: ["OS", "Kernel"],
  },
  {
    id: "concept-cpus",
    slug: "cpus",
    name: "CPUs",
    shortDescription:
      "The central electronic circuitry within a computer that executes program instructions and performs fundamental arithmetic and logic.",
    description:
      "A central processing unit coordinates computation by sequentially fetching, decoding, and executing machine instructions. Modern processors consist of instruction decoders, arithmetic logic units (ALUs), register files, multiple cache levels, and control logic executing billions of cycles per second.",
    domains: ["hardware", "computer-architecture"],
    tags: ["processors", "microarchitecture", "instruction-set", "silicon"],
    sourceIds: ["src-patterson-hennessy-cod"],
    reviewStatus: "verified",
    aliases: ["Central Processing Units", "Processors", "Microprocessors"],
  },
  {
    id: "concept-transistors",
    slug: "transistors",
    name: "Transistors",
    shortDescription:
      "Microscopic semiconductor switches that amplify electrical signals and serve as the physical building blocks of digital logic.",
    description:
      "Transistors act as electronically controlled valves that regulate the flow of electrical current through semiconductor material such as silicon. By combining multiple transistors into logic gates (such as AND, OR, and NOT), digital circuits perform binary computation and store electronic state.",
    domains: ["physics", "electronics", "hardware"],
    tags: ["semiconductors", "mosfet", "digital-logic", "solid-state-physics"],
    sourceIds: ["src-ieee-transistor-milestone", "src-sze-semiconductor"],
    reviewStatus: "verified",
    aliases: ["Semiconductor Transistors", "MOSFETs"],
  },
];
