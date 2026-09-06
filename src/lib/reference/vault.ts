import { LIB, type VaultCategory } from "@/lib/act/constants";

export type VaultCardId = (typeof LIB)[VaultCategory][number]["id"];
export const VAULT_CATEGORIES = Object.keys(LIB) as VaultCategory[];

export function vaultHref(cardId: VaultCardId): string {
  const category = VAULT_CATEGORIES.find((tab) =>
    LIB[tab].some((card) => card.id === cardId),
  );
  return `/reference/vault?${new URLSearchParams({
    tab: category ?? "Core map",
    card: cardId,
  })}`;
}

/** Card identity wins over a conflicting tab; old English-title links still work. */
export function resolveVaultSelection(tab: string | null, card: string | null) {
  for (const category of VAULT_CATEGORIES) {
    const match = LIB[category].find(
      (item) => item.id === card || item.t === card,
    );
    if (match) return { category, cardId: match.id };
  }

  const category =
    VAULT_CATEGORIES.find((value) => value === tab) ?? "Core map";
  return {
    category,
    // An explicit empty card preserves a collapsed accordion on reload.
    cardId: card === "" ? null : LIB[category][0].id,
  };
}
