"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DOMAINS } from "@/lib/act/constants";
import type { PersonalValue } from "@/lib/act/types";
import {
  createPersonalValue,
  setPersonalValueArchived,
  updatePersonalValue,
} from "@/lib/db/personal-values";

const domainSchema = z.enum(DOMAINS.map((domain) => domain.id));

const valueFieldsSchema = z.object({
  title: z.string().trim().min(1, "Name the value in your own words").max(200),
  // A value belongs to at least one area; the same record can sit in several,
  // and a repeated id would only render the one card twice in one section.
  domains: z
    .array(domainSchema)
    .min(1, "Choose at least one area of life")
    .transform((domains) => [...new Set(domains)]),
  meaning: z.string().trim().max(10_000).optional().default(""),
  // Empty example rows are dropped rather than rejected — the editor always
  // offers a spare row, and leaving it blank is not a mistake worth a message.
  examples: z
    .array(z.string().trim().max(10_000))
    .optional()
    .default([])
    .transform((examples) => examples.filter((example) => example.length > 0)),
});

const createValueSchema = valueFieldsSchema;
const updateValueSchema = valueFieldsSchema.extend({ id: z.uuid() });
const valueIdSchema = z.object({ id: z.uuid() });

export type CreateValueActionInput = z.input<typeof createValueSchema>;
export type UpdateValueActionInput = z.input<typeof updateValueSchema>;
export type ValueIdActionInput = z.input<typeof valueIdSchema>;

/**
 * `/` is revalidated alongside `/values` because the morning picker reads the
 * same list — a value created, renamed or archived here must not linger there.
 */
function revalidateValueSurfaces(): void {
  revalidatePath("/values");
  revalidatePath("/");
}

/** Adds one value to the current user's map. */
export async function createValueAction(
  input: CreateValueActionInput,
): Promise<PersonalValue> {
  const value = await createPersonalValue(createValueSchema.parse(input));
  revalidateValueSurfaces();
  return value;
}

/**
 * Rewrites one owned value. Snapshots already attached to a morning entry or an
 * episode keep the older wording, so history is not rewritten by an edit.
 */
export async function updateValueAction(
  input: UpdateValueActionInput,
): Promise<PersonalValue> {
  const { id, ...fields } = updateValueSchema.parse(input);
  const value = await updatePersonalValue(id, fields);
  if (!value) {
    throw new Error(`Value ${id} is not available to the current user`);
  }
  revalidateValueSurfaces();
  return value;
}

/** Takes one value out of circulation without deleting it — there is no delete. */
export async function archiveValueAction(
  input: ValueIdActionInput,
): Promise<PersonalValue> {
  return setArchived(input, true);
}

/** Puts an archived value back on the map and into the pickers. */
export async function restoreValueAction(
  input: ValueIdActionInput,
): Promise<PersonalValue> {
  return setArchived(input, false);
}

async function setArchived(
  input: ValueIdActionInput,
  archived: boolean,
): Promise<PersonalValue> {
  const { id } = valueIdSchema.parse(input);
  const value = await setPersonalValueArchived(id, archived);
  if (!value) {
    throw new Error(`Value ${id} is not available to the current user`);
  }
  revalidateValueSurfaces();
  return value;
}
