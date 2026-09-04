import { types } from "pg";
import { describe, expect, it } from "vitest";
import { postgresDateValue } from "./values";

describe("postgresDateValue", () => {
  it("preserves the calendar date parsed by node-postgres outside UTC", () => {
    const originalTimezone = process.env.TZ;
    process.env.TZ = "Asia/Almaty";

    try {
      const parseDate = types.getTypeParser(types.builtins.DATE, "text");
      const parsed = parseDate("2026-09-04") as Date;

      expect(parsed.toISOString().slice(0, 10)).toBe("2026-09-03");
      expect(postgresDateValue(parsed)).toBe("2026-09-04");
    } finally {
      if (originalTimezone === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = originalTimezone;
      }
    }
  });

  it("leaves date strings unchanged", () => {
    expect(postgresDateValue("2026-09-04")).toBe("2026-09-04");
  });
});
