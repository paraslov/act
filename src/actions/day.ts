"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { DayEntry } from "@/lib/act/types";
import { upsertDayEntry } from "@/lib/db/day-entries";

const daySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((day) => {
    const [year, month, date] = day.split("-").map(Number);
    const value = new Date(Date.UTC(year, month - 1, date));
    return value.toISOString().slice(0, 10) === day;
  }, "Enter a valid calendar date");

const fieldSchema = z.string().trim().max(10_000).optional();

const morningSchema = z.object({
  open: fieldSchema,
  aware: fieldSchema,
  engaged: fieldSchema,
  toward: fieldSchema,
});

const eveningSchema = z.object({
  hook: fieldSchema,
  away: fieldSchema,
  flex: fieldSchema,
  next: fieldSchema,
});

const saveMorningSchema = z.object({
  day: daySchema,
  morning: morningSchema,
});

const saveEveningSchema = z.object({
  day: daySchema,
  evening: eveningSchema,
});

export type SaveMorningActionInput = z.input<typeof saveMorningSchema>;
export type SaveEveningActionInput = z.input<typeof saveEveningSchema>;

/** Saves the morning half of a day without disturbing its evening reflection. */
export async function saveMorningAction(
  input: SaveMorningActionInput,
): Promise<DayEntry> {
  const { day, morning } = saveMorningSchema.parse(input);
  const entry = await upsertDayEntry(day, { morning });
  revalidatePath("/");
  return entry;
}

/** Saves the evening half of a day without disturbing its morning intentions. */
export async function saveEveningAction(
  input: SaveEveningActionInput,
): Promise<DayEntry> {
  const { day, evening } = saveEveningSchema.parse(input);
  const entry = await upsertDayEntry(day, { evening });
  revalidatePath("/");
  return entry;
}
