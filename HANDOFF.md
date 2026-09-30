# Session Handoff — PPAK UTHM Connect

*Written 30 Sep 2026 at the end of a long session. Read this first in a new session.*

---

## Read these, in this order

1. **`ADMIN-CONTROL-PLAN.md`** — the phased plan we are executing, plus the **issue register**
2. **`README.md`** — the feature map and handoff section
3. **`FUNCTIONAL-REVIEW.md`** — module-by-module gaps
4. **`LITTLELIVES-COMPARISON.md`** — feature comparison / roadmap

---

## Current state (verified)

| | |
|---|---|
| Branch | `main`, pushed to `github.com/qalsud/ppak-uthm-connect` |
| Last commit | `4535ffd` |
| Tests | **~201 passing** (`php artisan test`) |
| Build | clean (`npm run build`) |
| Route guard | `php artisan check:routes` — 91 frontend route names verified |
| Seeder | idempotent, re-runnable (`php artisan migrate:fresh --seed`) |

### ⚠️ Uncommitted work exists

There is an **uncommitted batch** clearing the issue register. Files touched:

```
app/Http/Controllers/Admin/StudentContactController.php
app/Http/Controllers/Admin/StudentController.php
app/Http/Controllers/Parent/DashboardController.php
app/Http/Controllers/Teacher/DashboardController.php
app/Http/Controllers/Teacher/MemoController.php
app/Models/Memo.php
app/Models/Student.php
app/Notifications/DailyUpdateSubmittedNotification.php
app/Support/Lists.php
database/seeders/DatabaseSeeder.php
resources/js/Components/child-contacts-manager.tsx
resources/js/Components/rating-chip.tsx
tests/Feature/ChildContactsTest.php
```

**First action in a new session:** run `php artisan test` and `npm run build`. If green,
commit this batch. It clears register items **C-i1, C-i2, C-i3, C-i4 (partial), C-i9,
G-i1, G-i2, G-i6, G-i7**.

---

## What has been completed

### Phases (see `ADMIN-CONTROL-PLAN.md`)

| Phase | Status | Commit |
|---|---|---|
| **F — Delete safety** | ✅ done | `9a407eb` |
| **A — Admin acts everywhere a teacher can** | ✅ done | `fdaa0c5` |
| **C — Editable lists** | ✅ done | `1885857` |
| **G — Two centres** | ✅ done except **per-centre fee rates (G8)** | `7ac8415` → `4e634f0` |
| **B — Settings + money** | ❌ not started | — |
| **E — Oversight views** | ❌ not started | — |
| **D — Admin accounts** | ❌ not started | — |

### Two centres — done

- `centres` table; `centre_id` on `students` + `memos`; `centre_user` pivot (teachers may
  work at **multiple** centres)
- Backfill: historical data → **Tadika Khalifah Junior**
- **`class` is centre-scoped everywhere** — `Student::scopeVisibleTo()` is the one place
  this lives
- **Access control fixed**: `canManage()` matched only a class *string*, so a `5tahun`
  teacher could manage the other centre's `5tahun` children. Now centre-first.
- Admin centre switcher (session-backed `App\Support\ActiveCentre`)
- `/admin/centres` CRUD (deactivate, never delete)
- Centre assignment on students (form) and teachers (multi-select)
- Dashboard, memos and parent views are centre-aware

**16 isolation tests** prove cross-centre leaks are closed
(`CentreScopingTest`, `CentreIsolationTest`, `CentreManagementTest`, `CentreScopingUiTest`).

### Admin-editable lists (Phase C)

- **`list_options`** table (`group`/`key`/`label`/`sort`/`is_active`) — one table, so adding
  a list needs no migration
- **`App\Support\Lists`** is the single source of truth: backend validation *and* frontend
  forms read it. Hardcoded `DEFAULTS` act as a fallback so an empty/unmigrated table never
  breaks the app.
- 14 manageable lists at **`/admin/lists`**
- `classLabel` was copy-pasted in **14 files**; now one `useClassLabel()` hook

---

## Immediate next steps

1. **Verify + commit the uncommitted batch** (see above).
2. **Finish clearing the issue register** — remaining items listed below.
3. Then continue with **Phase B** (settings + money), which also closes **G-i5**
   (per-centre fee rates).

### Issue register — what still needs doing

Full detail lives in `ADMIN-CONTROL-PLAN.md` → *Issue register*. Remaining:

| # | Item | Note |
|---|---|---|
| **C-i4** | Seeder writes literal values rather than list keys | Partly fixed; verify all groups |
| **C-i5** | Migration enum-ish defaults (`students.class` default `5tahun`, `progress_records` default `Select`) | Low risk; document rather than migrate |
| **C-i6** | `ProgressRecord::PERMATA/FREE/DEVELOPMENT` are still code-only lists | Would need a new list group + admin screen |
| **C-i7** | `DailyActivity::FIELDS` (12 checkboxes) is not a manageable list | Needs `list_options` + a columns decision — **bigger job** |
| **C-i8** | `PaymentController::MONTHS` not manageable | Low value; months are fixed |
| **G-i3** | Admin student/teacher lists have no centre **filter** (column added) | Add a centre filter dropdown |
| **G-i5** | **`FeeSetting` is global** — one rate for both centres | **Closes in Phase B**; highest-value remaining |
| **G-i9** | Teachers with **no centre** are unrestricted | Correct, but surface it in the UI as a warning |
| **G-i11** | `list_options` is still global — class lists aren't per-centre | Both centres currently share one class list |
| **G-i12** | Not a bug — dev DB needed a re-seed after adding centres | Informational |

**Already resolved** (can be struck from the register): C-i1, C-i2, C-i3, C-i9, G-i1, G-i2,
G-i4, G-i6, G-i7, G-i8, G-i10 — the last five were resolved by G9/G10 during Phase G.

---

## Environment (local dev)

- **URL:** `http://ppak-uthm-connect.test` (Laragon)
- **DB:** `ppak_uthm` / `ppak_uthm` / `ppak_secret`
- ⚠️ **XAMPP's MySQL owns 127.0.0.1:3306** — that is what the app uses. Laragon's MySQL is
  shadowed. There are three mysqld processes running.
- Tests use **SQLite in-memory** (`phpunit.xml`), so `php artisan test` is DB-independent.

### Demo accounts (from `--seed`)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@ppakuthm.com` | `password123` |
| Teacher | `teacher@ppakuthm.com` | `password123` |
| Parent | `parent@ppakuthm.com` | `password123` |

⚠️ A locally-seeded DB may still use the rotated demo password `Ppak-9ZmBdw-3266`. A fresh
`migrate:fresh --seed` produces `password123`.

---

## Working agreements (important — learned the hard way)

1. **Verify after every edit.** The `edit` tool silently fails on CRLF/whitespace mismatches
   and still reports success. After a non-trivial edit, confirm with a grep or a syntax check.
   When in doubt, read the file back or use a direct write.
2. **Run the suite after each batch**, not at the end. A test written against code that was
   never written wastes a lot of time.
3. **Avoid PowerShell `-replace` for code edits** — it eats backticks and mangles escapes.
   Use the `edit` tool, or `[System.IO.File]::WriteAllText` with explicit `::ReadAllText`.
4. **`php artisan check:routes`** exists precisely to catch frontend/backend route drift.
5. Keep `ADMIN-CONTROL-PLAN.md` → *Issue register* updated as issues are found **and** fixed.

---

## Commands worth knowing

```bash
php artisan test                    # Pest suite
npm run build                       # tsc typecheck + Vite build
vendor/bin/pint app tests database  # code style
php artisan check:routes            # frontend route names vs registered routes
php artisan migrate:fresh --seed    # reset local DB with demo data
```

---

## Deferred / not planned

- **Hosting** — user explicitly deferred; see `DEPLOY.md` (Railway or Hostinger).
- **Pusher realtime chat** — polling fallback is in place.
- **PWA / push** — intentionally disabled during development.
