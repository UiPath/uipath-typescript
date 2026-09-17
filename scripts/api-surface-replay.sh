#!/usr/bin/env bash
# Replay the api-surface gate against history, to check whether a past change
# would have been caught.
#
#   scripts/api-surface-replay.sh <ref>            # diff <ref>^ vs <ref>
#   scripts/api-surface-replay.sh <refA> <refB>    # diff refA vs refB
#
# Works on any historical ref: the generator reads source via the TypeScript
# AST with no type checker and no module resolution, so the old commit does not
# need its own node_modules.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
A="${1:?usage: api-surface-replay.sh <ref> [<ref>]}"
B="${2:-}"
if [ -z "$B" ]; then B="$A"; A="$A^"; fi
SCRATCH="$ROOT/.apihist"
gen() {
  local ref="$1" label="$2" d="$SCRATCH/src-$label" out="$SCRATCH/out-$label"
  rm -rf "$d" "$out"; mkdir -p "$d"
  git -C "$ROOT" archive "$ref" src rollup.config.js | tar -x -C "$d"
  node "$ROOT/scripts/gen-api-surface.mjs" "$d" "$out" >/dev/null
}
gen "$A" before
gen "$B" after
echo "api-surface: $A -> $B"
diff -ru "$SCRATCH/out-before" "$SCRATCH/out-after" || true
