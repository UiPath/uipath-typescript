#!/usr/bin/env bash
# Installs and builds each sample project given as an argument, the way a user
# would from a clean checkout (npm ci + build). Builds them all, then fails if
# any failed. Run it before installing the repo root's dependencies, as CI does:
# a root node_modules can hide a sample's missing dependency.
#
#   bash scripts/build-samples.sh samples/queues-app samples/process-app-v1
set -uo pipefail

build() {
  if node -e "process.exit(require('./package.json').scripts?.build ? 0 : 1)"; then
    npm run build
  elif [ -f tsconfig.json ]; then
    # No build script (e.g. coded-functions, packaged by the uip CLI): type-check only.
    npx tsc --noEmit -p .
  else
    echo "No build script or tsconfig.json; install only."
  fi
}

if [ "$#" -eq 0 ]; then
  echo "No sample projects to build."
  exit 0
fi

failed=()
for dir in "$@"; do
  echo "::group::$dir"
  # A fresh npm cache per project, so every package is fetched from the URL in
  # its own lockfile; a shared cache would let a package another sample already
  # downloaded hide an unreachable URL (e.g. a registry that needs auth).
  cache=$(mktemp -d)
  (cd "$dir" && export npm_config_cache="$cache" && npm ci && build)
  code=$?
  # So a nested project (functions-app/coded-functions) can't resolve packages
  # from its parent's node_modules.
  rm -rf "$dir/node_modules" "$cache"
  echo "::endgroup::"
  if [ "$code" -ne 0 ]; then
    echo "::error::$dir failed to install or build"
    failed+=("$dir")
  fi
done

if [ "${#failed[@]}" -gt 0 ]; then
  echo "${#failed[@]} of $# sample projects failed:"
  printf '  %s\n' "${failed[@]}"
  exit 1
fi
echo "All $# sample projects built."
