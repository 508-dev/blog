#!/bin/sh
set -eu

mkdir -p "$(dirname "$DATABASE_PATH")" "$MEDIA_DIRECTORY"
if [ ! -e "$DATABASE_PATH" ]; then
  ./node_modules/.bin/emdash seed seed/seed.json --database "$DATABASE_PATH"
fi

exec node dist/server/entry.mjs
