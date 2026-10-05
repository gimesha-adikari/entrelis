import type { Source } from "@/domain/knowledge/types";

/**
 * Curated authoritative reference sources supporting concepts and relationships.
 */
export const SEED_SOURCES: readonly Source[] = [
  {
    id: "src-rust-book",
    title: "The Rust Programming Language",
    url: "https://doc.rust-lang.org/book/",
    publisher: "The Rust Project",
    author: "Steve Klabnik, Carol Nichols, Chris Krycho, and contributions from the Rust Community",
    type: "official-documentation",
    accessDate: "2026-10-06",
    notes:
      "Official living documentation detailing Rust language semantics, ownership, borrowing, lifetimes, and safety guarantees. Published in print by No Starch Press.",
    license: "MIT / Apache-2.0 dual license",
  },
  {
    id: "src-rust-reference",
    title: "The Rust Reference",
    url: "https://doc.rust-lang.org/reference/",
    publisher: "The Rust Project",
    author: "The Rust Project Developers",
    type: "official-documentation",
    accessDate: "2026-10-06",
    notes:
      "Primary language reference specifying memory layout, drop semantics, and type rules. Explicitly documents that Rust's formal memory and aliasing model remains a work in progress.",
    license: "MIT / Apache-2.0 dual license",
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
    publicationDate: "2023-11",
    accessDate: "2026-10-06",
    notes:
      "Foundational operating systems textbook (Version 1.10, November 2023) covering virtualization of processor time and physical memory into isolated process address spaces.",
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
    title: "Milestones: Invention of the First Transistor at Bell Telephone Laboratories, 1947",
    url: "https://ethw.org/Milestones:Invention_of_the_First_Transistor_at_Bell_Telephone_Laboratories,_1947",
    publisher: "IEEE / Engineering and Technology History Wiki",
    type: "reference",
    publicationDate: "2009-12-08",
    accessDate: "2026-10-06",
    notes:
      "Historical milestone record dedicated on 2009-12-08 commemorating the 1947 achievement of the point-contact transistor by John Bardeen, Walter Brattain, and William Shockley at Bell Labs.",
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
