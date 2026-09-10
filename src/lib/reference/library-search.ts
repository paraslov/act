import en from "@/i18n/messages/en.json";
import ru from "@/i18n/messages/ru.json";
import {
  aliases,
  LIBRARY_CARDS,
  legacyTitleAliases,
  resolveLibraryCard,
} from "./library";
import type { LibrarySearchEntry } from "./vault";

// Built on the server: pass only these public strings to the client, not both catalogs.
export const LIBRARY_SEARCH_INDEX: LibrarySearchEntry[] = LIBRARY_CARDS.map(
  ({ id }) => ({
    id,
    terms: [
      en.actV2.cards[id].title,
      ru.actV2.cards[id].title,
      id,
      ...Object.keys({ ...legacyTitleAliases, ...aliases }).filter(
        (alias) => resolveLibraryCard(alias)?.id === id,
      ),
    ],
  }),
);
