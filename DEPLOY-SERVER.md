# Deploying on your own server (no domain needed)

This runs the **whole app on one VPS** with a free DuckDNS subdomain and automatic HTTPS. No
purchased domain, no Supabase, no cold starts.

```
Browser ──HTTPS──> Caddy :443 ──> app        (Apache + PHP-FPM module)
Browser ──WSS────> Caddy :443 ──> reverb     :8082   (live chat + bell)
                       app ─────> postgres   :5432   (internal only)
             queue + scheduler ─> postgres, reverb
                       photos ──> Docker volume (storage/app)
```

Only Caddy publishes ports. Postgres, Reverb, the queue worker and the scheduler stay on the
internal Docker network.

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

## 1. Create the free DuckDNS names

1. Sign in at [duckdns.org](https://www.duckdns.org).
2. Create **two** subdomains, e.g. `ppak-demo` and `ppak-ws`.
3. Point both at the server's public IPv4 address.

Verify from the server (or your machine):

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
- `APP_URL=https://ppak-demo.duckdns.org`
- `DOMAIN=ppak-demo.duckdns.org`
- `WS_DOMAIN=ppak-ws.duckdns.org`
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
| `https://ppak-demo.duckdns.org/up` | `200 OK` |
| `https://ppak-demo.duckdns.org` | login page |
| Admin / teacher / parent logins | work |
| Check a child out with a photo | image uploads and reloads |
| Open a chat in two browsers | messages appear live over WSS |
| `docker compose ps` | no `5432`/`8082` published |

`https://ppak-ws.duckdns.org` is the WebSocket endpoint; a plain browser visit returning `404` or
`426` is normal.

## 7. First-run hardening

Rotate the seeded passwords (`accounts.txt` is public in the repo):

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
  --build-arg VITE_REVERB_HOST=ppak-ws.duckdns.org \
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
