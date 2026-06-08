#!/usr/bin/env bash
#
# session-info.sh
#
# Reports the current UiPath sign-in as clean JSON on stdout:
#   { "loggedIn": bool, "environment": str, "baseUrl": str,
#     "org": str, "tenant": str, "expiration": str }
#
# Exit code: 0 when signed in, 1 when not. Used both to decide whether a
# sign-in is needed and to reuse the existing session for deploy.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UIP="$("$SCRIPT_DIR/resolve-uip.sh")"

STATUS_JSON="$("$UIP" login status --output json 2>/dev/null || true)"

python3 - "$STATUS_JSON" <<'PY'
import json, sys

raw = sys.argv[1] if len(sys.argv) > 1 else ""
try:
    data = (json.loads(raw) or {}).get("Data", {}) if raw.strip() else {}
except Exception:
    data = {}

base_url = (data.get("BaseUrl") or "").rstrip("/")
org = data.get("Organization") or ""
tenant = data.get("Tenant") or ""
status = data.get("Status") or ""

env = "cloud"
if "alpha.uipath.com" in base_url:
    env = "alpha"
elif "staging.uipath.com" in base_url:
    env = "staging"

logged_in = (status == "Logged in") and bool(org) and org != "N/A" and bool(tenant) and tenant != "N/A"

print(json.dumps({
    "loggedIn": logged_in,
    "environment": env,
    "baseUrl": base_url,
    "org": org,
    "tenant": tenant,
    "expiration": data.get("Expiration Date") or "",
}, indent=2))

sys.exit(0 if logged_in else 1)
PY
