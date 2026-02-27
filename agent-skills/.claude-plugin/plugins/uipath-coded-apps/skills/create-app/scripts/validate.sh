#!/usr/bin/env bash
# validate.sh — Validates a UiPath coded app project is correctly configured
# Usage: bash scripts/validate.sh [project-dir]
#
# Checks:
#   - Required files exist (vite.config.ts, .env, src/hooks/useAuth.tsx, src/App.tsx)
#   - vite.config.ts has all 3 required patches (define, resolve, optimizeDeps)
#   - .env has all required variables
#   - @uipath/uipath-typescript is installed
#   - Tailwind CSS is configured
#
# Example:
#   bash scripts/validate.sh ./my-app

set -euo pipefail

PROJECT_DIR="${1:-.}"
ERRORS=0

check_file() {
  if [ ! -f "$PROJECT_DIR/$1" ]; then
    echo "FAIL: Missing file: $1"
    ERRORS=$((ERRORS + 1))
    return 1
  fi
  echo "  OK: $1 exists"
  return 0
}

check_content() {
  local file="$1"
  local pattern="$2"
  local description="$3"
  if ! grep -q "$pattern" "$PROJECT_DIR/$file" 2>/dev/null; then
    echo "FAIL: $file missing $description"
    ERRORS=$((ERRORS + 1))
    return 1
  fi
  echo "  OK: $file has $description"
  return 0
}

echo "Validating UiPath project at: $PROJECT_DIR"
echo ""

# 1. Required files
echo "--- Required Files ---"
check_file "vite.config.ts"
check_file ".env"
check_file "src/hooks/useAuth.tsx"
check_file "src/App.tsx"
check_file "tailwind.config.js"
check_file "postcss.config.js"
check_file "package.json"
echo ""

# 2. vite.config.ts patches
echo "--- Vite Config Patches ---"
if [ -f "$PROJECT_DIR/vite.config.ts" ]; then
  check_content "vite.config.ts" "global:" "define.global patch"
  check_content "vite.config.ts" "path-browserify" "resolve.alias for path-browserify"
  check_content "vite.config.ts" "optimizeDeps" "optimizeDeps.include"
fi
echo ""

# 3. .env variables
echo "--- Environment Variables ---"
if [ -f "$PROJECT_DIR/.env" ]; then
  check_content ".env" "VITE_UIPATH_BASE_URL" "VITE_UIPATH_BASE_URL"
  check_content ".env" "VITE_UIPATH_CLIENT_ID" "VITE_UIPATH_CLIENT_ID"
  check_content ".env" "VITE_UIPATH_ORG_NAME" "VITE_UIPATH_ORG_NAME"
  check_content ".env" "VITE_UIPATH_TENANT_NAME" "VITE_UIPATH_TENANT_NAME"
  check_content ".env" "VITE_UIPATH_SCOPES" "VITE_UIPATH_SCOPES"
fi
echo ""

# 4. Dependencies installed
echo "--- Dependencies ---"
if [ -f "$PROJECT_DIR/package.json" ]; then
  check_content "package.json" "@uipath/uipath-typescript" "@uipath/uipath-typescript dependency"
  check_content "package.json" "path-browserify" "path-browserify dependency"
fi
if [ -d "$PROJECT_DIR/node_modules/@uipath/uipath-typescript" ]; then
  echo "  OK: @uipath/uipath-typescript installed in node_modules"
else
  echo "WARN: @uipath/uipath-typescript not found in node_modules (run npm install)"
fi
echo ""

# 5. Auth hook structure
echo "--- Auth Hook ---"
if [ -f "$PROJECT_DIR/src/hooks/useAuth.tsx" ]; then
  check_content "src/hooks/useAuth.tsx" "isInOAuthCallback" "OAuth callback detection"
  check_content "src/hooks/useAuth.tsx" "completeOAuth" "OAuth completion"
  check_content "src/hooks/useAuth.tsx" "sdk.initialize" "SDK initialization"
  check_content "src/hooks/useAuth.tsx" "AuthProvider" "AuthProvider export"
  check_content "src/hooks/useAuth.tsx" "useAuth" "useAuth hook export"
fi
echo ""

# Summary
echo "================================"
if [ "$ERRORS" -eq 0 ]; then
  echo "ALL CHECKS PASSED"
else
  echo "FAILED: $ERRORS issue(s) found"
fi
exit "$ERRORS"
