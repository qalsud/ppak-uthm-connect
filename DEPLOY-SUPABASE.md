# Hosting on Supabase (temporary)

Supabase is being used as **Postgres + object storage only**. It does **not** run PHP, so the
Laravel app still needs a normal PHP host (Railway, Render, Fly.io, a VPS, …). This guide covers the
Supabase half and the settings that differ from the MySQL/local setup.

```
Browser ──HTTPS──> PHP host (Laravel + queue worker + scheduler [+ Reverb])
                        │
                        ├── Postgres  ──> Supabase (session pooler, SSL)
                        └── Photos    ──> Supabase Storage (S3-compatible, private bucket)
```

## 1. Create the Postgres database

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Open **Connect** and choose **Session pooler** (port `5432`).
   - Use the **shared pooler**, not the direct connection: the direct host is IPv6-only on the free
     plan, and most PHP hosts are IPv4.
   - The username is `postgres.<project-ref>` (not plain `postgres`).
3. Copy the host, port, database (`postgres`), username and password. Replace the password in the
   string with the real one (percent-encode reserved characters).
4. Keep **SSL on**. Set `DB_SSLMODE=require` (or `verify-full` if you install the project CA
   certificate).

> **Transaction pooler (port 6543) is not the right choice here.** It returns the connection after
> every transaction, which breaks session state and prepared statements. Laravel works best through
> the **session pooler**.

### Environment

```ini
DB_CONNECTION=pgsql
DB_HOST=aws-<index>-<region>.pooler.supabase.com   # from the Connect dialog
DB_PORT=5432
DB_DATABASE=postgres
DB_USERNAME=postgres.<project-ref>
DB_PASSWORD=<database-password>
DB_SSLMODE=require
```

Alternatively use a single URL (Laravel reads `DB_URL` first):

```ini
DB_URL="postgresql://postgres.<project-ref>:<password>@aws-<index>-<region>.pooler.supabase.com:5432/postgres?sslmode=require"
```

Set only one of `DB_URL` / the individual `DB_*` values. A stale `DB_URL` silently overrides the
rest.

### Schema and demo data

```bash
php artisan migrate --force
php artisan db:seed --force        # or set DEMO_SEED=true on a host that seeds on boot
```

There is no MySQL → Postgres data conversion step in the repo. For a demo, **seed fresh** on
Supabase. If real data must move, plan a one-off export/import (columns, booleans, dates and enums
need checking) rather than assuming a dump will load.

## 2. Create the storage bucket

Photos are **private** and streamed through the app's authorised routes, so the bucket must **not**
be public.

1. Supabase Dashboard → **Storage** → **New bucket** → name it e.g. `ppak-media`, keep it **private**.
2. **Storage → S3** (project settings) → generate an **access key ID / secret**. These bypass RLS and
   are for server-side use only.
3. Copy the **endpoint** and **region** shown on that page. The endpoint looks like
   `https://<project-ref>.storage.supabase.co/storage/v1/s3`.

### Environment

```ini
MEDIA_DISK=s3
FILESYSTEM_DISK=s3

AWS_ACCESS_KEY_ID=<s3-access-key-id>
AWS_SECRET_ACCESS_KEY=<s3-secret>
AWS_DEFAULT_REGION=<project-region>
AWS_BUCKET=ppak-media
AWS_ENDPOINT=https://<project-ref>.storage.supabase.co/storage/v1/s3
AWS_USE_PATH_STYLE_ENDPOINT=true
```

`AWS_USE_PATH_STYLE_ENDPOINT=true` is required: Supabase's endpoint contains a path
(`/storage/v1/s3`), and the default virtual-hosted style produces invalid requests.

`AWS_URL` can stay empty. Media is served through `PhotoController` using
`Storage::disk(...)->response()`, which streams from the private bucket; nothing depends on public
object URLs.

> If you prefer to keep files on the PHP host instead, mount a persistent volume at
> `storage/app` and leave `MEDIA_DISK=attendance`. Container disks without a volume are wiped on
> every deploy.

## 3. Session, cache and queue

The database driver works on Postgres and keeps the setup to one service:

```ini
SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=database
```

`php artisan migrate` creates the `sessions`, `cache` and `jobs` tables. If the host has Redis, use
it instead — it is faster and avoids extra write load on the database.

## 4. Processes Supabase does not provide

These must run on the PHP host:

| Process | Command | Needed for |
|---|---|---|
| Web | Apache/Nginx + PHP-FPM (or the included Dockerfile) | the app itself |
| Queue worker | `php artisan queue:work --tries=3` | instant broadcast notifications (bell); without it jobs pile up and the bell falls back to polling |
| Scheduler | cron: `* * * * * php artisan schedule:run` | fee reminders, photo pruning |
| Reverb (optional) | `php artisan reverb:start --host=0.0.0.0 --port=$PORT` | live chat/bell; without it the app polls |

Supabase Realtime is **not** a drop-in replacement for Reverb — the app's events are Laravel
broadcast events on private channels. Leave `BROADCAST_CONNECTION=null` or keep Reverb; do not point
`BROADCAST_CONNECTION` at Supabase.

## 5. Production environment checklist

```ini
APP_ENV=production
APP_DEBUG=false
APP_URL=https://<your-app-domain>
APP_KEY=<php artisan key:generate --show>
APP_TIMEZONE=Asia/Kuala_Lumpur
SESSION_SECURE_COOKIE=true
LOG_CHANNEL=stack
LOG_LEVEL=warning
```

Also:

- [ ] `php artisan config:cache` and `php artisan route:cache` after the env is final (clear them
      before changing env values).
- [ ] `php artisan migrate --force` — no pending migrations.
- [ ] Confirm `pdo_pgsql` is enabled on the PHP host (the included `Dockerfile` installs it).
- [ ] Confirm upload limits allow the app's 10 MB photo cap (the included `Dockerfile` sets
      `upload_max_filesize=12M`, `post_max_size=40M`, `memory_limit=512M`).
- [ ] `php artisan storage:link` only if anything uses the `public` disk; private media does not.
- [ ] Demo accounts seeded **and passwords rotated** (`accounts.txt` and this repo are public).
- [ ] `DEMO_SEED=false` after the first boot, or seeding will run again on restart (it is idempotent,
      but it is safer to turn it off).
- [ ] Send one test email if `MAIL_MAILER` is configured; otherwise the bell still works and email is
      simply skipped.
- [ ] Upload a checkout photo, then reload it — confirms the S3 credentials, bucket and streaming
      route all work.
- [ ] Open `/up` — should return 200.

## 6. Free-plan caveats

- **Projects pause after ~7 days without activity.** A paused project makes every request fail until
  it is resumed from the dashboard. For a supervisor demo that may be visited sporadically, either
  keep a daily health check hitting the app, or use a paid plan.
- **Connection limits.** The free plan allows a small number of direct connections. The session
  pooler multiplexes them, but keep PHP-FPM/worker concurrency modest. Each PHP worker holds one
  connection.
- **Backups.** Point-in-time recovery is not on the free plan. Take a `pg_dump` before risky changes
  and before deleting the project.
- **Region/latency.** Pick the region closest to the PHP host; every query crosses the network.
- **Egress.** Serving photos through PHP counts as database/storage egress plus app bandwidth.

## 7. Postgres-specific notes for this app

- All search filters use Laravel `whereLike()` (Postgres `ILIKE`). Plain `LIKE` is **case-sensitive**
  on Postgres, unlike MySQL — do not reintroduce `where('col', 'like', …)`.
- `tests/Feature/SearchCaseTest.php` guards this, and the CI `backend-postgres` job runs the whole
  suite against Postgres 16.
- Emails are trimmed/lowercased at the edge (`NormaliseEmailInput` middleware) and on the model
  (`User::setEmailAttribute`). Postgres `=` is case-sensitive, unlike the MySQL collation, so this
  keeps login, unique checks and password resets identical. `tests/Feature/EmailNormalisationTest.php`
  covers it.
- Run the Postgres suite locally with a container on port `5433`:

  ```powershell
  docker run --name ppak-pg -e POSTGRES_PASSWORD=secret -e POSTGRES_DB=ppak_test -p 5433:5432 -d postgres:16
  $php='C:\laragon\bin\php\php-8.4.27-1-Win32-vs17-x64\php.exe'
  $env:DB_HOST='127.0.0.1'; $env:DB_PORT='5433'; $env:DB_CONNECTION='pgsql'
  $env:DB_DATABASE='ppak_test'; $env:DB_USERNAME='postgres'; $env:DB_PASSWORD='secret'
  & $php vendor/bin/pest --configuration=phpunit.pgsql.xml
  ```

- Boolean columns are real booleans; casts in the models already handle them (the Postgres suite
  covers it).
- `->after()` in older migrations is ignored by Postgres (column order is not preserved) — harmless.

## 8. What is still open in the debt register

| Item | Impact on hosting |
|---|---|
| **SEC‑11** — payment-completion race | **Fixed** with a provider-agnostic atomic claim; Stripe remains a provisional adapter. |
| **INFRA‑01** — PHP 8.3+ | Pick PHP 8.3 or 8.4 on the host; local Laragon can stay 8.2 until then. |
| **DEP‑02** — React 19 / Inertia 3 / Vite 8 / TS 7 | Not a hosting blocker; defer until after the demo. |
| **PROC‑01** — external error tracking | With `APP_DEBUG=false`, production errors only reach the log. For a temporary demo, `LOG_LEVEL=warning` + host log retention is enough; add Sentry if the demo will run unattended. |

## 9. Suggested deployment order

1. Create the Supabase project, note the session-pooler string, enable SSL.
2. Create the private bucket and S3 keys.
3. Create the PHP host service from this repo (`Dockerfile`), set all env vars, deploy.
4. `php artisan migrate --force` and seed.
5. Add the queue-worker service and the scheduler cron.
6. Optional: add the Reverb service and point `REVERB_*` / `VITE_REVERB_*` at it, then rebuild.
7. Run the checklist in §5, then rotate the demo passwords.
