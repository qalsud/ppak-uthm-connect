# ---------- Stage 1: build the frontend ----------
FROM node:20-alpine AS assets

# Baked into the JS bundle at build time. For the local Docker stack the browser
# reaches Reverb on the host (localhost:8080); override for a deployed host.
ARG VITE_REVERB_APP_KEY=ppak-local-key
ARG VITE_REVERB_HOST=localhost
ARG VITE_REVERB_PORT=8080
ARG VITE_REVERB_SCHEME=http

WORKDIR /app
COPY package*.json .npmrc* ./
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps
COPY . .
# .env is dockerignored, so write the VITE_* values Vite needs before building.
RUN printf 'VITE_REVERB_APP_KEY=%s\nVITE_REVERB_HOST=%s\nVITE_REVERB_PORT=%s\nVITE_REVERB_SCHEME=%s\nVITE_APP_NAME="PPAK UTHM Connect"\n' \
        "$VITE_REVERB_APP_KEY" "$VITE_REVERB_HOST" "$VITE_REVERB_PORT" "$VITE_REVERB_SCHEME" > .env \
    && npm run build

# ---------- Stage 2: PHP + Apache runtime ----------
FROM php:8.3-apache

ENV APACHE_DOCUMENT_ROOT=/var/www/html/public

RUN apt-get update && apt-get install -y --no-install-recommends \
        git unzip libpng-dev libjpeg62-turbo-dev libfreetype6-dev \
        libonig-dev libzip-dev libsqlite3-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" pdo_mysql pdo_sqlite mbstring exif pcntl bcmath gd zip \
    && a2enmod rewrite headers \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY . .
COPY --from=assets /app/public/build ./public/build
COPY docker/apache/000-default.conf /etc/apache2/sites-available/000-default.conf

RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader \
    && sed -i 's/\r$//' docker/entrypoint.sh \
    && chmod +x docker/entrypoint.sh \
    && chown -R www-data:www-data storage bootstrap/cache database

EXPOSE 80

ENTRYPOINT ["docker/entrypoint.sh"]
