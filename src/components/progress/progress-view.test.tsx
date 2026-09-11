import {
  type AbstractIntlMessages,
  createTranslator,
  NextIntlClientProvider,
} from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import ProgressPage from "@/app/(protected)/progress/page";
import en from "@/i18n/messages/en.json";
import ru from "@/i18n/messages/ru.json";
import { createEpisodeSchema } from "@/lib/act/episode-input";
import type { Episode } from "@/lib/act/types";
import { ProgressView } from "./progress-view";

const context = vi.hoisted(() => ({
  locale: "en" as "en" | "ru",
  episodes: [] as Episode[],
}));
vi.mock("@/lib/db/episodes", () => ({
  listEpisodes: async () => context.episodes,
}));
vi.mock("@/lib/act/timezone", () => ({
  resolveTimeZone: async () => "Asia/Almaty",
}));
vi.mock("@/lib/act/date", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/act/date")>()),
  todayId: () => "2026-09-10",
}));
vi.mock("next-intl/server", () => ({
  getLocale: async () => context.locale,
  getTranslations: async (namespace: string) =>
    createTranslator({
      locale: context.locale,
      messages: (context.locale === "en" ? en : ru) as AbstractIntlMessages,
      namespace,
    }),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/progress",
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

function episode(overrides: Partial<Episode> = {}): Episode {
  return {
    ...createEpisodeSchema.parse({
      hook: "laptop",
      day: "2026-09-10",
      band: 6,
    }),
    id: "entry",
    userId: "test",
    weight: 1,
    schemaVersion: 2,
    state: null,
    skill: null,
    eventTimezone: "Asia/Almaty",
    legacySnapshot: null,
    createdAt: "2026-09-10T15:00:00Z",
    updatedAt: "2026-09-10T15:00:00Z",
    ...overrides,
  };
}

async function render(episodes: Episode[]) {
  const view = await ProgressView({ episodes, period: "all" });
  return renderToStaticMarkup(
    <NextIntlClientProvider
      locale={context.locale}
      messages={context.locale === "en" ? en : ru}
      timeZone="UTC"
    >
      {view}
    </NextIntlClientProvider>,
  );
}

for (const locale of ["en", "ru"] as const) {
  describe(`Observations acceptance (${locale})`, () => {
    it("T14/G04: the page passes one inclusive window to every block", async () => {
      context.locale = locale;
      context.episodes = [
        episode({ id: "before", day: "2026-08-11" }),
        episode({ id: "start", day: "2026-08-12" }),
        episode({ id: "end", day: "2026-09-10" }),
        episode({ id: "future", day: "2026-09-11" }),
      ];
      const page = await ProgressPage({
        searchParams: Promise.resolve({ period: "30" }),
      });
      expect(page.props.episodes.map((entry: Episode) => entry.id)).toEqual([
        "start",
        "end",
      ]);
      expect(page.props.window).toEqual({
        start: "2026-08-12",
        end: "2026-09-10",
      });
      for (const period of ["all", "invalid"]) {
        const all = await ProgressPage({
          searchParams: Promise.resolve({ period }),
        });
        expect(all.props.episodes).toEqual(context.episodes);
        expect(all.props.window).toBeUndefined();
      }
    });
    it.each([0, 2, 5, 10])(
      "T03–T06: %i unrated entries never draw a zero-valued response or comparison",
      async (count) => {
        context.locale = locale;
        const html = await render(
          Array.from({ length: count }, (_, i) =>
            episode({ id: `entry-${i}` }),
          ),
        );
        const messages = locale === "en" ? en : ru;
        expect(html).toContain(messages.actV2.ui.observations.noResponses);
        // The neutral radar grid stays; only actual response marks must be absent.
        expect(html).not.toMatch(
          /<circle|class="stroke-(?:muted-)?foreground"/,
        );
        expect(html.replace(/<[^>]+>/g, "")).not.toMatch(
          /\d+\/10|NaN|Infinity/,
        );
        expect(html).not.toMatch(/riskiest|boredom|criticism/i);
        if (count === 0)
          expect(html).toContain(messages.actV2.ui.rpg.bossTest.empty);
      },
    );

    it("G01–G03: retains the six distinct Boss cells and counts only one completed Toward action", async () => {
      context.locale = locale;
      const entries = [
        episode({ id: "note", dir: "toward" }),
        episode({ id: "plan", dir: "toward", behaviorStatus: "planned" }),
        ...(["toward", "away", "mixed", "unknown"] as const).map((dir) =>
          episode({ id: dir, dir, behaviorStatus: "acted", move: "Rested" }),
        ),
      ];
      const html = await render(entries);
      const messages = locale === "en" ? en : ru;
      const t = createTranslator({ locale, messages });
      expect(html).toContain(
        t("actV2.ui.rpg.bossTest.summary", { total: 6, toward: 1 }),
      );
      expect(html).toContain(messages.actV2.ui.rpg.statusEffects.label);
      expect(html.match(/title="[^"]+" aria-label=/g)).toHaveLength(6);
      expect(html.match(/tabindex="0"/g)).toHaveLength(1);
      for (const glyph of ["■", "●", "╱", "○", "·", "—"])
        expect(html).toContain(`aria-hidden="true">${glyph}</span>`);
    });

    it("G04: legacy entries remain visible without entering the completed count or reflection samples", async () => {
      context.locale = locale;
      const html = await render([
        episode({
          schemaVersion: 1,
          dir: "toward",
          behaviorStatus: "acted",
          checks: { awareness: 0, action: 2 },
        }),
      ]);
      const messages = locale === "en" ? en : ru;
      const t = createTranslator({ locale, messages });
      expect(html).toContain(messages.actV2.ui.legacy.notice);
      expect(html).toContain(
        t("actV2.ui.rpg.bossTest.summary", { total: 1, toward: 0 }),
      );
      expect(html).not.toMatch(/<circle|class="stroke-(?:muted-)?foreground"/);
    });
  });
}
