import Link from "next/link";
import styles from "../CandidateSummary.module.css";

export default function CytoscapeSpikeSummaryPage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <span className={styles.kicker}>Milestone M0.3 Spike Evaluation</span>
        <h1 className={styles.title}>Cytoscape.js (Canvas)</h1>
        <span className={styles.badge}>Status: Evaluated & Pruned (Section 21)</span>
      </header>

      <p className={styles.summaryText}>
        Cytoscape.js (v3.34.3) was evaluated as a feature-rich desktop-class network analysis
        library. While its selector-based styling and built-in gesture APIs allowed rapid setup, it
        carries significant drawbacks for Entrelis&apos;s product vision:
      </p>

      <div className={styles.decisionBox}>
        <h2 className={styles.decisionTitle}>Evaluation Findings</h2>
        <p className={styles.decisionText}>
          Cytoscape contributes approximately 120 kB gzipped (~430 kB uncompressed) to the client
          bundle. Its Canvas styling abstractions resist custom effects like soft glowing halos, and
          its force-directed layout algorithms (such as COSE) are computationally heavy and prone to
          spatial reshuffling, conflicting with Entrelis&apos;s mental-map stability requirements.
        </p>
        <p className={styles.decisionText}>
          In accordance with Section 21 of the spike requirements (&quot;keep only the
          dependency/dependencies required by the selected approach; remove rejected candidate
          dependencies&quot;), <code>cytoscape</code> was cleanly uninstalled following prototype
          evaluation.
        </p>
      </div>

      <div className={styles.navGroup}>
        <Link href="/spike/d3" className={styles.activeButton}>
          Launch Selected Prototype (D3-force + Canvas) &rarr;
        </Link>
        <Link href="/spike" className={styles.secondaryLink}>
          Back to Spike Overview
        </Link>
      </div>
    </div>
  );
}
