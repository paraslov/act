import { getTranslations } from "next-intl/server";
import { NewEpisodeTrigger } from "@/components/episodes/new-episode-trigger";
import { PagePlaceholder } from "@/components/page-placeholder";
import { todayId } from "@/lib/act/date";

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
  searchParams: Promise<{ day?: string }>;
}) {
  const t = await getTranslations("journal");
  const today = todayId();
  const day = validSelectedDay((await searchParams).day, today);

  return (
    <PagePlaceholder
      title="journal"
      action={
        <NewEpisodeTrigger day={day} variant="outline">
          {t("addEpisode")}
        </NewEpisodeTrigger>
      }
    />
  );
}
