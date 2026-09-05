# Step 13 verification

Completed locally on 2026-09-05 against the ACT development server and local PostgreSQL database.

## Changes

- Added shared `inverse`, `inverse-foreground`, and `inverse-muted` tokens for the intentionally dark Today, Progress, and Reference cards. The Progress boss-test card previously inverted to a light background in dark mode, washing out its pale markers.
- Added `toward-foreground` so selected flexibility-check buttons use dark text on the brighter dark-theme green and light text on the light-theme green.
- Made the tipping-scale support and choice-point label follow theme tokens.
- Darkened the light-theme amber accent from `oklch(0.62 0.12 50)` to `oklch(0.55 0.12 50)` for small labels. The amber hue and neutral treatment of away moves remain intact.
- Allowed Journal's detail column to shrink within its grid. At 1041px, the old 520px minimum intruded 19px into the page padding. The table retains its own horizontal scrolling.
- Fixed the sidebar's singular streak label (`1 day`, with `0 days` and `2 days` unchanged).

## Automated checks

| Check | Result |
| --- | --- |
| `pnpm lint` | Passed; 74 files checked |
| `pnpm test` | Passed; 32 tests across 5 files |
| `pnpm exec tsc --noEmit` | Passed |
| `pnpm build` | Passed; all application routes built |
| `git diff --check` | Passed |
| Streak ICU message for counts 0, 1, and 2 | Passed |

## Database verification

`pnpm db:up` reported a healthy database. `pnpm db:migrate` confirmed all three migrations, including `0003_act_tables.sql`, were already applied.

Transactional checks against the actual `act_app` connection verified:

- The runtime role is neither a superuser nor a role with `BYPASSRLS`.
- Both ACT tables have RLS enabled and forced.
- The current identity can insert, select, update, and delete its own rows.
- An absent identity sees no rows. A different identity cannot read or delete the test account's rows, and cross-user inserts fail with PostgreSQL `42501`.
- The transaction-local identity clears after rollback.
- Episodes and both halves of the day entry saved through the browser reached PostgreSQL correctly.

All database probes were rolled back. A disposable test account was used for browser writes; its three episodes, day entry, account, settings, and sessions were removed after verification. Existing practice accounts and records were not changed.

## Browser verification

| Surface | Verified behavior |
| --- | --- |
| Authentication | Sign in, sign out, and unauthenticated redirect from a protected route |
| Today | All morning/evening fields save; both `Saved ✓` messages appear; all eight values persist after reload; Today-so-far updates after saving an episode |
| Episode dialog | Opens from Today, Episodes, and Journal; hook receives initial focus; focus stays inside; body scrolling is locked; Escape and backdrop dismiss; empty hook does not save; direction notes and move label change; status/skill dropdowns work; checks total correctly; saving resets fields and preserves band |
| Episodes | Toward/away, status, skill, time, and text filters; URL updates; filtered empty state survives reload; Clear restores all results and clears the URL; unfiltered empty state renders |
| Journal | 7/30/All day ranges; native keyboard date jump; day/episode URL selection survives reload; markers select episodes; selected day pre-fills the modal; backdated save updates the selected day; morning/evening reflections and unwritten fallbacks render |
| Progress | Split, time bands, radar, all six status effects, skill counts, and boss-test cells match logged data; empty data yields zeroes rather than invalid values |
| Reference | All three pages render in light and dark modes; all four Vault tabs work; opening a card closes the previous card |
| Shell | Sidebar episode count, streak, and Today day number update with saves; Russian stub falls back to English copy after locale persistence/reload |

The three browser-created episodes were one toward and one away today, plus one toward yesterday. Observed totals were 2 toward / 1 away (67% / 33%), a two-day streak, and `DAY 2`. Check vectors produced displayed radar averages of 1.0, 0.3, 0.3, 0.7, and 0.7. Status counts were Cognitive Fusion 2 and Experiential Avoidance 1; skill counts were Notice 2 and Accept / Make room 1.

No browser console warnings or errors were recorded during the walkthrough. This was a browser-driven manual verification, not a newly added automated end-to-end suite.

## Theme and responsive checks

Inspected screenshots of all seven pages in both themes, including the modal, direction cards, selected check buttons, Journal markers, radar, alert frame, Vault selection, and fixed dark cards.

Checked all seven pages at 375, 899, 900, 1040, and 1240px. Also checked Today/Progress at 1241px and Journal at 1041/1241px. No document-level horizontal overflow was found. Journal's corrected grid children fit their container at 1041px. The sidebar becomes a top bar below 900px; the table and mobile navigation scroll within their own containers. The 375px modal fits within the viewport and scrolls internally. The browser viewport override was reset afterwards.

Calculated contrast from the final opaque OKLCH tokens after conversion to linear sRGB:

| Foreground / background | Light | Dark |
| --- | --- | --- |
| Toward / toward tint | 5.42:1 | 6.55:1 |
| Away / away tint | 4.73:1 | 6.61:1 |
| Away / page | 4.65:1 | 8.73:1 |
| Aware / card | 5.98:1 | 7.26:1 |
| Alert label / alert tint | 6.17:1 | 6.42:1 |
| Selected check text / toward | 5.46:1 | 7.64:1 |
| Inverse muted / inverse | 8.95:1 | 8.95:1 |

These measurements cover the listed token pairs, not a full accessibility audit of every element and state.
