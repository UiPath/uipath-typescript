#!/usr/bin/env bash
#
# pack-publish-deploy.sh <app-name> <version> [dist] [folder-key] [app-type]
#
# Builds the app, then packs -> publishes -> deploys it to UiPath using the
# already-authenticated CLI session. Reuses the existing sign-in; never
# prompts for credentials. Prints progress to stderr and, on success, the
# deployed app URL to stdout as the final line: "APP_URL=<url>".
#
# Run from the project root (the directory containing package.json).
#
set -euo pipefail

APP_NAME="${1:?app name required}"
VERSION="${2:?version required}"
DIST="${3:-dist}"
FOLDER_KEY="${4:-}"
APP_TYPE="${5:-Web}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UIP="$("$SCRIPT_DIR/resolve-uip.sh")"

log() { printf '[uipath-coded-apps] %s\n' "$*" >&2; }

# Pre-sanitize to a name the CLI accepts unchanged (lowercase, digits, hyphens),
# so pack / publish / deploy all reference the exact same package id. Passing a
# raw name risks each step sanitizing differently and losing track of the .nupkg.
APP_ID="$(printf '%s' "$APP_NAME" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//')"
if [ -z "$APP_ID" ]; then
  log "App name '${APP_NAME}' has no usable characters. Choose a name with letters or digits."
  exit 1
fi

# --- Preconditions ----------------------------------------------------------
SESSION_JSON="$("$SCRIPT_DIR/session-info.sh" 2>/dev/null || true)"
if ! printf '%s' "$SESSION_JSON" | python3 -c 'import json,sys; sys.exit(0 if json.load(sys.stdin).get("loggedIn") else 1)' 2>/dev/null; then
  log "Not signed in to UiPath. Complete sign-in before deploying."
  exit 1
fi

# --- Build (only when this is a buildable project) --------------------------
# Coded apps deploy from a static dist/ folder. A buildable project (one with a
# package.json "build" script) is built first; a prebuilt static dist/ (e.g.
# from `uip codedapp init`, or a hand-authored SPA) is packed as-is.
if [ -f package.json ] && node -e "process.exit(require('./package.json').scripts && require('./package.json').scripts.build ? 0 : 1)" 2>/dev/null; then
  [ -d node_modules ] || { log "Installing project dependencies..."; npm install >&2; }
  log "Building the app..."
  npm run build >&2
fi

if [ ! -d "$DIST" ]; then
  log "No built app found at '$DIST'. Expected a static dist/ folder (or a package.json with a build script)."
  exit 1
fi

# --- Pack -> Publish -> Deploy ----------------------------------------------
log "Packing '${APP_ID}' v${VERSION}..."
"$UIP" codedapp pack "$DIST" -n "$APP_ID" -v "$VERSION" --content-type webapp >&2

log "Publishing to UiPath..."
"$UIP" codedapp publish -n "$APP_ID" -v "$VERSION" -t "$APP_TYPE" >&2

log "Deploying..."
if [ -n "$FOLDER_KEY" ]; then
  DEPLOY_JSON="$("$UIP" codedapp deploy -n "$APP_ID" -v "$VERSION" --folder-key "$FOLDER_KEY" --output json)"
else
  DEPLOY_JSON="$("$UIP" codedapp deploy -n "$APP_ID" -v "$VERSION" --output json)"
fi

# Echo the raw deploy response so the orchestrator can inspect it.
printf 'DEPLOY_RESPONSE=%s\n' "$DEPLOY_JSON" >&2

# --- Resolve the app URL ----------------------------------------------------
# Prefer any URL the CLI returns; otherwise build a best-effort portal link
# from the authenticated session (base URL + org + tenant).
APP_URL="$(python3 - "$DEPLOY_JSON" "$SESSION_JSON" <<'PY'
import json, re, sys

deploy_raw, session_raw = sys.argv[1], sys.argv[2]

def first_url(obj):
    if isinstance(obj, str):
        m = re.search(r'https?://[^\s"\']+', obj)
        return m.group(0) if m else None
    if isinstance(obj, dict):
        for v in obj.values():
            u = first_url(v)
            if u:
                return u
    if isinstance(obj, list):
        for v in obj:
            u = first_url(v)
            if u:
                return u
    return None

url = None
try:
    url = first_url(json.loads(deploy_raw))
except Exception:
    url = first_url(deploy_raw)

if not url:
    try:
        s = json.loads(session_raw)
        base, org, tenant = s.get("baseUrl", ""), s.get("org", ""), s.get("tenant", "")
        if base and org:
            # Best-effort link to the Apps portal for this org/tenant.
            url = f"{base}/{org}/{tenant}/apps_/" if tenant else f"{base}/{org}/apps_/"
    except Exception:
        pass

print(url or "")
PY
)"

if [ -n "$APP_URL" ]; then
  log "Deployment complete."
  printf 'APP_URL=%s\n' "$APP_URL"
else
  log "Deployment complete, but no app URL could be resolved from the response."
  printf 'APP_URL=\n'
fi
