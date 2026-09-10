import { randomUUID } from "node:crypto";
import { Client } from "pg";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { requireCurrentUser } from "@/auth/session";
import { getPool } from "@/lib/db/client";
import { getDayEntry, upsertDayEntry } from "@/lib/db/day-entries";
import {
  clarifyEpisode,
  createEpisode,
  getEpisodesForDay,
  listEpisodeActivity,
} from "@/lib/db/episodes";
import {
  createPersonalValue,
  getPersonalValue,
  listPersonalValues,
  setPersonalValueArchived,
  UnavailableValueError,
  updatePersonalValue,
} from "@/lib/db/personal-values";

// Only the Next.js authentication boundary is mocked. The real repositories,
// transaction wrapper, runtime role check and snapshot resolver use PostgreSQL.
// Like the .mjs DB tests, this suite never loads .env.local.
vi.mock("server-only", () => ({}));
vi.mock("@/auth/session", () => ({ requireCurrentUser: vi.fn() }));

const day = "2026-09-01";
const episodeInput = {
  day,
  band: 2,
  dir: "away" as const,
  hook: "A difficult conversation",
  states: [],
  skills: [],
  value: "My own words",
  move: "Ask for time",
};
const valueInput = {
  title: "Be honest and warm",
  meaning: "Say what matters with care",
  domains: ["relationships", "work_education"] as (
    | "relationships"
    | "work_education"
  )[],
  examples: ["Ask a sincere question"],
};

describe("personal values through real user-scoped repositories", () => {
  let admin: Client;
  let users: string[] = [];

  function signIn(id: string) {
    vi.mocked(requireCurrentUser).mockResolvedValue({
      id,
      email: `${id}@example.test`,
    });
  }

  beforeAll(async () => {
    expect(
      process.env.DATABASE_ADMIN_URL,
      "Set DATABASE_ADMIN_URL",
    ).toBeTruthy();
    expect(process.env.DATABASE_URL, "Set DATABASE_URL").toBeTruthy();
    admin = new Client({ connectionString: process.env.DATABASE_ADMIN_URL });
    await admin.connect();
  });

  beforeEach(async () => {
    users = [randomUUID(), randomUUID()];
    for (const id of users) {
      await admin.query(
        "INSERT INTO users (id, email, password_hash) VALUES ($1, $2, 'test-only')",
        [id, `${id}@example.test`],
      );
    }
    signIn(users[0]);
  });

  afterEach(async () => {
    await admin.query("DELETE FROM users WHERE id = ANY($1::uuid[])", [users]);
    vi.resetAllMocks();
  });

  afterAll(async () => {
    await getPool().end();
    await admin?.end();
  });

  it("refuses to read, edit, archive or attach another user's value", async () => {
    const foreign = await createPersonalValue(valueInput);
    signIn(users[1]);
    await upsertDayEntry(day, { morning: { toward: "Keep this draft" } });

    expect(await getPersonalValue(foreign.id)).toBeNull();
    expect(await listPersonalValues({ includeArchived: true })).toEqual([]);
    expect(
      await updatePersonalValue(foreign.id, {
        ...valueInput,
        title: "Forbidden",
      }),
    ).toBeNull();
    expect(await setPersonalValueArchived(foreign.id, true)).toBeNull();
    await expect(
      createEpisode({ ...episodeInput, valueId: foreign.id }),
    ).rejects.toBeInstanceOf(UnavailableValueError);
    await expect(
      upsertDayEntry(day, {
        morning: { toward: "Must not overwrite" },
        morningSelection: { valueId: foreign.id },
      }),
    ).rejects.toBeInstanceOf(UnavailableValueError);
    expect(await getEpisodesForDay(day)).toEqual([]);
    expect((await getDayEntry(day))?.morning).toEqual({
      toward: "Keep this draft",
    });

    signIn(users[0]);
    expect(await getPersonalValue(foreign.id)).toEqual(foreign);
  });

  it.each(["archived", "missing"] as const)(
    "rejects a %s value without writing either entry",
    async (kind) => {
      let valueId: string = randomUUID();
      if (kind === "archived") {
        const value = await createPersonalValue(valueInput);
        valueId = value.id;
        await setPersonalValueArchived(valueId, true);
      }
      await expect(
        createEpisode({ ...episodeInput, valueId }),
      ).rejects.toBeInstanceOf(UnavailableValueError);
      await expect(
        upsertDayEntry(day, { morningSelection: { valueId } }),
      ).rejects.toBeInstanceOf(UnavailableValueError);
      expect(await getEpisodesForDay(day)).toEqual([]);
      expect(await getDayEntry(day)).toBeNull();
    },
  );

  it("stores snapshots and preserves own words and away direction after edit/archive/restore", async () => {
    const value = await createPersonalValue(valueInput);
    const snapshot = {
      valueId: value.id,
      title: valueInput.title,
      meaning: valueInput.meaning,
      domains: valueInput.domains,
    };
    const morning = await upsertDayEntry(day, {
      morning: { toward: "Ask with care" },
      morningSelection: { valueId: value.id },
    });
    const episode = await createEpisode({ ...episodeInput, valueId: value.id });
    expect(morning.morning).toEqual({
      toward: "Ask with care",
      valueId: value.id,
      valueSnapshot: snapshot,
    });
    expect(episode).toMatchObject({
      ...episodeInput,
      valueId: value.id,
      valueSnapshot: snapshot,
    });

    await updatePersonalValue(value.id, {
      title: "Make room for rest",
      meaning: "Slow down",
      domains: ["leisure"],
    });
    for (const archived of [true, false]) {
      await setPersonalValueArchived(value.id, archived);
      expect(await getDayEntry(day)).toEqual(morning);
      expect(await getEpisodesForDay(day)).toEqual([episode]);
      expect(await listPersonalValues()).toHaveLength(archived ? 0 : 1);
      expect(await listPersonalValues({ includeArchived: true })).toHaveLength(
        1,
      );
    }
    const next = await createEpisode({ ...episodeInput, valueId: value.id });
    expect(next.valueSnapshot).toEqual({
      valueId: value.id,
      title: "Make room for rest",
      meaning: "Slow down",
      domains: ["leisure"],
    });
  });

  it("preserves omitted selections, changes them explicitly and clears only the link", async () => {
    const first = await createPersonalValue(valueInput);
    const second = await createPersonalValue({
      title: "Play freely",
      domains: ["leisure"],
    });
    const saved = await upsertDayEntry(day, {
      morning: {
        open: "Make room",
        aware: "Notice",
        engaged: "Listen",
        toward: "Ask",
      },
      evening: { flex: "Keep this too" },
      morningSelection: { valueId: first.id },
    });
    await updatePersonalValue(first.id, {
      ...valueInput,
      title: "New wording",
    });
    await setPersonalValueArchived(first.id, true);
    const edited = await upsertDayEntry(day, {
      morning: { toward: "Ask again" },
    });
    expect(edited.morning).toEqual({ ...saved.morning, toward: "Ask again" });
    expect(edited.evening).toEqual(saved.evening);
    const changed = await upsertDayEntry(day, {
      morningSelection: { valueId: second.id },
    });
    expect(changed.morning).toEqual({
      ...edited.morning,
      valueId: second.id,
      valueSnapshot: {
        valueId: second.id,
        title: second.title,
        meaning: second.meaning,
        domains: second.domains,
      },
    });
    const cleared = await upsertDayEntry(day, {
      morningSelection: { clear: true },
    });
    expect(cleared.morning).toEqual({
      ...edited.morning,
      valueId: null,
      valueSnapshot: null,
    });
    expect(cleared.evening).toEqual(saved.evening);
    expect(await getDayEntry(day)).toEqual(cleared);
  });

  it.each([undefined, null])(
    "saves without a map or link (%s)",
    async (valueId) => {
      const episode = await createEpisode({ ...episodeInput, valueId });
      expect(episode).toMatchObject({
        ...episodeInput,
        valueId: null,
        valueSnapshot: null,
      });
      expect(await getEpisodesForDay(day)).toEqual([episode]);
      const saved = await upsertDayEntry(day, {
        morning: { toward: "My action" },
      });
      expect(saved.morning).toEqual({ toward: "My action" });
    },
  );

  it("round-trips minimal and completed episodes without fabricating answers", async () => {
    const note = await createEpisode({ day, hook: "Just a thought" });
    expect(note).toMatchObject({
      dir: "unknown",
      behaviorStatus: "not-described",
      hookType: null,
      states: [],
      skills: [],
      state: null,
      skill: null,
      checks: {},
      schemaVersion: 2,
      eventTimezone: null,
      value: "",
      move: "",
      workable: "",
    });
    const action = await createEpisode({
      day,
      move: "Stopped work",
      dir: "mixed",
      behaviorStatus: "acted",
      states: ["fusion", "avoidance"],
      skills: ["notice", "commit"],
      checks: { awareness: null, openness: 0 },
      immediateOutcome: "Had a break",
      laterConsequences: "",
      consequenceStatus: "observed",
    });
    expect(
      (await getEpisodesForDay(day)).find((e) => e.id === action.id),
    ).toEqual(action);
    expect(action.checks).toEqual({ awareness: null, openness: 0 });
    expect(await listEpisodeActivity()).toEqual(
      expect.arrayContaining([
        {
          day,
          dir: "unknown",
          behaviorStatus: "not-described",
          schemaVersion: 2,
        },
        { day, dir: "mixed", behaviorStatus: "acted", schemaVersion: 2 },
      ]),
    );
  });

  it("clarifies an owned legacy row once, preserving the original and value snapshot", async () => {
    const value = await createPersonalValue(valueInput);
    const row = await createEpisode({
      day,
      hook: "A legacy moment",
      valueId: value.id,
    });
    await admin.query(
      `UPDATE episodes SET schema_version = 1, dir = 'toward', state = 'none', skill = 'commit',
      states = ARRAY['none'], skills = ARRAY['commit'], checks = '{"awareness":0,"action":2}', move = '—' WHERE id = $1`,
      [row.id],
    );
    const original = (
      await admin.query(
        "SELECT to_jsonb(e) - 'legacy_snapshot' AS entry FROM episodes e WHERE id = $1",
        [row.id],
      )
    ).rows[0].entry;
    await updatePersonalValue(value.id, { ...valueInput, title: "New title" });
    const input = {
      id: row.id,
      dir: "mixed" as const,
      behaviorStatus: "acted" as const,
      move: "Rested",
      checks: { awareness: null, openness: 0 as const },
    };
    signIn(users[1]);
    await expect(clarifyEpisode(input)).rejects.toThrow("unavailable");
    signIn(users[0]);
    const clarified = await clarifyEpisode(input);
    expect(clarified).toMatchObject({
      id: row.id,
      dir: "mixed",
      behaviorStatus: "acted",
      move: "Rested",
      schemaVersion: 2,
      states: ["none"],
      skills: ["commit"],
      createdAt: row.createdAt,
      valueSnapshot: row.valueSnapshot,
      legacySnapshot: original,
      eventTimezone: null,
      checks: input.checks,
    });
    expect(clarified.updatedAt >= row.updatedAt).toBe(true);
    expect(await getEpisodesForDay(day)).toHaveLength(1);
    await expect(clarifyEpisode(input)).rejects.toThrow("already clarified");
    expect((await getEpisodesForDay(day))[0].legacySnapshot).toEqual(original);
  });
});
