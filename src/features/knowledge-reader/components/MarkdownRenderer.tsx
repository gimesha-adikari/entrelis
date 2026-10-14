"use client";

import React, { useState } from "react";
import type { CitationRecord } from "@/data/preview/types";
import { isSafeUrl } from "@/domain/knowledge/validation";
import styles from "./MarkdownRenderer.module.css";

interface MarkdownRendererProps {
  readonly markdown: string;
  readonly citations?: readonly CitationRecord[];
  readonly onCitationClick?: (citation: CitationRecord) => void;
}

type InlineToken =
  | { type: "text"; content: string }
  | { type: "citation"; number: number; url: string }
  | { type: "link"; text: string; url: string }
  | { type: "bold"; text: string }
  | { type: "italic"; text: string }
  | { type: "code"; text: string };

type Block =
  | { type: "heading"; level: number; text: string; id: string }
  | { type: "code"; lang: string; code: string }
  | { type: "hr" }
  | { type: "blockquote"; text: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "paragraph"; text: string };

/**
 * Tokenizes an inline string into citations, bold, italic, inline code, and links.
 */
function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  // 1: Citation [n](url)
  // 2: Number inside citation
  // 3: Citation URL
  // 4: Standard link [text](url)
  // 5: Link text
  // 6: Link URL
  // 7: Bold **text**
  // 8: Bold text
  // 9: Code `text`
  // 10: Code text
  // 11: Italic *text*
  // 12: Italic text
  const pattern =
    /(\[(\d+)\]\(([^)]+)\))|(\[([^\]]+)\]\(([^)]+)\))|(\*\*([^*]+)\*\*)|(`([^`]+)`)|(\*([^*]+)\*)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        type: "text",
        content: text.slice(lastIndex, match.index),
      });
    }

    if (match[1] && match[2] && match[3]) {
      tokens.push({
        type: "citation",
        number: parseInt(match[2], 10),
        url: match[3],
      });
    } else if (match[4] && match[5] && match[6]) {
      tokens.push({
        type: "link",
        text: match[5],
        url: match[6],
      });
    } else if (match[7] && match[8]) {
      tokens.push({
        type: "bold",
        text: match[8],
      });
    } else if (match[9] && match[10]) {
      tokens.push({
        type: "code",
        text: match[10],
      });
    } else if (match[11] && match[12]) {
      tokens.push({
        type: "italic",
        text: match[12],
      });
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push({
      type: "text",
      content: text.slice(lastIndex),
    });
  }

  return tokens;
}

/**
 * Parses markdown source into top-level structural blocks.
 */
function parseBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  const lines = markdown.split("\n");
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    if (rawLine === undefined) break;

    const trimmed = rawLine.trim();

    // Skip empty lines
    if (!trimmed) {
      i++;
      continue;
    }

    // Code block ```
    if (trimmed.startsWith("```")) {
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length) {
        const nextLine = lines[i];
        if (nextLine === undefined || nextLine.trim().startsWith("```")) break;
        codeLines.push(nextLine);
        i++;
      }
      i++; // consume closing ```
      blocks.push({
        type: "code",
        lang,
        code: codeLines.join("\n"),
      });
      continue;
    }

    // Horizontal Rule ---
    if (/^---+\s*$/.test(trimmed)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // Heading #
    const headingMatch = rawLine.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch && headingMatch[1] && headingMatch[2]) {
      const level = headingMatch[1].length;
      let text = headingMatch[2].trim();
      text = text.replace(/\s*\(`[^`]+`\)$/, "");
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
      blocks.push({ type: "heading", level, text, id });
      i++;
      continue;
    }

    // Blockquote >
    if (rawLine.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i]?.startsWith(">")) {
        quoteLines.push(lines[i]!.replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ type: "blockquote", text: quoteLines.join("\n") });
      continue;
    }

    // Table | col | col |
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const tableLines: string[] = [];
      while (
        i < lines.length &&
        lines[i]?.trim().startsWith("|") &&
        lines[i]?.trim().endsWith("|")
      ) {
        tableLines.push(lines[i]!.trim());
        i++;
      }
      if (tableLines.length >= 2 && tableLines[0]) {
        const headerCells = tableLines[0]
          .slice(1, -1)
          .split("|")
          .map((s) => s.trim());
        const rowCells: string[][] = [];
        for (let r = 2; r < tableLines.length; r++) {
          const rowLine = tableLines[r];
          if (rowLine) {
            rowCells.push(
              rowLine
                .slice(1, -1)
                .split("|")
                .map((s) => s.trim())
            );
          }
        }
        blocks.push({ type: "table", headers: headerCells, rows: rowCells });
        continue;
      }
    }

    // Unordered List - or *
    if (/^\s*[-*]\s+/.test(rawLine)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i] ?? "")) {
        items.push((lines[i] ?? "").replace(/^\s*[-*]\s+/, "").trim());
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }

    // Ordered List 1.
    if (/^\s*\d+\.\s+/.test(rawLine)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i] ?? "")) {
        items.push((lines[i] ?? "").replace(/^\s*\d+\.\s+/, "").trim());
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }

    // Paragraph
    const pLines: string[] = [rawLine];
    i++;
    while (
      i < lines.length &&
      lines[i]?.trim() &&
      !lines[i]?.trim().startsWith("```") &&
      !lines[i]?.trim().startsWith("#") &&
      !lines[i]?.trim().startsWith(">") &&
      !/^---+\s*$/.test(lines[i]?.trim() ?? "") &&
      !(lines[i]?.trim().startsWith("|") && lines[i]?.trim().endsWith("|")) &&
      !/^\s*[-*]\s+/.test(lines[i] ?? "") &&
      !/^\s*\d+\.\s+/.test(lines[i] ?? "")
    ) {
      pLines.push(lines[i]!);
      i++;
    }
    blocks.push({ type: "paragraph", text: pLines.join(" ") });
  }

  return blocks;
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className={styles.codeBlockWrapper} data-testid="code-block">
      <div className={styles.codeBlockHeader}>
        <span className={styles.codeLang}>{lang || "text"}</span>
        <button
          type="button"
          className={styles.copyButton}
          onClick={handleCopy}
          aria-label={`Copy ${lang || "code"} to clipboard`}
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
      <pre className={styles.pre}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function MarkdownRenderer({
  markdown,
  citations = [],
  onCitationClick,
}: MarkdownRendererProps) {
  const citationMap = new Map<number, CitationRecord>();
  for (const c of citations) {
    citationMap.set(c.index, c);
  }

  const blocks = parseBlocks(markdown);

  function renderInline(text: string, keyPrefix: string) {
    const tokens = parseInline(text);
    return tokens.map((token, idx) => {
      const key = `${keyPrefix}-${idx}`;
      switch (token.type) {
        case "text":
          return <span key={key}>{token.content}</span>;
        case "bold":
          return (
            <strong key={key} className={styles.strong}>
              {token.text}
            </strong>
          );
        case "italic":
          return (
            <em key={key} className={styles.em}>
              {token.text}
            </em>
          );
        case "code":
          return (
            <code key={key} className={styles.inlineCode}>
              {token.text}
            </code>
          );
        case "citation": {
          const rec = citationMap.get(token.number) ?? {
            index: token.number,
            title: `Source Reference [${token.number}]`,
            url: token.url,
          };

          return (
            <sup key={key} className={styles.citationSup}>
              <button
                type="button"
                className={styles.citationBadge}
                onClick={() => onCitationClick?.(rec)}
                aria-label={`Citation [${token.number}]: ${rec.title}`}
                data-testid={`citation-badge-${token.number}`}
              >
                [{token.number}]
              </button>
            </sup>
          );
        }
        case "link": {
          const safe = isSafeUrl(token.url);
          if (!safe) {
            return <span key={key}>{token.text}</span>;
          }
          return (
            <a
              key={key}
              href={token.url}
              target="_blank"
              rel="noreferrer noopener"
              className={styles.link}
            >
              {token.text}
              <span className={styles.externalIcon} aria-hidden="true">
                ↗
              </span>
            </a>
          );
        }
      }
    });
  }

  return (
    <article className={styles.articleBody} data-testid="markdown-article-body">
      {blocks.map((block, idx) => {
        const key = `block-${idx}`;
        switch (block.type) {
          case "heading": {
            if (block.level === 1) {
              return (
                <h1 key={key} id={block.id} className={styles.h1}>
                  {block.text}
                </h1>
              );
            }
            if (block.level === 2) {
              return (
                <h2 key={key} id={block.id} className={styles.h2}>
                  {block.text}
                </h2>
              );
            }
            if (block.level === 3) {
              return (
                <h3 key={key} id={block.id} className={styles.h3}>
                  {block.text}
                </h3>
              );
            }
            return (
              <h4 key={key} id={block.id} className={styles.h4}>
                {block.text}
              </h4>
            );
          }
          case "paragraph":
            return (
              <p key={key} className={styles.paragraph}>
                {renderInline(block.text, key)}
              </p>
            );
          case "blockquote":
            return (
              <aside key={key} className={styles.blockquote} aria-label="Metadata and notes">
                {block.text.split("\n").map((line, lIdx) => (
                  <p key={`${key}-l-${lIdx}`} className={styles.quoteLine}>
                    {renderInline(line, `${key}-l-${lIdx}`)}
                  </p>
                ))}
              </aside>
            );
          case "hr":
            return <hr key={key} className={styles.hr} />;
          case "code":
            return <CodeBlock key={key} lang={block.lang} code={block.code} />;
          case "table":
            return (
              <div key={key} className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      {block.headers.map((h, hIdx) => (
                        <th key={`th-${hIdx}`} className={styles.th}>
                          {renderInline(h, `${key}-th-${hIdx}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rIdx) => (
                      <tr key={`tr-${rIdx}`} className={styles.tr}>
                        {row.map((cell, cIdx) => (
                          <td key={`td-${cIdx}`} className={styles.td}>
                            {renderInline(cell, `${key}-td-${rIdx}-${cIdx}`)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "ul":
            return (
              <ul key={key} className={styles.ul}>
                {block.items.map((item, itemIdx) => (
                  <li key={`li-${itemIdx}`} className={styles.li}>
                    {renderInline(item, `${key}-item-${itemIdx}`)}
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={key} className={styles.ol}>
                {block.items.map((item, itemIdx) => (
                  <li key={`li-${itemIdx}`} className={styles.li}>
                    {renderInline(item, `${key}-item-${itemIdx}`)}
                  </li>
                ))}
              </ol>
            );
        }
      })}
    </article>
  );
}
