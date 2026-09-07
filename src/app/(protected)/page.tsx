import { getLocale } from "next-intl/server";
import { TodayView } from "@/components/today/today-view";
import { formatDayMono, todayId } from "@/lib/act/date";
import { dayNumber } from "@/lib/act/derive";
import { getDayEntry } from "@/lib/db/day-entries";
import { listEpisodes } from "@/lib/db/episodes";
import { listPersonalValues } from "@/lib/db/personal-values";

export default async function HomePage() {
  const locale = await getLocale();
  const today = todayId();
  const [entry, allEpisodes, values] = await Promise.all([
    getDayEntry(today),
    listEpisodes(),
    // Active only — the morning picker never offers an archived value.
    listPersonalValues(),
  ]);
  const episodes = allEpisodes.filter((episode) => episode.day === today);

  return (
    <TodayView
      day={today}
      dayLabel={formatDayMono(today, locale)}
      practiceDay={dayNumber(allEpisodes, today)}
      morning={entry?.morning ?? {}}
      evening={entry?.evening ?? {}}
      episodes={episodes}
      values={values}
    />
  );
}
