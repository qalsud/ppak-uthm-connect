#!/usr/bin/env bash
#
# Production helper for ppakuthm.com. Installed root-owned at
# /usr/local/bin/ppak-deploy and invoked through a forced SSH command:
#
#   ssh deploy@HOST deploy
#   ssh deploy@HOST backup
#   ssh deploy@HOST reseed
#
# It deliberately keeps all server-specific values in .env / this file. The
# deploy action is safe to retry; the reseed action is destructive and needs
# the /opt/ppak/.allow-reseed marker.

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/ppak}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.nginx.yml}"
BACKUP_DIR="${APP_DIR}/backups"
STORAGE_VOLUME="${STORAGE_VOLUME:-ppak_storage_app}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:8083/up}"

cd "$APP_DIR"
COMPOSE=(docker compose -f "$COMPOSE_FILE")

log() {
    printf '==> %s\n' "$*"
}

die() {
    printf 'ERROR: %s\n' "$*" >&2
    exit 1
}

if [ -f "${APP_DIR}/scripts/remote-deploy.sh" ] \
    && ! cmp -s "${BASH_SOURCE[0]}" "${APP_DIR}/scripts/remote-deploy.sh"; then
    log "WARNING: installed deploy helper differs from scripts/remote-deploy.sh; reinstall it before relying on new behaviour"
fi

require_clean_checkout() {
    # Server-specific values belong in .env (gitignored) or untracked files.
    # A dirty tracked tree means the deploy would silently discard work.
    if ! git diff --quiet || ! git diff --cached --quiet; then
        die "tracked files in $APP_DIR are modified; commit or discard them before deploying"
    fi
}

backup_database() {
    local stamp="$1"
    local file="${BACKUP_DIR}/db-${stamp}.sql.gz"

    log "Backing up Postgres to ${file}"
    "${COMPOSE[@]}" exec -T postgres sh -c "pg_dump -U \"\$POSTGRES_USER\" \"\$POSTGRES_DB\"" \
        | gzip > "$file"

    gzip -t "$file" || die "database backup is not a valid gzip file"
    [ -s "$file" ] || die "database backup is empty"
}

backup_photos() {
    local stamp="$1"
    local file="${BACKUP_DIR}/storage-${stamp}.tar.gz"

    if ! docker volume inspect "$STORAGE_VOLUME" >/dev/null 2>&1; then
        log "WARNING: volume ${STORAGE_VOLUME} not found; skipping photo backup"
        return
    fi

    log "Backing up photos to ${file}"
    docker run --rm \
        -v "${STORAGE_VOLUME}:/data:ro" \
        -v "${BACKUP_DIR}:/backup" \
        alpine tar czf "/backup/storage-${stamp}.tar.gz" -C /data .

    gzip -t "$file" || die "photo backup is not a valid gzip file"
}

backup() {
    mkdir -p "$BACKUP_DIR"
    local stamp
    stamp="$(date +%F-%H%M%S)"

    backup_database "$stamp"
    backup_photos "$stamp"

    # Keep two weeks of database dumps and one week of photo archives.
    find "$BACKUP_DIR" -maxdepth 1 -name 'db-*.sql.gz' -mtime +14 -delete
    find "$BACKUP_DIR" -maxdepth 1 -name 'storage-*.tar.gz' -mtime +7 -delete

    log "Latest backups"
    find "$BACKUP_DIR" -maxdepth 1 -type f \
        -printf '%TY-%Tm-%Td %TH:%TM %10s %f\n' | sort | tail -n 10
}

deploy() {
    require_clean_checkout

    log "Pre-deploy backup"
    backup

    log "Fetching origin/main"
    git fetch --prune origin

    local target="${TARGET:-origin/main}"
    if ! git cat-file -e "${target}^{commit}" >/dev/null 2>&1; then
        die "target ${target} is not a known commit"
    fi

    local previous
    previous="$(git rev-parse --short HEAD)"

    log "Deploying ${target} (previous ${previous})"
    git reset --hard "$target"

    log "Building and starting containers"
    "${COMPOSE[@]}" up -d --build

    log "Waiting for ${HEALTH_URL}"
    local healthy=0
    for _ in $(seq 1 60); do
        if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
            healthy=1
            break
        fi
        sleep 2
    done

    if [ "$healthy" -ne 1 ]; then
        "${COMPOSE[@]}" logs --tail=120 app >&2 || true
        die "health check failed; previous commit was ${previous}. Roll back with: git reset --hard ${previous} && docker compose -f ${COMPOSE_FILE} up -d --build"
    fi

    docker image prune -f >/dev/null 2>&1 || true

    log "Deployed $(git rev-parse --short HEAD) successfully"
}

reseed() {
    [ -f "${APP_DIR}/.allow-reseed" ] \
        || die "reseed is locked; create ${APP_DIR}/.allow-reseed on the server first"

    log "Pre-reseed backup"
    backup

    log "Putting the app into maintenance mode"
    "${COMPOSE[@]}" exec -T app php artisan down || true
    "${COMPOSE[@]}" stop queue scheduler || true

    log "Clearing uploaded photos"
    "${COMPOSE[@]}" exec -T app sh -c 'rm -rf storage/app/attendance/*'

    log "Running migrate:fresh --seed"
    "${COMPOSE[@]}" exec -T app php artisan migrate:fresh --seed --force

    "${COMPOSE[@]}" start queue scheduler || true
    "${COMPOSE[@]}" exec -T app php artisan up || true

    rm -f "${APP_DIR}/.allow-reseed"

    log "Reseed complete. Reset the three demo passwords now."
}

ACTION="${1:-${SSH_ORIGINAL_COMMAND:-deploy}}"
if [ "$#" -ge 2 ]; then
    ACTION="$1 $2"
fi
TARGET="${ACTION#"${ACTION%% *}"}"
TARGET="${TARGET# }"
ACTION="${ACTION%% *}"

if [ -n "$TARGET" ] && ! printf '%s' "$TARGET" | grep -Eq '^[0-9a-f]{7,40}$'; then
    die "invalid deploy target '${TARGET}'; expected a commit SHA"
fi

case "$ACTION" in
    deploy) deploy ;;
    backup) backup ;;
    reseed) reseed ;;
    *)
        die "unknown action '${ACTION}'; expected deploy, backup or reseed"
        ;;
esac
