#!/bin/sh
set -eu

mkdir -p "$(dirname "$DATABASE_PATH")" "$MEDIA_DIRECTORY"
if [ ! -f /data/.prototype-seeded ]; then
  ./node_modules/.bin/emdash seed seed/seed.json --database "$DATABASE_PATH"
  touch /data/.prototype-seeded
fi

exec node dist/server/entry.mjs
