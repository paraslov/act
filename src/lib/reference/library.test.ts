import { describe, expect, it } from "vitest";
import en from "@/i18n/messages/en.json";
import ru from "@/i18n/messages/ru.json";
import { SKILLS, STATES } from "@/lib/act/constants";
// Display-metadata snapshot of the audit manifest. The original audit folder
// deliberately stays untracked; this fixture keeps clean-checkout tests runnable.
import manifest from "../../../tests/fixtures/act-v2-library-manifest.json";
import {
  aliases,
  LIBRARY_CARDS,
  LIBRARY_CATEGORIES,
  legacyTitleAliases,
  resolveLibraryCard,
  SKILL_CARD_IDS,
  SOURCES,
  STATE_CARD_IDS,
} from "./library";

describe("ACT v2 library registry", () => {
  it("matches all 36 manifest cards and their display metadata", () => {
    expect(LIBRARY_CARDS).toHaveLength(36);
    expect(new Set(LIBRARY_CARDS.map((card) => card.id)).size).toBe(36);
    expect(LIBRARY_CATEGORIES).toEqual(manifest.categories);
    expect(LIBRARY_CARDS).toEqual(
      manifest.cards.map(
        ({ id, category, contentType, relatedIds, sourceIds }) => ({
          id,
          category,
          contentType,
          relatedIds,
          sourceIds,
        }),
      ),
    );
    for (const card of LIBRARY_CARDS) {
      expect(card.id).toMatch(/^[a-z]+(?:-[a-z]+)*$/);
    }
  });

  it("resolves all 108 related-card links", () => {
    const relatedIds = LIBRARY_CARDS.flatMap((card) => [...card.relatedIds]);
    expect(relatedIds).toHaveLength(108);
    for (const id of relatedIds) {
      expect(resolveLibraryCard(id)?.id, id).toBe(id);
    }
  });

  it("provides a destination for all 25 planned System Map mappings", () => {
    expect(manifest.systemMapMappings).toHaveLength(25);
    for (const { label, cardId } of manifest.systemMapMappings) {
      expect(resolveLibraryCard(cardId)?.id, label).toBe(cardId);
    }
  });

  it("provides all seven text leaves for every card in both locales", () => {
    const leaves = [
      "title",
      "short",
      "practice",
      "example",
      "deep",
      "pitfall",
      "reflection",
    ].sort();
    for (const [locale, messages] of Object.entries({ en, ru })) {
      expect(Object.keys(messages.actV2.cards).sort()).toEqual(
        LIBRARY_CARDS.map((card) => card.id).sort(),
      );
      for (const { id } of LIBRARY_CARDS) {
        const copy = messages.actV2.cards[id];
        expect(Object.keys(copy).sort(), `${locale}.${id}`).toEqual(leaves);
        for (const [key, text] of Object.entries(copy)) {
          expect(text.trim(), `${locale}.${id}.${key}`).not.toBe("");
        }
      }
    }
  });

  it("preserves the ten source publications and resolves every source ID", () => {
    expect(Object.keys(SOURCES)).toHaveLength(10);
    expect(SOURCES).toEqual(manifest.sources);
    for (const { sourceIds } of LIBRARY_CARDS) {
      for (const id of sourceIds) {
        expect(SOURCES[id].title.trim(), id).not.toBe("");
        expect(new URL(SOURCES[id].url).protocol, id).toBe("https:");
      }
    }
  });

  it("resolves all 15 legacy titles and stable-ID aliases to the owning category", () => {
    expect(Object.keys(legacyTitleAliases)).toHaveLength(15);
    expect(legacyTitleAliases).toEqual(manifest.legacyTitleAliases);
    expect(aliases).toEqual(manifest.aliases);
    for (const [alias, id] of Object.entries({
      ...legacyTitleAliases,
      ...aliases,
    })) {
      const expected = manifest.cards.find((card) => card.id === id);
      expect(expected, alias).toBeDefined();
      expect(resolveLibraryCard(alias), alias).toMatchObject({
        id,
        category: expected?.category,
      });
    }
    expect(resolveLibraryCard("Committed Action")?.id).toBe("committed-action");
    expect(resolveLibraryCard("RFT & rule-governed behaviour")?.id).toBe(
      "rule-governed-behaviour",
    );
  });

  it.each(["missing-card", "", "__proto__", "constructor", "toString"])(
    "does not invent a card for %j",
    (value) => {
      expect(resolveLibraryCard(value)).toBeUndefined();
    },
  );

  it("maps all six stored states to the corresponding patterns", () => {
    expect(STATE_CARD_IDS).toEqual({
      fusion: "cognitive-fusion",
      avoidance: "experiential-avoidance",
      autopilot: "inflexible-attention",
      selfstory: "self-as-content",
      drift: "values-disconnection",
      stuck: "inflexible-action",
    });
    expect(Object.keys(STATE_CARD_IDS).sort()).toEqual(
      STATES.map((s) => s.id).sort(),
    );
    for (const id of Object.values(STATE_CARD_IDS)) {
      expect(resolveLibraryCard(id)?.category).toBe("patterns");
    }
  });

  it("keeps the six stored skills while separating a next step from its process", () => {
    expect(SKILL_CARD_IDS).toEqual({
      notice: "notice",
      defuse: "defuse",
      accept: "accept-make-room",
      anchor: "anchor-return",
      orient: "orient-to-values",
      commit: "small-step",
    });
    expect(Object.keys(SKILL_CARD_IDS).sort()).toEqual(
      SKILLS.map((s) => s.id).sort(),
    );
    for (const id of Object.values(SKILL_CARD_IDS)) {
      expect(resolveLibraryCard(id)?.category).toBe("practices");
    }
    expect(en.actV2.cards[SKILL_CARD_IDS.commit].title).toBe(
      "A Workable Next Step",
    );
    expect(resolveLibraryCard("committed-action")?.category).toBe("processes");
    expect(resolveLibraryCard("perspective-taking")?.category).toBe(
      "practices",
    );
    expect(SKILL_CARD_IDS).not.toHaveProperty("perspective-taking");
    expect(SKILL_CARD_IDS).not.toHaveProperty("none");
    expect(STATE_CARD_IDS).not.toHaveProperty("none");
  });
});
