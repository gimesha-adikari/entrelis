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

export const RockyBody: React.FC<BodyProps> = ({ identity, role, size, isHovered }) => {
  const { palette, seed, rotationDuration, rotationDelay, breathingDuration, breathingDelay } =
    identity;
  const isFocus = role === "focus";
  const isContext = role === "context";

  // Pseudo-random coordinates for continental ridges & craters from seed
  const r1 = (seed % 17) - 8;
  const r2 = ((seed >> 4) % 19) - 9;
  const r3 = ((seed >> 8) % 13) - 6;

  const coronaSize = isFocus ? size * 1.8 : isHovered ? size * 1.5 : size * 1.3;

  return (
    <div
      className={styles.celestialBodyWrapper}
      style={{
        width: size,
        height: size,
      }}
    >
      {/* 1. Subtle Outer Atmospheric Haze */}
      <div
        className={`${styles.coronaLayer} ${isFocus ? styles.animateBreath : ""}`}
        style={{
          width: coronaSize,
          height: coronaSize,
          background: `radial-gradient(circle, ${palette.corona} 0%, ${palette.corona.replace("0.38", "0.10")} 40%, rgba(0,0,0,0) 65%)`,
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
          <clipPath id={`rocky-clip-${identity.conceptId}`}>
            <circle cx="50" cy="50" r="46" />
          </clipPath>

          {/* 3D Spherical Day/Night Gradient */}
          <radialGradient
            id={`rocky-base-${identity.conceptId}`}
            cx="34%"
            cy="30%"
            r="65%"
            fx="30%"
            fy="26%"
          >
            <stop offset="0%" stopColor={palette.core} stopOpacity="1" />
            <stop offset="35%" stopColor={palette.primary} stopOpacity="1" />
            <stop offset="70%" stopColor={palette.secondary} stopOpacity="1" />
            <stop offset="100%" stopColor={palette.darkSide} stopOpacity="1" />
          </radialGradient>

          {/* Terminator Shadow Gradient */}
          <radialGradient id={`rocky-terminator-${identity.conceptId}`} cx="72%" cy="70%" r="62%">
            <stop offset="0%" stopColor="#02040a" stopOpacity="0.94" />
            <stop offset="45%" stopColor="#050a14" stopOpacity="0.75" />
            <stop offset="75%" stopColor="#0b1329" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0b1329" stopOpacity="0" />
          </radialGradient>

          {/* Rim Light / Atmospheric Edge */}
          <linearGradient
            id={`rocky-rim-${identity.conceptId}`}
            x1="20%"
            y1="15%"
            x2="85%"
            y2="85%"
          >
            <stop offset="0%" stopColor={palette.limb} stopOpacity="0.95" />
            <stop offset="45%" stopColor={palette.primary} stopOpacity="0.4" />
            <stop offset="85%" stopColor="#000000" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* 2. Base Spherical Body */}
        <circle cx="50" cy="50" r="46" fill={`url(#rocky-base-${identity.conceptId})`} />

        {/* 3. Irregular Procedural Surface Texture & Continental Ridges (Clipped) */}
        {!isContext && (
          <g clipPath={`url(#rocky-clip-${identity.conceptId})`}>
            {/* Drifting surface texture layer */}
            <g
              className={styles.animateSurfaceDrift}
              style={{
                animationDuration: rotationDuration,
                animationDelay: rotationDelay,
              }}
            >
              {/* Equatorial continental plate A */}
              <path
                d={`M 15 ${42 + r1} Q 32 ${36 + r2} 55 ${44 + r3} T 95 ${38 + r1} L 95 62 Q 68 68 45 60 T 15 65 Z`}
                fill={palette.secondary}
                opacity="0.55"
              />
              {/* Polar highland B */}
              <path
                d={`M 25 ${22 + r2} Q 50 ${18 + r3} 75 ${24 + r1} L 80 32 Q 52 28 30 35 Z`}
                fill={palette.primary}
                opacity="0.45"
              />
              {/* Southern basin C */}
              <path
                d={`M 20 ${70 + r3} Q 48 ${66 + r1} 80 ${72 + r2} L 75 82 Q 45 80 25 84 Z`}
                fill={palette.darkSide}
                opacity="0.6"
              />
              {/* Surface Impact Crater Features */}
              <circle cx={42 + r1} cy={35 + r2} r="5" fill={palette.secondary} opacity="0.6" />
              <circle cx={41 + r1} cy={34 + r2} r="3" fill={palette.primary} opacity="0.8" />
              <circle cx={68 + r3} cy={52 + r1} r="7" fill={palette.darkSide} opacity="0.7" />
              <circle cx={67 + r3} cy={51 + r1} r="4" fill={palette.secondary} opacity="0.6" />
            </g>
          </g>
        )}

        {/* 4. Terminator / Dark Hemisphere Shadow */}
        <circle cx="50" cy="50" r="46" fill={`url(#rocky-terminator-${identity.conceptId})`} />

        {/* 5. Sharp Luminous Rim Light / Atmospheric Edge */}
        <circle
          cx="50"
          cy="50"
          r="45.5"
          fill="none"
          stroke={`url(#rocky-rim-${identity.conceptId})`}
          strokeWidth={isFocus ? 2.5 : 1.8}
        />

        {/* 6. Specular Highlight (Upper Left Key Light) */}
        {!isContext && (
          <ellipse
            cx="32"
            cy="28"
            rx={isFocus ? 6 : 4}
            ry={isFocus ? 4 : 2.5}
            transform="rotate(-25 32 28)"
            fill="#ffffff"
            opacity={isFocus ? 0.75 : 0.6}
            filter="blur(1px)"
          />
        )}

        {/* 7. Focus Orbital Arc Treatment */}
        {isFocus && (
          <ellipse
            cx="50"
            cy="50"
            rx="48.5"
            ry="48.5"
            fill="none"
            stroke={palette.limb}
            strokeWidth="1.2"
            strokeDasharray="16 12"
            opacity="0.75"
          />
        )}
      </svg>
    </div>
  );
};
