"use client";

import React, { useState } from "react";
import {
  CelestialNode,
  CelestialRole,
  STAR_PALETTES,
  ROCKY_PALETTES,
  GAS_PALETTES,
  ICE_PALETTES,
} from "@/features/knowledge-graph/celestial";
import styles from "./showcase.module.css";

export default function CelestialNodeShowcase() {
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [interactiveRole, setInteractiveRole] = useState<CelestialRole>("focus");

  const toggleRole = () => {
    setInteractiveRole((prev) => {
      if (prev === "focus") return "primary";
      if (prev === "primary") return "context";
      return "focus";
    });
  };

  return (
    <div
      className={`${styles.showcaseContainer} ${isReducedMotion ? styles.reducedMotionScope : ""}`}
    >
      <header className={styles.header}>
        <div className={styles.badge}>GIM-18 Showcase</div>
        <h1 className={styles.title}>Entrelis Celestial Node System</h1>
        <p className={styles.subtitle}>
          Isolated component-level review surface for abstract celestial archetypes, layered
          atmospheric shaders, and compositor-driven micro-animations.
        </p>

        <div className={styles.controlsBar}>
          <button
            type="button"
            className={`${styles.controlButton} ${isReducedMotion ? styles.controlButtonActive : ""}`}
            onClick={() => setIsReducedMotion((v) => !v)}
          >
            {isReducedMotion ? "Reduced Motion: Enabled" : "Reduced Motion: Disabled"}
          </button>

          <button type="button" className={styles.controlButton} onClick={toggleRole}>
            Cycle Interactive Role:{" "}
            <strong style={{ textTransform: "uppercase" }}>{interactiveRole}</strong>
          </button>
        </div>
      </header>

      {/* ---------------- 1. Focus Archetypes ---------------- */}
      <section className={styles.section} id="focus-archetypes">
        <h2 className={styles.sectionTitle}>1. Focus Archetypes (Visual Mass ~74px)</h2>
        <p className={styles.sectionDesc}>
          Selected focal objects featuring full atmospheric coronas, spherical surface lighting,
          procedural textures, specular highlights, and thin focus orbital arcs.
        </p>

        <div className={styles.grid}>
          {/* Archetype 1: Star */}
          <div className={styles.card} data-testid="showcase-star-card">
            <div className={styles.cardNodeWrapper}>
              <CelestialNode
                id="showcase-star"
                name="Luminous Star"
                slug="star"
                role="focus"
                forcedArchetype="star"
                forcedPalette={STAR_PALETTES[1]} // Stellar Cyan
              />
            </div>
            <div className={styles.cardMeta}>
              <h3 className={styles.cardName}>Luminous Star</h3>
              <p className={styles.cardSub}>
                Energetic plasma core, rotating flare rays, breathing corona
              </p>
            </div>
          </div>

          {/* Archetype 2: Rocky World */}
          <div className={styles.card} data-testid="showcase-rocky-card">
            <div className={styles.cardNodeWrapper}>
              <CelestialNode
                id="showcase-rocky"
                name="Rocky World"
                slug="rocky"
                role="focus"
                forcedArchetype="rocky"
                forcedPalette={ROCKY_PALETTES[0]} // Copper Terrene (Rust)
              />
            </div>
            <div className={styles.cardMeta}>
              <h3 className={styles.cardName}>Rocky World (Rust)</h3>
              <p className={styles.cardSub}>
                Terminator shadow, warm rim light, procedural continental ridges
              </p>
            </div>
          </div>

          {/* Archetype 3: Gas World */}
          <div className={styles.card} data-testid="showcase-gas-card">
            <div className={styles.cardNodeWrapper}>
              <CelestialNode
                id="showcase-gas"
                name="Gas World"
                slug="gas"
                role="focus"
                forcedArchetype="gas"
                forcedPalette={GAS_PALETTES[0]} // Neptunian Cyan
              />
            </div>
            <div className={styles.cardMeta}>
              <h3 className={styles.cardName}>Atmospheric / Gas World</h3>
              <p className={styles.cardSub}>
                Curved jet-stream bands, counter-current drift, southern storm eddy
              </p>
            </div>
          </div>

          {/* Archetype 4: Ice World */}
          <div className={styles.card} data-testid="showcase-ice-card">
            <div className={styles.cardNodeWrapper}>
              <CelestialNode
                id="showcase-ice"
                name="Ice World"
                slug="ice"
                role="focus"
                forcedArchetype="ice"
                forcedPalette={ICE_PALETTES[0]} // Glacial Cyan
              />
            </div>
            <div className={styles.cardMeta}>
              <h3 className={styles.cardName}>Ice / Crystal World</h3>
              <p className={styles.cardSub}>
                Subsurface glacial fractures, crisp rim light, specular sweep
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- 2. Role Hierarchy Matrix ---------------- */}
      <section className={styles.section} id="role-matrix">
        <h2 className={styles.sectionTitle}>2. Role Hierarchy (Focus → Primary → Context)</h2>
        <p className={styles.sectionDesc}>
          Identical concept identity systematically adapting its level of detail and scale across
          scene roles.
        </p>

        <table className={styles.matrixTable}>
          <thead>
            <tr>
              <th className={styles.matrixTh} style={{ textAlign: "left", paddingLeft: "24px" }}>
                Archetype
              </th>
              <th className={styles.matrixTh}>Focus (~74px)</th>
              <th className={styles.matrixTh}>Primary (~40px)</th>
              <th className={styles.matrixTh}>Context (~18px)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={`${styles.matrixTd} ${styles.matrixTdLabel}`}>Star (Ownership)</td>
              <td className={styles.matrixTd}>
                <CelestialNode
                  id="concept-ownership"
                  name="Ownership"
                  slug="ownership"
                  role="focus"
                />
              </td>
              <td className={styles.matrixTd}>
                <CelestialNode
                  id="concept-ownership"
                  name="Ownership"
                  slug="ownership"
                  role="primary"
                />
              </td>
              <td className={styles.matrixTd}>
                <CelestialNode
                  id="concept-ownership"
                  name="Ownership"
                  slug="ownership"
                  role="context"
                />
              </td>
            </tr>

            <tr>
              <td className={`${styles.matrixTd} ${styles.matrixTdLabel}`}>Rocky (Rust)</td>
              <td className={styles.matrixTd}>
                <CelestialNode id="concept-rust" name="Rust" slug="rust" role="focus" />
              </td>
              <td className={styles.matrixTd}>
                <CelestialNode id="concept-rust" name="Rust" slug="rust" role="primary" />
              </td>
              <td className={styles.matrixTd}>
                <CelestialNode id="concept-rust" name="Rust" slug="rust" role="context" />
              </td>
            </tr>

            <tr>
              <td className={`${styles.matrixTd} ${styles.matrixTdLabel}`}>Gas (Memory)</td>
              <td className={styles.matrixTd}>
                <CelestialNode id="concept-memory" name="Memory" slug="memory" role="focus" />
              </td>
              <td className={styles.matrixTd}>
                <CelestialNode id="concept-memory" name="Memory" slug="memory" role="primary" />
              </td>
              <td className={styles.matrixTd}>
                <CelestialNode id="concept-memory" name="Memory" slug="memory" role="context" />
              </td>
            </tr>

            <tr>
              <td className={`${styles.matrixTd} ${styles.matrixTdLabel}`}>Ice (OS)</td>
              <td className={styles.matrixTd}>
                <CelestialNode
                  id="concept-operating-systems"
                  name="Operating Systems"
                  slug="operating-systems"
                  role="focus"
                />
              </td>
              <td className={styles.matrixTd}>
                <CelestialNode
                  id="concept-operating-systems"
                  name="Operating Systems"
                  slug="operating-systems"
                  role="primary"
                />
              </td>
              <td className={styles.matrixTd}>
                <CelestialNode
                  id="concept-operating-systems"
                  name="Operating Systems"
                  slug="operating-systems"
                  role="context"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* ---------------- 3. Interactive Promotion Testbed ---------------- */}
      <section className={styles.section} id="interactive-testbed">
        <h2 className={styles.sectionTitle}>3. Interactive Promotion Testbed</h2>
        <p className={styles.sectionDesc}>
          Click any body below to promote/demote its role in real-time. Notice how archetype and
          palette remain 100% stable while detail layers smoothly transition.
        </p>

        <div className={styles.interactiveRow}>
          {(
            [
              "concept-rust",
              "concept-ownership",
              "concept-memory",
              "concept-operating-systems",
            ] as const
          ).map((id) => (
            <div key={id} className={styles.interactiveCol}>
              <CelestialNode
                id={id}
                name={id.replace("concept-", "").replace("-", " ")}
                slug={id.replace("concept-", "")}
                role={interactiveRole}
                onClick={toggleRole}
              />
              <span className={styles.interactiveLabel}>Role: {interactiveRole}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
