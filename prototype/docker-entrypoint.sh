#!/bin/sh
set -eu

mkdir -p "$(dirname "$DATABASE_PATH")" "$MEDIA_DIRECTORY"

# Generate a deployment-specific key on the persistent volume. Never copy the
# local development key into Coolify, and reuse this key across restarts.
if [ -z "${EMDASH_ENCRYPTION_KEY:-}" ]; then
  key_file="$(dirname "$DATABASE_PATH")/.emdash-encryption-key"
  if [ ! -s "$key_file" ]; then
    umask 077
    key_tmp="$(mktemp "$key_file.XXXXXX")"
    node -e 'process.stdout.write("emdash_enc_v1_" + require("node:crypto").randomBytes(32).toString("base64url"))' > "$key_tmp"
    mv "$key_tmp" "$key_file"
  fi
  chmod 600 "$key_file"
  export EMDASH_ENCRYPTION_KEY="$(cat "$key_file")"
fi

if [ ! -e "$DATABASE_PATH" ]; then
  ./node_modules/.bin/emdash seed seed/seed.json --database "$DATABASE_PATH"
fi

exec node dist/server/entry.mjs
