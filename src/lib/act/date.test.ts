import { describe, expect, it } from "vitest";
import {
  daysBetween,
  formatDayLabel,
  formatDayMono,
  formatDayTitle,
  idToDate,
  isTimeZone,
  normalizeTimeZone,
  shiftId,
  todayId,
  zonedBand,
  zonedDayId,
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

  it("resolves the local day and band in the event zone, not UTC (T18)", () => {
    // Asia/Almaty is UTC+5. 18:30Z is 23:30 local (same day, last band);
    // an hour later, 19:30Z is 00:30 local the next day (first band).
    const late = new Date("2026-09-01T18:30:00Z");
    const past = new Date("2026-09-01T19:30:00Z");
    expect(zonedDayId(late, "Asia/Almaty")).toBe("2026-09-01");
    expect(zonedBand(late, "Asia/Almaty")).toBe(7);
    expect(zonedDayId(past, "Asia/Almaty")).toBe("2026-09-02");
    expect(zonedBand(past, "Asia/Almaty")).toBe(0);
    // The same instant is still the earlier day in UTC — the zone is what moves it.
    expect(zonedDayId(past, "UTC")).toBe("2026-09-01");
    expect(zonedBand(past, "UTC")).toBe(6);
  });

  it("accepts real IANA zones and falls back to UTC for anything else", () => {
    expect(isTimeZone("Asia/Almaty")).toBe(true);
    expect(isTimeZone("Not/AZone")).toBe(false);
    expect(isTimeZone("")).toBe(false);
    expect(normalizeTimeZone("Europe/Berlin")).toBe("Europe/Berlin");
    expect(normalizeTimeZone("bogus")).toBe("UTC");
    expect(normalizeTimeZone(null)).toBe("UTC");
  });
});
