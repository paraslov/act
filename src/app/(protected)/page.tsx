import { getTranslations } from "next-intl/server";
import { NewEpisodeTrigger } from "@/components/episodes/new-episode-trigger";
import { PagePlaceholder } from "@/components/page-placeholder";

export default async function HomePage() {
  const t = await getTranslations("today.soFar");
  return (
    <PagePlaceholder
      title="today"
      action={<NewEpisodeTrigger>{t("writeEpisode")}</NewEpisodeTrigger>}
    />
  );
}
