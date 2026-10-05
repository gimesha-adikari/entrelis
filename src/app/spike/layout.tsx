import type { Metadata } from "next";
import Link from "next/link";
import styles from "./SpikeNav.module.css";

export const metadata: Metadata = {
  title: "M0.3 Graph Rendering Spike — Entrelis",
  description:
    "Technical spike evaluating Sigma.js, Cytoscape.js, and D3-force + Canvas for Entrelis Milestone M1.",
};

export default function SpikeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <header className={styles.navHeader}>
        <div className={styles.brandGroup}>
          <Link href="/" className={styles.title}>
            Entrelis
          </Link>
          <span className={styles.spikeBadge}>M0.3 Spike</span>
        </div>
        <nav aria-label="Spike Navigation">
          <ul className={styles.navLinks}>
            <li>
              <Link href="/spike" className={styles.navLink}>
                Overview
              </Link>
            </li>
            <li>
              <Link href="/spike/sigma" className={styles.navLink}>
                Sigma.js (WebGL)
              </Link>
            </li>
            <li>
              <Link href="/spike/cytoscape" className={styles.navLink}>
                Cytoscape.js (Canvas)
              </Link>
            </li>
            <li>
              <Link href="/spike/d3" className={styles.navLink}>
                D3-force (Canvas)
              </Link>
            </li>
          </ul>
        </nav>
      </header>
      <main className={styles.mainContainer}>{children}</main>
    </div>
  );
}
