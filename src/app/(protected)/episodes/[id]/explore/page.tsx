import { notFound } from "next/navigation";
import { ExploreEpisodeForm } from "@/components/episodes/explore-episode-form";
import { getEpisode } from "@/lib/db/episodes";
import { listPersonalValues } from "@/lib/db/personal-values";

export default async function ExploreEpisodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [episode, values] = await Promise.all([
    getEpisode(id),
    listPersonalValues(),
  ]);
  // A missing id, another user's row (RLS), or an unclarified legacy entry has no
  // expanded-reflection page — legacy records are revised through clarification.
  if (!episode || episode.schemaVersion !== 2) notFound();
  return <ExploreEpisodeForm episode={episode} values={values} />;
}
