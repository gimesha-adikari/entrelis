import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import KnowledgeReaderPage, { generateMetadata as generatePageMetadata } from "../page";
import KnowledgeReaderSlugPage, {
  generateMetadata as generateSlugMetadata,
  generateStaticParams,
} from "../[slug]/page";

// Mock next/navigation
const mockNotFound = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn().mockReturnValue(null),
  }),
  notFound: () => {
    mockNotFound();
    throw new Error("NEXT_NOT_FOUND");
  },
}));

describe("Knowledge Reader Lab Route Pages", () => {
  it("renders default article on /lab/knowledge-reader", async () => {
    const pageComponent = await KnowledgeReaderPage({
      searchParams: Promise.resolve({}),
    });

    render(pageComponent);

    expect(screen.getByTestId("knowledge-reader-root")).toBeDefined();
    expect(
      screen.getByRole("heading", { level: 1, name: "Instruction Set Architecture" })
    ).toBeDefined();
  });

  it("renders requested article when query parameter is provided", async () => {
    const pageComponent = await KnowledgeReaderPage({
      searchParams: Promise.resolve({ article: "virtual-memory" }),
    });

    render(pageComponent);

    expect(screen.getByRole("heading", { level: 1, name: "Virtual Memory" })).toBeDefined();
  });

  it("generates metadata for /lab/knowledge-reader accurately", async () => {
    const defaultMeta = await generatePageMetadata({
      searchParams: Promise.resolve({}),
    });
    expect(defaultMeta.title).toContain("Instruction Set Architecture");
    expect(defaultMeta.title).toContain("Knowledge Reader Preview");

    const customMeta = await generatePageMetadata({
      searchParams: Promise.resolve({ article: "file-systems" }),
    });
    expect(customMeta.title).toContain("File Systems");
  });

  it("generates static params containing all 6 pilot slugs for [slug] route", () => {
    const params = generateStaticParams();
    expect(params).toHaveLength(6);
    expect(params.map((p) => p.slug)).toEqual([
      "instruction-set-architecture",
      "virtual-memory",
      "file-systems",
      "concurrency",
      "asynchronous-io",
      "machine-code",
    ]);
  });

  it("renders specific article for /lab/knowledge-reader/[slug]", async () => {
    const slugPage = await KnowledgeReaderSlugPage({
      params: Promise.resolve({ slug: "concurrency" }),
    });

    render(slugPage);

    expect(screen.getByRole("heading", { level: 1, name: "Concurrency" })).toBeDefined();
  });

  it("generates metadata for /lab/knowledge-reader/[slug]", async () => {
    const meta = await generateSlugMetadata({
      params: Promise.resolve({ slug: "asynchronous-io" }),
    });
    expect(meta.title).toContain("Asynchronous I/O");

    const missingMeta = await generateSlugMetadata({
      params: Promise.resolve({ slug: "non-existent-article" }),
    });
    expect(missingMeta.title).toContain("Article Not Found");
  });

  it("triggers notFound() when an invalid slug is requested", async () => {
    mockNotFound.mockClear();

    await expect(
      KnowledgeReaderSlugPage({
        params: Promise.resolve({ slug: "invalid-concept" }),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(mockNotFound).toHaveBeenCalledTimes(1);
  });
});
