import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllPilotArticles, ALL_ARTICLES_METADATA } from "@/data/preview";
import { KnowledgeReader } from "@/features/knowledge-reader";

interface Props {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const requestedArticle =
    typeof resolvedSearchParams.article === "string" ? resolvedSearchParams.article : undefined;

  const defaultMeta = ALL_ARTICLES_METADATA[0];
  const meta = requestedArticle
    ? (ALL_ARTICLES_METADATA.find((a) => a.slug === requestedArticle) ?? defaultMeta)
    : defaultMeta;

  const title = meta
    ? `${meta.title} — Knowledge Reader Preview | Entrelis Lab`
    : "Knowledge Reader Preview — Entrelis Lab";

  return {
    title,
    description:
      meta?.shortDescription ??
      "Read-only educational article preview for Milestone 2 Wave 1 Pilot candidates.",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function KnowledgeReaderPage({ searchParams }: Props) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const requestedArticle =
    typeof resolvedSearchParams.article === "string" ? resolvedSearchParams.article : undefined;

  const allArticles = getAllPilotArticles();
  if (allArticles.length === 0) {
    notFound();
  }

  const initialArticle = requestedArticle
    ? (allArticles.find((a) => a.slug === requestedArticle) ?? allArticles[0])
    : allArticles[0];

  if (!initialArticle) {
    notFound();
  }

  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            backgroundColor: "#090a0d",
            color: "#9ca3af",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "sans-serif",
          }}
        >
          Loading reader...
        </div>
      }
    >
      <KnowledgeReader initialArticle={initialArticle} allArticles={allArticles} />
    </Suspense>
  );
}
