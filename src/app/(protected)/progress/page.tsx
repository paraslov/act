import { ProgressView } from "@/components/progress/progress-view";
import { listEpisodes } from "@/lib/db/episodes";

export default async function ProgressPage() {
  const episodes = await listEpisodes();

  return <ProgressView episodes={episodes} />;
}
