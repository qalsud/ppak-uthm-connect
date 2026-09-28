#!/usr/bin/env bash
set -e

cd /var/www/html

# 1. App key (platform should set APP_KEY; generate one if missing so a demo boots).
if [ -z "${APP_KEY:-}" ]; then
  php artisan key:generate --force
fi

# 2. Demo database. SQLite keeps the deploy dependency-free; set DB_CONNECTION=mysql
#    (plus the DB_* variables) to use a managed database instead.
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

exec apache2-foreground
