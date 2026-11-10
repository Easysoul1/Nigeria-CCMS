#!/bin/sh
# Entrypoint for the API container.
#
# Idempotent — safe to run on every start:
#   1. Apply the Prisma schema (a no-op if nothing changed)
#   2. If the users table is empty, seed the demo accounts
#   3. exec the CMD (node dist/main.js)
#
# This is what makes free-tier deploys (Render, Fly, Railway) survivable:
# if the ephemeral disk was wiped while the service was asleep, the app
# comes back up with a working database and a usable login.
set -e

DB_URL="${DATABASE_URL:-file:./dev.db}"
echo "[entrypoint] DATABASE_URL=${DB_URL}"

# Ensure the SQLite directory exists when DATABASE_URL points into a mounted
# volume. Absolute paths only — a relative path can resolve anywhere.
case "$DB_URL" in
  file:/*)
    DB_PATH="${DB_URL#file:}"
    DB_DIR="$(dirname "$DB_PATH")"
    mkdir -p "$DB_DIR" 2>/dev/null || true
    echo "[entrypoint] SQLite path: $DB_PATH"
    ;;
esac

echo "[entrypoint] Applying Prisma schema…"
if ./node_modules/.bin/prisma db push --skip-generate 2>&1; then
  echo "[entrypoint] Schema in sync"
else
  echo "[entrypoint] WARN: prisma db push failed — starting anyway" >&2
fi

# Count existing users. Any failure (table missing, corrupt DB) is treated as
# "empty" so that a fresh deploy still seeds instead of crashing.
echo "[entrypoint] Checking database…"
USER_COUNT="$(node -e '
  const { PrismaClient } = require("@prisma/client");
  const p = new PrismaClient();
  p.user
    .count()
    .then((n) => { console.log(n); return p.$disconnect(); })
    .catch(() => { console.log(0); process.exit(0); });
' 2>/dev/null || echo 0)"

case "$USER_COUNT" in
  ''|*[!0-9]*) USER_COUNT=0 ;;
esac

if [ "$USER_COUNT" -eq 0 ]; then
  echo "[entrypoint] Empty database — seeding demo accounts"
  if ALLOW_SEED=1 ./node_modules/.bin/prisma db seed; then
    echo "[entrypoint] Seeded"
  else
    echo "[entrypoint] WARN: seed failed — starting anyway (login will not work)" >&2
  fi
else
  echo "[entrypoint] $USER_COUNT users present — skipping seed"
fi

echo "[entrypoint] Starting: $*"
exec "$@"
