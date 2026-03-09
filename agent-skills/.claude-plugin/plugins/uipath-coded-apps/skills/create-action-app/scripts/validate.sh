#!/usr/bin/env bash
# validate.sh — Validates a UiPath coded action app project is correctly configured
# Usage: bash scripts/validate.sh [project-dir]
#
# Checks:
#   - Required files exist
#   - vite.config.ts has nodePolyfills, define:, base:
#   - package.json has required dependencies
#   - action-schema.json has all required sections
#   - src/uipath.ts references CodedActionApps or CodedActionAppsService
#   - src/components/Form.tsx has getTask, completeTask, setTaskData
#   - @uipath/uipath-ts-coded-action-apps is installed in node_modules (WARN only)
#
# Example:
#   bash scripts/validate.sh ./my-action-app

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

echo "Validating UiPath coded action app at: $PROJECT_DIR"
echo ""

# 1. Required files
echo "--- Required Files ---"
check_file "package.json"
check_file "index.html"
check_file "vite.config.ts"
check_file "uipath.json"
check_file "action-schema.json"
check_file "tsconfig.json"
check_file "tsconfig.node.json"
check_file "eslint.config.js"
check_file "src/env.d.ts"
check_file "src/uipath.ts"
check_file "src/main.tsx"
check_file "src/App.tsx"
check_file "src/App.css"
check_file "src/index.css"
check_file "src/components/Form.tsx"
check_file "src/components/Form.css"
echo ""

# 2. vite.config.ts patterns
echo "--- Vite Config ---"
if [ -f "$PROJECT_DIR/vite.config.ts" ]; then
  check_content "vite.config.ts" "nodePolyfills" "nodePolyfills plugin"
  check_content "vite.config.ts" "define:" "define: block"
  check_content "vite.config.ts" "base:" "base: path"
fi
echo ""

# 3. package.json dependencies
echo "--- Package Dependencies ---"
if [ -f "$PROJECT_DIR/package.json" ]; then
  check_content "package.json" "@uipath/uipath-ts-coded-action-apps" "@uipath/uipath-ts-coded-action-apps dependency"
  check_content "package.json" "vite-plugin-node-polyfills" "vite-plugin-node-polyfills dependency"
  check_content "package.json" "\"react\"" "react dependency"
fi
echo ""

# 4. action-schema.json sections
echo "--- Action Schema ---"
if [ -f "$PROJECT_DIR/action-schema.json" ]; then
  check_content "action-schema.json" "\"inputs\"" "inputs section"
  check_content "action-schema.json" "\"outputs\"" "outputs section"
  check_content "action-schema.json" "\"inOuts\"" "inOuts section"
  check_content "action-schema.json" "\"outcomes\"" "outcomes section"
fi
echo ""

# 5. src/uipath.ts — CodedActionApps or CodedActionAppsService
echo "--- UiPath Service Initialisation ---"
if [ -f "$PROJECT_DIR/src/uipath.ts" ]; then
  if grep -q "CodedActionApps" "$PROJECT_DIR/src/uipath.ts" 2>/dev/null || \
     grep -q "CodedActionAppsService" "$PROJECT_DIR/src/uipath.ts" 2>/dev/null; then
    echo "  OK: src/uipath.ts has CodedActionApps or CodedActionAppsService"
  else
    echo "FAIL: src/uipath.ts missing CodedActionApps or CodedActionAppsService import"
    ERRORS=$((ERRORS + 1))
  fi
fi
echo ""

# 6. src/components/Form.tsx — task lifecycle methods
echo "--- Form Component ---"
if [ -f "$PROJECT_DIR/src/components/Form.tsx" ]; then
  check_content "src/components/Form.tsx" "getTask" "getTask call"
  check_content "src/components/Form.tsx" "completeTask" "completeTask call"
  check_content "src/components/Form.tsx" "setTaskData" "setTaskData call"
fi
echo ""

# 7. node_modules — WARN only (not a FAIL)
echo "--- Installed Packages ---"
if [ -d "$PROJECT_DIR/node_modules/@uipath/uipath-ts-coded-action-apps" ]; then
  echo "  OK: @uipath/uipath-ts-coded-action-apps installed in node_modules"
else
  echo "WARN: @uipath/uipath-ts-coded-action-apps not found in node_modules (run npm install)"
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
