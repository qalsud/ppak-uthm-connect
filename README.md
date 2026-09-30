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
- **Dashboard** — student/teacher/parent/pending/memo counts, monthly-income chart, class split, recent payments, today's date.
- **Registrations** — Pending / Active / Rejected tabs, role filter, search, pagination, approve/reject (**single + bulk**).
- **Students** — CRUD, **CSV import/export**, class filter, server-side search, pagination, parent dropdown, and a **student detail page** (attendance + photos, progress + photos, daily updates, activities, payments).
- **Teachers** — CRUD, CSV import/export, status filter, password reset, bulk delete.
- **Parents** — CRUD, children count, status filter, password reset.
- **Payments** — records CRUD, month/class/status filters + search, collected/outstanding summary, **bulk "generate monthly fees"**, mark paid/unpaid, **PDF receipt download**.
- **Fee settings** — monthly fee + overtime rate with a live example.
- **Memos** — create/**edit**/delete with **audience targeting** (Everyone / Parents / Teachers / a class).
- **Activity log** — searchable audit trail of who changed what.

### Teacher (`/teacher`)
- **Dashboard** — quick actions, KPIs, student list with class/status/update filters and attendance controls.
- **Attendance register** — by class + date, live counts, mark **"At school"** with an optional **temperature + health note** (amber **"Elevated"** flag at ≥ 37.5 °C), **allergies** flagged per child, **check out with a photo** (watermarked; documented override when a photo isn't possible), and history. Also carries the day's **medication requests** with mark-given / not-given.
- **Growth** — record height/weight per child/day with automatic **BMI** (same-day re-entry updates), a **class average BMI**, and latest-per-child + full history tables.
- **Daily activities** — PERMATA/KSPK checklist per child.
- **Daily updates** — see parent-submitted morning check-ins per class.
- **Progress** — grouped Lesson / Activities / Assessment form with helper text + rating chips, **optional photo**, per-student history with filters and a summary.
- **Messages** — parent ↔ teacher chat per child. **Memos**.

### Parent (`/parent`)
- **Dashboard** — children cards with today's attendance (and check-out photo), outstanding-balance banner, quick actions.
- **Attendance** — read-only status + history with photos (marking is teacher-only).
- **Daily update** — submit a child's morning check-in (arrival, sleep, bath, health, notes).
- **Activities & progress** — latest activity and progress with rating chips and photos.
- **Child page** — updates, activities, progress, attendance history (**with the check-in temperature**), **medication requests + status**, **growth (height/weight/BMI)**, and **Pay**.
- **Financials** — unpaid records, **Stripe Checkout**, payment history, **PDF receipts**.
- **Messages · Memos · Teachers** (contact list).

### Cross-cutting
- **Single login, role-based**, with a **pending → approved** registration flow.
- **Bilingual** English / Bahasa Melayu (full UI + landing).
- **Notifications** — in-app bell (database + broadcast) with an optional **email channel for messages**; unread badges. Parents are notified on **check-in**, **medication given**, fee records (+ **scheduled fee reminders**), progress, memos, chat, and **check-out (with the photo posted into the chat)**.
- **Scheduled tasks** — `media:prune-photos` (daily 03:00) and `fees:send-reminders` (daily 08:00).
- **Image pipeline** — re-encode + **EXIF/GPS stripped**, **timestamp watermark**, **≤1 MB** compression, thumbnail, **private storage served only through an authorising route**, and **3-day auto-retention** (`media:prune-photos`).
- **Audit log** of admin mutations.

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
php artisan test      # Pest - 226 tests / 1538 assertions
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

## Where to look

```
routes/web.php                     all routes (admin, teacher, parent, photos, webhook)
app/Http/Controllers/Admin/        dashboard, registrations, students, teachers, parents,
                                   payments, memos, fees, activity log
app/Http/Controllers/Teacher/      dashboard, attendance, activities, progress, growth, daily updates,
                                   messages, memos, medications
app/Http/Controllers/Parent/       dashboard, attendance, daily update, activities, child,
                                   financials, messages, memos, contact, medications
app/Services/Images/ImageStore.php watermark + compression pipeline (reusable)
app/Models/                        User, Student, Attendance, AttendancePhoto, ProgressRecord,
                                   ProgressPhoto, FinancialRecord, FeeSetting, Memo, Message,
                                   Conversation, ActivityLog, MedicationRequest, GrowthRecord
resources/js/Pages/                Admin · Teacher · Parent · Auth · Welcome
resources/js/Components/           app-shell, photo-upload/photo-thumb, rating-chip, pagination,
                                   check-in-dialog, checkout-dialog, confirm-dialog,
                                   csv-import-dialog, …
resources/views/pdf/               receipt templates
config/media.php                   photo pipeline + retention settings
lang/en.json · lang/ms.json        bilingual keys
```

## Documentation

| File | Contents |
|---|---|
| [`PARENT-TEACHER-REVIEW.md`](PARENT-TEACHER-REVIEW.md) | Historical parent/teacher audit + progress overhaul |
| [`ADMIN-REVIEW.md`](ADMIN-REVIEW.md) | Admin sweep: what was fixed, backlog progress |
| [`CHECKOUT-PHOTOS-PLAN.md`](CHECKOUT-PHOTOS-PLAN.md) | Photo upload design (watermark, retention, chat delivery) |
| [`LITTLELIVES-COMPARISON.md`](LITTLELIVES-COMPARISON.md) | Feature comparison vs LittleLives + gap roadmap |
| [`FUNCTIONAL-REVIEW.md`](FUNCTIONAL-REVIEW.md) | Module-by-module functionality review + prioritized improvements |
| [`MESSAGES-REVIEW.md`](MESSAGES-REVIEW.md) | Messages module sweep (functionality · UX · UI) |
| [`DEPLOY.md`](DEPLOY.md) | Deploying a demo (tunnel, Railway/Render, serverless) + demo script |

## Continuing this work (handoff)

**Where we left off.** All work is committed and pushed to `main`
(`git log -1` for the latest commit). **226 tests / 1538 assertions** pass
(`php artisan test`), and the frontend builds clean (`npm run build`). The admin **issue
register is clear**, and **Phase B is done** — `/admin/settings`, versioned per-centre fee
rates, editable fee records, and Stripe refunds (`/admin/transactions`). **Phase E
(oversight views)** is next.

**Live demo:** stopped/finished — the Cloudflare quick tunnel URL is no longer live. To bring it back,
follow [`DEPLOY.md`](DEPLOY.md) (the URL changes on each restart, so regenerate the demo PDF too).

**Resume the OpenCode session:**
- **Title:** `PPAK UTHM Connect — build, hardening & messages overhaul`
- **Session ID:** `ses_f24d11cdbffemlyUgyV13cGVk2`
- In the TUI press **Ctrl+X** then **L** (or run `/sessions`) and pick that title;
  **Ctrl+O** lists recent sessions and projects together.

**Or start a fresh session** in `C:\laragon\www\ppak-uthm-connect` and say:

> Read `README.md`, `FUNCTIONAL-REVIEW.md` and `MESSAGES-REVIEW.md`, then continue.

**Good places to pick up:** hosting/deploy (Hostinger or Railway — see `DEPLOY.md`) · the still-open
items in `FUNCTIONAL-REVIEW.md` (guardians, terms, centres, **absence requests**, bulk class
activities) · `MESSAGES-REVIEW.md` (true realtime via Pusher/Echo, general thread) ·
`LITTLELIVES-COMPARISON.md` Tier 2 (**growth chart**, absence requests, term report PDF, calendar).

---

## Roadmap

**Shipped (Tier 1 — see `LITTLELIVES-COMPARISON.md`):** check-in **temperature + health check** ·
**health & medication** (allergies/medical notes, medication requests + administration log) ·
**growth tracking** (height/weight/BMI + class average) · scheduled **fee reminders**.

**Next up:** school **calendar/events** · term **progress-report export** · **absence requests** ·
growth **chart** · light **admissions pipeline**.

**Later:** native/push (Pusher or PWA web push), staff attendance & scheduling, multi-centre
dashboards, **true realtime chat** (Laravel Echo/Pusher — polling is in place for now).

**Hosting:** deploy (Hostinger or Railway), configure `.env`, run migrations, and ensure the scheduler
runs (`schedule:run` → `media:prune-photos` + `fees:send-reminders`), plus backups.

## Notes for contributors

- `npm install` uses `legacy-peer-deps` (see `.npmrc`).
- **PWA is disabled** during development (`vite.config.js`) — the service worker is re-enabled at
  deploy time. If a browser shows a stale/blank page, hard-refresh or unregister the service worker.
- Photos are **private**: never expose them via `public/`; always serve through the authorised route.
- Keep secrets in `.env` only.
