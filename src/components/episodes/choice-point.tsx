"use client";

import type { EpisodeDir } from "@/lib/act/types";

/**
 * The choice-point beam — the one animated element in the reflection surfaces.
 * Given a direction it tilts (toward rises left, away rises right) and fills the
 * ball(s) for the recorded side(s). Colours come from the theme tokens so the
 * beam reads in both light and dark; the tilt/fill transitions live in
 * `globals.css` and are dropped under `prefers-reduced-motion`.
 *
 * Geometry matches the handoff: viewBox 0 0 340 104, fulcrum at x=170.
 */
export function ChoicePointBeam({
  dir,
  awayLabel,
  towardLabel,
  caption,
}: {
  /** `null` renders the level, idle beam (no direction recorded yet). */
  dir: EpisodeDir | null;
  awayLabel: string;
  towardLabel: string;
  caption: string;
}) {
  const tilt = dir === "toward" ? -9 : dir === "away" ? 9 : 0;
  const awayFill =
    dir === "away" || dir === "mixed" ? "var(--away-muted)" : "var(--muted)";
  const towardFill =
    dir === "toward" || dir === "mixed"
      ? "var(--toward-muted)"
      : "var(--muted)";
  const mono = "var(--font-mono), ui-monospace, monospace";
  return (
    <svg
      width={340}
      height={104}
      viewBox="0 0 340 104"
      aria-hidden="true"
      style={{ maxWidth: "100%" }}
    >
      <line
        x1={170}
        y1={40}
        x2={170}
        y2={86}
        stroke="var(--border)"
        strokeWidth={2}
      />
      <line
        x1={138}
        y1={86}
        x2={202}
        y2={86}
        stroke="var(--border)"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <text
        x={170}
        y={100}
        textAnchor="middle"
        fontSize={9.5}
        fontFamily={mono}
        letterSpacing={1.4}
        fill="var(--muted-foreground)"
      >
        {caption}
      </text>
      <g className="choice-beam-rot" transform={`rotate(${tilt} 170 40)`}>
        <line
          x1={30}
          y1={40}
          x2={310}
          y2={40}
          stroke="var(--foreground)"
          strokeOpacity={0.72}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <circle
          className="choice-beam-ball"
          cx={30}
          cy={40}
          r={15}
          fill={awayFill}
        />
        <circle
          className="choice-beam-ball"
          cx={310}
          cy={40}
          r={15}
          fill={towardFill}
        />
        <text
          x={30}
          y={16}
          textAnchor="middle"
          fontSize={9.5}
          fontFamily={mono}
          letterSpacing={1.4}
          fill="var(--muted-foreground)"
        >
          {awayLabel}
        </text>
        <text
          x={310}
          y={16}
          textAnchor="middle"
          fontSize={9.5}
          fontFamily={mono}
          letterSpacing={1.4}
          fill="var(--muted-foreground)"
        >
          {towardLabel}
        </text>
      </g>
    </svg>
  );
}

/** The note line beneath the beam. Copy differs by selection and surface. */
export function choicePointNoteKey(
  dir: EpisodeDir | null,
  variant: "modal" | "explore",
): string {
  switch (dir) {
    case "toward":
      return "choicePoint.toward";
    case "away":
      return "choicePoint.away";
    case "mixed":
      return `choicePoint.mixed.${variant}`;
    case "unknown":
      return `choicePoint.unknown.${variant}`;
    default:
      return "choicePoint.none";
  }
}
