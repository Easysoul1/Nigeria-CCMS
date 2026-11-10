#!/usr/bin/env bash
set -euo pipefail
TS=$(date +%Y%m%d-%H%M%S)
mkdir -p backups
pg_dump -Fc -U "${POSTGRES_USER:-ccms}" -d "${POSTGRES_DB:-ccms}" > "backups/ccms-$TS.dump"
echo "backup -> backups/ccms-$TS.dump"
