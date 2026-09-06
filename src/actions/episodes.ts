"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AXES, HOOK_TYPES, SKILLS, STATES } from "@/lib/act/constants";
import { todayId } from "@/lib/act/date";
import type { Episode } from "@/lib/act/types";
import { createEpisode } from "@/lib/db/episodes";

const daySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((day) => {
    const [year, month, date] = day.split("-").map(Number);
    const value = new Date(Date.UTC(year, month - 1, date));
    return value.toISOString().slice(0, 10) === day;
  }, "Enter a valid calendar date");

const textSchema = z.string().trim().max(10_000);
const optionalTextSchema = textSchema.optional().default("");
const checkScoreSchema = z.union([z.literal(0), z.literal(1), z.literal(2)]);
const checksShape = Object.fromEntries(
  AXES.map((axis) => [axis.id, checkScoreSchema.optional()]),
) as Record<
  (typeof AXES)[number]["id"],
  z.ZodOptional<typeof checkScoreSchema>
>;

const createEpisodeSchema = z.object({
  day: daySchema.optional().transform((day) => day ?? todayId()),
  band: z
    .number()
    .int()
    .min(0)
    .max(7)
    .optional()
    .transform((band) => band ?? Math.floor(new Date().getUTCHours() / 3)),
  dir: z.enum(["toward", "away"]).optional().default("toward"),
  hook: textSchema.min(1, "Describe what caught you"),
  hookType: z
    .enum(HOOK_TYPES.map((type) => type.id))
    .optional()
    .default("thought"),
  situation: optionalTextSchema,
  state: z
    .enum(["none", ...STATES.map((state) => state.id)])
    .optional()
    .default("none"),
  skill: z
    .enum(["none", ...SKILLS.map((skill) => skill.id)])
    .optional()
    .default("none"),
  value: optionalTextSchema.transform((value) => value || "—"),
  move: optionalTextSchema.transform((value) => value || "—"),
  workable: optionalTextSchema.transform((value) => value || "—"),
  checks: z.object(checksShape).optional().default({}),
});

export type CreateEpisodeActionInput = z.input<typeof createEpisodeSchema>;

/** Validates and persists a new episode, then refreshes every derived view. */
export async function createEpisodeAction(
  input: CreateEpisodeActionInput,
): Promise<Episode> {
  const episode = await createEpisode(createEpisodeSchema.parse(input));

  revalidatePath("/");
  revalidatePath("/episodes");
  revalidatePath("/journal");
  revalidatePath("/progress");

  return episode;
}
