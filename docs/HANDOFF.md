# Session Handoff — PPAK UTHM Connect

*Updated 26 Nov 2026. The admin plan and a full UI/i18n sweep were completed 30 Sep 2026; realtime,
memo photos and the progress report shipped 10 Oct 2026; a UI/refactor + accessibility pass shipped
5 Nov 2026. On 26 Nov 2026 the UAT/UI-UX fix batch shipped (`d2d2e78`) and the redacted UAT baseline
was archived (`a218ec8`). The **PERMATA curriculum plan is on hold (KIV)** pending stakeholder input.
**Read this first in a new session.***

> **Session wrap — 26 Nov 2026.** Closed the high/medium UAT findings and the main UI/UX review
> items: login failure handling and container logging, strict teacher class/centre scope, attendance
> date/future/audit/approved-absence reconciliation plus an explicit Absent action, absence conflict
> validation, admin progress delete, centre-scoped fee generation, scheduler never-run state,
> parent fee receipts and teacher class-scoped memos. The app shell, profile, navigation, conversation
> rows and progress labels were polished. **303 tests pass on SQLite and Postgres 16**; Pint, PHPStan,
> ESLint, `tsc` and the production build pass. Everything is committed and pushed to `main`.
>
> **Pending:** live deployment, a fresh DB + photo backup, a clean demo reseed and a post-deploy UAT
> replay. SSH access to `187.127.114.77` is required (no key is configured on the workstation);
> use [`DEPLOY-PPAKUTHM.md`](DEPLOY-PPAKUTHM.md). The live `.env` must set `LOG_CHANNEL=stderr` before
> rebuilding, then `DEMO_SEED=true` only for the clean reseed and `DEMO_SEED=false` afterwards.
>
> **Deployment automation:** CI/CD is live. A successful CI run on `main` now deploys automatically
> (`AUTO_DEPLOY=true`), with a pre-deploy DB/photo backup and a `/up` health check. Nightly backups
> run at 03:00 MYT. The manual reseed workflow requires the `production-destructive` approval and the
> `/opt/ppak/.allow-reseed` marker. See [`GITHUB-ACTIONS.md`](GITHUB-ACTIONS.md).
>
> Local-only leftovers: `docker-compose.yml` has a user port edit, and the untracked original
> `UAT-REPORT-PPAKUTHM-2026-11-26.md` at the repo root contains plaintext demo passwords. Never
> commit it; the archived `docs/` copy is redacted.

---

## Read these, in this order

1. **`../README.md`** — the feature map
2. **`ADMIN-CONTROL-PLAN.md`** — the phased plan (all phases done) + issue register
3. **`FUNCTIONAL-REVIEW.md`** — module-by-module gaps
4. **`DEBT-REGISTER.md`** — prioritised technical-debt ledger (P0 dependency CVEs + P1 auth gaps first)
5. **`LITTLELIVES-COMPARISON.md`** — feature comparison / roadmap
6. **`DEPLOY.md`** — deploying the demo
7. **`DEPLOY-SUPABASE.md`** — Postgres + storage on Supabase (temporary hosting)
8. **`DEPLOY-SERVER.md`** — full stack on your own VPS with your own domain (or free DuckDNS) + HTTPS

---

## Current state (verified)

| | |
|---|---|
| Branch | `main`, pushed to `github.com/qalsud/ppak-uthm-connect` |
| Last commit | `a218ec8` (redacted UAT baseline); code batch `d2d2e78` |
| Tests | **303 passing** (`php artisan test`) — also **303 on Postgres 16** |
| Build | clean (`npm run build`, `tsc`, ESLint, Pint, PHPStan) |
| Route guard | `php artisan check:routes` — frontend route names verified |
| Static analysis | **Larastan/PHPStan** (baseline ratchet) + **ESLint** — both pass |
| Accessibility | **Lighthouse 100** (accessibility · best practices · SEO) on all main portals |
| Seeder | idempotent, re-runnable; verified with `migrate:fresh --seed` on SQLite |
| Working tree | local-only `docker-compose.yml` port edit + untracked original UAT report |

**All phases of `ADMIN-CONTROL-PLAN.md` are complete** (F · A · C · G · B · E · D) and the **issue
register is clear**.

> **Open decision — payment gateway.** Stripe is currently a **provisional adapter**; do not build
> more gateway-specific UI/logic until a provider is chosen. The payment-completion race (`SEC‑11`) is
> now fixed provider-agnostically, so the gateway choice no longer blocks it.

---

## What this session shipped

- **UAT + UI/UX fix batch (26 Nov 2026).** See [`FIX-PLAN-2026-11.md`](FIX-PLAN-2026-11.md) and the
  archived redacted [`UAT-REPORT-PPAKUTHM-2026-11-26.md`](UAT-REPORT-PPAKUTHM-2026-11-26.md).
  Login failures no longer 500 (stderr logging + storage ownership), teachers require a class and
  centre, attendance honours the selected date, rejects future edits, audits check-ins, reconciles
  approved absences and supports an explicit Absent reason. Parent absences reject past/same-day
  conflicts and approval is blocked when attendance exists. Added progress delete, negative overtime
  feedback, scheduler never-run state, centre-scoped fee generation, parent receipts and teacher
  class-scoped memos. Shell/nav/profile/conversation/progress UI polished. **21 new regression tests**;
  total **303 passing**. Deployment is pending SSH access.
- **Tier-1 debt sweep + P0/P1/P2 fixes (6 Nov 2026).** Added [`DEBT-REGISTER.md`](DEBT-REGISTER.md)
  (30 findings, P0–P3). Fixed the Symfony advisories (Laravel 12.71 / Symfony 7.4.22–23), closed the
  cross-centre authorization gaps in photos, conversations, message search, global search, parent
  memos and the teacher dashboard, fixed the soft-deleted fee/month duplicate-key bug, corrected the
  queue-worker deployment guidance, added baseline security headers, an image pixel cap, active-locale
  only translations, two N+1 fixes, memo file cleanup, CI dependency/route audits, shared account
  validation, chunked/idempotent fee reminders and failed-login logging. Added **Larastan/PHPStan +
  ESLint** as CI gates, extracted `CheckoutService`, and split `StudentFormDialog`,
  `ChildProgressCard` and the chat inbox (list/thread/composer/stream/picker) out of the largest files.
  P3 cleanup: redundant indexes dropped, unused `sanctum`/PWA dependencies removed, and the launcher
  now also runs `schedule:work`.
  **21 regression tests** added; all P0/P1 items, the first two P2 batches and static analysis are resolved.
- **Postgres/Supabase readiness (Nov 2026).** All migrations run on Postgres 16 and the **full suite
  passes there (282 tests)**. Search moved from `LIKE` to `whereLike()` (Postgres `ILIKE`), guarded by
  `SearchCaseTest`; added `phpunit.pgsql.xml`, a CI `backend-postgres` job, and
  [`DEPLOY-SUPABASE.md`](DEPLOY-SUPABASE.md) covering the session pooler, SSL, Supabase Storage S3,
  and the processes Supabase cannot run (PHP, queue worker, scheduler, Reverb).
- **UI/refactor + accessibility pass (5 Nov 2026).** De-duplicated the admin list screens onto shared
  hooks/components (debounced search, row selection, status/centre filters, bulk bar, responsive
  record card, filter tabs, accessible icon buttons). Extracted backend `Csv` + `AccountQuery`
  helpers and a `forActiveCentre` model scope; removed duplicate CSV import/export and account
  filtering. Fixed a conditional `useList()` hook call in the student form and the student bulk
  restore action. Added a skip link, table `scope`, bilingual notification strings, and automatic
  accessible names for form controls. Darkened the brand primary/destructive tokens and small
  status text for WCAG AA contrast. Lighthouse now scores **100/100/100** on all main portals.
- **Progress-report PDF (10 Oct 2026).** A per-child report generated from existing progress records,
  over a selectable period (defaults to the last 90 days). Downloadable by the **teacher/admin**
  (scoped to their class) and by the **parent** for their own child. Shared `ProgressReport` service +
  `pdf/progress-report` view (dompdf, landscape) so the report can't drift between roles.
- **Memo photos (10 Oct 2026).** Admins can attach up to **3 photos** to a memo (create or edit; remove
  existing ones while editing). Stored on the private disk via `ImageStore` and served through an
  authorised `memo.photos.show` route that mirrors `Memo::visibleTo`, so a photo is only visible to the
  same audience as the memo. Shown as lightbox thumbnails in the admin, teacher and parent memo lists.
- **Realtime chat (10 Oct 2026).** Laravel **Reverb** + Echo replace the 5s poll. `MessageSent`
  (`ShouldBroadcastNow`, so no queue worker is required) fans out to the thread channel **and** each
  recipient's user channel — the open thread updates instantly and the bell refreshes live. Channel
  authorization mirrors the controllers; polling stays only as a fallback while the socket is down.
  Requires `php artisan reverb:start` (the `composer dev` script now includes it).
- **Memo carousel + teacher nav + mobile date fix (10 Oct 2026).** Memo photos render as an inline
  scroll-snap **carousel** (swipe/arrows/dots, tap for the lightbox). The teacher mobile bottom bar
  swaps **Messages → Progress**, with Messages moved to the **header** next to the notification bell
  (same unread badge). Fixed the mobile date-picker icon clipping (full-width below `md`).

- **Phase B — Settings + money.** `settings` table + `setting('key', config('…'))` helper and
  **`/admin/settings`** (fee due day, absence window, message edit/length/attachments, photo
  retention/watermark/upload, reminder lead time, scheduler health). **Versioned, per-centre fee
  rates** (`/admin/fees`, closes **G-i5**); **editable fee records**; **Stripe transactions +
  refunds** (`/admin/transactions`).
- **Phase E — Oversight.** Student detail gained **absences / medication / growth**; the **activity
  log** gained user/action/date filters + **CSV export**; **admin conversations** can reply, delete,
  reassign and close; the **dashboard** gained a year filter, month-over-month and actionable tiles.
- **Phase D — Admin accounts.** **`/admin/administrators`** (create/edit/deactivate/delete) with
  guards for the **last active admin** and self-deletion.
- **Hardening.** Blank settings revert to default (were coerced to `0`); a lock prevents double
  Stripe refunds; parents are notified on refund; payments/transactions are centre-scoped.
- **UI/i18n sweep.** Dashboard chart/donut, Payments overdue+edit, Transactions mobile layout,
  admin chat layout, the admin sidebar **"Teacher views"** dropdown (a wrong-prop bug had hidden the
  admin sidebar on teacher screens), and localisation of the parent child/daily-update pages and the
  **auth + profile pages**. i18n parity is clean (0 missing keys, EN ↔ MS).
- **Enriched seeder + re-seed.** Fresh seed now demonstrates every feature (centres, attendance with
  an elevated temperature, medication, growth, an absence request, a per-centre fee, overdue fees,
  centre-aware memos, activity-log rows).

---

## Immediate next steps

0. **PERMATA curriculum integration** — [`PERMATA-CURRICULUM-PLAN.md`](PERMATA-CURRICULUM-PLAN.md)
   is **on hold (KIV)** pending **stakeholder input** (see §7 of that file). Researched and drafted,
   not built; resume when the stakeholder questions are answered.
1. **Pay down the rest of the Tier-1 debt register** — [`DEBT-REGISTER.md`](DEBT-REGISTER.md).
   Only **INFRA‑01** (local PHP 8.3+; CI/Docker already 8.3), **DEP‑02** (major upgrades) and **PROC‑01**
   (error tracking) remain.
2. **Hosting/deploy** — [`DEPLOY-SUPABASE.md`](DEPLOY-SUPABASE.md) for Supabase Postgres + Storage,
   then [`DEPLOY.md`](DEPLOY.md) (Railway or Hostinger). Ensure `migrate --force` runs and the
   scheduler (`schedule:run`) is active.
3. **Tier 2** ([`LITTLELIVES-COMPARISON.md`](LITTLELIVES-COMPARISON.md)) — growth chart, school
   calendar/events, light admissions pipeline. (Term progress-report PDF ✅ shipped 10 Oct 2026.)
4. **Realtime** ([`MESSAGES-REVIEW.md`](MESSAGES-REVIEW.md)) — ✅ **true realtime chat shipped** on
   Laravel Reverb (10 Oct 2026); still open: the **general/centre thread** (needs new schema).

### Issue register — clear

Full detail lives in `ADMIN-CONTROL-PLAN.md` → *Issue register*. The only previously-open item
(`G-i5`, per-centre fee rates) closed with Phase B; `G-i11` / `C-i5` / `C-i8` were accepted by
decision and documented.

---

## Environment (local dev)

- **URL:** `http://ppak-uthm-connect.test` (Laragon)
- **DB:** `ppak_uthm` / `ppak_uthm` / `ppak_secret`
- ⚠️ **XAMPP's MySQL owns 127.0.0.1:3306** — that is what the app uses. Laragon's MySQL is shadowed.
- Tests use **SQLite in-memory** (`phpunit.xml`), so `php artisan test` is DB-independent.
- **Realtime:** run **`php artisan reverb:start --port=8082`** (ws://localhost:8082) for live chat + bell; without
  it they fall back to polling. `.env` already holds generated `REVERB_*` keys.

### Demo accounts & data (from `--seed`)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@ppakuthm.com` | `password123` |
| Teacher | `teacher@ppakuthm.com` | `password123` |
| Parent | `parent@ppakuthm.com` | `password123` |
| Pending parent | `pending@ppakuthm.com` | `password123` |

A fresh `migrate:fresh --seed` produces: 11 users · **10 children (7 Khalifah Junior / 3 Taska
Hikmah)** · today's attendance (one with a 37.8 °C check-in) · medication, growth, an upcoming
absence · a **Taska-specific fee rate (RM 290 vs global RM 310)** · overdue fee records · centre-aware
memos · activity-log rows.

---

## Working agreements (learned the hard way)

1. **Verify after every edit.** The `edit` tool can fail on CRLF/whitespace mismatches and still
   report success. After a non-trivial edit, confirm (grep/syntax check/read back).
2. **Run the suite after each batch**, not at the end.
3. **Avoid PowerShell `-replace` for code edits** — it eats backticks. Use the `edit` tool, or
   `[System.IO.File]::WriteAllText` with explicit `::ReadAllText`.
4. **`php artisan check:routes`** exists to catch frontend/backend route-name drift.
5. Keep `ADMIN-CONTROL-PLAN.md` → *Issue register* updated as issues are found **and** fixed.
6. **After any migration, run `php artisan migrate` on the dev MySQL DB.** Tests use SQLite
   `:memory:` and rebuild the schema every run, so a missing table/column **passes the suite** and
   only surfaces in the browser as a `Column not found` 500. The demo `docker/entrypoint.sh`
   migrates automatically; local Laragon does not.

---

## Commands worth knowing

```bash
php artisan test                    # Pest suite
npm run build                       # tsc typecheck + Vite build
vendor/bin/pint app tests database  # code style
php artisan check:routes            # frontend route names vs registered routes
php artisan reverb:start --port=8082  # realtime WebSockets for chat (ws://localhost:8082)
php artisan migrate                 # apply pending migrations (dev MySQL!)
php artisan migrate:fresh --seed    # reset local DB with the full demo dataset
```

---

## Deferred / not planned

- **Pusher / Ably** — Reverb is the shipped transport; switching is a `BROADCAST_CONNECTION` change.
- **PWA / push** — not installed yet (no service-worker dependency); a later phase.
- Auth pages use Laravel Breeze defaults (now localised, styled with the app's design tokens).
