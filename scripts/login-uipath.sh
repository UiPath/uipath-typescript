#!/usr/bin/env bash
#
# login-uipath.sh <environment>
#
# Opens the UiPath browser sign-in for the chosen environment. The CLI stores
# the resulting token in its own credential store, so a single sign-in is
# reused by every later pack / publish / deploy until it expires.
#
#   environment: cloud (default) | staging | alpha
#
set -euo pipefail

ENVIRONMENT="${1:-cloud}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UIP="$("$SCRIPT_DIR/resolve-uip.sh")"

case "$ENVIRONMENT" in
  cloud)
    echo "Opening UiPath sign-in for Cloud (cloud.uipath.com)..." >&2
    "$UIP" login
    ;;
  staging)
    echo "Opening UiPath sign-in for Staging (staging.uipath.com)..." >&2
    "$UIP" login --authority https://staging.uipath.com
    ;;
  alpha)
    echo "Opening UiPath sign-in for Alpha (alpha.uipath.com)..." >&2
    "$UIP" login --authority https://alpha.uipath.com
    ;;
  *)
    echo "Unsupported environment '$ENVIRONMENT'. Use cloud, staging, or alpha." >&2
    exit 1
    ;;
esac
