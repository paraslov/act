import { redirect } from "next/navigation";
import { JournalView } from "@/components/journal/journal-view";
import { todayId } from "@/lib/act/date";
import { listDayEntries } from "@/lib/db/day-entries";
import { listEpisodes } from "@/lib/db/episodes";

function validSelectedDay(value: string | undefined, today: string): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value > today) {
    return today;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.toISOString().slice(0, 10) === value ? value : today;
}

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string; ep?: string; range?: string }>;
}) {
  const today = todayId();
  const params = await searchParams;
  const day = validSelectedDay(params.day, today);
  const range =
    params.range === "30" || params.range === "all" ? params.range : "7";
  const [episodes, dayEntries] = await Promise.all([
    listEpisodes(),
    listDayEntries(),
  ]);
  const episodesForDay = episodes.filter((episode) => episode.day === day);
  const selectedEpisode =
    episodesForDay.find((episode) => episode.id === params.ep) ??
    episodesForDay[0] ??
    null;
  const canonicalParams = new URLSearchParams({ day });
  if (selectedEpisode) canonicalParams.set("ep", selectedEpisode.id);
  if (range !== "7") canonicalParams.set("range", range);
  if (
    params.day !== day ||
    (params.ep ?? null) !== (selectedEpisode?.id ?? null) ||
    (params.range ?? "7") !== range
  ) {
    redirect(`/journal?${canonicalParams.toString()}`);
  }

  return (
    <JournalView
      today={today}
      selectedDay={day}
      selectedEpisodeId={selectedEpisode?.id ?? null}
      range={range}
      episodes={episodes}
      dayEntries={dayEntries}
    />
  );
}
