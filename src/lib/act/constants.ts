/**
 * Reference constants adapted from the design prototype
 * (`docs/design/design/ACT Practice.dc.html`, lines ~806–929).
 *
 * Stable IDs and reference metadata live here. English display defaults come
 * from the message catalog; views translate by ID with next-intl. Reference
 * content is never stored in the database.
 *
 * Semantics honoured throughout the UI: toward is never "good" and away is never
 * "bad"; away is amber, not red; the flexibility total is never ranked or scored.
 */

import en from "@/i18n/messages/en.json";

/** The five flexibility-check axes, in display order. */
export const AXES = [
  { id: "awareness", ...en.act.axes.awareness },
  { id: "openness", ...en.act.axes.openness },
  { id: "choice", ...en.act.axes.choice },
  { id: "values", ...en.act.axes.values },
  { id: "action", ...en.act.axes.action },
] as const;

/** Status effects — what had hold of behaviour, plus its counter-skill. */
export const STATES = [
  { id: "fusion", ...en.act.states.fusion },
  { id: "avoidance", ...en.act.states.avoidance },
  { id: "autopilot", ...en.act.states.autopilot },
  { id: "selfstory", ...en.act.states.selfstory },
  { id: "drift", ...en.act.states.drift },
  { id: "stuck", ...en.act.states.stuck },
] as const;

/** The six flexibility skills used to unhook. */
export const SKILLS = [
  { id: "notice", ...en.act.skills.notice },
  { id: "defuse", ...en.act.skills.defuse },
  { id: "accept", ...en.act.skills.accept },
  { id: "anchor", ...en.act.skills.anchor },
  { id: "orient", ...en.act.skills.orient },
  { id: "commit", ...en.act.skills.commit },
] as const;

/** The kind of thing that hooked attention. */
export const HOOK_TYPES = [
  { id: "thought", ...en.act.hookTypes.thought },
  { id: "feeling", ...en.act.hookTypes.feeling },
  { id: "urge", ...en.act.hookTypes.urge },
  { id: "memory", ...en.act.hookTypes.memory },
] as const;

/**
 * The eight three-hour time bands. Index 0–7 is what the `episodes.band` column
 * stores; these strings are display-only.
 */
export const BANDS = [
  "00–03",
  "03–06",
  "06–09",
  "09–12",
  "12–15",
  "15–18",
  "18–21",
  "21–00",
] as const;

/**
 * Static matchers used to group recurring hooks on the Progress view. A hook is
 * counted in a group when its text contains any of the group's `match` substrings
 * (case/diacritic-insensitive). This stays a static list for v1 (Known gap).
 */
export const HOOK_GROUPS = [
  {
    id: "0",
    match: ["can't handle", "incompetent", "не справля", "некомпетент"],
    type: "thought",
    ...en.act.hookGroups["0"],
  },
  {
    id: "1",
    match: ["laptop", "close the laptop", "ноутбук"],
    type: "urge",
    ...en.act.hookGroups["1"],
  },
  {
    id: "2",
    match: [
      "ruined",
      "Too late",
      "Not worth starting",
      "испортил",
      "слишком поздно",
      "нет смысла начинать",
    ],
    type: "thought",
    ...en.act.hookGroups["2"],
  },
  {
    id: "3",
    match: ["listening", "не слушает", "не слушают"],
    type: "thought",
    ...en.act.hookGroups["3"],
  },
  {
    id: "4",
    match: ["anger", "злость", "злости", "злостью", "разозлил", "разозлила"],
    type: "feeling",
    ...en.act.hookGroups["4"],
  },
] as const;

/** The five-step, read-only practice loop shown on the reference page. */
export const LOOP_REF = [
  { n: "1", ...en.act.loop["1"] },
  { n: "2", ...en.act.loop["2"] },
  { n: "3", ...en.act.loop["3"] },
  { n: "4", ...en.act.loop["4"] },
  { n: "5", ...en.act.loop["5"] },
] as const;

/** Layered reference library for the Vault. */
export const LIB = {
  "Core map": [
    { ev: "(a/b)", ...en.act.vault["Core map"]["0"] },
    { ev: "(b)", ...en.act.vault["Core map"]["1"] },
    { ev: "(c)", ...en.act.vault["Core map"]["2"] },
  ],
  Concepts: [
    { ev: "(b)", ...en.act.vault.Concepts["0"] },
    { ev: "(a/b)", ...en.act.vault.Concepts["1"] },
    { ev: "frame", ...en.act.vault.Concepts["2"] },
    { ev: "(b/c)", ...en.act.vault.Concepts["3"] },
  ],
  Skills: [
    { ev: "(b)", ...en.act.vault.Skills["0"] },
    { ev: "(b)", ...en.act.vault.Skills["1"] },
    { ev: "(b)", ...en.act.vault.Skills["2"] },
    { ev: "(b)", ...en.act.vault.Skills["3"] },
    { ev: "(b)", ...en.act.vault.Skills["4"] },
    { ev: "(a)", ...en.act.vault.Skills["5"] },
  ],
  Basement: [
    { ev: "frame", ...en.act.vault.Basement["0"] },
    { ev: "(b)", ...en.act.vault.Basement["1"] },
  ],
} as const;

/** The Open / Aware / Engaged macro-process cards. */
export const FLEX_PILLARS = [
  { key: "Open", color: "oklch(0.55 0.13 55)", ...en.act.pillars.Open },
  { key: "Aware", color: "oklch(0.5 0.1 250)", ...en.act.pillars.Aware },
  {
    key: "Engaged",
    color: "oklch(0.48 0.1 158)",
    ...en.act.pillars.Engaged,
  },
] as const;

/** Common misconceptions about psychological flexibility. */
export const FLEX_MYTHS = [
  { ...en.act.myths["0"] },
  { ...en.act.myths["1"] },
  { ...en.act.myths["2"] },
  { ...en.act.myths["3"] },
] as const;

/** The three practice principles for growing flexibility. */
export const FLEX_GROWTH = [
  { n: "1", ...en.act.growth["1"] },
  { n: "2", ...en.act.growth["2"] },
  { n: "3", ...en.act.growth["3"] },
] as const;

export type VaultCategory = keyof typeof LIB;

/** Accent colors (also defined as CSS tokens in `globals.css`). */
export const TOWARD = "oklch(0.5 0.1 158)";
export const AWAY = "oklch(0.62 0.12 50)";

export type AxisKey = (typeof AXES)[number]["id"];
export type StateId = (typeof STATES)[number]["id"];
export type SkillId = (typeof SKILLS)[number]["id"];
export type HookType = (typeof HOOK_TYPES)[number]["id"];

/** Display string for a band index; empty string for an out-of-range index. */
export function bandLabel(index: number): string {
  return BANDS[index] ?? "";
}

/** Human label for a status-effect id, falling back to the first state. */
export function stateLabel(id: string): string {
  return (STATES.find((s) => s.id === id) ?? STATES[0]).label;
}

/** Human label for a skill id, falling back to the first skill. */
export function skillLabel(id: string): string {
  return (SKILLS.find((s) => s.id === id) ?? SKILLS[0]).label;
}
