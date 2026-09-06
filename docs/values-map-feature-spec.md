# Feature Specification: Personal Values Map

Status: Aligned with the current ACT working tree; ready for implementation planning  
Reviewed: 2026-09-06 (working tree based on commit `2342043`, including local changes)  
Target: `/Users/macsergeibalanov/Desktop/projects/personal/ACT`  
Scope: A new feature integrated into the current product

## 1. Purpose

Help the user define personally meaningful values across four life domains and use those values when choosing everyday actions.

The app already supports daily practice and ACT learning. This feature supplies the personal values map behind prompts such as “What matters here?” and connects it to Today, the New episode dialog (Choice Point), and Evening review.

Reuse the existing Next.js App Router architecture, protected route group, UI components, server actions, session authentication, and PostgreSQL persistence. The paths below are relative to the ACT project root. Items marked **new** are proposed additions, not existing implementations.

### Project terminology and implementation locations

| Plan concept | Current ACT equivalent and implementation location |
| --- | --- |
| My Values | **New** `/values` protected route at `src/app/(protected)/values/page.tsx`; **new** `src/components/values/values-view.tsx` and `value-picker.tsx`. Add a Daily navigation item in `src/components/app-sidebar.tsx`. |
| Morning practice | Today (`/`), “Morning set-up”: `src/app/(protected)/page.tsx` loads data; `MorningCard` in `src/components/today/today-view.tsx` edits `DayMorning`. Place the picker beside ENGAGED (`morning.engaged`) and reuse TOWARD (`morning.toward`) for the planned action. |
| Choice Point | The existing New episode dialog, not a separate route: `src/components/episodes/new-episode-dialog.tsx`. Its provider is mounted in `src/app/(protected)/layout.tsx`; entry points use `src/components/episodes/new-episode-trigger.tsx`. Extend this shared flow so the picker works from Today, Episodes, and Journal. |
| “What matters here?” | The episode dialog's existing value input (`FormState.value` → `Episode.value` → `episodes.value`), with wording in `episodeModal` translations. The same question appears in the read-only Orient step of `/reference/loop`; that reference page is not the form to integrate. |
| Toward Move / daily action | Morning planning uses `morning.toward`; a logged episode uses `Episode.move` plus `Episode.dir` (`toward` or `away`). Neither is a separate task/action entity. Saving an intention must not automatically create an episode or mark an action completed. |
| Evening reflection | Today → “Evening review”, `EveningCard` in `src/components/today/today-view.tsx`. Reuse `evening.flex` for values-related reflection and `evening.next` for the next step. |
| Explore / explanation article | The app has Reference → Vault (`/reference/vault`), not Explore. Extend the existing “Orient to values” card under Skills: `src/components/reference/vault-view.tsx`, `LIB.Skills[4]` in `src/lib/act/constants.ts`, and `act.vault.Skills.4` in both message catalogs. |
| Personal value model | **New** `PersonalValue` / snapshot types in `src/lib/act/types.ts`; stable domain constants in `src/lib/act/constants.ts`; **new** `src/actions/personal-values.ts` and `src/lib/db/personal-values.ts`. Existing `src/lib/db/values.ts` only converts PostgreSQL date values; it is not a personal-values repository. |
| Entry persistence | Extend `src/actions/day.ts` + `src/lib/db/day-entries.ts` for daily selection, and `src/actions/episodes.ts` + `src/lib/db/episodes.ts` for episode selection. Existing tables are `day_entries` and `episodes`, created by `migrations/0003_act_tables.sql`. |
| Historical display and search | Update `src/components/journal/journal-view.tsx` and `src/components/episodes/episodes-view.tsx` to display saved value information. Keep episode value text searchable through `src/lib/act/derive.ts`. Journal data comes from `src/app/(protected)/journal/page.tsx`. |
| Language and presentation | Add English and Russian copy to `src/i18n/messages/en.json` and `ru.json`, using existing `next-intl` conventions and `src/components/ui/` primitives. Do not translate persisted IDs or user-authored text. |

The four life domains are a new grouping for personal values. They are distinct from the five flexibility-check `AXES` (including `values`), the three Open / Aware / Engaged pillars, and the eight time `BANDS`. Do not replace those structures or make domain selection affect Progress scores.

## 2. Conceptual foundation

Use the four life domains from Russ Harris’s adaptation of Tobias Lundgren’s Bull’s Eye exercise:

| Stable domain ID | Display label | Includes |
| --- | --- | --- |
| `relationships` | Relationships | Partner, children, family, friends, colleagues, and other social relationships |
| `work_education` | Work & Education | Work, career, formal learning, and skill development |
| `personal_growth_health` | Personal Growth & Health | Physical and psychological self-care, personal development, and life skills |
| `leisure` | Leisure | Rest, play, hobbies, recreation, and creativity |

These are life domains, not values or levels of development. A value describes an ongoing quality of action; a goal describes an achievable outcome; an action is a specific step.

Example: Relationships → “Be an attentive and caring parent” → “Spend 15 minutes playing with my daughter with my phone put away today.”

The same value may apply to multiple domains. Examples are optional suggestions, never assigned to the user automatically. Users do not need to complete all four domains or distribute their attention equally across them.

Source: [Harris’s Bull’s Eye worksheet](https://thehappinesstrap.com/upimages/Bulls_Eye_Worksheet.pdf). The domain structure comes from this exercise. The proposed application workflow is a product design heuristic, not a validated assessment or a claim of clinical effectiveness.

## 3. User story

As a user, I want a personal values map organised by life domain so that I can quickly choose a meaningful direction during daily practice and revisit the underlying ideas when I want more depth.

## 4. Functional requirements

### A. My Values screen

- Add “My Values” at `/values` in the existing Daily navigation group, using the protected page and component locations above.
- Display four domain sections with the user’s active values.
- Let the user create, view, edit, archive, and restore a value.
- A value must have a non-empty title and at least one domain. Meaning and action examples are optional.
- Allow one value to belong to multiple domains without creating duplicate records.
- Keep archived values in a separate view and exclude them from new selections.
- Do not require onboarding, a minimum number of values, or completion of every domain.

Value editor fields:

| Field | UI label | Requirement |
| --- | --- | --- |
| Title | My value | Required; short phrase describing how the user wants to act |
| Domains | Where this matters | Required; select one or more domains |
| Personal meaning | What this means to me | Optional free text |
| Action examples | What this can look like | Optional list of concrete behaviours |

Suggested editor prompt: “How do you want to act in this part of your life?”

Empty-state copy: “Start with one area that matters to you right now. You can add the others whenever you want.”

### B. Morning practice in Today

- Add an optional value picker beside ENGAGED in the existing Morning set-up flow; retain the Open, Aware, and Engaged prompts.
- Allow selection of one primary value for the day, with optional domain filtering.
- Show its personal meaning and action examples on demand.
- Connect it to the existing action field, using the prompt: “What is one small action that would express this value today?”
- Save the planned action in the existing `day_entries.morning.toward` field; there is no separate daily action record or task system to extend.
- Allow the user to continue without selecting a saved value, retaining the existing free-text workflow.

### C. New episode dialog (Choice Point)

- In the New episode dialog, offer a compact picker of active values alongside the existing value text input. “What matters here?” describes this prompt, not a new screen.
- Allow selection of one relevant value. The saved morning selection for the episode’s chosen `day` may be suggested, but must remain changeable. Backdated episodes must not automatically inherit today’s selection.
- Link the selected value to the existing episode record alongside `move`; retain the user’s Toward/Away direction choice. A value may also provide context for an Away episode.
- Make the full map and explanations optional; the quick flow must remain usable without opening them.
- Do not automatically classify behaviour as Toward or Away based only on the selected domain or value. The user considers its function in context.

### D. Evening review in Today

- Pass the saved morning selection and `morning.toward` into `EveningCard` and display them when available. Currently the card only receives `day` and the evening fields; update shared state from the successful morning save so the review reflects it without requiring a reload.
- Add the optional prompt: “How did this value show up in what you did today?”
- Use the values prompt as optional contextual help for the existing `evening.flex` question (“Where did flexibility show up?”); do not add a duplicate reflection field.
- Support reflection on unplanned value-aligned actions, including days with no morning entry.
- Reuse `evening.next` for a short next-step note. Completion of the planned action is not a score of the user’s worth or flexibility.

### E. Optional explanation in Reference → Vault

- Expand the existing Vault → Skills → “Orient to values” card to cover domains, values, goals, and actions, retaining the existing short/practice/example/deeper format. No new Explore section or article system is needed.
- Include the four-domain map, one concrete example, and the source attribution.
- Link to this card from My Values using “What is a value?” Add a stable link target that selects the Skills tab and opens the card; Vault currently defaults to Core map and does not support targeted card navigation. Extend the card renderer as needed for the domain table and a clickable source attribution.
- Keep the explanation optional during all daily flows.
- Write original explanatory copy; do not reproduce the complete worksheet or book text.

## 5. Data and persistence

Extend the existing schema additively; the following are proposed storage decisions for this project:

- Add a `personal_values` table with a stable UUID, `user_id`, title, one or more domain IDs, optional personal meaning, action examples, timestamps, and archive status. Use a domain-ID array or equivalent multi-domain representation on one value record. Add a new migration after `0003_act_tables.sql` (proposed `migrations/0004_personal_values.sql`; confirm the next available number at implementation time). Do not rewrite applied migrations.
- Domain IDs are stable constants; display labels can be translated independently.
- Add optional nullable `valueId` and `valueSnapshot` fields to `DayMorning` and its existing `morning` JSONB object. Add nullable `value_id` and `value_snapshot` columns to `episodes`, mapped to `Episode.valueId` / `valueSnapshot`. Keep `morning.engaged`, `morning.toward`, and `Episode.value` as text; existing records without a selection remain valid.
- When attaching a value, derive its snapshot (title, personal meaning, domains) on the server from an owned value record. Preserve that snapshot on later unrelated entry saves; replace it only when the user explicitly changes the selection. Editing a personal value must not silently rewrite historical entries. For selected episodes, also retain the selected title in the existing `episodes.value` text field for current display/search compatibility; free-text-only episodes keep their original text.
- Archived values remain available to historical entries. Permanent deletion is outside this feature’s initial scope.
- Use server-only PostgreSQL repositories inside `withCurrentUserDb` from `src/lib/db/user-context.ts`. Follow existing ENABLE/FORCE RLS policies and explicit `act_app` grants. Resolve and validate owned, active values in the same transaction when attaching a new selection; preserve an unchanged archived selection on an existing entry; do not trust a submitted owner or snapshot. A foreign key alone does not validate ownership, and a reference inside JSONB needs explicit validation.
- Cross-device availability means saving to PostgreSQL and reading again after navigation/refresh. There is no existing realtime or offline synchronisation service to integrate. Extend the relevant server-action validation schemas, repository row mapping, and route revalidation for `/values`, `/`, `/episodes`, and `/journal` as applicable.
- Keep the daily JSONB merge behaviour that preserves the other half of the day. Define selection clearing explicitly (`valueId: null`, `valueSnapshot: null`); omitted keys mean unchanged and will not remove an existing selection.
- In the inspected project there is no saved-values collection or legacy value ID/link. Existing value content is free text in `episodes.value` and `morning.engaged`; preserve it verbatim and do not automatically convert it into personal values or guess domains. If a saved-values collection is introduced before implementation, reassess that migration and preserve its IDs and links.
- Update Journal’s `hasMorning` / `hasEvening` helpers when adding structured fields: they currently run a string `.trim()` check across `Object.values(...)`. A snapshot object must not reach that string-only check, and a saved value selection alone should count as a morning entry. Render historical selection details from the stored snapshot, not the live personal value record.

## 6. UX and failure handling

- Support both phone and desktop using the existing design system.
- Keep the value picker compact and keyboard accessible, with labelled inputs and clear validation messages.
- Do not lose unsaved daily-practice text when opening the map, reading help, or returning from the picker. Morning and evening drafts currently live in their card components, while the episode draft lives in the layout-level dialog provider. A plain route change can unmount Today and discard its drafts; use an in-place map/help surface or explicit draft preservation before adding navigation links to these forms.
- Show save failures and retain the current input for retry. Confirm persistence before displaying success.
- Use neutral language: no streak penalties, compulsory daily ratings, or automatic judgments about which domain needs improvement.
- Preserve the current interface’s time targets: Morning set-up ~2 minutes, Evening review ~5 minutes, and New episode under a minute. Full map editing stays optional and outside those quick flows.

## 7. Acceptance criteria

- [ ] My Values displays all four domains with the specified labels.
- [ ] The user can create a value in one domain and immediately use it in daily practice.
- [ ] One value can appear in several domains while remaining one editable record.
- [ ] The user can edit, archive, and restore a value.
- [ ] Archived values disappear from new pickers and remain visible in historical entries.
- [ ] Editing a value does not change its saved snapshot in earlier entries.
- [ ] Morning set-up links a value alongside `morning.toward`; New episode links a value alongside its existing `move` and chosen direction, including backdated entries.
- [ ] Evening reflection displays the relevant morning value and action when present.
- [ ] All practice flows still work without a selected value or a completed map.
- [ ] Opening help or the map preserves in-progress practice text.
- [ ] Saved values and selections are available on the user’s other device after refresh through the existing persistence layer.
- [ ] Failed saves preserve input and offer a retry.
- [ ] Existing episode value text and morning/evening JSONB fields survive the migration without automatic value creation.
- [ ] Journal accepts structured selection data without string-type errors and displays saved snapshots; existing episode value search still works.
- [ ] Clearing or changing a selection works without erasing other morning/evening fields or refreshing an unchanged historical snapshot.
- [ ] One user cannot read, modify, or attach another user’s personal values.
- [ ] “What is a value?” opens the intended Vault card, which distinguishes domains, values, goals, and actions.
- [ ] Navigation, domain labels, editor/picker copy, help, and save errors work in both English and Russian.

## 8. Delivery checklist

- [x] Inspect the current working tree and map plan terminology to its routes, components, and data fields (2026-09-06).
- [ ] Recheck relevant local changes and the next migration number before implementation.
- [ ] Implement additive data changes and legacy compatibility.
- [ ] Build My Values and a reusable compact value picker.
- [ ] Integrate the picker with Morning set-up and the shared New episode dialog, including suggestions for the selected episode date.
- [ ] Integrate the selected value with Evening review and historical Journal/Episodes displays.
- [ ] Extend the existing Vault “Orient to values” card, targeted help links, and both language catalogs.
- [ ] Verify the end-to-end flow, historical integrity, ownership checks, and mobile usability. During implementation, extend relevant action/derivation tests and `tests/db/isolation.test.mjs` for the new storage/linking behaviour; verify upgrade compatibility using the migration test setup. Run the existing `pnpm check`, `pnpm build`, and `pnpm test:db` checks with the latter using a disposable test database. These are future implementation checks, not part of this plan-only review.

## 9. Follow-up scope

Defer the interactive Bull’s Eye visualisation, periodic alignment ratings, advanced analytics, AI-generated values, custom domains, and a dedicated goals module. They can be considered separately after the personal map is usable in everyday practice.
