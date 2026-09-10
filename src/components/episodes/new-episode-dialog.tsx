"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  type CreateEpisodeActionInput,
  clarifyEpisodeAction,
  createEpisodeAction,
} from "@/actions/episodes";
import {
  ActionInterpretation,
  ReflectionFields,
} from "@/components/episodes/reflection-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ValuePicker } from "@/components/values/value-picker";
import { BANDS, HOOK_TYPES, SKILLS, STATES } from "@/lib/act/constants";
import type {
  BehaviorStatus,
  Checks,
  Episode,
  EpisodeDir,
  PersonalValue,
} from "@/lib/act/types";
import { SKILL_CARD_IDS, STATE_CARD_IDS } from "@/lib/reference/library";
import { cn } from "@/lib/utils";

type FormState = Required<
  Pick<
    CreateEpisodeActionInput,
    | "day"
    | "band"
    | "hook"
    | "situation"
    | "move"
    | "value"
    | "workable"
    | "states"
    | "skills"
  >
> & {
  dir: EpisodeDir;
  behaviorStatus: BehaviorStatus;
  checks: Checks;
  valueId: string | null;
  hookType: Episode["hookType"];
};
type EpisodeDialogContextValue = {
  openEpisodeDialog: (day?: string) => void;
  clarifyEpisode: (episode: Episode) => void;
};
const EpisodeDialogContext = createContext<EpisodeDialogContextValue | null>(
  null,
);
// TODO A15 / Phase 6: use the user's configured zone for this suggestion.
const currentBand = () => Math.min(7, Math.floor(new Date().getUTCHours() / 3));
function initialForm(
  day: string,
  valueId: string | null,
  band = currentBand(),
): FormState {
  return {
    day,
    band,
    valueId,
    hook: "",
    situation: "",
    move: "",
    value: "",
    workable: "",
    hookType: null,
    dir: "unknown",
    behaviorStatus: "not-described",
    checks: {},
    states: [],
    skills: [],
  };
}

export function NewEpisodeDialogProvider({
  today,
  values,
  morningValues,
  children,
}: {
  today: string;
  values: PersonalValue[];
  morningValues: Record<string, string>;
  children: ReactNode;
}) {
  const t = useTranslations("actV2.ui");
  const cards = useTranslations("actV2.cards");
  const old = useTranslations("episodeModal");
  const act = useTranslations("act");
  const router = useRouter();
  const focusRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [legacy, setLegacy] = useState<Episode | null>(null);
  const [valuePicked, setValuePicked] = useState(false);
  const suggestionFor = useCallback(
    (day: string) => {
      const id = morningValues[day];
      return id && values.some((value) => value.id === id) ? id : null;
    },
    [morningValues, values],
  );
  const [form, setForm] = useState(() =>
    initialForm(today, suggestionFor(today)),
  );
  const [saveError, setSaveError] = useState(false);
  const [isPending, startTransition] = useTransition();
  const openEpisodeDialog = useCallback(
    (day = today) => {
      setForm((current) =>
        legacy
          ? initialForm(day, suggestionFor(day))
          : {
              ...current,
              day,
              valueId: valuePicked ? current.valueId : suggestionFor(day),
            },
      );
      setLegacy(null);
      setSaveError(false);
      setOpen(true);
    },
    [today, suggestionFor, legacy, valuePicked],
  );
  const clarifyEpisode = useCallback((episode: Episode) => {
    setLegacy(episode);
    setForm({
      ...initialForm(episode.day, episode.valueId ?? null, episode.band),
      hook: episode.hook,
      situation: episode.situation,
      move: episode.move === "—" ? "" : episode.move,
      value: episode.value,
      workable: episode.workable,
      hookType: episode.hookType,
      // Legacy defaults are never preselected as a present-day interpretation.
      dir: "unknown",
      behaviorStatus: "not-described",
      checks: {},
    });
    setSaveError(false);
    setOpen(true);
  }, []);
  const context = useMemo(
    () => ({ openEpisodeDialog, clarifyEpisode }),
    [openEpisodeDialog, clarifyEpisode],
  );
  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
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
        if (legacy)
          await clarifyEpisodeAction({
            id: legacy.id,
            dir: form.dir,
            behaviorStatus: form.behaviorStatus,
            move: form.move,
            checks: form.checks,
          });
        else await createEpisodeAction(form);
        setLegacy(null);
        setValuePicked(false);
        setForm(initialForm(today, suggestionFor(today), form.band));
        setOpen(false);
        router.refresh();
      } catch {
        setSaveError(true);
      }
    });
  }
  return (
    <EpisodeDialogContext.Provider value={context}>
      {children}
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!isPending) setOpen(next);
        }}
      >
        <DialogContent
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            focusRef.current?.focus();
          }}
          className="top-9 max-h-[calc(100dvh-6rem)] w-[calc(100%-2.5rem)] translate-y-0 overflow-y-auto rounded-modal bg-card p-6 sm:max-w-[600px]"
        >
          <DialogHeader className="text-left">
            <DialogTitle className="font-serif text-2xl font-normal">
              {t(legacy ? "legacy.clarify" : "episode.title")}
            </DialogTitle>
            <DialogDescription>
              {t(legacy ? "legacy.notice" : "episode.intro")}
            </DialogDescription>
          </DialogHeader>
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
              {legacy && (
                <p className="rounded-input border border-dashed p-3 text-xs text-muted-foreground">
                  {t("legacy.excluded")}
                </p>
              )}
              <fieldset disabled={!!legacy} className="space-y-3">
                <label htmlFor="episode-day" className="block text-sm">
                  {t("episode.date")}
                  <Input
                    id="episode-day"
                    type="date"
                    value={form.day}
                    max={today}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        day: e.target.value,
                        valueId: valuePicked
                          ? current.valueId
                          : suggestionFor(e.target.value),
                      }))
                    }
                  />
                </label>
                <div className="flex flex-wrap gap-1">
                  {BANDS.map((band, index) => (
                    <button
                      key={band}
                      type="button"
                      aria-pressed={form.band === index}
                      onClick={() => setField("band", index)}
                      className={cn(
                        "rounded-button border p-2 font-mono text-xs",
                        form.band === index &&
                          "bg-primary text-primary-foreground",
                      )}
                    >
                      {band}
                    </button>
                  ))}
                </div>
                {(["situation", "hook"] as const).map((field) => (
                  <label
                    key={field}
                    htmlFor={`episode-${field}`}
                    className="block text-sm"
                  >
                    {t(
                      field === "hook"
                        ? "episode.experience"
                        : "episode.situation",
                    )}
                    <Input
                      id={`episode-${field}`}
                      ref={field === "situation" ? focusRef : undefined}
                      value={form[field]}
                      onChange={(e) => setField(field, e.target.value)}
                    />
                  </label>
                ))}
                <div className="flex flex-wrap gap-2">
                  {HOOK_TYPES.map(({ id }) => (
                    <button
                      type="button"
                      key={id}
                      aria-pressed={form.hookType === id}
                      onClick={() =>
                        setField("hookType", form.hookType === id ? null : id)
                      }
                      className={cn(
                        "rounded-chip border p-2 text-xs",
                        form.hookType === id && "bg-muted",
                      )}
                    >
                      {act(`hookTypes.${id}.label`)}
                    </button>
                  ))}
                </div>
              </fieldset>
              <label htmlFor="episode-move" className="block text-sm">
                {t("episode.action")}
                <Input
                  ref={legacy ? focusRef : undefined}
                  id="episode-move"
                  value={form.move}
                  onChange={(e) => setField("move", e.target.value)}
                />
              </label>
              <ActionInterpretation
                dir={form.dir}
                behaviorStatus={form.behaviorStatus}
                onDirection={(dir) => setField("dir", dir)}
                onBehavior={(status) => setField("behaviorStatus", status)}
              />
              {(form.behaviorStatus === "not-described" ||
                !form.move.trim()) && (
                <p className="rounded-input border border-dashed p-3 text-xs text-muted-foreground">
                  {t("episode.noAction")}
                </p>
              )}
              {form.behaviorStatus === "acted" && !form.move.trim() && (
                <p role="alert" className="text-sm">
                  {t("episode.actedError")}
                </p>
              )}
              {!legacy && (
                <>
                  <fieldset className="space-y-2">
                    <legend className="text-sm">
                      {t("rpg.statusEffects.label")} · {t("episode.patterns")}
                    </legend>
                    <p className="text-xs text-muted-foreground">
                      {t("episode.patternsHelp")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        ...STATES.map(({ id }) => id),
                        "unknown",
                        "none-noticed",
                      ].map((id) => {
                        const option = id as FormState["states"][number];
                        const absence =
                          id === "unknown" || id === "none-noticed";
                        return (
                          <label
                            key={id}
                            className={cn(
                              "flex items-center gap-2 rounded-chip border p-2 text-xs",
                              absence && "border-dashed",
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={form.states.includes(option)}
                              onChange={() =>
                                setField(
                                  "states",
                                  form.states.includes(option)
                                    ? form.states.filter((v) => v !== option)
                                    : absence
                                      ? [option]
                                      : [
                                          ...form.states.filter(
                                            (v) =>
                                              v !== "unknown" &&
                                              v !== "none-noticed",
                                          ),
                                          option,
                                        ],
                                )
                              }
                            />
                            {absence
                              ? t(
                                  id === "unknown"
                                    ? "selection.unknown"
                                    : "selection.noneNoticed",
                                )
                              : cards(
                                  `${STATE_CARD_IDS[id as keyof typeof STATE_CARD_IDS]}.title`,
                                )}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                  <fieldset className="space-y-2">
                    <legend className="text-sm">{t("episode.skills")}</legend>
                    <div className="flex flex-wrap gap-2">
                      {[
                        ...SKILLS.map(({ id }) => id),
                        "unknown",
                        "no-skill",
                      ].map((id) => {
                        const option = id as FormState["skills"][number];
                        const absence = id === "unknown" || id === "no-skill";
                        return (
                          <label
                            key={id}
                            className={cn(
                              "flex items-center gap-2 rounded-chip border p-2 text-xs",
                              absence && "border-dashed",
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={form.skills.includes(option)}
                              onChange={() =>
                                setField(
                                  "skills",
                                  form.skills.includes(option)
                                    ? form.skills.filter((v) => v !== option)
                                    : absence
                                      ? [option]
                                      : [
                                          ...form.skills.filter(
                                            (v) =>
                                              v !== "unknown" &&
                                              v !== "no-skill",
                                          ),
                                          option,
                                        ],
                                )
                              }
                            />
                            {absence
                              ? t(
                                  id === "unknown"
                                    ? "selection.unknown"
                                    : "selection.noSkill",
                                )
                              : id === "commit"
                                ? cards(`${SKILL_CARD_IDS.commit}.title`)
                                : act(`skills.${id}.label`)}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                  <label htmlFor="episode-value" className="block text-sm">
                    {t("episode.value")}
                    <Input
                      id="episode-value"
                      value={form.value}
                      onChange={(e) => setField("value", e.target.value)}
                    />
                  </label>
                  <ValuePicker
                    values={values}
                    value={form.valueId}
                    onChange={(id) => {
                      setValuePicked(true);
                      setField("valueId", id);
                    }}
                    label={old("valuePickerLabel")}
                    suggested={!valuePicked && !!form.valueId}
                  />
                  <label htmlFor="episode-workable" className="block text-sm">
                    {t("legacy.reflection")}
                    <Input
                      id="episode-workable"
                      value={form.workable}
                      onChange={(e) => setField("workable", e.target.value)}
                    />
                  </label>
                </>
              )}
              <ReflectionFields
                checks={form.checks}
                onChange={(checks) => setField("checks", checks)}
              />
              <p className="text-xs text-muted-foreground">
                {t("episode.emptyError")}
              </p>
              <Button type="submit" disabled={!canSave} className="w-full">
                {isPending ? old("saving") : t("common.save")}
              </Button>
            </fieldset>
          </form>
        </DialogContent>
      </Dialog>
    </EpisodeDialogContext.Provider>
  );
}
export function useNewEpisodeDialog(): EpisodeDialogContextValue {
  const context = useContext(EpisodeDialogContext);
  if (!context) throw new Error("Episode dialog provider is missing");
  return context;
}
