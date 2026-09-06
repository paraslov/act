import type en from "@/i18n/messages/en.json";
import { type AxisKey, FLEX_PILLARS } from "@/lib/act/constants";
import type { VaultCardId } from "@/lib/reference/vault";

export type MapNode = {
  label:
    | `referenceNodes.${keyof typeof en.act.referenceNodes}`
    | `skills.${"notice" | "defuse" | "orient"}.label`
    | "vault.Concepts.2.t";
  card: VaultCardId;
};

type PillarNodes = {
  model: readonly MapNode[];
  stuck: readonly MapNode[];
  skills: readonly MapNode[];
  metrics: readonly AxisKey[];
};

const nodes = {
  Open: {
    model: [
      { label: "referenceNodes.acceptance", card: "accept-make-room" },
      { label: "referenceNodes.defusion", card: "defuse" },
    ],
    stuck: [
      { label: "referenceNodes.avoidance", card: "experiential-avoidance" },
      { label: "referenceNodes.fusion", card: "cognitive-fusion" },
    ],
    skills: [
      { label: "referenceNodes.accept", card: "accept-make-room" },
      { label: "skills.defuse.label", card: "defuse" },
    ],
    metrics: ["openness"],
  },
  Aware: {
    model: [
      { label: "referenceNodes.present", card: "notice" },
      { label: "referenceNodes.self", card: "self-as-context" },
    ],
    stuck: [
      { label: "referenceNodes.autopilot", card: "notice" },
      { label: "referenceNodes.selfContent", card: "self-as-context" },
    ],
    skills: [
      { label: "skills.notice.label", card: "notice" },
      { label: "referenceNodes.anchor", card: "anchor-return" },
    ],
    metrics: ["awareness", "choice"],
  },
  Engaged: {
    model: [
      { label: "referenceNodes.values", card: "orient-to-values" },
      { label: "referenceNodes.commit", card: "committed-action" },
    ],
    stuck: [
      { label: "referenceNodes.drift", card: "orient-to-values" },
      { label: "referenceNodes.stuck", card: "workability" },
    ],
    skills: [
      { label: "skills.orient.label", card: "orient-to-values" },
      { label: "referenceNodes.commit", card: "committed-action" },
    ],
    metrics: ["values", "action"],
  },
} as const satisfies Record<(typeof FLEX_PILLARS)[number]["key"], PillarNodes>;

export const MAP_PILLARS = FLEX_PILLARS.map((pillar) => ({
  ...pillar,
  ...nodes[pillar.key],
  // The handoff deliberately uses a shorter Engaged question on the map.
  question: `pillars.${pillar.key}.${pillar.key === "Engaged" ? "mapAsk" : "ask"}`,
}));

export const MAP_BASEMENT = [
  { label: "referenceNodes.contextualism", card: "functional-contextualism" },
  { label: "referenceNodes.rft", card: "rft-rule-governed-behaviour" },
  { label: "referenceNodes.rules", card: "rft-rule-governed-behaviour" },
  { label: "vault.Concepts.2.t", card: "workability" },
] as const satisfies readonly MapNode[];

export const MAP_CHOICE = {
  point: "choice-point",
  away: "experiential-avoidance",
  toward: "committed-action",
} as const satisfies Record<string, VaultCardId>;
