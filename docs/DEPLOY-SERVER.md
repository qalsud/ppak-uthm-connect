# Deploying on your own server (with or without a domain)

This runs the **whole app on one VPS**. Use your own domain (recommended), or a free DuckDNS
subdomain if you do not have one yet. No Supabase, no cold starts.

```
Browser ──HTTPS──> Caddy :443 ──> app        (Apache + PHP-FPM module)
Browser ──WSS────> Caddy :443 ──> reverb     :8082   (live chat + bell)
                       app ─────> postgres   :5432   (internal only)
             queue + scheduler ─> postgres, reverb
                       photos ──> Docker volume (storage/app)
```

Only Caddy publishes ports. Postgres, Reverb, the queue worker and the scheduler stay on the
internal Docker network.

> **Does the server already run nginx on 80/443?** Do not use Caddy. Follow the
> [existing nginx + certbot](#existing-nginx--certbot-variant) variant at the end instead.

---

## 0. Check the server

```bash
free -h
nproc
df -h /
uname -m                 # x86_64 or aarch64
docker --version
docker compose version
sudo ss -tlnp | grep -E ':(80|443)\b'
```

Recommended: **2 vCPU / 2 GB RAM / 10 GB disk**. A 1 GB VPS works with swap and a lower PHP memory
limit (see §10). Ports **80 and 443 must be free** — stop any existing Apache/Nginx first.

## 1. DNS

You need **two hostnames** pointing at the server: one for the app and one for the WebSocket
endpoint. With your own domain these are usually `app.example.com` and `ws.example.com`; with
DuckDNS they are `ppak-demo.duckdns.org` and `ppak-ws.duckdns.org`.

### Option A — your own domain (recommended)

| Type | Name | Value |
|---|---|---|
| A | `app` (or `@` for the apex) | server public IPv4 |
| A | `ws` | server public IPv4 |

Add the records at your registrar or DNS provider, then verify:

```bash
dig +short app.example.com
dig +short ws.example.com
```

If you use Cloudflare DNS, set both records to **DNS only** (grey cloud) for the first deploy so
Caddy can complete the Let's Encrypt challenge. You can enable the proxy later with SSL mode
**Full (strict)**.

### Option B — free DuckDNS

1. Sign in at [duckdns.org](https://www.duckdns.org).
2. Create **two** subdomains, e.g. `ppak-demo` and `ppak-ws`.
3. Point both at the server's public IPv4 address.

```bash
dig +short ppak-demo.duckdns.org
dig +short ppak-ws.duckdns.org
```

Both must return the server's IP before starting Caddy, or certificate issuance will fail.

> **Dynamic IP?** Add a cron on the server (the token is on the DuckDNS page):
>
> ```bash
> */5 * * * * curl -s "https://www.duckdns.org/update?domains=ppak-demo,ppak-ws&token=YOUR_TOKEN&ip=" >/dev/null
> ```

## 2. Get the code

```bash
sudo mkdir -p /opt/ppak && sudo chown "$USER":"$USER" /opt/ppak
git clone https://github.com/qalsud/ppak-uthm-connect.git /opt/ppak
cd /opt/ppak
```

## 3. Configure

```bash
cp .env.server.example .env
```

Generate the secrets:

```bash
# Laravel APP_KEY (either line)
php artisan key:generate --show
docker run --rm php:8.3-cli php -r "echo 'base64:'.base64_encode(random_bytes(32)).PHP_EOL;"

# Random values for the database and Reverb
openssl rand -hex 16   # DB_PASSWORD
openssl rand -hex 16   # REVERB_APP_KEY
openssl rand -hex 16   # REVERB_APP_SECRET
```

Edit `.env` and set at least:

- `APP_KEY` — the generated `base64:…` value
- `APP_URL=https://app.example.com`
- `DOMAIN=app.example.com`
- `WS_DOMAIN=ws.example.com`
- `DB_PASSWORD`
- `REVERB_APP_KEY`, `REVERB_APP_SECRET`

Use passwords made of hex characters (no `#`, `$` or quotes) to avoid Compose/dotenv escaping
problems.

## 4. Open the firewall

Ubuntu/Debian (`ufw`):

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

If the VPS has a cloud security group (Hetzner firewall, Oracle NSG, etc.), allow **80/tcp** and
**443/tcp** there too. Do **not** open 5432 or 8082.

## 5. Build and start

```bash
docker compose -f docker-compose.server.yml up -d --build
```

The first build takes a few minutes (Node assets + Composer + PHP extensions). Then:

```bash
docker compose -f docker-compose.server.yml ps
docker compose -f docker-compose.server.yml logs -f app caddy
```

The app entrypoint runs `migrate --force` and, with `DEMO_SEED=true`, seeds the demo. Caddy requests
Let's Encrypt certificates for both names once DNS resolves.

## 6. Verify

| Check | Expected |
|---|---|
| `https://app.example.com/up` | `200 OK` |
| `https://app.example.com` | login page |
| Admin / teacher / parent logins | work |
| Check a child out with a photo | image uploads and reloads |
| Open a chat in two browsers | messages appear live over WSS |
| `docker compose ps` | no `5432`/`8082` published |

`https://ws.example.com` is the WebSocket endpoint; a plain browser visit returning `404` or
`426` is normal.

## 7. First-run hardening

Rotate the seeded passwords (`demo-accounts.txt` lists the demo emails; the deployed passwords are not in the repo):

```bash
docker compose -f docker-compose.server.yml exec app php artisan tinker
```

```php
$u = App\Models\User::where('email', 'admin@ppakuthm.com')->first();
$u->password = 'a-strong-password';
$u->save();
```

Repeat for the teacher and parent demo accounts, then stop re-seeding:

```ini
DEMO_SEED=false
```

```bash
docker compose -f docker-compose.server.yml up -d
```

## 8. Backups

Database:

```bash
mkdir -p backups
docker compose -f docker-compose.server.yml exec -T postgres \
  pg_dump -U ppak ppak | gzip > "backups/ppak-$(date +%F).sql.gz"
```

Nightly cron (14-day retention):

```bash
0 3 * * * cd /opt/ppak && docker compose -f docker-compose.server.yml exec -T postgres pg_dump -U ppak ppak | gzip > "backups/ppak-$(date +\%F).sql.gz" && find backups -name 'ppak-*.sql.gz' -mtime +14 -delete
```

Photos live in the `storage_app` volume. Confirm its name with `docker volume ls` (usually
`ppak_storage_app`) and archive it:

```bash
docker run --rm -v ppak_storage_app:/data -v /opt/ppak/backups:/backup alpine \
  tar czf "/backup/storage-$(date +%F).tar.gz" -C /data .
```

## 9. Updates

```bash
cd /opt/ppak
git pull
docker compose -f docker-compose.server.yml up -d --build
```

Migrations run automatically on the app container. If you change `WS_DOMAIN`,
`REVERB_APP_KEY` or any `VITE_REVERB_*` value, a rebuild is required because Vite bakes those into
the JavaScript bundle.

## 10. Small VPS notes (1 GB RAM)

Add swap before building:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Then in `.env`:

```ini
PHP_MEMORY_LIMIT=256M
MEDIA_MAX_PIXELS=12000000
```

If the server still cannot build the image, build it on your machine and load it over SSH (the
architectures must match — build with `--platform linux/arm64` for an ARM VPS):

```bash
docker build -t ppak-uthm-connect:server \
  --build-arg VITE_REVERB_APP_KEY=... \
  --build-arg VITE_REVERB_HOST=ws.example.com \
  --build-arg VITE_REVERB_PORT=443 \
  --build-arg VITE_REVERB_SCHEME=https .
docker save ppak-uthm-connect:server | gzip | ssh user@server 'gunzip | docker load'
ssh user@server 'cd /opt/ppak && docker compose -f docker-compose.server.yml up -d --no-build'
```

## 11. Troubleshooting

| Symptom | Fix |
|---|---|
| Caddy cannot get a certificate | DNS not pointing to the server, or 80/443 blocked. `docker compose logs caddy` |
| `404` on the app domain | `docker compose ps` — app unhealthy? `docker compose logs app` |
| `500` after deploy | Usually `APP_KEY` missing or Postgres not ready. Check app logs |
| `502` on list pages, nginx log says `upstream sent too big header` | Raise the proxy header buffers: `proxy_buffer_size 32k; proxy_buffers 8 32k; proxy_busy_buffers_size 64k;` in the app server block, then `nginx -t` and reload |
| Login works but redirects to `http://` | `APP_URL` must be the `https://` URL; recreate the app container |
| Realtime not connecting | The bundle still points at the build-time `WS_DOMAIN`. Rebuild after changing it |
| Mixed-content WebSocket errors | `APP_URL` must be HTTPS and `REVERB_SCHEME=http` only for the internal app→Reverb hop |
| `password authentication failed` for Postgres | `DB_PASSWORD` changed after the volume was initialised. Restore the old value or `ALTER USER` |
| Disk filling up | `docker system df`, prune old images, check `backups/` |

## 12. Security checklist

- [ ] Only Caddy publishes ports; `docker compose ps` shows no `5432`/`8082`.
- [ ] `APP_DEBUG=false`, `APP_ENV=production`, `SESSION_SECURE_COOKIE=true`.
- [ ] `APP_KEY`, `DB_PASSWORD`, `REVERB_APP_SECRET` are random and unique.
- [ ] Demo passwords rotated; `DEMO_SEED=false`.
- [ ] Firewall allows only 22/80/443.
- [ ] Database and photo-volume backups tested at least once.
- [ ] SSH uses keys (disable password login if it is not already).

---

## Existing nginx + certbot variant

Use this when **nginx already serves other sites on 80/443** and cannot be stopped. It runs the
same app stack without Caddy; nginx proxies to the containers on localhost.

**Ports:** app `127.0.0.1:8083`, Reverb `127.0.0.1:8084`. Nothing is exposed directly.

1. Start the stack with the nginx compose file:

   ```bash
   docker compose -f docker-compose.nginx.yml up -d --build
   ```

2. Install the nginx site (adjust the domain if yours differs):

   ```bash
   sudo cp docker/nginx/ppakuthm.com.conf /etc/nginx/sites-available/ppakuthm.com.conf
   sudo ln -s /etc/nginx/sites-available/ppakuthm.com.conf /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

   At this point `http://ppakuthm.com/up` should return 200.

3. Add TLS with the existing certbot:

   ```bash
   sudo certbot --nginx -d ppakuthm.com -d www.ppakuthm.com -d ws.ppakuthm.com
   ```

   Choose the **redirect** option. Certbot edits the site in `sites-enabled`; the repo copy stays
   HTTP-only for reference.

4. Share the session between the apex and `www` in `.env`:

   ```ini
   SESSION_DOMAIN=.ppakuthm.com
   ```

   Then recreate the app:

   ```bash
   docker compose -f docker-compose.nginx.yml up -d
   ```

5. Verify:

   - `https://ppakuthm.com/up` → 200
   - `https://www.ppakuthm.com` → the same app
   - chat updates live over `wss://ws.ppakuthm.com`
   - `docker compose -f docker-compose.nginx.yml ps` shows `8083`/`8084` bound to `127.0.0.1` only

If you change `WS_DOMAIN` or `REVERB_APP_KEY` later, rebuild (`--build`) because Vite bakes them
into the JS bundle.
