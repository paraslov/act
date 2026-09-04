# Build ACT Practice app from the design

## Implementation steps — checklist

**Phase 1 — Core practice loop (MVP)**
- [x] **Step 0** — Add shadcn primitives (`select`, `dialog`, `tabs`, `tooltip`, `popover`) via CLI; wire Google fonts (Inter, Newsreader, JetBrains Mono)
- [x] **Step 1** — Design tokens: add page bg + toward/away/aware/alert tokens to `globals.css` (light + dark), font CSS vars, radii
- [x] **Step 2** — DB migration `0003_act_tables.sql`: `episodes` + `day_entries` with RLS **and `act_app` GRANTs**; run `db:migrate`
- [ ] **Step 2.5** — i18n scaffold: install `next-intl`, message catalog with `en` (verbatim design copy) + stubbed `ru`, locale from `user_settings` (cookie fallback); all UI strings go through the catalog from the start
- [ ] **Step 3** — Reference constants: `src/lib/act/constants.ts` (STATES, SKILLS, AXES, BANDS, HOOK_TYPES) + derive/date helpers `src/lib/act/*.ts`
- [ ] **Step 4** — Data access + server actions: `episodes.ts`, `day-entries.ts` (repos through `withCurrentUserDb`) and `src/actions/episodes.ts`, `src/actions/day.ts`
- [ ] **Step 5** — App shell: 236px sidebar (replace top `Navigation`), streak/master-stat blocks, responsive collapse
- [ ] **Step 6** — New-episode modal (shadcn `dialog`): all fields, tipping-scale SVG, flexibility check, opens from 3 places
- [ ] **Step 7** — Today view (`/`): header, alert frame, morning card (Save buttons + "Saved ✓"), Today-so-far dark card, evening card
- [ ] **Step 8** — Episodes view (`/episodes`): filter bar (URL state), episode cards, empty state
- [ ] **Step 9** — Journal view (`/journal`): range/jump, day list, last-7 table, day-strip SVG, selected-episode + morning/evening + episodes-this-day (URL state)

**Phase 2 — Progress**
- [ ] **Step 10** — Progress view (`/progress`): toward/away split + by-band chart, flexibility radar SVG, status effects, recurring hooks, skill usage, boss-test grid

**Phase 3 — Reference (static)**
- [ ] **Step 11** — Reference constants (LOOP_REF, LIB, FLEX_PILLARS/MYTHS/GROWTH) + `/reference/flexibility`, `/reference/loop`, `/reference/vault`

**Cross-cutting**
- [ ] **Step 12** — Compute real streak + "day N"; wire sidebar Episodes count
- [ ] **Step 13** — Dark-mode pass on new accents; `pnpm lint`, `pnpm test`, `pnpm build`; end-to-end manual verification

---

## Context

The repo (`ACT/`) is a Next.js 16 / React 19 / Tailwind v4 app with email-password auth, sessions, and a PostgreSQL layer that enforces per-user Row-Level Security. Today it only has a placeholder home page and a bare top nav.

`docs/design/README.md` is a **high-fidelity handoff spec** for the real product: a private, single-user ACT (Acceptance & Commitment Therapy) practice app — a self-observation instrument, not a theory reader. The user sets three intentions each morning, logs *episodes* (a moment a thought/feeling hooked them and behaviour went **toward** or **away** from a value), reviews the day in the evening, and watches patterns build over weeks. `docs/design/design/*.dc.html` are interactive HTML prototypes (a bespoke template runtime — **read as reference, do not port the runtime**); all copy in them is final and used verbatim.

The task is to recreate the design's nine surfaces in the existing Next.js app using its own patterns (App Router, server/client components, Tailwind v4, shadcn "neutral" tokens, PostgreSQL + RLS). Per decisions taken: **build the core practice loop first** (Today → episode modal → Episodes → Journal), then Progress, then the three static Reference pages; and **keep the design's explicit Save buttons** for morning/evening (server action + "Saved ✓" flash), not autosave.

Outcome: a working, persistent ACT practice app matching the design closely, with all derived numbers (counts, streak, radar, bars) computed live from the `episodes` table — no aggregate/counter tables.

---

## Key existing patterns to reuse (do not reinvent)

- **RLS access**: every user-owned read/write goes through `withCurrentUserDb((client, userId) => …)` in [user-context.ts](src/lib/db/user-context.ts), which opens a transaction and sets `app.current_user_id`. Never query RLS tables with the pool-level `query()`.
- **RLS table pattern**: copy `user_settings` in [0001_initial.sql](migrations/0001_initial.sql) — `user_id uuid REFERENCES users(id) ON DELETE CASCADE`, `ENABLE`+`FORCE ROW LEVEL SECURITY`, and a `FOR ALL TO PUBLIC` policy comparing `user_id` to `NULLIF(current_setting('app.current_user_id', true), '')::uuid`.
- **Runtime role GRANTs (critical, easy to miss)**: the app connects as the un-privileged `act_app` role. [0002_security_hardening.sql](migrations/0002_security_hardening.sql) shows every table must be `GRANT`ed explicitly. The new migration **must** `GRANT SELECT, INSERT, UPDATE, DELETE ON episodes, day_entries TO act_app` (inside the same `IF EXISTS (… act_app …)` guard), or all queries fail with permission errors even though RLS is correct.
- **Migrations** run as `DATABASE_ADMIN_URL` via [migrate.mjs](scripts/migrate.mjs); files are applied in sorted order, tracked in `schema_migrations`. Name the new one `migrations/0003_act_tables.sql`.
- **Auth/server actions**: follow [auth.ts](src/actions/auth.ts) — `"use server"`, Zod validation, then repo call. `requireCurrentUser()` from [session.ts](src/auth/session.ts) is already called by `withCurrentUserDb`.
- **shadcn**: config is `new-york` / neutral / RSC (see `components.json`). Add primitives with the CLI (`pnpm dlx shadcn@latest add select dialog tabs tooltip popover`) — do not hand-roll. The four present are in `src/components/ui/`.
- **Theme**: `ThemeProvider` + `.dark` tokens already exist; keep dark mode working by using tokens.

---

## Data layer

### Migration `migrations/0003_act_tables.sql`
Use the schema from `README.md` §"Suggested schema" verbatim, with the RLS block + GRANTs:
- `CREATE TYPE episode_dir AS ENUM ('toward','away');` and `hook_type AS ENUM ('thought','feeling','urge','memory');`
- `episodes` table (id, user_id, `day date`, `band smallint 0..7`, dir, `weight smallint default 1`, hook, hook_type, situation, `state text`, `skill text`, value, move, workable, `checks jsonb`, created_at, updated_at) + `episodes_user_day_idx (user_id, day DESC)`.
- `day_entries` (PK `(user_id, day)`, `morning jsonb`, `evening jsonb`).
- RLS `ENABLE`+`FORCE`+policy on **both** tables; GRANTs to `act_app` on both.
- `band` is a **smallint index 0–7**; the display strings live in the `BANDS` TS constant, not the DB.

### `src/lib/db/episodes.ts` and `src/lib/db/day-entries.ts`
Thin repos, each function wrapping `withCurrentUserDb`:
- `listEpisodes(filters?)`, `getEpisodesForDay(day)`, `createEpisode(input)` (returns the row), later `updateEpisode`/`deleteEpisode` (deferred — Known gap #6).
- `getDayEntry(day)`, `upsertDayEntry(day, { morning?, evening? })` (`INSERT … ON CONFLICT (user_id, day) DO UPDATE`, merging only the provided half).
- Map DB `band` smallint ↔ display via `BANDS`. Row type shared in `src/lib/act/types.ts`.

### Server actions
- `src/actions/episodes.ts` — `createEpisodeAction` (Zod: hook required, everything else optional/defaulted to `''`/`—`, band 0–7, dir enum, checks 0–2). On success `revalidatePath` the affected routes.
- `src/actions/day.ts` — `saveMorningAction`, `saveEveningAction` (upsert the relevant jsonb half), `revalidatePath('/')`.

---

## Reference constants & derived helpers

`src/lib/act/constants.ts` — port verbatim from `ACT Practice.dc.html` (lines ~806–929): `AXES`, `STATES`, `SKILLS`, `HOOK_TYPES`, `BANDS`, `HOOK_GROUPS`, and the `toward`/`away` accent strings. As typed const tuples/objects. (Phase-3 reference data — `LOOP_REF`, `LIB`, `FLEX_PILLARS/MYTHS/GROWTH` — added in Step 11.)

`src/lib/act/date.ts` — day-id helpers, all **UTC date math** off `YYYY-MM-DD` strings (mirror `dayRecord()` in the prototype). Never store/hardcode weekday names — derive them. Store the user's timezone in `user_settings` before the first real save; default to a single fixed zone for v1 and note it.

`src/lib/act/derive.ts` — pure functions over an episode list: per-day toward/away counts, band "shape" strips, most-frequent status effect, filter matching (dir/state/skill/band + case/diacritic-insensitive text over hook+move+value), flexibility-check totals, radar points (recent 5 vs previous 5), status-effect / hook-group / skill tallies, and **streak** (consecutive days with ≥1 toward move) + **day N**. Everything derived — no stored aggregates.

---

## App shell (Step 5)

Replace the top `Navigation` with a **236px left sidebar** (`docs/design/README.md` §"Screens › Sidebar"). Keep `Navigation`'s three functions but relocate: email + sign-out at the sidebar bottom; theme toggle there too. Sidebar is a client component (needs `usePathname` for active state); it renders `DAILY` group (Today/Journal/Episodes/Progress, Episodes shows total count), `REFERENCE` group (Flexibility/The loop/Vault), the **master-stat** button (→ `/reference/flexibility`), and the **streak card** (real value from `derive.ts`, Step 12). Collapses to a full-width top bar under 900px. Update `src/app/(protected)/layout.tsx` to the `flex` shell (sidebar + `main flex:1`, `max-width:1220px`, page padding `28px 32px 64px`).

Routes: `/` (Today), `/journal`, `/episodes`, `/progress`, `/reference/flexibility`, `/reference/loop`, `/reference/vault`.

---

## Screens (build in this order)

For each, follow `docs/design/README.md` §"Screens" exactly for layout, copy, tokens, and interaction. Server components fetch (via repos); client components hold form/UI state and URL params.

- **New-episode modal (Step 6, build before Today)** — shadcn `dialog` (gives focus trap + initial focus on the hook input + body-scroll lock + Escape/backdrop close). Fields in README order: date + 8 band buttons, hook + 4 type chips, the **tipping-scale SVG** (`300×78`, `rotate(±8/0)` beam, `transition .5s cubic-bezier(.34,1.3,.64,1)`), two direction cards with the note that changes per pick, status-effect select (+ description), skill select, value, **move (label/placeholder flips toward/away)**, workable, then the flexibility check (5 rows × `0 1 2`, running `n/10`), full-width dark Save. Save is a no-op when hook is empty; on success prepend + reset (keep band) + close. Opens from Today (day=today), Episodes (day=today), Journal (day=selected).
- **Today (Step 7, `/`)** — `1.35fr 1fr` grid; header with `mono TUE 1 SEP · DAY 34`; full-width alert frame; morning card (three labelled `rows=2` textareas OPEN/AWARE/ENGAGED + TOWARD input, **"Save morning" → "Saved ✓" 1.8s** via `saveMorningAction`); dark "Today so far" card with per-episode chips + **"Write an episode →"** (opens modal) + ghost "Open today in the journal"; evening card (four textareas + "Save evening").
- **Episodes (Step 8, `/episodes`)** — single col `max-width:860px`; header with `mono "7 of 11 shown"` + dark "＋ New episode"; filter bar (segmented All/Toward/Away + 3 selects + text input + Clear) with **filter state in URL search params** (`?dir=…&effect=…&skill=…&band=…&q=…`); episode cards (date/band/dir pill/`n/10`, hook, situation, 3 chips, 5 axis bars, move, workable); dashed empty state.
- **Journal (Step 9, `/journal`)** — `220px minmax(520px,1fr)`; left: segmented 7/30/All + date jump, day list (generated from the **range**, not stored rows; dim empty days); right: last-7 table, the **day-strip SVG** (the signature graphic — 8 columns, axis at `top:47px`, toward markers above / away below, every marker a button with `title`, adaptive sizing), selected-episode card (dir-tinted), morning/evening cards ("— not written" fallbacks), episodes-this-day list + "Add an episode to this day" (opens modal pre-filled with selected day). **Selected `day` and `ep` live in URL search params.**
- **Progress (Step 10, `/progress`)** — `1fr 1fr`; toward/away split + 8-band stacked chart; **flexibility radar SVG** (`300×224`, recent-5 solid green vs previous-5 dashed grey, per-axis deltas); status effects (all six, count/share/bar/desc); recurring hooks (via `HOOK_GROUPS`); skill usage (6 bars + untouched-skills nudge); dark **boss-test** grid (one cell/episode chronological, green=toward, with the self-observation caption).
- **Reference (Step 11)** — three `max-width:900px` static pages from the ported constants: `/reference/flexibility` (lead, dark definition card, three pillars, "what it is not", "how it grows", "how this app reads it"), `/reference/loop` (5 numbered cards + closing dark card, read-only), `/reference/vault` (shadcn `tabs`: Core map/Concepts/Skills/Basement, single-open accordion cards with evidence tags + 4 labelled layers).

---

## Localization (Step 2.5)

Build an **i18n scaffold now, English content only** — RU stays a stubbed catalog to fill later (RU therapeutic copy needs product-owner review per README, so it is not authored here).

- **Library**: `next-intl` (App Router-native, works in server + client components).
- **Locale strategy**: single-user app, so **do not** add a `/[locale]` path segment (it would restructure every route). Resolve the active locale from `user_settings.settings.locale` (with a cookie fallback and `en` default) in the request scope; expose a small locale switch in the sidebar bottom that writes the setting.
- **Catalogs**: `src/i18n/messages/en.json` (the source of truth — every UI string, including the design's verbatim copy: alert-frame text, morning/evening prompts, modal labels, direction notes) and `src/i18n/messages/ru.json` (same keys, values stubbed/empty → fall back to `en` until translated).
- **What stays out of the catalog**: the reference-data constants in `src/lib/act/constants.ts` (STATES/SKILLS/AXES descriptions, LOOP_REF, LIB, FLEX_* copy) carry therapeutic framing and are English-final. For v1 keep them as English TS constants; when RU is authored, these become locale-keyed too (structure the constants so a `ru` variant can be slotted in — e.g. label/description keyed by locale — without a rewrite).
- **Discipline from Step 5 onward**: no hard-coded user-facing strings in components — every label/paragraph reads from the catalog via `useTranslations`/`getTranslations`. This is the whole point of scaffolding now; retrofitting later is the expensive path.

## Design tokens & type (Step 1)

Add to `globals.css` (`docs/design/README.md` §"Design tokens"):
- Page background token `oklch(0.97 0.004 85)` (warm off-white — distinct from `--card`/`--background`).
- Accent tokens: **toward** `oklch(0.5 0.1 158)` + tint/border/muted; **away** `oklch(0.62 0.12 50)` + tint/border/muted; **aware** blue `oklch(0.5 0.1 250)`; **alert** frame trio. Add `.dark` variants for toward/away/aware (README Known gap #7 — invent sensible dark values).
- Semantics rule to honour throughout: **toward is never "good", away is never "bad"**; away is amber, not red; never rank/congratulate/colour-code the flexibility total.
- Fonts: load Inter (400/500/600), Newsreader (400), JetBrains Mono (400/500) via `next/font/google` in `src/app/layout.tsx`, expose as CSS vars, map to Tailwind. Prose paragraphs get `text-wrap: pretty`. Radii/spacing per README §Geometry (cards 14px, modal 16px, inputs 8–10px, etc.).

---

## Verification

1. `pnpm db:up && pnpm db:migrate` — confirm `0003_act_tables.sql` applies and (as `act_app`) inserting/selecting an episode works (proves the GRANTs + RLS). `pnpm db:create-user` if no user exists.
2. `pnpm dev`, sign in, then walk the loop end-to-end:
   - Today → "Write an episode →" → fill modal (leave hook empty → Save is a no-op; add hook → saves) → episode appears in "Today so far" and Episodes.
   - Save morning / evening → "Saved ✓" flash → reload → values persist.
   - Episodes → apply each filter → URL updates, results narrow, Clear resets; empty state shows.
   - Journal → pick a day and a marker → URL has `?day=&ep=`, reload preserves selection; day-strip markers select episodes; "Add an episode to this day" pre-fills the modal's day.
   - Progress → all six cards render and numbers match the episodes logged (change data, numbers update live); streak + "day N" in the sidebar/header are computed, not hardcoded.
   - Reference pages render with verbatim copy; Vault tabs + single-open accordion work.
3. Toggle dark mode on every view — toward/away/aware accents legible.
4. Resize across 1240 / 1040 / 900px breakpoints — grids collapse, sidebar becomes a top bar.
5. `pnpm lint && pnpm test && pnpm build` all clean. (Use the Browser/preview tools or the `run` skill to screenshot key views for a visual diff against the `.dc.html` prototypes.)

## Deliberately out of scope for v1 (README "Known gaps")
No `weight` control (defaults to 1); hook grouping stays the static `HOOK_GROUPS` matchers; no episode edit/delete; mobile is responsive-collapse only (not designed); reference data stays in TS constants, not the DB. **RU translations are not authored in v1** — the i18n scaffold and EN catalog ship, RU keys stay stubbed (falling back to EN) until translated content is reviewed.
