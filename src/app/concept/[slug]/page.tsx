import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SEED_DATASET } from "@/data/seed";
import { KnowledgeGraphExperience } from "@/features/knowledge-graph";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return SEED_DATASET.concepts.map((concept) => ({
    slug: concept.slug,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const concept = SEED_DATASET.concepts.find((c) => c.slug === slug);

  if (!concept) {
    return {
      title: "Concept Not Found — Entrelis",
      description: "Concept not found in the Entrelis knowledge network.",
    };
  }

  return {
    title: `${concept.name} — Entrelis`,
    description: concept.shortDescription,
  };
}

export default async function ConceptPage({ params }: Props) {
  const { slug } = await params;
  const concept = SEED_DATASET.concepts.find((c) => c.slug === slug);

  if (!concept) {
    notFound();
  }

  return <KnowledgeGraphExperience initialSlug={concept.slug} />;
}
