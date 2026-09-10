"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AXES } from "@/lib/act/constants";
import {
  LIBRARY_CARDS,
  type LibraryCard,
  type LibraryCategory,
  SOURCES,
} from "@/lib/reference/library";
import {
  type LibrarySearchEntry,
  resolveVaultSelection,
  searchLibrary,
  systemMapHref,
  VAULT_CATEGORIES,
  VAULT_LAYERS,
  vaultHref,
} from "@/lib/reference/vault";
import {
  OrientToValuesBlocks,
  OrientToValuesFooter,
} from "./orient-to-values-card";

const microLabel =
  "font-mono text-[9.5px] tracking-[0.12em] text-muted-foreground uppercase";
const quietLink =
  "rounded-[9px] border bg-card px-3 py-2 text-[13px] hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function VaultView({
  searchIndex,
}: {
  searchIndex: LibrarySearchEntry[];
}) {
  const t = useTranslations("actV2.ui");
  const cards = useTranslations("actV2.cards");
  const axes = useTranslations("act.axes");
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const from = searchParams.get("from");
  const requestedCard = searchParams.get("card");
  const selection = resolveVaultSelection(
    searchParams.get("tab"),
    requestedCard,
  );
  const { category: selectedCategory, cardId: openCard } = selection;
  const searchInput = useRef<HTMLInputElement>(null);
  const backHref = systemMapHref(from);
  const searching = query.trim().length > 0;
  const matches = searching ? searchLibrary(query, searchIndex) : LIBRARY_CARDS;
  // An explicit card always wins, including links with stale search/tab parameters.
  const visibleCards = matches.filter(
    (card) => searching || card.category === selectedCategory,
  );
  if (openCard && !visibleCards.some((card) => card.id === openCard)) {
    const card = LIBRARY_CARDS.find((card) => card.id === openCard);
    if (card) visibleCards.unshift(card);
  }

  function navigate(
    category: LibraryCategory,
    cardId: LibraryCard["id"] | null,
    clearSearch = false,
  ) {
    const params = new URLSearchParams(searchParams);
    params.set("tab", category);
    params.set("card", cardId ?? "");
    if (clearSearch) params.delete("q");
    router.push(`/reference/vault?${params}`, { scroll: false });
  }

  function search(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) params.set("q", value);
    else params.delete("q");
    params.set("card", "");
    // Local, synchronous URL state keeps typing responsive and reload/back reproducible.
    window.history.replaceState(null, "", `/reference/vault?${params}`);
  }

  useEffect(() => {
    if (!requestedCard || !openCard) return;
    const frame = requestAnimationFrame(() => {
      const section = document.getElementById(`vault-${openCard}`);
      if (!section) return;
      // Preserve a deep anchor when a caller names a subsection of this card.
      const anchor = window.location.hash.slice(1);
      const target = anchor ? document.getElementById(anchor) : null;
      const destination = target && section.contains(target) ? target : section;
      destination.scrollIntoView({ block: "start" });
      section.querySelector("button")?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [requestedCard, openCard]);

  function renderCard(card: LibraryCard) {
    const title = cards(`${card.id}.title`);
    const isOpen = openCard === card.id;
    // Only this card carries the domain/value/goal/action structure; the layers
    // stay the shared seven, and the blocks sit inside them.
    const isValuesCard = card.id === "orient-to-values";
    // The five reflection prompts anchor here; System Map links target #<axis-id>.
    const isChecksCard = card.id === "app-checks";
    const panelId = `vault-panel-${card.id}`;
    return (
      <section
        key={card.id}
        id={`vault-${card.id}`}
        className="scroll-mt-6 overflow-hidden rounded-[14px] border bg-card text-card-foreground"
      >
        <div className="flex flex-wrap items-center gap-x-4 px-[22px] py-4">
          <h2 className="min-w-0 grow basis-[320px]">
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              aria-label={t(isOpen ? "library.closeCard" : "library.openCard", {
                title,
              })}
              onClick={() => navigate(card.category, isOpen ? null : card.id)}
              className="flex w-full cursor-pointer items-start justify-between gap-4 rounded-lg text-left hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              <span className="min-w-0">
                <span
                  className={`${microLabel} mb-2 inline-block rounded-[5px] bg-muted px-2 py-1`}
                >
                  {t(`contentTypes.${card.contentType}`)}
                </span>
                <span className="block font-serif text-[26px] leading-[1.2] tracking-[-0.015em]">
                  {title}
                </span>
              </span>
              <span
                aria-hidden="true"
                className="flex size-7 shrink-0 items-center justify-center rounded-lg border text-[15px] text-muted-foreground"
              >
                {isOpen ? "−" : "+"}
              </span>
            </button>
          </h2>
          {card.contentType === "practice" ? (
            <Link
              href="/episodes?new=1"
              className="my-2 text-[12.5px] text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              {t("practice.record")}
            </Link>
          ) : null}
        </div>
        {isOpen ? (
          <div id={panelId} className="flex flex-col gap-3.5 px-[22px] pb-5">
            {VAULT_LAYERS.map((layer) => (
              <div key={layer} className="flex flex-wrap gap-x-4 gap-y-1.5">
                <h3 className={`${microLabel} basis-[118px] pt-[3px]`}>
                  {t(`library.${layer}`)}
                </h3>
                <div className="min-w-0 grow basis-[280px] text-[13.5px] leading-[1.6] text-foreground/85">
                  {layer === "related" ? (
                    <div className="flex flex-wrap gap-[7px]">
                      {card.relatedIds.map((id) => (
                        <Link
                          key={id}
                          href={vaultHref(id, from)}
                          scroll={false}
                          className="rounded-[7px] border px-[11px] py-1.5 text-[12.5px] hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                        >
                          {cards(`${id}.title`)}{" "}
                          <span aria-hidden="true">→</span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <>
                      {isValuesCard ? (
                        <OrientToValuesBlocks layer={layer} slot="before" />
                      ) : null}
                      <p className="max-w-[72ch]">
                        {cards(`${card.id}.${layer}`)}
                      </p>
                      {isValuesCard ? (
                        <OrientToValuesBlocks layer={layer} slot="after" />
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            ))}
            {isValuesCard ? <OrientToValuesFooter /> : null}
            {isChecksCard ? (
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-t pt-[13px]">
                <h3 className={`${microLabel} basis-[118px] pt-[3px]`}>
                  {t("map.reflection")}
                </h3>
                <ul className="min-w-0 grow basis-[280px] flex flex-col gap-2.5">
                  {AXES.map((axis) => (
                    <li
                      key={axis.id}
                      id={axis.id}
                      className="scroll-mt-6 flex flex-wrap items-baseline gap-x-3.5 gap-y-0.5 border-b border-border/50 pb-2"
                    >
                      <span className="w-[130px] shrink-0 font-mono text-[10.5px] tracking-[0.12em] text-toward uppercase">
                        {axes(`${axis.id}.label`)}
                      </span>
                      <span className="min-w-0 flex-1 text-[13.5px] leading-[1.55] text-foreground/85">
                        {axes(`${axis.id}.prompt`)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {card.contentType === "practice" ? (
              // 7.5/T20: a practice is brief, stoppable and adaptable, and a
              // feeling need not pass on any timetable for it to be useful.
              <p className="rounded-input border border-dashed p-3 text-[12.5px] leading-[1.55] text-muted-foreground">
                {t("practice.noReliefRequired")} {t("practice.notFit")}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-t pt-[13px]">
              <h3 className={`${microLabel} basis-[118px] pt-[3px]`}>
                {t("library.sources")}
              </h3>
              <div className="min-w-0 grow basis-[280px]">
                <ul className="flex flex-col gap-[5px]">
                  {card.sourceIds.map((sourceId) => (
                    <li key={sourceId}>
                      <a
                        className="text-[13px] underline underline-offset-2 hover:text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
                        href={SOURCES[sourceId].url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {SOURCES[sourceId].title}{" "}
                        <span aria-hidden="true">↗</span>
                      </a>
                    </li>
                  ))}
                </ul>
                <p className="mt-[9px] max-w-[72ch] text-[12px] leading-[1.55] text-muted-foreground">
                  {t("library.sourceNote")}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    );
  }

  const missing = selection.status === "not-found";
  const noResults = searching && visibleCards.length === 0;
  const results = (
    <>
      {missing || noResults ? (
        <div
          aria-live="polite"
          className="rounded-[14px] border border-dashed border-[oklch(0.85_0_0)] px-5 py-[18px] dark:border-[oklch(0.42_0_0)]"
        >
          <p className={microLabel}>
            {t(missing ? "library.notFoundLabel" : "library.noResultsLabel")}
          </p>
          <p className="mt-2 font-serif text-xl leading-[1.35]">
            {t(missing ? "library.notFound" : "library.noResults")}
          </p>
          {missing ? (
            <div className="mt-3 flex flex-wrap gap-[9px]">
              <button
                type="button"
                className={quietLink}
                onClick={() => searchInput.current?.focus()}
              >
                {t("library.search")}
              </button>
              <Link href={backHref} className={quietLink}>
                {t("library.backToMap")}
              </Link>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-[9px]">
          {visibleCards.map(renderCard)}
        </div>
      )}
    </>
  );
  return (
    <div className="max-w-[920px]">
      <header className="mb-[18px] flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 grow basis-[420px]">
          <h1 className="font-serif text-[34px] leading-[1.1] tracking-[-0.02em]">
            {t("nav.library")}
          </h1>
          <p className="mt-2 max-w-[66ch] text-[13.5px] leading-[1.6] text-foreground/70">
            {t("library.intro")}
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-[9px]">
          <Link href={backHref} className={quietLink}>
            {t("library.backToMap")}
          </Link>
          <Input
            ref={searchInput}
            type="search"
            aria-label={t("library.search")}
            placeholder={t("library.search")}
            value={query}
            onChange={(event) => search(event.target.value)}
            className="h-9 w-[230px] max-w-full rounded-[9px] bg-card text-[13px]"
          />
        </div>
      </header>
      <Tabs
        value={searching ? "" : selectedCategory}
        onValueChange={(value) => {
          const category = VAULT_CATEGORIES.find((tab) => tab === value);
          if (category) navigate(category, null, true);
        }}
      >
        <TabsList
          aria-label={t("nav.library")}
          className="mb-2 h-auto w-full flex-wrap justify-start gap-1.5 rounded-none border-b bg-transparent p-0 pb-3 group-data-[orientation=horizontal]/tabs:h-auto"
        >
          {VAULT_CATEGORIES.map((category) => (
            <TabsTrigger
              key={category}
              value={category}
              className="h-auto max-w-full flex-none rounded-lg border bg-card px-[13px] py-2 text-[13px] whitespace-normal shadow-none after:hidden data-[state=active]:border-inverse data-[state=active]:bg-inverse data-[state=active]:text-inverse-foreground dark:data-[state=active]:border-ring dark:data-[state=active]:bg-inverse dark:data-[state=active]:text-inverse-foreground"
            >
              {t(`categories.${category}`)}{" "}
              <span className="font-mono text-[10.5px] opacity-70">
                {
                  LIBRARY_CARDS.filter((card) => card.category === category)
                    .length
                }
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
        {searching ? (
          <section aria-label={t("library.search")}>{results}</section>
        ) : (
          <TabsContent value={selectedCategory} className="mt-0">
            {results}
          </TabsContent>
        )}
      </Tabs>
      <p className="mt-[18px] max-w-[72ch] text-[12.5px] leading-[1.6] text-muted-foreground">
        {t("library.sourceNote")}
      </p>
      <p className="mt-2.5 max-w-[72ch] text-[12.5px] leading-[1.6] text-muted-foreground">
        {t("help.boundaries")}
      </p>
    </div>
  );
}
