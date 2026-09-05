"use client";

import { X } from "lucide-react";
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
import { createEpisodeAction } from "@/actions/episodes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AXES,
  type AxisKey,
  BANDS,
  HOOK_TYPES,
  type HookType,
  SKILLS,
  type SkillId,
  STATES,
  type StateId,
} from "@/lib/act/constants";
import type { Checks, EpisodeDir } from "@/lib/act/types";
import { cn } from "@/lib/utils";

type FormState = {
  day: string;
  band: number;
  hook: string;
  hookType: HookType;
  dir: EpisodeDir | null;
  state: StateId;
  skill: SkillId;
  value: string;
  move: string;
  workable: string;
  checks: Checks;
};

type EpisodeDialogContextValue = {
  openEpisodeDialog: (day?: string) => void;
};

const EpisodeDialogContext = createContext<EpisodeDialogContextValue | null>(
  null,
);

function currentBand(): number {
  return Math.min(7, Math.floor(new Date().getUTCHours() / 3));
}

function emptyChecks(): Checks {
  return Object.fromEntries(AXES.map((axis) => [axis.id, 0])) as Checks;
}

function initialForm(day: string, band = currentBand()): FormState {
  return {
    day,
    band,
    hook: "",
    hookType: "thought",
    dir: null,
    state: "fusion",
    skill: "notice",
    value: "",
    move: "",
    workable: "",
    checks: emptyChecks(),
  };
}

function TippingScale({ direction }: { direction: EpisodeDir | null }) {
  const t = useTranslations("episodeModal");
  const tilt = direction === "toward" ? -8 : direction === "away" ? 8 : 0;

  return (
    <svg
      role="img"
      aria-label={t("scaleLabel")}
      width="300"
      height="78"
      viewBox="0 0 300 78"
      className="max-w-full"
    >
      <line
        x1="150"
        y1="30"
        x2="150"
        y2="66"
        className="stroke-muted-foreground/60"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="126"
        y1="66"
        x2="174"
        y2="66"
        className="stroke-muted-foreground/60"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <text
        x="150"
        y="77"
        textAnchor="middle"
        fontSize="8.5"
        fontFamily="var(--font-mono), monospace"
        letterSpacing="1.2"
        className="fill-muted-foreground"
      >
        {t("choicePoint")}
      </text>
      <g
        transform={`rotate(${tilt} 150 30)`}
        style={{
          transition: "transform .5s cubic-bezier(.34, 1.3, .64, 1)",
        }}
      >
        <line
          x1="40"
          y1="30"
          x2="260"
          y2="30"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle
          cx="40"
          cy="30"
          r="11"
          className={cn(
            "fill-muted transition-colors duration-300",
            direction === "away" && "fill-away",
          )}
        />
        <circle
          cx="260"
          cy="30"
          r="11"
          className={cn(
            "fill-muted transition-colors duration-300",
            direction === "toward" && "fill-toward",
          )}
        />
        <text
          x="40"
          y="11"
          textAnchor="middle"
          fontSize="8.5"
          fontFamily="var(--font-mono), monospace"
          letterSpacing="1.2"
          fill="currentColor"
          opacity=".62"
        >
          {t("away")}
        </text>
        <text
          x="260"
          y="11"
          textAnchor="middle"
          fontSize="8.5"
          fontFamily="var(--font-mono), monospace"
          letterSpacing="1.2"
          fill="currentColor"
          opacity=".62"
        >
          {t("toward")}
        </text>
      </g>
    </svg>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="mb-1.5 block text-[13px] font-medium">{children}</span>
  );
}

export function NewEpisodeDialogProvider({
  today,
  children,
}: {
  today: string;
  children: ReactNode;
}) {
  const t = useTranslations("episodeModal");
  const router = useRouter();
  const hookRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => initialForm(today));
  const [saveError, setSaveError] = useState(false);
  const [isPending, startTransition] = useTransition();

  const openEpisodeDialog = useCallback(
    (day = today) => {
      setForm((current) => ({ ...current, day }));
      setSaveError(false);
      setOpen(true);
    },
    [today],
  );

  const contextValue = useMemo(
    () => ({ openEpisodeDialog }),
    [openEpisodeDialog],
  );
  const selectedState =
    STATES.find((state) => state.id === form.state) ?? STATES[0];
  const score = AXES.reduce(
    (total, axis) => total + (form.checks[axis.id] ?? 0),
    0,
  );
  const directionNote =
    form.dir === "toward"
      ? t("towardNote")
      : form.dir === "away"
        ? t("awayNote")
        : t("unpickedNote");

  function setField<Key extends keyof FormState>(
    key: Key,
    value: FormState[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function saveEpisode() {
    const hook = form.hook.trim();
    if (!hook || isPending) return;

    setSaveError(false);
    startTransition(async () => {
      try {
        await createEpisodeAction({
          day: form.day || undefined,
          band: form.band,
          dir: form.dir ?? undefined,
          hook,
          hookType: form.hookType,
          state: form.state,
          skill: form.skill,
          value: form.value,
          move: form.move,
          workable: form.workable,
          checks: form.checks,
        });
        const keptBand = form.band;
        setForm(initialForm(today, keptBand));
        setOpen(false);
        router.refresh();
      } catch {
        setSaveError(true);
      }
    });
  }

  return (
    <EpisodeDialogContext.Provider value={contextValue}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            hookRef.current?.focus();
          }}
          className="top-9 z-[60] block max-h-[calc(100dvh-6rem)] w-[calc(100%-2.5rem)] max-w-[600px] translate-y-0 overflow-y-auto rounded-modal border bg-card p-6 shadow-[0_26px_70px_rgba(0,0,0,0.24)] sm:p-[24px_26px_26px]"
        >
          <DialogHeader className="mb-[18px] flex-row items-start justify-between gap-4 text-left">
            <div>
              <DialogTitle className="font-serif text-2xl leading-none font-normal tracking-[-0.015em]">
                {t("title")}
              </DialogTitle>
              <DialogDescription className="mt-1 text-[13px]">
                {t("subtitle")}
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-[30px] shrink-0 rounded-button"
                aria-label={t("close")}
              >
                <X className="size-4" />
              </Button>
            </DialogClose>
          </DialogHeader>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              saveEpisode();
            }}
          >
            <fieldset disabled={isPending} className="contents">
              <div className="mb-3.5">
                <label htmlFor="episode-day">
                  <FieldLabel>{t("whenLabel")}</FieldLabel>
                </label>
                <Input
                  id="episode-day"
                  type="date"
                  value={form.day}
                  max={today}
                  onChange={(event) => setField("day", event.target.value)}
                  className="mb-1.5 h-9 rounded-button bg-page px-2.5 font-mono text-[13px] focus-visible:border-toward focus-visible:ring-toward/20"
                />
                <div className="grid grid-cols-4 gap-[5px]">
                  {BANDS.map((band, index) => (
                    <button
                      key={band}
                      type="button"
                      aria-pressed={form.band === index}
                      onClick={() => setField("band", index)}
                      className={cn(
                        "rounded-[7px] border bg-background py-[7px] font-mono text-[11px] text-muted-foreground transition-colors",
                        form.band === index &&
                          "border-primary bg-primary text-primary-foreground",
                      )}
                    >
                      {band}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-[13px]">
                <label htmlFor="episode-hook">
                  <FieldLabel>{t("hookLabel")}</FieldLabel>
                </label>
                <Input
                  ref={hookRef}
                  id="episode-hook"
                  value={form.hook}
                  onChange={(event) => setField("hook", event.target.value)}
                  placeholder={t("hookPlaceholder")}
                  className="h-[38px] rounded-[9px] bg-page px-[11px] text-[13.5px] focus-visible:border-toward focus-visible:ring-toward/20"
                />
                <span className="mt-[7px] flex flex-wrap gap-1.5">
                  {HOOK_TYPES.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      aria-pressed={form.hookType === type.id}
                      onClick={() => setField("hookType", type.id)}
                      className={cn(
                        "rounded-chip border bg-background px-2 py-1 font-mono text-[10px] tracking-[0.1em] text-muted-foreground uppercase transition-colors",
                        form.hookType === type.id &&
                          "border-primary bg-primary text-primary-foreground",
                      )}
                    >
                      {type.label}
                    </button>
                  ))}
                </span>
              </div>

              <div className="mb-3.5">
                <FieldLabel>{t("directionLabel")}</FieldLabel>
                <div className="flex h-[82px] items-center justify-center">
                  <TippingScale direction={form.dir} />
                </div>
                <div className="flex gap-[9px]">
                  <button
                    type="button"
                    aria-pressed={form.dir === "away"}
                    onClick={() => setField("dir", "away")}
                    className={cn(
                      "flex-1 rounded-input border-[1.5px] bg-background p-[11px_12px] text-left transition-colors",
                      form.dir === "away" && "border-away bg-away-tint",
                    )}
                  >
                    <span className="block font-mono text-[9.5px] tracking-[0.16em] text-away uppercase">
                      {t("away")}
                    </span>
                    <span className="mt-1 block text-[12.5px] leading-[1.4] text-muted-foreground">
                      {t("awaySummary")}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={form.dir === "toward"}
                    onClick={() => setField("dir", "toward")}
                    className={cn(
                      "flex-1 rounded-input border-[1.5px] bg-background p-[11px_12px] text-left transition-colors",
                      form.dir === "toward" && "border-toward bg-toward-tint",
                    )}
                  >
                    <span className="block font-mono text-[9.5px] tracking-[0.16em] text-toward uppercase">
                      {t("toward")}
                    </span>
                    <span className="mt-1 block text-[12.5px] leading-[1.4] text-muted-foreground">
                      {t("towardSummary")}
                    </span>
                  </button>
                </div>
                <p className="mt-2 text-xs leading-4.5 text-muted-foreground">
                  {directionNote}
                </p>
              </div>

              <div className="mb-[13px]">
                <label htmlFor="episode-state">
                  <FieldLabel>{t("statusLabel")}</FieldLabel>
                </label>
                <Select
                  value={form.state}
                  onValueChange={(value) => setField("state", value as StateId)}
                >
                  <SelectTrigger
                    id="episode-state"
                    className="h-[38px] w-full rounded-[9px] bg-page px-[11px] text-[13.5px]"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {STATES.map((state) => (
                      <SelectItem key={state.id} value={state.id}>
                        {state.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="mt-1.5 block text-[12.5px] leading-[1.45] text-muted-foreground">
                  {selectedState.description}
                </span>
              </div>

              <div className="mb-[13px]">
                <label htmlFor="episode-skill">
                  <FieldLabel>{t("skillLabel")}</FieldLabel>
                </label>
                <Select
                  value={form.skill}
                  onValueChange={(value) => setField("skill", value as SkillId)}
                >
                  <SelectTrigger
                    id="episode-skill"
                    className="h-[38px] w-full rounded-[9px] bg-page px-[11px] text-[13.5px]"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {SKILLS.map((skill) => (
                      <SelectItem key={skill.id} value={skill.id}>
                        {skill.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <label className="mb-[13px] block" htmlFor="episode-value">
                <FieldLabel>{t("valueLabel")}</FieldLabel>
                <Input
                  id="episode-value"
                  value={form.value}
                  onChange={(event) => setField("value", event.target.value)}
                  placeholder={t("valuePlaceholder")}
                  className="h-[38px] rounded-[9px] bg-page px-[11px] text-[13.5px] focus-visible:border-toward focus-visible:ring-toward/20"
                />
              </label>

              <label className="mb-[13px] block" htmlFor="episode-move">
                <FieldLabel>
                  {form.dir === "away"
                    ? t("awayMoveLabel")
                    : t("towardMoveLabel")}
                </FieldLabel>
                <Input
                  id="episode-move"
                  value={form.move}
                  onChange={(event) => setField("move", event.target.value)}
                  placeholder={
                    form.dir === "away"
                      ? t("awayMovePlaceholder")
                      : t("towardMovePlaceholder")
                  }
                  className="h-[38px] rounded-[9px] bg-page px-[11px] text-[13.5px] focus-visible:border-toward focus-visible:ring-toward/20"
                />
              </label>

              <label className="mb-4 block" htmlFor="episode-workable">
                <FieldLabel>{t("workableLabel")}</FieldLabel>
                <Input
                  id="episode-workable"
                  value={form.workable}
                  onChange={(event) => setField("workable", event.target.value)}
                  placeholder={t("workablePlaceholder")}
                  className="h-[38px] rounded-[9px] bg-page px-[11px] text-[13.5px] focus-visible:border-toward focus-visible:ring-toward/20"
                />
              </label>

              <div className="border-t pt-3.5">
                <p className="mb-[3px] text-[13px] font-medium">
                  {t("flexibilityTitle")}
                </p>
                <p className="mb-[11px] text-xs leading-[1.45] text-muted-foreground">
                  {t("flexibilityHint")}
                </p>
                <div className="flex flex-col gap-2">
                  {AXES.map((axis) => (
                    <div
                      key={axis.id}
                      className="flex items-center justify-between gap-2.5"
                    >
                      <span className="text-[13px] text-muted-foreground">
                        {axis.prompt}
                      </span>
                      <span className="flex shrink-0 gap-1">
                        {([0, 1, 2] as const).map((value) => (
                          <button
                            key={value}
                            type="button"
                            aria-label={`${axis.label}: ${value}`}
                            aria-pressed={form.checks[axis.id] === value}
                            onClick={() =>
                              setField("checks", {
                                ...form.checks,
                                [axis.id as AxisKey]: value,
                              })
                            }
                            className={cn(
                              "size-7 rounded-[7px] border bg-background text-[13px] text-muted-foreground transition-colors",
                              form.checks[axis.id] === value &&
                                "border-toward bg-toward text-toward-foreground",
                            )}
                          >
                            {value}
                          </button>
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
                <p
                  aria-live="polite"
                  className="mt-3 text-right font-mono text-xs text-muted-foreground"
                >
                  {score} / 10
                </p>
              </div>

              {saveError ? (
                <p
                  role="alert"
                  className="mt-3 text-center text-xs text-destructive"
                >
                  {t("saveError")}
                </p>
              ) : null}
              <Button
                type="submit"
                className="mt-3.5 h-[38px] w-full rounded-[9px]"
              >
                {isPending ? t("saving") : t("save")}
              </Button>
            </fieldset>
          </form>
        </DialogContent>
      </Dialog>
    </EpisodeDialogContext.Provider>
  );
}

export function useNewEpisodeDialog(): EpisodeDialogContextValue {
  const value = useContext(EpisodeDialogContext);
  if (!value) {
    throw new Error(
      "useNewEpisodeDialog must be used inside NewEpisodeDialogProvider",
    );
  }
  return value;
}
