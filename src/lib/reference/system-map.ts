import type { AxisKey } from "@/lib/act/constants";
import type { VaultCardId } from "@/lib/reference/vault";

export type MapPillarKey = "Open" | "Aware" | "Engaged";

/**
 * Every card-linking node carries a stable library ID, not an English label.
 * `satisfies readonly VaultCardId[]` is the forcing function: a node pointing at
 * a card the registry no longer defines fails typecheck. Node labels and the band
 * headings are resolved from `actV2.cards.<id>.title` / `actV2.ui.map` in the view.
 */
type PillarNodes = {
  process: readonly VaultCardId[];
  patterns: readonly VaultCardId[];
  practices: readonly VaultCardId[];
  reflection: readonly AxisKey[];
};

const nodes = {
  Open: {
    process: ["acceptance", "cognitive-defusion"],
    patterns: ["experiential-avoidance", "cognitive-fusion"],
    practices: ["accept-make-room", "defuse"],
    reflection: ["openness"],
  },
  Aware: {
    process: ["present-moment", "self-as-context"],
    patterns: ["inflexible-attention", "self-as-content"],
    // perspective-taking is the new practice added alongside the 25 migrated links.
    practices: ["notice", "anchor-return", "perspective-taking"],
    reflection: ["awareness", "choice"],
  },
  Engaged: {
    process: ["values", "committed-action"],
    patterns: ["values-disconnection", "inflexible-action"],
    practices: ["orient-to-values", "small-step"],
    reflection: ["values", "action"],
  },
} as const satisfies Record<MapPillarKey, PillarNodes>;

export const MAP_PILLARS = (["Open", "Aware", "Engaged"] as const).map(
  (key) => ({
    key,
    ...nodes[key],
  }),
);

/** The bands that link to library cards; reflection prompts anchor into app-checks. */
export const MAP_CARD_BANDS = ["process", "patterns", "practices"] as const;
export type MapCardBand = (typeof MAP_CARD_BANDS)[number];

export const MAP_BASEMENT = [
  "functional-contextualism",
  "relational-frame-theory",
  "rule-governed-behaviour",
  "workability",
] as const satisfies readonly VaultCardId[];

export const MAP_CHOICE = {
  point: "choice-point",
  away: "away-move",
  toward: "toward-move",
} as const satisfies Record<string, VaultCardId>;

/**
 * The five operations plus a later review step. Each links to its own anchor on
 * The loop; titles and questions come from `actV2.ui.loop`.
 */
export const MAP_LOOP = [
  "notice",
  "open",
  "orient",
  "choose",
  "act",
  "review",
] as const;
export type MapLoopStep = (typeof MAP_LOOP)[number];
