import type { SkillId, StateId } from "@/lib/act/constants";

/**
 * ACT v2 reference metadata, validated against the audit manifest in library.test.ts.
 * Only display metadata belongs here; editorial status and review fields stay in
 * the audit. Localized card text lives at actV2.cards.<id> in both catalogs.
 * Existing views keep using the v1 registry until their own migration phases.
 */
export const LIBRARY_CATEGORIES = [
  "core",
  "processes",
  "patterns",
  "practices",
  "theory",
  "guides",
] as const;
export type LibraryCategory = (typeof LIBRARY_CATEGORIES)[number];

export type LibraryContentType =
  | "model"
  | "concept"
  | "practice"
  | "theory"
  | "app-guide";

/** Original publication titles; background reading, not efficacy grades. */
export const SOURCES = {
  "acbs-processes": {
    title: "ACBS: The Six Core Processes of ACT",
    url: "https://contextualscience.org/six_core_processes_act",
  },
  "acbs-about": {
    title: "ACBS: About ACT",
    url: "https://contextualscience.org/about_act",
  },
  "harris-choice-point": {
    title: "Russ Harris: Choice Point 2.0 overview",
    url: "https://www.actmindfully.com.au/wp-content/uploads/2018/06/Choice_Point_2.0_A_Brief_Overview_-_Russ_Harris_April_2017.pdf",
  },
  "harris-functional-analysis": {
    title: "Russ Harris: Using Choice Point for Functional Analysis",
    url: "https://www.actmindfully.com.au/wp-content/uploads/2018/06/Using-The-Choice-Point-2-For-Functional-Analysis-Motivation-Acceptance.pdf",
  },
  "harris-three-groups": {
    title: "Russ Harris: ACT Made Simple, chapter 1",
    url: "https://www.actmindfully.com.au/wp-content/uploads/2019/05/Chapter-1-of-2nd-edition-ACT-MAde-Simple.pdf",
  },
  "acbs-contextualism": {
    title: "ACBS: Functional Contextualism",
    url: "https://contextualscience.org/functional_contextualism",
  },
  "acbs-rft": {
    title: "ACBS: RFT Basics",
    url: "https://contextualscience.org/rft_basics_what_rft",
  },
  "acbs-compact": {
    title: "CompACT: Developer Materials",
    url: "https://contextualscience.org/comprehensive_assessment_acceptance_commitment_therapy_processes_compact",
  },
  "who-self-help": {
    title: "WHO: Doing What Matters in Times of Stress",
    url: "https://www.who.int/publications/i/item/9789240003927",
  },
  "harris-resources": {
    title: "Russ Harris: Worksheets and Practice Resources",
    url: "https://www.actmindfully.com.au/free-stuff/extra-bits-ebooks-worksheets-and-handouts/",
  },
} as const satisfies Record<
  string,
  { readonly title: string; readonly url: string }
>;
export type LibrarySourceId = keyof typeof SOURCES;

const cardDefinitions = [
  {
    id: "psychological-flexibility",
    category: "core",
    contentType: "concept",
    relatedIds: ["open-aware-engaged", "workability", "choice-point"],
    sourceIds: ["acbs-processes"],
  },
  {
    id: "open-aware-engaged",
    category: "core",
    contentType: "concept",
    relatedIds: ["acceptance", "present-moment", "values"],
    sourceIds: ["harris-three-groups"],
  },
  {
    id: "choice-point",
    category: "core",
    contentType: "concept",
    relatedIds: ["toward-move", "away-move", "functional-analysis"],
    sourceIds: ["harris-choice-point"],
  },
  {
    id: "toward-move",
    category: "core",
    contentType: "concept",
    relatedIds: ["values", "committed-action", "workability"],
    sourceIds: ["harris-choice-point"],
  },
  {
    id: "away-move",
    category: "core",
    contentType: "concept",
    relatedIds: [
      "experiential-avoidance",
      "workability",
      "returning-to-practice",
    ],
    sourceIds: ["harris-choice-point"],
  },
  {
    id: "workability",
    category: "core",
    contentType: "concept",
    relatedIds: [
      "functional-analysis",
      "functional-contextualism",
      "values-conflict",
    ],
    sourceIds: ["harris-functional-analysis"],
  },
  {
    id: "acceptance",
    category: "processes",
    contentType: "model",
    relatedIds: ["accept-make-room", "willingness", "experiential-avoidance"],
    sourceIds: ["acbs-processes"],
  },
  {
    id: "cognitive-defusion",
    category: "processes",
    contentType: "model",
    relatedIds: ["cognitive-fusion", "defuse", "rule-governed-behaviour"],
    sourceIds: ["acbs-processes"],
  },
  {
    id: "present-moment",
    category: "processes",
    contentType: "model",
    relatedIds: ["notice", "anchor-return", "inflexible-attention"],
    sourceIds: ["acbs-processes"],
  },
  {
    id: "self-as-context",
    category: "processes",
    contentType: "model",
    relatedIds: ["self-as-content", "perspective-taking", "present-moment"],
    sourceIds: ["acbs-processes"],
  },
  {
    id: "values",
    category: "processes",
    contentType: "model",
    relatedIds: ["orient-to-values", "values-conflict", "values-disconnection"],
    sourceIds: ["acbs-processes"],
  },
  {
    id: "committed-action",
    category: "processes",
    contentType: "model",
    relatedIds: ["small-step", "workability", "inflexible-action"],
    sourceIds: ["acbs-processes"],
  },
  {
    id: "cognitive-fusion",
    category: "patterns",
    contentType: "concept",
    relatedIds: ["cognitive-defusion", "defuse", "rule-governed-behaviour"],
    sourceIds: ["acbs-processes"],
  },
  {
    id: "experiential-avoidance",
    category: "patterns",
    contentType: "concept",
    relatedIds: ["acceptance", "control-agenda", "functional-analysis"],
    sourceIds: ["acbs-processes"],
  },
  {
    id: "inflexible-attention",
    category: "patterns",
    contentType: "concept",
    relatedIds: ["present-moment", "notice", "anchor-return"],
    sourceIds: ["acbs-processes"],
  },
  {
    id: "self-as-content",
    category: "patterns",
    contentType: "concept",
    relatedIds: ["self-as-context", "perspective-taking", "cognitive-fusion"],
    sourceIds: ["acbs-processes"],
  },
  {
    id: "values-disconnection",
    category: "patterns",
    contentType: "concept",
    relatedIds: ["values", "orient-to-values", "values-conflict"],
    sourceIds: ["acbs-processes"],
  },
  {
    id: "inflexible-action",
    category: "patterns",
    contentType: "concept",
    relatedIds: ["committed-action", "small-step", "functional-analysis"],
    sourceIds: ["acbs-processes"],
  },
  {
    id: "notice",
    category: "practices",
    contentType: "practice",
    relatedIds: ["present-moment", "inflexible-attention", "choice-point"],
    sourceIds: ["acbs-processes"],
  },
  {
    id: "defuse",
    category: "practices",
    contentType: "practice",
    relatedIds: ["cognitive-defusion", "cognitive-fusion", "workability"],
    sourceIds: ["acbs-processes"],
  },
  {
    id: "accept-make-room",
    category: "practices",
    contentType: "practice",
    relatedIds: ["acceptance", "willingness", "practice-limits"],
    sourceIds: ["acbs-processes"],
  },
  {
    id: "anchor-return",
    category: "practices",
    contentType: "practice",
    relatedIds: ["present-moment", "notice", "practice-limits"],
    sourceIds: ["harris-resources"],
  },
  {
    id: "orient-to-values",
    category: "practices",
    contentType: "practice",
    relatedIds: ["values", "values-conflict", "small-step"],
    sourceIds: ["acbs-processes"],
  },
  {
    id: "perspective-taking",
    category: "practices",
    contentType: "practice",
    relatedIds: ["self-as-context", "self-as-content", "anchor-return"],
    sourceIds: ["acbs-processes"],
  },
  {
    id: "small-step",
    category: "practices",
    contentType: "practice",
    relatedIds: [
      "committed-action",
      "functional-analysis",
      "returning-to-practice",
    ],
    sourceIds: ["acbs-processes"],
  },
  {
    id: "functional-contextualism",
    category: "theory",
    contentType: "theory",
    relatedIds: [
      "functional-analysis",
      "workability",
      "relational-frame-theory",
    ],
    sourceIds: ["acbs-contextualism"],
  },
  {
    id: "relational-frame-theory",
    category: "theory",
    contentType: "theory",
    relatedIds: ["rule-governed-behaviour", "cognitive-fusion", "values"],
    sourceIds: ["acbs-rft"],
  },
  {
    id: "rule-governed-behaviour",
    category: "theory",
    contentType: "theory",
    relatedIds: ["relational-frame-theory", "cognitive-fusion", "workability"],
    sourceIds: ["acbs-rft"],
  },
  {
    id: "functional-analysis",
    category: "theory",
    contentType: "practice",
    relatedIds: ["workability", "small-step", "experiential-avoidance"],
    sourceIds: ["harris-functional-analysis"],
  },
  {
    id: "control-agenda",
    category: "theory",
    contentType: "concept",
    relatedIds: ["experiential-avoidance", "acceptance", "willingness"],
    sourceIds: ["harris-functional-analysis"],
  },
  {
    id: "willingness",
    category: "theory",
    contentType: "concept",
    relatedIds: ["acceptance", "small-step", "practice-limits"],
    sourceIds: ["acbs-processes"],
  },
  {
    id: "self-compassion",
    category: "guides",
    contentType: "practice",
    relatedIds: ["returning-to-practice", "values", "practice-limits"],
    sourceIds: ["who-self-help"],
  },
  {
    id: "values-conflict",
    category: "guides",
    contentType: "concept",
    relatedIds: ["values", "workability", "small-step"],
    sourceIds: ["acbs-processes"],
  },
  {
    id: "practice-limits",
    category: "guides",
    contentType: "app-guide",
    relatedIds: ["anchor-return", "willingness", "self-compassion"],
    sourceIds: ["who-self-help"],
  },
  {
    id: "app-checks",
    category: "guides",
    contentType: "app-guide",
    relatedIds: [
      "psychological-flexibility",
      "functional-analysis",
      "returning-to-practice",
    ],
    sourceIds: ["acbs-compact"],
  },
  {
    id: "returning-to-practice",
    category: "guides",
    contentType: "practice",
    relatedIds: ["self-compassion", "small-step", "app-checks"],
    sourceIds: ["acbs-about"],
  },
] as const;

export type LibraryCardId = (typeof cardDefinitions)[number]["id"];
export type LibraryCard = {
  readonly id: LibraryCardId;
  readonly category: LibraryCategory;
  readonly contentType: LibraryContentType;
  readonly relatedIds: readonly LibraryCardId[];
  readonly sourceIds: readonly LibrarySourceId[];
};

// Derive IDs from the definitions, then validate references against that union.
// A misspelled related ID or source ID must fail typecheck, not just a fixture test.
export const LIBRARY_CARDS = cardDefinitions satisfies readonly LibraryCard[];

export const aliases = {
  "rft-rule-governed-behaviour": "rule-governed-behaviour",
} as const satisfies Record<string, LibraryCardId>;

export const legacyTitleAliases = {
  "Psychological Flexibility": "psychological-flexibility",
  "Open / Aware / Engaged": "open-aware-engaged",
  "Choice Point": "choice-point",
  "Cognitive Fusion": "cognitive-fusion",
  "Experiential Avoidance": "experiential-avoidance",
  Workability: "workability",
  "Self-as-Context": "self-as-context",
  Notice: "notice",
  Defuse: "defuse",
  "Accept / Make room": "accept-make-room",
  "Anchor / Return": "anchor-return",
  "Orient to values": "orient-to-values",
  "Committed Action": "committed-action",
  "Functional Contextualism": "functional-contextualism",
  "RFT & rule-governed behaviour": "rule-governed-behaviour",
} as const satisfies Record<string, LibraryCardId | keyof typeof aliases>;

/** Title compatibility first, then stable-ID aliases, then the card's own category. */
export function resolveLibraryCard(value: string): LibraryCard | undefined {
  const titleId = Object.hasOwn(legacyTitleAliases, value)
    ? legacyTitleAliases[value as keyof typeof legacyTitleAliases]
    : value;
  const id = Object.hasOwn(aliases, titleId)
    ? aliases[titleId as keyof typeof aliases]
    : titleId;
  return LIBRARY_CARDS.find((card) => card.id === id);
}

/** Explanation links only. The historical `none` sentinel has no concept card. */
export const STATE_CARD_IDS = {
  fusion: "cognitive-fusion",
  avoidance: "experiential-avoidance",
  autopilot: "inflexible-attention",
  selfstory: "self-as-content",
  drift: "values-disconnection",
  stuck: "inflexible-action",
} as const satisfies Record<Exclude<StateId, "none">, LibraryCardId>;

/**
 * `commit` stays unchanged in storage and never implies an episode direction.
 * Its future chip uses small-step's title, "A Workable Next Step", distinct from
 * the Committed Action process. Perspective-taking is a card, not a seventh skill.
 */
export const SKILL_CARD_IDS = {
  notice: "notice",
  defuse: "defuse",
  accept: "accept-make-room",
  anchor: "anchor-return",
  orient: "orient-to-values",
  commit: "small-step",
} as const satisfies Record<Exclude<SkillId, "none">, LibraryCardId>;
