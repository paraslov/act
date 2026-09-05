import { describe, expect, it } from "vitest";
import {
  daysBetween,
  formatDayLabel,
  formatDayMono,
  formatDayTitle,
  idToDate,
  shiftId,
  todayId,
} from "./date";

describe("date helpers", () => {
  it("shifts ids across month boundaries in UTC", () => {
    expect(shiftId("2026-09-01", -1)).toBe("2026-08-31");
    expect(shiftId("2026-08-31", 1)).toBe("2026-09-01");
    expect(shiftId("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("measures whole days between ids", () => {
    expect(daysBetween("2026-09-01", "2026-08-31")).toBe(1);
    expect(daysBetween("2026-09-01", "2026-09-01")).toBe(0);
    expect(daysBetween("2026-08-25", "2026-09-01")).toBe(-7);
  });

  it("parses ids as UTC midnight", () => {
    expect(idToDate("2026-09-01").toISOString()).toBe(
      "2026-09-01T00:00:00.000Z",
    );
  });

  it("derives (not hardcodes) weekday and month names", () => {
    // 2026-09-01 is a Tuesday.
    expect(formatDayLabel("2026-09-01")).toBe("Tue 1 Sep");
    expect(formatDayMono("2026-09-01")).toBe("TUE 1 SEP");
    expect(formatDayTitle("2026-09-01")).toBe("Tuesday, 1 September");
  });

  it("uses Russian weekdays and inflected month names without shifting the day", () => {
    expect(formatDayLabel("2026-09-01", "ru")).toBe("вт, 1 сент.");
    expect(formatDayMono("2026-09-01", "ru")).toBe("ВТ, 1 СЕНТ.");
    expect(formatDayTitle("2026-09-01", "ru")).toBe("вторник, 1 сентября");
    expect(formatDayTitle("2026-01-01", "ru")).toBe("четверг, 1 января");
  });

  it("returns today as a YYYY-MM-DD id", () => {
    expect(todayId()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
