#!/usr/bin/env bash
# Replays the API surface comparison over history.
# Usage: api-surface-replay.sh <ref> | <refA> <refB>
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
A="${1:?usage: api-surface-replay.sh <ref> [<ref>]}"
B="${2:-}"
if [ -z "$B" ]; then B="$A"; A="$A^"; fi
SCRATCH="$ROOT/.apihist"
gen() {
  local ref="$1"
  local label="$2"
  local d="$SCRATCH/src-$label"
  local out="$SCRATCH/out-$label"
  rm -rf "$d" "$out"; mkdir -p "$d"
  git -C "$ROOT" archive "$ref" src rollup.config.js package.json tsconfig.json | tar -x -C "$d"
  node "$ROOT/scripts/gen-api-surface.mjs" "$d" "$out" >/dev/null
}
gen "$A" before
gen "$B" after
echo "api-surface: $A -> $B"
node "$ROOT/scripts/check-api-surface.mjs" "$SCRATCH/out-before" "$SCRATCH/out-after"
