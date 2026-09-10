import { createTranslator } from "next-intl";
import { describe, expect, it } from "vitest";
import en from "./messages/en.json";
import ru from "./messages/ru.json";

function flatten(
  messages: Record<string, unknown>,
  prefix = "",
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(messages).flatMap(([key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return typeof value === "string"
        ? [[path, value]]
        : Object.entries(flatten(value as Record<string, unknown>, path));
    }),
  );
}

function placeholders(message: string): string[] {
  return [
    ...new Set([
      ...Array.from(message.matchAll(/\{\s*(\w+)\s*[,}]/g), (m) => m[1]),
      ...Array.from(message.matchAll(/<(\w+)>/g), (m) => `<${m[1]}>`),
    ]),
  ].sort();
}

describe("message catalogs", () => {
  it("ships a nonempty Russian translation for every English key", () => {
    const english = flatten(en);
    const russian = flatten(ru);
    expect(Object.keys(russian).sort()).toEqual(Object.keys(english).sort());
    for (const [key, value] of Object.entries(russian)) {
      expect(value.trim(), key).not.toBe("");
    }
  });

  it("keeps actV2 key paths and placeholder sets identical in both locales", () => {
    const english = flatten(en.actV2);
    const russian = flatten(ru.actV2);
    expect(Object.keys(russian).sort()).toEqual(Object.keys(english).sort());
    for (const [key, message] of Object.entries(english)) {
      expect(placeholders(russian[key]), key).toEqual(placeholders(message));
    }
  });

  it("ships no empty actV2 leaves in either locale", () => {
    for (const [locale, messages] of Object.entries({ en, ru })) {
      for (const [key, value] of Object.entries(flatten(messages.actV2))) {
        expect(value.trim(), `${locale}.actV2.${key}`).not.toBe("");
      }
    }
  });

  it("keeps Cyrillic out of the English actV2 catalog", () => {
    for (const [key, message] of Object.entries(flatten(en.actV2))) {
      expect(message, `en.actV2.${key}`).not.toMatch(/\p{Script=Cyrillic}/u);
    }
  });

  for (const [locale, messages] of Object.entries({ en, ru })) {
    it(`formats every ${locale} message, including ICU arguments and rich text`, () => {
      const t = createTranslator({
        locale,
        messages,
        onError: (error) => {
          throw error;
        },
      });
      for (const [key, message] of Object.entries(flatten(messages))) {
        const values: Record<string, number | ((chunks: unknown) => string)> =
          {};
        for (const match of message.matchAll(/\{(\w+)[,}]/g))
          values[match[1]] = 2;
        for (const match of message.matchAll(/<(\w+)>/g))
          values[match[1]] = (chunks) => String(chunks);
        expect(
          t.rich(key as Parameters<typeof t.rich>[0], values),
          key,
        ).toBeTruthy();
      }
    });
  }

  it.each([
    [0, "дней", "эпизодов"],
    [1, "день", "эпизод"],
    [2, "дня", "эпизода"],
    [5, "дней", "эпизодов"],
    [11, "дней", "эпизодов"],
    [21, "день", "эпизод"],
    [22, "дня", "эпизода"],
    [25, "дней", "эпизодов"],
  ])("uses Russian plural forms for %i", (count, days, episodes) => {
    const t = createTranslator({ locale: "ru", messages: ru });
    expect(t("nav.days", { count })).toBe(days);
    expect(t("journal.episodeCount", { count })).toBe(`${count} ${episodes}`);
  });
});
