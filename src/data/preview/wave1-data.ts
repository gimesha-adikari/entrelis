import type { Concept, Relationship, Source } from "@/domain/knowledge/types";

/**
 * The 20 new candidate concepts imported for the Milestone 2 Wave 1 33-Node Universe.
 * All records strictly maintain reviewStatus: "needs-review" awaiting editorial approval.
 * None of these are imported into the production seed dataset.
 */
export const WAVE1_NEW_CONCEPTS: readonly Concept[] = [
  {
    "id": "concept-compilers",
    "slug": "compilers",
    "name": "Compilers",
    "shortDescription": "Software systems that translate human-readable source code in high-level programming languages into lower-level target representations such as machine code or bytecode.",
    "description": "Compilers translate structured source code into executable instructions through a multi-stage pipeline: lexical analysis tokenizes characters, syntax parsing builds abstract syntax trees (ASTs), semantic analysis enforces typing invariants, intermediate representations (IR) decouple frontends from backends, and optimization passes transform code for execution efficiency before emitting native machine code or bytecode.",
    "domains": [
      "computer-science",
      "programming-languages"
    ],
    "tags": [
      "parsing",
      "lexical-analysis",
      "code-generation",
      "optimization",
      "intermediate-representation"
    ],
    "sourceIds": [
      "src-dragon-book",
      "src-cooper-compiler"
    ],
    "reviewStatus": "needs-review",
    "aliases": [
      "Language Compilers",
      "Language Translators"
    ]
  },
  {
    "id": "concept-type-systems",
    "slug": "type-systems",
    "name": "Type Systems",
    "shortDescription": "Tractable syntactic methods for proving the absence of certain program behaviors by classifying phrases according to the kinds of values they compute.",
    "description": "Type systems define formal logical rules that evaluate source expressions before or during execution. By associating data values and functions with static types, compilers verify memory layouts, enforce access permissions, verify interface contracts, and formally prove soundness properties—such as progress (well-typed programs do not get stuck) and preservation (evaluating an expression preserves its type).",
    "domains": [
      "computer-science",
      "programming-languages"
    ],
    "tags": [
      "type-safety",
      "static-typing",
      "type-inference",
      "semantics",
      "formal-methods"
    ],
    "sourceIds": [
      "src-pierce-tapl"
    ],
    "reviewStatus": "needs-review",
    "aliases": [
      "Type Theory",
      "Static Type Systems"
    ]
  },
  {
    "id": "concept-algorithms",
    "slug": "algorithms",
    "name": "Algorithms",
    "shortDescription": "Well-defined computational procedures that take inputs, perform unambiguous deterministic or randomized operations, and terminate to produce desired outputs.",
    "description": "An algorithm is a well-defined computational procedure that takes some value (or set of values) as input and produces some value (or set of values) as output to solve a specified computational problem. Analyzed via asymptotic notation (Big-O, Big-Ω, Big-Θ) to characterize scaling behavior in time and space, algorithms encompass both deterministic procedures and randomized algorithms—which utilize random choices to optimize expected running time or circumvent worst-case inputs—employing foundational paradigms such as divide-and-conquer, greedy heuristics, dynamic programming, and graph traversals.",
    "domains": [
      "computer-science",
      "mathematics"
    ],
    "tags": [
      "asymptotic-analysis",
      "computability",
      "sorting",
      "graph-algorithms",
      "optimization"
    ],
    "sourceIds": [
      "src-cormen-clrs",
      "src-knuth-taocp-v1"
    ],
    "reviewStatus": "needs-review",
    "aliases": [
      "Computational Algorithms"
    ]
  },
  {
    "id": "concept-data-structures",
    "slug": "data-structures",
    "name": "Data Structures",
    "shortDescription": "Specialized formats for organizing, storing, and indexing data in memory to enable efficient access, modification, and algorithmic manipulation.",
    "description": "Data structures provide concrete memory layouts that dictate how data elements relate to one another. From contiguous linear arrays and linked nodes to binary search trees, hash tables, and spatial graphs, selecting an appropriate data structure establishes the fundamental time and space trade-offs for searching, inserting, and traversing application data.",
    "domains": [
      "computer-science",
      "software-engineering"
    ],
    "tags": [
      "arrays",
      "trees",
      "hash-tables",
      "graphs",
      "memory-layout"
    ],
    "sourceIds": [
      "src-cormen-clrs",
      "src-knuth-taocp-v1"
    ],
    "reviewStatus": "needs-review",
    "aliases": [
      "Data Formats",
      "In-Memory Structures"
    ]
  },
  {
    "id": "concept-logic-gates",
    "slug": "logic-gates",
    "name": "Logic Gates",
    "shortDescription": "Idealized physical devices implementing Boolean functions that transform one or more binary electrical inputs into a single binary output.",
    "description": "Logic gates physically realize Boolean logic functions (AND, OR, NOT, NAND, NOR, XOR) in electronic hardware. Grounded historically in Claude Shannon's 1938 demonstration that two-state electrical switching networks (originally electromechanical relays) compute Boolean algebra, modern digital logic gates are implemented using semiconductor transistors (such as CMOS pairs). Interconnecting transistors into gate topologies creates combinational circuits (adders, multiplexers) and sequential storage circuits (flip-flops, latches) that together form arithmetic logic units (ALUs) and control units.",
    "domains": [
      "computer-architecture",
      "electronics",
      "hardware"
    ],
    "tags": [
      "boolean-algebra",
      "nand",
      "nor",
      "digital-circuits",
      "switching"
    ],
    "sourceIds": [
      "src-shannon-1938-relay",
      "src-patterson-hennessy-cod"
    ],
    "reviewStatus": "needs-review",
    "aliases": [
      "Digital Logic Gates",
      "Boolean Gates"
    ]
  },
  {
    "id": "concept-semiconductors",
    "slug": "semiconductors",
    "name": "Semiconductors",
    "shortDescription": "Materials whose electrical conductivity lies between conductors and insulators, enabling controlled modulation of electrical current via doping and electric fields.",
    "description": "Semiconductors (most prominently silicon and gallium arsenide) exhibit an energy bandgap that prevents free conduction at absolute zero but permits electron excitation at ambient temperatures. By introducing dopant impurities to create surplus mobile electrons (n-type) or electron vacancies (p-type holes), semiconductor junctions form diodes and transistors whose conductivity is modulated by electric voltages.",
    "domains": [
      "physics",
      "materials-science",
      "electronics"
    ],
    "tags": [
      "bandgap",
      "silicon",
      "doping",
      "carrier-transport",
      "solid-state"
    ],
    "sourceIds": [
      "src-sze-semiconductor",
      "src-streetman-solid-state"
    ],
    "reviewStatus": "needs-review",
    "aliases": [
      "Semiconductor Materials",
      "Solid-State Semiconductors"
    ]
  },
  {
    "id": "concept-garbage-collection",
    "slug": "garbage-collection",
    "name": "Garbage Collection",
    "shortDescription": "An automated memory management discipline where a runtime system identifies and reclaims dynamically allocated heap memory that is no longer reachable by the program.",
    "description": "Garbage collection relieves developers from manual allocation tracking by automatically detecting unreachable objects on the heap. Using techniques such as mark-and-sweep, generational scavenging, and reference counting with cycle detection, the runtime environment periodically reclaims memory, trading off predictable latency and CPU overhead against the elimination of dangling pointers and use-after-free bugs.",
    "domains": [
      "computer-science",
      "programming-languages"
    ],
    "tags": [
      "runtime-systems",
      "heap-reclamation",
      "tracing",
      "reference-counting",
      "memory-management"
    ],
    "sourceIds": [
      "src-jones-gc-handbook"
    ],
    "reviewStatus": "needs-review",
    "aliases": [
      "GC",
      "Automatic Memory Management"
    ]
  },
  {
    "id": "concept-database-systems",
    "slug": "database-systems",
    "name": "Database Systems",
    "shortDescription": "Software systems designed to systematically define, store, query, and maintain structured data collections while guaranteeing transactional consistency and durability.",
    "description": "Database management systems (DBMS) provide structured data storage independent of physical file layouts. Through declarative query languages (such as SQL) grounded in relational algebra, indexing data structures (B+ trees, LSM trees), write-ahead logging (WAL), and concurrency control (two-phase locking or multi-version concurrency control), database systems enforce ACID transaction properties across concurrent access.",
    "domains": [
      "computer-science",
      "systems-architecture"
    ],
    "tags": [
      "relational-model",
      "acid",
      "sql",
      "transactions",
      "indexing"
    ],
    "sourceIds": [
      "src-silberschatz-db",
      "src-codd-1970-relational"
    ],
    "reviewStatus": "needs-review",
    "aliases": [
      "DBMS",
      "Database Management Systems"
    ]
  },
  {
    "id": "concept-computability-theory",
    "slug": "computability-theory",
    "name": "Computability Theory",
    "shortDescription": "The theoretical foundation of computer science that classifies mathematical problems according to whether they can be resolved by algorithmic procedures.",
    "description": "Computability theory formalizes what can and cannot be computed in principle, regardless of available physical time or memory. By defining abstract models of computation such as Turing machines, the Church-Turing thesis establishes that any effective calculation can be realized algorithmically, while proving the existence of undecidable problems such as the Halting Problem.",
    "domains": [
      "computer-science",
      "mathematics"
    ],
    "tags": [
      "turing-machines",
      "undecidability",
      "halting-problem",
      "church-turing",
      "formal-languages"
    ],
    "sourceIds": [
      "src-sipser-computation",
      "src-turing-1936-computable"
    ],
    "reviewStatus": "needs-review",
    "aliases": [
      "Recursion Theory",
      "Theory of Computation"
    ]
  },
  {
    "id": "concept-alan-turing",
    "slug": "alan-turing",
    "name": "Alan Turing",
    "shortDescription": "British mathematician, logician, and cryptanalyst widely recognized as a primary founder of modern theoretical computer science and artificial intelligence.",
    "description": "Alan Turing formalized the conceptual foundation of digital computation in his 1936 paper introducing the Universal Turing Machine. During World War II, his cryptanalytic breakthroughs at Bletchley Park broke the Enigma cipher; later, he pioneered artificial intelligence inquiry by formulating the imitation game (Turing Test) and investigated morphogenesis in mathematical biology.",
    "domains": [
      "computer-science",
      "mathematics",
      "civilization"
    ],
    "tags": [
      "turing-machine",
      "cryptanalysis",
      "turing-test",
      "morphogenesis",
      "pioneers"
    ],
    "sourceIds": [
      "src-turing-1936-computable"
    ],
    "reviewStatus": "needs-review",
    "aliases": [
      "A. M. Turing"
    ]
  },
  {
    "id": "concept-boolean-logic",
    "slug": "boolean-logic",
    "name": "Boolean Logic",
    "shortDescription": "A branch of algebraic logic where variables evaluate to one of two truth values (true or false) under operations of conjunction, disjunction, and negation.",
    "description": "Formulated by George Boole, Boolean algebra translates classical philosophical logic into mathematical calculus. By establishing identities such as De Morgan's laws and distributive equivalences, Boolean logic provides the mathematical foundation for digital logic gate design, relational database queries, and conditional control flow in software.",
    "domains": [
      "mathematics",
      "computer-science"
    ],
    "tags": [
      "truth-values",
      "boolean-algebra",
      "conjunction",
      "disjunction",
      "de-morgan"
    ],
    "sourceIds": [
      "src-boole-1854-laws",
      "src-shannon-1938-relay"
    ],
    "reviewStatus": "needs-review",
    "aliases": [
      "Boolean Algebra",
      "Propositional Logic"
    ]
  },
  {
    "id": "concept-atoms",
    "slug": "atoms",
    "name": "Atoms",
    "shortDescription": "The fundamental constituent units of ordinary chemical matter, composed of a dense atomic nucleus of protons and neutrons surrounded by an electron cloud.",
    "description": "Atoms constitute the elemental building blocks of the periodic table. Governed by quantum electrodynamics, the discrete energy states of atomic electrons determine chemical bonding properties, emission spectra, and the electrical conductivity of materials, bridging microscopic particle physics and macroscopic matter.",
    "domains": [
      "physics",
      "chemistry"
    ],
    "tags": [
      "nucleus",
      "protons",
      "neutrons",
      "electron-cloud",
      "quantum-states"
    ],
    "sourceIds": [
      "src-griffiths-quantum",
      "src-pdg-standard-model"
    ],
    "reviewStatus": "needs-review",
    "aliases": [
      "Atomic Structure",
      "Chemical Atoms"
    ]
  },
  {
    "id": "concept-electrons",
    "slug": "electrons",
    "name": "Electrons",
    "shortDescription": "Stable subatomic leptons with negative elementary electric charge that constitute atomic electron shells and act as mobile charge carriers in electricity.",
    "description": "Electrons are fundamental spin-1/2 fermions subject to the Pauli exclusion principle. In isolated atoms, electrons occupy quantized energy orbitals; in crystalline solids, their energy levels broaden into conduction and valence bands, governing electrical conductivity, chemical reactivity, and semiconductor electronics.",
    "domains": [
      "physics",
      "electronics"
    ],
    "tags": [
      "leptons",
      "charge-carriers",
      "fermions",
      "pauli-exclusion",
      "electricity"
    ],
    "sourceIds": [
      "src-pdg-standard-model",
      "src-ashcroft-mermin-solid-state"
    ],
    "reviewStatus": "needs-review",
    "aliases": [
      "Electronic Charge Carriers"
    ]
  },
  {
    "id": "concept-solid-state-physics",
    "slug": "solid-state-physics",
    "name": "Solid-State Physics",
    "shortDescription": "The branch of condensed matter physics that studies how macroscopic properties of solid materials emerge from atomic-scale crystal structures and electron quantum states.",
    "description": "Solid-state physics applies quantum mechanics and statistical mechanics to periodic crystal lattices. Through Bloch's theorem, crystal symmetries, and energy band theory, it explains why crystalline solids behave as conductors, insulators, or semiconductors, providing the theoretical blueprint for transistors, LEDs, and integrated microelectronics.",
    "domains": [
      "physics",
      "materials-science"
    ],
    "tags": [
      "band-theory",
      "crystal-lattices",
      "bloch-theorem",
      "fermi-level",
      "condensed-matter"
    ],
    "sourceIds": [
      "src-ashcroft-mermin-solid-state"
    ],
    "reviewStatus": "needs-review",
    "aliases": [
      "Condensed Matter Physics",
      "Band Theory of Solids"
    ]
  },
  {
    "id": "concept-formal-logic",
    "slug": "formal-logic",
    "name": "Formal Logic & Deductive Reasoning",
    "shortDescription": "The systematic study of valid inference, argumentation, and formal deductive systems independent of specific empirical subject matter.",
    "description": "Formal logic evaluates whether the truth of premises necessarily guarantees the truth of conclusions. Spanning propositional logic and first-order predicate calculus with quantifiers, it establishes syntactic proof systems and semantic model theory, underpinning mathematical rigor, computability proofs, and software type systems.",
    "domains": [
      "philosophy",
      "mathematics"
    ],
    "tags": [
      "deduction",
      "soundness",
      "validity",
      "predicate-calculus",
      "inference-rules"
    ],
    "sourceIds": [
      "src-sep-logic-classical"
    ],
    "reviewStatus": "needs-review",
    "aliases": [
      "Deductive Logic",
      "Symbolic Logic"
    ]
  },
  {
    "id": "concept-transistor-invention",
    "slug": "transistor-invention",
    "name": "Invention of the Transistor",
    "shortDescription": "The 1947 breakthrough at Bell Laboratories that produced the first solid-state semiconductor amplifier, replacing fragile, power-hungry vacuum tubes.",
    "description": "Invented in December 1947 by John Bardeen, Walter Brattain, and William Shockley at Bell Labs, the point-contact and subsequent junction transistors utilized semiconductor physics to switch and amplify currents without heated filaments or moving parts, launching the microelectronics era.",
    "domains": [
      "history",
      "technology",
      "physics"
    ],
    "tags": [
      "bell-labs",
      "bardeen",
      "brattain",
      "shockley",
      "solid-state-revolution"
    ],
    "sourceIds": [
      "src-ieee-transistor-milestone"
    ],
    "reviewStatus": "needs-review",
    "aliases": [
      "Point-Contact Transistor",
      "1947 Bell Labs Breakthrough"
    ]
  },
  {
    "id": "concept-integrated-circuit",
    "slug": "integrated-circuit",
    "name": "The Integrated Circuit",
    "shortDescription": "The microelectronic breakthrough of fabricating multiple interconnected transistors, diodes, and resistors onto a single monolithic semiconductor chip.",
    "description": "Invented independently by Jack Kilby (hybrid germanium circuit, 1958) and Robert Noyce (monolithic silicon planar IC, 1959), the integrated circuit solved the 'tyranny of numbers' by eliminating manual wire interconnections, enabling exponential scaling in computing density and reliability described by Moore's Law.",
    "domains": [
      "history",
      "technology",
      "hardware"
    ],
    "tags": [
      "microchip",
      "kilby",
      "noyce",
      "planar-process",
      "moores-law"
    ],
    "sourceIds": [
      "src-ethw-integrated-circuit"
    ],
    "reviewStatus": "needs-review",
    "aliases": [
      "Microchip",
      "IC",
      "Monolithic Integrated Circuit"
    ]
  },
  {
    "id": "concept-history-of-computing",
    "slug": "history-of-computing",
    "name": "History of Computing",
    "shortDescription": "The evolutionary trajectory of automated calculation machines from mechanical calculators to programmable electronic digital computers.",
    "description": "Spanning Charles Babbage's Analytical Engine and Ada Lovelace's first computer algorithm in the 1840s to electromechanical codebreakers and giant electronic vacuum-tube systems like ENIAC (1945), computing evolved from specialized arithmetic calculators into general-purpose, stored-program information processors.",
    "domains": [
      "history",
      "computer-science"
    ],
    "tags": [
      "babbage",
      "ada-lovelace",
      "eniac",
      "stored-program",
      "computing-pioneers"
    ],
    "sourceIds": [
      "src-von-neumann-1945-edvac"
    ],
    "reviewStatus": "needs-review",
    "aliases": [
      "Computing History",
      "Evolution of Computers"
    ]
  },
  {
    "id": "concept-microprocessor-revolution",
    "slug": "microprocessor-revolution",
    "name": "The Microprocessor Revolution",
    "shortDescription": "The technological leap of integrating an entire central processing unit onto a single silicon chip, democratizing personal computing.",
    "description": "Triggered by the commercial introduction of the Intel 4004 in 1971, designed by Federico Faggin, Ted Hoff, and Stanley Mazor, microprocessors collapsed multiple circuit boards into a single microchip. This miniaturization powered the personal computer revolution (Apple, IBM PC) and embedded computing across modern appliances.",
    "domains": [
      "history",
      "technology",
      "hardware"
    ],
    "tags": [
      "intel-4004",
      "microprocessors",
      "personal-computing",
      "faggin",
      "silicon-valley"
    ],
    "sourceIds": [
      "src-patterson-hennessy-cod"
    ],
    "reviewStatus": "needs-review",
    "aliases": [
      "Microprocessor Era",
      "Personal Computer Revolution"
    ]
  },
  {
    "id": "concept-von-neumann-architecture",
    "slug": "von-neumann-architecture",
    "name": "Von Neumann Architecture",
    "shortDescription": "A theoretical and practical computer design model where instructions and data are stored in the same physical or addressable memory space.",
    "description": "Articulated in John von Neumann's 1945 EDVAC report (building on discussions with Eckert and Mauchly), this architecture outlines five primary units: arithmetic logic unit, control unit, memory, input/output, and bus interfaces. By treating program instructions identically to numeric data in memory, it established the foundational blueprint of modern general-purpose digital computers.",
    "domains": [
      "computer-architecture",
      "history",
      "computer-science"
    ],
    "tags": [
      "stored-program",
      "edvac",
      "instruction-cycle",
      "fetch-decode-execute",
      "von-neumann-bottleneck"
    ],
    "sourceIds": [
      "src-von-neumann-1945-edvac",
      "src-patterson-hennessy-cod"
    ],
    "reviewStatus": "needs-review",
    "aliases": [
      "Stored-Program Concept",
      "Von Neumann Model"
    ]
  }
] as const;

/**
 * The 53 candidate relationships connecting the 33 concepts in the Wave 1 universe.
 * Connects the 7 published seed concepts and 26 candidate concepts into a unified
 * single-component graph with zero isolated nodes (degree >= 2 for every node).
 * All records strictly maintain reviewStatus: "needs-review".
 */
export const WAVE1_CANDIDATE_RELATIONSHIPS: readonly Relationship[] = [
  {
    "id": "rel-compilers-machine-code",
    "sourceConceptId": "concept-compilers",
    "targetConceptId": "concept-machine-code",
    "type": "leads-to",
    "explanation": "Compilers translate structured source code representations through optimization passes to emit executable machine code targeted to specific CPU architectures.",
    "strength": "primary",
    "sourceIds": [
      "src-dragon-book",
      "src-cooper-compiler"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-compilers-type-systems",
    "sourceConceptId": "concept-compilers",
    "targetConceptId": "concept-type-systems",
    "type": "uses",
    "explanation": "Compilers invoke type-checking phases during semantic analysis to enforce type safety rules and prevent runtime evaluation errors before machine code generation.",
    "strength": "primary",
    "sourceIds": [
      "src-dragon-book",
      "src-pierce-tapl"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-rust-compilers",
    "sourceConceptId": "concept-rust",
    "targetConceptId": "concept-compilers",
    "type": "depends-on",
    "explanation": "Rust program compilation depends on optimizing compiler toolchains (such as rustc and LLVM) to enforce borrow-checker invariants, type safety, and generate efficient native machine code.",
    "strength": "primary",
    "sourceIds": [
      "src-rust-book",
      "src-dragon-book"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-rust-type-systems",
    "sourceConceptId": "concept-rust",
    "targetConceptId": "concept-type-systems",
    "type": "uses",
    "explanation": "Rust extends classical type systems with affine types and lifetime bounds to statically ensure memory safety without runtime garbage collection.",
    "strength": "primary",
    "sourceIds": [
      "src-rust-book",
      "src-pierce-tapl"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-machine-code-cpus",
    "sourceConceptId": "concept-machine-code",
    "targetConceptId": "concept-cpus",
    "type": "depends-on",
    "explanation": "The physical execution of machine code instructions depends on a compatible central processing unit whose hardware decoders, arithmetic logic units, and execution pipelines interpret the binary bitstream.",
    "strength": "primary",
    "sourceIds": [
      "src-patterson-hennessy-cod",
      "src-intel-sdm"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-cpus-instruction-set-architecture",
    "sourceConceptId": "concept-cpus",
    "targetConceptId": "concept-instruction-set-architecture",
    "type": "uses",
    "explanation": "CPUs realize the architectural specification and instruction encoding defined by their instruction set architecture.",
    "strength": "primary",
    "sourceIds": [
      "src-patterson-hennessy-cod",
      "src-riscv-spec"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-operating-systems-virtual-memory",
    "sourceConceptId": "concept-operating-systems",
    "targetConceptId": "concept-virtual-memory",
    "type": "manages",
    "explanation": "Operating systems construct and manage virtual memory page tables to isolate user processes and coordinate hardware memory management units.",
    "strength": "primary",
    "sourceIds": [
      "src-denning-virtual-memory",
      "src-arpaci-ostep"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-virtual-memory-memory",
    "sourceConceptId": "concept-virtual-memory",
    "targetConceptId": "concept-memory",
    "type": "manages",
    "explanation": "Virtual memory maps isolated logical process address spaces onto physical memory frames, providing uniform addressing and memory protection, with optional backing store paging or memory compression for inactive pages.",
    "strength": "primary",
    "sourceIds": [
      "src-denning-virtual-memory",
      "src-bryant-csapp"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-concurrency-operating-systems",
    "sourceConceptId": "concept-concurrency",
    "targetConceptId": "concept-operating-systems",
    "type": "depends-on",
    "explanation": "OS-managed thread concurrency depends on the operating system kernel for thread scheduling, preemptive context switching, and inter-thread synchronization primitives, though concurrency itself can also be realized in bare-metal environments or user-space runtimes.",
    "strength": "primary",
    "sourceIds": [
      "src-arpaci-ostep",
      "src-herlihy-multiprocessor"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-algorithms-data-structures",
    "sourceConceptId": "concept-algorithms",
    "targetConceptId": "concept-data-structures",
    "type": "uses",
    "explanation": "Algorithms operate on and manipulate specialized data structures to achieve optimal time and space computational efficiency.",
    "strength": "primary",
    "sourceIds": [
      "src-cormen-clrs",
      "src-knuth-taocp-v1"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-logic-gates-transistors",
    "sourceConceptId": "concept-logic-gates",
    "targetConceptId": "concept-transistors",
    "type": "implemented-with",
    "explanation": "Modern digital logic gates are physically constructed from interconnected semiconductor transistors (such as CMOS pairs) that act as voltage-controlled electronic switches to execute Boolean logic functions.",
    "strength": "primary",
    "sourceIds": [
      "src-patterson-hennessy-cod",
      "src-sze-semiconductor"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-transistors-semiconductors",
    "sourceConceptId": "concept-transistors",
    "targetConceptId": "concept-semiconductors",
    "type": "implemented-with",
    "explanation": "Transistors are manufactured using semiconductor materials whose conductive properties are modulated by doping and electric gate voltages.",
    "strength": "primary",
    "sourceIds": [
      "src-sze-semiconductor",
      "src-streetman-solid-state"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-garbage-collection-ownership",
    "sourceConceptId": "concept-garbage-collection",
    "targetConceptId": "concept-ownership",
    "type": "contrasts-with",
    "explanation": "Garbage collection automatically identifies and reclaims unreachable heap allocations at runtime, contrasting with Rust's compile-time ownership model.",
    "strength": "primary",
    "sourceIds": [
      "src-jones-gc-handbook",
      "src-rust-book"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-file-systems-operating-systems",
    "sourceConceptId": "concept-file-systems",
    "targetConceptId": "concept-operating-systems",
    "type": "part-of",
    "explanation": "File systems operate as a core component of operating system kernels to manage structured, durable persistent storage access.",
    "strength": "primary",
    "sourceIds": [
      "src-arpaci-ostep",
      "src-tanenbaum-mos"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-asynchronous-io-operating-systems",
    "sourceConceptId": "concept-asynchronous-io",
    "targetConceptId": "concept-operating-systems",
    "type": "uses",
    "explanation": "Asynchronous I/O utilizes operating system kernel completion mechanisms (such as POSIX AIO, Linux io_uring, or Windows IOCP) to execute background data transfers and notify user space upon completion.",
    "strength": "primary",
    "sourceIds": [
      "src-posix-base-spec",
      "src-arpaci-ostep"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-database-systems-file-systems",
    "sourceConceptId": "concept-database-systems",
    "targetConceptId": "concept-file-systems",
    "type": "depends-on",
    "explanation": "Database engines write data pages, index structures, and transaction write-ahead logs to underlying file systems or raw block storage devices.",
    "strength": "primary",
    "sourceIds": [
      "src-silberschatz-db",
      "src-arpaci-ostep"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-database-systems-data-structures",
    "sourceConceptId": "concept-database-systems",
    "targetConceptId": "concept-data-structures",
    "type": "uses",
    "explanation": "Database systems rely on specialized indexing data structures, such as B+ trees and hash indices, to locate records in logarithmic time.",
    "strength": "primary",
    "sourceIds": [
      "src-silberschatz-db",
      "src-cormen-clrs"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-computability-theory-alan-turing",
    "sourceConceptId": "concept-computability-theory",
    "targetConceptId": "concept-alan-turing",
    "type": "related-to",
    "explanation": "Computability theory originated largely through Alan Turing's formalization of the universal computing machine and the undecidability of the halting problem.",
    "strength": "primary",
    "sourceIds": [
      "src-turing-1936-computable",
      "src-sipser-computation"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-alan-turing-algorithms",
    "sourceConceptId": "concept-alan-turing",
    "targetConceptId": "concept-algorithms",
    "type": "related-to",
    "explanation": "Alan Turing's universal machine provided the first rigorous mathematical specification of what constitutes a mechanical algorithm.",
    "strength": "primary",
    "sourceIds": [
      "src-turing-1936-computable",
      "src-cormen-clrs"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-boolean-logic-logic-gates",
    "sourceConceptId": "concept-boolean-logic",
    "targetConceptId": "concept-logic-gates",
    "type": "implemented-with",
    "explanation": "Theoretical Boolean algebra is physically instantiated in digital circuitry through switching networks—first mathematically formalized for relay circuits by Claude Shannon in 1938 and subsequently implemented in solid-state transistor logic gates.",
    "strength": "primary",
    "sourceIds": [
      "src-boole-1854-laws",
      "src-shannon-1938-relay"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-atoms-electrons",
    "sourceConceptId": "concept-atoms",
    "targetConceptId": "concept-electrons",
    "type": "includes",
    "explanation": "Atoms contain electrons in quantized orbitals surrounding the central nucleus, dictating chemical bonds and conductivity.",
    "strength": "primary",
    "sourceIds": [
      "src-griffiths-quantum",
      "src-pdg-standard-model"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-semiconductors-solid-state-physics",
    "sourceConceptId": "concept-semiconductors",
    "targetConceptId": "concept-solid-state-physics",
    "type": "depends-on",
    "explanation": "Semiconductor behavior is explained by solid-state band theory, specifically the energy bandgap separating valence and conduction bands.",
    "strength": "primary",
    "sourceIds": [
      "src-ashcroft-mermin-solid-state",
      "src-sze-semiconductor"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-formal-logic-boolean-logic",
    "sourceConceptId": "concept-formal-logic",
    "targetConceptId": "concept-boolean-logic",
    "type": "related-to",
    "explanation": "Formal logic's propositional calculus was algebraically axiomatized by George Boole to yield modern Boolean logic.",
    "strength": "primary",
    "sourceIds": [
      "src-sep-logic-classical",
      "src-boole-1854-laws"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-formal-logic-type-systems",
    "sourceConceptId": "concept-formal-logic",
    "targetConceptId": "concept-type-systems",
    "type": "related-to",
    "explanation": "Via the Curry-Howard isomorphism, formal logical propositions correspond directly to programming language types, and proofs correspond to programs.",
    "strength": "strong",
    "sourceIds": [
      "src-sep-logic-classical",
      "src-pierce-tapl"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-transistor-invention-transistors",
    "sourceConceptId": "concept-transistor-invention",
    "targetConceptId": "concept-transistors",
    "type": "leads-to",
    "explanation": "The 1947 breakthrough at Bell Laboratories directly produced the semiconductor transistor, launching modern solid-state electronics.",
    "strength": "primary",
    "sourceIds": [
      "src-ieee-transistor-milestone"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-integrated-circuit-transistors",
    "sourceConceptId": "concept-integrated-circuit",
    "targetConceptId": "concept-transistors",
    "type": "uses",
    "explanation": "Integrated circuits manufacture microscopic networks of interconnected transistors directly on monolithic semiconductor wafers.",
    "strength": "primary",
    "sourceIds": [
      "src-ethw-integrated-circuit",
      "src-patterson-hennessy-cod"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-microprocessor-revolution-integrated-circuit",
    "sourceConceptId": "concept-microprocessor-revolution",
    "targetConceptId": "concept-integrated-circuit",
    "type": "depends-on",
    "explanation": "The microprocessor revolution was enabled by high-density silicon integrated circuit planar processes that could place complete CPUs on a single die.",
    "strength": "primary",
    "sourceIds": [
      "src-ethw-integrated-circuit",
      "src-patterson-hennessy-cod"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-microprocessor-revolution-cpus",
    "sourceConceptId": "concept-microprocessor-revolution",
    "targetConceptId": "concept-cpus",
    "type": "leads-to",
    "explanation": "Microprocessors transformed CPUs from room-sized cabinets of discrete circuits into single-chip processors that power personal computers and mobile devices.",
    "strength": "primary",
    "sourceIds": [
      "src-patterson-hennessy-cod"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-von-neumann-architecture-cpus",
    "sourceConceptId": "concept-von-neumann-architecture",
    "targetConceptId": "concept-cpus",
    "type": "includes",
    "explanation": "The Von Neumann architecture defines a stored-program computer model comprising a central processing unit (ALU and control unit) and memory systems.",
    "strength": "primary",
    "sourceIds": [
      "src-von-neumann-1945-edvac",
      "src-patterson-hennessy-cod"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-von-neumann-architecture-memory",
    "sourceConceptId": "concept-von-neumann-architecture",
    "targetConceptId": "concept-memory",
    "type": "uses",
    "explanation": "In Von Neumann architecture, a single addressable memory subsystem stores both program instructions and runtime data values.",
    "strength": "primary",
    "sourceIds": [
      "src-von-neumann-1945-edvac",
      "src-bryant-csapp"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-machine-code-instruction-set-architecture",
    "sourceConceptId": "concept-machine-code",
    "targetConceptId": "concept-instruction-set-architecture",
    "type": "related-to",
    "explanation": "Machine code binary bit patterns directly represent the instruction formats, opcodes, and addressing modes specified by a processor's instruction set architecture.",
    "strength": "primary",
    "sourceIds": [
      "src-patterson-hennessy-cod",
      "src-intel-sdm"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-algorithms-computability-theory",
    "sourceConceptId": "concept-algorithms",
    "targetConceptId": "concept-computability-theory",
    "type": "depends-on",
    "explanation": "The theoretical existence, formal definition, and ultimate limits of mechanical algorithms are established by computability theory and Turing machines.",
    "strength": "primary",
    "sourceIds": [
      "src-cormen-clrs",
      "src-turing-1936-computable"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-data-structures-memory",
    "sourceConceptId": "concept-data-structures",
    "targetConceptId": "concept-memory",
    "type": "depends-on",
    "explanation": "Data structures organize logical relationships between data items within physical and virtual addressable memory layouts.",
    "strength": "primary",
    "sourceIds": [
      "src-cormen-clrs",
      "src-bryant-csapp"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-stack-and-heap-garbage-collection",
    "sourceConceptId": "concept-stack-and-heap",
    "targetConceptId": "concept-garbage-collection",
    "type": "related-to",
    "explanation": "Garbage collectors specifically manage and reclaim dynamic allocations residing in heap memory, contrasting with automatically scoped call stack frames.",
    "strength": "primary",
    "sourceIds": [
      "src-bryant-csapp",
      "src-jones-gc-handbook"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-virtual-memory-operating-systems",
    "sourceConceptId": "concept-virtual-memory",
    "targetConceptId": "concept-operating-systems",
    "type": "part-of",
    "explanation": "Virtual memory subsystems operate as an essential architectural component within modern operating system kernels.",
    "strength": "primary",
    "sourceIds": [
      "src-denning-virtual-memory",
      "src-arpaci-ostep"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-virtual-memory-cpus",
    "sourceConceptId": "concept-virtual-memory",
    "targetConceptId": "concept-cpus",
    "type": "depends-on",
    "explanation": "Fast virtual-to-physical address translation relies on dedicated hardware memory management units (MMUs) and translation lookaside buffers (TLBs) integrated within CPUs.",
    "strength": "primary",
    "sourceIds": [
      "src-denning-virtual-memory",
      "src-patterson-hennessy-cod"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-file-systems-data-structures",
    "sourceConceptId": "concept-file-systems",
    "targetConceptId": "concept-data-structures",
    "type": "uses",
    "explanation": "File system implementations organize storage blocks and directory trees using specialized data structures, including B-trees, hash tables, and inode extents.",
    "strength": "primary",
    "sourceIds": [
      "src-arpaci-ostep",
      "src-cormen-clrs"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-asynchronous-io-concurrency",
    "sourceConceptId": "concept-asynchronous-io",
    "targetConceptId": "concept-concurrency",
    "type": "related-to",
    "explanation": "Asynchronous I/O enables efficient concurrent application architectures by overlapping I/O wait latency across operations without allocating a dedicated operating system thread per connection.",
    "strength": "primary",
    "sourceIds": [
      "src-posix-base-spec",
      "src-herlihy-multiprocessor"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-solid-state-physics-atoms",
    "sourceConceptId": "concept-solid-state-physics",
    "targetConceptId": "concept-atoms",
    "type": "depends-on",
    "explanation": "Solid-state physical properties arise from the periodic spatial lattice arrangement and inter-atomic electrostatic potentials of constituent atoms.",
    "strength": "primary",
    "sourceIds": [
      "src-ashcroft-mermin-solid-state"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-formal-logic-computability-theory",
    "sourceConceptId": "concept-formal-logic",
    "targetConceptId": "concept-computability-theory",
    "type": "leads-to",
    "explanation": "Investigating the decidability of formal logical systems (Hilbert's Entscheidungsproblem) led directly to Alan Turing's mathematical formulation of computability theory.",
    "strength": "primary",
    "sourceIds": [
      "src-turing-1936-computable",
      "src-sep-logic-classical"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-integrated-circuit-logic-gates",
    "sourceConceptId": "concept-integrated-circuit",
    "targetConceptId": "concept-logic-gates",
    "type": "includes",
    "explanation": "Integrated circuits combine microscopic planar transistors on a single semiconductor die to instantiate interconnected networks of logic gates.",
    "strength": "primary",
    "sourceIds": [
      "src-ethw-integrated-circuit",
      "src-patterson-hennessy-cod"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-history-of-computing-alan-turing",
    "sourceConceptId": "concept-history-of-computing",
    "targetConceptId": "concept-alan-turing",
    "type": "includes",
    "explanation": "The history of computing counts Alan Turing as a foundational theoretical pioneer who formulated the universal computing machine concept.",
    "strength": "primary",
    "sourceIds": [
      "src-turing-1936-computable",
      "src-von-neumann-1945-edvac"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-history-of-computing-von-neumann-architecture",
    "sourceConceptId": "concept-history-of-computing",
    "targetConceptId": "concept-von-neumann-architecture",
    "type": "includes",
    "explanation": "The stored-program Von Neumann architecture formalized in 1945 became the standard structural blueprint for electronic digital computers.",
    "strength": "primary",
    "sourceIds": [
      "src-von-neumann-1945-edvac"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-logic-gates-boolean-logic",
    "sourceConceptId": "concept-logic-gates",
    "targetConceptId": "concept-boolean-logic",
    "type": "uses",
    "explanation": "Digital logic gates evaluate physical electrical inputs according to the truth tables, theorems, and algebraic laws of Boolean logic, following the switching-circuit analysis established by Claude Shannon.",
    "strength": "primary",
    "sourceIds": [
      "src-shannon-1938-relay",
      "src-boole-1854-laws"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-compilers-algorithms",
    "sourceConceptId": "concept-compilers",
    "targetConceptId": "concept-algorithms",
    "type": "uses",
    "explanation": "Compilers execute complex algorithms for parsing (LR/LL tables), data-flow analysis, register allocation (graph coloring), and instruction scheduling.",
    "strength": "primary",
    "sourceIds": [
      "src-dragon-book",
      "src-cormen-clrs"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-compilers-data-structures",
    "sourceConceptId": "concept-compilers",
    "targetConceptId": "concept-data-structures",
    "type": "uses",
    "explanation": "Compilers rely on core data structures, such as abstract syntax trees (ASTs), symbol tables, and control-flow graphs (CFGs), during code transformation.",
    "strength": "primary",
    "sourceIds": [
      "src-dragon-book",
      "src-cormen-clrs"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-type-systems-formal-logic",
    "sourceConceptId": "concept-type-systems",
    "targetConceptId": "concept-formal-logic",
    "type": "depends-on",
    "explanation": "Type systems use formal deductive proof rules and inference mechanisms to prove that well-typed programs satisfy soundness theorems.",
    "strength": "primary",
    "sourceIds": [
      "src-pierce-tapl",
      "src-sep-logic-classical"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-database-systems-algorithms",
    "sourceConceptId": "concept-database-systems",
    "targetConceptId": "concept-algorithms",
    "type": "uses",
    "explanation": "Relational database query engines employ sorting, hash join, and query optimization algorithms to execute declarative SQL requests efficiently.",
    "strength": "primary",
    "sourceIds": [
      "src-silberschatz-db",
      "src-cormen-clrs"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-atoms-solid-state-physics",
    "sourceConceptId": "concept-atoms",
    "targetConceptId": "concept-solid-state-physics",
    "type": "leads-to",
    "explanation": "When atoms condense into periodic crystal lattices, their discrete electronic orbitals interact and broaden into continuous energy bands studied by solid-state physics.",
    "strength": "primary",
    "sourceIds": [
      "src-ashcroft-mermin-solid-state",
      "src-pdg-standard-model"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-electrons-semiconductors",
    "sourceConceptId": "concept-electrons",
    "targetConceptId": "concept-semiconductors",
    "type": "part-of",
    "explanation": "Conduction electrons and valence holes act as mobile charge carriers whose concentrations in semiconductors are modulated to create diodes and transistors.",
    "strength": "primary",
    "sourceIds": [
      "src-sze-semiconductor",
      "src-streetman-solid-state"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-transistor-invention-semiconductors",
    "sourceConceptId": "concept-transistor-invention",
    "targetConceptId": "concept-semiconductors",
    "type": "uses",
    "explanation": "The invention of the transistor required high-purity semiconductor materials (initially germanium, then silicon) to demonstrate solid-state amplification.",
    "strength": "primary",
    "sourceIds": [
      "src-ieee-transistor-milestone",
      "src-sze-semiconductor"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-integrated-circuit-semiconductors",
    "sourceConceptId": "concept-integrated-circuit",
    "targetConceptId": "concept-semiconductors",
    "type": "implemented-with",
    "explanation": "Integrated circuits are fabricated directly onto single-crystal semiconductor silicon wafers using photolithography and chemical doping.",
    "strength": "primary",
    "sourceIds": [
      "src-ethw-integrated-circuit",
      "src-streetman-solid-state"
    ],
    "reviewStatus": "needs-review"
  },
  {
    "id": "rel-microprocessor-revolution-history-of-computing",
    "sourceConceptId": "concept-microprocessor-revolution",
    "targetConceptId": "concept-history-of-computing",
    "type": "part-of",
    "explanation": "The invention of the single-chip microprocessor in 1971 marks the defining architectural transition in the modern history of computing.",
    "strength": "primary",
    "sourceIds": [
      "src-patterson-hennessy-cod"
    ],
    "reviewStatus": "needs-review"
  }
] as const;

/**
 * Bibliographic sources referenced by the Wave 1 candidate concepts and relationships
 * that are not already present in the production seed dataset or pilot dataset.
 */
export const WAVE1_NEW_SOURCES: readonly Source[] = [
  {
    "id": "src-dragon-book",
    "title": "Compilers: Principles, Techniques, and Tools (2nd Edition)",
    "url": "https://suif.stanford.edu/dragonbook/",
    "publisher": "Pearson / Addison-Wesley",
    "author": "Alfred V. Aho, Monica S. Lam, Ravi Sethi, and Jeffrey D. Ullman",
    "type": "textbook",
    "publicationDate": "2006",
    "accessDate": "2026-10-14",
    "notes": "Foundational computer science textbook on lexical analysis, syntax parsing, syntax-directed translation, type checking, intermediate code generation, and machine-code optimization."
  },
  {
    "id": "src-cooper-compiler",
    "title": "Engineering a Compiler (2nd Edition)",
    "url": "https://www.elsevier.com/books/engineering-a-compiler/cooper/978-0-12-088478-0",
    "publisher": "Morgan Kaufmann / Elsevier",
    "author": "Keith D. Cooper and Linda Torczon",
    "type": "textbook",
    "publicationDate": "2011",
    "accessDate": "2026-10-14",
    "notes": "Modern compiler engineering textbook detailing register allocation (graph coloring), instruction scheduling, static single assignment (SSA) form, and intermediate representation architectures."
  },
  {
    "id": "src-pierce-tapl",
    "title": "Types and Programming Languages",
    "url": "https://www.cis.upenn.edu/~bcpierce/tapl/",
    "publisher": "The MIT Press",
    "author": "Benjamin C. Pierce",
    "type": "textbook",
    "publicationDate": "2002",
    "accessDate": "2026-10-14",
    "notes": "Seminal graduate textbook on operational semantics, lambda calculus, type systems, subtyping, polymorphic typing (System F), and type safety theorems (progress and preservation)."
  },
  {
    "id": "src-cormen-clrs",
    "title": "Introduction to Algorithms (4th Edition)",
    "url": "https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/",
    "publisher": "The MIT Press",
    "author": "Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, and Clifford Stein",
    "type": "textbook",
    "publicationDate": "2022",
    "accessDate": "2026-10-14",
    "notes": "The standard university algorithms textbook covering asymptotic analysis, divide-and-conquer, dynamic programming, greedy algorithms, graph search, and amortized data structure complexity."
  },
  {
    "id": "src-knuth-taocp-v1",
    "title": "The Art of Computer Programming, Volume 1: Fundamental Algorithms (3rd Edition)",
    "url": "https://www-cs-faculty.stanford.edu/~knuth/taocp.html",
    "publisher": "Addison-Wesley",
    "author": "Donald E. Knuth",
    "type": "textbook",
    "publicationDate": "1997",
    "accessDate": "2026-10-14",
    "notes": "Foundational classic of computer science formalizing algorithm analysis, discrete mathematical prerequisites, and essential linear/tree data structures."
  },
  {
    "id": "src-shannon-1938-relay",
    "title": "A Symbolic Analysis of Relay and Switching Circuits",
    "url": "https://doi.org/10.1109/T-AIEE.1938.5057767",
    "publisher": "American Institute of Electrical Engineers (AIEE / IEEE)",
    "author": "Claude E. Shannon",
    "type": "academic",
    "publicationDate": "1938-12",
    "accessDate": "2026-10-14",
    "notes": "Landmark master's thesis demonstrating that Boolean algebra could model and optimize electromechanical relay and switching circuits, establishing the theoretical basis for digital logic design."
  },
  {
    "id": "src-streetman-solid-state",
    "title": "Solid State Electronic Devices (7th Edition)",
    "url": "https://www.pearson.com/en-us/subject-catalog/p/solid-state-electronic-devices/P200000003254",
    "publisher": "Pearson",
    "author": "Ben G. Streetman and Sanjay K. Banerjee",
    "type": "textbook",
    "publicationDate": "2015",
    "accessDate": "2026-10-14",
    "notes": "Authoritative engineering textbook covering crystal lattices, quantum mechanical band theory, carrier concentrations, p-n junctions, and field-effect transistors."
  },
  {
    "id": "src-jones-gc-handbook",
    "title": "The Garbage Collection Handbook: The Art of Automatic Memory Management (2nd Edition)",
    "url": "https://gchandbook.org/",
    "publisher": "Chapman and Hall / CRC Press",
    "author": "Richard Jones, Antony Hosking, and Eliot Moss",
    "type": "textbook",
    "publicationDate": "2023",
    "accessDate": "2026-10-14",
    "notes": "Comprehensive treatise on automated memory management covering mark-sweep, copying, generational, reference counting, concurrent, and real-time garbage collection algorithms."
  },
  {
    "id": "src-silberschatz-db",
    "title": "Database System Concepts (7th Edition)",
    "url": "https://www.db-book.com/",
    "publisher": "McGraw-Hill",
    "author": "Abraham Silberschatz, Henry F. Korth, and S. Sudarshan",
    "type": "textbook",
    "publicationDate": "2019",
    "accessDate": "2026-10-14",
    "notes": "Authoritative database textbook covering relational models, relational algebra, SQL, indexing structures (B+ trees), transaction management, and ACID guarantees."
  },
  {
    "id": "src-codd-1970-relational",
    "title": "A Relational Model of Data for Large Shared Data Banks",
    "url": "https://doi.org/10.1145/362384.362685",
    "publisher": "Association for Computing Machinery (ACM)",
    "author": "E. F. Codd",
    "type": "academic",
    "publicationDate": "1970-06",
    "accessDate": "2026-10-14",
    "notes": "Foundational ACM paper proposing the relational database model based on mathematical n-ary relations, liberating database users from hardware-dependent navigational pointers."
  },
  {
    "id": "src-sipser-computation",
    "title": "Introduction to the Theory of Computation (3rd Edition)",
    "url": "https://www.cengage.com/c/introduction-to-the-theory-of-computation-3e-sipser/9781133187790/",
    "publisher": "Cengage Learning",
    "author": "Michael Sipser",
    "type": "textbook",
    "publicationDate": "2012",
    "accessDate": "2026-10-14",
    "notes": "Authoritative textbook on automata, formal languages, Turing reducibility, computability, and computational complexity classes (P, NP, NP-completeness, space complexity)."
  },
  {
    "id": "src-turing-1936-computable",
    "title": "On Computable Numbers, with an Application to the Entscheidungsproblem",
    "url": "https://doi.org/10.1112/plms/s2-42.1.230",
    "publisher": "Proceedings of the London Mathematical Society",
    "author": "Alan M. Turing",
    "type": "academic",
    "publicationDate": "1937-01",
    "accessDate": "2026-10-14",
    "notes": "Seminal paper introducing abstract universal computing machines (Turing machines), proving the undecidability of the halting problem, and resolving Hilbert's Entscheidungsproblem."
  },
  {
    "id": "src-boole-1854-laws",
    "title": "An Investigation of the Laws of Thought on Which Are Founded the Mathematical Theories of Logic and Probabilities",
    "url": "https://www.gutenberg.org/ebooks/15114",
    "publisher": "Walton and Maberly / Project Gutenberg",
    "author": "George Boole",
    "type": "primary-source",
    "publicationDate": "1854",
    "accessDate": "2026-10-14",
    "notes": "Historical classic establishing algebraic logic, formulating the laws of thought as symbolic operations that represent propositions and truth values algebraically."
  },
  {
    "id": "src-griffiths-quantum",
    "title": "Introduction to Quantum Mechanics (3rd Edition)",
    "url": "https://www.cambridge.org/highereducation/books/introduction-to-quantum-mechanics/062C92DC68095AA586FBEE5D7A9C91EB",
    "publisher": "Cambridge University Press",
    "author": "David J. Griffiths and Darrell F. Schroeter",
    "type": "textbook",
    "publicationDate": "2018",
    "accessDate": "2026-10-14",
    "notes": "Standard university undergraduate quantum mechanics textbook covering wave functions, the Schrödinger equation, Hilbert spaces, quantum spin, perturbation theory, and Bell's theorem."
  },
  {
    "id": "src-pdg-standard-model",
    "title": "Review of Particle Physics: The Standard Model of Particle Physics",
    "url": "https://pdg.lbl.gov/",
    "publisher": "Particle Data Group / Lawrence Berkeley National Laboratory",
    "author": "Particle Data Group",
    "type": "reference",
    "publicationDate": "2024",
    "accessDate": "2026-10-14",
    "notes": "The globally recognized international reference compiling empirical measurements and theoretical consensus on quarks, leptons, gauge bosons, and fundamental particle interactions."
  },
  {
    "id": "src-ashcroft-mermin-solid-state",
    "title": "Solid State Physics",
    "url": "https://www.cengage.com/c/solid-state-physics-1e-ashcroft/9780030839931/",
    "publisher": "Cengage Learning / Brooks Cole",
    "author": "Neil W. Ashcroft and N. David Mermin",
    "type": "textbook",
    "publicationDate": "1976",
    "accessDate": "2026-10-14",
    "notes": "Definitive solid-state physics text covering Drude theory, crystal lattices, reciprocal lattice, Bloch's theorem, energy band structures, and electron dynamics in crystals."
  },
  {
    "id": "src-sep-logic-classical",
    "title": "Classical Logic",
    "url": "https://plato.stanford.edu/entries/logic-classical/",
    "publisher": "Stanford Encyclopedia of Philosophy",
    "author": "Stewart Shapiro and Teresa Kouri Kissel",
    "type": "reference",
    "publicationDate": "2021",
    "accessDate": "2026-10-14",
    "notes": "Authoritative reference analyzing propositional and first-order predicate logic, model-theoretic semantics, deductive validity, soundness, and completeness theorems."
  },
  {
    "id": "src-ieee-transistor-milestone",
    "title": "Milestones: Invention of the First Transistor at Bell Telephone Laboratories, 1947",
    "url": "https://ethw.org/Milestones:Invention_of_the_First_Transistor_at_Bell_Telephone_Laboratories,_1947",
    "publisher": "IEEE / Engineering and Technology History Wiki",
    "type": "reference",
    "publicationDate": "2009-12-08",
    "accessDate": "2026-10-06",
    "notes": "Historical milestone record commemorating the 1947 achievement of the point-contact transistor at Bell Labs."
  },
  {
    "id": "src-ethw-integrated-circuit",
    "title": "Milestones: First Semiconductor Integrated Circuit (IC), 1958",
    "url": "https://ethw.org/Milestones:First_Semiconductor_Integrated_Circuit_(IC),_1958",
    "publisher": "IEEE / Engineering and Technology History Wiki",
    "type": "reference",
    "publicationDate": "2009-02-14",
    "accessDate": "2026-10-14",
    "notes": "Official IEEE milestone record commemorating Jack Kilby's 1958 invention of the monolithic integrated circuit at Texas Instruments and Robert Noyce's subsequent planar silicon IC at Fairchild."
  },
  {
    "id": "src-von-neumann-1945-edvac",
    "title": "First Draft of a Report on the EDVAC",
    "url": "https://doi.org/10.1109/85.238389",
    "publisher": "IEEE Annals of the History of Computing",
    "author": "John von Neumann",
    "type": "academic",
    "publicationDate": "1993",
    "accessDate": "2026-10-14",
    "notes": "Historical document (originally issued June 30, 1945) formalizing the stored-program computer architecture: central arithmetic unit, central control unit, memory, and input/output organs."
  }
] as const;
