import styles from "./page.module.css";

const FIRST_KNOWLEDGE_PATH = [
  "Rust",
  "Ownership",
  "Memory",
  "Stack & Heap",
  "Operating Systems",
  "CPUs",
  "Transistors",
] as const;

export default function Home() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            E
          </span>
          <span className={styles.brandName}>Entrelis</span>
        </div>
        <div className={styles.statusBadge}>
          <span className={styles.statusDot} aria-hidden="true" />
          <span>Foundation · M0.1</span>
        </div>
      </header>

      <main id="main-content" className={styles.main}>
        <div className={styles.hero}>
          <p className={styles.tagline}>Interactive Map of Knowledge</p>
          <h1 className={styles.title}>Entrelis</h1>
          <p className={styles.lead}>Everything is connected. Pick somewhere to start.</p>
          <p className={styles.description}>
            An interactive knowledge map built around connections between ideas, not isolated pages.
            Explore neighboring concepts and understand why they connect across science, technology,
            and human thought.
          </p>

          <section className={styles.card} aria-labelledby="foundation-status-heading">
            <div className={styles.cardHeader}>
              <h2 id="foundation-status-heading" className={styles.cardTitle}>
                Foundation Active
              </h2>
              <span className={styles.cardBadge}>Next.js · TypeScript · App Router</span>
            </div>
            <p className={styles.cardBody}>
              Application foundation initialized with strict TypeScript, shared design tokens, and
              automated testing baseline. Graph exploration modules and domain datasets will build
              directly on this foundation.
            </p>

            <div className={styles.pathSection}>
              <span className={styles.pathLabel}>Upcoming Vertical Slice</span>
              <div className={styles.pathDisplay} aria-label="Planned first knowledge path">
                {FIRST_KNOWLEDGE_PATH.map((concept, index) => (
                  <span key={concept} style={{ display: "contents" }}>
                    <span className={styles.pathNode}>{concept}</span>
                    {index < FIRST_KNOWLEDGE_PATH.length - 1 && (
                      <span className={styles.pathArrow} aria-hidden="true">
                        →
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className={styles.footer}>
        <span>Entrelis — Interactive Map of Ideas</span>
        <span>M0 Foundation</span>
      </footer>
    </div>
  );
}
