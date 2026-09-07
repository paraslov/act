import "server-only";

import type { HookType, SkillId, StateId } from "@/lib/act/constants";
import { filterEpisodes } from "@/lib/act/derive";
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
  hook_type: HookType;
  situation: string;
  state: StateId;
  skill: SkillId;
  value: string;
  move: string;
  workable: string;
  checks: Checks;
  value_id: string | null;
  value_snapshot: PersonalValueSnapshot | null;
  created_at: string | Date;
  updated_at: string | Date;
};

type EpisodeActivityRow = {
  day: string | Date;
  dir: EpisodeDir;
};

export type CreateEpisodeInput = {
  day: string;
  band: number;
  dir: EpisodeDir;
  weight?: number;
  hook: string;
  hookType?: HookType;
  situation?: string;
  state: StateId;
  skill: SkillId;
  value?: string;
  move?: string;
  workable?: string;
  checks?: Checks;
  /** Links one of the user's active values; its snapshot is stored with the row. */
  valueId?: string | null;
};

const episodeColumns = `
  id, user_id, day, band, dir, weight, hook, hook_type, situation,
  state, skill, value, move, workable, checks, value_id, value_snapshot,
  created_at, updated_at
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

/** Minimal list used to derive shell-level count and streak values. */
export async function listEpisodeActivity(): Promise<EpisodeActivity[]> {
  return withCurrentUserDb(async (client) => {
    const result = await client.query<EpisodeActivityRow>(
      "SELECT day, dir FROM episodes",
    );
    return result.rows.map((row) => ({
      day: postgresDateValue(row.day),
      dir: row.dir,
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
export async function createEpisode(
  input: CreateEpisodeInput,
): Promise<Episode> {
  return withCurrentUserDb(async (client, userId) => {
    // Ownership and active status are validated here rather than by a foreign key,
    // in the same transaction as the insert that stores the resulting snapshot.
    const snapshot = input.valueId
      ? await resolveOwnedActiveSnapshot(client, input.valueId)
      : null;
    // A linked value also fills the free-text `value` column, which is what
    // episode search scans. Episodes with no link keep whatever was typed.
    const value = snapshot ? snapshot.title : (input.value ?? "");

    const result = await client.query<EpisodeRow>(
      `INSERT INTO episodes (
         user_id, day, band, dir, weight, hook, hook_type, situation,
         state, skill, value, move, workable, checks, value_id, value_snapshot
       ) VALUES (
         $1, $2::date, $3, $4, $5, $6, $7, $8,
         $9, $10, $11, $12, $13, $14::jsonb, $15, $16::jsonb
       )
       RETURNING ${episodeColumns}`,
      [
        userId,
        input.day,
        input.band,
        input.dir,
        input.weight ?? 1,
        input.hook,
        input.hookType ?? "thought",
        input.situation ?? "",
        input.state,
        input.skill,
        value,
        input.move ?? "",
        input.workable ?? "",
        JSON.stringify(input.checks ?? {}),
        snapshot?.valueId ?? null,
        snapshot ? JSON.stringify(snapshot) : null,
      ],
    );

    const row = result.rows[0];
    if (!row) {
      throw new Error("Episode insert did not return a row");
    }
    return mapEpisode(row);
  });
}
