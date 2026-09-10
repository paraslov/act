import "server-only";

import type { z } from "zod";
import { filterEpisodes } from "@/lib/act/derive";
import {
  clarifyEpisodeSchema,
  createEpisodeSchema,
  updateEpisodeSchema,
} from "@/lib/act/episode-input";
import type {
  Checks,
  Episode,
  EpisodeActivity,
  EpisodeDir,
  EpisodeFilters,
  PersonalValueSnapshot,
} from "@/lib/act/types";
import { resolveOwnedActiveSnapshot } from "@/lib/db/personal-values";
import { withCurrentUserDb } from "@/lib/db/user-context";
import { postgresDateValue } from "@/lib/db/values";

type EpisodeRow = {
  id: string;
  user_id: string;
  day: string | Date;
  band: number;
  dir: EpisodeDir;
  weight: number;
  hook: string;
  hook_type: Episode["hookType"];
  situation: string;
  state: Episode["state"];
  skill: Episode["skill"];
  value: string;
  move: string;
  workable: string;
  checks: Checks;
  value_id: string | null;
  value_snapshot: PersonalValueSnapshot | null;
  behavior_status: Episode["behaviorStatus"];
  consequence_status: Episode["consequenceStatus"];
  immediate_outcome: string;
  later_consequences: string;
  intended_function: string;
  next_experiment: string;
  interpretation: string;
  schema_version: 1 | 2;
  states: Episode["states"];
  skills: Episode["skills"];
  event_timezone: string | null;
  legacy_snapshot: Record<string, unknown> | null;
  created_at: string | Date;
  updated_at: string | Date;
};

export type CreateEpisodeInput = z.input<typeof createEpisodeSchema>;
export type UpdateEpisodeInput = z.input<typeof updateEpisodeSchema>;
const episodeColumns = `
  id, user_id, day, band, dir, weight, hook, hook_type, situation,
  state, skill, value, move, workable, checks, value_id, value_snapshot,
  behavior_status, consequence_status, immediate_outcome, later_consequences,
  intended_function, next_experiment, interpretation, schema_version, states,
  skills, event_timezone, legacy_snapshot, created_at, updated_at
`;

function timestampValue(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

function mapEpisode(row: EpisodeRow): Episode {
  return {
    id: row.id,
    userId: row.user_id,
    day: postgresDateValue(row.day),
    band: row.band,
    dir: row.dir,
    weight: row.weight,
    behaviorStatus: row.behavior_status,
    consequenceStatus: row.consequence_status,
    immediateOutcome: row.immediate_outcome,
    laterConsequences: row.later_consequences,
    intendedFunction: row.intended_function,
    nextExperiment: row.next_experiment,
    interpretation: row.interpretation,
    schemaVersion: row.schema_version,
    states: row.states,
    skills: row.skills,
    eventTimezone: row.event_timezone,
    legacySnapshot: row.legacy_snapshot,
    hook: row.hook,
    hookType: row.hook_type,
    situation: row.situation,
    state: row.state,
    skill: row.skill,
    value: row.value,
    move: row.move,
    workable: row.workable,
    checks: row.checks ?? {},
    valueId: row.value_id,
    valueSnapshot: row.value_snapshot,
    createdAt: timestampValue(row.created_at),
    updatedAt: timestampValue(row.updated_at),
  };
}

/** Lists the current user's episodes newest-first, with optional view filters. */
export async function listEpisodes(
  filters: EpisodeFilters = {},
): Promise<Episode[]> {
  return withCurrentUserDb(async (client) => {
    const result = await client.query<EpisodeRow>(
      `SELECT ${episodeColumns}
         FROM episodes
        ORDER BY day DESC, created_at DESC, id DESC`,
    );

    return filterEpisodes(result.rows.map(mapEpisode), filters);
  });
}

/** Minimal list used to derive shell-level record counts and returning-to-practice summaries. */
export async function listEpisodeActivity(): Promise<EpisodeActivity[]> {
  return withCurrentUserDb(async (client) => {
    const result = await client.query<
      Pick<EpisodeRow, "day" | "dir" | "behavior_status" | "schema_version">
    >("SELECT day, dir, behavior_status, schema_version FROM episodes");
    return result.rows.map((row) => ({
      day: postgresDateValue(row.day),
      dir: row.dir,
      behaviorStatus: row.behavior_status,
      schemaVersion: row.schema_version,
    }));
  });
}

/** Lists the current user's episodes for one calendar day, newest-first. */
export async function getEpisodesForDay(day: string): Promise<Episode[]> {
  return withCurrentUserDb(async (client) => {
    const result = await client.query<EpisodeRow>(
      `SELECT ${episodeColumns}
         FROM episodes
        WHERE day = $1::date
        ORDER BY created_at DESC, id DESC`,
      [day],
    );

    return result.rows.map(mapEpisode);
  });
}

/** Creates one episode owned by the current user and returns its public shape. */
export async function createEpisode(raw: CreateEpisodeInput): Promise<Episode> {
  const input = createEpisodeSchema.parse(raw);
  return withCurrentUserDb(async (client, userId) => {
    // Ownership and active status are validated here rather than by a foreign key,
    // in the same transaction as the insert that stores the resulting snapshot.
    const snapshot = input.valueId
      ? await resolveOwnedActiveSnapshot(client, input.valueId)
      : null;
    // Own words win: the free-text `value` column keeps whatever was typed, and
    // a linked value only fills it when nothing was. Search scans this column
    // plus the snapshot title, so both stay findable either way.
    const value = input.value?.trim() ? input.value : (snapshot?.title ?? "");

    const result = await client.query<EpisodeRow>(
      `INSERT INTO episodes (
         user_id, day, band, dir, weight, hook, hook_type, situation,
         state, skill, value, move, workable, checks, value_id, value_snapshot,
         behavior_status, consequence_status, immediate_outcome, later_consequences,
         intended_function, next_experiment, interpretation, states, skills
       ) VALUES (
         $1, $2::date, $3, $4, $5, $6, $7, $8,
         $9, $10, $11, $12, $13, $14::jsonb, $15, $16::jsonb,
         $17, $18, $19, $20, $21, $22, $23, $24::text[], $25::text[]
       )
       RETURNING ${episodeColumns}`,
      [
        userId,
        input.day,
        input.band,
        input.dir,
        1,
        input.hook,
        input.hookType,
        input.situation ?? "",
        input.states.find((id) => !["unknown", "none-noticed"].includes(id)) ??
          null,
        input.skills.find((id) => !["unknown", "no-skill"].includes(id)) ??
          null,
        value,
        input.move ?? "",
        input.workable ?? "",
        JSON.stringify(input.checks ?? {}),
        snapshot?.valueId ?? null,
        snapshot ? JSON.stringify(snapshot) : null,
        input.behaviorStatus,
        input.consequenceStatus,
        input.immediateOutcome,
        input.laterConsequences,
        input.intendedFunction,
        input.nextExperiment,
        input.interpretation,
        input.states,
        input.skills,
      ],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error("Episode insert did not return a row");
    }
    return mapEpisode(row);
  });
}

/** Fetches one episode owned by the current user, or null if it does not exist. */
export async function getEpisode(id: string): Promise<Episode | null> {
  return withCurrentUserDb(async (client) => {
    const result = await client.query<EpisodeRow>(
      `SELECT ${episodeColumns} FROM episodes WHERE id = $1`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapEpisode(row) : null;
  });
}

const scalarState = (states: UpdateEpisodeInput["states"]) =>
  states?.find((id) => !["unknown", "none-noticed"].includes(id)) ?? null;
const scalarSkill = (skills: UpdateEpisodeInput["skills"]) =>
  skills?.find((id) => !["unknown", "no-skill"].includes(id)) ?? null;

/**
 * Revises an owned episode in place (A19/T17): `created_at` is preserved, only
 * `updated_at` is bumped, and no new record is created. The value snapshot is
 * re-resolved only when `valueId` actually changes — an unchanged link keeps the
 * frozen snapshot untouched (T16).
 */
export async function updateEpisode(raw: UpdateEpisodeInput): Promise<Episode> {
  const input = updateEpisodeSchema.parse(raw);
  return withCurrentUserDb(async (client) => {
    const current = await client.query<EpisodeRow>(
      `SELECT ${episodeColumns} FROM episodes WHERE id = $1`,
      [input.id],
    );
    const existing = current.rows[0];
    if (!existing) throw new Error("Episode is unavailable");
    // Never rewrite legacy history in place; those rows go through clarification.
    if (existing.schema_version !== 2)
      throw new Error("Clarify this legacy entry before editing it");

    // T16: only an explicit relink touches the snapshot; otherwise it is frozen.
    const relink =
      input.valueId !== undefined && input.valueId !== existing.value_id;
    const snapshot = relink
      ? input.valueId
        ? await resolveOwnedActiveSnapshot(client, input.valueId)
        : null
      : existing.value_snapshot;
    const valueId = relink ? (snapshot?.valueId ?? null) : existing.value_id;
    const value = input.value?.trim() ? input.value : (snapshot?.title ?? "");

    const result = await client.query<EpisodeRow>(
      `UPDATE episodes SET
         day = $2::date, band = $3, dir = $4, hook = $5, hook_type = $6,
         situation = $7, state = $8, skill = $9, value = $10, move = $11,
         workable = $12, checks = $13::jsonb, value_id = $14, value_snapshot = $15::jsonb,
         behavior_status = $16, consequence_status = $17, immediate_outcome = $18,
         later_consequences = $19, intended_function = $20, next_experiment = $21,
         interpretation = $22, states = $23::text[], skills = $24::text[],
         updated_at = now()
       WHERE id = $1
       RETURNING ${episodeColumns}`,
      [
        input.id,
        input.day,
        input.band,
        input.dir,
        input.hook,
        input.hookType,
        input.situation ?? "",
        scalarState(input.states),
        scalarSkill(input.skills),
        value,
        input.move ?? "",
        input.workable ?? "",
        JSON.stringify(input.checks ?? {}),
        valueId,
        snapshot ? JSON.stringify(snapshot) : null,
        input.behaviorStatus,
        input.consequenceStatus,
        input.immediateOutcome,
        input.laterConsequences,
        input.intendedFunction,
        input.nextExperiment,
        input.interpretation,
        input.states,
        input.skills,
      ],
    );
    const row = result.rows[0];
    if (!row) throw new Error("Episode is unavailable");
    return mapEpisode(row);
  });
}

/** Clarifies an owned legacy record in place while freezing its original row. */
export async function clarifyEpisode(
  raw: z.input<typeof clarifyEpisodeSchema>,
): Promise<Episode> {
  const input = clarifyEpisodeSchema.parse(raw);
  return withCurrentUserDb(async (client) => {
    const result = await client.query<EpisodeRow>(
      `
      UPDATE episodes AS e SET
        legacy_snapshot = COALESCE(legacy_snapshot, to_jsonb(e) - 'legacy_snapshot'),
        dir = $2, behavior_status = $3, move = $4, checks = $5::jsonb,
        schema_version = 2, updated_at = now()
      WHERE id = $1 AND schema_version = 1
      RETURNING ${episodeColumns}
    `,
      [
        input.id,
        input.dir,
        input.behaviorStatus,
        input.move,
        JSON.stringify(input.checks),
      ],
    );
    const row = result.rows[0];
    if (!row)
      throw new Error("Legacy episode is unavailable or already clarified");
    return mapEpisode(row);
  });
}
