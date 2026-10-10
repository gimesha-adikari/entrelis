import type { Metadata } from "next";
import { Celestial3DLab } from "@/features/knowledge-graph/celestial-3d";

export const metadata: Metadata = {
  title: "Celestial 3D Lab | Entrelis",
  description: "Prototype real 3D celestial concept bodies for Entrelis.",
};

export default function Celestial3DPage() {
  return (
    <main style={{ width: "100vw", height: "100vh", overflow: "hidden", margin: 0, padding: 0 }}>
      <Celestial3DLab />
    </main>
  );
}
