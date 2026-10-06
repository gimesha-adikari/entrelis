import Link from "next/link";
import styles from "./SpikeHub.module.css";

export default function SpikeHubPage() {
  const candidates = [
    {
      title: "Sigma.js",
      tag: "WebGL",
      href: "/spike/sigma",
      description:
        "High-performance WebGL-based network rendering leveraging Graphology data structures and state reducers.",
      renderer: "WebGL",
      ecosystem: "Graphology + Sigma v3.0.3",
      status: "Evaluated",
    },
    {
      title: "Cytoscape.js",
      tag: "HTML5 Canvas",
      href: "/spike/cytoscape",
      description:
        "Feature-complete graph theory library with built-in styling selectors, layout algorithms, and viewport gestures.",
      renderer: "HTML5 Canvas",
      ecosystem: "Cytoscape v3.34.3",
      status: "Evaluated",
    },
    {
      title: "D3-force + Custom Canvas",
      tag: "Custom Canvas",
      href: "/spike/d3",
      description:
        "Lightweight physics simulation driving a tailored 2D Canvas renderer with direct control over visual styling and animations.",
      renderer: "2D Canvas (HiDPI)",
      ecosystem: "d3-force v3.0.0",
      status: "Evaluated",
    },
  ];

  return (
    <div className={styles.hubContainer}>
      <header className={styles.hero}>
        <span className={styles.kicker}>Milestone M0.3 Decision Spike</span>
        <h1 className={styles.title}>Graph Rendering Evaluation</h1>
        <p className={styles.description}>
          Evaluating 2D graph rendering approaches for Entrelis Milestone M1 using the curated M0.2
          knowledge dataset. This technical decision spike benchmarks performance, visual
          flexibility, layout stability, mobile interaction, and Next.js integration.
        </p>
      </header>

      <div className={styles.grid}>
        {candidates.map((cand) => (
          <Link key={cand.href} href={cand.href} className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>{cand.title}</h2>
              <span className={styles.cardTag}>{cand.tag}</span>
            </div>
            <p className={styles.cardDescription}>{cand.description}</p>
            <div className={styles.cardMeta}>
              <div className={styles.metaItem}>
                <span>Renderer:</span>
                <span>{cand.renderer}</span>
              </div>
              <div className={styles.metaItem}>
                <span>Ecosystem:</span>
                <span>{cand.ecosystem}</span>
              </div>
            </div>
            <span className={styles.actionLink}>Launch Prototype &rarr;</span>
          </Link>
        ))}
      </div>

      <section className={styles.infoSection}>
        <h3 className={styles.infoTitle}>Curated Seed Dataset</h3>
        <p className={styles.infoText}>
          Each candidate renders the verified 7-concept chain:
          <br />
          <strong>
            Rust &rarr; Ownership &rarr; Memory &rarr; Stack &amp; Heap &rarr; Operating Systems
            &rarr; CPUs &rarr; Transistors
          </strong>
          <br />
          along with 8 directed relationships preserving the <code>
            SOURCE --TYPE--&gt; TARGET
          </code>{" "}
          invariant.
        </p>
      </section>
    </div>
  );
}
