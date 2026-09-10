import { getTranslations } from "next-intl/server";
import { MAP_LOOP } from "@/lib/reference/system-map";

export async function LoopView() {
  const t = await getTranslations("reference.loop");
  const loop = await getTranslations("actV2.ui.loop");
  const v2 = await getTranslations("actV2.ui");

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
      {/* Any orientation is an entry point; the six are not a required sequence. */}
      <p className="mt-2 mb-5 max-w-[68ch] text-[14.5px] leading-[1.6] text-foreground/70">
        {loop("intro")}
      </p>

      <div className="flex flex-col gap-2.5">
        {MAP_LOOP.map((step, index) => (
          <section
            key={step}
            id={step}
            className="scroll-mt-6 rounded-card border bg-card px-6 py-5 text-card-foreground"
          >
            <div className="flex items-start gap-4">
              <span className="inline-flex size-[30px] shrink-0 items-center justify-center rounded-lg bg-muted font-mono text-xs text-foreground/70">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <header className="flex flex-wrap items-baseline gap-2.5">
                  <h2 className="font-serif text-[23px] leading-[1.3] tracking-[-0.01em]">
                    {loop(`${step}.question`)}
                  </h2>
                  <span className="font-mono text-[10px] tracking-[0.16em] text-toward uppercase">
                    {loop(`${step}.title`)}
                  </span>
                </header>
                <p className="mt-[7px] max-w-[68ch] text-[13.5px] leading-[1.6] text-foreground/80">
                  {loop(`${step}.help`)}
                </p>
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* The boundary statement belongs where practices are described, not on
          every card. See also the Library footer and Flexibility reference. */}
      <p className="mt-4 max-w-[72ch] text-[12.5px] leading-[1.6] text-muted-foreground">
        {v2("practice.notFit")} {v2("help.boundaries")}
      </p>
    </div>
  );
}
