import type { ReactNode } from "react";
import { requireCurrentUser } from "@/auth/session";
import { AppSidebar } from "@/components/app-sidebar";
import { NewEpisodeDialogProvider } from "@/components/episodes/new-episode-dialog";
import { bandForNow, todayId } from "@/lib/act/date";
import { returningToPractice } from "@/lib/act/derive";
import { resolveTimeZone } from "@/lib/act/timezone";
import { listMorningValueSelections } from "@/lib/db/day-entries";
import { listEpisodeActivity } from "@/lib/db/episodes";
import { listPersonalValues } from "@/lib/db/personal-values";

export default async function ProtectedLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const user = await requireCurrentUser();
  const timeZone = await resolveTimeZone();
  const today = todayId(timeZone);
  // The episode dialog lives here, so its picker data does too: the active
  // values it can offer, and which value each morning already linked.
  const [episodes, values, morningValues] = await Promise.all([
    listEpisodeActivity(),
    listPersonalValues(),
    listMorningValueSelections(),
  ]);

  return (
    <div className="min-h-screen bg-page min-[900px]:flex min-[900px]:items-stretch">
      <AppSidebar
        user={user}
        episodeCount={episodes.length}
        daysRecorded={returningToPractice(episodes, { end: today })}
        timeZone={timeZone}
      />
      <NewEpisodeDialogProvider
        today={today}
        suggestedBand={bandForNow(timeZone)}
        values={values}
        morningValues={morningValues}
      >
        <main className="min-w-0 flex-1 px-5 pt-6 pb-16 min-[900px]:max-w-[1220px] min-[900px]:px-8 min-[900px]:pt-7">
          {children}
        </main>
      </NewEpisodeDialogProvider>
    </div>
  );
}
