"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useId, useMemo, useState, useTransition } from "react";
import { updateEpisodeAction } from "@/actions/episodes";
import { filledChip, lightChip } from "@/components/episodes/chips";
import {
  ChoicePointBeam,
  choicePointNoteKey,
} from "@/components/episodes/choice-point";
import { Button } from "@/components/ui/button";
import { ValuePicker } from "@/components/values/value-picker";
import { AXES, BANDS, bandLabel, HOOK_TYPES } from "@/lib/act/constants";
import { formatDayLabel } from "@/lib/act/date";
import type {
  Checks,
  ConsequenceStatus,
  Episode,
  EpisodeDir,
  PatternSelection,
  PersonalValue,
  SkillSelection,
} from "@/lib/act/types";
import { cn } from "@/lib/utils";

// Legacy `none` is read-only and never offered in the picker (Phase 1.1).
type PatternPick = Exclude<PatternSelection, "none">;
type SkillPick = Exclude<SkillSelection, "none">;

type ExploreState = {
  day: string;
  band: number;
  hook: string;
  hookType: Episode["hookType"];
  situation: string;
  move: string;
  dir: EpisodeDir;
  behaviorStatus: Episode["behaviorStatus"];
  consequenceStatus: ConsequenceStatus;
  intendedFunction: string;
  immediateOutcome: string;
  laterConsequences: string;
  interpretation: string;
  nextExperiment: string;
  value: string;
  valueId: string | null;
  states: PatternPick[];
  skills: SkillPick[];
  checks: Checks;
};

const absencePatterns: PatternPick[] = ["unknown", "none-noticed"];
const absenceSkills: SkillPick[] = ["unknown", "no-skill"];

/** Pattern/skill options grouped by the three ACT pillars, as the design draws them. */
const PATTERN_GROUPS = [
  { pillar: "open", ids: ["fusion", "avoidance"] },
  { pillar: "aware", ids: ["autopilot", "selfstory"] },
  { pillar: "engaged", ids: ["drift", "stuck"] },
] as const;
const SKILL_GROUPS = [
  { pillar: "open", ids: ["defuse", "accept"] },
  { pillar: "aware", ids: ["notice", "anchor"] },
  { pillar: "engaged", ids: ["orient", "commit"] },
] as const;

/** Sentinels are mutually exclusive with each other and with any real selection. */
function toggle<T extends string>(current: T[], option: T, absences: T[]): T[] {
  if (current.includes(option))
    return current.filter((value) => value !== option);
  if (absences.includes(option)) return [option];
  return [...current.filter((value) => !absences.includes(value)), option];
}

/** Serif question label (19px) + optional hint + a resizable textarea on a warm field. */
function Field({
  id,
  label,
  hint,
  value,
  minHeight,
  placeholder,
  onChange,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  minHeight: number;
  placeholder?: string;
  onChange: (value: string) => void;
  children?: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block font-serif text-[19px] leading-[1.35]"
      >
        {label}
      </label>
      {hint ? (
        <p className="mt-1.5 text-xs text-foreground/55">{hint}</p>
      ) : null}
      <textarea
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        style={{ minHeight }}
        className="mt-2 w-full resize-y rounded-input border bg-field px-3 py-2.5 text-sm leading-relaxed text-foreground placeholder:text-foreground/40 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-toward"
      />
      {children}
    </div>
  );
}

/** A section card with its mono number, serif heading and a mono pillar tag. */
function Block({
  id,
  num,
  heading,
  pillar,
  children,
}: {
  id: string;
  num: string;
  heading: string;
  pillar: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="rounded-card border bg-card px-[22px] py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3.5">
        <div className="flex min-w-0 items-baseline gap-2.5">
          <span className="font-mono text-[10px] tracking-[0.12em] text-foreground/40">
            {num}
          </span>
          <h2 className="font-serif text-2xl leading-tight font-normal tracking-[-0.015em]">
            {heading}
          </h2>
        </div>
        <span className="shrink-0 font-mono text-[9.5px] tracking-[0.14em] text-foreground/55 uppercase">
          {pillar}
        </span>
      </div>
      {children}
    </section>
  );
}

/** A collapsible subsection (patterns, skills, reflection questions). Starts collapsed. */
function Collapsible({
  title,
  summary,
  children,
}: {
  title: string;
  summary: string;
  children: ReactNode;
}) {
  const t = useTranslations("actV2.ui");
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  return (
    <div className="overflow-hidden rounded-input border">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 bg-field px-3.5 py-3 text-left"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold">{title}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {summary}
          </span>
        </span>
        <span className="shrink-0 font-mono text-[11px] text-foreground/45">
          {t(open ? "explore.close" : "explore.open")}
        </span>
      </button>
      {open ? (
        <div id={bodyId} className="border-t p-3.5">
          {children}
        </div>
      ) : null}
    </div>
  );
}

const CONSEQUENCE_STATUSES: ConsequenceStatus[] = [
  "observed",
  "expected",
  "unknown",
];

export function ExploreEpisodeForm({
  episode,
  values,
}: {
  episode: Episode;
  values: PersonalValue[];
}) {
  const t = useTranslations("actV2.ui");
  const checks = useTranslations("actV2.checks");
  const locale = useLocale();
  const old = useTranslations("episodeModal");
  const router = useRouter();
  const [form, setForm] = useState<ExploreState>({
    day: episode.day,
    band: episode.band,
    hook: episode.hook,
    hookType: episode.hookType,
    situation: episode.situation,
    move: episode.move,
    dir: episode.dir,
    behaviorStatus: episode.behaviorStatus,
    consequenceStatus: episode.consequenceStatus,
    intendedFunction: episode.intendedFunction,
    immediateOutcome: episode.immediateOutcome,
    laterConsequences: episode.laterConsequences,
    interpretation: episode.interpretation,
    nextExperiment: episode.nextExperiment,
    value: episode.value === episode.valueSnapshot?.title ? "" : episode.value,
    valueId: episode.valueId ?? null,
    states: episode.states.filter((id): id is PatternPick => id !== "none"),
    skills: episode.skills.filter((id): id is SkillPick => id !== "none"),
    checks: episode.checks,
  });
  const [saveError, setSaveError] = useState(false);
  const [isPending, startTransition] = useTransition();

  function set<K extends keyof ExploreState>(key: K, value: ExploreState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const canSave =
    !!(form.hook.trim() || form.situation.trim() || form.move.trim()) &&
    (form.behaviorStatus !== "acted" || !!form.move.trim());

  function save() {
    if (!canSave || isPending) return;
    setSaveError(false);
    startTransition(async () => {
      try {
        await updateEpisodeAction({
          id: episode.id,
          day: form.day,
          band: form.band,
          hook: form.hook,
          hookType: form.hookType,
          situation: form.situation,
          move: form.move,
          dir: form.dir,
          behaviorStatus: form.behaviorStatus,
          consequenceStatus: form.consequenceStatus,
          intendedFunction: form.intendedFunction,
          immediateOutcome: form.immediateOutcome,
          laterConsequences: form.laterConsequences,
          interpretation: form.interpretation,
          nextExperiment: form.nextExperiment,
          value: form.value,
          valueId: form.valueId,
          states: form.states,
          skills: form.skills,
          checks: form.checks,
          // 5.6: an earlier reflection is preserved verbatim, never auto-split.
          workable: episode.workable,
        });
        // Only navigate once the write has actually succeeded (5.8).
        router.push(`/episodes#episode-${episode.id}`);
      } catch {
        setSaveError(true);
      }
    });
  }

  const filled = (value: string) => value.trim().length > 0;
  const navDots = [
    {
      href: "#b1",
      num: "01",
      label: t("explore.nav.happened"),
      on: filled(form.situation) || filled(form.hook),
    },
    {
      href: "#b2",
      num: "02",
      label: t("explore.nav.respond"),
      on: filled(form.move) || filled(form.intendedFunction),
    },
    {
      href: "#b3",
      num: "03",
      label: t("explore.nav.mattered"),
      on: filled(form.value) || !!form.valueId,
    },
    {
      href: "#b4",
      num: "04",
      label: t("explore.nav.workability"),
      on:
        filled(form.immediateOutcome) ||
        filled(form.laterConsequences) ||
        filled(form.interpretation) ||
        form.dir !== "unknown",
    },
    {
      href: "#b5",
      num: "05",
      label: t("explore.nav.next"),
      on: filled(form.nextExperiment),
    },
  ];

  const patternSummary = useMemo(() => {
    if (!form.states.length) return t("explore.nothingSelected");
    return form.states
      .map((id) =>
        id === "unknown"
          ? t("selection.unknown")
          : id === "none-noticed"
            ? t("selection.noneNoticed")
            : t(`patterns.${id}.label`),
      )
      .join(" · ");
  }, [form.states, t]);

  const skillSummary = useMemo(() => {
    if (!form.skills.length) return t("explore.nothingSelected");
    return form.skills
      .map((id) =>
        id === "unknown"
          ? t("selection.unknown")
          : id === "no-skill"
            ? t("selection.noSkill")
            : t(`skillLabels.${id}`),
      )
      .join(" · ");
  }, [form.skills, t]);

  const answered = AXES.filter(
    ({ id }) =>
      form.checks[id] === 0 || form.checks[id] === 1 || form.checks[id] === 2,
  ).length;
  const explicitUnrated = AXES.filter(
    ({ id }) => form.checks[id] === null,
  ).length;
  const checksSummary =
    answered === 0 && explicitUnrated === 0
      ? t("explore.checksNone")
      : t("explore.checksSummary", { answered, unrated: 5 - answered });

  const pickDir = (id: EpisodeDir) => {
    if (id === "away" || id === "toward")
      set("dir", form.dir === id ? "unknown" : id);
    else set("dir", id);
  };

  return (
    <div className="mx-auto max-w-[960px] px-6 pt-7 pb-10">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 max-w-[66ch]">
          <p className="font-mono text-[9.5px] tracking-[0.14em] text-foreground/55 uppercase">
            {t("explore.episodeEyebrow")} ·{" "}
            {formatDayLabel(episode.day, locale)} · {bandLabel(episode.band)}
          </p>
          <h1 className="mt-1.5 font-serif text-[34px] leading-[1.1] font-normal tracking-[-0.02em]">
            {t("episode.expand")}
          </h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-foreground/60">
            {t("explore.intro")}
          </p>
        </div>
        <div className="flex shrink-0 gap-2.5">
          <Button asChild variant="outline" className="h-9">
            <Link href="/episodes">{t("episode.collapse")}</Link>
          </Button>
          <Button
            type="button"
            onClick={save}
            disabled={!canSave}
            className="h-9"
          >
            {isPending ? old("saving") : t("common.save")}
          </Button>
        </div>
      </header>

      {/* Sticky block nav */}
      <nav
        aria-label={t("explore.nav.happened")}
        className="sticky top-0 z-[5] my-4 flex flex-wrap items-center gap-1.5 rounded-input border bg-card px-3 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
      >
        {navDots.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="flex items-center gap-[7px] rounded-button px-2.5 py-1.5 text-[12.5px] text-foreground/75 hover:bg-accent"
          >
            <span className="font-mono text-[10px] tracking-[0.1em] text-foreground/45">
              {item.num}
            </span>
            <span>{item.label}</span>
            <span
              className={cn(
                "size-[7px] shrink-0 rounded-[2px]",
                item.on
                  ? "bg-toward-muted"
                  : "border border-dashed border-foreground/35",
              )}
            />
          </a>
        ))}
      </nav>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <fieldset disabled={isPending} className="flex flex-col gap-3.5">
          {saveError && (
            <p role="alert" className="text-sm text-destructive">
              {t("common.saveError")}
            </p>
          )}

          {/* Block 01 — What happened */}
          <Block
            id="b1"
            num="01"
            heading={t("explore.block.happened")}
            pillar={t("explore.pillar.awareness")}
          >
            <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-[9.5px] tracking-[0.14em] text-muted-foreground uppercase">
                {t("episode.when")}
              </span>
              <input
                type="date"
                value={form.day}
                onChange={(event) => set("day", event.target.value)}
                className="h-[34px] rounded-button border bg-field px-2.5 font-mono text-[12.5px] text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-toward"
              />
              <div className="flex flex-wrap gap-1">
                {BANDS.map((band, index) => (
                  <button
                    key={band}
                    type="button"
                    aria-pressed={form.band === index}
                    onClick={() => set("band", index)}
                    className={filledChip(
                      form.band === index,
                      "rounded-chip px-2 py-1.5 font-mono text-[11px]",
                    )}
                  >
                    {band}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <Field
                id="ex-situation"
                label={t("episode.situation")}
                hint={t("explore.situationHint")}
                value={form.situation}
                minHeight={56}
                onChange={(value) => set("situation", value)}
              />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-[minmax(0,1fr)_210px] sm:items-start">
              <Field
                id="ex-notice"
                label={t("episode.experience")}
                hint={t("explore.noticeHint")}
                value={form.hook}
                minHeight={76}
                onChange={(value) => set("hook", value)}
              />
              <div>
                <p className="font-mono text-[9.5px] tracking-[0.14em] text-muted-foreground uppercase">
                  {t("explore.kindOfExperience")}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {HOOK_TYPES.map(({ id }) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={form.hookType === id}
                      onClick={() =>
                        set("hookType", form.hookType === id ? null : id)
                      }
                      className={filledChip(
                        form.hookType === id,
                        "rounded-chip px-2.5 py-1.5 text-xs",
                      )}
                    >
                      {t(`experienceTypes.${id}`)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Block>

          {/* Block 02 — How did I respond */}
          <Block
            id="b2"
            num="02"
            heading={t("explore.block.respond")}
            pillar={t("explore.pillar.openness")}
          >
            <div className="mt-3.5">
              <Field
                id="ex-move"
                label={t("episode.action")}
                value={form.move}
                minHeight={52}
                onChange={(value) => set("move", value)}
              >
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {(["acted", "planned", "not-described"] as const).map(
                    (status) => (
                      <button
                        key={status}
                        type="button"
                        aria-pressed={form.behaviorStatus === status}
                        onClick={() => set("behaviorStatus", status)}
                        className={lightChip(
                          form.behaviorStatus === status,
                          status === "not-described",
                          "rounded-chip",
                        )}
                      >
                        {t(`behaviorStatus.${status}`)}
                      </button>
                    ),
                  )}
                </div>
                {form.behaviorStatus === "acted" && !form.move.trim() && (
                  <p role="alert" className="mt-2 text-sm">
                    {t("episode.actedError")}
                  </p>
                )}
              </Field>
            </div>

            <div className="mt-4">
              <Field
                id="ex-function"
                label={t("episode.intendedFunction")}
                value={form.intendedFunction}
                minHeight={44}
                onChange={(value) => set("intendedFunction", value)}
              />
            </div>

            <div className="mt-4">
              <Collapsible
                title={t("episode.patterns")}
                summary={patternSummary}
              >
                <p className="max-w-[70ch] text-[12.5px] leading-relaxed text-muted-foreground">
                  {t("explore.patternsIntro")}
                </p>
                <div className="mt-3 flex flex-col gap-3">
                  {PATTERN_GROUPS.map((group) => (
                    <div key={group.pillar}>
                      <p className="font-mono text-[9.5px] tracking-[0.14em] text-muted-foreground uppercase">
                        {t(`map.${group.pillar}`)}
                      </p>
                      <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(250px,1fr))]">
                        {group.ids.map((id) => {
                          const on = form.states.includes(id);
                          return (
                            <button
                              key={id}
                              type="button"
                              aria-pressed={on}
                              onClick={() =>
                                set(
                                  "states",
                                  toggle(form.states, id, absencePatterns),
                                )
                              }
                              className={cn(
                                "rounded-input border p-3 text-left transition-colors",
                                on
                                  ? "border-foreground/40 bg-muted"
                                  : "bg-card hover:bg-accent",
                              )}
                            >
                              <span className="block text-[13px] font-semibold">
                                {t(`patterns.${id}.label`)}
                              </span>
                              <span className="mt-1 block text-xs leading-normal text-foreground/60">
                                {t(`patterns.${id}.desc`)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5 border-t pt-3">
                  {absencePatterns.map((id) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={form.states.includes(id)}
                      onClick={() =>
                        set("states", toggle(form.states, id, absencePatterns))
                      }
                      className={lightChip(
                        form.states.includes(id),
                        true,
                        "rounded-chip text-muted-foreground",
                      )}
                    >
                      {t(
                        id === "unknown"
                          ? "selection.unknown"
                          : "selection.noneNoticed",
                      )}
                    </button>
                  ))}
                </div>
              </Collapsible>
            </div>

            <div className="mt-2.5">
              <Collapsible title={t("episode.skills")} summary={skillSummary}>
                <p className="max-w-[70ch] text-[12.5px] leading-relaxed text-muted-foreground">
                  {t("explore.skillsIntro")}
                </p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
                  {SKILL_GROUPS.map((group) => (
                    <div key={group.pillar}>
                      <p className="font-mono text-[9.5px] tracking-[0.14em] text-muted-foreground uppercase">
                        {t(`map.${group.pillar}`)}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {group.ids.map((id) => (
                          <button
                            key={id}
                            type="button"
                            aria-pressed={form.skills.includes(id)}
                            onClick={() =>
                              set(
                                "skills",
                                toggle(form.skills, id, absenceSkills),
                              )
                            }
                            className={lightChip(
                              form.skills.includes(id),
                              false,
                              "rounded-chip",
                            )}
                          >
                            {t(`skillLabels.${id}`)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5 border-t pt-3">
                  {absenceSkills.map((id) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={form.skills.includes(id)}
                      onClick={() =>
                        set("skills", toggle(form.skills, id, absenceSkills))
                      }
                      className={lightChip(
                        form.skills.includes(id),
                        true,
                        "rounded-chip text-muted-foreground",
                      )}
                    >
                      {t(
                        id === "unknown"
                          ? "selection.unknown"
                          : "selection.noSkill",
                      )}
                    </button>
                  ))}
                </div>
              </Collapsible>
            </div>
          </Block>

          {/* Block 03 — What mattered */}
          <Block
            id="b3"
            num="03"
            heading={t("explore.block.mattered")}
            pillar={t("explore.pillar.values")}
          >
            <div className="mt-3.5">
              <Field
                id="ex-value"
                label={t("episode.value")}
                value={form.value}
                minHeight={44}
                onChange={(value) => set("value", value)}
              />
            </div>
            <div className="mt-3.5 border-t pt-3.5">
              <ValuePicker
                values={values}
                value={form.valueId}
                onChange={(id) => set("valueId", id)}
                label={t("explore.linkValue")}
              />
              <p className="mt-2.5 max-w-[70ch] text-xs leading-relaxed text-foreground/55">
                {t("explore.valueHint")}
              </p>
            </div>
          </Block>

          {/* Block 04 — Was it workable */}
          <Block
            id="b4"
            num="04"
            heading={t("explore.block.workable")}
            pillar={t("explore.pillar.workability")}
          >
            <p className="mt-2 max-w-[70ch] text-[12.5px] leading-relaxed text-muted-foreground">
              {t("explore.workabilityIntro")}
            </p>

            <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
              <div className="rounded-input border p-3.5">
                <p className="font-serif text-lg leading-[1.35]">
                  {t("episode.immediate")}
                </p>
                <textarea
                  value={form.immediateOutcome}
                  onChange={(event) =>
                    set("immediateOutcome", event.target.value)
                  }
                  className="mt-2 min-h-[44px] w-full resize-y rounded-input border bg-field px-3 py-2.5 text-[13.5px] leading-relaxed text-foreground placeholder:text-foreground/40 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-toward"
                />
              </div>
              <div className="rounded-input border p-3.5">
                <p className="font-serif text-lg leading-[1.35]">
                  {t("episode.later")}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {CONSEQUENCE_STATUSES.map((status) => (
                    <button
                      key={status}
                      type="button"
                      aria-pressed={form.consequenceStatus === status}
                      onClick={() => set("consequenceStatus", status)}
                      className={lightChip(
                        form.consequenceStatus === status,
                        status === "unknown",
                        "rounded-chip px-2.5 py-1 text-[11.5px]",
                      )}
                    >
                      {t(`consequenceStatus.${status}`)}
                    </button>
                  ))}
                </div>
                <textarea
                  value={form.laterConsequences}
                  onChange={(event) =>
                    set("laterConsequences", event.target.value)
                  }
                  className="mt-2 min-h-[44px] w-full resize-y rounded-input border bg-field px-3 py-2.5 text-[13.5px] leading-relaxed text-foreground placeholder:text-foreground/40 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-toward"
                />
                <p className="mt-1.5 text-[11.5px] leading-normal text-foreground/55">
                  {t("explore.laterHint")}
                </p>
              </div>
            </div>

            <div className="mt-3.5">
              <p className="font-serif text-[19px] leading-[1.35]">
                {t("episode.direction")}
              </p>
              <p className="mt-1.5 max-w-[70ch] text-[12.5px] leading-relaxed text-muted-foreground">
                {t("episode.directionHelp")}
              </p>
              <div className="mt-3 rounded-input border bg-panel p-3.5">
                <div className="flex justify-center">
                  <ChoicePointBeam
                    dir={form.dir}
                    awayLabel={t("direction.away.label").toLocaleUpperCase()}
                    towardLabel={t(
                      "direction.toward.label",
                    ).toLocaleUpperCase()}
                    caption={t("choicePoint.caption").toLocaleUpperCase()}
                  />
                </div>
                <div className="mt-2.5 grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-2.5">
                  {(["away", "toward"] as const).map((id) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={form.dir === id}
                      onClick={() => pickDir(id)}
                      className={cn(
                        "rounded-input border bg-card p-3 text-left transition-colors",
                        id === "away" &&
                          form.dir === "away" &&
                          "border-away-border bg-away-tint",
                        id === "toward" &&
                          form.dir === "toward" &&
                          "border-toward-border bg-toward-tint",
                      )}
                    >
                      <span
                        className={cn(
                          "block font-mono text-[9.5px] tracking-[0.14em] uppercase",
                          id === "away" ? "text-away" : "text-toward",
                        )}
                      >
                        {t(`direction.${id}.label`)}
                      </span>
                      <span className="mt-1.5 block text-[12.5px] leading-normal text-foreground/75">
                        {t(`direction.${id}.description`)}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="mt-2.5 max-w-[70ch] text-[11.5px] leading-relaxed text-foreground/55">
                  {t(choicePointNoteKey(form.dir, "explore"))}
                </p>
              </div>

              <div className="mt-2 flex flex-col gap-2">
                {(["mixed", "unknown"] as const).map((id) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={form.dir === id}
                    onClick={() => pickDir(id)}
                    className={cn(
                      "flex items-start gap-3 rounded-input border p-3 text-left transition-colors",
                      id === "unknown" && "border-dashed",
                      form.dir === id
                        ? "border-foreground/40 bg-muted"
                        : "bg-card hover:bg-accent",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold">
                        {t(`direction.${id}.label`)}
                      </span>
                      <span className="mt-0.5 block text-xs leading-normal text-foreground/60">
                        {t(`direction.${id}.description`)}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "mt-1 size-[11px] shrink-0 border border-foreground/40",
                        id === "unknown"
                          ? "rounded-full border-dashed"
                          : "rounded-[2px]",
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3.5">
              <Field
                id="ex-interpretation"
                label={t("explore.responseUnderstanding")}
                value={form.interpretation}
                minHeight={48}
                onChange={(value) => set("interpretation", value)}
              />
            </div>

            {episode.workable && (
              <div className="mt-3.5 rounded-input border border-dashed bg-field px-3.5 py-3">
                <p className="font-mono text-[9.5px] tracking-[0.14em] text-foreground/55 uppercase">
                  {t("legacy.reflection")}
                </p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/75">
                  {episode.workable}
                </p>
              </div>
            )}
          </Block>

          {/* Block 05 — What next */}
          <Block
            id="b5"
            num="05"
            heading={t("explore.block.next")}
            pillar={t("explore.pillar.committed")}
          >
            <div className="mt-3.5">
              <Field
                id="ex-next"
                label={t("episode.next")}
                value={form.nextExperiment}
                minHeight={52}
                onChange={(value) => set("nextExperiment", value)}
              />
            </div>

            <div className="mt-4">
              <Collapsible
                title={t("explore.checksTitle")}
                summary={checksSummary}
              >
                <p className="max-w-[70ch] text-[12.5px] leading-relaxed text-muted-foreground">
                  {t("reflection.intro")}
                </p>
                <div className="mt-3 flex flex-col gap-3.5">
                  {AXES.map(({ id }) => (
                    <div key={id}>
                      <p className="font-mono text-[9.5px] tracking-[0.14em] text-muted-foreground uppercase">
                        {checks(`${id}.title`)}
                      </p>
                      <p className="mt-1.5 max-w-[74ch] text-[13.5px] leading-normal">
                        {checks(`${id}.question`)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {([0, 1, 2, null] as const).map((score) => {
                          const on = (form.checks[id] ?? undefined) === score;
                          return (
                            <button
                              key={String(score)}
                              type="button"
                              aria-pressed={on}
                              onClick={() =>
                                set("checks", { ...form.checks, [id]: score })
                              }
                              className={lightChip(
                                on,
                                score === null,
                                cn(
                                  "rounded-chip",
                                  score === null &&
                                    !on &&
                                    "text-muted-foreground",
                                ),
                              )}
                            >
                              {t(
                                score === null
                                  ? "reflection.unrated"
                                  : `reflection.score${score}`,
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <p className="mt-1.5 max-w-[74ch] text-[11.5px] leading-normal text-foreground/55">
                        {checks(`${id}.help`)}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 max-w-[74ch] border-t pt-3 text-[11.5px] leading-normal text-foreground/55">
                  {t("reflection.notValidated")}
                </p>
              </Collapsible>
            </div>
          </Block>

          {/* Footer */}
          <div className="mt-0.5 flex flex-wrap items-center gap-3 border-t pt-3.5">
            <Button type="submit" disabled={!canSave} className="h-[38px]">
              {isPending ? old("saving") : t("common.save")}
            </Button>
            <Button asChild variant="outline" className="h-[38px]">
              <Link href="/episodes">{t("episode.collapse")}</Link>
            </Button>
            <span className="text-[12.5px] text-muted-foreground">
              {t("explore.footer")}
            </span>
          </div>
        </fieldset>
      </form>
    </div>
  );
}
