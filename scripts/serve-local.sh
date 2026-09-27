#!/usr/bin/env bash
# Run the pip-and-pour production build as a local Node server.
set -u
export PATH="/opt/homebrew/bin:$PATH"
export PORT="${PORT:-8787}"
export HOST="${HOST:-127.0.0.1}"
export NITRO_PORT="$PORT"
export NITRO_HOST="$HOST"
cd "$HOME/pip-and-pour" || exit 1
exec node .output-node/server/index.mjs
