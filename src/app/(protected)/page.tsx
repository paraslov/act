import { TodayView } from "@/components/today/today-view";
import { formatDayMono, todayId } from "@/lib/act/date";
import { dayNumber } from "@/lib/act/derive";
import { getDayEntry } from "@/lib/db/day-entries";
import { listEpisodes } from "@/lib/db/episodes";

export default async function HomePage() {
  const today = todayId();
  const [entry, allEpisodes] = await Promise.all([
    getDayEntry(today),
    listEpisodes(),
  ]);
  const episodes = allEpisodes.filter((episode) => episode.day === today);

  return (
    <TodayView
      day={today}
      dayLabel={formatDayMono(today)}
      practiceDay={dayNumber(allEpisodes, today)}
      morning={entry?.morning ?? {}}
      evening={entry?.evening ?? {}}
      episodes={episodes}
    />
  );
}
