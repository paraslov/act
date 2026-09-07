"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useOptimistic, useState, useTransition } from "react";
import {
  archiveValueAction,
  restoreValueAction,
} from "@/actions/personal-values";
import { Button } from "@/components/ui/button";
import {
  ValueEditorDialog,
  type ValueEditorTarget,
} from "@/components/values/value-editor-dialog";
import { DOMAINS, type DomainId } from "@/lib/act/constants";
import type { PersonalValue } from "@/lib/act/types";
import { vaultHref } from "@/lib/reference/vault";
import { cn } from "@/lib/utils";

type ValuesViewProps = {
  /** Active and archived together — the switch below is UI state, not a route. */
  values: PersonalValue[];
};

type ArchivePatch = { id: string; archived: boolean };

const cardControlClassName =
  "flex h-6 cursor-pointer items-center rounded-chip border bg-card px-2 text-[11.5px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";

/** Free-text examples may repeat, so rows carry a positional key. */
function keyedExamples(examples: string[]): { key: string; text: string }[] {
  return examples.map((text, position) => ({
    key: `${position}:${text}`,
    text,
  }));
}

/** "7 Sep" — a plain fact about the record, never a milestone. */
function archivedOn(archivedAt: string, locale: string): string {
  const date = new Date(archivedAt);
  if (locale === "ru") {
    return new Intl.DateTimeFormat(locale, {
      timeZone: "UTC",
      day: "numeric",
      month: "short",
    }).format(date);
  }
  // Day before month, the same order `formatDayLabel` builds for English.
  const month = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
  }).format(date);
  return `${date.getUTCDate()} ${month}`;
}

function DomainTag({
  emphasised,
  label,
}: {
  emphasised?: boolean;
  label: string;
}) {
  return (
    <span
      className={cn(
        "rounded-chip border px-[7px] py-px font-mono text-[9px] tracking-[0.08em] uppercase",
        emphasised
          ? "border-border bg-accent text-foreground/75"
          : "border-transparent text-muted-foreground/70",
      )}
    >
      {label}
    </span>
  );
}

function ValueCard({
  domain,
  onArchive,
  onEdit,
  value,
}: {
  domain: DomainId;
  onArchive: () => void;
  onEdit: () => void;
  value: PersonalValue;
}) {
  const t = useTranslations("values");
  const domains = useTranslations("act.domains");
  const others = DOMAINS.filter(
    (entry) => entry.id !== domain && value.domains.includes(entry.id),
  );

  return (
    <article className="rounded-[11px] border bg-page px-[13px] py-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-serif text-[17px] leading-[1.35] tracking-[-0.01em] text-pretty">
          {value.title}
        </h3>
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={onEdit}
            className={cardControlClassName}
          >
            {t("edit")}
          </button>
          <button
            type="button"
            onClick={onArchive}
            className={cardControlClassName}
          >
            {t("archive")}
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {DOMAINS.filter((entry) => value.domains.includes(entry.id)).map(
          (entry) => (
            <DomainTag
              key={entry.id}
              label={domains(`${entry.id}.label`)}
              emphasised={entry.id === domain}
            />
          ),
        )}
      </div>

      {value.meaning ? (
        <p className="mt-2 text-[13px] leading-[1.5] text-muted-foreground">
          {value.meaning}
        </p>
      ) : null}

      {value.examples.length ? (
        <div className="mt-2.5 border-t pt-2.5">
          <p className="mb-1.5 font-mono text-[9px] tracking-[0.1em] text-muted-foreground/80 uppercase">
            {t("examplesLabel")}
          </p>
          <ul className="flex flex-col gap-1">
            {keyedExamples(value.examples).map((example) => (
              <li
                key={example.key}
                className="border-l pl-2.5 text-[12.5px] leading-[1.45] text-muted-foreground"
              >
                {example.text}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {others.length ? (
        <p className="mt-2.5 font-mono text-[9px] tracking-[0.08em] text-muted-foreground/70 uppercase">
          {t("alsoShownIn", {
            domains: others
              .map((entry) => domains(`${entry.id}.label`))
              .join(` ${t("domainJoiner")} `),
          })}
        </p>
      ) : null}
    </article>
  );
}

function DomainSection({
  domain,
  onAdd,
  onArchive,
  onEdit,
  values,
}: {
  domain: DomainId;
  onAdd: () => void;
  onArchive: (value: PersonalValue) => void;
  onEdit: (value: PersonalValue) => void;
  values: PersonalValue[];
}) {
  const t = useTranslations("values");
  const domains = useTranslations("act.domains");

  return (
    <section className="min-w-0 grow basis-[330px] rounded-card border bg-card px-[17px] pt-4 pb-[17px]">
      <div className="flex items-baseline justify-between gap-3 border-b pb-3">
        <h2 className="font-mono text-[10.5px] tracking-[0.14em] text-muted-foreground uppercase">
          {domains(`${domain}.label`)}
        </h2>
        <span className="font-mono text-[10px] text-muted-foreground/80">
          {t("count", { count: values.length })}
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-2.5">
        {values.map((value) => (
          <ValueCard
            key={value.id}
            domain={domain}
            value={value}
            onEdit={() => onEdit(value)}
            onArchive={() => onArchive(value)}
          />
        ))}
        {values.length ? null : (
          <p className="text-[13px] leading-[1.5] text-muted-foreground">
            {t("domainEmpty")}
          </p>
        )}
        <button
          type="button"
          onClick={onAdd}
          className="cursor-pointer rounded-[10px] border border-dashed py-2.5 text-[13px] text-muted-foreground transition-colors hover:border-muted-foreground/60 hover:bg-accent hover:text-foreground"
        >
          {t("addToDomain")}
        </button>
      </div>
    </section>
  );
}

function EmptyState({ onPick }: { onPick: (domain: DomainId) => void }) {
  const t = useTranslations("values");
  const domains = useTranslations("act.domains");

  return (
    <section className="max-w-[600px] rounded-card border bg-card px-6 pt-[26px] pb-6">
      <h2 className="max-w-[38ch] font-serif text-[22px] leading-[1.3] tracking-[-0.01em]">
        {t("empty.title")}
      </h2>
      <p className="mt-2 text-[13.5px] leading-[1.55] text-muted-foreground">
        {t("empty.body")}
      </p>
      <div className="mt-4 flex flex-wrap gap-2.5">
        {DOMAINS.map((domain) => (
          <button
            key={domain.id}
            type="button"
            onClick={() => onPick(domain.id)}
            className="min-w-0 grow basis-[200px] cursor-pointer rounded-[11px] border bg-page px-3.5 py-3 text-left transition-colors hover:bg-accent"
          >
            <span className="block font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
              {domains(`${domain.id}.label`)}
            </span>
            <span className="mt-1.5 block text-[13px] leading-[1.45] text-muted-foreground">
              {domains(`${domain.id}.hint`)}
            </span>
          </button>
        ))}
      </div>
      <p className="mt-4 text-[12.5px] text-muted-foreground">
        {t("empty.vaultPrompt")}{" "}
        <Link
          href={vaultHref("orient-to-values")}
          className="text-foreground underline underline-offset-2"
        >
          {t("empty.vaultLink")}
        </Link>
      </p>
    </section>
  );
}

function ArchivedList({
  onRestore,
  values,
}: {
  onRestore: (value: PersonalValue) => void;
  values: PersonalValue[];
}) {
  const t = useTranslations("values");
  const domains = useTranslations("act.domains");
  const locale = useLocale();

  return (
    <section className="max-w-[640px]">
      <p className="mb-3.5 text-[13.5px] leading-[1.55] text-muted-foreground">
        {t("archived.intro")}
      </p>
      <div className="flex flex-col gap-2.5">
        {values.map((value) => (
          <article
            key={value.id}
            className="flex flex-wrap items-start justify-between gap-3 rounded-[11px] border bg-card px-[15px] py-3.5 opacity-[0.78]"
          >
            <div className="min-w-0">
              <h2 className="font-serif text-[16.5px] leading-[1.35] tracking-[-0.01em] text-muted-foreground text-pretty">
                {value.title}
              </h2>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {DOMAINS.filter((entry) =>
                  value.domains.includes(entry.id),
                ).map((entry) => (
                  <DomainTag
                    key={entry.id}
                    label={domains(`${entry.id}.label`)}
                  />
                ))}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2.5">
              <span className="font-mono text-[9.5px] tracking-[0.08em] text-muted-foreground/80 uppercase">
                {t("archived.when", {
                  date: value.archivedAt
                    ? archivedOn(value.archivedAt, locale)
                    : "",
                })}
              </span>
              <button
                type="button"
                onClick={() => onRestore(value)}
                className="h-7 cursor-pointer rounded-chip border bg-page px-2.5 text-[12px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {t("archived.restore")}
              </button>
            </div>
          </article>
        ))}
        {values.length ? null : (
          <p className="text-[13px] text-muted-foreground">
            {t("archived.empty")}
          </p>
        )}
      </div>
    </section>
  );
}

export function ValuesView({ values }: ValuesViewProps) {
  const t = useTranslations("values");
  const router = useRouter();
  const [view, setView] = useState<"active" | "archived">("active");
  const [editor, setEditor] = useState<ValueEditorTarget | null>(null);
  const [editorCount, setEditorCount] = useState(0);
  const [archiveError, setArchiveError] = useState(false);
  const [, startTransition] = useTransition();
  // Archiving is small and reversible, so it applies immediately; React drops
  // the optimistic patch when the transition ends, which is the rollback.
  const [shownValues, applyArchive] = useOptimistic(
    values,
    (current: PersonalValue[], patch: ArchivePatch) =>
      current.map((value) =>
        value.id === patch.id
          ? {
              ...value,
              archivedAt: patch.archived
                ? (value.archivedAt ?? new Date().toISOString())
                : null,
            }
          : value,
      ),
  );

  const active = shownValues.filter((value) => !value.archivedAt);
  const archived = shownValues.filter((value) => value.archivedAt);

  function openEditor(
    value: PersonalValue | null,
    presetDomain: DomainId | null = null,
  ) {
    setEditorCount((count) => count + 1);
    setEditor({
      key: `${value?.id ?? "new"}-${editorCount}`,
      value,
      presetDomain,
    });
  }

  function setArchived(value: PersonalValue, archivedNext: boolean) {
    setArchiveError(false);
    startTransition(async () => {
      applyArchive({ id: value.id, archived: archivedNext });
      try {
        await (archivedNext
          ? archiveValueAction({ id: value.id })
          : restoreValueAction({ id: value.id }));
        router.refresh();
      } catch {
        setArchiveError(true);
      }
    });
  }

  return (
    <div>
      <header className="mb-1.5 flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-serif text-[34px] leading-[1.1] tracking-[-0.02em]">
          {t("title")}
        </h1>
        <span className="font-mono text-[11.5px] tracking-[0.08em] text-muted-foreground uppercase">
          {t("meta")}
        </span>
      </header>
      <p className="mb-[18px] max-w-[64ch] text-[14.5px] leading-[1.55] text-foreground/70">
        {t("intro")}
      </p>

      <div className="mb-[18px] flex flex-wrap items-center gap-2.5">
        <div className="inline-flex rounded-button bg-accent p-[3px]">
          {(["active", "archived"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={view === mode}
              onClick={() => setView(mode)}
              className={cn(
                "cursor-pointer rounded-chip px-3 py-1.5 text-[12.5px] font-medium text-muted-foreground transition-colors",
                view === mode && "bg-card text-foreground shadow-sm",
              )}
            >
              {mode === "active"
                ? t("viewActive")
                : t("viewArchived", { count: archived.length })}
            </button>
          ))}
        </div>
        <Button
          type="button"
          onClick={() => openEditor(null)}
          className="h-8 rounded-button px-3 text-[13px]"
        >
          {t("newValue")}
        </Button>
        <Link
          href={vaultHref("orient-to-values")}
          className="text-[13px] text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          {t("helpLink")}
        </Link>
      </div>

      {archiveError ? (
        <p role="alert" className="mb-3 text-xs text-destructive">
          {t("archiveError")}
        </p>
      ) : null}

      {view === "archived" ? (
        <ArchivedList
          values={archived}
          onRestore={(value) => setArchived(value, false)}
        />
      ) : active.length ? (
        <>
          <div className="flex flex-wrap gap-4">
            {DOMAINS.map((domain) => (
              <DomainSection
                key={domain.id}
                domain={domain.id}
                values={active.filter((value) =>
                  value.domains.includes(domain.id),
                )}
                onAdd={() => openEditor(null, domain.id)}
                onEdit={(value) => openEditor(value)}
                onArchive={(value) => setArchived(value, true)}
              />
            ))}
          </div>
          <p className="mt-4 max-w-[70ch] text-[12.5px] leading-[1.5] text-muted-foreground">
            {t("footer")}
          </p>
        </>
      ) : (
        <EmptyState onPick={(domain) => openEditor(null, domain)} />
      )}

      <ValueEditorDialog
        target={editor}
        onClose={() => setEditor(null)}
        onSaved={() => {
          setEditor(null);
          router.refresh();
        }}
        onArchive={(value) => {
          setEditor(null);
          setArchived(value, true);
        }}
      />
    </div>
  );
}
