#!/usr/bin/env bash
set -e

cd /var/www/html

# Named volumes can be created root-owned; keep storage writable by Apache.
chown -R www-data:www-data storage bootstrap/cache 2>/dev/null || true

# Optional per-container memory cap for small VPSes (e.g. PHP_MEMORY_LIMIT=256M).
if [ -n "${PHP_MEMORY_LIMIT:-}" ]; then
  printf 'memory_limit = %s\n' "${PHP_MEMORY_LIMIT}" > /usr/local/etc/php/conf.d/zz-memory.ini
fi

# The web service uses the image's default CMD. A second service (queue worker,
# scheduler, Reverb) passes its own command as arguments.
if [ $# -eq 0 ]; then
  set -- apache2-foreground
fi

# Schema, demo seed and caches belong to the web service. Extra services assume
# the web service has already prepared them and just run their command.
if [ "$1" = "apache2-foreground" ]; then
  # 1. App key (platform should set APP_KEY; generate one if missing so a demo boots).
  if [ -z "${APP_KEY:-}" ]; then
    php artisan key:generate --force
  fi

  # 2. Demo database. SQLite keeps the deploy dependency-free; set DB_CONNECTION=mysql
  #    or pgsql (plus the DB_* variables) to use a managed database instead.
  if [ "${DB_CONNECTION:-sqlite}" = "sqlite" ]; then
    DB_FILE="${DB_DATABASE:-database/database.sqlite}"
    mkdir -p "$(dirname "$DB_FILE")"
    [ -f "$DB_FILE" ] || touch "$DB_FILE"
  fi

  # 3. Schema.
  php artisan migrate --force

  # 4. Demo content (idempotent — skips when data already exists).
  if [ "${DEMO_SEED:-true}" = "true" ]; then
    php artisan db:seed --force || true
  fi

  # 5. Caches (route:cache is skipped — the landing route uses a closure).
  php artisan config:cache || true
  php artisan view:cache || true

  # 6. Free hosts (Render/Koyeb) inject PORT; Apache defaults to 80.
  if [ -n "${PORT:-}" ] && [ "${PORT}" != "80" ]; then
    sed -i "s/Listen 80/Listen ${PORT}/" /etc/apache2/ports.conf
    sed -i "s/:80>/:${PORT}>/" /etc/apache2/sites-available/000-default.conf
  fi
fi

exec "$@"
