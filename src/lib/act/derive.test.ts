import { describe, expect, it } from "vitest";
import {
  axisAverages,
  bandBreakdown,
  bandShape,
  bossTestCells,
  dayCounts,
  dayNumber,
  filterEpisodes,
  hasMorningEntry,
  hookTypeTallies,
  normalizeText,
  radarComparison,
  returningToPractice,
  skillsNamed,
  skillTallies,
  statusEffectTallies,
  topStatusEffect,
  towardAwaySplit,
} from "./derive";
import type {
  Checks,
  DayMorning,
  Episode,
  EpisodeDir,
  PersonalValueSnapshot,
} from "./types";

let seq = 0;

describe("hasMorningEntry (shared Today and Journal helper)", () => {
  it.each<DayMorning | undefined>([
    undefined,
    {},
    { open: "", aware: "  ", engaged: "\n", toward: "" },
    { valueId: null, valueSnapshot: null },
  ])("does not count an empty or cleared morning: %j", (morning) => {
    expect(hasMorningEntry(morning)).toBe(false);
  });

  it("counts a structured snapshot by itself without calling trim on it", () => {
    expect(
      hasMorningEntry({
        valueSnapshot: {
          valueId: "v1",
          title: "Be present",
          meaning: "Listen with care",
          domains: ["relationships"],
        },
      }),
    ).toBe(true);
  });

  it("counts a link even without a snapshot", () => {
    expect(hasMorningEntry({ valueId: "v1" })).toBe(true);
  });

  it.each(["open", "aware", "engaged", "toward"] as const)(
    "still counts legacy %s text after a link is cleared",
    (field) => {
      expect(
        hasMorningEntry({
          [field]: " Something worth saving ",
          valueId: null,
          valueSnapshot: null,
        }),
      ).toBe(true);
    },
  );
});

function ep(overrides: Partial<Episode> = {}): Episode {
  seq += 1;
  return {
    id: `e${seq}`,
    userId: "u1",
    day: "2026-09-01",
    band: 6,
    dir: "toward" as EpisodeDir,
    weight: 1,
    behaviorStatus: "acted",
    schemaVersion: 2,
    consequenceStatus: "unknown",
    immediateOutcome: "",
    laterConsequences: "",
    intendedFunction: "",
    nextExperiment: "",
    interpretation: "",
    states:
      overrides.state === "none" ? ["none"] : [overrides.state ?? "fusion"],
    skills:
      overrides.skill === "none" ? ["none"] : [overrides.skill ?? "notice"],
    eventTimezone: null,
    legacySnapshot: null,
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

describe("counts", () => {
  it("splits toward/away for a day and overall", () => {
    const eps = [
      ep({ day: "2026-09-01", dir: "toward" }),
      ep({ day: "2026-09-01", dir: "away" }),
      ep({ day: "2026-08-31", dir: "toward" }),
    ];
    expect(dayCounts(eps, "2026-09-01")).toMatchObject({
      toward: 1,
      away: 1,
      total: 2,
    });
    expect(towardAwaySplit(eps)).toMatchObject({
      toward: 2,
      away: 1,
      total: 3,
    });
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

  it("combines recorded hook types with the other filters and clears them", () => {
    const match = ep({
      hookType: "urge",
      dir: "away",
      band: 3,
      hook: "Open the game",
    });
    const episodes = [
      match,
      ep({ hookType: "thought", dir: "away", band: 3, hook: "Open the game" }),
      ep({ hookType: "urge", dir: "toward", band: 3, hook: "Open the game" }),
      ep({ hookType: "urge", dir: "away", band: 4, hook: "Open the game" }),
      ep({ hookType: "urge", dir: "away", band: 3, hook: "Check messages" }),
    ];
    expect(
      filterEpisodes(episodes, {
        hookType: "urge",
        dir: "away",
        band: 3,
        state: "fusion",
        skill: "notice",
        text: "game",
      }),
    ).toEqual([match]);
    expect(filterEpisodes(episodes, { hookType: "feeling" })).toEqual([]);
    expect(filterEpisodes(episodes, { hookType: "all" })).toEqual(episodes);
    expect(filterEpisodes(episodes, {})).toEqual(episodes);
  });

  it("filters by the linked value's stored domains", () => {
    const snapshot = (domains: PersonalValueSnapshot["domains"]) => ({
      valueId: "v1",
      title: "Be honest and warm",
      meaning: "",
      domains,
    });
    const twoAreas = ep({
      valueSnapshot: snapshot(["relationships", "work_education"]),
    });
    const leisure = ep({ valueSnapshot: snapshot(["leisure"]) });
    const unlinked = ep({ value: "Honest, in my own words" });
    const episodes = [twoAreas, leisure, unlinked];

    expect(filterEpisodes(episodes, { domain: "relationships" })).toEqual([
      twoAreas,
    ]);
    expect(filterEpisodes(episodes, { domain: "work_education" })).toEqual([
      twoAreas,
    ]);
    expect(filterEpisodes(episodes, { domain: "leisure" })).toEqual([leisure]);
    // An episode with no linked value sits in no area at all.
    expect(
      filterEpisodes(episodes, { domain: "personal_growth_health" }),
    ).toEqual([]);
    expect(filterEpisodes(episodes, { domain: "all" })).toEqual(episodes);
  });

  it("limits text search to hooks, moves and values", () => {
    const contextOnly = ep({
      situation: "Quarterly planning",
      workable: "Taking a short walk",
    });
    expect(filterEpisodes([contextOnly], { text: "quarterly" })).toHaveLength(
      0,
    );
    expect(filterEpisodes([contextOnly], { text: "walk" })).toHaveLength(0);
  });

  it("searches both own words and a frozen linked title on an away episode", () => {
    const linked = ep({
      dir: "away",
      value: "My own words",
      valueSnapshot: {
        valueId: "v1",
        title: "Curious résumé",
        meaning: "Private meaning",
        domains: ["work_education"],
      },
    });
    const episodes = [linked, ep()];
    expect(filterEpisodes(episodes, { text: "RESUME", dir: "away" })).toEqual([
      linked,
    ]);
    expect(filterEpisodes(episodes, { text: "own words" })).toEqual([linked]);
    expect(filterEpisodes(episodes, { text: "Private meaning" })).toEqual([]);
  });
});

describe("band shape & breakdown", () => {
  it("marks per-band count and toward/away presence", () => {
    const eps = [ep({ band: 6, dir: "toward" }), ep({ band: 6, dir: "away" })];
    const shape = bandShape(eps);
    expect(shape).toHaveLength(8);
    expect(shape[6]).toEqual({
      index: 6,
      count: 2,
      hasAway: true,
      hasToward: true,
    });
    expect(shape[0]).toEqual({
      index: 0,
      count: 0,
      hasAway: false,
      hasToward: false,
    });

    const breakdown = bandBreakdown(eps);
    expect(breakdown[6]).toMatchObject({
      index: 6,
      toward: 1,
      away: 1,
      total: 2,
    });
  });
});

describe("tallies", () => {
  it("keeps episodes without status or skill out of reference tallies", () => {
    const empty = ep({ state: "none", skill: "none" });
    expect(topStatusEffect([empty])).toBeNull();
    expect(statusEffectTallies([empty]).every((item) => item.count === 0)).toBe(
      true,
    );
    expect(skillTallies([empty]).every((item) => item.count === 0)).toBe(true);
    expect(skillsNamed([empty])).toHaveLength(0);

    const episodes = [empty, ep()];
    expect(statusEffectTallies(episodes)[0]).toMatchObject({
      count: 1,
      share: 0.5,
    });
    expect(skillTallies(episodes)[0]).toMatchObject({ count: 1, share: 0.5 });
    expect(filterEpisodes(episodes, { state: "none", skill: "none" })).toEqual([
      empty,
    ]);
  });

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
    expect(skillsNamed(eps).map((skill) => skill.id)).toEqual([
      "notice",
      "defuse",
    ]);
  });

  it("counts saved hook types independently of text and includes unused types", () => {
    const episodes = [
      ep({ hookType: "urge", hook: "Something unrelated", dir: "away" }),
      ep({ hookType: "urge", hook: "Something unrelated", dir: "toward" }),
      ep({ hookType: "memory", hook: "Flash of anger" }),
      ep({ hookType: "thought", hook: "Flash of anger" }),
    ];
    expect(hookTypeTallies(episodes)).toEqual([
      { id: "urge", count: 2, share: 0.5 },
      { id: "thought", count: 1, share: 0.25 },
      { id: "memory", count: 1, share: 0.25 },
      { id: "feeling", count: 0, share: 0 },
      { id: "sensation", count: 0, share: 0 },
      { id: "other", count: 0, share: 0 },
    ]);
    expect(hookTypeTallies([...episodes].reverse())).toEqual(
      hookTypeTallies(episodes),
    );
  });

  it("returns zero counts and shares for all hook types when there are no episodes", () => {
    expect(hookTypeTallies([])).toEqual([
      { id: "thought", count: 0, share: 0 },
      { id: "feeling", count: 0, share: 0 },
      { id: "urge", count: 0, share: 0 },
      { id: "memory", count: 0, share: 0 },
      { id: "sensation", count: 0, share: 0 },
      { id: "other", count: 0, share: 0 },
    ]);
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
    expect(axisAverages(eps).awareness).toEqual({ mean: 1, n: 2 });
  });
});

describe("day number", () => {
  it("numbers the day from the earliest logged episode, inclusive", () => {
    const eps = [ep({ day: "2026-08-25" }), ep({ day: "2026-09-01" })];
    expect(dayNumber(eps, "2026-09-01")).toBe(8);
    expect(dayNumber([], "2026-09-01")).toBe(1);
  });

  it("counts calendar days rather than only days with entries", () => {
    const eps = [ep({ day: "2026-08-29" }), ep({ day: "2026-09-01" })];
    expect(dayNumber(eps, "2026-09-01")).toBe(4);
  });
});

describe("Russian episode text", () => {
  it("searches Cyrillic case-insensitively and treats ё and е alike", () => {
    const episodes = [
      ep({ hook: "Всё уже испортил" }),
      ep({ hook: "Другой эпизод" }),
    ];
    expect(filterEpisodes(episodes, { text: "ВСЕ" })).toEqual([episodes[0]]);
  });
});

describe("Phase 1 missing-data integrity", () => {
  it("distinguishes zero, null, omitted answers and unclarified legacy defaults", () => {
    const episodes = [
      ep({ checks: { awareness: 2, openness: 0 } }),
      ep({ checks: { awareness: null } }),
      ep({ checks: {} }),
      ep({ schemaVersion: 1, checks: { awareness: 0, action: 2 } }),
    ];
    expect(axisAverages(episodes)).toEqual({
      awareness: { mean: 2, n: 1 },
      openness: { mean: 0, n: 1 },
      choice: { mean: null, n: 0 },
      values: { mean: null, n: 0 },
      action: { mean: null, n: 0 },
    });
    expect(axisAverages([]).awareness).toEqual({ mean: null, n: 0 });
  });
  it("does not invent a comparison from two episodes", () => {
    const rows = radarComparison([
      ep({ day: "2026-09-01", checks: { awareness: 2 } }),
      ep({ day: "2026-09-05", checks: { awareness: 1 } }),
    ]);
    expect(rows[0]).toMatchObject({
      recent: 1.5,
      previous: null,
      delta: null,
      recentN: 2,
      recentRange: { start: "2026-09-01", end: "2026-09-05" },
      previousRange: null,
    });
    expect(rows.every((row) => row.delta === null)).toBe(true);
  });
  it("requires ten eligible records and three answers per axis in each group", () => {
    const episodes = Array.from({ length: 10 }, (_, i) =>
      ep({
        day: `2026-09-${String(i + 1).padStart(2, "0")}`,
        checks: {
          awareness: i % 5 < 3 ? (i < 5 ? 0 : 2) : null,
          openness: i % 5 < 2 ? 1 : null,
        },
      }),
    );
    expect(radarComparison(episodes)[0]).toMatchObject({
      recentN: 3,
      previousN: 3,
      delta: 2,
    });
    expect(radarComparison(episodes)[1].delta).toBeNull();
    expect(radarComparison(episodes.slice(1))[0].delta).toBeNull();
    expect(
      radarComparison([...episodes.slice(1), ep({ schemaVersion: 1 })])[0]
        .delta,
    ).toBeNull();
    expect(radarComparison([...episodes].reverse())).toEqual(
      radarComparison(episodes),
    );
  });
  it("counts only completed actions by four explicit directions, with notes and plans separate", () => {
    const episodes = [
      ep({ dir: "toward" }),
      ep({ dir: "away" }),
      ep({ dir: "mixed" }),
      ep({ dir: "unknown" }),
      ep({ behaviorStatus: "planned", dir: "toward" }),
      ep({ behaviorStatus: "not-described", dir: "toward" }),
      ep({ schemaVersion: 1, dir: "toward" }),
    ];
    expect(towardAwaySplit(episodes)).toEqual({
      toward: 1,
      away: 1,
      mixed: 1,
      unknown: 1,
      planned: 1,
      notDescribed: 2,
      completed: 4,
      total: 7,
    });
    expect(bandBreakdown(episodes)[6].total).toBe(7);
    expect(
      bandShape([ep({ behaviorStatus: "planned", dir: "away" })])[6].hasAway,
    ).toBe(false);
  });
  it("preserves all six Boss test treatments and legacy entries in chronological period order", () => {
    const episodes = [
      ep({ dir: "toward" }),
      ep({ dir: "away" }),
      ep({ dir: "mixed" }),
      ep({ dir: "unknown" }),
      ep({ behaviorStatus: "planned" }),
      ep({ behaviorStatus: "not-described" }),
      ep({ schemaVersion: 1 }),
      ep({ day: "2026-08-01" }),
    ];
    const cells = bossTestCells(episodes, {
      start: "2026-09-01",
      end: "2026-09-30",
    });
    expect(cells).toHaveLength(7);
    expect(cells.filter((cell) => cell.isLegacy)).toHaveLength(1);
    expect(
      new Set(
        cells
          .filter((cell) => !cell.isLegacy)
          .map((cell) =>
            cell.behaviorStatus === "acted" ? cell.dir : cell.behaviorStatus,
          ),
      ).size,
    ).toBe(6);
    expect(bossTestCells([...episodes].reverse(), {})).toEqual(
      bossTestCells(episodes, {}),
    );
    expect(bossTestCells(episodes, { start: "2027-01-01" })).toEqual([]);
  });
  it("counts recorded days across gaps and statuses, within inclusive period boundaries", () => {
    const episodes = [
      ep({ day: "2026-09-01", behaviorStatus: "not-described" }),
      ep({ day: "2026-09-03", dir: "away" }),
      ep({ day: "2026-09-03" }),
      ep({ day: "2026-08-01" }),
    ];
    expect(
      returningToPractice(episodes, { start: "2026-09-01", end: "2026-09-30" }),
    ).toBe(2);
    expect(returningToPractice(episodes, { end: "2026-09-01" })).toBe(2);
    expect(returningToPractice([], {})).toBe(0);
  });
  it("uses every explicitly selected pattern and skill, never words in a hook", () => {
    const episode = ep({
      hook: "anger laptop",
      states: ["fusion", "avoidance"],
      skills: ["notice", "defuse"],
    });
    expect(
      filterEpisodes([episode], { state: "avoidance", skill: "defuse" }),
    ).toEqual([episode]);
    expect(
      statusEffectTallies([episode]).filter((s) => s.count === 1),
    ).toHaveLength(2);
    expect(skillsNamed([episode])).toHaveLength(2);
    expect(skillsNamed([ep({ skills: ["unknown"] })])).toEqual([]);
  });
});
