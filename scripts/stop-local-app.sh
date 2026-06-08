#!/usr/bin/env bash
#
# stop-local-app.sh
#
# Stops the background dev server started by start-local-app.sh.
#
set -euo pipefail

PID_FILE="/tmp/uipath-coded-apps-dev.pid"

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  kill "$(cat "$PID_FILE")" 2>/dev/null || true
  rm -f "$PID_FILE"
  echo "Local preview stopped." >&2
else
  echo "No running preview found." >&2
fi
