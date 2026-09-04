import { getTranslations } from "next-intl/server";
import { NewEpisodeTrigger } from "@/components/episodes/new-episode-trigger";
import { PagePlaceholder } from "@/components/page-placeholder";

export default async function EpisodesPage() {
  const t = await getTranslations("episodes");
  return (
    <PagePlaceholder
      title="episodes"
      action={<NewEpisodeTrigger>{t("newEpisode")}</NewEpisodeTrigger>}
    />
  );
}
