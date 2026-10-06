import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ConceptPage, { generateMetadata, generateStaticParams } from "@/app/concept/[slug]/page";
import NotFound from "@/app/not-found";

const mockNotFound = vi.fn();

vi.mock("next/navigation", () => ({
  notFound: () => {
    mockNotFound();
    throw new Error("NEXT_NOT_FOUND");
  },
}));

describe("Concept Routes and Metadata", () => {
  it("renders requested concept for valid slug", async () => {
    const pageComponent = await ConceptPage({
      params: Promise.resolve({ slug: "ownership" }),
    });

    render(pageComponent);
    expect(screen.getByRole("heading", { name: "Ownership" })).toBeDefined();
  });

  it("triggers notFound() for invalid concept slug", async () => {
    mockNotFound.mockClear();

    await expect(
      ConceptPage({
        params: Promise.resolve({ slug: "definitely-not-a-real-concept" }),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(mockNotFound).toHaveBeenCalledTimes(1);
  });

  it("generates correct metadata for valid and invalid concept slugs", async () => {
    const validMeta = await generateMetadata({
      params: Promise.resolve({ slug: "memory" }),
    });
    expect(validMeta.title).toBe("Memory — Entrelis");
    expect(validMeta.description).toContain("The storage systems and addressable spaces");

    const invalidMeta = await generateMetadata({
      params: Promise.resolve({ slug: "nonexistent" }),
    });
    expect(invalidMeta.title).toBe("Concept Not Found — Entrelis");
  });

  it("generates static params for all 7 curated seed concepts", () => {
    const params = generateStaticParams();
    expect(params.length).toBe(7);
    const slugs = params.map((p) => p.slug);
    expect(slugs).toContain("rust");
    expect(slugs).toContain("ownership");
    expect(slugs).toContain("memory");
    expect(slugs).toContain("stack-and-heap");
    expect(slugs).toContain("operating-systems");
    expect(slugs).toContain("cpus");
    expect(slugs).toContain("transistors");
  });

  it("renders Entrelis-styled 404 page", () => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { name: "Concept Not Found" })).toBeDefined();
    expect(screen.getByRole("link", { name: /Return to Knowledge Graph/i })).toBeDefined();
  });
});
