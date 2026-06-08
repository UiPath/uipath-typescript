#!/usr/bin/env bash
#
# start-local-app.sh [port]
#
# Starts a local preview of the coded app in the background so the user can see
# it before it is deployed. Handles both shapes:
#   - a buildable project (package.json with a "dev" script)  -> npm run dev
#   - a prebuilt static app (a dist/ folder)                  -> static server
# Run from the project root. Prints the preview URL on stdout.
#
set -euo pipefail

PORT="${1:-5173}"
HOST="${HOST:-127.0.0.1}"
LOG_FILE="/tmp/uipath-coded-apps-dev.log"
PID_FILE="/tmp/uipath-coded-apps-dev.pid"

# Stop a previous preview if one is still running.
if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  kill "$(cat "$PID_FILE")" 2>/dev/null || true
fi

has_dev_script() {
  [ -f package.json ] && node -e "process.exit(require('./package.json').scripts && require('./package.json').scripts.dev ? 0 : 1)" 2>/dev/null
}

if has_dev_script; then
  if [ ! -d node_modules ]; then
    echo "Installing project dependencies..." >&2
    npm install >&2
  fi
  echo "Starting local preview on http://${HOST}:${PORT} ..." >&2
  nohup npm run dev -- --host "$HOST" --port "$PORT" >"$LOG_FILE" 2>&1 &
  echo "$!" >"$PID_FILE"
else
  # Static preview: serve the built dist/ (or the current dir if it is the dist).
  SERVE_DIR="dist"
  [ -d "$SERVE_DIR" ] || SERVE_DIR="."
  echo "Starting local preview of '${SERVE_DIR}' on http://${HOST}:${PORT} ..." >&2
  nohup python3 -m http.server "$PORT" --bind "$HOST" --directory "$SERVE_DIR" >"$LOG_FILE" 2>&1 &
  echo "$!" >"$PID_FILE"
fi

echo "http://${HOST}:${PORT}"
echo "Preview running. Logs: ${LOG_FILE}" >&2
