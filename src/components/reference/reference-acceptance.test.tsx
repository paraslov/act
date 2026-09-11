import { type AbstractIntlMessages, createTranslator } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import en from "@/i18n/messages/en.json";
import ru from "@/i18n/messages/ru.json";
import { MAP_LOOP } from "@/lib/reference/system-map";
import { FlexibilityView } from "./flexibility-view";
import { SystemMapView } from "./system-map-view";

const context = vi.hoisted(() => ({ locale: "en" as "en" | "ru" }));
vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: string) =>
    createTranslator({
      locale: context.locale,
      messages: (context.locale === "en" ? en : ru) as AbstractIntlMessages,
      namespace,
      onError: (error) => {
        throw error;
      },
    }),
}));

describe.each(["en", "ru"] as const)("Reference acceptance (%s)", (locale) => {
  it("keeps the Master stat orientation and labels all six loop links accurately", async () => {
    context.locale = locale;
    const html = renderToStaticMarkup(await SystemMapView());
    const messages = locale === "en" ? en : ru;
    expect(html).toContain(messages.actV2.ui.rpg.masterStat.label);
    expect(html).not.toMatch(/five operations|Пять операций/i);
    for (const step of MAP_LOOP)
      expect(html).toContain(`href="/reference/loop#${step}"`);
    if (locale === "ru")
      expect(html.replace(/<[^>]+>/g, "")).not.toMatch(
        /\b(Open|Aware|Engaged)\b/,
      );
  });

  it("localizes pillar/process labels and links each question to its canonical explanation", async () => {
    context.locale = locale;
    const html = renderToStaticMarkup(await FlexibilityView());
    const messages = locale === "en" ? en : ru;
    expect(html).toContain(messages.reference.flexibility.eyebrow);
    for (const axis of ["awareness", "openness", "choice", "values", "action"])
      expect(html).toContain(`card=app-checks#${axis}`);
    if (locale === "ru")
      expect(html.replace(/<[^>]+>/g, "")).not.toMatch(
        /\b(Open|Aware|Engaged|Defusion|Acceptance|Self-as-context|Committed Action)\b/,
      );
  });
});
