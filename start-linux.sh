#!/usr/bin/env sh
set -eu
if [ ! -f .env.local ]; then
  echo '[ERROR] Copy .env.example to .env.local and configure admin credentials first.'
  exit 1
fi
export PORT="${PORT:-3000}"
export HOSTNAME="${HOSTNAME:-0.0.0.0}"
export NODE_PATH="$PWD/node_modules/.pnpm/node_modules"
exec node node_modules/next/dist/bin/next start
