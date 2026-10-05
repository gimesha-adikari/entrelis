"use client";

import dynamic from "next/dynamic";
import { SEED_DATASET } from "@/data/seed";

const D3GraphView = dynamic(() => import("@/spike/components/D3GraphView"), {
  ssr: false,
  loading: () => (
    <div style={{ padding: "2rem", color: "var(--color-text-muted)" }}>
      Initializing Canvas container (D3-force)...
    </div>
  ),
});

export default function D3SpikePage() {
  return <D3GraphView dataset={SEED_DATASET} />;
}
