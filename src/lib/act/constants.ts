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

/**
 * The kind of experience noticed. A10 adds bodily sensation and other/several;
 * labels are the six `actV2.ui.experienceTypes` leaves the design draws.
 */
export const HOOK_TYPES = [
  { id: "thought", label: en.actV2.ui.experienceTypes.thought },
  { id: "feeling", label: en.actV2.ui.experienceTypes.feeling },
  { id: "urge", label: en.actV2.ui.experienceTypes.urge },
  { id: "memory", label: en.actV2.ui.experienceTypes.memory },
  { id: "sensation", label: en.actV2.ui.experienceTypes.sensation },
  { id: "other", label: en.actV2.ui.experienceTypes.other },
] as const;

/**
 * The four life domains a personal value can belong to. The order is fixed and
 * display-only — domains are never ranked, scored or "completed", and an empty
 * domain is not a gap. These ids are distinct from `AXES`, pillars and `BANDS`.
 */
export const DOMAINS = [
  { id: "relationships", ...en.act.domains.relationships },
  { id: "work_education", ...en.act.domains.work_education },
  { id: "personal_growth_health", ...en.act.domains.personal_growth_health },
  { id: "leisure", ...en.act.domains.leisure },
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

export const LOOP_REF = [
  { n: "1", ...en.act.loop["1"] },
  { n: "2", ...en.act.loop["2"] },
  { n: "3", ...en.act.loop["3"] },
  { n: "4", ...en.act.loop["4"] },
  { n: "5", ...en.act.loop["5"] },
] as const;

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

/** Accent colors (also defined as CSS tokens in `globals.css`). */
export const TOWARD = "oklch(0.5 0.1 158)";
export const AWAY = "oklch(0.62 0.12 50)";

export type AxisKey = (typeof AXES)[number]["id"];
/** `none` records an explicit absence without adding a reference effect or skill. */
export type StateId = (typeof STATES)[number]["id"] | "none";
export type SkillId = (typeof SKILLS)[number]["id"] | "none";
export type HookType = (typeof HOOK_TYPES)[number]["id"];
export type DomainId = (typeof DOMAINS)[number]["id"];

/** Display string for a band index; empty string for an out-of-range index. */
export function bandLabel(index: number): string {
  return BANDS[index] ?? "";
}

/** Human label for a status-effect id, falling back to the first state. */
export function stateLabel(id: string): string {
  if (id === "none") return en.act.states.none.label;
  return (STATES.find((s) => s.id === id) ?? STATES[0]).label;
}

/** Human label for a domain id, falling back to the first domain. */
export function domainLabel(id: string): string {
  return (DOMAINS.find((d) => d.id === id) ?? DOMAINS[0]).label;
}

/** Human label for a skill id, falling back to the first skill. */
export function skillLabel(id: string): string {
  if (id === "none") return en.act.skills.none.label;
  return (SKILLS.find((s) => s.id === id) ?? SKILLS[0]).label;
}
