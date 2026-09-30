# Session Handoff — PPAK UTHM Connect

*Updated 1 Oct 2026. The admin plan and a full UI/i18n sweep were completed 30 Sep 2026. The
**PERMATA curriculum plan is on hold (KIV)** pending stakeholder input. **Read this first in a new
session.***

---

## Read these, in this order

1. **`README.md`** — the feature map
2. **`ADMIN-CONTROL-PLAN.md`** — the phased plan (all phases done) + issue register
3. **`FUNCTIONAL-REVIEW.md`** — module-by-module gaps
4. **`LITTLELIVES-COMPARISON.md`** — feature comparison / roadmap
5. **`DEPLOY.md`** — deploying the demo

---

## Current state (verified)

| | |
|---|---|
| Branch | `main`, pushed to `github.com/qalsud/ppak-uthm-connect` |
| Last commit | `git log -1` |
| Tests | **248 passing** (`php artisan test`) |
| Build | clean (`npm run build`) |
| Route guard | `php artisan check:routes` — **103** frontend route names verified |
| Seeder | idempotent, re-runnable; **enriched** full demo (`php artisan migrate:fresh --seed`) |
| Working tree | clean |

**All phases of `ADMIN-CONTROL-PLAN.md` are complete** (F · A · C · G · B · E · D) and the **issue
register is clear**.

---

## What this session shipped

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
1. **Hosting/deploy** — [`DEPLOY.md`](DEPLOY.md) (Railway or Hostinger); ensure `migrate --force`
   runs and the scheduler (`schedule:run`) is active.
2. **Tier 2** ([`LITTLELIVES-COMPARISON.md`](LITTLELIVES-COMPARISON.md)) — term progress-report PDF,
   growth chart, school calendar/events, light admissions pipeline.
3. **Realtime** ([`MESSAGES-REVIEW.md`](MESSAGES-REVIEW.md)) — Laravel Echo/Pusher to replace polling;
   a general/centre thread.

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
php artisan migrate                 # apply pending migrations (dev MySQL!)
php artisan migrate:fresh --seed    # reset local DB with the full demo dataset
```

---

## Deferred / not planned

- **Pusher realtime chat** — polling fallback is in place.
- **PWA / push** — intentionally disabled during development.
- Auth pages use Laravel Breeze defaults (now localised, styled with the app's design tokens).
