"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useRef, useState, useTransition } from "react";
import {
  createValueAction,
  updateValueAction,
} from "@/actions/personal-values";
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
import { DOMAINS, type DomainId } from "@/lib/act/constants";
import type { PersonalValue } from "@/lib/act/types";
import { cn } from "@/lib/utils";

export type ValueEditorTarget = {
  /** Changes on every open, so the form remounts with a clean draft. */
  key: string;
  /** The record being edited, or `null` when creating one. */
  value: PersonalValue | null;
  /** Domain pre-checked when the editor was opened from a section or the empty state. */
  presetDomain: DomainId | null;
};

type ExampleRow = { id: number; text: string };

const fieldClassName =
  "h-auto rounded-input bg-page px-3 py-2.5 text-[13.5px] shadow-none focus-visible:border-ring focus-visible:ring-ring/20";

function initialExamples(value: PersonalValue | null): ExampleRow[] {
  const rows = (value?.examples ?? []).map((text, index) => ({
    id: index,
    text,
  }));
  return rows.length ? rows : [{ id: 0, text: "" }];
}

function FieldLabel({
  badge,
  children,
  help,
  htmlFor,
}: {
  badge: string;
  children: ReactNode;
  help?: string;
  htmlFor?: string;
}) {
  // The domain chips are a group of their own controls, so that block gets a
  // plain heading rather than a `<label>` pointing at nothing.
  const Heading = htmlFor ? "label" : "span";

  return (
    <>
      <Heading
        htmlFor={htmlFor}
        className="flex flex-wrap items-baseline gap-2 text-[13.5px] font-medium"
      >
        {children}
        <span className="font-mono text-[9px] tracking-[0.1em] text-muted-foreground/80 uppercase">
          {badge}
        </span>
      </Heading>
      {help ? (
        <p className="mt-1 text-[12.5px] leading-[1.45] text-muted-foreground">
          {help}
        </p>
      ) : null}
    </>
  );
}

function ValueEditorForm({
  onArchive,
  onClose,
  onSaved,
  target,
}: {
  onArchive: (value: PersonalValue) => void;
  onClose: () => void;
  onSaved: () => void;
  target: ValueEditorTarget;
}) {
  const t = useTranslations("values.editor");
  const domainLabels = useTranslations("act.domains");
  const edited = target.value;
  const nextExampleId = useRef(initialExamples(edited).length);
  const [title, setTitle] = useState(edited?.title ?? "");
  const [domains, setDomains] = useState<DomainId[]>(
    edited?.domains ?? (target.presetDomain ? [target.presetDomain] : []),
  );
  const [meaning, setMeaning] = useState(edited?.meaning ?? "");
  const [examples, setExamples] = useState<ExampleRow[]>(() =>
    initialExamples(edited),
  );
  const [showErrors, setShowErrors] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [isPending, startTransition] = useTransition();

  const titleMissing = !title.trim();
  const domainsMissing = domains.length === 0;

  function toggleDomain(id: DomainId) {
    setDomains((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id],
    );
  }

  function save() {
    if (isPending) return;
    if (titleMissing || domainsMissing) {
      setShowErrors(true);
      return;
    }

    setSaveError(false);
    startTransition(async () => {
      const fields = {
        title: title.trim(),
        domains,
        meaning: meaning.trim(),
        examples: examples.map((example) => example.text.trim()),
      };
      try {
        if (edited) {
          await updateValueAction({ id: edited.id, ...fields });
        } else {
          await createValueAction(fields);
        }
        onSaved();
      } catch {
        setSaveError(true);
      }
    });
  }

  return (
    <>
      <DialogHeader className="mb-3.5 flex-row items-start justify-between gap-4 text-left">
        <div>
          <DialogTitle className="text-base font-semibold tracking-[-0.01em]">
            {edited ? t("editTitle") : t("newTitle")}
          </DialogTitle>
          <DialogDescription className="mt-2.5 max-w-[40ch] font-serif text-[21px] leading-[1.3] tracking-[-0.01em] text-foreground">
            {t("prompt")}
          </DialogDescription>
        </div>
        <DialogClose asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-[28px] shrink-0 rounded-button"
          >
            <X className="size-4" />
          </Button>
        </DialogClose>
      </DialogHeader>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <fieldset disabled={isPending} className="contents">
          <div className="mb-[17px]">
            <FieldLabel
              htmlFor="value-title"
              badge={t("required")}
              help={t("titleHelp")}
            >
              {t("titleLabel")}
            </FieldLabel>
            <Input
              id="value-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("titlePlaceholder")}
              className={cn("mt-2", fieldClassName)}
            />
            {showErrors && titleMissing ? (
              <p role="alert" className="mt-1.5 text-xs text-destructive">
                {t("titleError")}
              </p>
            ) : null}
          </div>

          <div className="mb-[17px]">
            <FieldLabel badge={t("requiredAny")} help={t("domainsHelp")}>
              {t("domainsLabel")}
            </FieldLabel>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {DOMAINS.map((domain) => {
                const checked = domains.includes(domain.id);
                return (
                  <label
                    key={domain.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-[9px] border bg-background px-[11px] py-2 text-[13px] text-muted-foreground transition-colors",
                      checked &&
                        "border-muted-foreground/50 bg-accent text-foreground",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleDomain(domain.id)}
                      className="size-[13px] accent-primary"
                    />
                    {domainLabels(`${domain.id}.label`)}
                  </label>
                );
              })}
            </div>
            {showErrors && domainsMissing ? (
              <p role="alert" className="mt-1.5 text-xs text-destructive">
                {t("domainsError")}
              </p>
            ) : null}
          </div>

          <div className="mb-[17px]">
            <FieldLabel htmlFor="value-meaning" badge={t("optional")}>
              {t("meaningLabel")}
            </FieldLabel>
            <textarea
              id="value-meaning"
              rows={2}
              value={meaning}
              onChange={(event) => setMeaning(event.target.value)}
              placeholder={t("meaningPlaceholder")}
              className={cn(
                "mt-2 w-full resize-none border border-input text-foreground outline-none placeholder:text-muted-foreground/70 focus-visible:ring-3",
                fieldClassName,
              )}
            />
          </div>

          <div className="mb-[17px]">
            <FieldLabel badge={t("optional")} help={t("examplesHelp")}>
              {t("examplesLabel")}
            </FieldLabel>
            <div className="mt-2 flex flex-col gap-1.5">
              {examples.map((example, index) => (
                <div key={example.id} className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-muted-foreground/80">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <Input
                    value={example.text}
                    onChange={(event) =>
                      setExamples((current) =>
                        current.map((row) =>
                          row.id === example.id
                            ? { ...row, text: event.target.value }
                            : row,
                        ),
                      )
                    }
                    placeholder={t("examplePlaceholder")}
                    className={cn("flex-1", fieldClassName)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={t("removeExample")}
                    onClick={() =>
                      setExamples((current) =>
                        current.length === 1
                          ? [{ id: example.id, text: "" }]
                          : current.filter((row) => row.id !== example.id),
                      )
                    }
                    className="size-[28px] shrink-0 rounded-button"
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setExamples((current) => [
                    ...current,
                    { id: nextExampleId.current++, text: "" },
                  ])
                }
                className="cursor-pointer self-start rounded-[9px] border border-dashed px-3 py-1.5 text-[12.5px] text-muted-foreground transition-colors hover:border-muted-foreground/60 hover:bg-accent hover:text-foreground"
              >
                {t("addExample")}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 border-t pt-4">
            <Button type="submit" className="h-9 rounded-button">
              {t("save")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-9 rounded-button"
            >
              {t("cancel")}
            </Button>
            {edited ? (
              <button
                type="button"
                onClick={() => onArchive(edited)}
                className="ml-auto cursor-pointer text-[12.5px] text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                {t("archive")}
              </button>
            ) : null}
          </div>
          <p className="mt-2.5 text-xs leading-[1.5] text-muted-foreground/80">
            {t("note")}
          </p>
          {saveError ? (
            <p role="alert" className="mt-2 text-xs text-destructive">
              {t("saveError")}
            </p>
          ) : null}
        </fieldset>
      </form>
    </>
  );
}

/**
 * The editor is a dialog, not a route, so the list keeps its scroll position and
 * nothing on this screen is lost by opening it.
 */
export function ValueEditorDialog({
  onArchive,
  onClose,
  onSaved,
  target,
}: {
  onArchive: (value: PersonalValue) => void;
  onClose: () => void;
  onSaved: () => void;
  target: ValueEditorTarget | null;
}) {
  // Keeps the last target on screen through the close animation; the form itself
  // is keyed, so reopening always starts from the record, never from this copy.
  const closing = useRef<ValueEditorTarget | null>(null);
  if (target) closing.current = target;
  const shown = target ?? closing.current;

  return (
    <Dialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="top-9 z-[60] block max-h-[calc(100dvh-6rem)] w-[calc(100%-2.5rem)] max-w-[600px] translate-y-0 overflow-y-auto rounded-modal border bg-card p-6 shadow-[0_26px_70px_rgba(0,0,0,0.24)] sm:p-[22px_24px_24px]"
      >
        {shown ? (
          <ValueEditorForm
            key={shown.key}
            target={shown}
            onClose={onClose}
            onSaved={onSaved}
            onArchive={onArchive}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
