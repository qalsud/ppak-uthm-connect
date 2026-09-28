# Deploying PPAK UTHM Connect (demo for your supervisor)

## TL;DR

**True "serverless" (Vercel/Netlify) is a poor fit** for this app: it needs a **PHP runtime**, a
**database**, and a **writable disk** for uploaded photos — Vercel/Netlify don't give you those for
Laravel. Three realistic options, fastest first:

| Option | Time | Good for | Notes |
|---|---|---|---|
| **A. Tunnel your laptop** (Cloudflare Tunnel) | ~2 min | Showing it *right now* | Laptop must stay on; no deploy |
| **B. Railway / Render** (Dockerfile included) | ~15 min | A shareable link you can leave running | Managed host, no servers to patch |
| **C. Laravel Cloud / Vapor** | ~1 h | Proper serverless Laravel | Paid; more setup |

A `Dockerfile`, `docker/entrypoint.sh` and Apache config are included — Option B works as-is.

---

## Current live demo (this session)

- **URL:** `https://kenneth-either-faq-principal.trycloudflare.com`
- **Accounts:** `admin@` / `teacher@` / `parent@ppakuthm.com` — password `Ppak-9ZmBdw-3266`
- Started with:
  ```powershell
  & "$env:TEMP\opencode\cloudflared.exe" tunnel --url http://127.0.0.1:80 --http-host-header ppak-uthm-connect.test --no-autoupdate
  ```
  (the `--http-host-header` is required because Laragon uses name-based vhosts)
- ⚠️ A quick tunnel gets a **new URL on every restart** — update this file and regenerate the demo PDF if you restart it.
- ⚠️ It only lives while **your laptop + Laragon + the cloudflared process** are running.

## Option A — a public link in ~2 minutes (no deploy)

Expose your local Laragon site through a tunnel:

```bash
# Cloudflare Tunnel (no account needed for a quick tunnel)
winget install --id Cloudflare.cloudflared
cloudflared tunnel --url http://ppak-uthm-connect.test
```

Or with ngrok:

```bash
ngrok http http://ppak-uthm-connect.test
```

Copy the `https://…trycloudflare.com` (or `…ngrok-free.app`) URL and send it to your supervisor.
Everything runs on your machine, so **keep the laptop on and Laragon running**.

If the app generates `http://` links, set in `.env`:

```ini
APP_URL=https://<your-tunnel-url>
SESSION_SECURE_COOKIE=true
```

…then `php artisan config:clear`.

---

## Option B — Railway (recommended for a link you can leave up)

**What it is:** a managed platform ("PaaS"). You connect the GitHub repo once, Railway builds the
included `Dockerfile` in the cloud and runs it — no server to patch, always on, and it survives your
laptop being switched off. A `railway.json` is included (Dockerfile builder + `/up` healthcheck +
restart-on-failure).

**Cost:** a **30-day trial with $5 credits** (no card needed) — plenty for a supervisor demo. After
that, **Hobby is $5/month** (includes $5 usage); there's also a very limited free plan (~$1/month of
credit, 1 project, no cron). Plan a Hobby subscription if the demo needs to stay up long-term.

1. Push this repo to GitHub (already done).
2. [railway.com](https://railway.com) → **New Project → Deploy from GitHub repo** → pick `ppak-uthm-connect`.
   Railway detects the **`Dockerfile`** automatically.
3. **Variables** (Service → Variables):

   | Variable | Value |
   |---|---|
   | `APP_NAME` | `PPAK UTHM Connect` |
   | `APP_ENV` | `production` |
   | `APP_DEBUG` | `false` |
   | `APP_KEY` | `php artisan key:generate --show` output (run locally) |
   | `APP_URL` | the domain Railway assigns (add it after the first deploy) |
   | `DB_CONNECTION` | `sqlite` (or add a MySQL plugin and use the `DB_*` vars) |
   | `SESSION_DRIVER` | `database` |
   | `CACHE_STORE` | `database` |
   | `QUEUE_CONNECTION` | `database` |
   | `DEMO_SEED` | `true` |
   | `SESSION_SECURE_COOKIE` | `true` |
   | `CHECKOUT_PHOTO_RETENTION_DAYS` | `3` |

4. **Settings → Networking → Generate Domain** → copy it into `APP_URL` → redeploy.
5. Open the URL and log in (see demo accounts below).

**Render** works the same way (**New → Web Service → Docker**), and **Fly.io**
(`fly launch` → it reads the Dockerfile) is a third equivalent.

### Photos on a managed host

Container disks are ephemeral: uploaded check-out/progress photos survive until the next
deploy/restart, then vanish (the chat keeps the message text — the image shows *"Photo no longer
available"*). For a demo that's fine. To keep them, either:

- attach a **volume/disk** (Railway: *Volumes*, mount at `/var/www/html/storage/app`) and set
  `MEDIA_DISK=attendance`, **or**
- switch to object storage (S3) and set `FILESYSTEM_DISK=s3` + the `AWS_*` variables.

### What's not needed for a demo

- **No scheduler** — `media:prune-photos` (3-day retention) simply doesn't run; nothing breaks.
- **No queue worker** — notifications are sent synchronously.
- **No Stripe/Pusher keys** — payments show a graceful "unavailable" notice and the bell works
  without realtime (chat polls).

---

## Option C — true serverless Laravel (paid)

- **[Laravel Cloud](https://cloud.laravel.com)** — managed PHP/Laravel, autoscaling, MySQL, queues,
  scheduler, object storage. The closest thing to serverless that just works.
- **Laravel Vapor** — AWS Lambda; needs an AWS account, S3 storage, and a lot of config. Overkill
  for a demo.

---

## Demo accounts (from the seeder)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@ppakuthm.com` | `password123` |
| Teacher | `teacher@ppakuthm.com` | `password123` |
| Parent | `parent@ppakuthm.com` | `password123` |
| Pending parent | `pending@ppakuthm.com` | `password123` |

A short demo script: log in as **teacher** → take attendance and **check a child out with a photo**
(it appears in the parent's chat) → log in as **parent** → see attendance, the photo, daily updates
and progress → **admin** → registrations, students, payments, activity log, conversations oversight.

---

## Before you demo

- [ ] `APP_URL` matches the public URL, `APP_DEBUG=false`, `APP_ENV=production`
- [ ] `APP_KEY` set on the host (don't let it regenerate on every boot)
- [ ] `DEMO_SEED=true` for a fresh instance (seeding is idempotent — it skips when data exists)
- [ ] Log in once with each of the three demo roles
- [ ] Open a chat thread and check the composer stays pinned

## Security when the link is public

A tunnel (or any public URL) means strangers *can* reach your dev app if they learn the URL. Before
sharing:

- [ ] **`APP_DEBUG=false`** — with debug on, error pages can print env vars and **DB credentials**.
- [ ] **Rotate the demo passwords.** The seeded accounts use `password123`, which is in this repo.
      Change them for anything public:
      ```bash
      php artisan tinker
      >>> $u = App\Models\User::where('email','admin@ppakuthm.com')->first();
      >>> $u->password = 'a-strong-password'; $u->save();   // hashed automatically
      ```
      (A fresh Railway deploy re-seeds `password123` — rotate there too, or set `DEMO_SEED=false`.)
- [ ] **Stop the tunnel when you're done:** `Get-Process cloudflared | Stop-Process -Force`
- [ ] For a link shared with one person, put **Cloudflare Access** (Zero Trust) in front of a *named*
      tunnel so only their email can open it — free for a few users.
- [ ] On shared/untrusted Wi-Fi, note that Laragon exposes **Apache (80), MySQL (3306) and Redis
      (6379)** on all interfaces — allow them through Windows Firewall only on trusted networks.

## Later: production on Hostinger

The long-term plan in [`README.md`](README.md#roadmap) is a normal VPS deploy (Hostinger) with
MySQL, the scheduler in cron (`schedule:run`), and backups — not serverless.
