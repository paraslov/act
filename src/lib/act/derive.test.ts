import { describe, expect, it } from "vitest";
import {
  axisAverages,
  bandBreakdown,
  bandShape,
  checksTotal,
  dayCounts,
  dayNumber,
  filterEpisodes,
  hookGroupTallies,
  normalizeText,
  radarComparison,
  skillTallies,
  statusEffectTallies,
  topStatusEffect,
  towardAwaySplit,
  towardStreak,
  unusedSkills,
} from "./derive";
import type { Checks, Episode, EpisodeDir } from "./types";

let seq = 0;

function ep(overrides: Partial<Episode> = {}): Episode {
  seq += 1;
  return {
    id: `e${seq}`,
    userId: "u1",
    day: "2026-09-01",
    band: 6,
    dir: "toward" as EpisodeDir,
    weight: 1,
    hook: "",
    hookType: "thought",
    situation: "",
    state: "fusion",
    skill: "notice",
    value: "",
    move: "",
    workable: "",
    checks: {},
    createdAt: `2026-09-01T00:00:0${seq % 10}Z`,
    updatedAt: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}

describe("normalizeText", () => {
  it("is case- and diacritic-insensitive", () => {
    expect(normalizeText("Café")).toBe("cafe");
    expect(normalizeText("RÉSUMÉ")).toBe("resume");
    expect(normalizeText(null)).toBe("");
  });
});

describe("checksTotal", () => {
  it("sums the five axes to a 0–10 total", () => {
    const checks: Checks = {
      awareness: 2,
      openness: 1,
      choice: 2,
      values: 1,
      action: 2,
    };
    expect(checksTotal(checks)).toBe(8);
    expect(checksTotal({})).toBe(0);
    expect(checksTotal(null)).toBe(0);
  });
});

describe("counts", () => {
  it("splits toward/away for a day and overall", () => {
    const eps = [
      ep({ day: "2026-09-01", dir: "toward" }),
      ep({ day: "2026-09-01", dir: "away" }),
      ep({ day: "2026-08-31", dir: "toward" }),
    ];
    expect(dayCounts(eps, "2026-09-01")).toEqual({
      toward: 1,
      away: 1,
      total: 2,
    });
    expect(towardAwaySplit(eps)).toEqual({ toward: 2, away: 1, total: 3 });
  });
});

describe("filterEpisodes", () => {
  const eps = [
    ep({
      dir: "toward",
      band: 2,
      state: "fusion",
      skill: "commit",
      hook: "Alarm, skip it",
    }),
    ep({
      dir: "away",
      band: 3,
      state: "avoidance",
      skill: "notice",
      move: "Scrolled for an hour",
    }),
    ep({
      dir: "toward",
      band: 3,
      state: "drift",
      skill: "orient",
      value: "Curious résumé",
    }),
  ];

  it("filters by direction, band, state and skill", () => {
    expect(filterEpisodes(eps, { dir: "toward" })).toHaveLength(2);
    expect(filterEpisodes(eps, { band: 3 })).toHaveLength(2);
    expect(filterEpisodes(eps, { state: "avoidance" })).toHaveLength(1);
    expect(filterEpisodes(eps, { skill: "orient" })).toHaveLength(1);
    expect(filterEpisodes(eps, { dir: "all", band: "all" })).toHaveLength(3);
  });

  it("matches text across fields, diacritic-insensitively", () => {
    expect(filterEpisodes(eps, { text: "resume" })).toHaveLength(1);
    expect(filterEpisodes(eps, { text: "SCROLLED" })).toHaveLength(1);
    expect(filterEpisodes(eps, { text: "nothing here" })).toHaveLength(0);
  });
});

describe("band shape & breakdown", () => {
  it("marks per-band count and away presence", () => {
    const eps = [ep({ band: 6, dir: "toward" }), ep({ band: 6, dir: "away" })];
    const shape = bandShape(eps);
    expect(shape).toHaveLength(8);
    expect(shape[6]).toEqual({ index: 6, count: 2, hasAway: true });
    expect(shape[0]).toEqual({ index: 0, count: 0, hasAway: false });

    const breakdown = bandBreakdown(eps);
    expect(breakdown[6]).toEqual({ index: 6, toward: 1, away: 1, total: 2 });
  });
});

describe("tallies", () => {
  const eps = [
    ep({ state: "fusion", skill: "notice" }),
    ep({ state: "fusion", skill: "defuse" }),
    ep({ state: "avoidance", skill: "notice" }),
  ];

  it("finds the most frequent status effect", () => {
    expect(topStatusEffect(eps)).toBe("fusion");
    expect(topStatusEffect([])).toBeNull();
  });

  it("returns all six status effects sorted by count with shares", () => {
    const tallies = statusEffectTallies(eps);
    expect(tallies).toHaveLength(6);
    expect(tallies[0]).toMatchObject({ id: "fusion", count: 2 });
    expect(tallies[0].share).toBeCloseTo(2 / 3);
  });

  it("keeps all six skills in canonical order and reports unused", () => {
    const tallies = skillTallies(eps);
    expect(tallies.map((t) => t.id)).toEqual([
      "notice",
      "defuse",
      "accept",
      "anchor",
      "orient",
      "commit",
    ]);
    expect(tallies[0]).toMatchObject({ id: "notice", count: 2 });
    expect(unusedSkills(eps)).toEqual([
      "Accept / Make room",
      "Anchor / Return",
      "Orient to values",
      "Committed Action",
    ]);
  });

  it("counts recurring hook groups with matches only", () => {
    const hookEps = [
      ep({ hook: "Urge to close the laptop when it gets boring" }),
      ep({ hook: "Flash of anger at the review comment" }),
      ep({ hook: "Something unrelated" }),
    ];
    const groups = hookGroupTallies(hookEps);
    expect(groups.every((g) => g.count > 0)).toBe(true);
    expect(groups.map((g) => g.label)).toContain(
      "Urge to shut the laptop when it gets boring",
    );
  });
});

describe("radar comparison", () => {
  it("averages recent 5 against the previous 5", () => {
    const strong: Checks = {
      awareness: 2,
      openness: 2,
      choice: 2,
      values: 2,
      action: 2,
    };
    const weak: Checks = {
      awareness: 0,
      openness: 0,
      choice: 0,
      values: 0,
      action: 0,
    };
    // 5 newest (strong) then 5 older (weak).
    const eps = [
      ...[5, 4, 3, 2, 1].map((d) =>
        ep({ day: `2026-09-0${d}`, checks: strong }),
      ),
      ...[5, 4, 3, 2, 1].map((d) => ep({ day: `2026-08-0${d}`, checks: weak })),
    ];
    const rows = radarComparison(eps);
    expect(rows).toHaveLength(5);
    for (const row of rows) {
      expect(row.recent).toBe(2);
      expect(row.previous).toBe(0);
      expect(row.delta).toBe(2);
    }
  });

  it("averages a single axis correctly", () => {
    const eps = [
      ep({ checks: { awareness: 2 } }),
      ep({ checks: { awareness: 0 } }),
    ];
    expect(axisAverages(eps).awareness).toBe(1);
  });
});

describe("streak & day number", () => {
  it("counts consecutive toward days back from today", () => {
    const eps = [
      ep({ day: "2026-09-03", dir: "toward" }),
      ep({ day: "2026-09-02", dir: "toward" }),
      ep({ day: "2026-09-01", dir: "away" }),
    ];
    expect(towardStreak(eps, "2026-09-03")).toBe(2);
  });

  it("gives the current day grace when it has no toward move yet", () => {
    const eps = [
      ep({ day: "2026-09-02", dir: "toward" }),
      ep({ day: "2026-09-01", dir: "toward" }),
    ];
    // Today (09-03) not logged yet — streak counts from 09-02.
    expect(towardStreak(eps, "2026-09-03")).toBe(2);
  });

  it("breaks the streak on a gap", () => {
    const eps = [
      ep({ day: "2026-09-03", dir: "toward" }),
      ep({ day: "2026-09-01", dir: "toward" }),
    ];
    expect(towardStreak(eps, "2026-09-03")).toBe(1);
  });

  it("numbers the day from the earliest logged episode, inclusive", () => {
    const eps = [ep({ day: "2026-08-25" }), ep({ day: "2026-09-01" })];
    expect(dayNumber(eps, "2026-09-01")).toBe(8);
    expect(dayNumber([], "2026-09-01")).toBe(1);
  });
});
