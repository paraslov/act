"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  type ReactNode,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { saveEveningAction, saveMorningAction } from "@/actions/day";
import { NewEpisodeTrigger } from "@/components/episodes/new-episode-trigger";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { bandLabel } from "@/lib/act/constants";
import type { DayEvening, DayMorning, Episode } from "@/lib/act/types";
import { cn } from "@/lib/utils";

type TodayViewProps = {
  day: string;
  dayLabel: string;
  practiceDay: number;
  morning: DayMorning;
  evening: DayEvening;
  episodes: Episode[];
};

const fieldClassName =
  "w-full resize-none rounded-input border border-input bg-[oklch(0.985_0.002_85)] px-3 py-2.5 text-sm leading-6 text-foreground shadow-none outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 dark:bg-background/35";

function SaveButton({
  saved,
  pending,
  children,
  className,
  variant = "default",
}: {
  saved: boolean;
  pending: boolean;
  children: ReactNode;
  className?: string;
  variant?: "default" | "outline";
}) {
  const t = useTranslations("common");

  return (
    <Button
      type="submit"
      variant={variant}
      disabled={pending}
      className={className}
    >
      {saved ? t("saved") : children}
    </Button>
  );
}

function useSavedFlash() {
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function flash() {
    if (timer.current) clearTimeout(timer.current);
    setSaved(true);
    timer.current = setTimeout(() => setSaved(false), 1_800);
  }

  return { saved, flash };
}

function MorningField({
  accent,
  fieldKey,
  hint,
  label,
  onChange,
  placeholder,
  value,
}: {
  accent: string;
  fieldKey: string;
  hint: string;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-2">
        <span
          className={cn(
            "font-mono text-[10.5px] tracking-[0.16em] uppercase",
            accent,
          )}
        >
          {fieldKey}
        </span>
        <span className="text-[13.5px] font-medium">{label}</span>
      </span>
      <span className="mb-2 block text-[12.5px] leading-[1.45] text-muted-foreground">
        {hint}
      </span>
      <textarea
        rows={2}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={cn(
          fieldClassName,
          "focus-visible:border-toward focus-visible:ring-toward/20",
        )}
      />
    </label>
  );
}

function MorningCard({ day, initial }: { day: string; initial: DayMorning }) {
  const t = useTranslations("today.morning");
  const [form, setForm] = useState<DayMorning>(initial);
  const [saveError, setSaveError] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { saved, flash } = useSavedFlash();

  function setField(field: keyof DayMorning, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <section className="overflow-hidden rounded-card border bg-card text-card-foreground shadow-sm">
      <div className="px-6 pt-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold tracking-[-0.01em]">
            {t("heading")}
          </h2>
          <span className="font-mono text-[10.5px] text-muted-foreground">
            {t("time")}
          </span>
        </div>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      <form
        className="flex flex-col gap-[18px] px-6 pt-[18px] pb-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (isPending) return;
          setSaveError(false);
          startTransition(async () => {
            try {
              await saveMorningAction({ day, morning: form });
              flash();
            } catch {
              setSaveError(true);
            }
          });
        }}
      >
        <MorningField
          accent="text-toward"
          fieldKey={t("openKey")}
          label={t("openLabel")}
          hint={t("openHint")}
          placeholder={t("openPlaceholder")}
          value={form.open ?? ""}
          onChange={(value) => setField("open", value)}
        />
        <MorningField
          accent="text-aware"
          fieldKey={t("awareKey")}
          label={t("awareLabel")}
          hint={t("awareHint")}
          placeholder={t("awarePlaceholder")}
          value={form.aware ?? ""}
          onChange={(value) => setField("aware", value)}
        />
        <MorningField
          accent="text-away"
          fieldKey={t("engagedKey")}
          label={t("engagedLabel")}
          hint={t("engagedHint")}
          placeholder={t("engagedPlaceholder")}
          value={form.engaged ?? ""}
          onChange={(value) => setField("engaged", value)}
        />

        <label htmlFor="morning-toward" className="block border-t pt-4">
          <span className="mb-2 flex items-center gap-2">
            <span className="font-mono text-[10.5px] tracking-[0.16em] text-toward uppercase">
              {t("towardKey")}
            </span>
            <span className="text-[13.5px] font-medium">
              {t("towardLabel")}
            </span>
          </span>
          <Input
            id="morning-toward"
            value={form.toward ?? ""}
            onChange={(event) => setField("toward", event.target.value)}
            placeholder={t("towardPlaceholder")}
            className="h-auto rounded-input bg-[oklch(0.985_0.002_85)] py-2.5 shadow-none focus-visible:border-toward focus-visible:ring-toward/20 dark:bg-background/35"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <SaveButton saved={saved} pending={isPending}>
            {t("save")}
          </SaveButton>
          <span className="text-[12.5px] text-muted-foreground/80">
            {t("footer")}
          </span>
        </div>
        {saveError ? (
          <p role="alert" className="text-xs text-destructive">
            {t("saveError")}
          </p>
        ) : null}
      </form>
    </section>
  );
}

function TodaySoFar({ day, episodes }: { day: string; episodes: Episode[] }) {
  const t = useTranslations("today.soFar");
  const toward = episodes.filter((episode) => episode.dir === "toward").length;
  const away = episodes.length - toward;

  return (
    <section className="rounded-card bg-[oklch(0.205_0_0)] px-[22px] pt-[22px] pb-5 text-[oklch(0.985_0_0)] shadow-sm">
      <p className="mb-1 font-mono text-[10px] tracking-[0.16em] text-[oklch(0.72_0_0)] uppercase">
        {t("label")}
      </p>
      <p className="mb-3.5 font-serif text-[22px] leading-tight tracking-[-0.01em]">
        {t("count", { toward, away })}
      </p>
      {episodes.length ? (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {episodes.slice(0, 4).map((episode) => (
            <span
              key={episode.id}
              className={cn(
                "rounded-chip border border-white/20 px-2 py-1 font-mono text-[10px] tracking-[0.1em] uppercase",
                episode.dir === "toward"
                  ? "text-[oklch(0.85_0.06_158)]"
                  : "text-[oklch(0.85_0.06_55)]",
              )}
            >
              {bandLabel(episode.band)} {t(episode.dir)}
            </span>
          ))}
        </div>
      ) : null}
      <NewEpisodeTrigger className="h-10 w-full rounded-[9px] bg-[oklch(0.985_0_0)] font-semibold text-[oklch(0.205_0_0)] hover:bg-white">
        {t("writeEpisode")}
      </NewEpisodeTrigger>
      <Link
        href={`/journal?day=${day}`}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "mt-2 h-9 w-full rounded-[9px] border-white/25 bg-transparent text-[13.5px] text-[oklch(0.9_0_0)] shadow-none hover:bg-white/10 hover:text-white dark:bg-transparent dark:hover:bg-white/10",
        )}
      >
        {t("openInJournal")}
      </Link>
    </section>
  );
}

function EveningField({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13.5px] font-medium">{label}</span>
      <textarea
        rows={2}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={cn(
          fieldClassName,
          "focus-visible:border-away focus-visible:ring-away/20",
        )}
      />
    </label>
  );
}

function EveningCard({ day, initial }: { day: string; initial: DayEvening }) {
  const t = useTranslations("today.evening");
  const [form, setForm] = useState<DayEvening>(initial);
  const [saveError, setSaveError] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { saved, flash } = useSavedFlash();

  function setField(field: keyof DayEvening, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <section className="rounded-card border bg-card px-[22px] py-5 text-card-foreground shadow-sm">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold tracking-[-0.01em]">
          {t("heading")}
        </h2>
        <span className="font-mono text-[10.5px] text-muted-foreground">
          {t("time")}
        </span>
      </div>
      <form
        className="flex flex-col gap-3.5"
        onSubmit={(event) => {
          event.preventDefault();
          if (isPending) return;
          setSaveError(false);
          startTransition(async () => {
            try {
              await saveEveningAction({ day, evening: form });
              flash();
            } catch {
              setSaveError(true);
            }
          });
        }}
      >
        <EveningField
          label={t("hookLabel")}
          placeholder={t("hookPlaceholder")}
          value={form.hook ?? ""}
          onChange={(value) => setField("hook", value)}
        />
        <EveningField
          label={t("awayLabel")}
          placeholder={t("awayPlaceholder")}
          value={form.away ?? ""}
          onChange={(value) => setField("away", value)}
        />
        <EveningField
          label={t("flexLabel")}
          placeholder={t("flexPlaceholder")}
          value={form.flex ?? ""}
          onChange={(value) => setField("flex", value)}
        />
        <EveningField
          label={t("nextLabel")}
          placeholder={t("nextPlaceholder")}
          value={form.next ?? ""}
          onChange={(value) => setField("next", value)}
        />
        <SaveButton
          saved={saved}
          pending={isPending}
          variant="outline"
          className="self-start"
        >
          {t("save")}
        </SaveButton>
        {saveError ? (
          <p role="alert" className="text-xs text-destructive">
            {t("saveError")}
          </p>
        ) : null}
      </form>
    </section>
  );
}

export function TodayView({
  day,
  dayLabel,
  practiceDay,
  morning,
  evening,
  episodes,
}: TodayViewProps) {
  const t = useTranslations("today");

  return (
    <div>
      <header className="mb-1.5 flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-serif text-[34px] leading-[1.1] tracking-[-0.02em]">
          {t("title")}
        </h1>
        <span className="font-mono text-[11.5px] tracking-[0.08em] text-muted-foreground uppercase">
          {dayLabel} · {t("dayNumber", { number: practiceDay })}
        </span>
      </header>
      <p className="mb-[22px] max-w-[62ch] text-[14.5px] text-foreground/70">
        {t("intro")}
      </p>

      <section className="mb-[26px] rounded-xl border-[1.5px] border-alert bg-alert-tint px-[18px] py-4">
        <p className="mb-1 font-mono text-[10px] tracking-[0.16em] text-alert-label uppercase">
          {t("alert.label")}
        </p>
        <p className="max-w-[70ch] font-serif text-xl leading-[1.35] tracking-[-0.01em]">
          {t("alert.question")}
        </p>
      </section>

      <div className="grid items-start gap-5 min-[1241px]:grid-cols-[1.35fr_1fr]">
        <MorningCard day={day} initial={morning} />
        <div className="flex flex-col gap-5">
          <TodaySoFar day={day} episodes={episodes} />
          <EveningCard day={day} initial={evening} />
        </div>
      </div>
    </div>
  );
}
