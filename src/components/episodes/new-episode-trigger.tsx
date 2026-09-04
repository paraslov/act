"use client";

import type { ComponentProps } from "react";
import { useNewEpisodeDialog } from "@/components/episodes/new-episode-dialog";
import { Button } from "@/components/ui/button";

export function NewEpisodeTrigger({
  day,
  children,
  ...props
}: ComponentProps<typeof Button> & { day?: string }) {
  const { openEpisodeDialog } = useNewEpisodeDialog();

  return (
    <Button type="button" onClick={() => openEpisodeDialog(day)} {...props}>
      {children}
    </Button>
  );
}
