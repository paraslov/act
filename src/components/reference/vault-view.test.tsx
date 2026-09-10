import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import en from "@/i18n/messages/en.json";
import ru from "@/i18n/messages/ru.json";
import { LIBRARY_CARDS } from "@/lib/reference/library";
import { LIBRARY_SEARCH_INDEX } from "@/lib/reference/library-search";
import { VaultView } from "./vault-view";

const navigation = vi.hoisted(() => ({ query: "" }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(navigation.query),
  useRouter: () => ({ push: vi.fn() }),
}));

function render(query: string, locale: "en" | "ru" = "en") {
  navigation.query = query;
  return renderToStaticMarkup(
    <NextIntlClientProvider
      locale={locale}
      messages={locale === "en" ? en : ru}
      timeZone="UTC"
    >
      <VaultView searchIndex={LIBRARY_SEARCH_INDEX} />
    </NextIntlClientProvider>,
  );
}

describe("Library rendered content", () => {
  it.each(["en", "ru"] as const)(
    "renders all 36 cards with seven layers and related/source links in %s",
    (locale) => {
      for (const card of LIBRARY_CARDS) {
        const html = render(`tab=obsolete&card=${card.id}`, locale);
        expect(html).toContain(`id="vault-panel-${card.id}"`);
        expect(html.match(/aria-expanded="true"/g)).toHaveLength(1);
        expect(html.match(/<h3 /g)).toHaveLength(8); // Seven layers plus background reading.
        for (const id of card.relatedIds) expect(html).toContain(`card=${id}`);
        expect(html).toContain('target="_blank"');
        expect(html).not.toMatch(
          /editorial-draft|reviewedAt|sourceRole|schemaVersion/,
        );
      }
    },
  );

  it("renders an unavailable ID without opening or offering an unrelated fallback card", () => {
    const html = render("tab=practices&card=not-a-card");
    expect(html).toContain(en.actV2.ui.library.notFound);
    expect(html).toContain('type="search"');
    expect(html).not.toContain('id="vault-');
    expect(html).not.toContain('aria-expanded="true"');
  });

  it("renders landing and collapsed routes without an absence/error message", () => {
    for (const query of ["", "tab=practices&card="]) {
      const html = render(query);
      expect(html).not.toContain(en.actV2.ui.library.notFound);
      expect(html).not.toContain('aria-expanded="true"');
      expect(html).toContain('id="vault-');
    }
  });

  it("searches globally and exposes a distinct empty-result state", () => {
    const html = render("tab=core&q=ПРИНЯТИЕ");
    expect(html).toContain('id="vault-acceptance"');
    expect(html).not.toContain('aria-selected="true"');
    const missing = render("q=unmatched-search");
    expect(missing).toContain(en.actV2.ui.library.noResults);
    expect(missing).not.toContain(en.actV2.ui.library.notFound);
  });

  it("preserves explicit card priority and map context across related links", () => {
    const html = render(
      "card=acceptance&tab=theory&q=unmatched&from=map-node-origin",
    );
    expect(html).toContain('id="vault-panel-acceptance"');
    expect(html).toContain('href="/reference/system-map#map-node-origin"');
    expect(html).toContain("card=accept-make-room&amp;from=map-node-origin");
  });

  it("keeps the values distinctions, domain map and My Values link on that card alone", () => {
    const html = render("card=orient-to-values");
    // React escapes the ampersands in "Work & Education"; compare on the text.
    const text = html
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'");
    for (const term of ["domain", "value", "goal", "action"]) {
      const distinction =
        en.reference.vault.orientToValues.distinctions[
          term as keyof typeof en.reference.vault.orientToValues.distinctions
        ];
      const label = distinction.term;
      expect(text).toContain(label);
      expect(text).toContain(distinction.text);
    }
    expect(text).toContain(en.reference.vault.orientToValues.map.leisure.value);
    expect(text).toContain(en.reference.vault.orientToValues.mapNote);
    expect(html).toContain('href="/values"');
    expect(render("card=values")).not.toContain('href="/values"');
  });

  it("offers optional capture only for practice content without preclassifying it", () => {
    expect(render("card=perspective-taking")).toContain(
      'href="/episodes?new=1"',
    );
    expect(render("card=acceptance")).not.toContain('href="/episodes?new=1"');
  });
});
