import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  MAP_BASEMENT,
  MAP_CHOICE,
  MAP_LOOP,
  MAP_PILLARS,
} from "@/lib/reference/system-map";
import { mapNodeId, vaultHref } from "@/lib/reference/vault";
import { MapFocusRestore } from "./map-focus-restore";
import styles from "./system-map.module.css";

export async function SystemMapView() {
  const t = await getTranslations("reference.systemMap");
  const map = await getTranslations("actV2.ui.map");
  const cards = await getTranslations("actV2.cards");
  const axes = await getTranslations("act.axes");
  const loop = await getTranslations("actV2.ui.loop");
  const masterStat = await getTranslations("actV2.ui.rpg.masterStat");
  const pillars = await getTranslations("act.pillars");

  return (
    <div className={styles.map}>
      <MapFocusRestore />
      <header className={styles.header}>
        <h1>{t("title")}</h1>
        <span className={styles.eyebrow}>{t("eyebrow")}</span>
      </header>
      <p className={styles.lead}>{map("intro")}</p>

      <Link href="/reference/flexibility" className={styles.northStar}>
        <span className={styles.micro}>
          {t("northStar")} · {masterStat("label")}
        </span>
        <span className={styles.northStarTitle}>
          {cards("psychological-flexibility.title")}
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
        {MAP_PILLARS.map((pillar) => {
          const key = pillar.key.toLowerCase();
          return (
            <section
              key={pillar.key}
              className={styles.pillar}
              data-pillar={pillar.key}
            >
              <header>
                <p className={`${styles.micro} ${styles.pillarKey}`}>
                  {pillars(`${pillar.key}.name`)}
                </p>
                <h2>{map(key)}</h2>
                <p className={styles.question}>{map(`${key}Question`)}</p>
              </header>
              <div className={styles.band}>
                <h3 className={styles.micro}>{map("processes")}</h3>
                <div className={styles.nodes}>
                  {pillar.process.map((card) => {
                    const id = mapNodeId(`${pillar.key}-process`, card);
                    return (
                      <Link
                        key={card}
                        id={id}
                        href={vaultHref(card, id)}
                        className={styles.node}
                      >
                        {cards(`${card}.title`)}
                      </Link>
                    );
                  })}
                </div>
                <h4 className={`${styles.micro} ${styles.stuckLabel}`}>
                  {map("patterns")}
                </h4>
                <div className={styles.nodes}>
                  {pillar.patterns.map((card) => {
                    const id = mapNodeId(`${pillar.key}-patterns`, card);
                    return (
                      <Link
                        key={card}
                        id={id}
                        href={vaultHref(card, id)}
                        className={`${styles.node} ${styles.stuck}`}
                      >
                        {cards(`${card}.title`)}
                      </Link>
                    );
                  })}
                </div>
              </div>
              <div className={styles.band}>
                <h3 className={styles.micro}>{map("practices")}</h3>
                <div className={styles.nodes}>
                  {pillar.practices.map((card) => {
                    const id = mapNodeId(`${pillar.key}-practices`, card);
                    return (
                      <Link
                        key={card}
                        id={id}
                        href={vaultHref(card, id)}
                        className={styles.node}
                      >
                        {cards(`${card}.title`)}
                      </Link>
                    );
                  })}
                </div>
              </div>
              <div className={styles.band}>
                <h3 className={styles.micro}>{map("reflection")}</h3>
                <div className={styles.nodes}>
                  {pillar.reflection.map((axis) => {
                    const id = mapNodeId(`${pillar.key}-reflection`, axis);
                    // Reflection prompts open the app-checks card and scroll to
                    // their own axis section, never to the top of the card.
                    return (
                      <Link
                        key={axis}
                        id={id}
                        href={`${vaultHref("app-checks", id)}#${axis}`}
                        className={`${styles.node} ${styles.metric}`}
                      >
                        {axes(`${axis}.label`)}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <section className={styles.choice}>
        <header className={styles.choiceHeader}>
          <h2>{t("choiceTitle")}</h2>
          <span className={styles.choiceNote}>{map("choicePointNote")}</span>
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
            id={mapNodeId("choice", "point")}
            href={vaultHref(MAP_CHOICE.point, mapNodeId("choice", "point"))}
            className={styles.choicePoint}
          >
            {cards("choice-point.title")}
          </Link>
          <span className={styles.arrow} aria-hidden="true">
            →
          </span>
          <Link
            id={mapNodeId("choice", "away")}
            href={vaultHref(MAP_CHOICE.away, mapNodeId("choice", "away"))}
            className={styles.away}
          >
            {cards("away-move.title")}
          </Link>
          <Link
            id={mapNodeId("choice", "toward")}
            href={vaultHref(MAP_CHOICE.toward, mapNodeId("choice", "toward"))}
            className={styles.toward}
          >
            {cards("toward-move.title")}
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
          {MAP_LOOP.map((step) => (
            <Link
              key={step}
              href={`/reference/loop#${step}`}
              className={`${styles.node} ${styles.loopNode}`}
            >
              <span className={styles.micro}>{loop(`${step}.title`)}</span>
              <span>{loop(`${step}.question`)}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.basement}>
        <h2 className={styles.micro}>{map("foundations")}</h2>
        <p>{t("basementDescription")}</p>
        <div className={styles.basementNodes}>
          {MAP_BASEMENT.map((card) => {
            const id = mapNodeId("foundations", card);
            return (
              <Link
                key={card}
                id={id}
                href={vaultHref(card, id)}
                className={`${styles.node} ${styles.basementNode}`}
              >
                {cards(`${card}.title`)}
              </Link>
            );
          })}
        </div>
      </section>
      <p className={styles.evidence}>
        {t.rich("evidence", {
          vault: (chunks) => <Link href="/reference/vault">{chunks}</Link>,
        })}
      </p>
    </div>
  );
}
