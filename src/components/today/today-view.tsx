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
import { EpisodeBadge } from "@/components/episodes/episode-details";
import { NewEpisodeTrigger } from "@/components/episodes/new-episode-trigger";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ValuePicker } from "@/components/values/value-picker";
import { bandLabel, DOMAINS } from "@/lib/act/constants";
import { hasMorningEntry, towardAwaySplit } from "@/lib/act/derive";
import type {
  DayEvening,
  DayMorning,
  Episode,
  PersonalValue,
  PersonalValueSnapshot,
} from "@/lib/act/types";
import { cn } from "@/lib/utils";

type TodayViewProps = {
  day: string;
  dayLabel: string;
  practiceDay: number;
  morning: DayMorning;
  evening: DayEvening;
  episodes: Episode[];
  /** Active values offered by the morning picker; empty is a supported state. */
  values: PersonalValue[];
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
  className,
  hint,
  label,
  onChange,
  rows = 2,
  value,
}: {
  className?: string;
  hint?: string;
  label: string;
  onChange: (value: string) => void;
  rows?: number;
  value: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[13.5px] font-medium">{label}</span>
      {hint ? (
        <span className="mb-2 block text-[12.5px] leading-[1.45] text-muted-foreground">
          {hint}
        </span>
      ) : null}
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          fieldClassName,
          "focus-visible:border-toward focus-visible:ring-toward/20",
        )}
      />
    </label>
  );
}

function MorningCard({
  day,
  initial,
  onSaved,
  values,
}: {
  day: string;
  initial: DayMorning;
  /** Hands the saved morning up so the evening reflects it without a reload. */
  onSaved: (morning: DayMorning) => void;
  values: PersonalValue[];
}) {
  const t = useTranslations("today.morning");
  const q = useTranslations("actV2.ui.today");
  const [form, setForm] = useState<DayMorning>(initial);
  // The link is held beside the text draft, never inside it — the action takes
  // it as its own field and `null` is the explicit "no value" it needs.
  const [valueId, setValueId] = useState<string | null>(
    initial.valueId ?? null,
  );
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
            {q("morningTitle")}
          </h2>
          <span className="font-mono text-[10.5px] text-muted-foreground">
            {t("time")}
          </span>
        </div>
      </div>

      <form
        className="flex flex-col gap-[18px] px-6 pt-[18px] pb-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (isPending) return;
          setSaveError(false);
          startTransition(async () => {
            try {
              const entry = await saveMorningAction({
                day,
                morning: form,
                valueId,
              });
              onSaved(entry.morning);
              flash();
            } catch {
              setSaveError(true);
            }
          });
        }}
      >
        <MorningField
          label={q("morningValues")}
          value={form.open ?? ""}
          onChange={(value) => setField("open", value)}
        />
        <MorningField
          label={q("morningAttention")}
          value={form.aware ?? ""}
          onChange={(value) => setField("aware", value)}
        />
        <div className="flex flex-wrap items-start gap-4 border-t pt-4">
          <MorningField
            className="min-w-0 grow basis-[290px]"
            label={q("morningSupport")}
            rows={3}
            value={form.engaged ?? ""}
            onChange={(value) => setField("engaged", value)}
          />
          <div className="min-w-0 grow basis-[250px]">
            <ValuePicker
              values={values}
              value={valueId}
              onChange={setValueId}
              label={t("valueLabel")}
            />
            <p className="mt-2 text-[12px] leading-[1.5] text-pretty text-muted-foreground/80">
              {valueId ? t("valueNote") : t("valueNoteEmpty")}
            </p>
          </div>
        </div>

        <label htmlFor="morning-toward" className="block border-t pt-4">
          <span className="mb-2 block text-[13.5px] font-medium">
            {q("morningStep")}
          </span>
          <Input
            id="morning-toward"
            value={form.toward ?? ""}
            onChange={(event) => setField("toward", event.target.value)}
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
  const { toward, away } = towardAwaySplit(episodes);

  return (
    <section className="rounded-card bg-inverse px-[22px] pt-[22px] pb-5 text-inverse-foreground shadow-sm">
      <p className="mb-1 font-mono text-[10px] tracking-[0.16em] text-inverse-muted uppercase">
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
                "text-inverse-foreground",
              )}
            >
              {bandLabel(episode.band)} <EpisodeBadge episode={episode} />
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
  help,
  label,
  onChange,
  value,
}: {
  help?: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13.5px] font-medium">{label}</span>
      {help ? (
        <span className="mb-[7px] block text-[12.5px] leading-[1.45] text-muted-foreground">
          {help}
        </span>
      ) : null}
      <textarea
        rows={2}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          fieldClassName,
          "focus-visible:border-away focus-visible:ring-away/20",
        )}
      />
    </label>
  );
}

/**
 * Read-only echo of the morning value. It renders from the stored snapshot, so
 * editing or archiving the value later never rewrites what the day recorded.
 */
function MorningRecall({
  action,
  snapshot,
}: {
  action: string | undefined;
  snapshot: PersonalValueSnapshot;
}) {
  const t = useTranslations("today.evening");
  const domainLabels = useTranslations("act.domains");

  return (
    <div className="mb-4 rounded-xl border bg-[oklch(0.985_0.002_85)] px-3.5 py-[13px] dark:bg-background/35">
      <div className="mb-2 flex items-baseline justify-between gap-2.5">
        <span className="font-mono text-[9.5px] tracking-[0.14em] text-muted-foreground uppercase">
          {t("morningLabel")}
        </span>
        <span className="font-mono text-[9px] tracking-[0.1em] text-muted-foreground/80 uppercase">
          {t("morningReadOnly")}
        </span>
      </div>
      <p className="font-serif text-[17px] leading-[1.35] tracking-[-0.01em] text-pretty">
        {snapshot.title}
      </p>
      <div className="mt-[7px] flex flex-wrap gap-[5px]">
        {DOMAINS.filter((domain) => snapshot.domains.includes(domain.id)).map(
          (domain) => (
            <span
              key={domain.id}
              className="rounded-chip border px-[7px] py-px font-mono text-[9px] tracking-[0.06em] text-muted-foreground uppercase"
            >
              {domainLabels(`${domain.id}.label`)}
            </span>
          ),
        )}
      </div>
      {action?.trim() ? (
        <div className="mt-[11px] border-t pt-2.5">
          <p className="mb-[3px] font-mono text-[9px] tracking-[0.12em] text-toward uppercase">
            {t("morningActionLabel")}
          </p>
          <p className="text-[13.5px] leading-[1.5] text-muted-foreground">
            {action}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function EveningCard({
  day,
  initial,
  morning,
}: {
  day: string;
  initial: DayEvening;
  /** The morning as last saved — drafts are not echoed here. */
  morning: DayMorning;
}) {
  const t = useTranslations("today.evening");
  const q = useTranslations("actV2.ui.today");
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
          {q("eveningTitle")}
        </h2>
        <span className="font-mono text-[10.5px] text-muted-foreground">
          {t("time")}
        </span>
      </div>
      {morning.valueSnapshot ? (
        <MorningRecall
          snapshot={morning.valueSnapshot}
          action={morning.toward}
        />
      ) : null}
      {hasMorningEntry(morning) ? null : (
        <p className="mb-4 rounded-xl border border-dashed px-3.5 py-3 text-[13px] leading-[1.55] text-pretty text-muted-foreground">
          {t("noMorning")}
        </p>
      )}
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
          label={q("eveningSituation")}
          value={form.hook ?? ""}
          onChange={(value) => setField("hook", value)}
        />
        <EveningField
          label={q("eveningConsequences")}
          value={form.away ?? ""}
          onChange={(value) => setField("away", value)}
        />
        <EveningField
          label={q("eveningValues")}
          help={morning.valueSnapshot ? t("flexValueHelp") : undefined}
          value={form.flex ?? ""}
          onChange={(value) => setField("flex", value)}
        />
        <EveningField
          label={q("eveningNext")}
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
  values,
}: TodayViewProps) {
  const t = useTranslations("today");
  const q = useTranslations("actV2.ui.today");
  // The evening reads the morning as it was last *saved*, so a successful save
  // updates it in place — the server prop only seeds it.
  const [savedMorning, setSavedMorning] = useState<DayMorning>(morning);

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
        {q("intro")}
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
        <MorningCard
          day={day}
          initial={morning}
          values={values}
          onSaved={setSavedMorning}
        />
        <div className="flex flex-col gap-5">
          <TodaySoFar day={day} episodes={episodes} />
          <EveningCard day={day} initial={evening} morning={savedMorning} />
        </div>
      </div>
    </div>
  );
}
