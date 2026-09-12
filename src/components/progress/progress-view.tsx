import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { BossTestGrid } from "@/components/progress/boss-test-grid";
import { ByTimeChart } from "@/components/progress/by-time-chart";
import { PeriodFilter } from "@/components/progress/period-filter";
import { ReflectionAxes } from "@/components/progress/reflection-axes";
import { SummaryStrip } from "@/components/progress/summary-strip";
import { TallyCard } from "@/components/progress/tally-card";
import { AXES, BANDS } from "@/lib/act/constants";
import { formatDayLabel } from "@/lib/act/date";
import {
  bandBreakdown,
  bandDirectionalTotal,
  bossTestCells,
  hookTypeTallies,
  peakAwayBand,
  periodSpanDays,
  radarComparison,
  returningToPractice,
  skillTallies,
  statusEffectTallies,
  towardAwaySplit,
} from "@/lib/act/derive";
import type { PeriodValue } from "@/lib/act/period";
import type { Episode, EpisodePeriod } from "@/lib/act/types";
import { SKILL_CARD_IDS, STATE_CARD_IDS } from "@/lib/reference/library";
import { cn } from "@/lib/utils";

function Absence({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-input border border-dashed p-3 font-mono text-[10px] text-muted-foreground uppercase">
      {children}
    </div>
  );
}

/** Direction swatch glyphs — the shape set shared with the boss-test grid. */
const DIRECTION_SWATCH = {
  toward: <span className="block size-[9px] rounded-[2px] bg-toward" />,
  away: <span className="block size-[9px] rounded-full bg-away" />,
  mixed: (
    <span className="block size-[9px] rounded-[2px] bg-[oklch(0.72_0_0)]" />
  ),
  unknown: (
    <span className="block size-[9px] rounded-full border border-dashed border-muted-foreground" />
  ),
} as const;
/** Bar fill per direction; "Not sure yet" never fills. */
const DIRECTION_FILL = {
  toward: "bg-toward",
  away: "bg-away",
  mixed: "bg-[oklch(0.72_0_0)]",
  unknown: "",
} as const;

function point(index: number, value: number) {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / AXES.length;
  return [
    150 + (Math.cos(angle) * 75 * value) / 2,
    110 + (Math.sin(angle) * 75 * value) / 2,
  ];
}

export async function ProgressView({
  episodes,
  period: periodValue,
  window,
}: {
  episodes: Episode[];
  period: PeriodValue;
  window?: EpisodePeriod;
}) {
  const t = await getTranslations("actV2.ui");
  const checks = await getTranslations("actV2.checks");
  const cards = await getTranslations("actV2.cards");
  const locale = await getLocale();
  const percent = new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 0,
  });

  const split = towardAwaySplit(episodes);
  const radar = radarComparison(episodes);
  const bands = bandBreakdown(episodes);
  const states = statusEffectTallies(episodes);
  const skills = skillTallies(episodes);
  const hookTypes = hookTypeTallies(episodes);

  const days = episodes.map((episode) => episode.day).sort();
  // The window (last 30/90 days) drives every block; "all time" falls back to the
  // span of what was actually recorded so the Boss test and range stay aligned.
  const period: EpisodePeriod = window ?? {
    start: days[0],
    end: days[days.length - 1],
  };
  const range =
    period.start && period.end
      ? t("observations.dateRange", {
          start: formatDayLabel(period.start, locale),
          end: formatDayLabel(period.end, locale),
        })
      : "—";
  const activeDays = returningToPractice(episodes, period);
  const span = periodSpanDays(period);

  const peakCell = peakAwayBand(bands);
  const peak = peakCell
    ? {
        band: BANDS[peakCell.index],
        away: peakCell.away,
        total: bandDirectionalTotal(peakCell),
      }
    : null;

  const hasLegacy = episodes.some((e) => e.schemaVersion === 1);
  const allRecent = radar.every((axis) => axis.recent !== null);
  const allPrevious = radar.every((axis) => axis.previous !== null);

  const tallyRow = (
    id: string,
    label: string,
    count: number,
    fraction: number,
  ) => ({
    id,
    label,
    count,
    percent: percent.format(fraction),
    fraction,
  });

  return (
    <div className="flex max-w-[1080px] flex-col gap-5">
      <header className="flex flex-col gap-2">
        <h1 className="font-serif text-[34px] leading-none font-normal tracking-[-0.01em]">
          {t("nav.observations")}
        </h1>
        <p className="max-w-[66ch] text-sm leading-[1.6] text-foreground/70">
          {t("observations.intro")}
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <PeriodFilter value={periodValue} />
        <span className="font-mono text-[11px] text-muted-foreground">
          {t("observations.period")}: {range}
        </span>
      </div>

      {!episodes.length && <Absence>{t("observations.empty")}</Absence>}
      {hasLegacy && (
        <Absence>
          {t("legacy.notice")} {t("legacy.excluded")}
        </Absence>
      )}

      <SummaryStrip
        blocks={[
          {
            key: "entries",
            label: t("observations.summary.entries"),
            value: String(split.total),
            sub: t("observations.summary.completedActions", {
              count: split.completed,
            }),
          },
          {
            key: "towardShare",
            label: t("observations.summary.towardShare"),
            value: percent.format(
              split.completed > 0 ? split.toward / split.completed : 0,
            ),
            sub: t("observations.summary.towardOf", {
              toward: split.toward,
              completed: split.completed,
            }),
            accent: true,
          },
          {
            key: "activeDays",
            label: t("observations.summary.activeDays"),
            value: String(activeDays),
            sub: t("observations.summary.overSpan", { count: span ?? 0 }),
          },
        ]}
        caption={t("observations.returningHelp")}
      />

      <div className="flex flex-wrap items-stretch gap-5">
        {/* Direction of completed actions */}
        <section className="flex min-w-0 flex-1 basis-[400px] flex-col rounded-card border bg-card px-6 py-[22px]">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-base font-semibold">
              {t("observations.direction.title")}
            </h2>
            <span className="flex-none font-mono text-[11px] text-muted-foreground">
              {t("observations.completedActions", { count: split.completed })}
            </span>
          </div>
          <p className="mt-[5px] max-w-[48ch] text-[13px] text-muted-foreground">
            {t("observations.direction.help")}
          </p>
          <ul className="mt-4 flex flex-col gap-[9px]">
            {(["toward", "away", "mixed", "unknown"] as const).map((dir) => {
              const count = split[dir];
              // "Not sure yet" is an undecided answer — always an empty track.
              const empty = dir === "unknown" || count === 0;
              return (
                <li
                  key={dir}
                  className="flex items-center gap-[10px] text-[13px]"
                >
                  <span className="flex-none">{DIRECTION_SWATCH[dir]}</span>
                  <span
                    className={cn(
                      "basis-[92px]",
                      count === 0 && "text-muted-foreground",
                    )}
                  >
                    {t(`direction.${dir}.label`)}
                  </span>
                  <span className="h-2 min-w-0 flex-1 overflow-hidden rounded bg-muted">
                    {!empty && (
                      <span
                        className={cn(
                          "block h-full rounded",
                          DIRECTION_FILL[dir],
                        )}
                        style={{
                          width: `${Math.max((count / split.completed) * 100, 3)}%`,
                        }}
                      />
                    )}
                  </span>
                  <span className="flex-none basis-[76px] text-right font-mono text-[11px] text-foreground/70 tabular-nums">
                    {count === 0
                      ? "—"
                      : `${count} · ${percent.format(count / split.completed)}`}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 flex items-center gap-[10px] border-t pt-[13px]">
            <span className="flex-none rounded-input border border-dashed px-[10px] py-[5px] text-xs text-muted-foreground">
              {t("observations.notesAndIntentions", {
                count: split.planned + split.notDescribed,
              })}
            </span>
            <span className="min-w-0 flex-1 text-xs text-muted-foreground">
              {t("observations.notesAndPlans")}
            </span>
          </div>
        </section>

        {/* Entries by time of day */}
        <ByTimeChart
          bands={bands.map((band) => ({
            index: band.index,
            toward: band.toward,
            away: band.away,
            mixed: band.mixed,
          }))}
          toward={split.toward}
          away={split.away}
          mixed={split.mixed}
          completed={split.completed}
          peak={peak}
        />
      </div>

      {/* Your reflection responses */}
      <section className="rounded-card border bg-card px-6 py-[22px]">
        <h2 className="text-base font-semibold">
          {t("observations.reflectionTitle")}
        </h2>
        <p className="mt-[5px] max-w-[70ch] text-[13px] text-muted-foreground">
          {t("observations.comparisonHelp")}
        </p>
        <div className="mt-[18px] flex flex-wrap items-start gap-6">
          <div className="min-w-[240px] flex-[0_1_300px]">
            <svg
              role="img"
              aria-label={t("observations.reflectionTitle")}
              viewBox="0 0 300 230"
              className="h-auto w-full"
            >
              {[1, 2].map((level) => (
                <polygon
                  key={level}
                  points={AXES.map((_, i) => point(i, level).join(",")).join(
                    " ",
                  )}
                  fill="none"
                  className="stroke-border"
                />
              ))}
              {allPrevious && (
                <polygon
                  points={radar
                    .map((axis, i) =>
                      point(i, axis.previous as number).join(","),
                    )
                    .join(" ")}
                  fill="none"
                  className="stroke-muted-foreground"
                  strokeDasharray="3 3"
                />
              )}
              {allRecent && (
                <polygon
                  points={radar
                    .map((axis, i) => point(i, axis.recent as number).join(","))
                    .join(" ")}
                  className="fill-toward/10 stroke-toward"
                  strokeWidth="1.5"
                />
              )}
              {radar.map((axis, i) => {
                const [lx, ly] = point(i, 2.55);
                const dot = axis.recent === null ? null : point(i, axis.recent);
                return (
                  <g key={axis.axis}>
                    {dot && (
                      <circle
                        cx={dot[0]}
                        cy={dot[1]}
                        r="3"
                        className="fill-toward"
                      />
                    )}
                    <text
                      x={lx}
                      y={ly + 3}
                      textAnchor="middle"
                      className="fill-muted-foreground font-mono text-[9px]"
                    >
                      {checks(`${axis.axis}.title`)}
                    </text>
                  </g>
                );
              })}
            </svg>
            <div className="flex justify-center gap-[14px] text-[11px] text-muted-foreground">
              <span className="flex items-center gap-[6px]">
                <span className="h-[2px] w-[14px] bg-toward" />
                {t("observations.recent")}
              </span>
              <span className="flex items-center gap-[6px]">
                <span className="w-[14px] border-t-2 border-dashed border-muted-foreground" />
                {t("observations.previous")}
              </span>
            </div>
          </div>

          <ReflectionAxes
            axes={radar.map((axis) => ({
              axis: axis.axis,
              recent: axis.recent,
              previous: axis.previous,
              delta: axis.delta,
              recentN: axis.recentN,
              previousN: axis.previousN,
            }))}
          />
        </div>
      </section>

      {/* Status effects / Skills / Experience */}
      <TallyCard
        states={states.map((state) =>
          tallyRow(
            state.id,
            cards(
              `${STATE_CARD_IDS[state.id as keyof typeof STATE_CARD_IDS]}.title`,
            ),
            state.count,
            state.share,
          ),
        )}
        skills={skills.map((skill) =>
          tallyRow(
            skill.id,
            cards(
              `${SKILL_CARD_IDS[skill.id as keyof typeof SKILL_CARD_IDS]}.title`,
            ),
            skill.count,
            skill.share,
          ),
        )}
        hooks={hookTypes.map((hook) =>
          tallyRow(
            hook.id,
            t(`experienceTypes.${hook.id}`),
            hook.count,
            hook.share,
          ),
        )}
      />

      {/* Boss test — closing reflection */}
      <section className="rounded-card bg-inverse px-[26px] py-6 text-inverse-foreground">
        <h2 className="font-mono text-[10px] font-medium tracking-[0.12em] text-inverse-muted uppercase">
          {t("rpg.bossTest.label")} · {range}
        </h2>
        <p className="mt-3 max-w-[44ch] font-serif text-[22px] leading-[1.35]">
          {t("rpg.bossTest.prompt")}
        </p>
        <p className="mt-[10px] text-sm">
          {t("rpg.bossTest.summary", {
            total: split.total,
            toward: split.toward,
          })}
        </p>
        {!episodes.length && (
          <p className="mt-4 border border-dashed border-white/40 p-3 text-sm">
            {t("rpg.bossTest.empty")}
          </p>
        )}
        <BossTestGrid cells={bossTestCells(episodes, period)} />
        <p className="mt-4 max-w-[76ch] text-xs leading-[1.6] text-inverse-muted">
          {t("rpg.bossTest.caption")}
        </p>
      </section>
    </div>
  );
}
