import { beforeEach, describe, expect, it, vi } from "vitest";
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
