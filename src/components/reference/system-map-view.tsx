import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LOOP_REF } from "@/lib/act/constants";
import {
  MAP_BASEMENT,
  MAP_CHOICE,
  MAP_PILLARS,
} from "@/lib/reference/system-map";
import { vaultHref } from "@/lib/reference/vault";
import styles from "./system-map.module.css";

export async function SystemMapView() {
  const t = await getTranslations("reference.systemMap");
  const act = await getTranslations("act");

  return (
    <div className={styles.map}>
      <header className={styles.header}>
        <h1>{t("title")}</h1>
        <span className={styles.eyebrow}>{t("eyebrow")}</span>
      </header>
      <p className={styles.lead}>{t("lead")}</p>

      <Link href="/reference/flexibility" className={styles.northStar}>
        <span className={styles.micro}>{t("northStar")}</span>
        <span className={styles.northStarTitle}>
          {act("vault.Core map.0.t")}
        </span>
        <span className={styles.definition}>{t("definition")}</span>
      </Link>

      <div className={styles.stem} data-mapconn="1" aria-hidden="true" />
      <div className={styles.bracket} data-mapconn="1" aria-hidden="true">
        <div />
        <div />
        <div />
      </div>

      <div className={styles.pillars}>
        {MAP_PILLARS.map((pillar) => (
          <section
            key={pillar.key}
            className={styles.pillar}
            data-pillar={pillar.key}
          >
            <header>
              <p className={`${styles.micro} ${styles.pillarKey}`}>
                {pillar.key}
              </p>
              <h2>{act(`pillars.${pillar.key}.name`)}</h2>
              <p className={styles.question}>{act(pillar.question)}</p>
            </header>
            <div className={styles.band}>
              <h3 className={styles.micro}>{t("model")}</h3>
              <div className={styles.nodes}>
                {pillar.model.map((node) => (
                  <Link
                    key={node.label}
                    href={vaultHref(node.card)}
                    className={styles.node}
                  >
                    {act(node.label)}
                  </Link>
                ))}
              </div>
              <h4 className={`${styles.micro} ${styles.stuckLabel}`}>
                {t("stuck")}
              </h4>
              <div className={styles.nodes}>
                {pillar.stuck.map((node) => (
                  <Link
                    key={node.label}
                    href={vaultHref(node.card)}
                    className={`${styles.node} ${styles.stuck}`}
                  >
                    {act(node.label)}
                  </Link>
                ))}
              </div>
            </div>
            <div className={styles.band}>
              <h3 className={styles.micro}>{t("skills")}</h3>
              <div className={styles.nodes}>
                {pillar.skills.map((node) => (
                  <Link
                    key={node.label}
                    href={vaultHref(node.card)}
                    className={styles.node}
                  >
                    {act(node.label)}
                  </Link>
                ))}
              </div>
            </div>
            <div className={styles.band}>
              <h3 className={styles.micro}>{t("metrics")}</h3>
              <div className={styles.nodes}>
                {pillar.metrics.map((axis) => (
                  <Link
                    key={axis}
                    href="/reference/flexibility"
                    className={`${styles.node} ${styles.metric}`}
                  >
                    {act(`axes.${axis}.label`)} 0–2
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>

      <section className={styles.choice}>
        <header className={styles.choiceHeader}>
          <h2>{t("choiceTitle")}</h2>
          <span className={styles.choiceNote}>{t("choiceNote")}</span>
        </header>
        <div className={styles.choiceFlow}>
          <div className={styles.hook}>
            <p className={styles.micro}>{t("hook")}</p>
            <p>{t("hookTypes")}</p>
          </div>
          <span className={styles.arrow} aria-hidden="true">
            →
          </span>
          <Link
            href={vaultHref(MAP_CHOICE.point)}
            className={styles.choicePoint}
          >
            {act("vault.Core map.2.t")}
          </Link>
          <span className={styles.arrow} aria-hidden="true">
            →
          </span>
          <Link href={vaultHref(MAP_CHOICE.away)} className={styles.away}>
            {t("away")}
          </Link>
          <Link href={vaultHref(MAP_CHOICE.toward)} className={styles.toward}>
            {t("toward")}
          </Link>
        </div>
        <p className={styles.choiceDescription}>
          {t.rich("choiceDescription", {
            episodes: (chunks) => <Link href="/episodes">{chunks}</Link>,
          })}
        </p>
        <h3 className={`${styles.micro} ${styles.operations}`}>
          {t.rich("operations", {
            loop: (chunks) => <Link href="/reference/loop">{chunks}</Link>,
          })}
        </h3>
        <div className={styles.loopNodes}>
          {LOOP_REF.map((step) => (
            <Link
              key={step.n}
              href="/reference/loop"
              className={`${styles.node} ${styles.loopNode}`}
            >
              <span className={styles.micro}>
                {step.n} · {act(`loop.${step.n}.name`)}
              </span>
              <span>{act(`loop.${step.n}.question`)}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.basement}>
        <h2 className={styles.micro}>{t("basement")}</h2>
        <p>{t("basementDescription")}</p>
        <div className={styles.basementNodes}>
          {MAP_BASEMENT.map((node) => (
            <Link
              key={node.label}
              href={vaultHref(node.card)}
              className={`${styles.node} ${styles.basementNode}`}
            >
              {act(node.label)}
            </Link>
          ))}
        </div>
      </section>
      <p className={styles.evidence}>
        {t.rich("evidence", {
          strong: (chunks) => <strong>{chunks}</strong>,
          vault: (chunks) => <Link href="/reference/vault">{chunks}</Link>,
        })}
      </p>
    </div>
  );
}
