#!/usr/bin/env bash
# deploy.sh — one-command VPS redeploy for the VPS + Caddy path.
#
# Not for Render or Vercel — those build automatically on git push.
# This script is for a box you SSH into.
#
# Usage:
#   ./deploy.sh                     # pull, build, restart
#   ./deploy.sh --no-pull           # build + restart only
#   ./deploy.sh --force             # allow deploying with uncommitted local changes
#   ./deploy.sh --migrate           # also run `prisma migrate deploy` (postgres only)
#
# Assumes:
#   - you are in the repo root
#   - pm2 is installed and manages `ccms-api` and `ccms-web`
#   - .env / .env.production exist where the apps expect them
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
DIM='\033[2m'
RESET='\033[0m'

log()  { printf "${GREEN}[deploy]${RESET} %s\n" "$*"; }
warn() { printf "${YELLOW}[deploy]${RESET} %s\n" "$*"; }
fail() { printf "${RED}[deploy]${RESET} %s\n" "$*" >&2; exit 1; }

# ---------- parse flags ----------
DO_PULL=true
FORCE=false
DO_MIGRATE=false
for arg in "$@"; do
  case "$arg" in
    --no-pull)  DO_PULL=false ;;
    --force)    FORCE=true ;;
    --migrate)  DO_MIGRATE=true ;;
    -h|--help)
      sed -n '2,20p' "$0"
      exit 0
      ;;
    *) fail "unknown flag: $arg (try --help)" ;;
  esac
done

# ---------- sanity ----------
[ -f package.json ] || fail "run this from the repo root"
command -v pnpm >/dev/null || fail "pnpm not installed"
command -v pm2  >/dev/null || fail "pm2 not installed"

if [ "$DO_PULL" = true ] && [ "$FORCE" != true ]; then
  if ! git diff --quiet || ! git diff --cached --quiet; then
    fail "uncommitted changes — commit, stash, or pass --force"
  fi
fi

if [ -z "${NEXT_PUBLIC_API_URL:-}" ]; then
  # Try .env.production, then .env, then fail with a helpful message.
  for f in .env.production .env apps/client/.env.production apps/client/.env; do
    if [ -f "$f" ]; then
      # shellcheck disable=SC1090
      set -a; . "$f"; set +a
      [ -n "${NEXT_PUBLIC_API_URL:-}" ] && break
    fi
  done
fi
[ -n "${NEXT_PUBLIC_API_URL:-}" ] || \
  fail "NEXT_PUBLIC_API_URL is not set (checked env, .env.production, .env)"

log "NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL"

# ---------- 1. pull ----------
if [ "$DO_PULL" = true ]; then
  log "git pull"
  git pull --ff-only
fi

# ---------- 2. install ----------
log "pnpm install --frozen-lockfile"
pnpm install --frozen-lockfile

# ---------- 3. prisma generate ----------
log "prisma generate"
pnpm --filter @court-ccms/server exec prisma generate

# ---------- 4. build ----------
log "building server"
pnpm --filter @court-ccms/server build

log "building client (bakes NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL)"
NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" \
  pnpm --filter @court-ccms/client build

# ---------- 5. schema ----------
if [ "$DO_MIGRATE" = true ]; then
  log "prisma migrate deploy (postgres)"
  pnpm --filter @court-ccms/server exec prisma migrate deploy
else
  log "prisma db push (sqlite)"
  pnpm --filter @court-ccms/server exec prisma db push --skip-generate
fi

# ---------- 6. restart ----------
log "pm2 restart ccms-api ccms-web"
pm2 restart ccms-api ccms-web --update-env
pm2 save >/dev/null

# ---------- 7. verify ----------
log "waiting for API to come up"
API_URL="${NEXT_PUBLIC_API_URL%/}"
for i in $(seq 1 30); do
  if curl -fsS -o /dev/null "$API_URL/api/v1/health" 2>/dev/null; then
    log "API healthy at $API_URL/api/v1/health"
    break
  fi
  [ "$i" = 30 ] && { warn "API did not respond after 30s — check: pm2 logs ccms-api"; exit 0; }
  sleep 1
done

log "done"
