import { EpisodesView } from "@/components/episodes/episodes-view";
import { listEpisodes } from "@/lib/db/episodes";

export default async function EpisodesPage() {
  const episodes = await listEpisodes();
  return <EpisodesView episodes={episodes} />;
}
