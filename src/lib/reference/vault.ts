import {
  type aliases,
  LIBRARY_CARDS,
  LIBRARY_CATEGORIES,
  type LibraryCardId,
  type LibraryCategory,
  resolveLibraryCard,
} from "./library";

// Accept the historical slug at link boundaries while emitting canonical IDs.
export type VaultCardId = LibraryCardId | keyof typeof aliases;
export const VAULT_CATEGORIES = LIBRARY_CATEGORIES;

const legacyCategories = {
  "Core map": "core",
  Concepts: "patterns",
  Skills: "practices",
  Basement: "theory",
} as const satisfies Record<string, LibraryCategory>;

export function vaultHref(cardId: VaultCardId, from?: string | null): string {
  const card = resolveLibraryCard(cardId);
  const params = new URLSearchParams({
    ...(card ? { tab: card.category } : {}),
    card: card?.id ?? cardId,
  });
  if (from && isMapNodeId(from)) params.set("from", from);
  return `/reference/vault?${params}`;
}

export type VaultSelection = {
  category: LibraryCategory;
} & (
  | { status: "card"; cardId: LibraryCardId }
  | { status: "landing" | "collapsed" | "not-found"; cardId: null }
);

/** Legacy title → ID alias → owning category. Unknown explicit IDs never fall back. */
export function resolveVaultSelection(
  tab: string | null,
  card: string | null,
): VaultSelection {
  const match = card ? resolveLibraryCard(card) : undefined;
  if (match) {
    return { status: "card", category: match.category, cardId: match.id };
  }
  const category =
    LIBRARY_CATEGORIES.find((value) => value === tab) ??
    (tab && Object.hasOwn(legacyCategories, tab)
      ? legacyCategories[tab as keyof typeof legacyCategories]
      : "core");
  return {
    category,
    cardId: null,
    status: card === null ? "landing" : card === "" ? "collapsed" : "not-found",
  };
}

export const VAULT_LAYERS = [
  "short",
  "practice",
  "example",
  "deep",
  "pitfall",
  "reflection",
  "related",
] as const;
export type VaultLayer = (typeof VAULT_LAYERS)[number];

export type LibrarySearchEntry = { id: LibraryCardId; terms: string[] };

function normalizeSearch(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/ё/g, "е").trim();
}

/** Only public reference titles/aliases enter this index, never personal records. */
export function searchLibrary(
  query: string,
  index: readonly LibrarySearchEntry[],
) {
  const words = normalizeSearch(query).split(/\s+/).filter(Boolean);
  const ids = new Set(
    index
      .filter(({ terms }) => {
        const text = normalizeSearch(terms.join(" "));
        return words.every((word) => text.includes(word));
      })
      .map(({ id }) => id),
  );
  return LIBRARY_CARDS.filter(({ id }) => ids.has(id));
}

export function mapNodeId(group: string, label: string): string {
  return `map-node-${group}-${label}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

function isMapNodeId(value: string): boolean {
  return /^map-node-[a-z0-9-]+$/.test(value);
}

/** Only a local map fragment is allowed, never an arbitrary return URL. */
export function systemMapHref(from: string | null): string {
  return `/reference/system-map${from && isMapNodeId(from) ? `#${from}` : ""}`;
}
