import type {
  AxisKey,
  DomainId,
  HookType,
  SkillId,
  StateId,
} from "@/lib/act/constants";

export type EpisodeDir = "toward" | "away";

/**
 * One personal value, shaped like a row of `personal_values` with camelCase keys.
 * `archivedAt` is null while the value is active. Values are never scored.
 */
export type PersonalValue = {
  id: string;
  userId: string;
  title: string;
  domains: DomainId[];
  meaning: string;
  examples: string[];
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * A value frozen at the moment it was attached to a morning entry or an episode.
 * Historical surfaces render from this, so editing or archiving the underlying
 * value never rewrites what a past day recorded.
 */
export type PersonalValueSnapshot = {
  valueId: string;
  title: string;
  meaning: string;
  domains: DomainId[];
};

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
  /** Live link to the value, kept alongside the snapshot for suggestions. */
  valueId?: string | null;
  valueSnapshot?: PersonalValueSnapshot | null;
  createdAt: string;
  updatedAt: string;
};

/** Minimal episode projection used by shell-level count and streak derivations. */
export type EpisodeActivity = Pick<Episode, "day" | "dir">;

export type DayMorning = {
  open?: string;
  aware?: string;
  engaged?: string;
  toward?: string;
  /** Live link to the value, kept alongside the snapshot for suggestions. */
  valueId?: string | null;
  valueSnapshot?: PersonalValueSnapshot | null;
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
  hookType?: HookType | "all";
  state?: StateId | "all";
  skill?: SkillId | "all";
  band?: number | "all";
  /** Matches against the linked value's stored domains, never a live record. */
  domain?: DomainId | "all";
  text?: string;
};
