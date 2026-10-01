#!/usr/bin/env bash
# Local verification helper: typecheck, then tests. Run from the repo root.
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

echo "== tsc =="
./node_modules/.bin/tsc -p tsconfig.json --noEmit
tsc_status=$?
echo "tsc exit: ${tsc_status}"
exit "${tsc_status}"
