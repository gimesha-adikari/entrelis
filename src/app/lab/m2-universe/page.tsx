import type { Metadata } from "next";
import { Suspense } from "react";
import { M2_PREVIEW_DATASET } from "@/data/preview";
import { KnowledgeGraphExperience } from "@/features/knowledge-graph";

interface Props {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const requestedConcept =
    typeof resolvedSearchParams.concept === "string" ? resolvedSearchParams.concept : undefined;

  const concept = requestedConcept
    ? M2_PREVIEW_DATASET.concepts.find((c) => c.slug === requestedConcept)
    : undefined;

  const title = concept
    ? `${concept.name} — M2 Connected Universe Preview | Entrelis Lab`
    : "M2 Connected Universe Preview (13 Nodes) — Entrelis Lab";

  return {
    title,
    description:
      concept?.shortDescription ??
      "Explore the connected 13-concept educational knowledge universe preview (7 published seed concepts and 6 research pilot candidates).",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function M2UniversePage({ searchParams }: Props) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const requestedConcept =
    typeof resolvedSearchParams.concept === "string" ? resolvedSearchParams.concept : undefined;

  const initialSlug =
    requestedConcept && M2_PREVIEW_DATASET.concepts.some((c) => c.slug === requestedConcept)
      ? requestedConcept
      : "rust";

  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            backgroundColor: "#05060a",
            color: "#94a3b8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: "0.875rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Loading M2 Universe...
        </div>
      }
    >
      <KnowledgeGraphExperience
        dataset={M2_PREVIEW_DATASET}
        initialSlug={initialSlug}
        navigationMode="lab"
      />
    </Suspense>
  );
}
