import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AXES, FLEX_GROWTH, FLEX_MYTHS } from "@/lib/act/constants";
import { MAP_PILLARS } from "@/lib/reference/system-map";
import { cn } from "@/lib/utils";

const pillarColors = {
  Open: "text-away",
  Aware: "text-aware",
  Engaged: "text-toward",
} as const;

export async function FlexibilityView() {
  const t = await getTranslations("reference.flexibility");
  const act = await getTranslations("act");

  return (
    <div className="max-w-[900px]">
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-serif text-[34px] leading-[1.1] tracking-[-0.02em]">
          {t("title")}
        </h1>
        <span className="font-mono text-[11.5px] tracking-[0.08em] text-muted-foreground uppercase">
          {t("eyebrow")}
        </span>
      </header>

      <p className="mt-2 mb-5 max-w-[68ch] text-[14.5px] leading-[1.65] text-foreground/70">
        {t("lead")}
      </p>

      <section className="mb-[22px] rounded-card bg-inverse px-[26px] py-6 text-inverse-foreground">
        <p className="mb-2.5 font-mono text-[10px] tracking-[0.16em] text-inverse-muted uppercase">
          {t("definitionLabel")}
        </p>
        <p className="max-w-[62ch] font-serif text-[23px] leading-[1.4] tracking-[-0.01em]">
          {t("definition")}
        </p>
        <p className="mt-3.5 max-w-[66ch] text-[13px] leading-[1.6] text-inverse-muted">
          {t("definitionNote")}
        </p>
      </section>

      <p className="mb-3 font-mono text-[10px] tracking-[0.16em] text-foreground/65 uppercase">
        {t("pillarsLabel")}
      </p>
      <div className="mb-6 grid grid-cols-1 gap-3 min-[1040px]:grid-cols-3">
        {MAP_PILLARS.map((pillar) => (
          <section
            key={pillar.key}
            className="rounded-card border bg-card px-5 pt-5 pb-[22px] text-card-foreground"
          >
            <p
              className={cn(
                "mb-1.5 font-mono text-[10px] tracking-[0.16em] uppercase",
                pillarColors[pillar.key],
              )}
            >
              {pillar.key}
            </p>
            <h2 className="font-serif text-[22px] tracking-[-0.01em]">
              {act(`pillars.${pillar.key}.name`)}
            </h2>
            <p className="mt-[3px] mb-3 text-xs text-muted-foreground">
              {pillar.model.map((node) => act(node.label)).join(" · ")}
            </p>
            <p className="mb-3 text-[13.5px] leading-[1.6] text-foreground/85">
              {act(`pillars.${pillar.key}.body`)}
            </p>
            <p className="mb-1 font-mono text-[9.5px] tracking-[0.14em] text-away uppercase">
              {t("failsAs")}
            </p>
            <p className="mb-3 text-[13px] leading-[1.55] text-foreground/70">
              {act(`pillars.${pillar.key}.fail`)}
            </p>
            <p className="border-t border-border/70 pt-3 font-serif text-base leading-[1.4] text-foreground/90">
              {act(`pillars.${pillar.key}.ask`)}
            </p>
          </section>
        ))}
      </div>

      <div className="mb-5 grid grid-cols-1 items-start gap-5 min-[1040px]:grid-cols-2">
        <section className="rounded-card border bg-card px-[22px] py-5 text-card-foreground">
          <h2 className="mb-3.5 text-base font-semibold tracking-[-0.01em]">
            {t("mythsTitle")}
          </h2>
          <div className="flex flex-col gap-[13px]">
            {FLEX_MYTHS.map((myth, index) => (
              <div key={myth.title}>
                <h3 className="mb-[3px] text-[13.5px] font-semibold">
                  {act(`myths.${index}.title`)}
                </h3>
                <p className="text-[13px] leading-[1.6] text-foreground/70">
                  {act(`myths.${index}.body`)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-card border bg-card px-[22px] py-5 text-card-foreground">
          <h2 className="text-base font-semibold tracking-[-0.01em]">
            {t("growthTitle")}
          </h2>
          <p className="mt-1 mb-3.5 text-[13px] text-muted-foreground">
            {t("growthSubtitle")}
          </p>
          <div className="flex flex-col gap-[13px]">
            {FLEX_GROWTH.map((item) => (
              <div key={item.n} className="flex items-start gap-3">
                <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-[7px] bg-muted font-mono text-[11px] text-foreground/70">
                  {item.n}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="mb-[3px] text-[13.5px] font-semibold">
                    {act(`growth.${item.n}.title`)}
                  </h3>
                  <p className="text-[13px] leading-[1.6] text-foreground/70">
                    {act(`growth.${item.n}.body`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 border-t border-border/70 pt-3.5 text-[13px] leading-[1.6] text-foreground/70">
            {t.rich("growthLinks", {
              loop: (chunks) => (
                <Link
                  className="underline underline-offset-2"
                  href="/reference/loop"
                >
                  {chunks}
                </Link>
              ),
              episodes: (chunks) => (
                <Link className="underline underline-offset-2" href="/episodes">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </section>
      </div>

      <section className="rounded-card border bg-card px-[22px] py-5 text-card-foreground">
        <header className="mb-1 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold tracking-[-0.01em]">
            {t("checkTitle")}
          </h2>
          <span className="font-mono text-[10.5px] text-muted-foreground uppercase">
            {t("checkScale")}
          </span>
        </header>
        <p className="mb-4 max-w-[70ch] text-[13px] leading-[1.6] text-muted-foreground">
          {t("checkIntro")}
        </p>
        <div className="flex flex-col gap-2.5">
          {AXES.map((axis) => (
            <div
              key={axis.id}
              className="flex items-baseline gap-3.5 border-b border-border/50 pb-2.5 max-[560px]:flex-col max-[560px]:gap-1"
            >
              <span className="w-[140px] shrink-0 font-mono text-[10.5px] tracking-[0.12em] text-toward uppercase">
                {act(`axes.${axis.id}.label`)}
              </span>
              <span className="min-w-0 flex-1 text-sm leading-[1.55] text-foreground/85">
                {act(`axes.${axis.id}.prompt`)}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3.5 max-w-[74ch] text-[12.5px] leading-[1.6] text-muted-foreground">
          {t.rich("evidence", {
            a: (chunks) => <strong>{chunks}</strong>,
            c: (chunks) => <strong>{chunks}</strong>,
          })}
        </p>
      </section>
    </div>
  );
}
