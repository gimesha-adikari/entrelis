import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllPilotArticles, loadPilotArticle, PILOT_ARTICLES_METADATA } from "@/data/preview";
import { KnowledgeReader } from "@/features/knowledge-reader";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return PILOT_ARTICLES_METADATA.map((art) => ({
    slug: art.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const meta = PILOT_ARTICLES_METADATA.find((a) => a.slug === slug);

  if (!meta) {
    return {
      title: "Article Not Found — Knowledge Reader Preview | Entrelis Lab",
      description: "Draft article not found in the pilot collection.",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${meta.title} — Knowledge Reader Preview | Entrelis Lab`,
    description: meta.shortDescription,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function KnowledgeReaderSlugPage({ params }: Props) {
  const { slug } = await params;
  const article = loadPilotArticle(slug);

  if (!article) {
    notFound();
  }

  const allArticles = getAllPilotArticles();

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
      <KnowledgeReader initialArticle={article} allArticles={allArticles} />
    </Suspense>
  );
}
