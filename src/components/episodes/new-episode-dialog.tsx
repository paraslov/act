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
    dir: "unknown",
    behaviorStatus: "not-described",
    checks: {},
  };
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
  const focusRef = useRef<HTMLInputElement>(null);
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
            dir: form.dir,
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
                    onChange={(e) => setField("day", e.target.value)}
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
                      {t(`experienceTypes.${id}`)}
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
              {legacy && (
                <>
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
                  <ReflectionFields
                    checks={form.checks}
                    onChange={(checks) => setField("checks", checks)}
                  />
                </>
              )}
              <p className="text-xs text-muted-foreground">
                {t("episode.emptyError")}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  disabled={!canSave}
                  className="flex-1 basis-40"
                >
                  {isPending ? old("saving") : t("common.save")}
                </Button>
                {!legacy && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!canSave}
                    onClick={() => save(true)}
                    className="flex-1 basis-40"
                  >
                    {t("episode.expand")}
                  </Button>
                )}
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
