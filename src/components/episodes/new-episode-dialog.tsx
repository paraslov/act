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
import { filledChip } from "@/components/episodes/chips";
import {
  ChoicePointBeam,
  choicePointNoteKey,
} from "@/components/episodes/choice-point";
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
import { BANDS, HOOK_TYPES } from "@/lib/act/constants";
import type {
  BehaviorStatus,
  Checks,
  Episode,
  EpisodeDir,
  PersonalValue,
} from "@/lib/act/types";
import { cn } from "@/lib/utils";

type FormState = Required<
  Pick<CreateEpisodeActionInput, "day" | "band" | "hook" | "situation" | "move">
> & {
  /** `null` means no direction has been touched yet (distinct from "Not sure yet"). */
  dir: EpisodeDir | null;
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
function initialForm(
  day: string,
  valueId: string | null,
  band: number,
): FormState {
  return {
    day,
    band,
    valueId,
    hook: "",
    situation: "",
    move: "",
    hookType: null,
    dir: null,
    behaviorStatus: "not-described",
    checks: {},
  };
}

/** Serif question label + hint + a vertically-resizable textarea on a warm field. */
function QuestionField({
  id,
  label,
  hint,
  value,
  placeholder,
  inputRef,
  onChange,
  children,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  placeholder?: string;
  inputRef?: React.Ref<HTMLTextAreaElement>;
  onChange: (value: string) => void;
  children?: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block font-serif text-xl leading-snug">
        {label}
      </label>
      <p className="mt-1 text-xs leading-relaxed text-foreground/55">{hint}</p>
      <textarea
        id={id}
        ref={inputRef}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-[54px] w-full resize-y rounded-input border bg-field px-3 py-2.5 text-sm leading-relaxed text-foreground placeholder:text-foreground/40 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-toward"
      />
      {children}
    </div>
  );
}

export function NewEpisodeDialogProvider({
  today,
  suggestedBand,
  values,
  morningValues,
  children,
}: {
  today: string;
  suggestedBand: number;
  values: PersonalValue[];
  morningValues: Record<string, string>;
  children: ReactNode;
}) {
  const t = useTranslations("actV2.ui");
  const old = useTranslations("episodeModal");
  const router = useRouter();
  const focusRef = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);
  const [legacy, setLegacy] = useState<Episode | null>(null);
  const suggestionFor = useCallback(
    (day: string) => {
      const id = morningValues[day];
      return id && values.some((value) => value.id === id) ? id : null;
    },
    [morningValues, values],
  );
  const [form, setForm] = useState(() =>
    initialForm(today, suggestionFor(today), suggestedBand),
  );
  const [saveError, setSaveError] = useState(false);
  const [isPending, startTransition] = useTransition();
  const openEpisodeDialog = useCallback(
    (day = today) => {
      setForm(initialForm(day, suggestionFor(day), suggestedBand));
      setLegacy(null);
      setSaveError(false);
      setOpen(true);
    },
    [today, suggestionFor, suggestedBand],
  );
  const clarifyEpisode = useCallback((episode: Episode) => {
    setLegacy(episode);
    setForm({
      ...initialForm(episode.day, episode.valueId ?? null, episode.band),
      hook: episode.hook,
      situation: episode.situation,
      move: episode.move === "—" ? "" : episode.move,
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

  // `explore` persists the brief note first (T01 gate), then opens the expanded
  // reflection page for the saved record; plain save closes the dialog.
  function save(explore = false) {
    if (!canSave || isPending) return;
    setSaveError(false);
    startTransition(async () => {
      try {
        if (legacy) {
          await clarifyEpisodeAction({
            id: legacy.id,
            dir: form.dir ?? "unknown",
            behaviorStatus: form.behaviorStatus,
            move: form.move,
            checks: form.checks,
          });
          setLegacy(null);
          setForm(initialForm(today, suggestionFor(today), form.band));
          setOpen(false);
          router.refresh();
          return;
        }
        const episode = await createEpisodeAction({
          day: form.day,
          band: form.band,
          hook: form.hook,
          hookType: form.hookType,
          situation: form.situation,
          move: form.move,
          // Direction is optional on the brief note; an untouched beam stays unknown.
          dir: form.dir ?? "unknown",
          valueId: form.valueId,
        });
        setForm(initialForm(today, suggestionFor(today), form.band));
        setOpen(false);
        if (explore) router.push(`/episodes/${episode.id}/explore`);
        else router.refresh();
      } catch {
        setSaveError(true);
      }
    });
  }

  const pickDir = (id: EpisodeDir) =>
    setField("dir", form.dir === id ? null : id);

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
          className="top-9 max-h-[calc(100dvh-6rem)] w-[calc(100%-2.5rem)] translate-y-0 overflow-y-auto rounded-modal bg-card p-0 sm:max-w-[620px]"
        >
          <DialogHeader className="border-b px-6 pt-5 pb-4 text-left">
            <p className="font-mono text-[9.5px] tracking-[0.16em] text-foreground/55 uppercase">
              {t(legacy ? "legacy.clarify" : "episode.eyebrow")}
            </p>
            <DialogTitle className="mt-1.5 font-serif text-[26px] leading-tight font-normal tracking-[-0.015em]">
              {t(legacy ? "legacy.clarify" : "episode.title")}
            </DialogTitle>
            <DialogDescription className="mt-1 max-w-[52ch] text-[13px] leading-normal text-foreground/60">
              {t(legacy ? "legacy.notice" : "episode.intro")}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              save();
            }}
          >
            <fieldset disabled={isPending}>
              <div className="flex flex-col gap-[18px] px-6 pt-[18px] pb-1">
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

                {/* When strip */}
                <fieldset
                  disabled={!!legacy}
                  className="rounded-input border bg-panel p-3"
                >
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono text-[9.5px] tracking-[0.14em] text-muted-foreground uppercase">
                      {t("episode.when")}
                    </span>
                    <Input
                      id="episode-day"
                      type="date"
                      value={form.day}
                      max={today}
                      onChange={(e) => setField("day", e.target.value)}
                      className="h-[34px] w-auto flex-1 basis-[150px] font-mono text-[12.5px]"
                    />
                    <span className="text-xs text-foreground/45">
                      {BANDS[form.band]}
                    </span>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {BANDS.map((band, index) => (
                      <button
                        key={band}
                        type="button"
                        aria-pressed={form.band === index}
                        onClick={() => setField("band", index)}
                        className={filledChip(
                          form.band === index,
                          "px-2.5 py-1.5 font-mono text-[11px] tracking-[0.04em]",
                        )}
                      >
                        {band}
                      </button>
                    ))}
                  </div>
                </fieldset>

                {legacy ? (
                  <QuestionField
                    id="episode-move"
                    label={t("episode.action")}
                    hint={t("episode.actionHint")}
                    value={form.move}
                    inputRef={focusRef}
                    onChange={(v) => setField("move", v)}
                  />
                ) : (
                  <>
                    <QuestionField
                      id="episode-situation"
                      label={t("episode.situation")}
                      hint={t("episode.situationHint")}
                      value={form.situation}
                      inputRef={focusRef}
                      onChange={(v) => setField("situation", v)}
                    />
                    <QuestionField
                      id="episode-hook"
                      label={t("episode.experience")}
                      hint={t("episode.experienceHint")}
                      value={form.hook}
                      onChange={(v) => setField("hook", v)}
                    >
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {HOOK_TYPES.map(({ id }) => (
                          <button
                            type="button"
                            key={id}
                            aria-pressed={form.hookType === id}
                            onClick={() =>
                              setField(
                                "hookType",
                                form.hookType === id ? null : id,
                              )
                            }
                            className={filledChip(
                              form.hookType === id,
                              "rounded-full px-[11px] py-1.5 text-[12.5px]",
                            )}
                          >
                            {t(`experienceTypes.${id}`)}
                          </button>
                        ))}
                      </div>
                    </QuestionField>
                    <QuestionField
                      id="episode-action"
                      label={t("episode.action")}
                      hint={t("episode.actionHint")}
                      value={form.move}
                      onChange={(v) => setField("move", v)}
                    />
                  </>
                )}

                {legacy && (
                  <>
                    <ActionInterpretation
                      dir={form.dir ?? "unknown"}
                      behaviorStatus={form.behaviorStatus}
                      onDirection={(dir) => setField("dir", dir)}
                      onBehavior={(status) =>
                        setField("behaviorStatus", status)
                      }
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
                    <ReflectionFields
                      checks={form.checks}
                      onChange={(checks) => setField("checks", checks)}
                    />
                  </>
                )}

                {/* Optional direction panel */}
                {!legacy && (
                  <div className="rounded-input border bg-panel p-3.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <span className="font-serif text-xl leading-snug">
                        {t("episode.directionQuestion")}
                      </span>
                      <span className="font-mono text-[9.5px] tracking-[0.14em] text-foreground/55 uppercase">
                        {t("common.optional")}
                      </span>
                    </div>
                    <div className="mt-2 flex justify-center">
                      <ChoicePointBeam
                        dir={form.dir}
                        awayLabel={t(
                          "direction.away.label",
                        ).toLocaleUpperCase()}
                        towardLabel={t(
                          "direction.toward.label",
                        ).toLocaleUpperCase()}
                        caption={t("choicePoint.caption").toLocaleUpperCase()}
                      />
                    </div>
                    <div className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2.5">
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
                          <span className="mt-1 block text-[12.5px] leading-snug text-foreground/75">
                            {t(`direction.${id}.description`)}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(["mixed", "unknown"] as const).map((id) => (
                        <button
                          key={id}
                          type="button"
                          aria-pressed={form.dir === id}
                          onClick={() => pickDir(id)}
                          className={cn(
                            "flex items-center gap-2 rounded-button border px-[11px] py-[7px] transition-colors",
                            id === "unknown" && "border-dashed",
                            form.dir === id
                              ? "border-foreground/40 bg-muted"
                              : "bg-card hover:bg-accent",
                          )}
                        >
                          <span
                            aria-hidden="true"
                            className={cn(
                              "size-[9px] shrink-0 border border-foreground/40",
                              id === "unknown"
                                ? "rounded-full border-dashed"
                                : "rounded-[2px]",
                            )}
                          />
                          <span className="text-[12.5px] font-medium text-foreground/80">
                            {t(`direction.${id}.label`)}
                          </span>
                        </button>
                      ))}
                    </div>
                    <p className="mt-2.5 max-w-[62ch] text-[11.5px] leading-relaxed text-foreground/55">
                      {t(choicePointNoteKey(form.dir, "modal"))}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-3.5 flex flex-wrap items-center gap-3 border-t bg-panel px-6 pt-3.5 pb-[18px]">
                <p
                  className={cn(
                    "min-w-0 flex-1 basis-[200px] text-[12.5px] leading-normal",
                    canSave ? "text-foreground/60" : "text-muted-foreground",
                  )}
                >
                  {t(legacy ? "episode.emptyError" : "episode.helperFilled")}
                </p>
                <div className="flex shrink-0 gap-2.5">
                  {!legacy && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!canSave}
                      onClick={() => save(true)}
                      className="h-[38px]"
                    >
                      {t("episode.expand")}
                    </Button>
                  )}
                  <Button
                    type="submit"
                    disabled={!canSave}
                    className="h-[38px]"
                  >
                    {isPending ? old("saving") : t("common.save")}
                  </Button>
                </div>
              </div>
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
