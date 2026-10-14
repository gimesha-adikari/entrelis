import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MarkdownRenderer } from "../components/MarkdownRenderer";
import type { CitationRecord } from "@/data/preview/types";

describe("MarkdownRenderer Component", () => {
  it("renders headings with anchor IDs and correct semantic levels", () => {
    const md = `
# Main Article Title
## 1. Introduction & The Core Mental Model
### Microarchitectural Pipelines
`;

    render(<MarkdownRenderer markdown={md} />);

    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toBeDefined();
    expect(h1.textContent).toBe("Main Article Title");
    expect(h1.id).toBe("main-article-title");

    const h2 = screen.getByRole("heading", { level: 2 });
    expect(h2).toBeDefined();
    expect(h2.textContent).toBe("1. Introduction & The Core Mental Model");
    expect(h2.id).toBe("1-introduction-the-core-mental-model");

    const h3 = screen.getByRole("heading", { level: 3 });
    expect(h3).toBeDefined();
    expect(h3.textContent).toBe("Microarchitectural Pipelines");
    expect(h3.id).toBe("microarchitectural-pipelines");
  });

  it("renders inline citations as superscript buttons with accessible labels", () => {
    const md = `
Virtual memory manages address translation. [1](https://pages.cs.wisc.edu/~remzi/OSTEP/vm-intro.pdf)
`;
    const citations: CitationRecord[] = [
      {
        index: 1,
        sourceId: "src-arpaci-ostep",
        title: "Operating Systems: Three Easy Pieces",
        url: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-intro.pdf",
        evidenceTier: "Tier 1",
      },
    ];

    const onCitationClick = vi.fn();

    render(
      <MarkdownRenderer markdown={md} citations={citations} onCitationClick={onCitationClick} />
    );

    const button = screen.getByTestId("citation-badge-1");
    expect(button).toBeDefined();
    expect(button.textContent).toContain("[1]");
    expect(button.getAttribute("aria-label")).toBe(
      "Citation [1]: Operating Systems: Three Easy Pieces"
    );

    fireEvent.click(button);
    expect(onCitationClick).toHaveBeenCalledTimes(1);
    expect(onCitationClick).toHaveBeenCalledWith(citations[0]);
  });

  it("renders code blocks with language badge and copy action", async () => {
    // Mock navigator.clipboard
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText },
    });

    const md = `
\`\`\`c
int fd = open("file.txt", O_RDONLY);
close(fd);
\`\`\`
`;

    render(<MarkdownRenderer markdown={md} />);

    const codeBlock = screen.getByTestId("code-block");
    expect(codeBlock).toBeDefined();
    expect(screen.getByText("c")).toBeDefined();
    expect(screen.getByText(/int fd = open/)).toBeDefined();

    const copyBtn = screen.getByRole("button", { name: /copy c to clipboard/i });
    fireEvent.click(copyBtn);
    expect(writeText).toHaveBeenCalledWith('int fd = open("file.txt", O_RDONLY);\nclose(fd);');
  });

  it("renders tables with headers and rows properly", () => {
    const md = `
| Concept | Domain | Tier |
| :--- | :--- | :--- |
| Virtual Memory | Systems | Pilot |
| Rust | Languages | Seed |
`;

    render(<MarkdownRenderer markdown={md} />);

    expect(screen.getByRole("table")).toBeDefined();
    expect(screen.getByText("Virtual Memory")).toBeDefined();
    expect(screen.getByText("Languages")).toBeDefined();
    expect(screen.getAllByRole("columnheader")).toHaveLength(3);
  });

  it("safely handles raw HTML without evaluating executable code", () => {
    const md = `
This is safe text with <script>alert("xss")</script> included.
`;

    const { container } = render(<MarkdownRenderer markdown={md} />);

    expect(container.querySelector("script")).toBeNull();
    expect(screen.getByText(/alert\("xss"\)/)).toBeDefined();
  });

  it("disallows unsafe URL schemes like javascript: in links", () => {
    const md = `
Here is a [malicious link](javascript:alert(1)) and a [safe link](https://entrelis.org).
`;

    render(<MarkdownRenderer markdown={md} />);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]?.getAttribute("href")).toBe("https://entrelis.org");
    const maliciousText = screen.getByText("malicious link");
    expect(maliciousText).toBeDefined();
    expect(maliciousText.tagName).not.toBe("A");
  });

  it("renders blockquotes as accessible metadata callouts", () => {
    const md = `
> **Identifier:** \`concept-virtual-memory\`  
> **Review Status:** \`needs-review\`
`;

    render(<MarkdownRenderer markdown={md} />);

    const callout = screen.getByLabelText("Metadata and notes");
    expect(callout).toBeDefined();
    expect(callout.textContent).toContain("concept-virtual-memory");
    expect(callout.textContent).toContain("needs-review");
  });

  it("renders mathematical notation correctly using KaTeX", () => {
    const md = `
Because a 4 KiB page requires 12 bits ($2^{12} = 4096$), if program $A$ writes to program $B$'s data,
modern CPU decoders decompose instructions into micro-operations ($\\mu\\text{ops}$).
`;

    const { container } = render(<MarkdownRenderer markdown={md} />);

    const mathElements = screen.getAllByTestId("math-notation");
    expect(mathElements.length).toBe(4);

    // KaTeX elements should be present
    expect(container.querySelectorAll(".katex").length).toBe(4);
    expect(container.querySelectorAll(".katex-html").length).toBe(4);

    // Check specific math representations
    expect(mathElements[0]?.innerHTML).toContain("4096");
    expect(mathElements[1]?.innerHTML).toContain("A");
    expect(mathElements[2]?.innerHTML).toContain("B");
    expect(mathElements[3]?.innerHTML).toContain("ops");
  });

  it("renders math notation inside bold text and headings", () => {
    const md = `
### 3. Execution and Micro-Operations ($\\mu\\text{ops}$)

Modern processors decompose complex instructions into **micro-operations ($\\mu\\text{ops}$)**.
`;

    const { container } = render(<MarkdownRenderer markdown={md} />);

    const heading = screen.getByRole("heading", { level: 3 });
    expect(heading.querySelector(".katex")).not.toBeNull();

    const strong = container.querySelector("strong");
    expect(strong?.querySelector(".katex")).not.toBeNull();
  });

  it("preserves exact passage-level citation URLs from markdown while resolving metadata", () => {
    const md = `
TLBs cache virtual-to-physical address translations. [1](https://pages.cs.wisc.edu/~remzi/OSTEP/vm-tlbs.pdf)
`;
    const citations: CitationRecord[] = [
      {
        index: 1,
        sourceId: "src-arpaci-ostep",
        title: "Operating Systems: Three Easy Pieces",
        url: "https://pages.cs.wisc.edu/~remzi/OSTEP/",
        evidenceTier: "Tier 1",
        supportedClaims: "Virtual memory architecture",
      },
    ];

    const onCitationClick = vi.fn();

    render(
      <MarkdownRenderer markdown={md} citations={citations} onCitationClick={onCitationClick} />
    );

    const button = screen.getByTestId("citation-badge-1");
    expect(button.getAttribute("data-citation-url")).toBe(
      "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-tlbs.pdf"
    );

    fireEvent.click(button);

    expect(onCitationClick).toHaveBeenCalledTimes(1);
    const calledCitation = onCitationClick.mock.calls[0]?.[0];
    expect(calledCitation.index).toBe(1);
    expect(calledCitation.url).toBe("https://pages.cs.wisc.edu/~remzi/OSTEP/vm-tlbs.pdf");
    expect(calledCitation.canonicalUrl).toBe("https://pages.cs.wisc.edu/~remzi/OSTEP/");
    expect(calledCitation.title).toBe("Operating Systems: Three Easy Pieces");
  });

  it("supports multiple citations sharing the same index with distinct passage URLs", () => {
    const md = `
First chapter discusses paging [1](https://pages.cs.wisc.edu/~remzi/OSTEP/vm-paging.pdf).
Later chapter discusses TLBs [1](https://pages.cs.wisc.edu/~remzi/OSTEP/vm-tlbs.pdf).
`;
    const citations: CitationRecord[] = [
      {
        index: 1,
        sourceId: "src-arpaci-ostep",
        title: "Operating Systems: Three Easy Pieces",
        url: "https://pages.cs.wisc.edu/~remzi/OSTEP/",
      },
    ];

    const onCitationClick = vi.fn();

    render(
      <MarkdownRenderer markdown={md} citations={citations} onCitationClick={onCitationClick} />
    );

    const badges = screen.getAllByTestId("citation-badge-1");
    expect(badges).toHaveLength(2);

    expect(badges[0]?.getAttribute("data-citation-url")).toBe(
      "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-paging.pdf"
    );
    expect(badges[1]?.getAttribute("data-citation-url")).toBe(
      "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-tlbs.pdf"
    );

    fireEvent.click(badges[0]!);
    expect(onCitationClick).toHaveBeenLastCalledWith(
      expect.objectContaining({
        index: 1,
        url: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-paging.pdf",
        canonicalUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/",
      })
    );

    fireEvent.click(badges[1]!);
    expect(onCitationClick).toHaveBeenLastCalledWith(
      expect.objectContaining({
        index: 1,
        url: "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-tlbs.pdf",
        canonicalUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/",
      })
    );
  });

  it("safely rejects unsafe citation URL schemes like javascript:", () => {
    const md = `
Dangerous citation link [1](javascript:alert('pwned')).
`;
    const citations: CitationRecord[] = [
      {
        index: 1,
        title: "Safe Fallback",
        url: "https://example.com/safe",
      },
    ];

    const onCitationClick = vi.fn();

    render(
      <MarkdownRenderer markdown={md} citations={citations} onCitationClick={onCitationClick} />
    );

    const badge = screen.getByTestId("citation-badge-1");
    fireEvent.click(badge);

    const called = onCitationClick.mock.calls[0]?.[0];
    expect(called.url).toBe("https://example.com/safe");
  });
});
