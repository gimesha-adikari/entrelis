import Link from "next/link";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <p className={styles.code}>404 · Uncharted Region</p>
        <h1 className={styles.title}>Concept Not Found</h1>
        <p className={styles.message}>
          This concept is not yet mapped in the Entrelis knowledge network. Everything is connected,
          but this particular path remains uncataloged.
        </p>
        <Link href="/" className={styles.actionButton}>
          Return to Knowledge Graph
        </Link>
      </div>
    </main>
  );
}
