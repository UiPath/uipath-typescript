#!/usr/bin/env bash
#
# bootstrap-uipath-env.sh
#
# Installs a private, plugin-managed UiPath CLI runtime (plus the codedapp tool)
# so every later step (login, pack, publish, deploy) has a known-good `uip` to
# call.
#
# Runs from the plugin's blocking SessionStart hook, so it executes once,
# automatically, before the user ever invokes the skill — no command typed.
# A version-stamped lock file makes every subsequent session a fast no-op.
#
set -euo pipefail

# --- Configuration ----------------------------------------------------------
PINNED_UIP_VERSION="1.1.1"
PUBLIC_REGISTRY="https://registry.npmjs.org"

RUNTIME_ROOT="${HOME}/.uipath-coded-apps/runtime"
RUNTIME_PREFIX="${RUNTIME_ROOT}/node"
RUNTIME_METADATA="${RUNTIME_ROOT}/runtime.json"

# Persistent, survives plugin updates. Falls back when run outside the hook.
DATA_DIR="${CLAUDE_PLUGIN_DATA:-${HOME}/.uipath-coded-apps/data}"
LOCK_FILE="${DATA_DIR}/bootstrap.lock"

# npm env config that forces the public registry for the @uipath scope, so a
# scoped .npmrc (project or user) pointing @uipath at a private registry cannot
# break installs. `env` is used because the key contains characters invalid in
# a shell identifier.
REG_ENV=( "npm_config_@uipath:registry=${PUBLIC_REGISTRY}" "npm_config_registry=${PUBLIC_REGISTRY}" )

log() { printf '[uipath-coded-apps] %s\n' "$*" >&2; }

# --- Resolve the private uip binary path ------------------------------------
resolve_uip_path() {
  local npm_bin="${RUNTIME_PREFIX}/node_modules/.bin/uip"
  if [ -x "$npm_bin" ]; then printf '%s\n' "$npm_bin"; return 0; fi
  local pkg_json="${RUNTIME_PREFIX}/node_modules/@uipath/cli/package.json"
  if [ -f "$pkg_json" ]; then
    local rel
    rel="$(python3 - "$pkg_json" <<'PY'
import json, sys
with open(sys.argv[1], encoding="utf-8") as f:
    b = json.load(f).get("bin")
print(b if isinstance(b, str) else (next(iter(b.values()), "") if isinstance(b, dict) else ""))
PY
)"
    if [ -n "$rel" ] && [ -x "${RUNTIME_PREFIX}/node_modules/@uipath/cli/${rel}" ]; then
      printf '%s\n' "${RUNTIME_PREFIX}/node_modules/@uipath/cli/${rel}"; return 0
    fi
  fi
  return 1
}

cli_ok()      { [ "$("$1" --version 2>/dev/null || true)" = "$PINNED_UIP_VERSION" ]; }
codedapp_ok() { "$1" codedapp help pack 2>/dev/null | grep -q '"Result": "Success"'; }

# --- Fast path: already fully set up at the pinned version ------------------
# The lock is only written after a full verify, so on subsequent sessions a
# filesystem-only check (no `uip` spawn) keeps the blocking hook near-instant.
if [ -f "$LOCK_FILE" ] && [ "$(cat "$LOCK_FILE" 2>/dev/null)" = "$PINNED_UIP_VERSION" ] && resolve_uip_path >/dev/null 2>&1; then
  exit 0
fi

if ! command -v npm >/dev/null 2>&1; then
  log "npm / Node.js not found on PATH. Install Node.js 20+ to use the UiPath Coded Apps plugin."
  exit 1
fi

mkdir -p "$RUNTIME_ROOT" "$DATA_DIR"

# --- Ensure the pinned CLI is installed (reinstall only when needed) --------
if ! { UIP="$(resolve_uip_path)" && cli_ok "$UIP"; }; then
  log "Setting up the UiPath CLI (one-time)..."
  rm -rf "$RUNTIME_PREFIX"
  mkdir -p "$RUNTIME_PREFIX"
  env "${REG_ENV[@]}" npm install --prefix "$RUNTIME_PREFIX" "@uipath/cli@${PINNED_UIP_VERSION}" \
    --no-audit --no-fund >&2
  if ! UIP="$(resolve_uip_path)"; then
    log "UiPath CLI installed but the executable could not be located."
    exit 1
  fi
fi
log "UiPath CLI $("$UIP" --version 2>/dev/null || echo '?') ready."

# --- Ensure the codedapp tool is available ----------------------------------
if ! codedapp_ok "$UIP"; then
  log "Installing the Coded Apps toolset..."
  env "${REG_ENV[@]}" "$UIP" tools install codedapp >&2 2>&1 || true
fi

cat >"$RUNTIME_METADATA" <<EOF
{
  "cliVersion": "${PINNED_UIP_VERSION}",
  "installedVersion": "$("$UIP" --version 2>/dev/null || true)",
  "uipPath": "${UIP}"
}
EOF

# Only record success (and skip future work) once codedapp is truly usable;
# otherwise leave the lock unset so the next session retries.
if codedapp_ok "$UIP"; then
  printf '%s' "$PINNED_UIP_VERSION" >"$LOCK_FILE"
  log "UiPath Coded Apps plugin is ready."
else
  log "UiPath CLI is ready, but the Coded Apps toolset could not be installed yet; it will be retried."
fi
