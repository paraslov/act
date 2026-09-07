import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Episode, PersonalValueSnapshot } from "@/lib/act/types";
import { createEpisode } from "@/lib/db/episodes";
import { createEpisodeAction } from "./episodes";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/db/episodes", () => ({ createEpisode: vi.fn() }));

describe("createEpisodeAction optional status and skill", () => {
  beforeEach(() => vi.clearAllMocks());

  it("persists absence when both fields are omitted", async () => {
    await createEpisodeAction({ hook: "A moment from today" });
    expect(createEpisode).toHaveBeenCalledWith(
      expect.objectContaining({ state: "none", skill: "none" }),
    );
  });

  it.each([
    ["none", "none"],
    ["none", "defuse"],
    ["fusion", "none"],
    ["fusion", "defuse"],
  ] as const)(
    "persists status %s and skill %s independently",
    async (state, skill) => {
      await createEpisodeAction({ hook: "A moment from today", state, skill });
      expect(createEpisode).toHaveBeenCalledWith(
        expect.objectContaining({ state, skill }),
      );
    },
  );

  it("still rejects unknown choices before persistence", async () => {
    await expect(
      createEpisodeAction({
        hook: "A moment from today",
        // @ts-expect-error Invalid input can arrive from clients at runtime.
        state: "invalid",
      }),
    ).rejects.toThrow();
    expect(createEpisode).not.toHaveBeenCalled();
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
