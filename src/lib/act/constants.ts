/**
 * Reference constants ported verbatim from the design prototype
 * (`docs/design/design/ACT Practice.dc.html`, lines ~806–929).
 *
 * These carry therapeutic framing and are English-final for v1. They are kept as
 * objects (id + label + description/prompt) rather than tuples so a locale-keyed
 * `ru` variant can be slotted in later without a rewrite. Reference data is NOT
 * stored in the database. Phase-3 reference data (LOOP_REF, LIB, FLEX_*) is added
 * in Step 11.
 *
 * Semantics honoured throughout the UI: toward is never "good" and away is never
 * "bad"; away is amber, not red; the flexibility total is never ranked or scored.
 */

/** The five flexibility-check axes, in display order. */
export const AXES = [
  {
    id: "awareness",
    label: "Awareness",
    prompt: "I noticed what was happening",
  },
  {
    id: "openness",
    label: "Openness",
    prompt: "I didn't spend everything fighting it",
  },
  { id: "choice", label: "Choice", prompt: "I made a pause before acting" },
  { id: "values", label: "Values", prompt: "I remembered what mattered" },
  { id: "action", label: "Action", prompt: "My action matched it" },
] as const;

/** Status effects — what had hold of behaviour, plus its counter-skill. */
export const STATES = [
  {
    id: "fusion",
    label: "Cognitive Fusion",
    description:
      "The question isn't “do I believe it 100%?” but “how much is this thought steering my behaviour right now?” Counter-skill: Defuse.",
  },
  {
    id: "avoidance",
    label: "Experiential Avoidance",
    description:
      "Avoidance isn't automatically bad — leaving a fight is great. ACT asks about its function and its price here. Counter-skill: Accept.",
  },
  {
    id: "autopilot",
    label: "Autopilot / past-future pull",
    description:
      "Reacting before any choice was made; attention living in rehearsal or replay. Counter-skill: Notice / Anchor.",
  },
  {
    id: "selfstory",
    label: "Conceptualized Self",
    description:
      "“I'm the kind of person who…” collapsing you into the content of a story. Counter-skill: notice the noticer.",
  },
  {
    id: "drift",
    label: "Values drift",
    description:
      "The direction went out of sight, so any action looked equally fine. Counter-skill: Orient.",
  },
  {
    id: "stuck",
    label: "Inaction or impulsive action",
    description:
      "Either frozen or fired off — the gap between hook and behaviour vanished. Counter-skill: Committed Action.",
  },
] as const;

/** The six flexibility skills used to unhook. */
export const SKILLS = [
  { id: "notice", label: "Notice" },
  { id: "defuse", label: "Defuse" },
  { id: "accept", label: "Accept / Make room" },
  { id: "anchor", label: "Anchor / Return" },
  { id: "orient", label: "Orient to values" },
  { id: "commit", label: "Committed Action" },
] as const;

/** The kind of thing that hooked attention. */
export const HOOK_TYPES = [
  { id: "thought", label: "Thought" },
  { id: "feeling", label: "Feeling" },
  { id: "urge", label: "Urge" },
  { id: "memory", label: "Memory" },
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
    label: "“They'll see I can't handle it” — the competence story",
    match: ["can't handle", "incompetent"],
    type: "thought",
  },
  {
    label: "Urge to shut the laptop when it gets boring",
    match: ["laptop", "close the laptop"],
    type: "urge",
  },
  {
    label: "“Already ruined it, might as well” — all-or-nothing",
    match: ["ruined", "Too late", "Not worth starting"],
    type: "thought",
  },
  {
    label: "“She's not even listening to me”",
    match: ["listening"],
    type: "thought",
  },
  {
    label: "Flash of anger at public criticism",
    match: ["anger"],
    type: "feeling",
  },
] as const;

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
