import { ProgressView } from "@/components/progress/progress-view";
import { shiftId, todayId } from "@/lib/act/date";
import { inPeriod } from "@/lib/act/derive";
import {
  isPeriodValue,
  PERIOD_WINDOW_DAYS,
  type PeriodValue,
} from "@/lib/act/period";
import { resolveTimeZone } from "@/lib/act/timezone";
import type { EpisodePeriod } from "@/lib/act/types";
import { listEpisodes } from "@/lib/db/episodes";

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: raw } = await searchParams;
  const period: PeriodValue = raw && isPeriodValue(raw) ? raw : "all";
  const [episodes, timeZone] = await Promise.all([
    listEpisodes(),
    resolveTimeZone(),
  ]);

  // One window ending today (in the user's zone) scopes every block equally.
  const window: EpisodePeriod | undefined =
    period === "all"
      ? undefined
      : {
          start: shiftId(todayId(timeZone), -(PERIOD_WINDOW_DAYS[period] - 1)),
          end: todayId(timeZone),
        };
  const scoped = window
    ? episodes.filter((episode) => inPeriod(episode, window))
    : episodes;

  return <ProgressView episodes={scoped} period={period} window={window} />;
}
