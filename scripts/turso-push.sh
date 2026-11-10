#!/usr/bin/env bash
# Push the Prisma schema to a Turso (libSQL) database.
#
# Why this exists:
#   - `prisma db push` cannot talk to libsql:// URLs.
#   - Requiring the Turso CLI is one more binary to install.
#
# So we use what this repo already has:
#   - `prisma migrate diff` turns the schema into SQL.
#   - `@libsql/client` talks to Turso with the same auth token the app uses.
#
# Usage:
#   TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... ./scripts/turso-push.sh
#
# Or put both values in apps/server/.env and run it bare:
#   ./scripts/turso-push.sh
set -euo pipefail

# Load apps/server/.env if the caller did not export the two values.
if [ -z "${TURSO_DATABASE_URL:-}" ] || [ -z "${TURSO_AUTH_TOKEN:-}" ]; then
  if [ -f apps/server/.env ]; then
    set -a
    # shellcheck disable=SC1091
    . apps/server/.env
    set +a
  fi
fi

: "${TURSO_DATABASE_URL:?set TURSO_DATABASE_URL or put it in apps/server/.env}"
: "${TURSO_AUTH_TOKEN:?set TURSO_AUTH_TOKEN or put it in apps/server/.env}"

case "$TURSO_DATABASE_URL" in
  libsql://*) ;;
  *) echo "error: TURSO_DATABASE_URL must start with libsql://" >&2; exit 1 ;;
esac

echo "[turso] target: $TURSO_DATABASE_URL"

# pnpm --filter runs with cwd = apps/server, so the schema path is relative
# to that package, not to the repo root.
echo "[turso] generating SQL from prisma/schema.prisma"
SCHEMA_SQL="$(pnpm --silent --filter @court-ccms/server exec prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script 2>/dev/null)"

if [ -z "$SCHEMA_SQL" ]; then
  echo "error: prisma migrate diff produced no SQL" >&2
  exit 1
fi

export SCHEMA_SQL
export TURSO_DATABASE_URL
export TURSO_AUTH_TOKEN

echo "[turso] applying SQL"
pnpm --silent --filter @court-ccms/server exec node - <<'NODE'
const { createClient } = require("@libsql/client");

async function main() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  let sql = process.env.SCHEMA_SQL;
  if (!sql) throw new Error("SCHEMA_SQL is empty");

  // Turso (libSQL) is SQLite. SQLite doesn't have a native BOOLEAN type.
  // Prisma emits BOOLEAN and true/false, which standard SQLite tolerates
  // via affinity, but libSQL can be strict. Rewrite them to INTEGER/1/0
  // to be guaranteed compatible without changing the Prisma schema.
  sql = sql
    .replace(/\bBOOLEAN\b/gi, "INTEGER")
    .replace(/\bDEFAULT true\b/gi, "DEFAULT 1")
    .replace(/\bDEFAULT false\b/gi, "DEFAULT 0");

  // Prisma emits one statement per `;` followed by a newline.
  const statements = sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  console.log(`[turso] ${statements.length} statements`);

  let applied = 0;
  let skipped = 0;

  for (const stmt of statements) {
    try {
      await client.execute(stmt);
      applied += 1;
    } catch (err) {
      const msg = String(err?.message ?? err);
      if (/already exists/i.test(msg)) {
        skipped += 1;
        continue;
      }
      console.error(`\n[turso] failed statement:\n${stmt}\n`);
      throw err;
    }
  }

  console.log(`[turso] applied ${applied}, skipped ${skipped}`);
  client.close();
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
NODE

echo "[turso] done"
