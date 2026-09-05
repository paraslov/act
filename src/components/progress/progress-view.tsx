import { getTranslations } from "next-intl/server";
import { AXES, BANDS } from "@/lib/act/constants";
import { formatDayLabel } from "@/lib/act/date";
import {
  bandBreakdown,
  hookGroupTallies,
  radarComparison,
  skillTallies,
  statusEffectTallies,
  towardAwaySplit,
  unusedSkills,
} from "@/lib/act/derive";
import type { Episode } from "@/lib/act/types";
import { cn } from "@/lib/utils";

const RADAR_CX = 150;
const RADAR_CY = 110;
const RADAR_RADIUS = 80;

function percent(value: number): number {
  return Math.round(value * 100);
}

function scaledWidth(count: number, max: number): string {
  return `${(count / Math.max(1, max)) * 100}%`;
}

function radarPoint(index: number, radius: number): [number, number] {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / AXES.length;
  return [
    RADAR_CX + Math.cos(angle) * radius,
    RADAR_CY + Math.sin(angle) * radius,
  ];
}

function radarPolygon(values: number[], radius = RADAR_RADIUS): string {
  return values
    .map((value, index) => {
      const [x, y] = radarPoint(index, radius * (value / 2));
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function Radar({
  episodes,
  title,
  description,
}: {
  episodes: Episode[];
  title: string;
  description: string;
}) {
  const comparison = radarComparison(episodes);
  const rings = [1, 0.66, 0.33];

  return (
    <svg
      width="300"
      height="224"
      viewBox="0 0 300 224"
      role="img"
      aria-labelledby="flexibility-radar-title flexibility-radar-description"
      className="h-auto w-full max-w-[300px] shrink-0"
    >
      <title id="flexibility-radar-title">{title}</title>
      <desc id="flexibility-radar-description">{description}</desc>
      {rings.map((factor) => (
        <polygon
          key={factor}
          points={AXES.map((_, index) =>
            radarPoint(index, RADAR_RADIUS * factor)
              .map((coordinate) => coordinate.toFixed(1))
              .join(","),
          ).join(" ")}
          fill="none"
          className="stroke-border"
          strokeWidth="1"
        />
      ))}
      <polygon
        points={radarPolygon(comparison.map((axis) => axis.previous))}
        fill="none"
        className="stroke-muted-foreground/50"
        strokeWidth="1.5"
        strokeDasharray="3 3"
      />
      <polygon
        points={radarPolygon(comparison.map((axis) => axis.recent))}
        fill="var(--toward)"
        fillOpacity="0.14"
        stroke="var(--toward)"
        strokeWidth="2"
      />
      {AXES.map((axis, index) => {
        const [x, y] = radarPoint(index, RADAR_RADIUS + 12);
        const cosine = Math.cos(
          -Math.PI / 2 + (index * Math.PI * 2) / AXES.length,
        );
        return (
          <text
            key={axis.id}
            x={x}
            y={y + 3.5}
            textAnchor={
              Math.abs(cosine) < 0.2 ? "middle" : cosine > 0 ? "start" : "end"
            }
            className="fill-muted-foreground font-mono text-[9.5px] tracking-[0.08em]"
          >
            {axis.label.toUpperCase()}
          </text>
        );
      })}
    </svg>
  );
}

function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-card border bg-card px-6 py-[22px] text-card-foreground",
        className,
      )}
    >
      {children}
    </section>
  );
}

function CardHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header>
      <h2 className="text-base font-semibold tracking-[-0.01em]">{title}</h2>
      <p className="mt-1 mb-4 text-[13px] leading-[1.5] text-muted-foreground">
        {description}
      </p>
    </header>
  );
}

function signedDelta(value: number): string {
  if (Math.abs(value) < 0.05) return "±0.0";
  return `${value > 0 ? "+" : "−"}${Math.abs(value).toFixed(1)}`;
}

function chronological(episodes: Episode[]): Episode[] {
  return [...episodes].sort((a, b) => {
    if (a.day !== b.day) return a.day < b.day ? -1 : 1;
    if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? -1 : 1;
    return a.id.localeCompare(b.id);
  });
}

export async function ProgressView({ episodes }: { episodes: Episode[] }) {
  const t = await getTranslations("progress");
  const split = towardAwaySplit(episodes);
  const towardPercent = percent(split.toward / Math.max(1, split.total));
  const awayPercent = split.total ? 100 - towardPercent : 0;
  const bands = bandBreakdown(episodes);
  const maxBand = Math.max(1, ...bands.map((band) => band.total));
  const riskiest = [...bands].sort(
    (a, b) => b.away - a.away || b.total - a.total || a.index - b.index,
  )[0];
  const radar = radarComparison(episodes);
  const states = statusEffectTallies(episodes);
  const maxState = Math.max(1, ...states.map((state) => state.count));
  const hooks = hookGroupTallies(episodes);
  const maxHook = Math.max(1, ...hooks.map((hook) => hook.count));
  const skills = skillTallies(episodes);
  const maxSkill = Math.max(1, ...skills.map((skill) => skill.count));
  const untouched = unusedSkills(episodes);
  const bossCells = chronological(episodes);

  return (
    <div>
      <h1 className="font-serif text-[34px] leading-[1.1] tracking-[-0.02em]">
        {t("title")}
      </h1>
      <p className="mt-2 mb-[22px] max-w-[66ch] text-[14.5px] text-foreground/70">
        {t.rich("intro", { em: (chunks) => <em>{chunks}</em> })}
      </p>

      <div className="grid grid-cols-1 items-start gap-5 min-[1240px]:grid-cols-2">
        <Card>
          <CardHeading
            title={t("split.title")}
            description={t("split.description", { count: split.total })}
          />
          <div className="mb-3 flex h-4 overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full bg-toward"
              style={{ width: `${towardPercent}%` }}
            />
            <span
              className="block h-full bg-away"
              style={{ width: `${awayPercent}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-[22px]">
            <div>
              <p className="font-serif text-[30px] leading-none text-toward">
                {split.toward}
              </p>
              <p className="mt-1 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                {t("split.toward", {
                  percent: towardPercent,
                })}
              </p>
            </div>
            <div>
              <p className="font-serif text-[30px] leading-none text-away">
                {split.away}
              </p>
              <p className="mt-1 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                {t("split.away", {
                  percent: awayPercent,
                })}
              </p>
            </div>
            <div>
              <p className="font-serif text-[30px] leading-none">
                {split.total ? BANDS[riskiest.index] : "—"}
              </p>
              <p className="mt-1 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                {t("split.riskiest")}
              </p>
            </div>
          </div>
          <div className="mt-[18px] border-t pt-4">
            <p className="mb-2.5 text-[13px] font-medium">
              {t("split.byTime")}
            </p>
            <div className="flex h-[70px] items-end gap-[5px]">
              {bands.map((band) => (
                <span
                  key={band.index}
                  title={t("split.bandTitle", {
                    band: BANDS[band.index],
                    toward: band.toward,
                    away: band.away,
                  })}
                  className="flex h-[70px] min-w-0 flex-1 flex-col justify-end gap-0.5"
                >
                  <span
                    className="block rounded-t-[3px] bg-away"
                    style={{ height: `${(band.away / maxBand) * 62}px` }}
                  />
                  <span
                    className="block rounded-b-[3px] bg-toward"
                    style={{ height: `${(band.toward / maxBand) * 62}px` }}
                  />
                </span>
              ))}
            </div>
            <div className="mt-[5px] flex gap-[5px]">
              {BANDS.map((band) => (
                <span
                  key={band}
                  className="min-w-0 flex-1 text-center font-mono text-[9px] text-muted-foreground"
                >
                  {band.slice(0, 2)}
                </span>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeading
            title={t("radar.title")}
            description={t("radar.description")}
          />
          <div className="flex flex-wrap items-center gap-5">
            <Radar
              episodes={episodes}
              title={t("radar.imageTitle")}
              description={t("radar.imageDescription")}
            />
            <div className="flex min-w-[170px] flex-1 flex-col gap-2.5">
              {radar.map((axis) => (
                <div key={axis.axis}>
                  <div className="mb-1 flex justify-between gap-3 text-[12.5px]">
                    <span className="text-foreground/80">{axis.label}</span>
                    <span className="font-mono text-muted-foreground">
                      {axis.recent.toFixed(1)}{" "}
                      <span
                        className={cn(
                          axis.delta > 0.05 && "text-toward",
                          axis.delta < -0.05 && "text-away",
                        )}
                      >
                        {signedDelta(axis.delta)}
                      </span>
                    </span>
                  </div>
                  <span className="block h-1.5 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-toward"
                      style={{ width: `${(axis.recent / 2) * 100}%` }}
                    />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeading
            title={t("status.title")}
            description={t("status.description")}
          />
          <div className="flex flex-col gap-3">
            {states.map((state) => (
              <div
                key={state.id}
                className="border-b pb-3 last:border-0 last:pb-0"
              >
                <div className="mb-[5px] flex items-baseline justify-between gap-2.5">
                  <span
                    className={cn(
                      "text-sm font-medium",
                      state.count === 0 && "text-muted-foreground",
                    )}
                  >
                    {state.label}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {t("countShare", {
                      count: state.count,
                      percent: percent(state.share),
                    })}
                  </span>
                </div>
                <span className="mb-[7px] block h-[7px] overflow-hidden rounded-full bg-muted">
                  <span
                    className={cn(
                      "block h-full rounded-full",
                      state.count ? "bg-away" : "bg-muted-foreground/20",
                    )}
                    style={{ width: scaledWidth(state.count, maxState) }}
                  />
                </span>
                <p className="text-[12.5px] leading-[1.55] text-muted-foreground">
                  {state.description}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeading
              title={t("hooks.title")}
              description={t("hooks.description")}
            />
            <div className="flex flex-col gap-3">
              {hooks.map((hook) => (
                <div key={hook.label} className="flex items-center gap-3">
                  <span className="w-[30px] shrink-0 font-mono text-[15px] text-foreground/80">
                    {t("count", { count: hook.count })}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="mb-[5px] text-[13.5px] text-foreground/85">
                      {hook.label}
                    </p>
                    <span className="block h-[7px] overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full bg-away"
                        style={{ width: scaledWidth(hook.count, maxHook) }}
                      />
                    </span>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] tracking-[0.1em] text-muted-foreground uppercase">
                    {hook.type}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeading
              title={t("skills.title")}
              description={t("skills.description")}
            />
            <div className="flex flex-col gap-[11px]">
              {skills.map((skill) => (
                <div key={skill.id} className="flex items-center gap-3">
                  <span className="w-[118px] shrink-0 text-[13.5px] text-foreground/85">
                    {skill.label}
                  </span>
                  <span className="block h-[9px] flex-1 overflow-hidden rounded-full bg-muted">
                    <span
                      className={cn(
                        "block h-full rounded-full",
                        skill.count ? "bg-toward" : "bg-muted-foreground/20",
                      )}
                      style={{ width: scaledWidth(skill.count, maxSkill) }}
                    />
                  </span>
                  <span className="w-[26px] shrink-0 text-right font-mono text-xs text-muted-foreground">
                    {skill.count}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3.5 border-t pt-3 text-[12.5px] leading-[1.5] text-muted-foreground">
              {untouched.length
                ? t("skills.untouched", { skills: untouched.join(", ") })
                : t("skills.allUsed")}
            </p>
          </Card>

          <section className="rounded-card bg-inverse px-6 py-[22px] text-inverse-foreground">
            <p className="mb-2.5 font-mono text-[10px] tracking-[0.16em] text-inverse-muted uppercase">
              {t("boss.eyebrow")}
            </p>
            <p className="mb-[18px] font-serif text-[21px] leading-[1.3] tracking-[-0.01em]">
              {t("boss.summary", {
                total: split.total,
                toward: split.toward,
              })}
            </p>
            <div className="mb-4 flex flex-wrap gap-1">
              {bossCells.map((episode) => (
                <span
                  key={episode.id}
                  title={t("boss.cellTitle", {
                    day: formatDayLabel(episode.day),
                    band: BANDS[episode.band],
                    direction: t(`direction.${episode.dir}`),
                  })}
                  className={cn(
                    "size-[26px] rounded-chip border border-white/10",
                    episode.dir === "toward" ? "bg-toward" : "bg-white/15",
                  )}
                />
              ))}
            </div>
            <p className="text-[13px] leading-[1.6] text-inverse-muted">
              {t("boss.caption")}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
