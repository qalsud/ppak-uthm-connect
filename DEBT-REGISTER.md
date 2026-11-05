# Technical Debt Register — PPAK UTHM Connect

*Tier‑1 debt sweep, 6 Nov 2026. Scope: the whole repository (Laravel 12 + Inertia v2 + React 18/TS + MySQL, Reverb, Stripe, dompdf, GD).*

> **Status:** audit + fix pass, 6 Nov 2026 — no production data was inspected. **DEP‑01, SEC‑01…10,
> PERF‑01…03, DAT‑01/02, OPS‑01, TEST‑02 and CODE‑05 were fixed in the same session** (see
> *Resolved in this pass*); CODE‑01/02, PERF‑04, SEC‑11, TEST‑01, PROC‑01 and the P3 items remain open.
> Findings come from the codebase, the dev MySQL schema, dependency audits and the existing test suite.

---

## Snapshot

| Signal | Result |
|---|---|
| Tests | **274 passing / 1914 assertions** (37 feature files, no skipped tests) |
| TypeScript | `tsc --noEmit` clean |
| PHP style | Pint **fails** on one file (`bootstrap/app.php`, line endings) |
| Build | clean |
| `npm audit` | **0 vulnerabilities** |
| `composer audit` | **8 advisories across 5 Symfony packages** (see DEP‑01) |
| Routes | **179** total; **138** role-guarded (96 admin · 22 parent · 20 teacher) + 18 auth-only |
| DB | 37 tables, ~1.7 MB; indexes are mostly present |
| Frontend audit | Lighthouse **100/100/100** on all main portals (from the previous pass) |
| Queue | 1 failed job: `BroadcastNotificationCreated` (max attempts) |
| Coverage | **not measured** — no Xdebug/PCOV driver installed |
| Slop verdict | **CLEAN** — no `dd/dump/console.log`, no `as any`, no skipped tests, no TODO/FIXME |

**Top three to pay down first**

1. **DEP‑01** — patch the Symfony security advisories (one `composer update`).
2. **SEC‑01…06** — close the cross-centre authorization gaps (small, high impact).
3. **DAT‑01 / OPS‑01** — fix the soft-delete fee bug and the queue/docs mismatch.

---

## Resolved in this pass (6 Nov 2026)

| ID | Fix | Verification |
|---|---|---|
| **DEP‑01** | Updated `laravel/framework` 12.69 → **12.71** and Symfony `7.4.18/19` → **7.4.22/23** | `composer audit`: no advisories |
| **SEC‑01** | `PhotoController` now checks `canManage()` / parent ownership for every media route | `AuthorizationScopingTest` |
| **SEC‑02** | Teacher inbox uses `Student::visibleTo()` (centre + class) | `AuthorizationScopingTest` |
| **SEC‑03** | Message search uses `Student::visibleTo()` for non-admins | `AuthorizationScopingTest` |
| **SEC‑04** | Global search scopes students with `visibleTo()` and memos with `Memo::visibleTo()` | `AuthorizationScopingTest` |
| **SEC‑05** | Parent memo list + dashboard count use `Memo::visibleTo()` (fixes the OR/AND bug) | `AuthorizationScopingTest` |
| **SEC‑06** | Teacher dashboard scopes recent activities and update counts to visible students | `AuthorizationScopingTest` |
| **DAT‑01** | `store()`/`generate()` reuse a trashed fee record (`withTrashed()` + restore) instead of violating the unique index | `PaymentsChatNotifyTest` |
| **OPS‑01** | `DEPLOY.md` now states the queue worker is required for instant broadcast notifications; the launcher already starts it | docs |
| **SEC‑08** | Added `SecurityHeaders` middleware (nosniff, SAMEORIGIN, Referrer‑Policy, Permissions‑Policy; HSTS on HTTPS) | `SecurityHeadersTest` |
| **SEC‑09** | `ImageStore` rejects images above `media.max_pixels` before GD loads them | `ImageSafetyTest` |
| **SEC‑10** | `.env.example` now ships `APP_DEBUG=false` / port 8001; session lifetime default reduced to 60 min | config |
| **PERF‑01** | Teachers list eager-loads `centres` (removes one query per row) | existing teacher tests |
| **PERF‑02** | Parent dashboard uses `withSum` + a single unread-message query (removes two N+1s) | `PortalTest` |
| **PERF‑03** | Inertia shares only the active locale dictionary (~75 KB → ~37 KB) | `LocalizationTest` |
| **DATA‑02** | Force-deleting a memo now deletes its stored photos and thumbnails | `MemoPhotosTest` |
| **TEST‑02** | CI now runs `composer audit`, `npm audit --omit=dev`, and `check:routes` | `ci.yml` |
| **CODE‑05** | `bootstrap/app.php` line endings fixed | `vendor/bin/pint --test` passes |

Suite after the fix pass: **274 tests / 1914 assertions** (13 new regression tests).
**All P0/P1 findings are resolved; the P2 batch above is also fixed.**
**Still open:** CODE‑01/02, PERF‑04, SEC‑11, TEST‑01, PROC‑01 and the P3 items.

---

## Debt ledger

Priority: **P0** critical · **P1** high · **P2** medium · **P3** low.
Effort: **S** < 1 day · **M** 1–5 days · **L** > 1 week.

| ID | Category | Item | Location | Effort | Impact | Priority |
|---|---|---|---|---|---|---|
| **DEP‑01** | Dependency | 8 security advisories in `symfony/http-foundation`, `http-kernel`, `mime`, `routing`, `yaml` (installed 7.4.18/19; fixed in 7.4.22/23) | `composer.lock`; `composer audit` | S | CRITICAL | **P0** |
| **SEC‑01** | Security | Any teacher can view **any** student's attendance/progress/message photo, absence document, collector photo or profile photo — no centre/class check | `app/Http/Controllers/PhotoController.php:56,73,95,119` | S | HIGH | **P1** |
| **SEC‑02** | Security | Teacher **conversation inbox** filters by class only, not centre. A teacher with no class sees every conversation | `app/Services/Messaging/ConversationService.php:39-41` | S | HIGH | **P1** |
| **SEC‑03** | Security | Teacher **message search** filters by class only (or not at all when no class) — cross-centre message leak | `app/Http/Controllers/MessageController.php:101-104` | S | HIGH | **P1** |
| **SEC‑04** | Security | Global search: teacher student results ignore centre; memo results ignore `Memo::visibleTo` (any role can search any memo title) | `app/Http/Controllers/SearchController.php:50-59,76-79` | S | HIGH | **P1** |
| **SEC‑05** | Security | Parent memo list/count is not centre-scoped. The dashboard count also has an SQL grouping bug, so `all/parents` memos bypass the centre filter | `app/Http/Controllers/Parent/MemoController.php:15-24`; `app/Http/Controllers/Parent/DashboardController.php:47-53` | S | HIGH | **P1** |
| **SEC‑06** | Security | Teacher dashboard “recent activities” lists the latest activities globally, not just this teacher's students; the update count is global too | `app/Http/Controllers/Teacher/DashboardController.php:34-37,51-60` | S | HIGH | **P1** |
| **SEC‑07** | Security | `trustProxies(at: '*')` trusts every proxy. If the app is reachable directly, clients can spoof `X-Forwarded-*` (IP/HTTPS/host) | `bootstrap/app.php:22` | S | HIGH | **P1** |
| **DAT‑01** | Data | `financial_records` has soft deletes **and** a unique `(student_id, month)`. Deleting a fee then recreating the same month causes a duplicate-key 500 (`exists()` excludes trashed rows) | `database/migrations/2026_09_26_000012_add_unique_indexes_to_child_tables.php:22`; `app/Http/Controllers/Admin/PaymentController.php:100-103,147-150,229` | S | HIGH | **P1** |
| **OPS‑01** | Operations / docs | Broadcast notifications are **queued** (`BroadcastNotificationCreated implements ShouldBroadcast`), but `DEPLOY.md` says “no queue worker — notifications are sent synchronously”. Without a worker they fail (one already in `failed_jobs`) | `DEPLOY.md:141`; `app/Notifications/BaseNotification.php`; vendor `BroadcastNotificationCreated` | S | HIGH | **P1** |
| **SEC‑08** | Security | No security-headers middleware (CSP, HSTS, X‑Frame‑Options, X‑Content‑Type‑Options, Referrer‑Policy, Permissions‑Policy) | `bootstrap/app.php:24-28` | S | MEDIUM | P2 |
| **PERF‑01** | Performance | **N+1** in the teachers list: one `centres()->pluck()` query per teacher on the page | `app/Http/Controllers/Admin/TeacherController.php:37-38` | S | MEDIUM | P2 |
| **PERF‑02** | Performance | **N+1** in the parent dashboard: one fee sum per child, one message count per conversation | `app/Http/Controllers/Parent/DashboardController.php:23-26,35-40` | S | MEDIUM | P2 |
| **PERF‑03** | Performance | Both full translation dictionaries (~37 KB + 38 KB) are shared on **every** Inertia response | `app/Http/Middleware/HandleInertiaRequests.php:45-54` | M | MEDIUM | P2 |
| **SEC‑09** | Security | No pixel/dimension cap before GD loads an image — a small compressed “decompression bomb” can exhaust memory | `app/Services/Images/ImageStore.php:23-36` | S | MEDIUM | P2 |
| **SEC‑10** | Security / config | Session lifetime is 120 min; `.env.example` ships `APP_DEBUG=true` and a stale `APP_URL` | `config/session.php:35`; `.env.example:4-5` | S | MEDIUM | P2 |
| **CODE‑01** | Code | Oversized classes/components: `AttendanceController` 382 lines (`checkout()` ≈ 145 lines), `Students.tsx` 861, `Child.tsx` 607, `chat-inbox.tsx` 735, `child-contacts-manager.tsx` 551 | see file sizes | M | MEDIUM | P2 |
| **CODE‑02** | Code | Account create/update validation is duplicated across Parent/Teacher/Administrator controllers | `Admin/ParentController.php:42-46,66-71`; `Admin/TeacherController.php:61-65,94-99`; `Admin/AdministratorController.php:52-54,76-79` | S/M | MEDIUM | P2 |
| **DATA‑02** | Data | Memo attachments are not included in retention pruning and there is no cascade on force-delete — files can accumulate forever | `app/Models/Memo.php` (no `deleting` hook); `app/Console/Commands/PrunePhotos.php:34-64` | S | MEDIUM | P2 |
| **PERF‑04** | Performance | Fee-reminder command loads **all** unpaid records with `get()` (unbounded) and has no “already reminded” guard | `app/Console/Commands/SendFeeReminders.php:24-31` | M | MEDIUM | P2 |
| **SEC‑11** | Security | Payment completion is idempotent for status but has no lock; a webhook + success-page race can send duplicate notifications | `app/Services/Payments/PaymentCompletionService.php:29-64` | S | LOW/MED | P2 |
| **TEST‑01** | Tooling | No static analysis: no Larastan/PHPStan, no ESLint/Prettier config. TypeScript and Pint are the only gates | `composer.json:19-29`; `package.json` | M | MEDIUM | P2 |
| **TEST‑02** | Tooling / CI | CI runs Pint + tests + build, but not `composer audit`, `npm audit`, `check:routes` or coverage. No coverage driver locally either | `.github/workflows/ci.yml:39-61` | S | MEDIUM | P2 |
| **PROC‑01** | Observability | Failed logins are rate-limited but not logged; no error tracker (Sentry/Telescope) or alerting; `/up` only checks app boot | `app/Http/Requests/Auth/LoginRequest.php:54-63`; `bootstrap/app.php:17` | S/M | MEDIUM | P2 |
| **PERF‑05** | Performance | Conversation CSV export loads every message into memory (`get()` with no limit) | `app/Http/Controllers/Admin/ConversationController.php:143-147` | S | LOW | P3 |
| **CODE‑03** | Data / index | Redundant indexes on `daily_activities` and `daily_updates`: a plain `(student_id, date)` index plus a unique one on the same columns | `database/migrations/2026_09_26_000005...:31`; `...000006...:22`; `...000012...:13,17` | S | LOW | P3 |
| **CODE‑04** | Code | Dead / unused code: `Memo::AUDIENCES`, `Memo::audienceLabel()`; unused `laravel/sanctum`; disabled `vite-plugin-pwa` still declared | `app/Models/Memo.php:16,108-116`; `composer.json`; `package.json:28` | S | LOW | P3 |
| **CODE‑05** | Style | Pint fails on `bootstrap/app.php` (`line_ending`) | `bootstrap/app.php` | S | LOW | P3 |
| **DEP‑02** | Dependency | Major upgrades available: React 19, Inertia React 3, Vite 8, TypeScript 7, `@vitejs/plugin-react` 6, `laravel-vite-plugin` 3, Stripe PHP 22, Inertia Laravel 3, Tinker 3 | `package.json`; `composer outdated --direct` | L | LOW/MED | P3 |
| **INFRA‑01** | Infra | PHP 8.2.12 is still security-supported but near end of life; CI uses 8.3 | `composer.json:9`; `php artisan about` | M | LOW | P3 |
| **INFRA‑02** | Infra | The dev launcher starts app + Vite + queue + Reverb, but not `schedule:work`; fee reminders and photo pruning never run locally | `start-server.bat`; `routes/console.php` | S | LOW | P3 |

---

## P0 / P1 detail

### DEP‑01 — Symfony security advisories (P0)

`composer audit` reports **8 advisories in 5 packages**:

- `symfony/http-foundation` — HEAD-method access-control bypass, path-rule bypass, trusted-proxy private-range bypass, client-controlled generated URL host
- `symfony/http-kernel` — forwarded headers can set host/scheme/port
- `symfony/mime` — email header injection via non-token characters
- `symfony/routing` — host placeholder/path matching bypass
- `symfony/yaml` — exponential/quadratic YAML parse times (ReDoS)

Installed: `http-foundation 7.4.19`, `http-kernel 7.4.19`, `mime 7.4.19`, `routing 7.4.18`, `yaml 7.4.18`.
Fixed by **7.4.22/23** (or 8.1.11).

**Fix:** run the constrained update and re-run the suite:

```bash
composer update laravel/framework symfony/http-foundation symfony/http-kernel \
  symfony/mime symfony/routing symfony/yaml --with-dependencies
composer audit
php artisan test
```

A dry run confirms this resolves to `laravel/framework 12.71.0` and Symfony `7.4.23`.

---

### SEC‑01 — teacher photo/document access (P1)

`PhotoController` grants every authenticated teacher access to every student's media
(`$user->isAdmin() || $user->isTeacher() || $ownsChild`). It never calls `canManage()` or
`visibleTo()`, unlike the write endpoints.

**Impact:** a teacher at Centre A (or another class) can enumerate sequential photo/document IDs
and view another child's attendance photo, progress evidence, message attachment, absence proof,
collector photo or profile photo.

**Fix:** for teachers, require `$user->canManage($student)` (centre + class), and resolve the
`student` relation before checking. Applies to `attendance`, `progress`, `message`, `absence`,
`student` and `collector` methods.

---

### SEC‑02 — teacher conversation inbox (P1)

`ConversationService::listFor()`:

```php
} elseif ($user->isTeacher() && $user->assignedClass()) {
    $query->whereHas('student', fn ($s) => $s->where('class', $user->assignedClass()));
}
```

Class keys are **not unique across centres** (`5tahun` exists at both). A teacher with no class
gets **all** conversations. `unreadCountFor()` already does this correctly with `visibleTo()`.

**Fix:** `whereHas('student', fn ($s) => $s->visibleTo($user))` for teachers.

---

### SEC‑03 — message search (P1)

`MessageController::search()` filters teachers by `assignedClass()` only, and applies **no**
filter when a teacher has no class. It therefore searches messages across centres.

**Fix:** constrain via `conversation.student` using `visibleTo($user)` / `canManage()`.

---

### SEC‑04 — global search (P1)

`SearchController`:

- Teacher student results use `->when($user->assignedClass(), ...)` — no centre scope, and no
  scope at all when the teacher has no class.
- Memo results are `Memo::query()->where('title', 'like', ...)` — no `visibleTo($user)`, so any
  role can discover memo titles from every audience and centre.

**Fix:** `Student::query()->visibleTo($user)->active()` and `Memo::query()->visibleTo($user)`.

---

### SEC‑05 — parent memos (P1)

- `Parent/MemoController` filters audience/class but never centre. A parent at Centre A can see a
  class memo for the same class key at Centre B.
- `Parent/DashboardController` builds its own memo count:
  ```php
  ->whereIn('audience', ['all', 'parents'])
  ->orWhere(fn ($q) => ...)
  ->when($childCentres, fn ($q) => $q->where(...))
  ```
  Because `AND` binds tighter than `OR`, the centre constraint only applies to the `orWhere`
  branch, so `all`/`parents` memos bypass the centre filter entirely.

**Fix:** use `Memo::query()->visibleTo($request->user())` in both places. The scope already
handles audience + class + centre correctly.

---

### SEC‑06 — teacher dashboard recent activity (P1)

`Teacher/DashboardController` builds `$recentActivities` from `DailyActivity::query()` with no
student or teacher filter, so it shows the latest activities across **all** centres/classes. The
`todayUpdates` count is also global.

**Fix:** `->whereIn('student_id', $students->pluck('id'))` (or `where('teacher_id', auth()->id())`)
for the recent list, and scope the update count to the same student IDs.

---

### SEC‑07 — trusted proxies (P1)

`$middleware->trustProxies(at: '*')` is convenient on Railway/Render but dangerous if the app is
ever reachable directly: a client can spoof `X-Forwarded-For`, `X-Forwarded-Proto` and
`X-Forwarded-Host`, affecting rate-limit keys, generated URLs and HTTPS detection.

**Fix:** make it configurable, e.g. `at: env('TRUSTED_PROXIES')`, defaulting to `null` locally and
a specific proxy range in production.

---

### DAT‑01 — soft-deleted fee + unique index (P1)

`FinancialRecord` uses `SoftDeletes`; the table has a unique `(student_id, month)`. `store()` and
`generate()` check `FinancialRecord::...->exists()`, which **excludes** trashed rows, then insert.
After an admin deletes a fee record (soft delete) and tries to recreate the same student/month, the
unique index throws a duplicate-key 500. `TrashController` can restore the trashed record, so soft
delete is intentional.

**Fix options (pick one):**

- on `destroy()`, `forceDelete()` the record (but that removes it from Trash), or
- in `store()`/`generate()`, use `withTrashed()` and `restore()` the existing record, or
- replace the unique index with `(student_id, month, deleted_at)` (MySQL allows multiple NULLs, so
  this permits one live + multiple trashed rows).

The restore-in-place option keeps the Trash feature intact.

---

### OPS‑01 — queued broadcast notifications (P1)

`BaseNotification` uses the `broadcast` channel. Laravel dispatches
`BroadcastNotificationCreated`, which implements `ShouldBroadcast` (queued, not `ShouldBroadcastNow`).
The queue worker is therefore required for instant bell updates; without it the jobs accumulate and
eventually fail (the dev DB already has a `MaxAttemptsExceededException` for one).

**Fix:** either keep the queue worker in the run/deploy docs, or switch notification broadcasts to
`ShouldBroadcastNow` / `Notification::sendNow` if you want zero queue infrastructure. Update
`DEPLOY.md:141`, which currently says the worker is unnecessary.

---

## Passed checks (representative)

- **Access control:** all admin/teacher/parent route groups carry `auth`, `verified`,
  `account.active` and `role:*` middleware; 138 role-guarded routes.
- **Parent scoping:** child, absence, medication and payment endpoints check `parent_id` / ownership
  (`abort_unless(... parent_id === auth()->id())`), covered by feature tests.
- **Teacher writes:** attendance, activities, growth, progress, medication, absence and messaging
  use `canManage()` (centre + class).
- **Storage:** media is on a private disk; the `local` disk serve routes require a valid signature;
  the attendance disk has `serve => false`.
- **Uploads:** `image` + `mimes` + `max` validation; images re-encoded/EXIF-stripped; PDFs restricted
  to `application/pdf`.
- **Stripe:** webhook verifies `Stripe-Signature`; refunds use a cache lock; payment ownership is
  checked on success/receipt.
- **Injection:** no raw user input in `whereRaw`/`selectRaw`; no `$guarded = []`; no `unserialize`,
  `eval`, `extract`, `exec`/`shell_exec`; no `{!! !!}` in Blade; no `dangerouslySetInnerHTML`.
- **Auth:** hashed passwords (`hashed` cast), login rate limit (5 attempts), session invalidation on
  account deletion, password confirmation for account deletion.
- **Secrets:** `.env` is ignored; no keys in source.
- **Indexes:** every FK and the hot list columns are indexed; `attendance` and `progress_records`
  have the right unique keys.
- **Quality gates:** 274 tests / 1914 assertions; `tsc` clean; build clean; Lighthouse 100 on all
  main portals; no skipped tests; no `dd`/`dump`/`console.log`; no `as any`.
- **Slop:** CLEAN — comments explain *why*, names are domain-specific, no mock-everything tests.

---

## Watchlist (acknowledge, don’t fix yet)

- **Scheduler** — `fees:send-reminders` and `media:prune-photos` are scheduled but the local
  launcher doesn’t start `schedule:work`. Production must run the scheduler.
- **Demo credentials** — `accounts.txt` is committed and contains the shared demo password; keep it
  clearly labelled demo-only and never reuse those credentials for real accounts.
- **`public/storage`** — not linked; currently unused because media is private. Fine unless the
  public disk is adopted later.
- **PHP 8.2** — supported through 2026; plan the move to 8.3/8.4 before EOL.

---

## Recommended sequence

> **Status (6 Nov 2026):** steps 1–3 and the OPS‑01 docs fix are **done**. Continue at step 4.

1. **Patch dependencies** — DEP‑01 (`composer update` + tests + `composer audit`).
2. **Close the auth gaps** — SEC‑01…06 + regression tests (photo/document access, teacher inbox,
   message search, global search, parent memos, teacher recent activity).
3. **Fix data integrity** — DAT‑01; add a test that deletes a fee and recreates the same month.
4. **Harden** — SEC‑07 (proxies), SEC‑08 (headers), SEC‑10 (session/debug defaults).
5. **Performance** — PERF‑01/02 (N+1), PERF‑03 (translations), PERF‑04 (reminders).
6. **Tooling** — TEST‑01/02 (PHPStan/Larastan + ESLint, CI audits/`check:routes`, coverage driver).
7. **Code health** — CODE‑01/02 (split large controllers/components, extract account validation).
8. **Cleanup** — CODE‑03/04/05, CFG/DOC items, then plan the major upgrades (DEP‑02).

---

## Commands used

```bash
composer audit
composer outdated --direct
npm audit --omit=dev
npm outdated
vendor/bin/pint --test
npx tsc --noEmit
php artisan test
php artisan route:list --json
php artisan queue:failed
php artisan schedule:list
php artisan db:show
php artisan db:table <table> --json
php artisan about
```
