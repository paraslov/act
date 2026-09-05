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

describe("message catalogs", () => {
  it("ships a nonempty Russian translation for every English key", () => {
    const english = flatten(en);
    const russian = flatten(ru);
    expect(Object.keys(russian).sort()).toEqual(Object.keys(english).sort());
    for (const [key, value] of Object.entries(russian)) {
      expect(value.trim(), key).not.toBe("");
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
