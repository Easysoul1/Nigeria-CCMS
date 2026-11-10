#!/usr/bin/env bash
set -euo pipefail
FILE=$1
pg_restore --clean --if-exists -d "${POSTGRES_DB:-ccms}" "$FILE"
echo "restored $FILE"
