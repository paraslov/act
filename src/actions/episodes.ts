"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import {
  clarifyEpisodeSchema,
  createEpisodeSchema,
  updateEpisodeSchema,
} from "@/lib/act/episode-input";
import type { Episode } from "@/lib/act/types";
import {
  clarifyEpisode,
  createEpisode,
  updateEpisode,
} from "@/lib/db/episodes";

export type CreateEpisodeActionInput = z.input<typeof createEpisodeSchema>;
export type UpdateEpisodeActionInput = z.input<typeof updateEpisodeSchema>;
export type ClarifyEpisodeActionInput = z.input<typeof clarifyEpisodeSchema>;

function refreshEpisodes() {
  for (const path of ["/", "/episodes", "/journal", "/progress"])
    revalidatePath(path);
}

export async function createEpisodeAction(
  input: CreateEpisodeActionInput,
): Promise<Episode> {
  const episode = await createEpisode(createEpisodeSchema.parse(input));
  refreshEpisodes();
  return episode;
}

export async function updateEpisodeAction(
  input: UpdateEpisodeActionInput,
): Promise<Episode> {
  const episode = await updateEpisode(updateEpisodeSchema.parse(input));
  refreshEpisodes();
  return episode;
}

export async function clarifyEpisodeAction(
  input: ClarifyEpisodeActionInput,
): Promise<Episode> {
  const episode = await clarifyEpisode(clarifyEpisodeSchema.parse(input));
  refreshEpisodes();
  return episode;
}
