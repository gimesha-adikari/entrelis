import type { Metadata } from "next";
import { Suspense } from "react";
import { WAVE1_PREVIEW_DATASET } from "@/data/preview";
import { KnowledgeGraphExperience } from "@/features/knowledge-graph";

interface Props {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const requestedConcept =
    typeof resolvedSearchParams.concept === "string" ? resolvedSearchParams.concept : undefined;

  const concept = requestedConcept
    ? WAVE1_PREVIEW_DATASET.concepts.find((c) => c.slug === requestedConcept)
    : undefined;

  const title = concept
    ? `${concept.name} — M2 Wave 1 Universe Preview (33 Nodes) | Entrelis Lab`
    : "M2 Wave 1 Universe Preview (33 Nodes) — Entrelis Lab";

  return {
    title,
    description:
      concept?.shortDescription ??
      "Explore the connected 33-concept educational knowledge universe preview (7 published seed concepts and 26 research candidate concepts).",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function M2Wave1UniversePage({ searchParams }: Props) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const requestedConcept =
    typeof resolvedSearchParams.concept === "string" ? resolvedSearchParams.concept : undefined;

  const initialSlug =
    requestedConcept && WAVE1_PREVIEW_DATASET.concepts.some((c) => c.slug === requestedConcept)
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
          Loading M2 Wave 1 Universe...
        </div>
      }
    >
      <KnowledgeGraphExperience
        dataset={WAVE1_PREVIEW_DATASET}
        initialSlug={initialSlug}
        navigationMode="wave1"
      />
    </Suspense>
  );
}
