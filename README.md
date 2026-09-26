# PPAK UTHM Connect System — rebuild (Phase 0 scaffold)

Modern rebuild of the legacy kindergarten-management platform on
**Laravel 12 + Inertia + React (TypeScript) + Tailwind v4 + shadcn/ui**.

Roles: **Admin · Teacher · Parent** (single login, role-based dashboards).
Malay/English bilingual UI, PWA-ready, MySQL 8, Docker-based local DB.

---

## Stack

| Layer | Choice |
|---|---|
| Backend | PHP 8.3+ · Laravel 12 |
| Frontend | Inertia.js v2 · React 18 · TypeScript · Vite |
| UI | Tailwind CSS v4 · shadcn/ui (New York, neutral) · Lucide |
| DB | MySQL 8 (Docker) |
| Realtime (later) | Pusher (Laravel Broadcasting) |
| Payments (later) | Stripe Checkout + webhooks |
| Receipts (later) | dompdf |
| Quality | Pest + PHPUnit · Pint · GitHub Actions CI |

---

## Requirements

- PHP **8.2+** (RECOMMEND 8.3), Composer
- Node **20+** (RECOMMEND 22), npm
- Docker (for MySQL; you can swap to any MySQL 8 for local dev)

## Quick start

```bash
# 1. Start the database
docker compose up -d mysql

# 2. Install PHP + JS deps
composer install
npm install

# 3. Configure environment
cp .env.example .env
php artisan key:generate

# 4. Migrate + seed demo data
php artisan migrate:fresh --seed

# 5. Run
php artisan serve        # terminal 1
npm run dev              # terminal 2
# open http://localhost:8000
```

phpMyAdmin runs at `http://localhost:8080` (root / root_secret) when you run
`docker compose up -d`.

> No Docker available? Point `.env` at a local MySQL 8, or for a quick
> throwaway run set `DB_CONNECTION=sqlite` + `DB_DATABASE=/absolute/path.sqlite`.

## Demo accounts (from `--seed`)

| Role | Email | Password |
|---|---|---|
| Admin | admin@ppakuthm.com | password123 |
| Teacher | teacher@ppakuthm.com | password123 |
| Parent | parent@ppakuthm.com | password123 |

## Registration / approval flow (current behaviour)

- A new registration always creates a **parent** account with
  `status = pending` and an `activation_token`.
- Pending accounts **cannot log in** (`EnsureAccountIsActive` middleware +
  login-time check). Admin approval UI is scheduled for Phase 2.
- A user must have `status = active` to log in.

## Where to look

```
routes/web.php              role dashboards, locale switch, admin area, auth groups
app/Models/                 User (role/status enums), Student, FeeSetting, Memo, FinancialRecord
app/Enums/UserRole.php      admin | teacher | parent + homeRoute()
app/Enums/AccountStatus.php pending | awaiting | active | rejected
app/Http/Middleware/        CheckRole, EnsureAccountIsActive, SetLocale
app/Http/Controllers/Admin/ dashboard, registrations/approval, teachers, students, memos, fees, payments
resources/js/Pages/Admin/   Dashboard, Registrations, Teachers, Students, Payments, Memos, Fees
resources/js/Layouts/       app-shell (brand header, role sidebar, language switcher, user menu)
resources/js/lib/i18n.ts    frontend dictionary helper (keys from lang/*.json)
lang/en.json, lang/ms.json  bilingual keys (Malay is default)
docker-compose.yml          MySQL 8 + phpMyAdmin + Redis
```

## Admin area (what's implemented)

| Page | Route | What it does |
|---|---|---|
| Dashboard | `/admin` | Student/teacher/parent/monthly-income stats + pending badge |
| Registrations | `/admin/registrations` | **Approve / Reject** pending parent & teacher accounts |
| Teachers | `/admin/teachers` | List, add, edit, delete teachers |
| Students | `/admin/students` | List, add, edit, delete students (link to parent) |
| Payments | `/admin/payments` | Filter by month/class; add records (fee + overtime from settings); mark Paid/Unpaid; delete — **notifies the parent** |
| Memos | `/admin/memos` | Publish/delete announcements — **notifies all active parents** |
| Fee settings | `/admin/fees` | Edit monthly fee + overtime rate (applies to new payment records) |

## Parent & teacher portals

- **Teacher**: dashboard (today's status), daily activities log, learning progress,
  per-class daily updates, **messages (parent↔teacher)**, memos.
- **Parent**: dashboard, daily check-in, activities/progress view, financial
  statement with **Stripe Checkout** ("Pay"), **payment success + PDF receipt**,
  **messages**, memos. Posting/reading is ownership-checked per child.

## Notifications

- In-app **notification bell** (all roles) polling `/notifications`.
- Sent on: new fee record, activity/progress recorded, memo posted, chat message.
- Broadcast channels are wired (`database` + `broadcast`) — drop in Pusher keys
  to get instant delivery; the bell already works via polling without them.

## Payments & receipts

- Server-computed amounts only (no client-chosen totals), idempotent webhook
  completion, per-payment PDF receipts (dompdf).
- **Stripe setup** (test mode first):
  ```
  STRIPE_PUBLISHABLE_KEY=pk_test_...
  STRIPE_SECRET_KEY=sk_test_...
  STRIPE_WEBHOOK_SECRET=whsec_...
  STRIPE_CURRENCY=myr
  ```
  With no keys configured the app shows a graceful "payments unavailable"
  notice (nothing breaks). Add the webhook endpoint `POST /stripe/webhook`
  (`checkout.session.completed`) with Stripe CLI/stripe dashboard.

## Tests & style

```bash
php artisan test          # Pest — 25 tests (auth, registration/approval, profile)
vendor/bin/pint           # Laravel code style (auto-fix)
npm run build             # tsc typecheck + vite production build (+ PWA sw)
```

CI (GitHub Actions) runs Pint, the Pest suite, and the frontend build on push/PR.

## Roadmap (next phases)

1. **Phase 1** – one-login UX polish, admin approval queue, verified-email flow
2. **Phase 2** – admin: students/teachers/payments/memos CRUD + analytics + fee settings
3. **Phase 3** – teacher activity/progress, parent daily updates & statements
4. **Phase 4** – Stripe Checkout + webhooks, PDF receipts
5. **Phase 5** – Pusher notifications + parent↔teacher chat
6. **Phase 6** – legacy DB import (reversible, scrubbed) + bilingual polish
7. **Phase 7** – deploy to Hostinger, backups, handover docs

## Notes for contributors

- `npm install` uses `legacy-peer-deps` (see `.npmrc`) — known good for this
  Laravel/Vite dependency set.
- **PWA is disabled while developing** (see `vite.config.js`) — the service worker
  is re-enabled in the deploy phase with real icons
  (`public/pwa-512.png`, `public/pwa-maskable-512.png`).
  If a browser ever shows a stale/blank page, hard-refresh or clear the site's
  service worker (DevTools → Application → Service Workers → Unregister).
- Keep secrets in `.env` only (`.env` is git-ignored, `.env.example` documents keys).