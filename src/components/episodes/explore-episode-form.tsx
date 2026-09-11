"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { updateEpisodeAction } from "@/actions/episodes";
import {
  ActionInterpretation,
  ReflectionFields,
} from "@/components/episodes/reflection-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ValuePicker } from "@/components/values/value-picker";
import { BANDS, HOOK_TYPES, SKILLS, STATES } from "@/lib/act/constants";
import type {
  Checks,
  ConsequenceStatus,
  Episode,
  EpisodeDir,
  PatternSelection,
  PersonalValue,
  SkillSelection,
} from "@/lib/act/types";
import { SKILL_CARD_IDS, STATE_CARD_IDS } from "@/lib/reference/library";
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

/** Sentinels are mutually exclusive with each other and with any real selection. */
function toggle<T extends string>(current: T[], option: T, absences: T[]): T[] {
  if (current.includes(option))
    return current.filter((value) => value !== option);
  if (absences.includes(option)) return [option];
  return [...current.filter((value) => !absences.includes(value)), option];
}

function Field({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label htmlFor={id} className="block text-sm">
      {label}
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function ExploreEpisodeForm({
  episode,
  values,
}: {
  episode: Episode;
  values: PersonalValue[];
}) {
  const t = useTranslations("actV2.ui");
  const cards = useTranslations("actV2.cards");
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

  return (
    <div className="mx-auto max-w-[720px]">
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-serif text-[28px] leading-tight tracking-[-0.02em]">
          {t("episode.expand")}
        </h1>
        <Link
          href="/episodes"
          className="text-[13px] text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          {t("episode.collapse")}
        </Link>
      </header>
      <p className="mb-5 max-w-[66ch] text-[14px] leading-[1.6] text-foreground/70">
        {t("common.orientation")}
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <fieldset disabled={isPending} className="space-y-4">
          {saveError && (
            <p role="alert" className="text-sm text-destructive">
              {t("common.saveError")}
            </p>
          )}

          <label htmlFor="explore-day" className="block text-sm">
            {t("episode.date")}
            <Input
              id="explore-day"
              type="date"
              value={form.day}
              onChange={(e) => set("day", e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-1">
            {BANDS.map((band, index) => (
              <button
                key={band}
                type="button"
                aria-pressed={form.band === index}
                onClick={() => set("band", index)}
                className={cn(
                  "rounded-button border p-2 font-mono text-xs",
                  form.band === index && "bg-primary text-primary-foreground",
                )}
              >
                {band}
              </button>
            ))}
          </div>

          {/* 5.2 spine: situation → experience → behaviour → function → outcomes → value/direction → interpretation → experiment */}
          <Field
            id="explore-situation"
            label={t("episode.situation")}
            value={form.situation}
            onChange={(v) => set("situation", v)}
          />
          <Field
            id="explore-hook"
            label={t("episode.experience")}
            value={form.hook}
            onChange={(v) => set("hook", v)}
          />
          <div className="flex flex-wrap gap-2">
            {HOOK_TYPES.map(({ id }) => (
              <button
                type="button"
                key={id}
                aria-pressed={form.hookType === id}
                onClick={() =>
                  set("hookType", form.hookType === id ? null : id)
                }
                className={cn(
                  "rounded-chip border p-2 text-xs",
                  form.hookType === id && "bg-muted",
                )}
              >
                {t(`experienceTypes.${id}`)}
              </button>
            ))}
          </div>

          <Field
            id="explore-move"
            label={t("episode.action")}
            value={form.move}
            onChange={(v) => set("move", v)}
          />
          <ActionInterpretation
            dir={form.dir}
            behaviorStatus={form.behaviorStatus}
            onDirection={(dir) => set("dir", dir)}
            onBehavior={(status) => set("behaviorStatus", status)}
          />
          {form.behaviorStatus === "acted" && !form.move.trim() && (
            <p role="alert" className="text-sm">
              {t("episode.actedError")}
            </p>
          )}

          <Field
            id="explore-function"
            label={t("episode.intendedFunction")}
            value={form.intendedFunction}
            onChange={(v) => set("intendedFunction", v)}
          />
          <Field
            id="explore-immediate"
            label={t("episode.immediate")}
            value={form.immediateOutcome}
            onChange={(v) => set("immediateOutcome", v)}
          />
          <Field
            id="explore-later"
            label={t("episode.later")}
            value={form.laterConsequences}
            onChange={(v) => set("laterConsequences", v)}
          />
          {/* A prediction is never shown as something that happened (5.2). */}
          <fieldset className="flex flex-wrap gap-2">
            <legend className="sr-only">{t("episode.later")}</legend>
            {(["observed", "expected", "unknown"] as const).map((status) => (
              <label
                key={status}
                className={cn(
                  "flex items-center gap-2 rounded-button border p-2 text-xs",
                  status === "unknown" && "border-dashed",
                  form.consequenceStatus === status && "bg-muted",
                )}
              >
                <input
                  type="radio"
                  name="consequence-status"
                  checked={form.consequenceStatus === status}
                  onChange={() => set("consequenceStatus", status)}
                />
                {t(`consequenceStatus.${status}`)}
              </label>
            ))}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm">
              {t("rpg.statusEffects.label")} · {t("episode.patterns")}
            </legend>
            <p className="text-xs text-muted-foreground">
              {t("episode.patternsHelp")}
            </p>
            <div className="flex flex-wrap gap-2">
              {[...STATES.map(({ id }) => id), "unknown", "none-noticed"].map(
                (raw) => {
                  const option = raw as PatternPick;
                  const absence = absencePatterns.includes(option);
                  return (
                    <label
                      key={raw}
                      className={cn(
                        "flex items-center gap-2 rounded-chip border p-2 text-xs",
                        absence && "border-dashed",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={form.states.includes(option)}
                        onChange={() =>
                          set(
                            "states",
                            toggle(form.states, option, absencePatterns),
                          )
                        }
                      />
                      {absence
                        ? t(
                            option === "unknown"
                              ? "selection.unknown"
                              : "selection.noneNoticed",
                          )
                        : cards(
                            `${STATE_CARD_IDS[option as keyof typeof STATE_CARD_IDS]}.title`,
                          )}
                    </label>
                  );
                },
              )}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm">{t("episode.skills")}</legend>
            <div className="flex flex-wrap gap-2">
              {[...SKILLS.map(({ id }) => id), "unknown", "no-skill"].map(
                (raw) => {
                  const option = raw as SkillPick;
                  const absence = absenceSkills.includes(option);
                  return (
                    <label
                      key={raw}
                      className={cn(
                        "flex items-center gap-2 rounded-chip border p-2 text-xs",
                        absence && "border-dashed",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={form.skills.includes(option)}
                        onChange={() =>
                          set(
                            "skills",
                            toggle(form.skills, option, absenceSkills),
                          )
                        }
                      />
                      {absence
                        ? t(
                            option === "unknown"
                              ? "selection.unknown"
                              : "selection.noSkill",
                          )
                        : cards(
                            `${SKILL_CARD_IDS[option as keyof typeof SKILL_CARD_IDS]}.title`,
                          )}
                    </label>
                  );
                },
              )}
            </div>
          </fieldset>

          <Field
            id="explore-value"
            label={t("episode.value")}
            value={form.value}
            onChange={(v) => set("value", v)}
          />
          <ValuePicker
            values={values}
            value={form.valueId}
            onChange={(id) => set("valueId", id)}
            label={old("valuePickerLabel")}
          />

          <Field
            id="explore-interpretation"
            label={t("episode.direction")}
            value={form.interpretation}
            onChange={(v) => set("interpretation", v)}
          />
          <Field
            id="explore-next"
            label={t("episode.next")}
            value={form.nextExperiment}
            onChange={(v) => set("nextExperiment", v)}
          />

          <ReflectionFields
            checks={form.checks}
            onChange={(checks) => set("checks", checks)}
          />

          {episode.workable && (
            <p className="rounded-input border border-dashed p-3 text-sm text-muted-foreground">
              <span className="mr-2 font-mono text-xs uppercase">
                {t("legacy.reflection")}
              </span>
              {episode.workable}
            </p>
          )}

          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button
              type="submit"
              disabled={!canSave}
              className="flex-1 basis-40"
            >
              {isPending ? old("saving") : t("common.save")}
            </Button>
            <Button asChild variant="outline" className="flex-1 basis-40">
              <Link href="/episodes">{t("episode.collapse")}</Link>
            </Button>
          </div>
        </fieldset>
      </form>
    </div>
  );
}
