import { describe, expect, it } from "vitest";
import { LIB } from "@/lib/act/constants";
import { MAP_BASEMENT, MAP_CHOICE, MAP_PILLARS } from "./system-map";
import { resolveVaultSelection, VAULT_CATEGORIES, vaultHref } from "./vault";

describe("Vault deep links", () => {
  it("uses unique, stable slugs for every card", () => {
    const ids = Object.values(LIB)
      .flat()
      .map((card) => card.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z]+(?:-[a-z]+)*$/);
  });

  it("opens every map destination in the tab that owns it", () => {
    const nodes = [
      ...MAP_PILLARS.flatMap((pillar) => [
        ...pillar.model,
        ...pillar.stuck,
        ...pillar.skills,
      ]),
      ...MAP_BASEMENT,
      ...Object.values(MAP_CHOICE).map((card) => ({ card })),
    ];
    for (const node of nodes) {
      const url = new URL(vaultHref(node.card), "https://act.example");
      const selected = resolveVaultSelection(
        url.searchParams.get("tab"),
        url.searchParams.get("card"),
      );
      expect(selected.cardId).toBe(node.card);
      expect(LIB[selected.category].some((card) => card.id === node.card)).toBe(
        true,
      );
      expect(url.searchParams.get("tab")).toBe(selected.category);
    }
  });

  it.each([
    ["referenceNodes.acceptance", "Skills", "accept-make-room"],
    ["referenceNodes.defusion", "Skills", "defuse"],
    ["referenceNodes.avoidance", "Concepts", "experiential-avoidance"],
    ["referenceNodes.fusion", "Concepts", "cognitive-fusion"],
    ["referenceNodes.present", "Skills", "notice"],
    ["referenceNodes.self", "Concepts", "self-as-context"],
    ["referenceNodes.autopilot", "Skills", "notice"],
    ["referenceNodes.selfContent", "Concepts", "self-as-context"],
    ["referenceNodes.anchor", "Skills", "anchor-return"],
    ["referenceNodes.values", "Skills", "orient-to-values"],
    ["referenceNodes.drift", "Skills", "orient-to-values"],
    ["referenceNodes.commit", "Skills", "committed-action"],
    ["referenceNodes.stuck", "Concepts", "workability"],
    ["referenceNodes.contextualism", "Basement", "functional-contextualism"],
    ["referenceNodes.rft", "Basement", "rft-rule-governed-behaviour"],
    ["referenceNodes.rules", "Basement", "rft-rule-governed-behaviour"],
  ])("keeps the handoff mapping for %s", (label, tab, card) => {
    const nodes = [
      ...MAP_PILLARS.flatMap((p) => [...p.model, ...p.stuck, ...p.skills]),
      ...MAP_BASEMENT,
    ];
    const node = nodes.find((item) => item.label === label);
    expect(node?.card).toBe(card);
    expect(resolveVaultSelection(tab, card)).toEqual({
      category: tab,
      cardId: card,
    });
  });

  it("retains compatibility with English-title links", () => {
    for (const category of VAULT_CATEGORIES) {
      for (const card of LIB[category]) {
        expect(resolveVaultSelection(category, card.t)).toEqual({
          category,
          cardId: card.id,
        });
      }
    }
  });

  it("chooses the owning tab when a link has a missing or conflicting tab", () => {
    for (const tab of [null, "Basement", "unknown", "__proto__"]) {
      expect(resolveVaultSelection(tab, "cognitive-fusion")).toEqual({
        category: "Concepts",
        cardId: "cognitive-fusion",
      });
    }
  });

  it("falls back safely for unknown input, without losing valid tabs", () => {
    expect(resolveVaultSelection("unknown", "unknown")).toEqual({
      category: "Core map",
      cardId: "psychological-flexibility",
    });
    expect(resolveVaultSelection("Skills", "unknown")).toEqual({
      category: "Skills",
      cardId: "notice",
    });
    expect(resolveVaultSelection(null, null)).toEqual({
      category: "Core map",
      cardId: "psychological-flexibility",
    });
  });

  it("preserves an explicitly collapsed card on reload", () => {
    expect(resolveVaultSelection("Concepts", "")).toEqual({
      category: "Concepts",
      cardId: null,
    });
  });
});
