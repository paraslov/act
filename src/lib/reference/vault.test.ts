import { describe, expect, it } from "vitest";
import en from "@/i18n/messages/en.json";
import ru from "@/i18n/messages/ru.json";
import {
  aliases,
  LIBRARY_CARDS,
  legacyTitleAliases,
  resolveLibraryCard,
} from "./library";
import { LIBRARY_SEARCH_INDEX } from "./library-search";
import { MAP_BASEMENT, MAP_CHOICE, MAP_PILLARS } from "./system-map";
import {
  mapNodeId,
  resolveVaultSelection,
  searchLibrary,
  systemMapHref,
  VAULT_CATEGORIES,
  VAULT_LAYERS,
  vaultHref,
} from "./vault";

describe("Library deep links", () => {
  it("opens all 36 canonical cards in their owning category, regardless of tab", () => {
    for (const card of LIBRARY_CARDS) {
      for (const tab of [
        null,
        ...VAULT_CATEGORIES,
        "Skills",
        "unknown",
        "__proto__",
      ]) {
        expect(resolveVaultSelection(tab, card.id)).toEqual({
          status: "card",
          category: card.category,
          cardId: card.id,
        });
      }
      const url = new URL(vaultHref(card.id), "https://act.example");
      expect(url.searchParams.get("tab")).toBe(card.category);
      expect(url.searchParams.get("card")).toBe(card.id);
    }
  });

  it("resolves every legacy English title and slug alias before choosing a category", () => {
    for (const [alias, id] of Object.entries({
      ...legacyTitleAliases,
      ...aliases,
    })) {
      const card = resolveLibraryCard(id);
      for (const tab of [null, "Basement", "Core map", "__proto__"]) {
        expect(resolveVaultSelection(tab, alias), alias).toEqual({
          status: "card",
          category: card?.category,
          cardId: card?.id,
        });
      }
    }
    expect(
      new URL(
        vaultHref("rft-rule-governed-behaviour"),
        "https://act.example",
      ).searchParams.get("card"),
    ).toBe("rule-governed-behaviour");
  });

  it("keeps current map links working through the canonical alias boundary", () => {
    // Meaning changes to the map's old destinations belong to Phase 4.
    const ids = [
      ...MAP_PILLARS.flatMap((p) =>
        [...p.model, ...p.stuck, ...p.skills].map((n) => n.card),
      ),
      ...MAP_BASEMENT.map((n) => n.card),
      ...Object.values(MAP_CHOICE),
    ];
    for (const id of ids) {
      const url = new URL(vaultHref(id), "https://act.example");
      expect(
        resolveVaultSelection(
          url.searchParams.get("tab"),
          url.searchParams.get("card"),
        ),
      ).toMatchObject({ status: "card", cardId: resolveLibraryCard(id)?.id });
    }
  });

  it("distinguishes landing, explicit collapse, and unknown explicit IDs", () => {
    for (const [tab, category] of [
      [null, "core"],
      ["processes", "processes"],
      ["Skills", "practices"],
      ["Concepts", "patterns"],
      ["Basement", "theory"],
      ["__proto__", "core"],
    ]) {
      expect(resolveVaultSelection(tab, null)).toEqual({
        status: "landing",
        category,
        cardId: null,
      });
      expect(resolveVaultSelection(tab, "")).toEqual({
        status: "collapsed",
        category,
        cardId: null,
      });
      for (const id of [
        "unknown",
        " ",
        "__proto__",
        "constructor",
        "toString",
      ]) {
        expect(resolveVaultSelection(tab, id)).toEqual({
          status: "not-found",
          category,
          cardId: null,
        });
      }
    }
  });

  it("provides all seven layers and distinct process/practice/theory destinations", () => {
    expect(VAULT_LAYERS).toEqual([
      "short",
      "practice",
      "example",
      "deep",
      "pitfall",
      "reflection",
      "related",
    ]);
    for (const [process, practice] of [
      ["acceptance", "accept-make-room"],
      ["values", "orient-to-values"],
      ["committed-action", "small-step"],
    ]) {
      expect(resolveLibraryCard(process)?.category).toBe("processes");
      expect(resolveLibraryCard(practice)?.category).toBe("practices");
      expect(resolveLibraryCard(process)?.relatedIds).toContain(practice);
    }
    expect(resolveLibraryCard("rule-governed-behaviour")?.relatedIds).toContain(
      "relational-frame-theory",
    );
    for (const messages of [en, ru]) {
      for (const { id } of LIBRARY_CARDS)
        expect(messages.actV2.cards[id].deep).not.toBe(
          messages.actV2.cards[id].short,
        );
    }
  });
});

describe("Library search", () => {
  it("finds every card by its English and Russian titles, independent of active locale", () => {
    for (const { id } of LIBRARY_CARDS) {
      for (const messages of [en, ru])
        expect(
          searchLibrary(
            messages.actV2.cards[id].title,
            LIBRARY_SEARCH_INDEX,
          ).map((c) => c.id),
        ).toContain(id);
    }
  });
  it("searches every legacy title and stable alias without duplicate cards", () => {
    for (const [alias, id] of Object.entries({
      ...legacyTitleAliases,
      ...aliases,
    })) {
      const results = searchLibrary(alias, LIBRARY_SEARCH_INDEX);
      expect(results.map((c) => c.id)).toContain(id);
      expect(new Set(results.map((c) => c.id)).size).toBe(results.length);
    }
  });
  it("supports partial, case-insensitive, whitespace-normalized, cross-language queries", () => {
    expect(
      searchLibrary("  CoGnItIvE   defus  ", LIBRARY_SEARCH_INDEX).map(
        (c) => c.id,
      ),
    ).toEqual(["cognitive-defusion"]);
    expect(
      searchLibrary("когнитив defusion", LIBRARY_SEARCH_INDEX).map((c) => c.id),
    ).toEqual(["cognitive-defusion"]);
    expect(searchLibrary("", LIBRARY_SEARCH_INDEX)).toHaveLength(36);
    expect(searchLibrary("no-such-topic", LIBRARY_SEARCH_INDEX)).toEqual([]);
  });
});

describe("Back to System Map", () => {
  it("gives originating nodes unique identities even when destinations are shared", () => {
    const ids = MAP_PILLARS.flatMap((pillar) =>
      (["model", "stuck", "skills"] as const).flatMap((group) =>
        pillar[group].map((node) =>
          mapNodeId(`${pillar.key}-${group}`, node.label),
        ),
      ),
    );
    ids.push(
      ...MAP_BASEMENT.map((n) => mapNodeId("foundations", n.label)),
      ...Object.keys(MAP_CHOICE).map((key) => mapNodeId("choice", key)),
    );
    expect(ids).toHaveLength(25);
    expect(new Set(ids).size).toBe(ids.length);
    for (const from of ids) {
      const url = new URL(vaultHref("notice", from), "https://act.example");
      expect(systemMapHref(url.searchParams.get("from"))).toBe(
        `/reference/system-map#${from}`,
      );
      const related = new URL(
        vaultHref("present-moment", url.searchParams.get("from")),
        url,
      );
      expect(related.searchParams.get("from")).toBe(from);
    }
  });
  it.each([
    null,
    "",
    "https://example.com",
    "//example.com",
    "__proto__",
    "map-node-<script>",
  ])("keeps return navigation local for %j", (from) => {
    expect(systemMapHref(from)).toBe("/reference/system-map");
    expect(
      new URL(
        vaultHref("notice", from),
        "https://act.example",
      ).searchParams.has("from"),
    ).toBe(false);
  });
});
