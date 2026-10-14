import React from "react";
import { CelestialIdentity, CelestialRole } from "../types";
import styles from "./bodies.module.css";

interface BodyProps {
  identity: CelestialIdentity;
  role: CelestialRole;
  size: number;
  isSelected?: boolean;
  isHovered?: boolean;
}

export const GasBody: React.FC<BodyProps> = ({ identity, role, size, isHovered }) => {
  const { palette, seed, rotationDelay, breathingDuration, breathingDelay } = identity;
  const isFocus = role === "focus";
  const isContext = role === "context";

  // Derive subtle variation for storm oval from seed
  const stormY = 62 + ((seed % 10) - 5);
  const stormX = 40 + (((seed >> 4) % 16) - 8);

  const coronaSize = isFocus ? size * 2.1 : isHovered ? size * 1.7 : size * 1.4;

  return (
    <div
      className={styles.celestialBodyWrapper}
      style={{
        width: size,
        height: size,
      }}
    >
      {/* 1. Soft Gaseous Bloom */}
      <div
        className={`${styles.coronaLayer} ${isFocus ? styles.animateBreath : ""}`}
        style={{
          width: coronaSize,
          height: coronaSize,
          background: `radial-gradient(circle, ${palette.corona} 0%, ${palette.corona.replace("0.40", "0.12")} 45%, rgba(0,0,0,0) 70%)`,
          animationDuration: breathingDuration,
          animationDelay: breathingDelay,
        }}
      />

      <svg
        className={styles.bodySvg}
        viewBox="0 0 100 100"
        width={size}
        height={size}
        aria-hidden="true"
      >
        <defs>
          <clipPath id={`gas-clip-${identity.conceptId}`}>
            <circle cx="50" cy="50" r="46" />
          </clipPath>

          {/* Base Spherical Gas Gradient */}
          <radialGradient
            id={`gas-base-${identity.conceptId}`}
            cx="36%"
            cy="32%"
            r="60%"
            fx="32%"
            fy="28%"
          >
            <stop offset="0%" stopColor={palette.core} stopOpacity="1" />
            <stop offset="40%" stopColor={palette.primary} stopOpacity="1" />
            <stop offset="75%" stopColor={palette.secondary} stopOpacity="1" />
            <stop offset="100%" stopColor={palette.darkSide} stopOpacity="1" />
          </radialGradient>

          {/* Strong Limb Darkening / Fresnel Shadow */}
          <radialGradient id={`gas-limb-shadow-${identity.conceptId}`} cx="50%" cy="50%" r="50%">
            <stop offset="68%" stopColor="#000000" stopOpacity="0" />
            <stop offset="90%" stopColor="#020617" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0.95" />
          </radialGradient>

          {/* Atmospheric Rim Edge */}
          <linearGradient id={`gas-rim-${identity.conceptId}`} x1="20%" y1="10%" x2="85%" y2="90%">
            <stop offset="0%" stopColor={palette.limb} stopOpacity="0.9" />
            <stop offset="50%" stopColor={palette.primary} stopOpacity="0.3" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* 2. Base Gaseous Sphere */}
        <circle cx="50" cy="50" r="46" fill={`url(#gas-base-${identity.conceptId})`} />

        {/* 3. Curved Banded Atmosphere Layers (Clipped) */}
        {!isContext && (
          <g clipPath={`url(#gas-clip-${identity.conceptId})`}>
            {/* Band Layer A: Drifting Eastward (28s) */}
            <g
              className={styles.animateBandDriftA}
              style={{
                animationDuration: "28s",
                animationDelay: rotationDelay,
              }}
            >
              {/* Equatorial Jet Stream */}
              <ellipse cx="50" cy="44" rx="60" ry="12" fill={palette.core} opacity="0.32" />
              {/* Temperate Band 1 */}
              <ellipse cx="50" cy="28" rx="55" ry="9" fill={palette.secondary} opacity="0.45" />
              {/* High Latitude Polar Jet */}
              <ellipse cx="50" cy="18" rx="48" ry="6" fill={palette.primary} opacity="0.35" />
            </g>

            {/* Band Layer B: Drifting Counter-Current Westward (39s) */}
            <g
              className={styles.animateBandDriftB}
              style={{
                animationDuration: "39s",
                animationDelay: breathingDelay,
              }}
            >
              {/* Tropical Band 2 */}
              <ellipse cx="50" cy="54" rx="58" ry="11" fill={palette.darkSide} opacity="0.5" />
              {/* Southern Temperate Band */}
              <ellipse cx="50" cy="72" rx="52" ry="8" fill={palette.primary} opacity="0.4" />

              {/* Oval Cyclonic Storm / Cloud Eddy */}
              <ellipse
                cx={stormX}
                cy={stormY}
                rx="8"
                ry="5"
                transform={`rotate(-12 ${stormX} ${stormY})`}
                fill={palette.core}
                opacity="0.65"
              />
              <ellipse
                cx={stormX}
                cy={stormY}
                rx="4.5"
                ry="2.5"
                transform={`rotate(-12 ${stormX} ${stormY})`}
                fill="#ffffff"
                opacity="0.75"
              />
            </g>
          </g>
        )}

        {/* 4. Strong Limb Shading / Fresnel Edge */}
        <circle cx="50" cy="50" r="46" fill={`url(#gas-limb-shadow-${identity.conceptId})`} />

        {/* 5. Glowing Atmospheric Rim */}
        <circle
          cx="50"
          cy="50"
          r="45.5"
          fill="none"
          stroke={`url(#gas-rim-${identity.conceptId})`}
          strokeWidth={isFocus ? 2.2 : 1.5}
        />

        {/* 6. Soft Upper-Limb Atmosphere Glow */}
        {!isContext && (
          <ellipse
            cx="34"
            cy="26"
            rx={isFocus ? 14 : 9}
            ry={isFocus ? 7 : 4.5}
            transform="rotate(-20 34 26)"
            fill={palette.core}
            opacity="0.45"
            filter="blur(2px)"
          />
        )}

        {/* 7. Focus Orbital Arc */}
        {isFocus && (
          <ellipse
            cx="50"
            cy="50"
            rx="48.5"
            ry="48.5"
            fill="none"
            stroke={palette.limb}
            strokeWidth="1.2"
            strokeDasharray="12 8"
            opacity="0.75"
          />
        )}
      </svg>
    </div>
  );
};
