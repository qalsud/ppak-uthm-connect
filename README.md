# PPAK UTHM Connect

A kindergarten / early-childhood management system for **Pusat Pendidikan Awal Kanak-Kanak (PPAK),
Universiti Tun Hussein Onn Malaysia** — covering **Taska Hikmah UTHM** and **Tadika Khalifah
Junior**.

Built on **Laravel 12 + Inertia.js + React (TypeScript) + Tailwind CSS v4 + shadcn/ui**, with a
single role-based login for **Admin · Teacher · Parent**, a **bilingual (BM/EN)** UI, attendance with
**temperature/health screening** and **watermarked check-out photos**, **medication** and **growth**
records, real **Stripe** payments + PDF receipts, and an **audit log**.

---

## Stack

| Layer | Choice |
|---|---|
| Backend | PHP 8.2+ · Laravel 12 |
| Frontend | Inertia.js v2 · React 18 · TypeScript · Vite |
| UI | Tailwind CSS v4 · shadcn/ui · Lucide |
| Database | MySQL 8 (SQLite in-memory for tests) |
| Payments | Stripe Checkout + webhooks |
| Receipts / reports | dompdf |
| Images | GD + FreeType (private disk, watermark, compression) |
| Realtime | Laravel Broadcasting (Pusher when keys are set; polling fallback) |
| Quality | Pest · Pint |

---

## Features (implemented)

### Admin (`/admin`)
- **Dashboard** — KPIs, a **year selector** for the monthly-income chart, a **month-over-month** delta, the **class split**, recent payments, and actionable **"unpaid this month" / "not checked in today"** tiles that link through.
- **Registrations** — Pending / Active / Rejected tabs, role filter, search, pagination, approve/reject (**single + bulk**).
- **Students** — CRUD, **CSV import/export**, **centre + class** filters, server-side search, pagination, parent dropdown, and a **student detail page** (attendance + photos, absences with proof, medication, growth, progress + photos, daily updates, activities, payments).
- **Teachers** — CRUD, CSV import/export, status + **centre** filters, password reset, bulk delete, and an **"unrestricted (no centre)" warning**.
- **Parents** — CRUD, children count, status filter, password reset.
- **Payments** — records CRUD **and field edit**, month/class/status filters, search, **overdue flags**, collected/outstanding summary, **bulk "generate monthly fees"** (each child at their **centre's rate**), mark paid/unpaid, **PDF receipt download**.
- **Transactions** — online (Stripe) payments: list, detail, and **refund** (a refund re-opens the covered months).
- **Fee settings** — **versioned** rates (create a new version, retire the old) with **per-centre overrides**.
- **Memos** — create/edit/delete with **audience targeting** (Everyone / Parents / Teachers / a class) and a **centre**.
- **Lists** — admin-editable fixed lists (classes, blood types, relationships, absence reasons, progress options, daily-activity fields, …): one source of truth for backend validation *and* frontend forms.
- **Centres** — CRUD (deactivate, never delete) plus a header **centre switcher** that scopes the whole admin portal.
- **Settings** — operational rules (fee due day, absence window, message edit/length/attachments, photo retention/watermark/upload size, reminder lead time) and **scheduler health**.
- **Administrators** — create/edit/deactivate admin accounts, with guards for the **last active admin** and self-deletion.
- **Conversations** — oversight of parent↔teacher threads: **reply as the admin**, delete messages, **reassign** the teacher, **close/reopen**.
- **Activity log** — audit trail filterable by **user / action / date range**, with **CSV export**.
- **Teacher views** — the teacher screens (attendance, activities, progress, growth, daily updates) grouped in a collapsible sidebar section; admins act on them directly.

### Teacher (`/teacher`)
- **Dashboard** — quick actions, KPIs, student list with class/status/update filters and attendance controls.
- **Attendance register** — by class + date, live counts, mark **"At school"** with an optional **temperature + health note** (amber **"Elevated"** flag at ≥ 37.5 °C), **allergies** flagged per child, **check out with a photo** (watermarked; documented override when a photo isn't possible), and history. Also carries the day's **medication requests** with mark-given / not-given.
- **Growth** — record height/weight per child/day with automatic **BMI** (same-day re-entry updates), a **class average BMI**, and latest-per-child + full history tables.
- **Daily activities** — PERMATA/KSPK checklist per child.
- **Daily updates** — see parent-submitted morning check-ins per class.
- **Progress** — grouped Lesson / Activities / Assessment form with helper text + rating chips, **optional photo**, per-student history with filters and a summary.
- **Messages** — parent ↔ teacher chat per child. **Memos**.
- **Admin parity** — every teacher screen is also reachable by admins under **Teacher views** in the sidebar (acting as the admin, logged to the audit trail).

### Parent (`/parent`)
- **Dashboard** — children cards with today's attendance (and check-out photo), outstanding-balance banner, quick actions.
- **Attendance** — read-only status + history with photos (marking is teacher-only).
- **Daily update** — submit a child's morning check-in (arrival, sleep, bath, health, notes).
- **Activities & progress** — latest activity and progress with rating chips and photos.
- **Child page** — updates, activities, progress, attendance history (**with the check-in temperature**), **medication requests + status**, **growth (height/weight/BMI)**, **absence requests**, and **Pay**.
- **Absences** — file an absence for a child; the teacher approves/declines and it syncs into attendance.
- **Financials** — unpaid records, **Stripe Checkout**, payment history, **PDF receipts**.
- **Messages · Memos · Teachers** (contact list).

### Cross-cutting
- **Single login, role-based**, with a **pending → approved** registration flow.
- **Bilingual** English / Bahasa Melayu across the whole app, **including the auth and profile pages**.
- **Admin-editable settings & lists** — operational rules live in a `settings` table (`setting('x', config('y'))`, so config/`.env` remains the fallback), and fixed lists live in `list_options`; both are managed from the admin portal.
- **Notifications** — in-app bell (database + broadcast) with an optional **email channel for messages**; unread badges. Parents are notified on **check-in**, **medication given**, fee records (+ **scheduled fee reminders**), progress, memos, chat, **check-out (with the photo posted into the chat)**, and **refunds**.
- **Scheduled tasks** — `media:prune-photos` (daily 03:00) and `fees:send-reminders` (daily 08:00); both stamp their last run, shown on `/admin/settings` (with a stale-schedule warning).
- **Image pipeline** — re-encode + **EXIF/GPS stripped**, **timestamp watermark**, **≤1 MB** compression, thumbnail, **private storage served only through an authorising route**, and **configurable auto-retention** (default 3 days, `media:prune-photos`).
- **Audit log** of admin mutations, filterable with CSV export.

---

## Requirements

- PHP **8.2+** (8.3 recommended) with `gd`, `exif`, `fileinfo`, `pdo_mysql`
- Composer, Node 20+ / npm
- MySQL 8 (Laragon's bundled MySQL, or Docker)

## Quick start

```bash
composer install
npm install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed        # or: migrate:fresh --seed
npm run build                     # or: npm run dev
```

Then serve it. With **Laragon** the project is reachable at **http://ppak-uthm-connect.test**;
otherwise `php artisan serve` → http://localhost:8000.

> `php artisan storage:link` is **not required** — attendance/progress photos live on a private disk
> and are streamed through an authorised route.

## Demo accounts (from `--seed`)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@ppakuthm.com` | `password123` |
| Teacher | `teacher@ppakuthm.com` | `password123` |
| Parent | `parent@ppakuthm.com` | `password123` |
| Pending parent | `pending@ppakuthm.com` | `password123` |

## Registration / approval flow

- A new registration creates a **parent** account with `status = pending`.
- Pending accounts **cannot log in** until an admin approves them (Registrations page).
- Only `status = active` accounts pass `EnsureAccountIsActive`.

---

## Tests & style

```bash
php artisan test      # Pest - 248 tests / 1756 assertions
vendor/bin/pint       # Laravel code style (auto-fix)
npm run build         # tsc typecheck + Vite production build
```

## Configuration

`.env` keys (all optional — sensible defaults; see `.env.example`):

```ini
# Payments (optional: without keys the UI shows a graceful "unavailable" notice)
STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_CURRENCY=myr
# Webhook endpoint: POST /stripe/webhook  (checkout.session.completed)

# Realtime (optional: leave empty and the bell still works via polling)
PUSHER_APP_ID=
PUSHER_APP_KEY=
PUSHER_APP_SECRET=
PUSHER_APP_CLUSTER=ap1

# Attendance / progress photos
MEDIA_DISK=attendance
MEDIA_MAX_UPLOAD_KB=10240
MEDIA_MAX_DIMENSION=1600
MEDIA_TARGET_KB=1024
MEDIA_WATERMARK=true
CHECKOUT_PHOTO_REQUIRED=true
CHECKOUT_PHOTO_RETENTION_DAYS=3
```

> Most operational rules are now **admin-editable** at **`/admin/settings`** (stored in the
> `settings` table): fee due day, absence window, message edit window/length/attachments, photo
> retention/watermark/upload, and reminder lead time. The `.env` values above are the **fallback
> defaults** — code reads `setting('key', config('…'))`, so the DB wins when a row exists and the
> config value is used otherwise. **Per-centre fee rates** live at `/admin/fees`.

## Where to look

```
routes/web.php                     all routes (admin, teacher, parent, photos, webhook)
app/Http/Controllers/Admin/        dashboard, registrations, students (+ contacts), teachers, parents,
                                   payments, transactions, fees, settings, administrators, lists,
                                   centres, memos, conversations, activity log, trash
app/Http/Controllers/Teacher/      dashboard, attendance, activities, progress, growth, daily updates,
                                   messages, memos, medications, absences
app/Http/Controllers/Parent/       dashboard, attendance, daily update, activities, child,
                                   financials, payments, messages, memos, contact, medications, absences
app/Services/Images/ImageStore.php watermark + compression pipeline (reusable)
app/Support/                       Lists (editable lists), Settings (operational settings),
                                   ActiveCentre (centre switcher)
app/Models/                        User, Student, Centre, Attendance, AttendancePhoto, ProgressRecord,
                                   ProgressPhoto, FinancialRecord, FeeSetting, Payment, Memo, ListOption,
                                   Setting, Message, Conversation, ActivityLog, MedicationRequest,
                                   GrowthRecord, AbsenceRequest, Guardian, EmergencyContact,
                                   AuthorisedCollector
resources/js/Layouts/app-shell.tsx sidebar + top bar, collapsible "Teacher views" group
resources/js/Pages/                Admin · Teacher · Parent · Auth · Profile · Welcome
resources/js/Components/           chat-inbox, photo-upload/photo-thumb, rating-chip, pagination,
                                   check-in-dialog, checkout-dialog, confirm-dialog, csv-import-dialog, …
resources/views/pdf/               receipt templates
config/media.php                   photo pipeline defaults (overridable at /admin/settings)
database/seeders/DatabaseSeeder.php full demo dataset (centres, attendance, health, growth, fees, chat)
tests/Feature/                     Pest feature suite (248 tests)
lang/en.json · lang/ms.json        bilingual keys
```

## Documentation

| File | Contents |
|---|---|
| [`HANDOFF.md`](HANDOFF.md) | **Read first in a new session** — verified state, environment, next steps |
| [`ADMIN-CONTROL-PLAN.md`](ADMIN-CONTROL-PLAN.md) | The phased admin plan (all phases done) + issue register |
| [`PARENT-TEACHER-REVIEW.md`](PARENT-TEACHER-REVIEW.md) | Historical parent/teacher audit + progress overhaul |
| [`ADMIN-REVIEW.md`](ADMIN-REVIEW.md) | Admin sweep: what was fixed, backlog progress |
| [`CHECKOUT-PHOTOS-PLAN.md`](CHECKOUT-PHOTOS-PLAN.md) | Photo upload design (watermark, retention, chat delivery) |
| [`LITTLELIVES-COMPARISON.md`](LITTLELIVES-COMPARISON.md) | Feature comparison vs LittleLives + gap roadmap |
| [`FUNCTIONAL-REVIEW.md`](FUNCTIONAL-REVIEW.md) | Module-by-module functionality review + prioritized improvements |
| [`MESSAGES-REVIEW.md`](MESSAGES-REVIEW.md) | Messages module sweep (functionality · UX · UI) |
| [`DEPLOY.md`](DEPLOY.md) | Deploying a demo (tunnel, Railway/Render, serverless) + demo script |

## Continuing this work (handoff)

**Where we left off.** All work is committed and pushed to `main` (`git log -1`). **248 tests /
1756 assertions** pass (`php artisan test`) and the frontend builds clean (`npm run build`).
**Every planned phase of [`ADMIN-CONTROL-PLAN.md`](ADMIN-CONTROL-PLAN.md) is complete**
(F · A · C · G · B · E · D) and the **issue register is clear**. This session added phases
**B** (settings + versioned per-centre fees, editable records, Stripe refunds), **E** (oversight
views) and **D** (admin accounts), a full **UI/i18n sweep**, and an **enriched seeder** so a fresh
`migrate:fresh --seed` produces a complete two-centre demo.

**Live demo:** stopped — the Cloudflare quick tunnel URL is no longer live. To bring it back, follow
[`DEPLOY.md`](DEPLOY.md) (the URL changes on each restart, so regenerate the demo PDF too).

**Start a new session** in `C:\laragon\www\ppak-uthm-connect` and read **[`HANDOFF.md`](HANDOFF.md)**
first — verified state, environment notes, working agreements and next steps.

**Good places to pick up:**
- **Hosting/deploy** — [`DEPLOY.md`](DEPLOY.md) (Railway or Hostinger), then `migrate --force` + the scheduler.
- **Tier 2** ([`LITTLELIVES-COMPARISON.md`](LITTLELIVES-COMPARISON.md)) — term progress-report PDF,
  growth chart, school calendar/events, light admissions pipeline.
- **Realtime** ([`MESSAGES-REVIEW.md`](MESSAGES-REVIEW.md)) — true realtime chat (Pusher/Echo), a general thread.

---

## Roadmap

**Shipped (Tier 1 — see `LITTLELIVES-COMPARISON.md`):** check-in **temperature + health check** ·
**health & medication** (allergies/medical notes, medication requests + administration log) ·
**growth tracking** (height/weight/BMI + class average) · scheduled **fee reminders** ·
**absence requests** · **per-centre fees** · **Stripe refunds**.

**Next up:** school **calendar/events** · term **progress-report export** · growth **chart** ·
light **admissions pipeline**.

**Later:** native/push (Pusher or PWA web push), staff attendance & scheduling, **true realtime chat**
(Laravel Echo/Pusher — polling is in place for now).

**Hosting:** deploy (Hostinger or Railway), configure `.env`, run migrations, and ensure the scheduler
runs (`schedule:run` → `media:prune-photos` + `fees:send-reminders`), plus backups.

## Notes for contributors

- `npm install` uses `legacy-peer-deps` (see `.npmrc`).
- **PWA is disabled** during development (`vite.config.js`) — the service worker is re-enabled at
  deploy time. If a browser shows a stale/blank page, hard-refresh or unregister the service worker.
- Photos are **private**: never expose them via `public/`; always serve through the authorised route.
- Keep secrets in `.env` only.
