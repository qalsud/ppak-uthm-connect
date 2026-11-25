# Deployment Runbook — ppakuthm.com

This is the **actual runbook used to deploy the live instance** at `https://ppakuthm.com`. It is the
"what we really ran" companion to the generic [`DEPLOY-SERVER.md`](DEPLOY-SERVER.md).

Use this when rebuilding the same server, moving to a new VPS, or onboarding someone else.

> **What this deployment is:** one Ubuntu VPS running **nginx + certbot + Docker Compose**, with the
> app, queue worker, scheduler, Reverb and Postgres in containers. **No Supabase** — the database and
> photos live on the VPS. Only nginx exposes ports; everything else is internal.

---

## 0. Architecture

```
Browser ──HTTPS──> nginx :443 (certbot)
                      ├── ppakuthm.com / www.ppakuthm.com
                      │       └── proxy → 127.0.0.1:8083 → app (Apache + PHP 8.3)
                      └── ws.ppakuthm.com
                              └── proxy → 127.0.0.1:8084 → reverb :8082

app / queue / scheduler ───────────→ postgres :5432   (internal Docker network)
photos ────────────────────────────→ ppak_storage_app  (Docker volume)
```

| Piece | Choice |
|---|---|
| Web server / TLS | Existing **nginx** + **certbot** (the server already hosts other sites) |
| App stack | `docker-compose.nginx.yml` (app, queue, scheduler, reverb, postgres) |
| Database | **Postgres 16** in Docker |
| Photos | Local Docker volume (`storage/app`) |
| Domain | `ppakuthm.com` (+ `www`, `ws` subdomain) |
| Realtime | Laravel **Reverb** behind nginx at `wss://ws.ppakuthm.com` |
| Mail | `MAIL_MAILER=log` (no outbound email configured) |

> **Do not use `docker-compose.server.yml` on this server.** That file includes **Caddy**, which would
> fight nginx for ports 80/443. The nginx deployment uses `docker-compose.nginx.yml`.

---

## 1. Prerequisites

- Ubuntu 24.04 (or similar) VPS with `sudo`.
- **Docker Engine + Compose plugin**, `git`, `openssl`.
- **nginx** already running (this server also hosts other sites).
- **certbot** installed (`certbot --version`).
- Ports **80/443** reachable from the internet.
- A domain with DNS control.
- Recommended: **2 GB RAM / 2 vCPU / 10 GB disk** minimum. The live server has 4 CPU / 15 GB.

### Preflight (read-only)

```bash
cat /etc/os-release | grep PRETTY_NAME
uname -m
nproc
free -h
df -h /
docker --version
docker compose version
command -v certbot && certbot --version
sudo ss -tlnp | grep -E ':(80|443)\b'
```

What matters:

- `docker`/`compose` present (if not, install Docker Engine + Compose plugin).
- `certbot` present.
- Ports 80/443 are already owned by **nginx** — we will add a site, not replace nginx.
- 1 GB VPS: add a 2 GB swap file and set `PHP_MEMORY_LIMIT=256M` (see §9).

---

## 2. Domain and DNS

Buy the domain (this deployment used Spaceship), then create **three A records** pointing at the
server's public IPv4:

| Type | Host | Value |
|---|---|---|
| A | `@` | `<SERVER_IP>` |
| A | `www` | `<SERVER_IP>` |
| A | `ws` | `<SERVER_IP>` |

Remove any parking page or URL-forwarding record at `@`. If the domain uses external nameservers,
edit the records at that DNS provider instead.

Verify from your machine (public resolvers):

```bash
for h in ppakuthm.com www.ppakuthm.com ws.ppakuthm.com; do
  echo -n "$h @1.1.1.1 -> "; dig +short "$h" @1.1.1.1
  echo -n "$h @8.8.8.8 -> "; dig +short "$h" @8.8.8.8
done
```

All three must return `<SERVER_IP>` before certbot runs.

> **Known quirk on this server:** `systemd-resolved` sometimes returns NXDOMAIN for `www`/`ws` even
> though public DNS is correct (an upstream negative cache). Browsers and certbot use public DNS, so
> the app works. If you need local `curl` tests, use `--resolve`:
>
> ```bash
> curl -I --resolve www.ppakuthm.com:443:127.0.0.1 https://www.ppakuthm.com/up
> curl -I --resolve ws.ppakuthm.com:443:127.0.0.1 https://ws.ppakuthm.com
> ```
>
> To try clearing it: `sudo resolvectl flush-caches` (or restart `systemd-resolved`). It is harmless
> if it persists.

---

## 3. Clone the repository and create `.env`

```bash
sudo mkdir -p /opt/ppak
sudo chown "$USER":"$USER" /opt/ppak

git clone https://github.com/qalsud/ppak-uthm-connect.git /opt/ppak
cd /opt/ppak
cp .env.server.example .env
```

Generate secrets **without pasting them into the terminal history**:

```bash
APP_KEY=$(docker run --rm php:8.3-cli php -r "echo 'base64:'.base64_encode(random_bytes(32));")
DB_PASS=$(openssl rand -hex 16)
REV_KEY=$(openssl rand -hex 16)
REV_SECRET=$(openssl rand -hex 16)
```

Write the non-secret deployment values and the generated secrets into `.env`:

```bash
sed -i "s|^APP_KEY=.*|APP_KEY=${APP_KEY}|" .env
sed -i "s|^APP_URL=.*|APP_URL=https://ppakuthm.com|" .env
sed -i "s|^DOMAIN=.*|DOMAIN=ppakuthm.com|" .env
sed -i "s|^WS_DOMAIN=.*|WS_DOMAIN=ws.ppakuthm.com|" .env
sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=${DB_PASS}|" .env
sed -i "s|^REVERB_APP_KEY=.*|REVERB_APP_KEY=${REV_KEY}|" .env
sed -i "s|^REVERB_APP_SECRET=.*|REVERB_APP_SECRET=${REV_SECRET}|" .env

# Share the login session between the apex and www.
grep -q '^SESSION_DOMAIN=' .env || echo 'SESSION_DOMAIN=.ppakuthm.com' >> .env

grep -E '^(APP_URL|DOMAIN|WS_DOMAIN|DB_DATABASE|DB_USERNAME|SESSION_DOMAIN|DEMO_SEED)=' .env
```

Expected (non-secret values):

```ini
APP_URL=https://ppakuthm.com
DOMAIN=ppakuthm.com
WS_DOMAIN=ws.ppakuthm.com
DB_DATABASE=ppak
DB_USERNAME=ppak
SESSION_DOMAIN=.ppakuthm.com
DEMO_SEED=true
```

Key choices in `.env`:

- `MEDIA_DISK=attendance` — local private disk in the `ppak_storage_app` volume (not S3).
- `BROADCAST_CONNECTION=reverb` — live chat/bell.
- `QUEUE_CONNECTION=database` — the queue worker processes broadcast jobs.
- `MAIL_MAILER=log` — email is disabled until an SMTP/API provider is configured.
- `PHP_MEMORY_LIMIT=384M` — enough for image processing; use `256M` on a 1 GB VPS.
- `DEMO_SEED=true` for the first boot; set it to `false` after the demo data exists.

> **Secrets stay in `.env` only.** It is gitignored. Never commit it or paste its contents into docs.

---

## 4. Build and start the stack

```bash
cd /opt/ppak
docker compose -f docker-compose.nginx.yml up -d --build
docker compose -f docker-compose.nginx.yml ps
```

Expected containers:

| Container | Role | Host port |
|---|---|---|
| `ppak-app-1` | Apache + PHP app | `127.0.0.1:8083` |
| `ppak-reverb-1` | WebSockets | `127.0.0.1:8084` |
| `ppak-queue-1` | Queue worker | none |
| `ppak-scheduler-1` | `schedule:work` | none |
| `ppak-postgres-1` | Postgres 16 | internal only |

The first build takes a few minutes (Node assets + Composer + PHP extensions).

How the entrypoint behaves (`docker/entrypoint.sh`):

- The **web** service (`apache2-foreground`) runs `migrate --force`, optionally seeds
  (`DEMO_SEED=true`), and warms config/views.
- The **queue**, **scheduler** and **reverb** services receive a different command and skip
  migrations/seeding — they just run their process.
- `PHP_MEMORY_LIMIT` is written to a PHP ini override in each container.
- If `PORT` is set (Render/Koyeb), Apache binds to it; on this server it stays on 80.

Health check:

```bash
curl -I http://127.0.0.1:8083/up
```

---

## 5. Add the nginx site

The repo ships an **HTTP-only** nginx site; certbot adds TLS afterwards.

```bash
sudo cp /opt/ppak/docker/nginx/ppakuthm.com.conf /etc/nginx/sites-available/ppakuthm.com.conf
sudo ln -sf /etc/nginx/sites-available/ppakuthm.com.conf /etc/nginx/sites-enabled/ppakuthm.com.conf
sudo nginx -t
sudo systemctl reload nginx
curl -I http://ppakuthm.com/up
```

Expected: `nginx: ... test is successful` and `HTTP/1.1 200 OK`.

What the site does:

- `ppakuthm.com` / `www` → `127.0.0.1:8083`
- `ws.ppakuthm.com` → `127.0.0.1:8084` with WebSocket upgrade headers
- `client_max_body_size 40m` for photo uploads
- proxy buffers large enough for Inertia/Vite preload headers (see §7)

> **Do not stop nginx.** It hosts other sites on this server. We only add a new site file.

---

## 6. Issue HTTPS with certbot

```bash
sudo certbot --nginx --redirect \
  -d ppakuthm.com \
  -d www.ppakuthm.com \
  -d ws.ppakuthm.com
```

Certbot edits the **live** file in `/etc/nginx/sites-available/ppakuthm.com.conf` (adds 443 server
blocks and HTTP→HTTPS redirects) and reloads nginx. The repo copy stays HTTP-only as the starting
template.

Verify:

```bash
sudo certbot certificates | grep -A2 'ppakuthm.com'
curl -I https://ppakuthm.com/up
curl -I --resolve www.ppakuthm.com:443:127.0.0.1 https://www.ppakuthm.com/up
curl -I --resolve ws.ppakuthm.com:443:127.0.0.1 https://ws.ppakuthm.com
```

Expected:

- certificate domains: `ppakuthm.com`, `www.ppakuthm.com`, `ws.ppakuthm.com`
- app: `200 OK`
- `ws`: `404` or `426` is normal (it is the WebSocket endpoint)

Renewal is automatic via the certbot systemd timer. Test it with:

```bash
sudo certbot renew --dry-run --cert-name ppakuthm.com
```

---

## 7. The 502 fix — nginx proxy header buffers

### Symptom

`/admin/students`, `/admin/teachers`, `/admin/parents` and `/admin/payments` returned **502 Bad
Gateway**, while the dashboard and `/up` worked.

### Cause

`/var/log/nginx/error.log` showed:

```
upstream sent too big header while reading response header from upstream
```

Those list pages send a large Vite/Inertia preload `Link` header, which exceeded nginx's default
4–8 KB proxy header buffer.

### Fix (live server)

Add a global `conf.d` snippet (works even though certbot owns the site file):

```bash
sudo tee /etc/nginx/conf.d/ppak-proxy-buffers.conf >/dev/null <<'EOF'
proxy_buffer_size 32k;
proxy_buffers 8 32k;
proxy_busy_buffers_size 64k;
EOF

sudo nginx -t
sudo systemctl reload nginx
```

The repo's `docker/nginx/ppakuthm.com.conf` now also includes these directives, so a fresh install
gets them from the start.

Retest the four list pages; they should return 200 with no `upstream sent too big header` entries.

---

## 8. Verify the deployment

In a browser:

1. `https://ppakuthm.com` loads with styling.
2. Log in as **admin**.
3. Open Dashboard, Students, Teachers, Parents, Payments.
4. Open a conversation, send a message.
5. Open **Teacher views → Attendance**, check a child in/out with a photo.
6. Log in as **parent**, check the child’s attendance, progress, fees and messages.
7. Log in as **teacher**, check the class, attendance, activities, progress and messages.

Command-line checks:

```bash
curl -I https://ppakuthm.com/up
docker compose -f docker-compose.nginx.yml ps
docker compose -f docker-compose.nginx.yml logs --tail=50 app
```

No `5432` or `8082` should appear in `docker compose ps` as host-published ports — only
`127.0.0.1:8083` and `127.0.0.1:8084`.

---

## 9. First-run hardening

### 9.1 Optional: start from a pristine demo

`migrate:fresh` **destroys all data**. Only do this before real use, and take a backup first if
anything matters.

```bash
cd /opt/ppak
docker compose -f docker-compose.nginx.yml stop queue scheduler
docker compose -f docker-compose.nginx.yml exec -T app sh -c 'rm -rf storage/app/attendance/*'
docker compose -f docker-compose.nginx.yml exec -T app php artisan migrate:fresh --seed --force
docker compose -f docker-compose.nginx.yml start queue scheduler
```

### 9.2 Rotate the demo passwords

The seeded accounts use `password123`, which is public in this repo. Set your own before sharing
the URL.

> **Gotcha:** `docker compose exec -e VAR=...` was parsed incorrectly by this Compose version in the
> original attempt. Use an interactive tinker session instead.

```bash
cd /opt/ppak
docker compose -f docker-compose.nginx.yml exec app php artisan tinker
```

At the `>>>` prompt:

```php
App\Models\User::where('email', 'admin@ppakuthm.com')->first()->update(['password' => 'YOUR_ADMIN_PASSWORD']);
```

```php
App\Models\User::where('email', 'teacher@ppakuthm.com')->first()->update(['password' => 'YOUR_TEACHER_PASSWORD']);
```

```php
App\Models\User::where('email', 'parent@ppakuthm.com')->first()->update(['password' => 'YOUR_PARENT_PASSWORD']);
```

```php
exit
```

The `hashed` cast hashes each password automatically. Use three **distinct** strong passwords, and
save them in a password manager.

### 9.3 Stop re-seeding on restart

```bash
cd /opt/ppak
sed -i 's/^DEMO_SEED=.*/DEMO_SEED=false/' .env
grep '^DEMO_SEED=' .env
docker compose -f docker-compose.nginx.yml up -d
```

---

## 10. Backups

### Database

```bash
cd /opt/ppak
mkdir -p backups
docker compose -f docker-compose.nginx.yml exec -T postgres \
  pg_dump -U ppak ppak | gzip > "backups/ppak-$(date +%F).sql.gz"

gzip -t "backups/ppak-$(date +%F).sql.gz" && echo "database backup ok"
ls -lh backups
```

If `DB_USERNAME`/`DB_DATABASE` differ in `.env`, adjust `-U` and the final database name.

### Photos

```bash
docker volume ls | grep storage
# expected: ppak_storage_app

docker run --rm \
  -v ppak_storage_app:/data \
  -v /opt/ppak/backups:/backup \
  alpine tar czf "/backup/storage-$(date +%F).tar.gz" -C /data .
```

### Nightly database backup (14-day retention)

```bash
( crontab -l 2>/dev/null; cat <<'CRON'
0 3 * * * cd /opt/ppak && docker compose -f docker-compose.nginx.yml exec -T postgres pg_dump -U ppak ppak | gzip > "backups/ppak-$(date +\%F).sql.gz" && find backups -name 'ppak-*.sql.gz' -mtime +14 -delete
CRON
) | crontab -

crontab -l
```

### Restore (outline)

```bash
gunzip -c backups/ppak-YYYY-MM-DD.sql.gz | \
  docker compose -f docker-compose.nginx.yml exec -T postgres psql -U ppak ppak
```

For photos, restore the tarball into the `ppak_storage_app` volume.

---

## 11. Day-to-day operations

```bash
cd /opt/ppak

# status
docker compose -f docker-compose.nginx.yml ps

# logs
docker compose -f docker-compose.nginx.yml logs -f app
docker compose -f docker-compose.nginx.yml logs --tail=100 queue scheduler reverb

# restart the web app only
docker compose -f docker-compose.nginx.yml restart app

# restart everything
docker compose -f docker-compose.nginx.yml restart

# deploy the latest code
git pull
docker compose -f docker-compose.nginx.yml up -d --build

# run an artisan command in the app container
docker compose -f docker-compose.nginx.yml exec app php artisan about
```

### Changing the domain or WebSocket host

`VITE_REVERB_*` is **baked into the JavaScript bundle at build time**. After changing `WS_DOMAIN` or
`REVERB_APP_KEY`:

```bash
docker compose -f docker-compose.nginx.yml up -d --build
```

After changing `APP_URL` or other runtime env values:

```bash
docker compose -f docker-compose.nginx.yml up -d
```

### Reverb / live updates

- Browser URL: `wss://ws.ppakuthm.com`
- Server-side broadcasts go to `reverb:8082` over the internal Docker network.
- If Reverb is down, chat and the bell fall back to polling; check
  `docker compose logs reverb` and `https://ws.ppakuthm.com`.

---

## 12. Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| **502 on list pages**, nginx log says `upstream sent too big header` | Raise proxy buffers (§7) |
| **502 on every page** | App container down/restarting: `docker compose ps`, `logs app` |
| **`certbot` cannot validate** | DNS not pointing at the server, or 80/443 blocked |
| **`www`/`ws` fail only on the server** | `systemd-resolved` negative cache; public DNS/browsers are fine (§2) |
| **Port 80/443 already in use** | It is nginx — add a site, do not stop nginx |
| **Postgres `password authentication failed`** | `DB_PASSWORD` changed after the volume was initialised; restore the old value or `ALTER USER` |
| **Uploads fail / 413** | `docker/php.ini` limits and nginx `client_max_body_size` |
| **Login redirects to `http://`** | `APP_URL` must be the `https://` URL; recreate the app (`up -d`) |
| **Logged out when switching apex/www** | `SESSION_DOMAIN=.ppakuthm.com` and `SESSION_SECURE_COOKIE=true` |
| **Reverb not connecting** | `WS_DOMAIN`/`REVERB_APP_KEY` changed without `--build`; check `wss://` and nginx proxy |
| **Queue jobs piling up** | `queue` container down: `docker compose ps`, `logs queue` |
| **Fee reminders/pruning not running** | `scheduler` container down; `logs scheduler` |
| **`docker compose exec -e` error** | Use interactive `php artisan tinker` (§9.2) |
| **`APP_KEY` changes on restart** | Set `APP_KEY` in `.env`; do not let the entrypoint generate a new one each boot |
| **Unexpected re-seeding** | `DEMO_SEED=false` in `.env` and recreate the app |
| **Disk filling up** | `docker system df`, old images, `backups/`, photo volume |

---

## 13. Where everything lives

| Path / name | Purpose |
|---|---|
| `/opt/ppak` | Repository on the server |
| `/opt/ppak/.env` | Production secrets and settings (gitignored) |
| `/opt/ppak/docker-compose.nginx.yml` | The stack used on this server |
| `/opt/ppak/docker/nginx/ppakuthm.com.conf` | HTTP-only nginx template (certbot adds TLS on the server) |
| `/opt/ppak/docker/php.ini` | Upload/memory limits |
| `/opt/ppak/docker/entrypoint.sh` | Migrate/seed/cache, command forwarding, `PORT`/memory overrides |
| `/etc/nginx/sites-available/ppakuthm.com.conf` | Live nginx site (certbot-managed after issuance) |
| `/etc/nginx/conf.d/ppak-proxy-buffers.conf` | Header buffer fix |
| `/etc/letsencrypt/live/ppakuthm.com/` | TLS certificate |
| `ppak_pg_data` | Postgres data volume |
| `ppak_storage_app` | Uploaded photos |
| `ppak_storage_logs` | Laravel logs |
| `/opt/ppak/backups` | Database/photo backups |
| `docs/DEPLOY-SERVER.md` | Generic Caddy / nginx server guide |
| `docs/DEPLOY-SUPABASE.md` | Supabase Postgres + Storage alternative |
| `docs/demo-accounts.txt` | Seeded demo emails (no deployed passwords) |

---

## 14. Application changes that made this deployment work

These were added during the Postgres/production pass; keep them in mind when moving hosts:

- **`pdo_pgsql` + `pgsql`** installed in the Dockerfile (the production image originally had only MySQL/SQLite).
- **`whereLike()`** everywhere instead of `LIKE`, because Postgres `LIKE` is case-sensitive.
- **Email normalisation** (middleware + `User` mutator), because Postgres `=` is case-sensitive.
- **Atomic payment completion** (`SEC-11`): a webhook + success-page race cannot double-notify.
- **`docker/php.ini`** raises upload/memory limits for the 10 MB photo cap.
- **Entrypoint** forwards commands (queue/scheduler/reverb), supports `PHP_MEMORY_LIMIT`, and binds
  Apache to `$PORT` for Render/Koyeb.
- **`league/flysystem-aws-s3-v3`** is installed for optional Supabase/S3 storage; this deployment
  uses the local `attendance` disk instead.

---

## 15. Security checklist

- [ ] Only nginx publishes 80/443; Postgres/Reverb are `127.0.0.1` or internal only.
- [ ] `APP_ENV=production`, `APP_DEBUG=false`, `SESSION_SECURE_COOKIE=true`.
- [ ] Unique `APP_KEY`, `DB_PASSWORD`, `REVERB_APP_SECRET`.
- [ ] Demo passwords rotated; `docs/demo-accounts.txt` contains emails only.
- [ ] `DEMO_SEED=false` after the demo data exists.
- [ ] Firewall/security group allows only SSH + 80/443.
- [ ] Nightly database backup + photo archive; restore tested at least once.
- [ ] `certbot renew --dry-run --cert-name ppakuthm.com` passes.
- [ ] `.env` never committed; no secrets in docs or chat.
- [ ] SSH uses keys (disable password login if not already).

---

## 16. Demo accounts

The seed creates these emails (the **local seed password** is `password123`; the deployed
passwords were rotated and are not stored in this repo):

| Role | Email |
|---|---|
| Admin | `admin@ppakuthm.com` |
| Teacher | `teacher@ppakuthm.com` |
| Parent | `parent@ppakuthm.com` |
| Pending parent | `pending@ppakuthm.com` |

See [`demo-accounts.txt`](demo-accounts.txt) for the extra seeded teachers/parents.

---

*Deployed November 2026. If you change the domain, ports, container names or compose file, update
this runbook and the links in [`README.md`](../README.md).*
