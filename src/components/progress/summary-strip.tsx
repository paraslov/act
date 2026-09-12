import { cn } from "@/lib/utils";

/** One number block in the strip. */
export type SummaryBlock = {
  key: string;
  label: string;
  value: string;
  sub: string;
  /** Toward share is a step-darker green; the others stay foreground. */
  accent?: boolean;
};

/**
 * Three-number strip above the cards: entries, toward share, days with entries.
 * It answers "what happened this period?" on the first screen. The caption is
 * the only place the returning-to-practice idea appears. Presentational only —
 * the parent (a server component) does the deriving and translating.
 */
export function SummaryStrip({
  blocks,
  caption,
}: {
  blocks: SummaryBlock[];
  caption: string;
}) {
  return (
    <section className="flex flex-wrap items-end gap-3 gap-x-10 rounded-card border bg-card px-6 py-5">
      {blocks.map((block, index) => (
        <div key={block.key} className="contents">
          {index > 0 && <span className="w-px self-stretch bg-border" />}
          <div className="flex flex-col gap-[3px]">
            <span className="font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase">
              {block.label}
            </span>
            <span
              className={cn(
                "font-serif text-[32px] leading-none tabular-nums",
                block.accent ? "text-toward" : "text-foreground",
              )}
            >
              {block.value}
            </span>
            <span className="text-[12px] text-muted-foreground">
              {block.sub}
            </span>
          </div>
        </div>
      ))}
      <p className="min-w-[200px] flex-1 basis-[220px] text-[12px] leading-[1.5] text-muted-foreground">
        {caption}
      </p>
    </section>
  );
}
