import type { AxisKey, HookType, SkillId, StateId } from "@/lib/act/constants";

export type EpisodeDir = "toward" | "away";

/** The five flexibility-check axes, each scored 0, 1 or 2. */
export type Checks = Partial<Record<AxisKey, 0 | 1 | 2>>;

/**
 * One logged episode, shaped like a row of the `episodes` table with camelCase
 * keys. `band` is the smallint index 0–7; the display string lives in `BANDS`.
 */
export type Episode = {
  id: string;
  userId: string;
  day: string; // YYYY-MM-DD
  band: number; // 0..7 index into BANDS
  dir: EpisodeDir;
  weight: number; // 1..3
  hook: string;
  hookType: HookType;
  situation: string;
  state: StateId;
  skill: SkillId;
  value: string;
  move: string;
  workable: string;
  checks: Checks;
  createdAt: string;
  updatedAt: string;
};

export type DayMorning = {
  open?: string;
  aware?: string;
  engaged?: string;
  toward?: string;
};

export type DayEvening = {
  hook?: string;
  away?: string;
  flex?: string;
  next?: string;
};

/** One row of `day_entries` with camelCase keys. */
export type DayEntry = {
  userId: string;
  day: string; // YYYY-MM-DD
  morning: DayMorning;
  evening: DayEvening;
};

/** Episode-list filters (Episodes view). `"all"` means the facet is unfiltered. */
export type EpisodeFilters = {
  dir?: EpisodeDir | "all";
  state?: StateId | "all";
  skill?: SkillId | "all";
  band?: number | "all";
  text?: string;
};
