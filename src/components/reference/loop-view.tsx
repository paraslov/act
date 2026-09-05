import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LOOP_REF } from "@/lib/act/constants";

export async function LoopView() {
  const t = await getTranslations("reference.loop");

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
      <p className="mt-2 mb-5 max-w-[68ch] text-[14.5px] leading-[1.6] text-foreground/70">
        {t.rich("intro", {
          episodes: (chunks) => (
            <Link className="underline underline-offset-2" href="/episodes">
              {chunks}
            </Link>
          ),
        })}
      </p>

      <div className="flex flex-col gap-2.5">
        {LOOP_REF.map((step) => (
          <section
            key={step.n}
            className="rounded-card border bg-card px-6 py-5 text-card-foreground"
          >
            <div className="flex items-start gap-4">
              <span className="inline-flex size-[30px] shrink-0 items-center justify-center rounded-lg bg-muted font-mono text-xs text-foreground/70">
                {step.n}
              </span>
              <div className="min-w-0 flex-1">
                <header className="flex flex-wrap items-baseline gap-2.5">
                  <h2 className="font-serif text-[23px] leading-[1.3] tracking-[-0.01em]">
                    {step.question}
                  </h2>
                  <span className="font-mono text-[10px] tracking-[0.16em] text-toward uppercase">
                    {step.name}
                  </span>
                </header>
                <p className="mt-[7px] max-w-[68ch] text-[13.5px] leading-[1.6] text-foreground/80">
                  {step.help}
                </p>
                <p className="mt-2 max-w-[68ch] text-[13.5px] leading-[1.6] text-muted-foreground italic">
                  {step.example}
                </p>
                <p className="mt-2 max-w-[68ch] text-[12.5px] leading-[1.55] text-muted-foreground/85">
                  <span className="font-medium">{t("trap")}</span> {step.trap}
                </p>
              </div>
            </div>
          </section>
        ))}
      </div>

      <section className="mt-4 rounded-card bg-inverse px-6 py-[22px] text-inverse-foreground">
        <p className="mb-2 font-mono text-[10px] tracking-[0.16em] text-inverse-muted uppercase">
          {t("closingLabel")}
        </p>
        <p className="max-w-[60ch] font-serif text-[22px] leading-[1.35] tracking-[-0.01em]">
          {t("closing")}
        </p>
      </section>
    </div>
  );
}
