#!/usr/bin/env bash
#
# resolve-uip.sh
#
# Prints the absolute path to the private, plugin-managed `uip` binary.
# Every other script calls this instead of relying on a system `uip` on PATH,
# so the plugin always uses its own pinned CLI version.
#
set -euo pipefail

RUNTIME_ROOT="${HOME}/.uipath-coded-apps/runtime"
RUNTIME_PREFIX="${RUNTIME_ROOT}/node"
RUNTIME_METADATA="${RUNTIME_ROOT}/runtime.json"
NPM_BIN="${RUNTIME_PREFIX}/node_modules/.bin/uip"

# Prefer the path recorded by bootstrap.
if [ -f "$RUNTIME_METADATA" ]; then
  RECORDED="$(python3 - "$RUNTIME_METADATA" <<'PY'
import json, sys
try:
    with open(sys.argv[1], encoding="utf-8") as f:
        print(json.load(f).get("uipPath", ""))
except Exception:
    print("")
PY
)"
  if [ -n "$RECORDED" ] && [ -x "$RECORDED" ]; then
    printf '%s\n' "$RECORDED"
    exit 0
  fi
fi

if [ -x "$NPM_BIN" ]; then
  printf '%s\n' "$NPM_BIN"
  exit 0
fi

echo "UiPath CLI not found. The plugin's setup step has not completed yet." >&2
echo "Open a new session (the plugin installs the CLI automatically on session start)." >&2
exit 1
