import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { BossTestGrid } from "@/components/progress/boss-test-grid";
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
import type { Episode } from "@/lib/act/types";
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
function point(index: number, value: number) {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / AXES.length;
  return [
    150 + (Math.cos(angle) * 75 * value) / 2,
    110 + (Math.sin(angle) * 75 * value) / 2,
  ];
}

export async function ProgressView({ episodes }: { episodes: Episode[] }) {
  const t = await getTranslations("actV2.ui");
  const checks = await getTranslations("actV2.checks");
  const cards = await getTranslations("actV2.cards");
  const old = await getTranslations("progress");
  const act = await getTranslations("act");
  const locale = await getLocale();
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  const split = towardAwaySplit(episodes);
  const radar = radarComparison(episodes);
  const bands = bandBreakdown(episodes);
  const maxBand = Math.max(1, ...bands.map((band) => band.total));
  const days = episodes.map((episode) => episode.day).sort();
  const period = { start: days[0], end: days[days.length - 1] };
  const range = days.length
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
        <Card
          title={old("split.title")}
          description={t("observations.completedActions", {
            count: split.completed,
          })}
        >
          <div className="flex flex-wrap gap-4">
            {(["toward", "away", "mixed", "unknown"] as const).map((dir) => (
              <div key={dir}>
                <p
                  className={cn(
                    "font-serif text-[30px]",
                    dir === "toward" && "text-toward",
                    dir === "away" && "text-away",
                  )}
                >
                  {split[dir]}
                </p>
                <p className="text-xs">{t(`direction.${dir}.label`)}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">
            {t("observations.notesAndPlans")}
          </p>
          <p className="mt-2 text-xs">
            {t("behaviorStatus.planned")}: {split.planned}
            <br />
            {t("behaviorStatus.not-described")}: {split.notDescribed}
          </p>
        </Card>
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
            <ul className="space-y-3">
              {states.map((state) => (
                <li
                  key={state.id}
                  className="flex flex-wrap justify-between gap-2 text-sm"
                >
                  <span>
                    {cards(
                      `${STATE_CARD_IDS[state.id as keyof typeof STATE_CARD_IDS]}.title`,
                    )}
                  </span>
                  <span className="font-mono text-xs">
                    {state.count} / {episodes.length}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
          <Card
            title={t("observations.skills")}
            description={t("observations.multipleSelectionHelp")}
          >
            <ul className="space-y-3">
              {skills.map((skill) => (
                <li key={skill.id} className="space-y-1 text-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span>
                      {cards(
                        `${SKILL_CARD_IDS[skill.id as keyof typeof SKILL_CARD_IDS]}.title`,
                      )}
                    </span>
                    <span className="font-mono text-xs">
                      {skill.count || "—"}
                    </span>
                  </div>
                  {skill.count === 0 && (
                    <div className="border-t border-dashed" />
                  )}
                </li>
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
            <ul className="space-y-2">
              {hookTypes.map((hook) => (
                <li key={hook.id} className="flex justify-between text-sm">
                  <span>{act(`hookTypes.${hook.id}.label`)}</span>
                  <span>
                    {hook.count} / {episodes.length}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
