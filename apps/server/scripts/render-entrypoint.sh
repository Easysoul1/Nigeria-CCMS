#!/bin/sh
# Entrypoint for Render. Turso handles the database itself, so we do not run
# prisma db push here (it would fail against a libsql:// URL). We only seed
# the demo accounts if the database is empty, then start the API.
set -e

cd apps/server

echo "[render] Checking database…"
USER_COUNT="$(node -e '
  const { PrismaClient } = require("@prisma/client");
  const { PrismaLibSql } = require("@prisma/adapter-libsql");
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  const adapter = new PrismaLibSql({ url, authToken });
  const p = new PrismaClient({ adapter });
  p.user.count()
    .then((n) => { console.log(n); return p.$disconnect(); })
    .catch(() => { console.log(0); process.exit(0); });
' 2>/dev/null || echo 0)"

case "$USER_COUNT" in
  ''|*[!0-9]*) USER_COUNT=0 ;;
esac

if [ "$USER_COUNT" -eq 0 ]; then
  echo "[render] Empty database — seeding"
  TURSO_DATABASE_URL="$TURSO_DATABASE_URL" TURSO_AUTH_TOKEN="$TURSO_AUTH_TOKEN" \
    ALLOW_SEED=1 ./node_modules/.bin/prisma db seed || \
    echo "[render] WARN: seed failed — check ADMIN_PASSWORD, REGISTRAR_PASSWORD, etc." >&2
else
  echo "[render] $USER_COUNT users present — skipping seed"
fi

if [ ! -f dist/main.js ]; then
  echo "[render] FATAL: dist/main.js not found. The build step failed to compile the server." >&2
  exit 1
fi

echo "[render] Starting API"
exec node dist/main.js
