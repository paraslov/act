import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Episode, PersonalValueSnapshot } from "@/lib/act/types";
import {
  clarifyEpisode,
  createEpisode,
  updateEpisode,
} from "@/lib/db/episodes";
import {
  clarifyEpisodeAction,
  createEpisodeAction,
  updateEpisodeAction,
} from "./episodes";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/db/episodes", () => ({
  createEpisode: vi.fn(),
  clarifyEpisode: vi.fn(),
  updateEpisode: vi.fn(),
}));

const anId = "b30b4967-71aa-48d1-95b9-aaab76e826ae";

describe("createEpisodeAction integrity", () => {
  beforeEach(() => vi.resetAllMocks());
  it("saves a hook-only entry without inventing facts", async () => {
    await createEpisodeAction({ hook: "A moment" });
    expect(createEpisode).toHaveBeenCalledWith(
      expect.objectContaining({
        dir: "unknown",
        behaviorStatus: "not-described",
        hookType: null,
        checks: {},
        states: [],
        skills: [],
        value: "",
        move: "",
        workable: "",
        consequenceStatus: "unknown",
        immediateOutcome: "",
        laterConsequences: "",
      }),
    );
  });
  it.each([{ situation: "A conversation" }, { move: "Rested" }])(
    "accepts any one descriptive field: %j",
    async (input) => {
      await createEpisodeAction(input);
      expect(createEpisode).toHaveBeenCalledOnce();
    },
  );
  it.each([
    {},
    { hook: "  ", situation: "\n", move: " " },
    { value: "Care" },
    { checks: { awareness: 2 as const } },
    { hook: "Thought", behaviorStatus: "acted" as const },
    { hook: "Thought", behaviorStatus: "acted" as const, move: "  " },
  ])(
    "rejects empty descriptions or unconfirmed action text: %j",
    async (input) => {
      await expect(createEpisodeAction(input)).rejects.toThrow();
      expect(createEpisode).not.toHaveBeenCalled();
    },
  );
  it("preserves explicit zeros and nulls, multi-selections and independent direction", async () => {
    await createEpisodeAction({
      move: "Stopped work",
      behaviorStatus: "acted",
      dir: "mixed",
      states: ["fusion", "avoidance"],
      skills: ["notice", "commit"],
      checks: { awareness: 0, action: null },
    });
    expect(createEpisode).toHaveBeenCalledWith(
      expect.objectContaining({
        dir: "mixed",
        checks: { awareness: 0, action: null },
        states: ["fusion", "avoidance"],
        skills: ["notice", "commit"],
      }),
    );
  });
  it.each([
    { states: ["unknown"] },
    { states: ["none-noticed"] },
    { skills: ["unknown"] },
    { skills: ["no-skill"] },
  ])("preserves explicit absence: %j", async (input) => {
    await createEpisodeAction({ hook: "A moment", ...input } as Parameters<
      typeof createEpisodeAction
    >[0]);
    expect(createEpisode).toHaveBeenCalledWith(expect.objectContaining(input));
  });
  it.each([
    { states: ["unknown", "fusion"] },
    { states: ["none-noticed", "unknown"] },
    { skills: ["no-skill", "commit"] },
    { skills: ["unknown", "no-skill"] },
    { states: ["none"] },
    { skills: ["none"] },
    { skills: ["notice", "notice"] },
    { states: ["invalid"] },
    { dir: "invalid" },
    { day: "2026-02-30" },
    { checks: { awareness: 3 } },
    { state: "none" },
  ])(
    "rejects conflicting, legacy or invalid inputs before persistence: %j",
    async (input) => {
      await expect(
        createEpisodeAction({ hook: "A moment", ...input } as Parameters<
          typeof createEpisodeAction
        >[0]),
      ).rejects.toThrow();
      expect(createEpisode).not.toHaveBeenCalled();
    },
  );
  it("does not infer Toward from a selected skill", async () => {
    await createEpisodeAction({ hook: "A plan", skills: ["commit"] });
    expect(createEpisode).toHaveBeenCalledWith(
      expect.objectContaining({
        dir: "unknown",
        behaviorStatus: "not-described",
      }),
    );
  });
});

describe("createEpisodeAction linked values", () => {
  const valueId = "b30b4967-71aa-48d1-95b9-aaab76e826ae";
  const valueSnapshot: PersonalValueSnapshot = {
    valueId,
    title: "Be honest and warm",
    meaning: "Say what matters with care",
    domains: ["relationships", "work_education"],
  };

  beforeEach(() => vi.resetAllMocks());

  it.each(["toward", "away"] as const)(
    "passes the link and own words independently of %s direction and returns the stored snapshot",
    async (dir) => {
      const saved: Episode = {
        id: "episode-id",
        userId: "user-id",
        day: "2026-09-01",
        band: 2,
        dir,
        weight: 1,
        behaviorStatus: "not-described",
        schemaVersion: 2,
        states: [],
        skills: [],
        consequenceStatus: "unknown",
        immediateOutcome: "",
        laterConsequences: "",
        intendedFunction: "",
        nextExperiment: "",
        interpretation: "",
        eventTimezone: null,
        legacySnapshot: null,
        hook: "A difficult conversation",
        hookType: "thought",
        situation: "",
        state: "none",
        skill: "none",
        value: "My own words for today",
        move: "Ask for time",
        workable: "—",
        checks: {},
        valueId,
        valueSnapshot,
        createdAt: "2026-09-01T00:00:00Z",
        updatedAt: "2026-09-01T00:00:00Z",
      };
      vi.mocked(createEpisode).mockResolvedValueOnce(saved);

      const result = await createEpisodeAction({
        day: saved.day,
        hook: saved.hook,
        dir,
        valueId,
        value: saved.value,
        move: saved.move,
      });

      expect(createEpisode).toHaveBeenCalledWith(
        expect.objectContaining({
          day: saved.day,
          dir,
          valueId,
          value: saved.value,
          move: saved.move,
        }),
      );
      expect(createEpisode).toHaveBeenCalledTimes(1);
      expect(result).toEqual(saved);
    },
  );

  it.each([undefined, null])("allows an absent link (%s)", async (valueId) => {
    await createEpisodeAction({ hook: "A moment", valueId });
    expect(createEpisode).toHaveBeenCalledWith(
      expect.objectContaining({ valueId }),
    );
  });

  it("rejects a malformed value id before persistence", async () => {
    await expect(
      createEpisodeAction({ hook: "A moment", valueId: "not-a-uuid" }),
    ).rejects.toThrow();
    expect(createEpisode).not.toHaveBeenCalled();
  });

  it("propagates an unavailable value error so the caller can retry", async () => {
    const error = new Error("Value is unavailable");
    vi.mocked(createEpisode).mockRejectedValueOnce(error);
    await expect(
      createEpisodeAction({ hook: "A moment", valueId }),
    ).rejects.toBe(error);
  });
});

describe("legacy clarification action", () => {
  beforeEach(() => vi.resetAllMocks());
  const input = {
    id: "b30b4967-71aa-48d1-95b9-aaab76e826ae",
    dir: "unknown" as const,
    behaviorStatus: "not-described" as const,
    move: "",
    checks: { awareness: null },
  };
  it("updates the existing entry instead of creating another one", async () => {
    await clarifyEpisodeAction(input);
    expect(clarifyEpisode).toHaveBeenCalledWith(input);
    expect(createEpisode).not.toHaveBeenCalled();
  });
  it("requires action text for explicit completion", async () => {
    await expect(
      clarifyEpisodeAction({ ...input, behaviorStatus: "acted" }),
    ).rejects.toThrow();
    expect(clarifyEpisode).not.toHaveBeenCalled();
  });
});

describe("updateEpisodeAction (A19/T17)", () => {
  beforeEach(() => vi.resetAllMocks());
  it("revises an existing entry, carrying id and later consequences through", async () => {
    await updateEpisodeAction({
      id: anId,
      situation: "A hard call",
      dir: "toward",
      laterConsequences: "Slept better",
      consequenceStatus: "observed",
    });
    expect(updateEpisode).toHaveBeenCalledWith(
      expect.objectContaining({
        id: anId,
        dir: "toward",
        laterConsequences: "Slept better",
        consequenceStatus: "observed",
      }),
    );
    expect(createEpisode).not.toHaveBeenCalled();
  });
  it("requires the id and at least one described field", async () => {
    await expect(
      updateEpisodeAction({ situation: "x" } as never),
    ).rejects.toThrow();
    await expect(updateEpisodeAction({ id: anId } as never)).rejects.toThrow();
    await expect(
      updateEpisodeAction({
        id: anId,
        hook: "Thought",
        behaviorStatus: "acted",
      }),
    ).rejects.toThrow();
    expect(updateEpisode).not.toHaveBeenCalled();
  });
});
