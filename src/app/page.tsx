import type { Metadata } from "next";
import { KnowledgeGraphExperience } from "@/features/knowledge-graph";

export const metadata: Metadata = {
  title: "Entrelis — Everything is connected",
  description:
    "An interactive map of knowledge built around connections between ideas, not isolated pages.",
};

export default function Home() {
  return <KnowledgeGraphExperience initialSlug="rust" />;
}
