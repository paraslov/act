"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LIB, type VaultCategory } from "@/lib/act/constants";
import {
  resolveVaultSelection,
  VAULT_CATEGORIES,
  type VaultCardId,
} from "@/lib/reference/vault";

const tabKeys: Record<VaultCategory, string> = {
  "Core map": "coreMap",
  Concepts: "concepts",
  Skills: "skills",
  Basement: "basement",
};

export function VaultView() {
  const t = useTranslations("reference.vault");
  const act = useTranslations("act.vault");
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedCard = searchParams.get("card");
  const { category: selectedCategory, cardId: openCard } =
    resolveVaultSelection(searchParams.get("tab"), requestedCard);
  const openedSection = useRef<HTMLElement | null>(null);

  function navigate(category: VaultCategory, cardId: VaultCardId | null) {
    const params = new URLSearchParams(searchParams);
    params.set("tab", category);
    params.set("card", cardId ?? "");
    router.push(`/reference/vault?${params}`, { scroll: false });
  }

  useEffect(() => {
    if (!requestedCard || !openCard) return;
    const frame = requestAnimationFrame(() => {
      const section = openedSection.current;
      if (!section) return;
      window.scrollTo({
        top: Math.max(
          0,
          window.scrollY + section.getBoundingClientRect().top - 24,
        ),
        behavior: "instant",
      });
      section.querySelector("button")?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [requestedCard, openCard]);

  return (
    <div className="max-w-[900px]">
      <h1 className="font-serif text-[34px] leading-[1.1] tracking-[-0.02em]">
        {t("title")}
      </h1>
      <p className="mt-2 mb-5 max-w-[66ch] text-[14.5px] leading-[1.6] text-foreground/70">
        {t("intro")}
      </p>

      <Tabs
        value={selectedCategory}
        onValueChange={(value) => {
          const category = VAULT_CATEGORIES.find((tab) => tab === value);
          if (category) navigate(category, null);
        }}
      >
        <TabsList
          aria-label={t("tabsLabel")}
          className="mb-[18px] h-auto flex-wrap justify-start gap-[7px] bg-transparent p-0"
        >
          {VAULT_CATEGORIES.map((category) => (
            <TabsTrigger
              key={category}
              value={category}
              className="h-auto flex-none rounded-lg border border-border bg-card px-[13px] py-[7px] text-[13.5px] font-medium text-foreground/70 shadow-none after:hidden data-[state=active]:border-[oklch(0.205_0_0)] data-[state=active]:bg-[oklch(0.205_0_0)] data-[state=active]:text-[oklch(0.985_0_0)] dark:data-[state=active]:border-[oklch(0.75_0_0)]"
            >
              {t(tabKeys[category])}
            </TabsTrigger>
          ))}
        </TabsList>

        {VAULT_CATEGORIES.map((category) => (
          <TabsContent key={category} value={category} className="mt-0">
            <div className="flex flex-col gap-[9px]">
              {LIB[category].map((card, index) => {
                const title = act(`${category}.${index}.t`);
                const isOpen = openCard === card.id;
                const panelId = `vault-panel-${card.id}`;

                return (
                  <section
                    key={card.id}
                    id={`vault-${card.id}`}
                    ref={isOpen ? openedSection : undefined}
                    className="overflow-hidden rounded-xl border bg-card text-card-foreground"
                  >
                    <h2>
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        aria-label={
                          isOpen
                            ? t("closeCard", { title })
                            : t("openCard", { title })
                        }
                        onClick={() =>
                          navigate(category, isOpen ? null : card.id)
                        }
                        className="flex w-full cursor-pointer items-center justify-between gap-3.5 bg-card px-5 py-[15px] text-left hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
                      >
                        <span className="flex flex-wrap items-baseline gap-2.5">
                          <span className="font-serif text-xl tracking-[-0.01em]">
                            {title}
                          </span>
                          <span className="rounded-[5px] border border-border/70 px-1.5 py-0.5 font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
                            {card.ev}
                          </span>
                        </span>
                        <span
                          aria-hidden="true"
                          className="shrink-0 text-lg text-muted-foreground"
                        >
                          {isOpen ? "−" : "+"}
                        </span>
                      </button>
                    </h2>

                    {isOpen ? (
                      <div
                        id={panelId}
                        className="flex flex-col gap-3.5 px-5 pb-5"
                      >
                        {[
                          [t("inShort"), act(`${category}.${index}.short`)],
                          [
                            t("inPractice"),
                            act(`${category}.${index}.practice`),
                          ],
                          [t("example"), act(`${category}.${index}.example`)],
                          [t("deeper"), act(`${category}.${index}.deep`)],
                        ].map(([label, content]) => (
                          <div key={label}>
                            <h3 className="mb-1 font-mono text-[10px] tracking-[0.16em] text-toward uppercase">
                              {label}
                            </h3>
                            <p className="max-w-[72ch] text-sm leading-[1.65] text-foreground/85">
                              {content}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <p className="mt-[18px] max-w-[72ch] text-[12.5px] leading-[1.6] text-muted-foreground">
        {t.rich("legend", {
          a: (chunks) => <strong>{chunks}</strong>,
          b: (chunks) => <strong>{chunks}</strong>,
          c: (chunks) => <strong>{chunks}</strong>,
        })}
      </p>
    </div>
  );
}
