import Link from "next/link";
import styles from "../CandidateSummary.module.css";

export default function SigmaSpikeSummaryPage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <span className={styles.kicker}>Milestone M0.3 Spike Evaluation</span>
        <h1 className={styles.title}>Sigma.js (WebGL)</h1>
        <span className={styles.badge}>Status: Evaluated & Pruned (Section 21)</span>
      </header>

      <p className={styles.summaryText}>
        Sigma.js (v3.0.3) was tested using Graphology for WebGL-accelerated graph rendering. While
        it demonstrated exceptional raw capacity for high-density networks (sub-millisecond neighbor
        traversals and high node counts), it imposes substantial friction on Entrelis&apos;s core
        knowledge exploration goals:
      </p>

      <div className={styles.decisionBox}>
        <h2 className={styles.decisionTitle}>Evaluation Findings</h2>
        <p className={styles.decisionText}>
          Custom node glows, variable halo markers, and customized directional arrowheads require
          writing low-level WebGL vertex/fragment shader programs. Furthermore, label rendering is
          split onto a secondary HTML5 Canvas overlay, and camera synchronization with React state
          is rigid.
        </p>
        <p className={styles.decisionText}>
          In accordance with Section 21 of the spike requirements (&quot;keep only the
          dependency/dependencies required by the selected approach; remove rejected candidate
          dependencies&quot;), <code>sigma</code> and <code>graphology</code> were cleanly
          uninstalled following prototype evaluation.
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
