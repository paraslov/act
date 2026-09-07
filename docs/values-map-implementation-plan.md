# Implementation Plan: Personal Values Map

Derived from [`values-map-feature-spec.md`](./values-map-feature-spec.md), the **design handoff** in [`design/design_handoff_personal_values_map/`](./design/design_handoff_personal_values_map/) ([`README.md`](./design/design_handoff_personal_values_map/README.md) + 8 `.dc.html` artboard files), and the current working tree (branch `main`, on top of commit `579073e`). Every path below was verified against the code that exists today.

## Design source

The handoff is **high-fidelity**: colours, type, spacing, radii, copy, and interaction states are final and to be reproduced faithfully — but expressed through the app's existing tokens (`src/app/globals.css` wins over any literal in the handoff). Start from [`design/Personal Values Map.dc.html`](./design/design_handoff_personal_values_map/design/Personal%20Values%20Map.dc.html) — the artboard sheet with all 28 boards (every surface, phone + desktop, light + dark, artboard ids `1a`…`6c`); the other `.dc.html` files are the individual interactive components. `support.js` is prototype runtime, **not** a deliverable — recreate the designs with the app's own patterns, do not copy `.dc.html`/`support.js`.

All UI copy in the phases below is quoted from the handoff and is **final** (English); the Russian side is authored during Phase 8. Each phase names the artboard(s) it implements.

### Reconciliations (handoff assumptions vs. this codebase)

The handoff was written slightly ahead of the tree; three assumptions must be adjusted, none blocking:

- **Missing primitives.** The handoff suggests shadcn `Command` (cmdk), `Badge`, `Textarea`, and `Checkbox`. **None exist** in [`src/components/ui/`](../src/components/ui) (present: button, card, dialog, input, label, popover, select, tabs, tooltip) and cmdk is not a dependency. Rather than pull in cmdk, **hand-roll the picker's filter + roving focus on the existing `Popover` + plain `<input>`/`<button>` rows** — this matches how the app already hand-rolls chips (hook-type, direction, flexibility) and keeps the visual/keyboard spec. Editor domain chips, example textareas, and value chips are likewise plain elements (as the rest of the app does), not new primitives. Keep the handoff's `aria` roles.
- **Nav file name.** The handoff says `src/components/navigation.tsx`; the real nav is [`src/components/app-sidebar.tsx`](../src/components/app-sidebar.tsx) (`dailyItems`). "Values" goes **third in the Daily group — after Today and Journal, before Episodes** (handoff), and carries **no badge/count**.
- **Snapshot vs. live record.** The handoff's data model stores only `valueId` (nullable FK) and reads value details live. The **spec (§5) overrides this**: editing/archiving a value must not rewrite history, so historical surfaces render from a stored **snapshot**. This plan keeps **both** `valueId` (the design's live link, for suggestions/"also shown in…") **and** `valueSnapshot` (title/meaning/domains frozen at attach time) on morning + episode. The design's read-only Evening block, Journal notes, and Episodes chip render from the snapshot — which also makes an archived value's historical references display correctly with no special-casing. Where the handoff omits a FK objection, follow the spec: no DB-level FK on `episodes.value_id`; validate ownership + active status in-app at attach time.

### Design invariants (hold across every phase)

The handoff encodes these as product rules, not decoration — preserve them in code:
- **Values are never scored.** No streaks, "counts as progress", penalties, or completion states on any values surface; counts appear only as plain labels ("2 values"). Nothing derived from values feeds Progress.
- **Values are achromatic.** The toward-green / away-amber pair is reserved for episode *direction*. A value never takes a direction colour, and may attach to an **away** episode.
- **Domains are neutral, fixed-order, never "completed".** An empty domain is not a gap.
- **Everything is optional.** No onboarding, no required domain (except inside the editor form), no nagging. Values never block saving a morning, episode, or evening entry.
- **Time budgets stay intact:** morning ~2 min, evening ~5 min, new episode < 1 min; the closed picker is a single row.
- **Layout is wrap-based, no media queries.** Every multi-column block is `flex flex-wrap` with `basis-*` children (domains `330px`, form columns `240–290px`, table cells `150–200px`); phone collapses to one column with no phone-specific layout.

## Progress checklist

Updated 2026-09-07. A step is checked when it is implemented **and** green under `pnpm lint`, `pnpm typecheck` and `pnpm test` — plus `pnpm db:migrate` and `pnpm test:db` where it touches the database.

- [x] **Phase 0 — Architecture facts** *(verification only, no code deliverable)*
  - [x] Migration mechanics, RLS/grant pattern, `withCurrentUserDb`, the `morning` `||` merge, en/ru parity test, `matchesFilters` scanning `episode.value`, draft-state locations and the existing `Popover` — all confirmed against the tree
  - [x] Two corrections folded back in: `hasMorning` delegates to a `hasText(value)` helper (not an inline `v?.trim()`), and extending `DayMorning` breaks its **typecheck**, not just runtime — so the Phase 6 helper fix must land with Phase 1.2

- [x] **Phase 1 — Data model & persistence**
  - [x] 1.1 `migrations/0004_personal_values.sql` — `personal_values` (checks + `personal_values_user_idx`), RLS enable/force + `personal_values_by_user_id` policy + guarded `act_app` grants, and `episodes.value_id` / `episodes.value_snapshot`. Applies cleanly on top of `0001`–`0003`; existing episode rows keep `value_id NULL`.
  - [x] 1.2 Types — `PersonalValue`, `PersonalValueSnapshot`; `valueId`/`valueSnapshot` on `Episode` and `DayMorning`. **Deviation:** `DomainId` is declared in `constants.ts` beside `DOMAINS`, not in `types.ts`, matching where `AxisKey`/`HookType`/`SkillId`/`StateId` already live.
  - [x] 1.3 Constants — `DOMAINS` (fixed order) + `domainLabel()`. Required `act.domains.*` in both catalogs to compile (see Phase 8).
  - [x] 1.4 Repository `src/lib/db/personal-values.ts` — list/get/create/update/`setPersonalValueArchived`, `resolveOwnedActiveSnapshot`, `UnavailableValueError`
  - [x] 1.5 `upsertDayEntry` gains `morningSelection`; episode `value_id`/`value_snapshot` threaded through `episodeColumns`, `CreateEpisodeInput`, the INSERT and `mapEpisode`

- [x] **Phase 2 — Server actions**
  - [x] 2.1 `src/actions/personal-values.ts` — zod field schema + `createValueAction` / `updateValueAction` / `archiveValueAction` / `restoreValueAction`, each revalidating `/values` **and** `/` (the morning picker reads the same list). **Deviation:** no `DOMAIN_IDS` tuple — `z.enum(DOMAINS.map((d) => d.id))` matches how `episodes.ts` already builds `HOOK_TYPES`/`SKILLS`/`STATES` enums, so the extra constant would be noise. Domains are deduped after `.min(1)`; empty example rows are dropped, not rejected; update/archive/restore throw when the repo returns `null` (missing or not the caller's), so Phase 3's optimistic archive can roll back.
  - [x] 2.2 `saveMorningAction` — `valueId: z.uuid().nullable().optional()` sits **beside** `morning` (never inside it) and is translated by a `morningSelectionFor` helper: `undefined` → omit, `null` → `{clear:true}`, id → `{valueId}`.
  - [x] 2.3 `createEpisodeAction` — `valueId` added to `createEpisodeSchema`, passed straight through by the existing `createEpisode(parse(input))` call. **Deviation:** `.nullable().optional()` rather than plain `.optional()`, so Phase 5's `FormState["valueId"]: string | null` can be sent as-is instead of being mapped to `undefined`.

- [x] **Phase 3 — My Values screen**
  - [x] Route `src/app/(protected)/values/page.tsx` — one `listPersonalValues({ includeArchived: true })` call; the Active/Archived switch is UI state on the same screen, so a second fetch buys nothing.
  - [x] `values-view.tsx` — header/intro, Active–Archived switch, four `basis-[330px]` domain sections, value card (serif title, Edit/Archive, emphasised/quiet domain tags, meaning, examples, "Also shown in …"), footer note, empty state (`1d`) and archived view (`1g`, `opacity-[0.78]`, Restore, no delete). Archive/restore is optimistic through **`useOptimistic`** — React drops the patch when the transition ends, which *is* the rollback — plus an inline `archiveError` line.
  - [x] Editor dialog (`1e`/`1f`) in its own file `value-editor-dialog.tsx`; the form is keyed per open so every open starts from the record. **Deviation:** the four domain chips are native `<input type="checkbox">` inside styled `<label>`s rather than `role="checkbox"` buttons — same chip visual, real checkbox semantics, and no ARIA hand-rolling. Inline field errors, empty example rows dropped on save, quiet "Archive this value" when editing.
  - [x] `value-picker.tsx` — the one reusable compact picker (hand-rolled on `Popover` + `PopoverAnchor`, no cmdk): closed-empty dashed row with `⌘K`, closed-selected box with Change/clear/suggested line/meaning toggle, open popover with filter input, domain-filter chips, scrollable rows, `↑↓` wrapping roving focus, `→` expand, footer "No value". Built here, **mounted in Phases 4–5**. **Deviation:** rows carry `aria-pressed` on real buttons instead of `role="option"`/`aria-selected` — each row also holds a sibling `▾` expand button, which would make an ARIA listbox structurally invalid, and `aria-pressed` is what the app's existing chips already use.
  - [x] 3.1 Sidebar — `/values` third in `dailyItems` (after Today and Journal), `"values"` added to the `NavItem["label"]` union, `nav.values` in both catalogs, no badge.
  - [x] i18n for this screen landed with it (see Phase 8): `nav.values` + the whole `values.*` block in `en.json` and `ru.json`. Components here are `useTranslations`-driven like the rest of the app, so hard-coding English and moving it later was not an option.
  - [x] Verified in the running app (dev server, signed-in session, light + dark, desktop + 375px): empty state → editor with a pre-checked domain → inline validation → create → one record rendered in two sections with the emphasised/quiet tags and "Also shown in …" → edit (populated, "Archive this value") → archive (optimistic, count drops, `Archived · 1`) → archived row with Restore → restore. Russian locale renders throughout, including the `count` plural forms. Two fixes came out of it: the archived date printed US-order ("Sep 7") and now builds day-then-month like `formatDayLabel` ("7 Sep"); the checked domain chip gained the border emphasis the handoff specifies. The Russian "Also shown in" line became "Также показана в: {domains}" — the earlier wording read as a plural even for one area.
  - The picker could not be exercised in the app: it has no mount point until Phases 4–5.

- [x] **Phase 4 — Today integration**
  - [x] `TodayView` holds a `savedMorning` state seeded from the server prop; `MorningCard` hands the saved `DayMorning` up through `onSaved` so Evening updates without a reload. **Deviation:** the whole saved morning is lifted rather than "value + `toward`" — the evening must echo what was *saved*, not the live draft, so one state covers the snapshot, the planned action and the no-entry test with less wiring. The morning draft itself stays local to `MorningCard`.
  - [x] MorningCard — the ENGAGED block is a `flex flex-wrap` row (`border-t pt-4`) with the textarea at `basis-[290px]` (`rows={3}`) and a `basis-[250px]` column holding `<ValuePicker>` + the with/without note. `valueId` is React state **beside** `form`, never inside it, and goes to `saveMorningAction` as its own field. The existing `toward` `Input` is reused: label and placeholder switch when a value is picked, the mono `TOWARD` eyebrow stays. `MorningField` gained `className`/`rows` props for this.
  - [x] EveningCard — `MorningRecall` renders the read-only "FROM THIS MORNING / READ-ONLY" block from the stored **snapshot** (serif title, domain chips, then the `PLANNED ACTION` row when a `toward` exists); `flexValueHelp` is passed to the existing flexibility field only when a snapshot is present (`EveningField` gained an optional `help`); the dashed permission line shows when the morning holds nothing at all. No new evening field.
  - [x] The today page fetches `listPersonalValues()` (active only) alongside the day entry and episodes, and passes `values` to `TodayView`.
  - [x] Shared helper — `hasMorningEntry(morning)` moved into [`derive.ts`](../src/lib/act/derive.ts) and `journal-view.tsx`'s `hasMorning` now delegates to it, so "does this morning hold anything" is one rule rather than two.
  - [x] i18n for this phase landed with it (see Phase 8): `today.morning.value*` / `towardValue*`, `today.evening.morning*` / `flexValueHelp` / `noMorning` in both catalogs. **Deviation:** `today.morning.footer` was *replaced* with the handoff's final "Every field is optional — including the value." rather than gaining a second sentence beside Save.
  - [x] Verified in the running app (dev server, signed-in session, desktop + 420px, en + ru): empty picker with the "skip it" note → open popover → pick a value → note, TOWARD label and placeholder all switch → save → Evening gains the read-only block, the domain chips and the flexibility helper **without a reload** → type a planned action, save → `PLANNED ACTION` row appears → clear + save → block, helper and switched label all revert while the rest of the morning is untouched. Russian renders throughout. Test data was cleared afterwards.

- [x] **Phase 5 — New episode dialog**
  - [x] `valueId: string | null` in `FormState`; the existing free-text field keeps its place in a `flex flex-wrap` row (`border-t pt-3.5`) at `basis-[240px]` with the "own words" helper, `<ValuePicker>` beside it at `basis-[250px]`, and the direction-aware note box under the row. `valueId` goes to `createEpisodeAction` as its own field.
  - [x] Suggestion — the layout passes the provider the active `values` plus a `day → valueId` map from the new `listMorningValueSelections()` projection, so any day the user backdates to resolves against **its own** morning. **Deviation:** the plan floated "a light server call"; a projection query in the layout that already fetches episode activity is cheaper and re-evaluates instantly on `day` change with no round trip. Applied on open, on every `day` change, and after a save — but only while `valuePicked` is false, so a manual pick or clear is never overwritten. `suggested` is derived (`!valuePicked && valueId !== null`), not stored. An id whose value is archived or gone is not suggested.
  - [x] **Open item resolved — own words *and* linked value, not either/or.** The handoff's own copy ("The free-text field stays yours for wording that only fits today") and artboard `4b` show both at once, so 1.5's precedence was inverted rather than surfaced in the UI: `createEpisode` now keeps whatever was typed in the `value` column and only falls back to the snapshot title when nothing was. `matchesFilters` gained `valueSnapshot?.title` as a haystack so a linked value stays searchable when the column holds the user's own wording.
  - [x] Dialog width — `max-w-[600px]` had never applied above `sm` (the base `DialogContent` class ends in `sm:max-w-lg`, and a variant beats an unprefixed utility), so the modal rendered at 512px and the 240/250 row could not sit 2-up. Changed to `sm:max-w-[600px]`, which is the width the class already declared and the handoff specifies. This widens the existing dialog on desktop — the one visible change to a control Phase 5 was otherwise leaving alone.
  - [x] `valueId` and `dir` stay independent: the note box is the only direction-aware part, and the linked value takes no direction colour.
  - [x] i18n for this phase landed with it (see Phase 8): `episodeModal.valueHelp` / `valuePickerLabel` / `valueNoteToward` / `valueNoteAway` in both catalogs. The existing `valueLabel` copy was left alone — the handoff only adds to this field.
  - [x] Verified in the running app (dev server, signed-in session, en + ru): morning value saved → dialog opens with it pre-filled and "Suggested from your morning · changeable" → picking **Away** swaps the note to the away copy and leaves the link in place → backdating to a day with no morning value clears the suggestion (today's is never inherited) → clearing by hand survives a date round-trip → saving with both typed text and a linked value stored `value` = the typed words, `value_id` + snapshot = the linked value, on an away episode → episode search matches on the snapshot title as well as the typed words. Measured the row at 261 + 271 in a 546px dialog (2-up as designed). The test episode row was deleted afterwards and the morning value cleared.

- [x] **Phase 6 — Journal & Episodes historical display**
  - [x] `hasText`/`hasMorning` accept structured morning data and count a present `valueId`/`valueSnapshot` as a morning entry — landed with 1.2, which broke its typecheck; Phase 4 moved the rule to `hasMorningEntry` in `derive.ts` and left `hasMorning` delegating to it
  - [x] Morning `NotesCard` renders the stored snapshot. **Deviation:** it is a block *above* the four text rows (mono `VALUE` label, serif title, neutral domain chips) behind a new optional `value?: PersonalValueSnapshot | null` prop — not a fifth `rows` entry, because a value is not free text and carries its domains. The prop is only passed to the morning card, so the evening card is untouched. Meaning/examples stay out: the journal card is a day summary, not the value record.
  - [x] Episodes view — the snapshot chip sits at the end of the existing chip row, beside the free-text `value` chip: achromatic (`border bg-card`), prefixed with a mono `VALUE` micro-label so the two chips read apart, and taking no direction colour on an away episode.
  - [x] **Both chips, and neither twice.** Phase 5 keeps the typed words *and* the link, so the card renders both — but `createEpisodeSchema` still transforms an empty free-text field to `"—"` before the repository's own-words precedence runs, so a linked-only episode stores `value = "—"`. The card therefore drops the free-text chip when a snapshot is present and the text adds nothing beside it (the `"—"` placeholder, or the same title again). With no snapshot the `"—"` chip renders exactly as before — existing episodes are unchanged.
  - [x] i18n for this phase landed with it (see Phase 8): `journal.morning.value` and `episodes.card.linkedValue` in both catalogs.
  - [x] Out of scope, deliberately: the journal's per-day episode rows and its selected-episode card keep their existing chip set — the plan names the morning `NotesCard` and the Episodes view, and those two rows are already dense.
  - [x] Verified in the running app (dev server, signed-in session, en + ru): morning value + planned action saved on Today → Journal's morning card shows `VALUE`, the serif title and both domain chips above the four rows, with the planned action still in its own row → an away episode saved with *both* typed words and the linked value renders both chips, the linked one achromatic → an episode saved with the link only renders the linked chip alone, with no `"—"` chip → older episodes with no link render exactly as before. Russian renders both new labels ("ЦЕННОСТЬ") and the domain chips. The morning value and planned action were cleared afterwards; **the two test episodes are still in the database** — the app has no delete affordance and the direct DB cleanup was blocked, see the note under Phase 9.

- [x] **Phase 7 — Reference → Vault "Orient to values"**
  - [x] Expanded `act.vault.Skills.4` copy in both catalogs — all four layers rewritten to the handoff's final text, including the "can never be finished, failed, or scored" line, the `<em>` question in **In practice**, and the "'away' and a value can appear in the same episode" line in **Deeper**
  - [x] `vault-view.tsx` — the four layers became a `VAULT_LAYERS` loop with a `before`/`after` extras slot per layer, and `act()` became `act.rich()` (an `em` handler) so the practice question can be italic. Every other card renders through the same loop unchanged.
  - [x] `orient-to-values-card.tsx` (new) — the distinctions strip, the four-domain map, the worked-example box, the source line and the `/values` footer. All are `flex flex-wrap` self-labelling cells inside `overflow-hidden rounded-[10px] border` groups with `border-t` hairlines — **no `<table>`, no header row**. Domain names come from `DOMAINS` + `act.domains.*.label`, so the map's fixed order and labels have one source with the rest of the app.
  - [x] **Deviation — where the new copy lives.** The structured blocks are keyed under `reference.vault.orientToValues.*`, not nested inside `act.vault.Skills.4`. `constants.ts` spreads `en.act.vault.Skills["4"]` straight into `LIB`, so nesting objects there would push unused sub-objects onto one `LIB` entry and split the array's element type. The four layer *strings* are still expanded in `act.vault.Skills.4` exactly as the plan says.
  - [x] **Deviation — the Example layer.** The artboard shows the labelled box first and then the "goal can be missed" sentence, with no lead paragraph. So `act.vault.Skills.4.example` now holds that closing sentence and the box renders in the layer's `before` slot — the generic label+paragraph contract is untouched and no catalog key goes dead.
  - [x] i18n for this phase landed with it (see Phase 8): the four expanded layers plus the whole `reference.vault.orientToValues.*` block in both catalogs.
  - [x] Verified in the running app (dev server, signed-in session, en + ru): the card renders all four layers, the strip, the map, the box, the source and the footer; the source link is `https://contextualscience.org/act` with `target="_blank"` + `rel="noopener noreferrer"` and the footer's "My Values" is a `/values` `Link`. **Wrap measured, not eyeballed:** at 1280px the strip sits 118 + 696 on one line and each map row is 237/287/287 on one line; at 375px the strip breaks to 2 lines, each map row to 3, the example box to 2 — with `scrollWidth - clientWidth === 0` on both the document and the card, i.e. no horizontal scroll. "What is a value? →" on `/values` navigates to `?tab=Skills&card=orient-to-values` with the card already `aria-expanded="true"` and every new block present. A card with no extras (`workability`) renders unchanged through the new `act.rich` loop. Russian was checked on the same card and then switched back to English. One RU fix came out of it: **Deeper** read "не вашу ценность как человека", which collides with *ценность* = value; it now reads "не то, чего вы стоите".

- [x] **Phase 8 — i18n**
  - [x] `act.domains.*` (label + hint) in `en.json` and `ru.json`
  - [x] `nav.values` and the full `values.*` block (screen, empty state, archived, editor, picker) in both catalogs — landed with Phase 3, which could not render without them
  - [x] The new `today.*` strings (morning picker label + notes, the value-flavoured TOWARD label/placeholder, the replaced morning footer, the evening recall block, flexibility helper and no-morning line) — landed with Phase 4
  - [x] The new `episodeModal.*` strings (own-words helper, picker label, toward/away note box) — landed with Phase 5
  - [x] `journal.morning.value` and `episodes.card.linkedValue` — landed with Phase 6
  - [x] The expanded Vault copy — `act.vault.Skills.4` (four layers) and `reference.vault.orientToValues.*` (distinctions, map, example box, source, footer) — landed with Phase 7

- [x] **Phase 9 — Tests & verification**
  - [x] Unit: episode `valueId` pass-through and returned snapshot for both directions, absent/null/invalid links and save errors; fixed domain IDs/order/labels and `domainLabel`; shared `hasMorningEntry` regression for structured snapshots, cleared links and legacy text; snapshot-title search alongside own words.
  - [x] `tests/db/isolation.test.mjs` — `personal_values` included in the per-table RLS loop. **Deviation:** foreign-`valueId` attachment rejection lives in `tests/db/personal-values.test.ts`, where Vitest can load the actual TypeScript repositories. Only `server-only` and the authenticated-session boundary are mocked; PostgreSQL queries, transaction handling, runtime-role checks and snapshot resolution are real. Covers foreign read/edit/archive/attach rejection, archived/missing attachment rejection, frozen history after edit/archive/restore, active-only lists, morning omission/change/clear semantics, and saves without a map.
  - [x] Migration compatibility: real `0001`–`0003` applied in an isolated schema, legacy episodes and populated/empty day entries seeded, then real `0004` applied and rerun. Every old field is preserved, new episode columns are null, morning link keys remain absent, and no values are auto-created.
  - [x] Gates passed on Node 24.15.0: `pnpm check` (lint, typecheck, **102 unit tests**, including en/ru parity), `pnpm build`, `pnpm db:migrate`, and `pnpm test:db` (**3 Node DB tests + 7 repository tests**) against a disposable PostgreSQL 16 container. `test:db` now runs both DB suites through the existing CI command; ordinary `pnpm test` stays database-independent.
  - [x] **Housekeeping:** deleted and verified the two Phase 6 verification episodes on 2026-09-07 ("Ducked the question in standup", "Asked for the deadline I needed") from the local app database, using the runtime role scoped to their owner and exact IDs/date/hook text.

---


## 0. Architecture facts this plan relies on

- **Migrations** are plain `.sql` files under `migrations/`, applied in filename-sort order and tracked by name in `schema_migrations` ([`scripts/lib/migrations.mjs`](../scripts/lib/migrations.mjs)). Each runs in its own transaction. Next free number is **`0004`**. New tables need `ENABLE`/`FORCE ROW LEVEL SECURITY`, a `*_by_user_id` policy, and guarded `act_app` GRANTs — copy the pattern from [`migrations/0003_act_tables.sql`](../migrations/0003_act_tables.sql).
- **All user data access** goes through `withCurrentUserDb` ([`src/lib/db/user-context.ts`](../src/lib/db/user-context.ts)), which opens a transaction and sets `app.current_user_id`. RLS enforces ownership; validation of *active* status still happens in-query.
- **`day_entries.morning` is JSONB merged with `||`** in `upsertDayEntry` ([`src/lib/db/day-entries.ts`](../src/lib/db/day-entries.ts)). Omitted keys are preserved; a key set to JSON `null` is written. This is exactly what the spec's "clearing must be explicit" rule needs — no merge-logic change required, only correct payloads.
- **`en`/`ru` catalog parity is enforced by a test** ([`src/i18n/messages.test.ts`](../src/i18n/messages.test.ts)): every English key must have a nonempty Russian value. Every string added below must land in **both** `en.json` and `ru.json` or `pnpm test` fails.
- **Reference constants spread English copy from the catalog** (e.g. `AXES`, `LIB` in [`src/lib/act/constants.ts`](../src/lib/act/constants.ts)). The new `DOMAINS` constant follows the same `{ id, ...en.act.domains.x }` shape.
- **Episode search** (`matchesFilters` in [`src/lib/act/derive.ts`](../src/lib/act/derive.ts)) scans `episode.value` text, which existing episodes keep unchanged. Phase 5 added `valueSnapshot.title` as a second haystack, because a linked value no longer displaces the user's own wording in that column.
- **Draft loss risk**: Morning/Evening drafts live in `MorningCard`/`EveningCard` local state; the episode draft lives in the layout-level `NewEpisodeDialogProvider`. A route change unmounts Today. → The picker and the "What is a value?" help must be **in-place** (Popover/Dialog), never a `<Link>` out of these forms. `radix-ui` Popover already exists at [`src/components/ui/popover.tsx`](../src/components/ui/popover.tsx).

---

## Phase 1 — Data model & persistence (server-only)

### 1.1 Migration `migrations/0004_personal_values.sql`
- Create `personal_values`:
  ```
  id           uuid PK default gen_random_uuid()
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
  title        text NOT NULL CHECK (length(btrim(title)) > 0)
  domains      text[] NOT NULL CHECK (cardinality(domains) >= 1)
  meaning      text NOT NULL DEFAULT ''
  examples     text[] NOT NULL DEFAULT '{}'
  archived_at  timestamptz            -- NULL = active
  created_at / updated_at timestamptz NOT NULL DEFAULT now()
  ```
  Index `personal_values_user_idx ON (user_id, archived_at)`. Add RLS enable/force + `personal_values_by_user_id` policy + guarded grants, exactly like `episodes`.
- `ALTER TABLE episodes ADD COLUMN value_id uuid, ADD COLUMN value_snapshot jsonb;` (both nullable, no FK on `value_id` — ownership is validated in-app; a plain FK would not prove ownership and would block archival semantics).
- No change to `day_entries` DDL — `valueId`/`valueSnapshot` live inside the existing `morning` JSONB.
- **Do not** touch applied migrations `0001`–`0003`.

### 1.2 Types — [`src/lib/act/types.ts`](../src/lib/act/types.ts)
- `export type DomainId = (typeof DOMAINS)[number]["id"];`
- `PersonalValue` (camelCase row shape) + `PersonalValueSnapshot = { valueId, title, meaning, domains }`.
- Extend `DayMorning` with `valueId?: string | null; valueSnapshot?: PersonalValueSnapshot | null;`
- Extend `Episode` with `valueId?: string | null; valueSnapshot?: PersonalValueSnapshot | null;`

### 1.3 Constants — [`src/lib/act/constants.ts`](../src/lib/act/constants.ts)
- Add `DOMAINS` (stable order, never rank-ordered): `relationships`, `work_education`, `personal_growth_health`, `leisure`, each `{ id, ...en.act.domains[id] }`. Add `domainLabel(id)` helper mirroring `stateLabel`. These IDs are **distinct** from `AXES`/pillars/`BANDS` — do not touch those.
- Final display labels: `Relationships` · `Work & Education` · `Personal Growth & Health` · `Leisure`. Per-domain empty-state hint (empty `/values` screen only):
  - relationships — "Partner, family, friends, the people you keep showing up for."
  - work_education — "Your job, study, craft — what you're building or learning."
  - personal_growth_health — "Body, mind, habits, how you treat yourself."
  - leisure — "Rest, play, hobbies, time that doesn't have to earn anything."

### 1.4 Repository — `src/lib/db/personal-values.ts` (new, `import "server-only"`)
- `listPersonalValues({ includeArchived })`, `getPersonalValue(id)`, `createPersonalValue`, `updatePersonalValue`, `setArchived(id, archived)` — all wrapped in `withCurrentUserDb`, row-mapping `text[]` → `string[]`.
- **`resolveOwnedActiveSnapshot(client, valueId)`** helper that, *inside a caller's transaction*, `SELECT`s an owned **active** value and returns a `PersonalValueSnapshot`, throwing if not found/archived. Used by day + episode writes so snapshot derivation and ownership validation share one transaction (spec §5).

### 1.5 Extend day + episode repositories
- [`day-entries.ts`](../src/lib/db/day-entries.ts): teach `upsertDayEntry` a `morningSelection?: { valueId: string } | { clear: true }` input. Inside the existing tx: if `{valueId}` → `resolveOwnedActiveSnapshot` then merge `{ valueId, valueSnapshot }` into the morning JSONB; if `{clear:true}` → merge `{ valueId: null, valueSnapshot: null }`; if absent → leave morning value keys untouched. `mapDayEntry` already returns `morning` verbatim, so the new keys pass through.
- [`episodes.ts`](../src/lib/db/episodes.ts): add `value_id`/`value_snapshot` to `episodeColumns`, `CreateEpisodeInput`, the INSERT, and `mapEpisode`. When `valueId` is supplied, resolve the snapshot in the same tx. **Corrected in Phase 5:** the typed free text wins the `value` column and the snapshot title only fills it when nothing was typed — the design keeps both, so the earlier "snapshot title always overwrites" would have discarded the user's wording. `matchesFilters` searches `valueSnapshot.title` too, so a linked value stays findable either way.

---

## Phase 2 — Server actions

### 2.1 `src/actions/personal-values.ts` (new, `"use server"`) — **done**
- Zod schemas: `title` (trim, 1..200), `domains` (`z.array(z.enum(DOMAINS.map((d) => d.id))).min(1)`, deduped), `meaning` (optional, max 10k), `examples` (array of trimmed strings, empties dropped). Actions: `createValueAction`, `updateValueAction`, `archiveValueAction`, `restoreValueAction` — the last two share a private `setArchived` helper. Each `revalidatePath("/values")` and `/` so the morning picker refreshes. Update/archive/restore throw on a `null` repo result rather than returning it.

### 2.2 Extend [`src/actions/day.ts`](../src/actions/day.ts) — **done**
- `saveMorningSchema` gained `valueId: z.uuid().nullable().optional()`, **outside** the `morning` object so it is never treated as free text. `saveMorningAction` translates it via `morningSelectionFor()` into the repo's `morningSelection` (`{valueId}` for an id, `{clear:true}` for an explicit `null`, omitted for `undefined`). `revalidatePath("/")` unchanged.

### 2.3 Extend [`src/actions/episodes.ts`](../src/actions/episodes.ts) — **done**
- `valueId: z.uuid().nullable().optional()` added to `createEpisodeSchema` and carried through by the existing `createEpisode(createEpisodeSchema.parse(input))` call. Existing revalidations (`/`, `/episodes`, `/journal`, `/progress`) already cover the surfaces. An `UnavailableValueError` from snapshot resolution surfaces as a failed action, which Phase 5's retry-with-retained-input pattern handles.

---

## Phase 3 — My Values screen (artboards `1a`–`1g`, editor `1e`/`1f`; [`Values Screen.dc.html`](./design/design_handoff_personal_values_map/design/Values%20Screen.dc.html), [`Value Editor.dc.html`](./design/design_handoff_personal_values_map/design/Value%20Editor.dc.html)) — **done**

Shipped as [`values/page.tsx`](../src/app/(protected)/values/page.tsx), [`values-view.tsx`](../src/components/values/values-view.tsx), [`value-editor-dialog.tsx`](../src/components/values/value-editor-dialog.tsx) and [`value-picker.tsx`](../src/components/values/value-picker.tsx), with `nav.values` + `values.*` in both catalogs. Deviations are listed in the checklist above; the copy below is what was implemented.

- **Route** `src/app/(protected)/values/page.tsx` (new): server component, `listPersonalValues` (active + archived), render `<ValuesView>`. Archived view can be `?view=archived` or local state (handoff allows either).
- **`src/components/values/values-view.tsx`** (new, client): matches artboards —
  - Header `h1` "My Values" + mono meta "Four areas · nothing ranked"; intro paragraph (final copy in handoff §"My Values"); utility row with the **Active / Archived · N** segmented switch, primary **"+ New value"**, and quiet **"What is a value? →"** link.
  - Four domain sections as a `flex flex-wrap` row, each `basis-[330px]` (2-up desktop, 1-up phone — **no breakpoints**, per the handoff's wrap rule). Section header = domain name + plain count label ("1 value" / "N values"); value cards; per-domain empty line "Nothing here yet — and that's a fine place to leave it."; a dashed **"+ Add a value here"** ghost button that opens the editor with that domain pre-checked.
  - **Value card**: serif title, Edit/Archive controls, domain tags (the current section's tag emphasised, others quiet), optional meaning, optional examples block, and an "Also shown in …" line when multi-domain. A value with multiple domains renders once per section from the **same** record — editing anywhere edits the one record.
  - **Empty state** (`1d`): the four domain buttons with the hint copy from Phase 1.3.
  - **Archived view** (`1g`): rows at `opacity-[0.78]`, muted title, "Archived {date}", **Restore** button, **no delete affordance** anywhere.
  - **Editor dialog** (`1e`/`1f`): same frame as the New-episode `Dialog`. Prompt "How do you want to act in this part of your life?"; fields **My value** (required), **Where this matters** (required, ≥1 domain — plain checkbox chips), **What this means to me** (optional textarea), **What this can look like** (optional ordered example rows with add/remove). Inline validation (never a blocking modal); empty example rows dropped on save. Editing shows a quiet **"Archive this value"** action. Copy is final in the handoff.
  - Values surfaces are **achromatic** — never apply the toward-green/away-amber accent to a value. "What is a value?" uses `vaultHref("orient-to-values")` (this screen holds no fragile draft, so a link is safe). Save/retry/error follows the `MorningCard` pattern (`useTransition`, retained input); archive/restore should be optimistic with rollback (small, reversible list).
- **`src/components/values/value-picker.tsx`** (new, client — artboards `2a`–`2e`, [`Value Picker.dc.html`](./design/design_handoff_personal_values_map/design/Value%20Picker.dc.html)): the **one reusable compact picker** for Morning + New episode. Controlled: props `value: valueId | null`, `onChange`, `label`, `suggested?`. Closed-empty = dashed "Pick a value" row (`⌘K` hint); closed-selected = boxed title + Change + clear, with an optional "Suggested from your morning · changeable" line (episode only) and a meaning/examples toggle. Open = `Popover` with a "Filter your values" input, a domain-filter chip row (**filters only, never edits**), a scrollable list of active values, and a footer "No value" clear. **Keyboard**: rows are real buttons; `↑`/`↓` roving focus (wrapping), `Enter`/`Space` pick+close, `Esc` close-without-change, `→` expand focused row; `⌘K` opens. Hand-rolled on `Popover` (no cmdk). Selection is **neutral ink, never green**; clearing sets `null`, never `""`. Only **active** values listed.

### 3.1 Sidebar — [`src/components/app-sidebar.tsx`](../src/components/app-sidebar.tsx)
- Add `{ href: "/values", label: "values" }` to `dailyItems` **in third position (after Today and Journal, before Episodes)** and `"values"` to the `NavItem["label"]` union. **No count/badge.** Add `nav.values` ("Values") to both catalogs. Phone reuses the existing horizontally scrolling pill row automatically.

---

## Phase 4 — Today integration (Morning, Evening, shared state) — artboards Morning `3a`–`3d`, Evening `5a`–`5d` — **done**

Shipped in [`today-view.tsx`](../src/components/today/today-view.tsx) and [`page.tsx`](../src/app/(protected)/page.tsx), with `hasMorningEntry` in [`derive.ts`](../src/lib/act/derive.ts) and the new `today.*` strings in both catalogs. Deviations are listed in the checklist above; the copy below is what was implemented.

[`Morning Value Setup.dc.html`](./design/design_handoff_personal_values_map/design/Morning%20Value%20Setup.dc.html), [`Evening Value Review.dc.html`](./design/design_handoff_personal_values_map/design/Evening%20Value%20Review.dc.html). Refactor [`today-view.tsx`](../src/components/today/today-view.tsx) so a successful morning save updates Evening **without reload** (spec §D):
- Lift the morning value selection + `toward` into `TodayView` state (seeded from the server `morning` prop). `MorningCard` receives it and an `onMorningSaved(entry)` callback; `EveningCard` receives `morningValueSnapshot` + `morningToward` to display read-only when present.
- **MorningCard** (`3a` with value / `3b` without): keep Open/Aware/Engaged intact. The ENGAGED block becomes a `flex flex-wrap` row — existing textarea `basis-[290px]`, plus a `basis-[250px]` column holding `<ValuePicker>` (label "From My Values") and a note that changes with/without a selection (final copy in handoff §3). Reuse the **existing** `toward` `<Input>` as the action field — its label switches to "What is one small action that would express this value today?" when a value is picked (placeholder "Say the hard sentence before lunch"), else the current label; the mono `TOWARD` eyebrow stays. Save via `saveMorningAction({ day, morning: form, valueId })`. Footer note "Every field is optional — including the value." Works with no value selected (free-text retained).
- **EveningCard** (`5a` with morning / `5b` without): when `morningValueSnapshot` present, render a **read-only** block above the fields (mono "FROM THIS MORNING" / "READ-ONLY", serif value title, domain chips, then mono `TOWARD` "PLANNED ACTION" + the planned action) — no inputs. The **existing** "Where did flexibility show up?" field gains one helper line "How did this value show up in what you did today? Optional — a sentence is plenty." — **no new field** (spec forbids a duplicate; shown only when a morning value exists). With no morning entry, replace the block with the dashed permission line "No morning entry today — the evening stands on its own. Nothing is missing and nothing is counted against the day." Keep the evening focus ring unchanged.

---

## Phase 5 — New episode dialog (Choice Point) — artboards `4a`–`4d` — **done**

Shipped in [`new-episode-dialog.tsx`](../src/components/episodes/new-episode-dialog.tsx) and [`layout.tsx`](../src/app/(protected)/layout.tsx), with `listMorningValueSelections` in [`day-entries.ts`](../src/lib/db/day-entries.ts), the `value`-precedence fix in [`episodes.ts`](../src/lib/db/episodes.ts), the search fix in [`derive.ts`](../src/lib/act/derive.ts) and the new `episodeModal.*` strings in both catalogs. Deviations are listed in the checklist above; the copy below is what was implemented.

[`Episode Value Dialog.dc.html`](./design/design_handoff_personal_values_map/design/Episode%20Value%20Dialog.dc.html), [`new-episode-dialog.tsx`](../src/components/episodes/new-episode-dialog.tsx). All existing controls stay unchanged.
- Add `valueId: string | null` to `FormState`. The existing free-text "Value at stake" input stays put (now `basis-[240px]` in a wrapping row, helper "Write it in your own words for this moment."); beside it (`basis-[250px]`) render `<ValuePicker>` with label "Or link one of your values". Add the direction-aware note box (toward vs. away copy in handoff §4 — away copy explicitly frames that a value can sit beside an away move and amber is not a penalty). Pass `valueId` to `createEpisodeAction`.
- **Suggestion logic** (`4a` shows "Suggested from your morning · changeable"): the provider is mounted in the layout with today's date only. To suggest the morning selection for the episode's chosen `day`, pass the active-values list + a `day → morningSelection` lookup into the provider (fetch in layout or via a light server call). Suggest only for the currently selected `form.day`; **never auto-inherit** today's selection onto a backdated `day` (re-evaluate on `day` change), never re-apply after the user clears it, and always leave it changeable.
- `valueId` and `dir` are **independent** — never gate one on the other, and never style a linked value with the direction colour. A value may accompany an **Away** episode; do not auto-classify direction from the value/domain.

---

## Phase 6 — Journal & Episodes historical display — **done**

Shipped in [`journal-view.tsx`](../src/components/journal/journal-view.tsx) and [`episodes-view.tsx`](../src/components/episodes/episodes-view.tsx), with `journal.morning.value` + `episodes.card.linkedValue` in both catalogs. No artboard covers these two surfaces, so both follow the app's existing chip and card patterns and the design invariants (achromatic value, no count, fixed domain order). Deviations are listed in the checklist above; the copy below is what was implemented.

- **Journal helpers** [`journal-view.tsx`](../src/components/journal/journal-view.tsx): `hasMorning`/`hasEvening` currently do `Object.values(morning).some(v => v?.trim())`. A `valueSnapshot` **object** would throw on `.trim()`. Fix both: ignore non-string values for the text check **and** count a present `valueId`/`valueSnapshot` as a morning entry. Render the morning value from the **stored snapshot** (not the live record) in the morning `NotesCard`.
- **Episodes view** [`episodes-view.tsx`](../src/components/episodes/episodes-view.tsx): render the episode's `valueSnapshot` (or `value` fallback) as a chip near the existing `episode.value`/`episode.move` block (~line 300). Search already covers `value` text.

---

## Phase 7 — Reference → Vault "Orient to values" (artboards `6a`–`6c`) — **done**

Shipped in [`vault-view.tsx`](../src/components/reference/vault-view.tsx) and the new [`orient-to-values-card.tsx`](../src/components/reference/orient-to-values-card.tsx), with `VAULT_LAYERS`/`VaultLayer` in [`vault.ts`](../src/lib/reference/vault.ts), the expanded `act.vault.Skills.4` and the `reference.vault.orientToValues.*` block in both catalogs. Deviations are listed in the checklist above; the copy below is what was implemented.

[`Values Vault Card.dc.html`](./design/design_handoff_personal_values_map/design/Values%20Vault%20Card.dc.html). Same Skills card, same `(b)` tag, same short/practice/example/deeper layers.
- Expand `act.vault.Skills.4` (`orient-to-values`, index 4) copy in both catalogs per the handoff: **In short** adds the "can never be finished, failed, or scored" line; **In practice** adds a four-row **domain/value/goal/action distinctions strip** and the **four-domain map** (final example rows in handoff §6 — value-sounds-like vs. goal-sounds-like per domain) plus the "areas, not scores" closer; **Example** adds the labelled Domain/Value/Goal/Action box; **Deeper** adds the "'away' and a value can appear in the same episode" line and the clickable source. Write original copy; do not reproduce the worksheet.
- **Renderer extension** in [`vault-view.tsx`](../src/components/reference/vault-view.tsx): the panel currently renders four plain text rows. The distinctions strip and four-domain map must be **self-labelling wrapping cells** (`flex flex-wrap`, each cell carries its own mono micro-label) — **not** a `<table>` with a header row — so they reflow to phone width with no horizontal scroll (handoff §6). Add a clickable source line (external link, new tab, `rel="noopener"`) and a footer line whose "My Values" text links to `/values`.
- **Targeted navigation**: Vault already supports `?tab=Skills&card=orient-to-values` via `vaultHref()`/`resolveVaultSelection` ([`src/lib/reference/vault.ts`](../src/lib/reference/vault.ts)) and opens the card **already expanded** — the "What is a value? →" link from My Values (and the empty state, and the Vault "Read the Vault card →" prompts) all use `vaultHref("orient-to-values")`.

---

## Phase 8 — i18n

- The English strings are **final** in the handoff (screen, editor, picker, morning/evening/episode notes, Vault copy, domain labels + hints). Transcribe them verbatim into `en.json`, then author Russian for each in `ru.json`.
- Add to **both** `en.json` and `ru.json`: `act.domains.{4 ids}` (label + empty-state hint), `nav.values`, a `values.*` block (screen, editor, empty state, archived, picker, help link), the new morning/evening/episode picker + note strings under `today.*` and `episodeModal.*`, and the expanded `act.vault.Skills.4`. Do not translate persisted IDs or user-authored text. Remember the parity test ([`messages.test.ts`](../src/i18n/messages.test.ts)) fails on any English key without a nonempty Russian value.

---

## Phase 9 — Tests & verification — **done**

Implemented in [`episodes.test.ts`](../src/actions/episodes.test.ts), [`constants.test.ts`](../src/lib/act/constants.test.ts), [`derive.test.ts`](../src/lib/act/derive.test.ts), [`isolation.test.mjs`](../tests/db/isolation.test.mjs), [`migrations.test.mjs`](../tests/db/migrations.test.mjs), and [`personal-values.test.ts`](../tests/db/personal-values.test.ts). [`vitest.db.config.ts`](../vitest.db.config.ts) isolates the repository integration suite from unit tests; `pnpm test:db` runs both database runners using explicit environment URLs, without loading `.env.local`. Verification results and the test-location deviation are recorded in the checklist above.

- **Unit**: extend `src/actions/episodes.test.ts` for `valueId` pass-through/snapshot; add domain-constant/`domainLabel` coverage; a `derive`/journal-helper test proving a `valueSnapshot` object no longer breaks `hasMorning` and counts as a morning entry.
- **DB isolation**: extend `tests/db/isolation.test.mjs` to include `personal_values` in the per-table RLS loop, and assert one user cannot read/attach another's value (snapshot resolution rejects a foreign `valueId`).
- **Migration compat**: verify `0004` applies cleanly and existing episodes/day rows survive with `null` value fields via the migration test setup.
- **Gates**: `pnpm check` (lint + typecheck + vitest, includes the en/ru parity test), `pnpm build`, `pnpm test:db` against a disposable DB.

## Acceptance-criteria coverage map

| Spec §7 criterion | Phase |
| --- | --- |
| Four domains with labels / create-and-use / one record many domains / edit-archive-restore / archived hidden from pickers | 1, 3 |
| Editing a value doesn't change saved snapshots | 1.4 (snapshot), 6 |
| Morning links value + `toward`; episode links value + `move`/dir incl. backdated | 4, 5 |
| Evening shows morning value + action | 4 |
| All flows work with no value / no map | 3–5 |
| Help/map preserve in-progress text | 0 (in-place Popover/Dialog) |
| Cross-device after refresh | 1 (PostgreSQL) |
| Failed saves retain input + retry | 3–5 (existing pattern) |
| Migration preserves existing text, no auto value creation | 1.1 |
| Journal accepts structured data, no string errors, shows snapshot; search works | 6, 0 |
| Clearing/changing selection preserves other fields / unchanged snapshot | 1.5, 2.2 |
| Ownership isolation | 1.4, 9 |
| "What is a value?" opens correct Vault card | 7 |
| EN + RU everywhere | 8 |
| High-fidelity match to handoff artboards (tokens, copy, states, light + dark, wrap-based responsive) + design invariants held | 3–7 |
```
