import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { BossTestGrid } from "@/components/progress/boss-test-grid";
import { PeriodFilter } from "@/components/progress/period-filter";
import { AXES, BANDS } from "@/lib/act/constants";
import { formatDayLabel } from "@/lib/act/date";
import {
  bandBreakdown,
  bossTestCells,
  hookTypeTallies,
  radarComparison,
  skillTallies,
  statusEffectTallies,
  towardAwaySplit,
} from "@/lib/act/derive";
import type { PeriodValue } from "@/lib/act/period";
import type { Episode, EpisodePeriod } from "@/lib/act/types";
import { SKILL_CARD_IDS, STATE_CARD_IDS } from "@/lib/reference/library";
import { cn } from "@/lib/utils";

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 grow basis-[400px] rounded-card border bg-card px-6 py-[22px]">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 mb-4 text-[13px] text-muted-foreground">
        {description}
      </p>
      {children}
    </section>
  );
}
function Absence({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-input border border-dashed p-3 font-mono text-[10px] text-muted-foreground uppercase">
      {children}
    </div>
  );
}
/**
 * One tally row rendered as a horizontal bar: label · track+fill · count.
 * A zero row keeps its place with a dashed empty track and an em dash — an
 * absence, never a failure. Width is the share of entries (0–1).
 */
function Bar({
  label,
  count,
  fraction,
  percent,
}: {
  label: string;
  count: number;
  fraction: number;
  percent: string;
}) {
  const empty = count === 0;
  return (
    <li className="flex items-center gap-[10px] text-sm">
      <span
        className={cn(
          "flex-[0_0_140px] truncate",
          empty && "text-muted-foreground",
        )}
        title={label}
      >
        {label}
      </span>
      {empty ? (
        <span className="h-[7px] flex-1 rounded border border-dashed" />
      ) : (
        <span className="h-[7px] flex-1 overflow-hidden rounded bg-muted">
          <span
            className="block h-full rounded bg-foreground/60"
            style={{ width: `${Math.max(fraction * 100, 3)}%` }}
          />
        </span>
      )}
      <span className="flex-none font-mono text-xs text-muted-foreground tabular-nums">
        {empty ? "—" : `${count} · ${percent}`}
      </span>
    </li>
  );
}
/** Bar-fill colour per direction; Mixed and Not-sure stay achromatic. */
const DIRECTION_FILL = {
  toward: "bg-toward",
  away: "bg-away",
  mixed: "bg-muted-foreground",
  unknown: "bg-muted-foreground",
} as const;
/** Shape marker per direction — the same glyph set used by the Boss-test grid. */
const DIRECTION_SWATCH = {
  toward: <span className="block size-[9px] rounded-[2px] bg-toward" />,
  away: <span className="block size-[9px] rounded-full bg-away" />,
  mixed: (
    <span className="relative block size-[9px] overflow-hidden rounded-[2px] border border-muted-foreground">
      <span className="absolute top-[3px] left-[-3px] h-px w-[15px] -rotate-45 bg-muted-foreground" />
    </span>
  ),
  unknown: (
    <span className="block size-[9px] rounded-full border border-dashed border-muted-foreground" />
  ),
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
  const old = await getTranslations("progress");
  const locale = await getLocale();
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const percent = new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 0,
  });
  const split = towardAwaySplit(episodes);
  const radar = radarComparison(episodes);
  const bands = bandBreakdown(episodes);
  const maxBand = Math.max(1, ...bands.map((band) => band.total));
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
  const states = statusEffectTallies(episodes);
  const skills = skillTallies(episodes);
  const hookTypes = hookTypeTallies(episodes);
  const hasLegacy = episodes.some((e) => e.schemaVersion === 1);
  const allRecent = radar.every((axis) => axis.recent !== null);
  const allPrevious = radar.every((axis) => axis.previous !== null);
  const rangeText = (range: { start?: string; end?: string } | null) =>
    range?.start && range.end
      ? t("observations.dateRange", {
          start: formatDayLabel(range.start, locale),
          end: formatDayLabel(range.end, locale),
        })
      : "—";
  return (
    <div className="max-w-[920px]">
      <h1 className="font-serif text-[34px]">{t("nav.observations")}</h1>
      <p className="mt-2 mb-5 max-w-[66ch] text-sm text-foreground/70">
        {t("observations.intro")}
      </p>
      <PeriodFilter value={periodValue} />
      <p className="mb-4 font-mono text-xs text-muted-foreground">
        {t("observations.period")}: {range} ·{" "}
        {t("observations.records", { count: split.total })}
      </p>
      {!episodes.length && <Absence>{t("observations.empty")}</Absence>}
      {hasLegacy && (
        <div className="mb-4">
          <Absence>
            {t("legacy.notice")} {t("legacy.excluded")}
          </Absence>
        </div>
      )}
      <div className="flex flex-wrap items-start gap-5">
        <section className="min-w-0 grow basis-[400px] rounded-card border bg-card px-6 py-[22px]">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-base font-semibold">{old("split.title")}</h2>
            <span className="flex-none font-mono text-xs text-muted-foreground">
              {t("observations.completedActions", { count: split.completed })}
            </span>
          </div>
          <ul className="mt-[14px] space-y-[9px]">
            {(["toward", "away", "mixed", "unknown"] as const).map((dir) => {
              const count = split[dir];
              // "Not sure yet" is an undecided answer, always shown as an absence
              // track; other directions show a filled track unless nothing landed.
              const empty = dir === "unknown" || count === 0;
              return (
                <li
                  key={dir}
                  className="flex items-center gap-[10px] text-[13px]"
                >
                  <span className="flex-none">{DIRECTION_SWATCH[dir]}</span>
                  <span
                    className={cn(
                      "flex-[0_0_84px]",
                      dir === "unknown" && "text-muted-foreground",
                    )}
                  >
                    {t(`direction.${dir}.label`)}
                  </span>
                  {empty ? (
                    <span className="h-[7px] flex-1 rounded border border-dashed" />
                  ) : (
                    <span className="h-[7px] flex-1 overflow-hidden rounded bg-muted">
                      <span
                        className={cn(
                          "block h-full rounded",
                          DIRECTION_FILL[dir],
                        )}
                        style={{
                          width: `${Math.max((count / split.completed) * 100, 3)}%`,
                        }}
                      />
                    </span>
                  )}
                  <span className="flex-none font-mono text-xs tabular-nums">
                    {count}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-[13px] flex flex-wrap items-center gap-[10px] border-t pt-[11px]">
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
        <Card
          title={t("observations.byTime")}
          description={t("observations.byTimeHelp")}
        >
          <div className="flex h-[105px] items-end gap-2">
            {bands.map((band) => (
              <div
                key={band.index}
                className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
              >
                <span className="font-mono text-xs">{band.total}</span>
                <span
                  className="block w-full rounded-t-sm bg-muted-foreground/50"
                  style={{ height: `${(band.total / maxBand) * 62}px` }}
                />
                <span className="font-mono text-[9px]">
                  {BANDS[band.index]}
                </span>
              </div>
            ))}
          </div>
        </Card>
        <section className="w-full rounded-card bg-inverse px-6 py-[22px] text-inverse-foreground">
          <h2 className="font-mono text-[10px] uppercase">
            {t("rpg.bossTest.label")} · {range}
          </h2>
          <p className="my-3 font-serif text-[22px]">
            {t("rpg.bossTest.prompt")}
          </p>
          <p className="text-sm">
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
          <p className="mt-3 text-xs leading-relaxed text-inverse-muted">
            {t("rpg.bossTest.caption")}
          </p>
        </section>
        <Card
          title={t("observations.reflectionTitle")}
          description={t("observations.comparisonHelp")}
        >
          <svg
            role="img"
            aria-label={t("observations.reflectionTitle")}
            viewBox="0 0 300 230"
            className="mx-auto w-full max-w-[360px]"
          >
            {[1, 2].map((level) => (
              <polygon
                key={level}
                points={AXES.map((_, i) => point(i, level).join(",")).join(" ")}
                fill="none"
                className="stroke-border"
              />
            ))}
            {allPrevious && (
              <polygon
                points={radar
                  .map((axis, i) => point(i, axis.previous as number).join(","))
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
                fill="none"
                className="stroke-foreground"
              />
            )}
            {radar.map((axis, i) => {
              const [x, y] = point(i, 2.55);
              const actual =
                axis.recent === null ? null : point(i, axis.recent);
              return (
                <g key={axis.axis}>
                  {actual && (
                    <circle
                      cx={actual[0]}
                      cy={actual[1]}
                      r="3"
                      className="fill-foreground"
                    />
                  )}
                  <text
                    x={x}
                    y={y}
                    textAnchor="middle"
                    className="fill-muted-foreground font-mono text-[9px]"
                  >
                    {checks(`${axis.axis}.title`)}
                  </text>
                </g>
              );
            })}
          </svg>
          <div className="space-y-4">
            {radar.map((axis) => (
              <div key={axis.axis}>
                <p className="flex justify-between gap-2 text-sm">
                  <span>{checks(`${axis.axis}.title`)}</span>
                  <span className="font-mono">
                    {axis.recent === null ? "—" : number.format(axis.recent)}
                  </span>
                </p>
                <p className="my-1 text-xs text-muted-foreground">
                  {t("observations.recent")}: {rangeText(axis.recentRange)} ·{" "}
                  {t("observations.sampleSize", { count: axis.recentN })}
                </p>
                {axis.recent === null ? (
                  <Absence>{t("observations.noResponses")}</Absence>
                ) : (
                  <div className="h-1.5 rounded bg-muted">
                    <div
                      className="h-full rounded bg-foreground/60"
                      style={{ width: `${(axis.recent / 2) * 100}%` }}
                    />
                  </div>
                )}
                {axis.delta === null ? (
                  <div className="mt-2">
                    <Absence>{t("observations.insufficient")}</Absence>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t("observations.previous")}:{" "}
                    {number.format(axis.previous as number)} ·{" "}
                    {rangeText(axis.previousRange)} ·{" "}
                    {t("observations.sampleSize", { count: axis.previousN })} ·
                    Δ {number.format(axis.delta)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
        <div className="flex min-w-0 grow basis-[400px] flex-col gap-5">
          <Card
            title={t("rpg.statusEffects.label")}
            description={t("rpg.statusEffects.help")}
          >
            <p className="mb-3 text-xs text-muted-foreground">
              {t("observations.records", { count: episodes.length })} ·{" "}
              {t("observations.multipleSelectionHelp")}
            </p>
            <ul className="space-y-[9px]">
              {states.map((state) => (
                <Bar
                  key={state.id}
                  label={cards(
                    `${STATE_CARD_IDS[state.id as keyof typeof STATE_CARD_IDS]}.title`,
                  )}
                  count={state.count}
                  fraction={state.share}
                  percent={percent.format(state.share)}
                />
              ))}
            </ul>
          </Card>
          <Card
            title={t("observations.skills")}
            description={t("observations.multipleSelectionHelp")}
          >
            <ul className="space-y-[9px]">
              {skills.map((skill) => (
                <Bar
                  key={skill.id}
                  label={cards(
                    `${SKILL_CARD_IDS[skill.id as keyof typeof SKILL_CARD_IDS]}.title`,
                  )}
                  count={skill.count}
                  fraction={skill.share}
                  percent={percent.format(skill.share)}
                />
              ))}
            </ul>
            {skills.some((skill) => skill.count === 0) && (
              <p className="mt-3 text-xs text-muted-foreground">
                {t("observations.unrecordedSkills")}
              </p>
            )}
          </Card>
          <Card
            title={t("episode.experience")}
            description={old("hookTypes.description")}
          >
            <ul className="space-y-[9px]">
              {hookTypes.map((hook) => (
                <Bar
                  key={hook.id}
                  label={t(`experienceTypes.${hook.id}`)}
                  count={hook.count}
                  fraction={hook.share}
                  percent={percent.format(hook.share)}
                />
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
