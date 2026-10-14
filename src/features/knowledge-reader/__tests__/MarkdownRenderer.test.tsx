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
});
