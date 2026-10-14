# File Systems (`concept-file-systems`)

> **Identifier:** `concept-file-systems`  
> **Slug:** `file-systems`  
> **Primary Domains:** `operating-systems`, `storage`, `software-engineering`  
> **Direct Graph Adjacencies:** `concept-operating-systems`  
> **Review Status:** `needs-review`  

---

## 1. Introduction & The Core Mental Model

Main memory (RAM) is lightning-fast, but it suffers from a fatal flaw: it is volatile. The moment a computer is powered off or loses electricity, every single bit held in RAM vanishes into the void. To retain software, documents, images, and databases across reboots, computers rely on non-volatile persistent storage devices—such as solid-state drives (NVMe/SATA SSDs), magnetic hard disk drives, and USB flash storage.

Yet physical storage hardware is astonishingly primitive. An SSD or hard drive knows nothing about "files," "names," "text documents," or "folders." To the hardware controller, the drive is simply a colossal, flat, linear array of numbered storage slots called **logical blocks** (typically 4,096 bytes each). [1](https://pages.cs.wisc.edu/~remzi/OSTEP/file-intro.pdf)

A **file system** is the operating system subsystem that transforms this raw, intimidating grid of storage sectors into the intuitive, structured universe of named files, nested directories, and secure permissions that human beings and software applications rely upon every day. [1](https://pages.cs.wisc.edu/~remzi/OSTEP/file-intro.pdf)

To picture the mental model, imagine a massive warehouse containing millions of identical, unmarked cardboard storage lockers. If workers were told to simply drop their belongings in any random locker, chaos would reign within an hour; no one would know where their files were, and workers would constantly overwrite each other's possessions. A file system acts as the master warehouse registry: it assigns meaningful labels to lockers, groups them into organized departments, maintains an index of which lockers are currently empty or occupied, and records a meticulous ledger tracking which worker possesses permission to open each door.

---

## 2. Why It Matters: Motivation & Historical Context

In the earliest days of magnetic tape and drum storage, applications had to manage storage blocks manually. A program had to calculate exact cylinder, head, and sector numbers on a physical disk platter. If two different programs needed to write to the same disk, their developers had to coordinate manually to ensure their sector allocations did not collide.

As computers evolved into multi-user systems running dozens of concurrent programs, this manual approach became untenable. Operating systems needed to provide an abstraction that could:
1. **Provide Meaningful Human Names:** Allow users and programs to identify data with durable, human-readable strings like `quarterly_report.pdf` rather than hardware sector ranges like `Block 481,209 through 481,245`. [1](https://pages.cs.wisc.edu/~remzi/OSTEP/file-intro.pdf)
2. **Abstract Diverse Hardware:** Allow the identical code to read and write data seamlessly whether the underlying media is an ultra-fast PCIe NVMe drive, a spinning magnetic platter, a network-attached storage array, or an optical disc.
3. **Ensure Crash Consistency:** Prevent catastrophic corruption if the computer unexpectedly loses power halfway through saving a large file. [1](https://pages.cs.wisc.edu/~remzi/OSTEP/file-journaling.pdf)

Modern file systems—such as Linux ext4, macOS APFS, Windows NTFS, and enterprise systems like ZFS and Btrfs—represent decades of intense computer science research into balancing read/write performance, atomic durability, and namespace scalability.

---

## 3. Architectural Anatomy & How It Works

To understand how file systems organize physical media, we must distinguish between universal architectural abstractions and specific filesystem implementations. Universal concepts include hierarchical namespaces, file descriptors, and data/metadata separation; specific implementations vary significantly in how they organize on-disk records.

```
┌────────────────────────────────────────────────────────┐
│  Directory Entry: maps "notes.txt" ──> Inode #42       │
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│  Inode #42 (Metadata):                                 │
│  - File Size: 8,192 bytes                              │
│  - Permissions: 0644 (Read/Write Owner, Read Others)   │
│  - Timestamps: Created, Modified, Accessed             │
│  - Extent Tree / Pointers: [Block 104, Block 105]      │
└──────────────────────────┬─────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│  Storage Media Blocks: [Block 104]  [Block 105]        │
│  Contains actual file byte contents                    │
└────────────────────────────────────────────────────────┘
```

### 1. Inodes vs. Alternative Metadata Models
In Unix-like systems and POSIX architectures, the central building block of a file is the **inode** (index node). [1](https://pages.cs.wisc.edu/~remzi/OSTEP/file-implementation.pdf) Crucially, an inode contains all the metadata describing a file, **except** its name. 

An inode stores:
- **File Type:** Regular file, directory, symbolic link, socket, or device node.
- **File Size:** The exact length of the file in bytes.
- **Ownership & Permissions:** The user ID, group ID, and read/write/execute permission bits.
- **Timestamps:** Access time, modification time, and metadata change time.
- **Block Pointers or Extents:** The physical block numbers where raw data bytes reside. While classic Unix file systems used fixed direct and indirect block pointer trees, modern implementations (like ext4 and XFS) use **extents**—contiguous ranges of blocks specified by a starting block and a length—drastically reducing indexing overhead for large files.

*Implementation Note:* Inodes are characteristic of POSIX and Unix-derived designs. Other major architectures use fundamentally different schemes: Windows NTFS organizes files as records in a relational-like Master File Table (MFT); Microsoft FAT links cluster chains together in a global File Allocation Table; and copy-on-write systems like ZFS and Btrfs represent files and directories as nodes within self-balancing B-trees.

### 2. Directories as Mappings
What, then, is a "directory"? In a Unix-style file system, a directory is not a physical folder; it is simply a special file whose content is a table of pairs: **`(human_readable_name, inode_number)`**. [1](https://pages.cs.wisc.edu/~remzi/OSTEP/file-intro.pdf) 

When an application asks to open `/home/alice/notes.txt`, the operating system traverses the directory tree:
1. It opens the root directory (always located at a well-known inode, typically inode 2).
2. It scans the root directory's entries to find `home`, which reveals the inode number for `home`.
3. It reads the `home` inode to locate its directory blocks, scans them to find `alice`, and retrieves `alice`'s inode.
4. Finally, it scans `alice`'s directory entries to find `notes.txt`, discovering its inode (e.g., Inode 42).

### 3. Allocation and Free-Space Tracking
To allocate space for new files, the file system maintains tracking structures, such as **free block bitmaps** or B-trees. A block bitmap uses a single bit to represent each 4 KiB block on the drive: a `0` indicates the block is free, while a `1` indicates it is in use. [1](https://pages.cs.wisc.edu/~remzi/OSTEP/file-implementation.pdf)

### 4. Crash Consistency: Journaling vs. Copy-on-Write
What happens if a computer loses power precisely as it is appending data to a file? Appending data requires at least three distinct disk writes:
1. Writing the new data bytes into a newly allocated data block.
2. Updating the inode to point to the new data block and increase the file size.
3. Updating the free block bitmap to mark the block as occupied.

If power fails halfway through, the file system could be left in an inconsistent state, causing orphaned data blocks or corrupted pointers.

Modern architectures solve this using two primary paradigms:
- **Write-Ahead Journaling (ext4, XFS, NTFS):** Before modifying the actual file system structures in-place, the kernel writes a concise summary of the intended modifications into a circular logging region called the **journal**. Once committed, the actual file system structures are updated (*checkpointed*). On reboot after a crash, the recovery process simply replays or discards uncommitted transactions. [1](https://pages.cs.wisc.edu/~remzi/OSTEP/file-journaling.pdf)
- **Copy-on-Write / CoW (ZFS, Btrfs, APFS):** Instead of overwriting existing blocks in place or maintaining a separate journal, CoW systems write modified data and metadata to brand-new, previously unallocated blocks. Once the new blocks are safely written, the root tree pointer is atomically updated to point to the new version, ensuring the on-disk state is always structurally valid.

---

## 4. Concrete Example & Practical Walkthrough

Let us trace what occurs under the hood when a C or Rust program creates and writes a small file:

```c
int fd = open("greeting.txt", O_CREAT | O_WRONLY, 0644);
write(fd, "Hello, world!\n", 14);
close(fd);
```

When this code executes:
1. **Directory Lookup & Inode Allocation:** The kernel scans the current working directory to verify `greeting.txt` does not already exist. It then consults the **inode bitmap**, finds an unused bit, flips it to `1`, and initializes a new inode structure in memory.
2. **Directory Insertion:** The kernel appends a new entry `("greeting.txt", inode_num)` to the parent directory's block list.
3. **Data Buffer Allocation:** When `write()` is invoked, the operating system kernel copies the 14 bytes `"Hello, world!\n"` into an in-memory page cache buffer. It consults the **block bitmap**, allocates a free storage block on the disk, and writes that block number into the new inode's direct block pointer table or extent tree.
4. **Journal Commit & Asynchronous Flushing:** The operating system logs this transaction into the filesystem journal. To maximize performance, the actual write of the 14 bytes to the physical drive is deferred; the kernel keeps the data in the RAM **page cache** and schedules background kernel threads (such as `kworker` or `pdflush`) to flush the dirty data to physical storage asynchronously.

---

## 5. Critical Distinctions & Common Misconceptions

### Misconception 1: "The File Name is Stored Inside the File"
Beginners frequently believe that a file's name is an intrinsic attribute stored inside the file itself. In truth, an inode has no knowledge of the name assigned to it. The name exists solely within a **directory entry** pointing to an inode number. [1](https://pages.cs.wisc.edu/~remzi/OSTEP/file-intro.pdf) 

This architectural separation enables **hard links**: multiple directory entries, located in different directories across the file system, can all point to the exact same inode number. The underlying file has only one inode, one set of permissions, and one set of data blocks, but it possesses multiple valid names. Only when the last directory link is removed does the file system delete the inode and free its blocks.

### Misconception 2: "Journaling Guarantees That No Data Can Ever Be Lost"
A widespread misconception among developers is that a journaling file system (such as Linux ext4 in its standard `data=ordered` mode) guarantees that recent file writes will survive an unexpected crash.

In reality, standard journaling protects **metadata integrity**, not uncommitted application payloads. It guarantees that the directory tree, block pointers, and free-space bitmaps will not be corrupted or point to orphaned garbage. However, data written by an application often sits in volatile CPU and drive write caches for several seconds before being written to persistent silicon. If power is pulled, that uncommitted data vanishes unless the application explicitly invokes **`fsync()`** or **`fdatasync()`** to force a synchronous hardware cache flush. [1](https://pages.cs.wisc.edu/~remzi/OSTEP/file-journaling.pdf)

Furthermore, there is a critical prerequisite developers frequently miss: while `fsync(fd)` guarantees that the file's data and its inode are flushed to disk, guaranteeing that a *newly created file's name* persists in its directory across power loss requires calling `fsync()` on the file descriptor of the **parent directory** as well.

---

## 6. Interconnections in the Knowledge Universe

File systems bridge foundational operating system capabilities with higher-level storage architectures:

- **From Operating Systems (`concept-file-systems --(part-of)--> concept-operating-systems`):** File systems reside within the operating system kernel, relying on the kernel's virtual file system (VFS) abstraction, buffer cache, and device drivers to communicate with physical block storage.
- **To Data Structures (`concept-file-systems --(uses)--> concept-data-structures`):** High-performance file systems rely heavily on advanced computer science data structures—such as B-trees for indexing billion-file directories, hash tables for directory lookups, and radix trees for caching active file pages in memory.
- **Looking Ahead to Database Systems (`concept-database-systems --(depends-on)--> concept-file-systems`):** Relational and NoSQL database engines do not reinvent low-level block allocation; they store their data tables, indexes, and transaction write-ahead logs on top of the abstractions provided by host file systems.

---

## 7. Authoritative References & Evidence Ledger

1. `src-arpaci-ostep`: Remzi H. Arpaci-Dusseau and Andrea C. Arpaci-Dusseau. *Operating Systems: Three Easy Pieces*. Arpaci-Dusseau Books, Version 1.10, 2023.  
   - **URL:** [https://pages.cs.wisc.edu/~remzi/OSTEP/](https://pages.cs.wisc.edu/~remzi/OSTEP/)  
   - **Direct Chapter URLs:**
     - Chapter 39 "Files and Directories": [https://pages.cs.wisc.edu/~remzi/OSTEP/file-intro.pdf](https://pages.cs.wisc.edu/~remzi/OSTEP/file-intro.pdf)
     - Chapter 40 "File System Implementation": [https://pages.cs.wisc.edu/~remzi/OSTEP/file-implementation.pdf](https://pages.cs.wisc.edu/~remzi/OSTEP/file-implementation.pdf)
     - Chapter 42 "Crash Consistency: FSCK and Journaling": [https://pages.cs.wisc.edu/~remzi/OSTEP/file-journaling.pdf](https://pages.cs.wisc.edu/~remzi/OSTEP/file-journaling.pdf)
   - **Evidence Tier:** Tier 1 (Direct Full-Text Verified Open Textbook)  
   - **Location:** Chapter 39, pp. 1–14; Chapter 40, pp. 1–22; Chapter 42, pp. 1–20.  
   - **Supported Claims:** Raw block storage abstraction, inode metadata structures, directory name-to-inode mappings, free-space block bitmaps, write-ahead journaling for atomic update consistency, and the critical distinction between metadata crash consistency and `fsync()` data durability.
