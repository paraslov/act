"use client";

import { useTranslations } from "next-intl";
import { type KeyboardEvent, useRef, useState } from "react";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DOMAINS, type DomainId } from "@/lib/act/constants";
import type { PersonalValue } from "@/lib/act/types";
import { cn } from "@/lib/utils";

type ValuePickerProps = {
  /** The user's values; archived ones are never offered. */
  values: PersonalValue[];
  /** Selected value id, or `null` — clearing is `null`, never an empty string. */
  value: string | null;
  onChange: (valueId: string | null) => void;
  /** Context label above the control ("From My Values" / "Or link one of your values"). */
  label: string;
  /** Shows the "suggested from your morning" line; the selection stays editable. */
  suggested?: boolean;
};

type DomainFilter = DomainId | "all";

const quietButtonClassName =
  "flex cursor-pointer items-center justify-center rounded-chip border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";

function hasDetail(value: PersonalValue): boolean {
  return Boolean(value.meaning || value.examples.length);
}

/** Free-text examples may repeat, so rows carry a positional key. */
function keyedExamples(examples: string[]): { key: string; text: string }[] {
  return examples.map((text, position) => ({
    key: `${position}:${text}`,
    text,
  }));
}

function ExampleList({ examples }: { examples: string[] }) {
  return (
    <ul className="mt-1.5 flex flex-col gap-1">
      {keyedExamples(examples).map((example) => (
        <li
          key={example.key}
          className="border-l pl-2.5 text-[12.5px] leading-[1.45] text-muted-foreground"
        >
          {example.text}
        </li>
      ))}
    </ul>
  );
}

/**
 * The one compact picker used by the morning set-up and the episode dialog. It is
 * a popover rather than a link so an in-progress draft is never navigated away.
 */
export function ValuePicker({
  label,
  onChange,
  suggested = false,
  value,
  values,
}: ValuePickerProps) {
  const t = useTranslations("values.picker");
  const domainLabels = useTranslations("act.domains");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState<DomainFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const active = values.filter((entry) => !entry.archivedAt);
  const selected = active.find((entry) => entry.id === value) ?? null;
  const needle = query.trim().toLowerCase();
  const rows = active.filter(
    (entry) =>
      (domain === "all" || entry.domains.includes(domain)) &&
      (!needle ||
        entry.title.toLowerCase().includes(needle) ||
        entry.meaning.toLowerCase().includes(needle)),
  );

  function domainLine(entry: PersonalValue): string {
    return DOMAINS.filter((item) => entry.domains.includes(item.id))
      .map((item) => domainLabels(`${item.id}.label`))
      .join(" · ");
  }

  function pick(valueId: string | null) {
    onChange(valueId);
    setExpandedId(null);
    setOpen(false);
  }

  function openPicker() {
    setQuery("");
    setExpandedId(null);
    setOpen(true);
  }

  /** `⌘K` opens the picker while focus is anywhere in its context. */
  function onShortcut(event: KeyboardEvent<HTMLDivElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      openPicker();
    }
  }

  /** Roving focus over the rows; `Enter`/`Space` are the buttons' own behaviour. */
  function onListKeys(event: KeyboardEvent<HTMLDivElement>) {
    if (!rows.length) return;
    const buttons = rowRefs.current.filter((row): row is HTMLButtonElement =>
      Boolean(row),
    );
    const current = buttons.indexOf(
      document.activeElement as HTMLButtonElement,
    );

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      const next =
        current === -1
          ? step === 1
            ? 0
            : buttons.length - 1
          : (current + step + buttons.length) % buttons.length;
      buttons[next]?.focus();
      return;
    }

    if (event.key === "ArrowRight" && current !== -1) {
      const row = rows[current];
      if (row && hasDetail(row)) {
        event.preventDefault();
        setExpandedId((currentId) => (currentId === row.id ? null : row.id));
      }
    }
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: the handler only adds the ⌘K shortcut for controls inside; every action here is also a real button.
    <div onKeyDown={onShortcut}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="font-mono text-[10.5px] tracking-[0.16em] text-muted-foreground uppercase">
          {label}
        </span>
        <span className="font-mono text-[9.5px] text-muted-foreground/70 uppercase">
          {t("optional")}
        </span>
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div>
            {selected ? (
              <div className="rounded-input border bg-page px-3 pt-[11px] pb-3">
                {suggested ? (
                  <p className="mb-1.5 font-mono text-[9.5px] tracking-[0.08em] text-muted-foreground/80 uppercase">
                    {t("suggested")}
                  </p>
                ) : null}
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 font-serif text-[16.5px] leading-[1.35] tracking-[-0.01em]">
                    {selected.title}
                  </p>
                  <div className="flex shrink-0 gap-1.5">
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        onClick={openPicker}
                        className={cn(
                          quietButtonClassName,
                          "h-[26px] px-2 text-[12px]",
                        )}
                      >
                        {t("change")}
                      </button>
                    </PopoverTrigger>
                    <button
                      type="button"
                      aria-label={t("clear")}
                      onClick={() => onChange(null)}
                      className={cn(
                        quietButtonClassName,
                        "size-[26px] text-sm",
                      )}
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-1">
                  {DOMAINS.filter((item) =>
                    selected.domains.includes(item.id),
                  ).map((item) => (
                    <span
                      key={item.id}
                      className="rounded-chip border px-[7px] py-px font-mono text-[9.5px] tracking-[0.08em] text-muted-foreground uppercase"
                    >
                      {domainLabels(`${item.id}.label`)}
                    </span>
                  ))}
                </div>

                {hasDetail(selected) ? (
                  <div className="mt-2.5 border-t pt-2.5">
                    <button
                      type="button"
                      aria-expanded={detailOpen}
                      onClick={() => setDetailOpen((current) => !current)}
                      className="cursor-pointer text-xs text-muted-foreground hover:text-foreground"
                    >
                      {detailOpen ? t("hideMeaning") : t("showMeaning")}
                    </button>
                    {detailOpen ? (
                      <div className="mt-1.5">
                        {selected.meaning ? (
                          <p className="text-[12.5px] leading-[1.5] text-muted-foreground">
                            {selected.meaning}
                          </p>
                        ) : null}
                        {selected.examples.length ? (
                          <ExampleList examples={selected.examples} />
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <PopoverTrigger asChild>
                <button
                  type="button"
                  onClick={openPicker}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-input border border-dashed p-3 text-left transition-colors hover:border-muted-foreground/60 hover:bg-accent"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-[18px] items-center justify-center rounded-[5px] border text-[11px] text-muted-foreground"
                  >
                    +
                  </span>
                  <span className="text-[13.5px] font-medium">{t("pick")}</span>
                  <span className="ml-auto font-mono text-[10px] text-muted-foreground/70">
                    {t("shortcut")}
                  </span>
                </button>
              </PopoverTrigger>
            )}
          </div>
        </PopoverAnchor>

        <PopoverContent
          align="start"
          sideOffset={6}
          onKeyDown={onListKeys}
          className="z-[70] w-(--radix-popover-trigger-width) min-w-[284px] max-w-[340px] rounded-xl p-0"
        >
          <div className="border-b p-[9px_11px_10px]">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("filterPlaceholder")}
              className="w-full rounded-button border bg-page px-2.5 py-[7px] text-[13px] outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring"
            />
            <div className="mt-2 flex flex-wrap gap-1">
              {(
                ["all", ...DOMAINS.map((item) => item.id)] as DomainFilter[]
              ).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  aria-pressed={domain === filter}
                  onClick={() => setDomain(filter)}
                  className={cn(
                    "cursor-pointer rounded-chip border px-2 py-[3px] font-mono text-[9.5px] tracking-[0.06em] text-muted-foreground uppercase transition-colors",
                    domain === filter &&
                      "border-primary bg-primary text-primary-foreground",
                  )}
                >
                  {filter === "all" ? t("all") : t(`domains.${filter}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[262px] overflow-y-auto p-1.5">
            {rows.map((row, index) => {
              const isSelected = row.id === value;
              const expanded = expandedId === row.id;
              return (
                <div key={row.id}>
                  <div
                    className={cn(
                      "flex items-start gap-1 rounded-[9px]",
                      isSelected && "bg-accent",
                    )}
                  >
                    <button
                      ref={(element) => {
                        rowRefs.current[index] = element;
                      }}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => pick(row.id)}
                      className="flex min-w-0 flex-1 cursor-pointer items-start gap-2 rounded-[9px] p-2 text-left transition-colors hover:bg-accent"
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "mt-0.5 size-3.5 shrink-0 rounded-[4px] border",
                          isSelected && "border-primary bg-primary",
                        )}
                      />
                      <span className="min-w-0">
                        <span className="block text-[13px] leading-[1.35] font-medium">
                          {row.title}
                        </span>
                        <span className="mt-0.5 block font-mono text-[9px] tracking-[0.06em] text-muted-foreground uppercase">
                          {domainLine(row)}
                        </span>
                      </span>
                    </button>
                    {hasDetail(row) ? (
                      <button
                        type="button"
                        aria-expanded={expanded}
                        aria-label={
                          expanded ? t("collapseRow") : t("expandRow")
                        }
                        onClick={() =>
                          setExpandedId((current) =>
                            current === row.id ? null : row.id,
                          )
                        }
                        className={cn(
                          quietButtonClassName,
                          "mt-1.5 size-[22px] shrink-0 border-transparent bg-transparent text-[11px]",
                        )}
                      >
                        {expanded ? "▴" : "▾"}
                      </button>
                    ) : null}
                  </div>
                  {expanded ? (
                    <div className="px-2 pt-1 pb-2.5">
                      <p className="text-[12.5px] leading-[1.5] text-muted-foreground">
                        {row.meaning || t("noMeaning")}
                      </p>
                      {row.examples.length ? (
                        <ExampleList examples={row.examples} />
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
            {rows.length ? null : (
              <p className="px-2.5 py-3.5 text-[12.5px] leading-[1.5] text-muted-foreground">
                {t.rich("noMatch", {
                  name: (chunks) => (
                    <span className="font-medium text-foreground/80">
                      {chunks}
                    </span>
                  ),
                })}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t p-[8px_11px]">
            <span className="font-mono text-[9px] tracking-[0.06em] text-muted-foreground/80">
              {t("hint")}
            </span>
            <button
              type="button"
              onClick={() => pick(null)}
              className="cursor-pointer text-xs text-muted-foreground hover:text-foreground"
            >
              {t("noValue")}
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
