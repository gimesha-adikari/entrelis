import type { Source } from "@/domain/knowledge/types";

/**
 * Curated authoritative reference sources supporting concepts and relationships.
 */
export const SEED_SOURCES: readonly Source[] = [
  {
    id: "src-rust-book",
    title: "The Rust Programming Language",
    url: "https://doc.rust-lang.org/book/",
    publisher: "Rust Foundation / No Starch Press",
    author: "Steve Klabnik and Carol Nichols",
    type: "official-documentation",
    publicationDate: "2024",
    accessDate: "2026-10-06",
    notes:
      "Authoritative official guide detailing Rust language semantics, ownership, borrowing, lifetimes, and systems safety.",
    license: "MIT / Apache 2.0 dual license",
  },
  {
    id: "src-rust-reference",
    title: "The Rust Reference: Memory Model and Ownership",
    url: "https://doc.rust-lang.org/reference/",
    publisher: "Rust Foundation",
    author: "The Rust Project Developers",
    type: "official-documentation",
    publicationDate: "2024",
    accessDate: "2026-10-06",
    notes:
      "Primary language reference specifying memory layout, drop semantics, aliasing guarantees, and ownership rules.",
    license: "MIT / Apache 2.0 dual license",
  },
  {
    id: "src-bryant-csapp",
    title: "Computer Systems: A Programmer's Perspective (3rd Edition)",
    url: "https://csapp.cs.cmu.edu/",
    publisher: "Pearson",
    author: "Randal E. Bryant and David R. O'Hallaron",
    type: "textbook",
    publicationDate: "2015",
    accessDate: "2026-10-06",
    notes:
      "Core systems architecture textbook covering virtual memory, process address spaces, stack frames, heap allocation, and hardware interaction.",
  },
  {
    id: "src-arpaci-ostep",
    title: "Operating Systems: Three Easy Pieces",
    url: "https://pages.cs.wisc.edu/~remzi/OSTEP/",
    publisher: "Arpaci-Dusseau Books",
    author: "Remzi H. Arpaci-Dusseau and Andrea C. Arpaci-Dusseau",
    type: "textbook",
    publicationDate: "2018",
    accessDate: "2026-10-06",
    notes:
      "Foundational operating systems textbook covering virtualization of processor time and physical memory into isolated process spaces.",
    license: "CC BY-NC-ND 3.0",
  },
  {
    id: "src-tanenbaum-mos",
    title: "Modern Operating Systems (4th Edition)",
    url: "https://www.pearson.com/en-us/subject-catalog/p/modern-operating-systems/P200000003310",
    publisher: "Pearson",
    author: "Andrew S. Tanenbaum and Herbert Bos",
    type: "textbook",
    publicationDate: "2014",
    accessDate: "2026-10-06",
    notes:
      "Comprehensive systems treatise analyzing kernel architectures, preemptive scheduling, CPU registers, and hardware virtualization.",
  },
  {
    id: "src-patterson-hennessy-cod",
    title: "Computer Organization and Design: The Hardware/Software Interface (6th Edition)",
    url: "https://www.elsevier.com/books/computer-organization-and-design-mips-edition/patterson/978-0-12-820109-1",
    publisher: "Morgan Kaufmann / Elsevier",
    author: "David A. Patterson and John L. Hennessy",
    type: "textbook",
    publicationDate: "2020",
    accessDate: "2026-10-06",
    notes:
      "Standard university textbook explaining processor execution pipelines, logic gates, arithmetic units, and transistor-level silicon circuits.",
  },
  {
    id: "src-ieee-transistor-milestone",
    title: "IEEE Milestone: Invention of the First Transistor at Bell Telephone Laboratories, 1947",
    url: "https://ieeexplore.ieee.org/document/5594412",
    publisher: "IEEE History Center",
    type: "primary-source",
    publicationDate: "1998",
    accessDate: "2026-10-06",
    notes:
      "Historical record detailing the discovery of point-contact and field-effect amplification in semiconductors by Bardeen, Brattain, and Shockley.",
  },
  {
    id: "src-sze-semiconductor",
    title: "Semiconductor Devices: Physics and Technology (3rd Edition)",
    url: "https://www.wiley.com/en-us/Semiconductor+Devices%3A+Physics+and+Technology%2C+3rd+Edition-p-9780470537947",
    publisher: "John Wiley & Sons",
    author: "S. M. Sze and M. K. Lee",
    type: "textbook",
    publicationDate: "2012",
    accessDate: "2026-10-06",
    notes:
      "Classical physics and engineering text covering solid-state carrier transport, MOSFET gate switching, and microelectronic integration.",
  },
];
