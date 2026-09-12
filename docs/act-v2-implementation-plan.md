# Implementation Plan: ACT v2 (content integrity + library)

Derived from the audit package in [`act-audit-2026-09-09/`](./act-audit-2026-09-09) — [audit](./act-audit-2026-09-09/01-audit.md) (findings A01–A20), [spec](./act-audit-2026-09-09/02-spec.md) (T01–T20), [handoff](./act-audit-2026-09-09/07-implementation-handoff.md), [manifest](./act-audit-2026-09-09/library-manifest.json), and the paired `locales/{en,ru}.json` catalogs.

Every path below was verified against the working tree (branch `main`, on top of `36be824`). The audit package ships **content and data only** — no runtime file has been changed by it. All behaviour described here still has to be written.

## Product clarification and authority

Read [08-product-decisions.md](./act-audit-2026-09-09/08-product-decisions.md) first. Preserve the three intentional terms **Master stat**, **Status effects**, and **Boss test**, including the existing Boss test card/grid. Earlier audit instructions to remove them were an overreach and are superseded. Correct data and ACT claims without expanding or removing this bounded framing. The core and System Map design READMEs preserve visual fidelity; the current specification/locales and 25-link manifest override their superseded copy and link targets.

## Design source

[`design/design_handoff_act_v2/`](./design/design_handoff_act_v2) is the visual authority for the three surfaces it covers — episode capture (Phase 5), Library (Phase 3), and Observations (Phases 1.3, 2, 6). High-fidelity: 12 artboards (`1a`–`1m`) in light and dark, and every label in them is verbatim from `actV2.*` — all 55 message keys it cites were checked and resolve. Where it conflicts with a token in `src/app/globals.css`, the repo token wins.

Its **single absence rule** — a 1px dashed hairline plus a mono uppercase label naming what is absent, used unchanged for all ten absence cases — is the visual form of this plan's first invariant, and its two corollaries are load-bearing: an absence never renders at the zero end of anything (no short bar, no zero-length radar spoke, em dash for the readout), and absence never borrows the Toward/Away accents.

Everything outside those three surfaces stays as designed in [`design/README.md`](./design/README.md). Four reconciliations between that handoff and this plan are folded into the phases below (0.5, 1.1, 5.1, 5.5). Of the handoff's own three open items, RU strings in the longest labels and the unlabelled-heading FLAG are tracked in Phase 8; **375px is deferred out of this implementation** — see "Deferred: narrow-screen pass". Build the three surfaces at desktop width, following the repo's wrap-based layout convention so they degrade rather than overflow.

## What the audit actually asks for

Three distinct bodies of work, often conflated:

1. **Data integrity (P0).** The app currently manufactures facts the user never recorded: an unselected direction becomes `toward`, an unanswered check becomes `0`, two episodes produce a positive delta against a nonexistent baseline, and zero Away moves still produce a "riskiest window". This is a **code** problem — new copy fixes none of it.
2. **Library + map (P1).** 15 cards must become 36; 25 map links currently land on 13 cards, so distinct concepts share one explanation. This is mostly a **registry/routing** problem plus a large catalog merge.
3. **Episode model (P1).** The form collects classification but not context or consequences, and there is no way to revise an entry. This is a **schema + form** problem.

The handoff's own warning applies to this plan too: *"Do not claim that all requirements are implemented from a copy-only change."*

## Invariants (hold across every phase)

Carried forward from the existing product rules, plus the audit's:

- **Missing ≠ zero, missing ≠ neutral.** `null` check responses, `unknown` direction and `not-described` behaviour must survive the whole pipeline: form → zod → column → derivation → chart. Any place that reads `?? 0` on a check or defaults a direction is a defect.
- **Never invent a completed action.** A note, an intention or a plan is not a Toward Move. Counts of completed actions include only `behaviorStatus = 'acted'`.
- **Bounded RPG framing, accurate records.** Keep Master stat, Status effects, and the Boss test card/grid. No `/10` total, calculated Master stat level, Boss test pass/fail, streak as a headline, risk prediction, rank, or letter evidence grades. No additional game language.
- **Direction is functional, not hedonic.** Toward/Away comes from context, values and consequences — never from discomfort, from a selected skill, or from a linked value. Rest, enjoyment, boundaries and stopping can all be Toward (T08).
- **Never rewrite history.** Legacy rows keep their stored meaning; `value_snapshot` semantics from the values feature are the model to copy. Nothing gets deleted or back-filled with a guess.
- **Card copy is keyed by stable ID**, never by numeric position in a category (the current `en.act.vault["Core map"]["0"]` pattern is exactly what must go).
- **EN and RU ship together**, identical key paths and placeholders. `src/i18n/messages.test.ts` already enforces parity — keep it green rather than relaxing it.
- **Legacy IDs keep British spelling** (`rule-governed-behaviour`) while new prose uses American ("behavior"). Spelling convention, not a migration.

## Reconciliations (handoff assumptions vs. this codebase)

Four points where the handoff is slightly ahead of the tree. None blocking:

- **`episode_dir` is a Postgres enum** (`migrations/0003_act_tables.sql`), and the migration runner wraps each file in `BEGIN/COMMIT` (`scripts/lib/migrations.mjs`). `ALTER TYPE … ADD VALUE` inside a transaction cannot be *used* in that same transaction, which makes a CHECK or default referencing `mixed`/`unknown` fail on apply. **Decision: drop the enum and store `dir` as `text` with a CHECK constraint**, matching how `state` and `skill` are already stored (plain text, app-level enums in `constants.ts`). One-way, safe, and consistent with the existing schema style.
- **Reference content lives in TypeScript constants**, not the database (`0003_act_tables.sql` header). The 36-card library follows that rule: a typed registry generated from / validated against `library-manifest.json`, with text resolved through next-intl. Do **not** add a cards table.
- **The manifest is not a runtime module.** It carries `reviewedAt: null`, `status: "editorial-draft-awaiting-ACT-review"`, `schemaVersion`, filenames and `sourceRole` — none of which may reach the UI. Import the shape, render only what the spec allows.
- **Timezone plumbing is stubbed.** `src/lib/act/date.ts` hard-codes `DEFAULT_TIMEZONE = "UTC"` with a comment promising a per-user zone in `user_settings`; `user_settings.settings` already has a `timezone?: string` slot (`src/lib/db/user-settings.ts`) that nothing writes. A15/T18 is the moment to finish it.

## Sequencing rationale

Spec §10 gives four stages. This plan keeps them but inserts **Phase 0** first: the ID registry and catalog merge are prerequisites for both Stage 1 copy and Stage 2 routing, and doing them twice is the main avoidable cost here.

Phases 1 and 2 form one release unit: corrected calculations and corrected explanatory copy ship together while preserving the three RPG labels. Phases 3–4 (library/map) and 5–6 (episodes/time) can proceed in parallel after Phase 0 — they touch disjoint files apart from `constants.ts`.
[act-audit-2026-09-09](act-audit-2026-09-09) - do not commit anything in this folder!!!
---
## Phase 0 — Registries and catalogs *(prerequisite for everything)*

**Goal:** stable IDs and localized copy exist and typecheck, with no behaviour change yet.

- [x] **0.1 Merge the `actV2` namespace.** Copy the top-level `actV2` object from `docs/act-audit-2026-09-09/locales/{en,ru}.json` into `src/i18n/messages/{en,ru}.json`. **Merge, do not replace** — `auth`, `common`, existing page copy and user-authored notes stay. 459 leaves per catalog (252 card strings, 15 question strings, 192 UI messages). Leave the old `act.*` tree in place for now; it is removed per-surface as each phase lands.
- [x] **0.2 Extend the parity test.** `src/i18n/messages.test.ts` should additionally assert: `actV2` key paths identical across locales, placeholder sets identical, no empty leaves, and no Cyrillic in `en.json`'s `actV2` subtree (the audit's "English-language purity" check, cheap to keep).
- [x] **0.3 Card registry — `src/lib/reference/library.ts`** (new). The 36 cards with `id`, `category` (`core | processes | patterns | practices | theory | guides`), `contentType` (`model | concept | practice | theory | app-guide`), `relatedIds`, `sourceIds`. Types derived so a typo in a related ID fails `pnpm typecheck`. Sources (`SOURCES`, 10 entries with `url` + publication title, untranslated) live here too.
- [x] **0.4 Alias registry.** `aliases` (`rft-rule-governed-behaviour` → `rule-governed-behaviour`) and the 15 `legacyTitleAliases` (English titles → IDs). Resolution order, per handoff: **legacy title → stable-ID alias → category from manifest.**
- [x] **0.5 Persisted-ID registries.** Explicit maps, not string munging:
  - state: `fusion→cognitive-fusion`, `avoidance→experiential-avoidance`, `autopilot→inflexible-attention`, `selfstory→self-as-content`, `drift→values-disconnection`, `stuck→inflexible-action`
  - skill: `notice→notice`, `defuse→defuse`, `accept→accept-make-room`, `anchor→anchor-return`, `orient→orient-to-values`, `commit→small-step`
  - **`commit` stays `commit` in stored rows.** Linking its explanation to `small-step` is display only and must not reclassify a historical episode's direction.
  - **Decision — the skill chip reads "A Workable Next Step", not "Committed Action".** The design handoff's Control 4 lists the sixth skill under the *process* card title and defers the choice ("labels follow the library card titles if those are adopted later"); close it here. `commit` maps to `small-step` = "A Workable Next Step", and spec §3.2 requires Committed Action and A Workable Next Step stay distinct — labelling the picker with the process title re-merges them at the one moment the user chooses. The other five chips are short forms of their card titles and stay as drawn.
  - **Decision — no seventh skill chip for perspective-taking.** A17 asks for a practice supporting flexible perspective-taking rather than a defusion phrase; the `perspective-taking` library card (Phase 3.5) satisfies that. A new selectable skill ID would add an enum value with zero recorded history and nothing to migrate, and the handoff forbids inferring it for past episodes anyway. The design's six chips are correct. Revisit only if the card alone proves insufficient in Phase 8.6 comprehension testing.
- [x] **0.6 Fixture test — `src/lib/reference/library.test.ts`.** Load the manifest, assert: 36 card IDs match the registry, all 108 `relatedIds` resolve, all 25 `systemMapMappings` targets exist, every card has all 7 text leaves in both catalogs, every `sourceId` resolves.

**Exit criterion:** `pnpm check` green; nothing user-visible has changed.

Completed 2026-09-09: `pnpm check` passes on Node 24.15.0 (118 tests). Both catalogs preserve all existing messages and add the exact 459 supplied leaves. The registry remains disconnected from existing views. `tests/fixtures/act-v2-library-manifest.json` snapshots the manifest’s display metadata for reproducible tests without committing or importing the audit folder.

---

## Phase 1 — P0 data integrity *(A01–A04, spec §4/§6/§9)*

**Goal:** a minimal entry never creates a fact the user did not record.

### 1.1 Schema — `migrations/0005_episode_integrity.sql`

- [x] `dir`: enum → `text NOT NULL CHECK (dir IN ('toward','away','mixed','unknown'))`. Existing `toward`/`away` values are preserved verbatim as **historical interpretations**. Drop `episode_dir` after the column swap.
- [x] `behavior_status text NOT NULL DEFAULT 'not-described' CHECK (behavior_status IN ('acted','planned','not-described'))`. Existing rows get `not-described` — the app never established that an action occurred, and guessing is exactly what A01 forbids.
- [x] Consequence + interpretation columns (spec §4): `immediate_outcome`, `later_consequences`, `consequence_status` (`observed|expected|unknown`), `intended_function`, `next_experiment`, `interpretation`. Text, defaulting to `''`.
- [x] `schema_version smallint NOT NULL DEFAULT 2`; existing rows back-filled to `1`. This is what marks legacy data for §9's "exclude from new comparisons by default, allow manual clarification, do not delete".
- [x] Multi-select: `states text[]` / `skills text[]` alongside the existing singular columns. Migrate by wrapping the scalar (`ARRAY[state]`), **without inferring extra selections**. `none` keeps its historical meaning — an explicit absence, *not* unknown; new explicit unknown values are added as distinct entries.
- [x] **Name the absence sentinels.** The design requires three absences that never collapse, so spell out what is stored: patterns take `'unknown'` ("I do not know") or `'none-noticed'` ("I did not notice any of these"); skills take `'unknown'` or `'no-skill'` ("No skill used"). Legacy `'none'` stays a fourth, **read-only** value — never offered in the picker, rendered only through the `legacy.notice` frame. All four are distinct from an empty array, which means the question was not reached. Sentinels are mutually exclusive with each other and with any selection, enforced in the zod schema as well as the form.
- [x] Timezone provenance (paired with Phase 6): `event_timezone text`, and keep `day`/`band` as the stored local truth. Legacy rows get `NULL` — unknown zone, not UTC-asserted.
- [x] RLS/grant blocks follow the `0003`/`0004` pattern verbatim; guarded `act_app` GRANTs.

### 1.2 Types and validation

- [x] `src/lib/act/types.ts`: `EpisodeDir = "toward"|"away"|"mixed"|"unknown"`; add `BehaviorStatus`, `ConsequenceStatus`; `Checks` values become `0|1|2|null` with absence meaning not-rated; new fields on `Episode`; `EpisodeActivity` picks up `behaviorStatus`.
- [x] `src/actions/episodes.ts` — **the A01 fix.** Delete `.default("toward")` on `dir` (→ `.default("unknown")`), `.default("thought")` on `hookType`, and the `|| "—"` transforms on `value`/`move`/`workable` that fabricate content. Saving requires nonempty text in **at least one** of situation / private experience / action (T01). `acted` requires a nonempty action description (T02). Checks omit rather than zero-fill. The server enforces this independently of the form (§9).
- [x] `band` default currently derives from `new Date().getUTCHours()` — moved to the user zone in Phase 6; leave a `TODO` linking A15 so it is not forgotten.

### 1.3 Derivations — `src/lib/act/derive.ts`

- [x] **Delete `checksTotal`** and its two call sites (`journal-view.tsx:720`, `episodes-view.tsx:355`, both rendering `score` as `n/10`). A03/A11.
- [x] `axisAverages` → returns `{ mean: number | null, n: number }` per axis: sum of **explicit** responses over **count of explicit responses on that axis**. No responses → `null` (A02, T03, T05).
- [x] `radarComparison` → gated: latest 5 with their actual date range; a previous-5 comparison only when ≥10 records **and** ≥3 answered items on that axis in each group, else "Not enough responses to compare yet". Threshold documented in-comment as a conservative product rule, not a significance test (A03, T04).
- [x] `splitCounts` currently computes `away = total − toward`, which silently absorbs `mixed`/`unknown`. Rewrite as four explicit counts + a separate tally of `planned` / `not-described` entries kept out of completed-action counts (§6.2).
- [x] **Delete the riskiest-band derivation** (`progress-view.tsx:181`) and replace with a plain records-by-time-of-day count (A04, T06).
- [x] `towardStreak` → `returningToPractice(episodes, period)`: distinct days with any entry in the selected period. A missed day never erases prior participation (A12, T07).
- [x] `unusedSkills` → renamed and re-framed as "skills you named" with the inverse rendered as a neutral note, never a prescription (A13).
- [x] **New `bossTestCells(episodes, period)`** — the Boss test grid is retained, so it needs a derivation that survives the four-direction model. `progress-view.tsx:196` currently calls `chronological(episodes)` and colours each cell by `dir` alone, which after Phase 1.1 renders `mixed`, `unknown`, notes and plans as Away. Return one cell per entry in the period carrying `{ id, day, behaviorStatus, dir, isLegacy }`, and give the view **six distinguishable treatments**: completed Toward, completed Away, completed Mixed, completed Unknown, plan, and note/unclarified-legacy. Toward/Away may keep the established green/amber accents; the other four need neutral or outlined treatments plus a legend — colour is never the only channel. Each cell keeps an accessible description containing the date and the recorded status, and opens the existing entry. Summary counts come from `actV2.ui.rpg.bossTest.summary`: `total` is entries in the period, `toward` counts **only** `behaviorStatus === 'acted'` with `dir === 'toward'` (G03).
- [x] **Delete `HOOK_GROUPS`** from `constants.ts` and `hookGroupTallies` from `derive.ts` — five hard-coded substring groups inventing personal narratives from the word "anger" or "laptop" (A14, T15). v1 uses experience types and exact user-authored tags only.
- [x] Update `src/lib/act/derive.test.ts` and `src/actions/episodes.test.ts`. **Existing assertions that lock in the defaults are wrong and get replaced, not preserved** — per handoff §"Validation and completion".

### 1.4 Legacy data surface

- [x] A quiet note on episodes with `schema_version = 1`: direction recorded under the previous definition, action not confirmed, zero checks not distinguishable from unanswered. Copy from `actV2.ui.legacy`. Excluded from new comparisons by default, with a manual clarification path. Never deleted, never auto-corrected.

Implementation completed 2026-09-10. Migration `0005` also makes unanswered `hook_type` and compatibility scalar selections nullable, and adds a `legacy_snapshot` frozen on explicit clarification. Consequence status defaults to `unknown`; descriptive consequence fields default to empty text. The focused clarification dialog updates only direction, behavior status, action text, and explicitly revisited checks; dates, existing selections, value snapshots, and original row data stay preserved. The full edit/expanded flow remains Phase 5.

Integration required updating the current form, Journal, Episodes, Today counts, and Progress together. Journal markers now use a uniform size and a corrected paired EN/RU hint; the first five skill chips keep their short labels and `commit` reads the `small-step` title. These do not complete the remaining Phase 2 copy sweep or Phase 5 capture design.

Validation: `pnpm check` on Node 24.15.0; 140 unit tests. `pnpm test:db` on a disposable PostgreSQL 16 database; 4 migration/isolation checks and 9 repository tests. Desktop browser checks in EN/RU covered a hook-only save, explicit completion with Mixed direction and a zero rating, mutually exclusive absence selections, the six Boss test treatments, legacy clarification without a duplicate, and draft preservation/retry after a forced save failure. The existing database has **not** been migrated. Back it up before applying `0005`, and release Phases 1 and 2 together as planned.

**Exit criterion (spec §10 Stage 1):** T01–T07 pass. Save a hook-only entry → direction `unknown`, completed-Toward count unchanged, no `/10` anywhere, no delta and no risk window from 2 records.

---

## Phase 2 — P0 copy and claims *(A05–A08, A11, spec §7/§8)*

Phase 1 removes the false numbers; this removes the false statements. Both are Stage 1.

- [x] **Sidebar** (`app-sidebar.tsx:141–164`, `app/(protected)/layout.tsx:29`): preserve the Master stat block and visual treatment, using `actV2.ui.rpg.masterStat` with the Psychological Flexibility title. Show no calculated total or level. Replace the Streak success measure with the optional "Returning to practice" summary from Phase 1.3.
- [x] **Nav labels:** Progress → **Observations** (route stays `/progress`), Vault → **Library** (route stays `/reference/vault`). Displayed label only.
- [x] **Progress view** (`progress-view.tsx`): preserve the Boss test dark card/grid (`:484–509`) and Status effects section. Use `actV2.ui.rpg` copy; follow the cell/status/count contract in product clarification §"Boss test behavior". Delete only the riskiest-window tile (`:246–249`). Use the `actV2.ui.observations` intro; every percentage states its denominator.
- [x] **Direction copy:** "Uncomfortable, but workable" / "Relief now, narrower life later" → the four `actV2.ui.direction` definitions plus the help line ("The same action can serve different functions…"). Discomfort is decoupled from direction everywhere (A05).
- [x] **Toward/Away get their own cards.** Away currently links to `experiential-avoidance`; in Choice Point these are distinct (audit note on Harris, p.3). Handled structurally in Phase 3, but the *copy* claim is corrected here (A06).
- [x] **Delete the `ev:` evidence grades** from all 15 `LIB` entries in `constants.ts` (`"(a/b)"`, `"(b)"`, `"frame"`). Replace with `contentType` labels + specific `sourceIds`. No letter grades survive (A07).
- [x] **Strike the unsupported claims** — the §8 replacement table, ten rows: "most of the effect comes from Committed Action", "the most theoretically disputed process", "a consciously chosen Away Move already costs less", "the urge peaks within ninety seconds", "without the journal the same cycle repeats", "a value is finishing boring tasks", and the rest. Grep for each in both catalogs (A08).
- [x] **Journal markers** (`journal-view.tsx`): marker size is driven by `weight`, which the form never collects — so the size implies an intensity the record does not hold. **Decision: stop scaling by weight; markers render at one uniform size.** Collecting weight explicitly would add a field to a form the audit already calls overloaded (A18), to encode something the user never asked to record; the column stays for legacy rows but stops driving anything visible. The design handoff does not cover Journal beyond the legacy marker, and a uniform marker needs no design. Add the `actV2` empty-day copy: "There are no entries for this day. That does not tell us how you lived it."
- [x] **Boundary statement** in onboarding, the general help card and relevant practices — concise, not repeated on every card. Emergency routing is deferred to Phase 8 (it needs a verified per-country number and must never be inferred from language).
- [x] **Sweep both catalogs and every rendered screen** for misleading `/10` totals, numeric Master stat levels, Boss test pass/fail claims, streak-as-success, riskiest, evidence letters, "discomfort" as a Toward precondition, and automatic prescriptions for unused skills. Explicitly verify that Master stat, Status effects, and the Boss test card/grid remain present. Changing wording while leaving the inference in place does not count.

**Exit criterion:** the three RPG labels and Boss test grid remain; no screen presents them as a validated psychological measure, a risk prediction, a rank, a pass/fail result, or a proven effect. Descriptive record counts remain available.

Implementation completed 2026-09-10. The Streak block had already been replaced in Phase 1; this phase finished the sidebar by sourcing the retained Master stat label from `actV2.ui.rpg.masterStat` with the `nav.flexibility` title and the non-numeric help line. Nav labels changed value only — `nav.progress` and `nav.vault` still key the same routes.

Sixty-one dead or superseded catalog keys were deleted in both locales rather than left unused, because each carried a removed claim: the `episodeModal` fields the rewritten dialog no longer reads (including `10/10`, "Relief now, narrower life later" and "the discomfort didn't have to drop first"), `episodes.card.score` and `journal.score`, the `progress` subtrees the Phase 1 rewrite orphaned (riskiest window, boss summary/caption, "Untouched this month … give it a week"), `act.hookGroups`, `nav.streak*`, and `reference.vault.legend`. Twenty-seven strings were rewritten: the ten §8 rows plus the discomfort-precondition framings in `act.growth.1`, `act.pillars.Engaged`, `reference.systemMap.choiceDescription` and `reference.flexibility.lead`, and a second set of evidence letters found in `reference.systemMap.evidence` that the audit's own list does not name.

Two decisions worth recording. **The Observations split card is titled "Recorded directions"**, taken verbatim from artboard `1k` — no `actV2` key covers that heading, and the four-direction card can no longer be called "Toward / Away". **The Russian Master stat label now has one source**: `reference.flexibility.eyebrow` and `reference.systemMap.northStar` read «Главная характеристика», not «Главный навык» / «главный показатель». G01/G05 require both headings kept, and keeping three Russian names for one retained term is the A20 defect the sweep exists to catch. The English composition of both headings is unchanged.

The boundary statement (`actV2.ui.help.boundaries`) sits in three places, not on every card: the Library footer under `library.sourceNote`, the Flexibility reference below its evidence note, and the Loop page paired with `practice.notFit`. There is no onboarding surface to place it on yet.

A05 is corrected in copy but not everywhere in structure: `today.evening.awayLabel` still presumes an Away Move occurred, which Phase 7.1 owns. A06 is likewise copy-only — no string equates an Away Move with experiential avoidance, but the System Map node still links there until Phase 4.1 applies the 25 mappings.

Validation: `pnpm check` on Node 22.12.0 — 145 unit tests, including five new catalog assertions that fail on a reintroduced `/10`, evidence letter, riskiest window, streak headline or ninety-second urge claim; `pnpm build` succeeds. A script resolved all 350 literal message keys in the source against the catalog after the deletions. Desktop browser checks in EN and RU covered all nine routes: Master stat with no number, Observations/Library nav labels, "Recorded directions", content-type pills and per-card sources in place of `(a)`/`(b)`/`(c)`, the journal empty-day and marker copy, and a regex sweep of the rendered HTML of every route. Node 24 (`8.5`) and the 375px pass remain outstanding.

---

## Phase 3 — Library: 36 cards *(A16, spec §3, Stage 2)*

- [x] **3.1 Replace `LIB`** in `constants.ts` with the Phase 0 registry. Six categories replace `Core map / Concepts / Skills / Basement`. Categories are a navigation aid — never part of a card ID.
- [x] **3.2 Seven layers per card:** the existing `short/practice/example/deep` plus `pitfall`, `reflection`, `relatedIds`. Deep content must add something beyond the short definition (audit: "four single-sentence paragraphs rarely explain limitations").
- [x] **3.3 New process cards:** `acceptance`, `cognitive-defusion`, `present-moment`, `values`; move `self-as-context` and `committed-action` into the process category.
- [x] **3.4 New pattern cards:** `inflexible-attention`, `self-as-content`, `values-disconnection`, `inflexible-action`; keep `cognitive-fusion`, `experiential-avoidance`. **Self-as-content is not inherently dysfunctional** — the card describes *rigid attachment to a self-description*.
- [x] **3.5 New practices:** `perspective-taking` (Aware — A17, the gap the audit calls out) and `small-step` (Engaged). Acceptance ≠ Make Room, Values ≠ Orient to Values, Committed Action ≠ A Workable Next Step: related, separately addressable.
- [x] **3.6 Theory split:** `relational-frame-theory` and `rule-governed-behaviour` get separate destinations; `rft-rule-governed-behaviour` becomes an alias of the latter with a visible related link to RFT.
- [x] **3.7 Routing — `src/lib/reference/vault.ts`.** `resolveVaultSelection` currently falls back to `LIB[category][0].id`, i.e. an unknown card ID silently opens an unrelated first card (T13). Replace with the Phase 0.4 resolution order and three distinct outcomes: **unknown explicit ID → not-found state + search**; **absent `card` param → normal landing**; **explicit empty `card` → collapsed state preserved** (that last one is deliberate existing behaviour — keep it). `card` still wins over a conflicting `tab`; a legacy category name must not break a card link (T12).
- [x] **3.8 Vault view** (`vault-view.tsx`): content-type label, related-concept links (titles from the active locale), source links (titles from the manifest, unlocalized, framed as background reading — not evidence), **Back to System Map** restoring node context *and* keyboard focus, and for practices an optional "record an observation" route.
- [x] **3.9 Search** across EN/RU titles and aliases. Read-only — search must never touch personal records.
- [x] **3.10 Tests:** extend `src/lib/reference/vault.test.ts` for alias order, the three not-found/landing/collapsed outcomes, and every legacy title link.

**Exit criterion (Stage 2):** each concept has an explanation at the destination reached from its own link.

Implementation completed 2026-09-10. `LIB` and `VaultCategory` are gone from `constants.ts`; the Library renders the Phase 0 registry directly. Routing returns a four-state `VaultSelection` (`card` / `landing` / `collapsed` / `not-found`), so T13's silent fallback to an unrelated first card is fixed and a legacy `tab` name only picks a category, never a card. Search is client-side over a server-built index of EN/RU titles, IDs and aliases — `library-search.ts` keeps both catalogs out of the client bundle, and the index contains no personal data.

Two additions beyond the checklist. `vaultHref` carries a validated `from=map-node-*` fragment, so **Back to System Map returns keyboard focus to the originating node**, not just its scroll position; only a local map fragment is ever accepted, so the parameter cannot become an open redirect. And the seven-layer ladder uses `flex-wrap` with `basis-[118px]` rather than a fixed two-column grid, which is what the deferred narrow-screen pass asked for.

**Decision — two new `actV2` leaves were added**, `library.notFoundLabel` ("Card not found") and `library.noResultsLabel` ("No results"), paired EN/RU. The handoff's absence rule requires a mono label naming what is absent, and it specifies that treatment for both `library.notFound` and `library.noResults`, but no key exists for either label — the same class of gap as the unlabelled pattern-absence heading FLAG. Recorded here rather than resolved silently; the catalog is now 461 leaves per locale, not 459.

**Decision — the "Orient to values" blocks stay.** The rewritten view initially dropped them, which removed the four-domain map, the worked domain→value→goal→action example, the Harris attribution and the only Library link into My Values; `orient-to-values-card.tsx` was left importerless. The seven actV2 layers compress that structure into one `deep` sentence, which is not a replacement for a shipped Values feature. The blocks are re-integrated into the shared layer rows (`practice`/`example`/`deep`) with the footer above the sources hairline, and `vault-view.test.tsx` now asserts they render on that card and on no other.

Catalog cleanup that Phase 0.1 defers to each surface has been done for this one: `reference.vault.*` is reduced to `orientToValues`, and `act.vault` to the three titles the System Map still reads (`Core map.0.t`, `Core map.2.t`, `Concepts.2.t`) — 87 keys down to 4 per locale. Phase 4.5 removes the last three with `act.referenceNodes`.

Two things Phase 4 inherits. The plan expected `MapNode.card` to stop compiling against the new registry as a forcing function; it does not, because `VaultCardId` widened to `LibraryCardId | keyof typeof aliases`, so **4.1 must apply the 25 mappings deliberately**. Until it does, this exit criterion is only half-true: every card has its own explanation and every Library link reaches it, but the map still sends autopilot to `notice`, Away to `experiential-avoidance` and drift to `orient-to-values`. `vault.test.ts` states that deferral in place.

Validation: `pnpm check` on Node 22.12.0 — 146 unit tests across 11 files, including a rewritten `vault.test.ts` (15) and a new `vault-view.test.tsx` (8) that renders all 36 cards in both locales through `renderToStaticMarkup`, needing no jsdom; `pnpm build` succeeds. Desktop browser checks in EN and RU: 6 tabs counting 6/6/6/7/6/5, live search typing, an unknown ID showing the dashed not-found frame with search and back-to-map, deep-link focus landing on the opened card's toggle, the map→card→map round trip restoring focus to the exact node, `rft-rule-governed-behaviour` opening Rule-governed behaviour with a visible RFT link, `/episodes?new=1` opening the capture dialog and stripping the parameter, and the restored values blocks in both locales.

---

## Phase 4 — System Map *(A16, spec §3.2)*

- [x] **4.1 Apply all 25 mappings** from the audit table / `manifest.systemMapMappings` in `src/lib/reference/system-map.ts`. The current `MapNode.card` union will simply stop compiling against the new registry — that is the intended forcing function. Notable corrections: Away → `away-move` (not `experiential-avoidance`), Toward → `toward-move`, autopilot → `inflexible-attention`, self-as-content → `self-as-content`, drift → `values-disconnection`, inaction → `inflexible-action`, present moment → `present-moment`, committed-action practice → `small-step`.
- [x] **4.2 Node types** rendered on the map: process / pattern / practice / reflection prompt, each with a short definition. The map's promise that every node opens a card either becomes true or the promise is reworded — currently it is neither.
- [x] **4.3 Reflection anchors:** the five prompts link to `/reference/vault?card=app-checks#<axis-id>` for awareness/openness/choice/values/action, matching the specification and System Map handoff. The final scroll must target the axis, not reset to the card top.
- [x] **4.4 Loop anchors:** `/reference/loop#notice|#open|#orient|#choose|#act`, **plus a new `#review`** step for later feedback.
- [x] **4.5 `act.referenceNodes` → `actV2.ui.map`** + localized card titles. **Do not migrate `reference.systemMap` wholesale.** `actV2.ui.map` has 13 keys (intro, processes, patterns, practices, reflection, foundations, choicePointNote, open/aware/engaged + their three questions) and **no `northStar`** — so a blanket swap silently deletes `reference.systemMap.northStar` ("North star · master stat", `src/i18n/messages/en.json:416`), the heading that the [product clarification](./act-audit-2026-09-09/08-product-decisions.md) and `design/design_handoff_system_map/README.md:8` both require kept (G01, G05). Retain it, composed from `actV2.ui.rpg.masterStat.label` so the retained term has one source. The same applies to `reference.flexibility.eyebrow` ("Master stat · reference") in Phase 7.3 — recomposing that page must not drop its eyebrow. After the migration, grep both catalogs for the three retained labels and confirm each still resolves on its screen.

**Verification:** follow all 25 links; meaning, ID and heading must match (T11).

Implementation completed 2026-09-10. `system-map.ts` now stores each node as a bare `VaultCardId` (or `AxisKey` for reflection prompts); `satisfies readonly VaultCardId[]` is the forcing function the plan expected, in place of the old per-node `MapNode.card`. All 25 manifest mappings plus the added `perspective-taking` practice render as localized card titles, so the RU "Шаг Away/Toward" mixed-language labels are gone — the choice nodes now read the `away-move` / `toward-move` card titles. The notable corrections were confirmed live: Away→`away-move`, autopilot→`inflexible-attention`, drift→`values-disconnection`, inaction→`inflexible-action`, RFT→`relational-frame-theory`, committed-action practice→`small-step`.

The five reflection prompts link to `/reference/vault?card=app-checks#<axis-id>`; the app-checks card now renders a per-axis anchor block (`id="awareness|openness|choice|values|action"`), and the existing deep-anchor effect scrolls to the axis, not the card top (verified: the `#choice` link lands on the Choice row near the top of the viewport). Loop nodes use `actV2.ui.loop` with anchors `#notice|#open|#orient|#choose|#act|#review`; the loop page gained stable `id`s on its five steps plus a dashed `#review` step (full 6-step copy rewrite stays Phase 7.2).

**Migration decisions.** `act.referenceNodes` and `act.vault` are deleted (both locales) — node labels and the north-star/choice-point titles now come from `actV2.cards.<id>.title`. `reference.systemMap` was pruned, not swapped wholesale: `lead` (→`actV2.ui.map.intro`), `model`/`stuck`/`skills`/`metrics` (→ processes/patterns/practices/reflection headings), `choiceNote` (→`choicePointNote`), `away`/`toward` (→ card titles) and `basement` (→`foundations`) were removed; `title`, `eyebrow`, `definition`, `choiceTitle`, `hook`, `hookTypes`, `choiceDescription`, `operations`, `basementDescription` and `evidence` stay. **`northStar` is kept but reduced to the prefix** ("North star" / "Ориентир") and composed in the view as `{northStar} · {actV2.ui.rpg.masterStat.label}`, so the retained "Master stat" term has one source (G01/G05); it renders "NORTH STAR · MASTER STAT" as required. `flexibility-view` was decoupled from `MAP_PILLARS` (it now iterates `FLEX_PILLARS` and reads `pillars.*.processes`) so the map restructure did not disturb the Phase 7.3 surface.

Validation: `pnpm check` green on Node 22.12.0 (147 unit tests). `vault.test.ts` was rewritten for the new band names and now asserts the 31 unique `from` fragments (19 pillar cards + 5 reflection prompts + 4 foundations + 3 choice) all resolve, plus the Phase 4.1 corrections; `vault-view.test.tsx` asserts the five axis anchors render on app-checks and nowhere else. Live desktop checks: all 39 map links dumped and confirmed, the north-star heading, the reflection→axis scroll, and every loop anchor including `#review`. Node 24 (8.5) and the 375px pass remain outstanding.

---

## Phase 5 — Episodes: experience before interpretation *(A09, A10, A18, A19, spec §4, Stage 3)*

- [x] **5.1 Brief note mode.** Date/time, "What was happening?", "What did I notice?", "What did I do?". Saves with any one filled. The current dialog is 690 lines and promises "under a minute" while asking for a direction, a state, a skill, a value and five ratings (A18) — brief mode is the default, expanded is opt-in via "Explore this episode".
- [x] **5.1a New route `/episodes/{id}/explore`** (design handoff, artboard `1g`) — a page, not a second dialog, so the expanded reflection is deep-linkable and survives a reload. It does not exist today; `src/app/(protected)/episodes/` holds only `page.tsx`. **Entry rule:** "Explore this episode" persists the brief note and then routes, so it is subject to the same save gate — **disabled until at least one of the three fields has content**, exactly like Save. Without that gate, Explore on an empty form either creates an empty record or has no defined behaviour; the design handoff specifies persist-then-route but not the gate, and T01 forbids the empty record. "Return to brief note" navigates back without clearing anything typed on the expanded page.
- [x] **5.2 Expanded reflection**, in this order: situation → private experiences → actual behaviour → intended function → immediate outcome → later consequences → value/direction → current interpretation → next experiment. Consequences marked **observed / expected / unknown** — a prediction is never displayed as something that happened.
- [x] **5.3 Direction control:** four options, default `unknown`. Currently a hand-rolled chip pair; with one selectable value it needs single-choice semantics (radiogroup), not a checkbox metaphor (handoff §ICU/a11y).
- [x] **5.4 Behaviour status:** acted / planned / not-described, explicit. Rest, talking, stopping work, seeking support and described deliberate mental activity all qualify as actions; an involuntary feeling does not.
- [x] **5.5 Multi-select** states and skills as optional hypotheses, using the sentinels named in Phase 1.1. Distinguish "I don't know" from "I noticed none of these" — and both from the legacy `none`, which is never offered as a choice. **Choosing a skill must not set direction**, and nothing else in the form may tint to the direction pick — no skill chip, no pattern chip, no value. Add bodily sensation and other/several to experience types (A10); the design handoff draws all six. Skill chips carry the Phase 0.5 labels — sixth reads "A Workable Next Step", and there is no perspective-taking chip.
- [x] **5.6 `workable` becomes "Earlier reflection"** — displayed, preserved, never auto-split into the new consequence fields.
- [x] **5.7 Editing** (A19, T17): add later consequences and revise direction on an existing episode. `createdAt` preserved, `updatedAt` bumped, **no new action created**, `value_snapshot` untouched unless the user explicitly relinks (T16). Needs `updateEpisode` in `src/lib/db/episodes.ts` + an action; the repository currently only creates and lists.
- [x] **5.8 Save behaviour** (handoff): keep the user's draft in the form when a save fails — the error copy promises the text is preserved — and never show the success message before persistence succeeds.

**Exit criterion (Stage 3):** a user can examine a behaviour's function and revise their interpretation.

Implementation completed 2026-09-10. Much of the classification layer (four-way direction radiogroup, behaviour status, sentinel-guarded multi-selects, the consequence columns) already existed from Phase 1's integration; Phase 5 restructured the capture surface around it and added the editing path.

**Brief vs. expanded.** `new-episode-dialog.tsx` is now a genuine brief note — date/time + the three questions ("What was happening?", "What did I notice?", "What did I do?") + the six experience-type chips — and nothing else; direction, patterns, skills, value, checks and the reflection spine all moved to the expanded page. It carries two actions: **Save entry** (creates and closes) and **Explore this episode** (creates, then routes to the new page). Both share the T01 gate (≥1 of situation / experience / action), so Explore can never mint an empty record. The legacy-clarification path stays in this dialog unchanged.

**The expanded page.** New route `src/app/(protected)/episodes/[id]/explore/page.tsx` (server) + `explore-episode-form.tsx` (client). It is deep-linkable and survives a reload — verified live by navigating straight to `/episodes/{id}/explore` and finding the saved values re-rendered. Fields follow the 5.2 spine, with later consequences paired to an observed / expected / unknown control so a prediction is never shown as something that happened. The page serves both "explore a just-created note" and "revise an existing entry", so 5.1a and 5.7 share one surface. Legacy (schema_version 1) rows have no explore page — the route `notFound()`s them and `updateEpisode` refuses them, so history is only ever changed through clarification.

**Editing.** `updateEpisode` (+ `getEpisode`) in `src/lib/db/episodes.ts` and `updateEpisodeAction`: `created_at` is preserved, only `updated_at` bumps, no new row is created, and the value snapshot is re-resolved **only** when `valueId` actually changes (T16). `EpisodeDetails` now renders the expanded fields when present (intended function, immediate/later outcomes with the consequence-status pill, interpretation, next experiment) and shows a "Revisit entry" link for v2 rows. Verified end to end: creating a note via Explore, setting direction → Toward, later consequences + "I observed this" and an interpretation, saving, and seeing the entry updated **in place** (no duplicate) on the list.

**Experience types (A10, schema).** `migrations/0006_experience_types.sql` converts `hook_type` from a Postgres enum to `text` + CHECK across the six values (adds `sensation`, `other`), following 0005's enum→text decision so no `ALTER TYPE` dance is needed. `HOOK_TYPES` now reads its labels from `actV2.ui.experienceTypes`; the dead `act.hookTypes` subtree was deleted from both catalogs and its three readers (dialog/explore, episodes filter, progress tally) switched to `experienceTypes`.

**Decisions.** *Value suggestion stays on create.* The morning-value suggestion still seeds `valueId` on a brief note (existing behaviour) rather than being deferred to the explore page, so a linked value is available immediately; the picker on the explore page can change or clear it. *Save = navigate.* On the explore page a successful save routes to `/episodes#episode-{id}` (a clear success signal that only fires after the write resolves, per 5.8); a failed save keeps the draft in the form and shows the error. "Return to brief note" is a plain link back to the list — the brief content is already persisted, so nothing typed there is lost.

Validation: `pnpm check` green on Node 22.12.0 (149 unit tests, including new `updateEpisodeAction` gate/pass-through assertions and the six-value `hookTypeTallies`). `pnpm test:db` on a disposable PostgreSQL 16: 4 migration/isolation checks (0006 applies cleanly on 0001–0005) and 9 repository tests. Desktop browser checks: the brief dialog showing exactly the three questions + six experience types + both buttons, the persist-then-route Explore flow, the full expanded page in 5.2 order, an in-place edit round trip, and a direct reload of the explore URL. The dev database has **not** been migrated to 0006 for production; back it up before applying. A dedicated `updateEpisode` repository test (createdAt/snapshot invariants) and Node 24 remain outstanding; the 375px pass stays deferred.

---

## Phase 6 — Time and periods *(A15, A03, spec §6.2, Stage 3)*

- [x] **6.1 Real user timezone.** `src/lib/act/date.ts` drops the `DEFAULT_TIMEZONE = "UTC"` stub; the zone comes from `user_settings.settings.timezone` (slot already exists, nothing writes it) with a settings control. `todayId` and the suggested band both use it.
- [x] **6.2 Freeze event provenance.** Store local day, band and `event_timezone` at write time. Changing the current timezone later must not move historical records (T18: 23:30 and 00:30 in Asia/Almaty).
- [x] **6.3 One explicit period filter** driving *every* Observations block (T14) — the current "Untouched this month" reads all episodes while the page shows none of that month (A13). **The Boss test grid is one of those blocks**: it shares the same period as the split, the by-band counts, Status effects and the skills tally, with no separate range of its own (G04). An empty period renders `actV2.ui.rpg.bossTest.empty`, never a failure state; unclarified legacy entries stay visible and stay out of the completed-action count.
- [x] **6.4 Locale-aware date formatting** via next-intl, formatted in the event timezone *before* substitution into range copy. No concatenated English plural suffixes; RU needs one/few/many/other.

Implementation completed 2026-09-10.

**Timezone (6.1/6.2).** `date.ts` keeps `DEFAULT_TIMEZONE = "UTC"` only as the fallback and gains `zonedDayId`, `zonedBand`, `bandForNow`, `isTimeZone`, `normalizeTimeZone`; `todayId(tz)` is now `zonedDayId(new Date(), tz)`. `resolveTimeZone()` (new `src/lib/act/timezone.ts`) reads `user_settings.settings.timezone` exactly as `resolveLocale` reads the locale, and the protected layout resolves it once, passing `today = todayId(tz)` and `suggestedBand = bandForNow(tz)` into the dialog. `setTimezoneAction` + a `TimezoneSwitcher` in the sidebar (beside the language control) persist the choice. `createEpisode` freezes the zone in force onto `event_timezone` (UTC when unset); `updateEpisode` never touches it, so re-pointing the setting later cannot move a stored row (T18). Verified live: setting Asia/Almaty persisted across a reload and the record range recomputed against it, then restored to UTC.

**Period filter (6.3).** A three-way `PeriodFilter` (All time / Last 30 days / Last 90 days) writes `?period=`; `progress/page.tsx` resolves the window relative to `todayId(tz)`, filters with `inPeriod`, and hands the scoped set to `ProgressView`, so the split, by-time counts, radar, Status effects, skills tally **and the Boss test grid** all read the one window — the Boss test header shows the same range, with no range of its own (G04, verified: `?period=30` moved both the "Selected period" line and the Boss test header to `Wed 12 Aug–Thu 10 Sep`). An empty window still renders `rpg.bossTest.empty`; legacy rows stay visible and out of the completed count.

**Formatting (6.4).** Already locale-correct — `formatDayLabel(id, locale)` formats the stored local-day id (no shift), and the plural strings (`records`, `sampleSize`, `daysRecorded`, …) use ICU `plural` with RU one/few/many/other. New copy (`timezone.*`, `observations.periods.*`) was added in both catalogs the same way.

**Decisions.** *UTC is always offered.* Some runtimes' `Intl.supportedValuesOf("timeZone")` omit UTC entirely (this dev browser lists 418 zones, none UTC-like), which would strand a UTC user — so the switcher always prepends `UTC` and its list is built after mount to avoid a Node-vs-browser hydration desync. *The schema day/band UTC defaults stay* as a last-resort fallback; the UI always sends the zone-correct day/band, and the zone itself is frozen server-side, so provenance does not depend on the client.

Validation: `pnpm check` green on Node 22.12.0 (151 unit tests, incl. new T18 `zonedDayId`/`zonedBand`/`normalizeTimeZone` cases). `pnpm test:db`: 4 node migration/isolation checks and 10 repository tests, including a new `updateEpisode` case asserting `created_at`, the frozen `event_timezone` and an unchanged snapshot survive an edit while a relink clears it and legacy rows are refused. Desktop browser: the period filter reshaping every block including the Boss test, and the timezone control persisting and restoring. `0006` is applied to the shared dev database (by `pnpm test:db`); Node 24 and the 375px pass remain outstanding.

---

## Phase 7 — Today, Loop, Flexibility *(spec §5, §8)*

- [x] **7.1 Today** (`today-view.tsx`, 570 lines): morning becomes "What matters to me today? / Where might I need to bring attention back? / How can I support myself if things are difficult? / One possible step" — all optional, linked value is a suggestion. Evening drops the presumption that an Away Move occurred and that discomfort was present. Morning and evening stay independent (the audit lists this under "what works well").
- [x] **7.2 Loop** (`loop-view.tsx`, `LOOP_REF`): five steps become six — notice → make room → orient → consider options → act → **review what happened**. Any entry point, stoppable, no timer, no "correct ACT" checklist.
- [x] **7.3 Flexibility** (`flexibility-view.tsx`, `FLEX_PILLARS`/`FLEX_MYTHS`/`FLEX_GROWTH`): recompose from the new foundation/process cards. Remove discomfort-only framing and the mandatory-journaling claim. Keep its question explanations consistent with the canonical app-checks card that Phase 4.3 links to, and keep the `reference.flexibility.eyebrow` "Master stat · reference" heading (see Phase 4.5) — recomposing the page must not drop it.
- [x] **7.4 Values** (`values-view.tsx`): the audit's strongest section — **preserve editing, snapshots and archiving as they are**. Only definitions and help text change (`actV2.ui.values` + the values cards): freely chosen values vs. rigid social demands, value conflicts, domain vs. quality of action ("work" is a domain; "attentively" is a value). Never auto-correct the user's wording toward clinical language.
- [x] **7.5 Practices** are brief, stoppable and adaptable — eyes open, external attention point, alternative support. Exercise choices, not profile settings. Never promise a feeling will pass in a fixed interval (T20: an exercise that leaves emotion unchanged but helps valued action is not a failure).

Implementation completed 2026-09-10.

**Today (7.1).** The morning and evening cards now read their prompts from `actV2.ui.today`: the four morning questions (values / attention / support / step) mapped onto the existing `open/aware/engaged/toward` columns, and the four evening questions onto `hook/away/flex/next`. The storage schema is untouched — this is a prompt reframe, not a data change. The evening's `away` field is no longer "What Away Move did I make?" (the A05 presumption Phase 2 flagged for here) but "What did I do, and what followed?", and the morning no longer opens with discomfort. The mono RPG field keys (OPEN/AWARE/…) and their discomfort-framed hints/placeholders were dropped; the value picker stays a suggestion and morning/evening stay independent. 33 orphaned `today.*` leaves were removed from both catalogs.

**Loop (7.2).** `loop-view.tsx` was rewritten to render the six `MAP_LOOP` steps (notice / open / orient / choose / act / review) from `actV2.ui.loop`, with `id` anchors matching the System Map's loop links (`#notice`…`#review`). Its intro is `actV2.ui.loop.intro`, which states outright that the six are **not a required sequence** and any of them is an entry point — replacing the old "five operations … until the sequence is yours" copy. `LOOP_REF`, the `act.loop` subtree and the stale `reference.loop.{intro,trap,closing,closingLabel}` were deleted.

**Flexibility (7.3).** The discomfort-only framing and the mandatory-journaling claim were already removed in Phase 2 (`pillars.Engaged.body` decouples discomfort; `growth.3` makes the log "one route … others" and optional), and the `Master stat · reference` eyebrow is intact. This phase made the "consistent with the canonical app-checks card" requirement concrete: each of the five check rows is now a link to `/reference/vault?card=app-checks#<axis>` — the same per-axis anchors the map's reflection prompts use — so the page and the card cannot drift.

**Values (7.4).** CRUD, snapshots and archiving are untouched. The intro now reads from `actV2.ui.values.intro` ("qualities you choose to express through action … nothing is ranked"); the deeper definitions (domain vs. quality, value conflicts, freely-chosen vs. rigid demands) already live in the Phase 3 `orient-to-values` card the page links to. Fixed an A20 EN/RU split: the English empty-state link still said "Vault card" while RU already said "Library" — both now say Library.

**Practices (7.5).** There is no timer anywhere to promise relief on a schedule; the positive guarantee was missing from view, so every practice-type Library card now surfaces `practice.noReliefRequired` + `practice.notFit` — a feeling need not disappear for a practice to be useful, and it is brief, stoppable and adaptable (T20). `practice.record` (capture) and `practice.notFit` (Loop footer) were already placed.

Validation: `pnpm check` green on Node 22.12.0 (151 unit tests); `pnpm build` succeeds. Desktop browser in EN with a clean console across Today, The loop (6 anchored steps), Flexibility (eyebrow kept, 5 axis→app-checks links), Values (reframed intro, no "Vault"), and a practice card (guarantee present). A grep confirmed no source still references a deleted key. Node 24 and the 375px pass remain outstanding; RU was covered by the catalog-parity test rather than a full browser walk.

---

## Phase 8 — Verification and review *(Stage 4)*

- [x] **8.1 Unit** (`vitest`): missing-data calculations, legacy compatibility, ID routing and alias resolution.
- [x] **8.2 DB** (`pnpm test:db`): `0005` applies cleanly on `0001`–`0004`; existing rows land on `not-described` / `schema_version = 1`; RLS still isolates (`tests/db/isolation.test.mjs` pattern).
- [x] **8.3 Browser:** persistence, editing, form states, navigation, back/reload/conflicting-param cases (T12).
- [x] **8.4 T01–T20 and G01–G05** walked end to end in **both locales**. **T19 runs partially: EN/RU parity, keyboard navigation, visible focus and no-disappearing-fields are in scope at desktop width; the 375px half is deferred** (see "Deferred: narrow-screen pass"). A20's mixed EN-in-RU terminology is fixed here; its small-secondary-text half goes with the deferred pass.
  - **RU strings in the longest labels are still in scope** — they are a desktop problem too. The six library tabs, the four direction rows and the six-item Boss test legend are the handoff's named pressure points, and its rule holds regardless of viewport: no layout may depend on a short string. Check «Главная характеристика», «Статус-эффекты» and «Босс-тест» in place.
  - **The one FLAG:** no `actV2` key exists for a heading over the two pattern-absence chips — verified against both catalogs. The design draws them unlabelled, which is the cheaper resolution; adding a label means a paired EN/RU content addition, so decide before Phase 5.5 rather than during it.
- [x] **8.5 Node version:** the audit ran on 22.12.0 against a declared `24.x` (`package.json` engines) — pin CI/local to 24 so the verification environment matches.
- [ ] **8.6 Comprehension testing** (spec §11): ask users to explain values vs. goals, acceptance vs. tolerating harm, Toward vs. relief. Clarity, not effectiveness.
- [ ] **8.7 ACT specialist review.** The manifest ships `status: editorial-draft-awaiting-ACT-review` and `reviewedAt: null`. **These stay null until a real review happens** — a generation date is not a review date. This remains outstanding after all code lands, and should be stated as such rather than closed silently.

---

Software verification completed 2026-09-11. See [Phase 8 verification and human-review handoff](./act-v2-phase-8-verification.md) for the scenario-by-scenario evidence and its limits. `pnpm check` passes on Node 24.15.0 (169 tests); `pnpm build` passes; `pnpm test:db` passes 4 migration/RLS and 10 repository tests on a disposable PostgreSQL 16 database. Both locales were exercised at 1280×720, including all 31 current map-to-Library links, capture/edit/reload, legacy URLs and conflicting parameters, sample thresholds, empty periods, value snapshots, and keyboard navigation. Deterministic unit/DB tests cover exact timezone boundaries and persistence invariants; these are not claimed as manual clock changes.

Fixed during the pass: remaining English pillar/process and direction labels in RU, the obsolete five-step map heading, the Journal's presumptive Away heading, the expanded picker’s Status effects framing, and sidebar settings overflow (controls now wrap). The two pattern-absence chips stay without a separate heading. `.node-version` now pins 24.15.0, used by CI; README explains how to check the Node version actually selected by pnpm.

**Phase 8 is software-complete, not human-review-complete.** 8.6 is pending real participant responses and 8.7 is pending a real ACT specialist; the linked handoff contains prompts and recording requirements for both. Review metadata is unchanged. **T19 remains partial: 375px and the small-secondary-text pass are deferred and have not passed verification.**

---

## Deferred: narrow-screen pass

**375px is out of scope for this implementation.** Consistent with the audit's own priorities — A20 is P2, and spec §10 puts mobile verification in Stage 4 — and with the design handoff, which lists 375px under "Still open / next pass" for all three surfaces.

What this means concretely:

- **T19 is only half-satisfied.** Keyboard, focus, EN/RU and field integrity are verified at desktop width; narrow-screen behaviour is not verified and must not be reported as passing. Say so when reporting Phase 8.
- **The app must still not break.** The existing layout convention is wrap-based with no media queries — every multi-column block is `flex flex-wrap` with `basis-*` children, and phone collapses to one column with no phone-specific layout. New surfaces follow that convention so they degrade rather than overflow, even unverified.
- **Two things to avoid now, because they are what makes the later pass expensive.** The Library's seven-layer ladder uses a fixed 118px mono label column — give it a wrap fallback rather than hard-coding a two-column grid, or the stacked variant becomes a rewrite. Same for the four direction rows: the handoff already specifies `flex: 1 1 auto; min-width: 0` on the middle text span, which is what lets them stack later; keep it.
- **Nothing else is traded away.** The Boss test grid already wraps by date at 26px cells, and the expanded reflection page already collapses to one column at 1240px — both work narrow without a dedicated pass.

The deferred work is: stacked variants for the direction rows and the seven-layer ladder, the small-secondary-text half of A20, and a 375px walk of all three surfaces. Schedule it before public release, not before the next merge.

## Out of scope

Named explicitly so they are not quietly attempted: a validated flexibility instrument (CompACT is a *separate* researched family — these five app questions are not it and must not inherit its name, scoring or validation claims); disorder-specific protocols; unsupervised trauma exposure; an RFT course; automated clinical interpretation; any claim of therapeutic effectiveness. Passing 102 software tests establishes none of these.

## Risk notes

- **The catalog merge is the largest single diff** (459 leaves × 2) and the easiest place to break the parity test. Land Phase 0 alone, green, before anything else.
- **Phase 1's schema change is one-way** (enum → text). Take a dump first; it is a small database but the data is personal and irreplaceable.
- **Phases 1 and 2 must ship together.** Correct the computations and misleading claims such as "riskiest window" together. Master stat, Status effects, and Boss test are retained labels, not claims to remove.
- **`constants.ts` is the shared seam** between the parallel tracks (Phases 3–4 and 5–6). Split it early — reference registry out to `src/lib/reference/library.ts`, episode enums staying put — or the two tracks will conflict on every commit.
