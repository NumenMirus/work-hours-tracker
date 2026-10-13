# Repository Guidelines

## Project Overview

"Registro ore": single-user web app (Italian UI) to log worked hours per day and per client. Primary flow is one tap on a **quick task** (name + default duration, fixed client) that adds its duration to the day total; manual entry is second; an explicit **timer** is third and never starts by itself. Entries can be undone, edited, restored without ever touching the quick task. Functional spec and acceptance criteria: `istruzioni_v2.md` (§7). Product/visual rules: `PRODUCT.md`, `DESIGN.md`.

Stack: SvelteKit 3 + Svelte 5 (runes) + TypeScript 6, Vite 8, `adapter-node`, SQLite via built-in `node:sqlite` + Drizzle ORM `1.0.0-rc.4`. Deployed bare metal (systemd, no Docker) in a Debian 13 LXC behind an HTTPS reverse proxy.

## Architecture & Data Flow

`request → src/hooks.server.ts (auth guard) → +page.server.ts load/actions → src/lib/server/repo.ts → Drizzle → SQLite → +page.svelte`

- **All domain logic lives in `src/lib/server/repo.ts`.** Functions take `db: Db` as first arg (testable with `createDb(':memory:')`), use the **synchronous** node-sqlite API (`.all()/.get()/.run()`, `db.transaction((tx) => …)`), validate input (trim, lengths, 1–1440 min) and throw `DomainError` (`src/lib/server/errors.ts`, codes `not_found|duplicate|in_use|archived|timer_running|no_timer|invalid`, `message` already in Italian). Routes only parse `FormData`, call repo, map errors.
- **Error mapping in actions:** `DomainError` → `fail(status, { action, error, field?, id? })` with 404 `not_found`, 409 `duplicate|in_use|timer_running|archived|no_timer`, 400 otherwise; non-domain errors are rethrown. Pages derive per-field/per-row errors from the `form` prop (`form?.action === 'x' && form.id === id`).
- **Unexpected errors:** `handleError` in `src/hooks.server.ts` logs unknown errors (timestamp, method, path, stack → `journalctl -u registro-ore`) and returns an Italian generic message; framework 404/405/413 are translated and not logged. `src/routes/+error.svelte` renders them inside the app shell; `src/error.html` is the self-contained fallback when the layout itself fails (no tokens, inline CSS). `getClientAddress()` can throw behind a misconfigured proxy: `routes/login` wraps it (`addressOf`) so login never 500s.
- **Expired sessions:** a request with a cookie that no longer validates redirects to `/login?sessione=scaduta` (the login page explains it); without cookie it redirects to plain `/login`.
- **Limits:** `EntryList` renders the 100 most recent entries of a day with a "Mostra le altre N" button (totals always come from the server over all rows). `addDays` never leaves years 0100–9999 (returns the input day at the edges).
- **Success + feedback:** actions return `{ toast: { message, action?: { label, formAction, entryId } } }`; `withToast()` (`src/lib/enhance.ts`) shows it via `src/lib/toast.svelte.ts` (single global toast: 6 s, 12 s when it has an action). Compose extra effects with `onSuccess(withToast(), effect)` (`src/routes/onSuccess.ts`). "Annulla" of an add uses `undoAdd` (soft delete, no new toast); deletes use `deleteEntry` → toast "Ripristina" → `restoreEntry`. Ctrl/⌘+Z runs the toast action (outside text fields). Entries deleted today stay recoverable from the "Eliminate (N)" list in `EntryList` (`listDeletedEntries`).
- **Focus after actions:** SvelteKit resets focus to `body` after every `use:enhance` submit. `withToast({ focus })` puts it back for keyboard users (`'self'` default = the submitter; `'next'` for forms in a row that can disappear → neighbour row or section `h2`; `'none'`). Use `withToast` (not bare `use:enhance`) on every form that mutates the list.
- **Entries are snapshots**: `addQuickEntry` copies task name/duration/client; editing/deleting a quick task never changes past entries (`quick_task_id` is `SET NULL`). `updateEntry` changes only client/activity/duration of that row (keeps `source`, `measured_minutes`). Moving an entry to an archived client is rejected; staying on one is allowed.
- **Soft delete:** `entries.deleted_at`; every read/total (`listEntries`, `getDayTotals`) filters `deleted_at IS NULL`. The day total never includes a running timer.
- **Timer is a singleton row** (`timer.id = 1`); its `day` is fixed at start; `stopTimer` (in a transaction) writes exactly one `source='timer'` entry with the user-corrected duration and `measured_minutes` = measured time (min 1), then deletes the row. A running timer must stay stoppable even if its client was archived (`routes/+page.svelte` mounts `TimerPanel` when `timer || clients.length > 0`).
- **Auth:** one password (`APP_PASSWORD`), `timingSafeEqual` on SHA-256 digests; cookie `rh_session` (httpOnly, lax, 30 d, `secure` outside dev); only the SHA-256 of the token is stored in `sessions`. Login rate limit in memory (`routes/login/+page.server.ts`): 5 failures/IP + 20 global per 15 min, map capped at 10k IPs. Everything except `/login` redirects (303) when unauthenticated, including action POSTs.
- **Day navigation:** `/?d=YYYY-MM-DD` (default `todayIn(APP_TIME_ZONE)`, invalid → 307 to `/`). Every form action on `/` must keep the query: `action="?d={day}&/addQuick"` (a bare `?/x` drops `?d=`).

## Key Directories

- `src/lib/server/` — server-only: `schema.ts` (Drizzle tables, source of truth), `db.ts` (`createDb`, `getDb`, migrations on open), `repo.ts`, `errors.ts`.
- `src/lib/` — shared: `types.ts`, `duration.ts`, `day.ts`, `enhance.ts`, `toast.svelte.ts`, `components/` (Button, DurationField, RunningClock, ConfirmButton, Toast).
- `src/routes/` — `+page*` (day view; local components `DayHeader`, `QuickTasks`, `ManualEntryForm`, `EntryList`, `TimerPanel`), `gestione/` (quick tasks + clients CRUD), `consuntivo/` (period report + `csv/` download; pure logic in `src/lib/report.ts`), `login/`, `logout/`.
- `drizzle/` — generated migrations (`<timestamp>_<name>/migration.sql` + `snapshot.json`). Committed, never hand-edited.
- `e2e/` — Playwright. `deploy/install.sh` + `.github/workflows/release.yml` — release/install.

## Development Commands

```bash
cp .env.example .env            # set APP_PASSWORD (>= 8 chars)
npm install
npm run dev                     # vite dev
npm run check                   # svelte-kit sync + svelte-check
npm run lint                    # prettier --check . && eslint .
npm run format                  # prettier --write .
npm run test:unit -- --run      # vitest (single: npx vitest run src/lib/duration.test.ts)
npm run test:e2e                # playwright install + playwright test (builds + previews on :4173)
npm run build                   # adapter-node → build/
npm run db:generate -- --name add_x   # after editing src/lib/server/schema.ts
npm run db:check                # drift check
```

Release: `git tag v0.1.0 && git push origin v0.1.0` (workflow builds `registro-ore-<tag>.tar.gz` = `build/ drizzle/ package.json VERSION`). Server install/update: `deploy/install.sh` / `sudo registro-ore-update`.

## Code Conventions & Common Patterns

- **Imports:** `#lib/...` alias (package.json `imports`) **with `.js` extension** even for `.ts` files (`import { x } from '#lib/server/repo.js'`). Never `$lib`. Internal links use `resolve()` from `$app/paths` (eslint `svelte/no-navigation-without-resolve`). `SubmitFunction`/`enhance` come from `$app/forms`.
- **SvelteKit 3 specifics:** no `svelte.config.js` (config in `vite.config.ts` → `sveltekit({...})`); env via `src/env.ts` (`defineEnvVars`) read from `$app/env/private` (`APP_PASSWORD`, `DATABASE_PATH`, `APP_TIME_ZONE`; `building` skips validation so CI builds need no secrets); `$app/env` replaces `$app/environment`; hook types from `@sveltejs/kit/hooks`; `refreshAll` replaces `invalidateAll`; `fail()` status propagates through `use:enhance`.
- **Server-only code** goes in a `server/` dir or `*.server.ts`. Do not open the DB at import time (`getDb()` is lazy).
- **Svelte 5 runes only** (`$props`, `$state`, `$derived`, `$effect` with cleanup, `$bindable`, snippets); `runes: true` is forced outside `node_modules`. No `export let`, no stores.
- **Styling:** scoped `<style>` per component using only tokens from `src/app.css` (`--ink`, `--primary`, `--live*`, `--space-*`, `--radius-*`, `--dur*`…). Fixed rem type scale, one font (Inter Variable), `.num` for tabular numbers. Never hardcode colors/radii (the impeccable detector flags values outside the DESIGN.md scale).
- **Design bans (DESIGN.md/PRODUCT.md):** no modals (inline edit, two-step `ConfirmButton`), no side-stripe borders > 1px, no gradient text, no shadows except the toast, no uppercase-tracked eyebrows or `01/02` numbering, amber (`--live`) **only** for the running timer, primary accent sparingly. Never disable quick-task buttons while submitting (each tap is a distinct entry). Respect `prefers-reduced-motion` (`--dur*` → 0, use `prefersReducedMotion` from `svelte/motion` for Svelte transitions), touch targets ≥ 44px under `(pointer: coarse)`, WCAG 2.2 AA.
- **Language:** all UI strings, errors and comments are Italian. Durations are minutes (int); parse with `parseDuration` (`20`, `1:30`, `1h30`, `1,5h`), show with `formatDuration`, prefill with `formatDurationInput`. Dates are `YYYY-MM-DD` strings (UTC arithmetic in `src/lib/day.ts`), timestamps ISO UTC.
- **Copy:** terminology is fixed in `PRODUCT.md` (registrazione, task rapida, giornata; eliminare/ripristinare, annullare, archiviare): reuse it, never mix synonyms. Toasts that confirm a registration always read `<attività> +<durata> · <cliente>` (quick add, manual add, timer stop); delete/restore read `Eliminata: …` / `Ripristinata: …`. Error messages say what happened and what to do next (e.g. `Il timer è già stato fermato o scartato: ricarica la pagina.`), never blame the user. Don't use "tocca" in copy shared by desktop and touch ("scegli"). Tests assert on these strings: update `e2e/registro.e2e.ts` when you change them.
- **Naming:** SQL snake_case, TS camelCase, components PascalCase, CSS classes kebab-case, form fields camelCase (`clientId`, `taskId`, `duration`), action names camelCase.
- **Flex gotcha:** a `flex: 1 1 14rem` on children becomes a _height_ when the row switches to `flex-direction: column` — reset to `flex: 0 0 auto` in mobile media queries.
- **Adaptation (input, not just width):** every control reads its height from `--control-h` (40px; `app.css` raises it to 44px under `(pointer: coarse)` in one place: never add per-component coarse overrides). Gate `:hover` styles in `@media (hover: hover)` and give touch feedback with `:active`. Row actions are hidden until hover only when `(hover: hover) and (pointer: fine) and (not (any-pointer: coarse))`. Breakpoints: 560px (phone: compact header, two quick tasks per row, full-width total row), 768px (two-column day view), 960px (desktop paddings, non-sticky day header). The day header is sticky only when `min-height: 560px` (landscape phones keep it static). Respect safe areas (`viewport-fit=cover`, `env(safe-area-inset-*)`). Verify touch layouts with Playwright device profiles (`devices['iPhone 13']`, `iPad (gen 7)`), which do match `(pointer: coarse)`; the omp headless browser does not.

## Important Files

- `src/lib/server/schema.ts`, `src/lib/server/repo.ts`, `src/lib/server/db.ts`
- `src/routes/+page.server.ts` (day view actions), `src/routes/gestione/+page.server.ts`
- `src/hooks.server.ts`, `src/env.ts`, `src/app.css`, `vite.config.ts`, `drizzle.config.ts`
- `deploy/install.sh`, `.github/workflows/release.yml`, `DESIGN.md`, `PRODUCT.md`

## Runtime/Tooling Preferences

- **Node ≥ 22.17** (`engines`, `.npmrc` `engine-strict=true`; Node 24 in CI), **npm** (lockfile committed). TypeScript must stay on `^6` (Kit 3 peer), Vite `^8`.
- **`dependencies` is intentionally empty:** everything is a devDependency because adapter-node bundles it into `build/`; production runs `node build` with no `node_modules`. Don't add runtime packages that cannot be bundled (native addons such as `better-sqlite3` are out). `drizzle-orm`/`drizzle-kit` are pinned exactly to the `rc` (stable 0.45 has no `node:sqlite` driver).
- **Migrations:** edit `schema.ts` → `npm run db:generate -- --name <x>` → commit `drizzle/`. They are applied on DB open from `MIGRATIONS_DIR` (default `drizzle`, relative to cwd; production cwd is `/opt/registro-ore/current`, so the release must contain `drizzle/`).
- Prettier: tabs, single quotes, no trailing commas, width 100; `drizzle/` and `static/` are prettier-ignored. `.env`, `data/`, `build/`, `.svelte-kit/` are git-ignored (`.env.example`, `.env.test` are tracked).
- **Production env** (`/etc/registro-ore/registro-ore.env`): `APP_PASSWORD`, `DATABASE_PATH=/var/lib/registro-ore/registro-ore.sqlite`, `PORT`, `PROTOCOL_HEADER`, `HOST_HEADER`, `ADDRESS_HEADER=X-Forwarded-For`, `XFF_DEPTH`. Login only works through the HTTPS proxy (secure cookie + CSRF origin from forwarded headers); the proxy must append the client IP to `X-Forwarded-For`. systemd unit deliberately omits `ProtectSystem`/`PrivateTmp` (unprivileged LXC).
- **Git:** commits in Italian, Conventional Commits with scope (`feat(giornata): …`, `fix(auth): …`, `docs(design): …`, `test(e2e): …`), single subject line plus a detailed body explaining the why. Commit autonomously in logical steps; **never push** unless explicitly asked.

## Testing & QA

- **Unit (Vitest, `server` project, node env):** `src/**/*.test.ts` — `duration.test.ts`, `day.test.ts`, `server/repo.test.ts` (fresh `createDb(':memory:')` per test with real migrations; needs `.env.test` because Kit validates env at boot). Add repo tests for any new domain rule, especially totals (e.g. 20 + 60 = 80 min), snapshot independence, soft delete/restore, timer.
- **E2E (Playwright, Chromium 1280×800, 1 worker, serial):** `e2e/*.e2e.ts` (suffix required by `testMatch`), `e2e/global-setup.ts` wipes `data/e2e.sqlite*`. `webServer` = `npm run build && npm run preview -- --port 4173` with `APP_PASSWORD=e2e-password-1`. The scenario in `e2e/registro.e2e.ts` covers the acceptance criteria of `istruzioni_v2.md` §7, the two-step confirm and keyboard use (focus kept, Ctrl+Z, recovery of deleted entries); extend it rather than adding parallel scenarios (tests share state). Use role/label locators and `expect` auto-retry; the only fixed wait is `settleFocus` (focus is restored a tick after the response). An armed `ConfirmButton` changes its accessible name to `Conferma eliminazione di …`: locate it by the new name.
- **Before finishing a change:** `npm run check && npm run lint && npm run test:unit -- --run`, and `npm run test:e2e` for UI/flow changes. For UI work also run `node ~/.agents/skills/impeccable/scripts/detect.mjs --json src` (expect `[]`) and eyeball 390×844 and 1280×800 in light/dark. No coverage threshold is enforced.
- Keep docs in sync: README "Installazione su Proxmox" with `deploy/install.sh`; `DESIGN.md` with `src/app.css` tokens.
