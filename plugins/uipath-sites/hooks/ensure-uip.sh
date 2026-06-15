#!/bin/bash
# Ensures @uipath/cli is installed globally and installs UiPath Codex skills.
# Runs once per session via the SessionStart plugin hook.
# If npm is missing, attempts to install Node.js first.
# Supports Windows, macOS, and Linux.

set -e

fail() {
  echo "$1" >&2
  echo "Please install Node.js from https://nodejs.org and restart your session." >&2
  exit 2
}

ensure_npm() {
  command -v npm >/dev/null 2>&1 && return

  local os
  os="$(uname -s 2>/dev/null || echo "Windows")"

  case "$os" in
    MINGW*|MSYS*|CYGWIN*|Windows*)
      if command -v winget >/dev/null 2>&1; then
        winget install --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements >/dev/null 2>&1
      elif command -v choco >/dev/null 2>&1; then
        choco install nodejs-lts -y >/dev/null 2>&1
      elif command -v nvm >/dev/null 2>&1; then
        nvm install --lts >/dev/null 2>&1
        nvm use --lts >/dev/null 2>&1
      else
        fail "No package manager found (winget, choco, or nvm)."
      fi
      export PATH="$PATH:/c/Program Files/nodejs:/c/ProgramData/nvm"
      ;;
    Darwin*)
      if command -v brew >/dev/null 2>&1; then
        brew install node >/dev/null 2>&1
      elif command -v nvm >/dev/null 2>&1; then
        nvm install --lts >/dev/null 2>&1
        nvm use --lts >/dev/null 2>&1
      else
        fail "No package manager found (brew or nvm)."
      fi
      ;;
    Linux*)
      if command -v apt-get >/dev/null 2>&1; then
        sudo apt-get update -y >/dev/null 2>&1
        sudo apt-get install -y nodejs npm >/dev/null 2>&1
      elif command -v dnf >/dev/null 2>&1; then
        sudo dnf install -y nodejs npm >/dev/null 2>&1
      elif command -v yum >/dev/null 2>&1; then
        sudo yum install -y nodejs npm >/dev/null 2>&1
      elif command -v pacman >/dev/null 2>&1; then
        sudo pacman -Sy --noconfirm nodejs npm >/dev/null 2>&1
      elif command -v nvm >/dev/null 2>&1; then
        nvm install --lts >/dev/null 2>&1
        nvm use --lts >/dev/null 2>&1
      else
        fail "No supported package manager found."
      fi
      ;;
    *)
      fail "Unsupported platform."
      ;;
  esac

  hash -r 2>/dev/null
  command -v npm >/dev/null 2>&1 || fail "Node.js was installed but npm is not yet available in this session."
}

is_symlink_or_junction() {
  local input="$1" posix_p win_p
  if [[ "$input" =~ ^[A-Za-z]: ]]; then
    win_p="$input"
    if command -v wslpath >/dev/null 2>&1; then
      posix_p="$(wslpath -u "$input" 2>/dev/null || echo "$input")"
    elif command -v cygpath >/dev/null 2>&1; then
      posix_p="$(cygpath -u "$input" 2>/dev/null || echo "$input")"
    else
      posix_p="$input"
    fi
  else
    posix_p="$input"
    if command -v wslpath >/dev/null 2>&1; then
      win_p="$(wslpath -w "$input" 2>/dev/null || echo "$input")"
    elif command -v cygpath >/dev/null 2>&1; then
      win_p="$(cygpath -w "$input" 2>/dev/null || echo "$input")"
    else
      win_p="$input"
    fi
  fi
  [ -e "$posix_p" ] || return 1
  if [[ "$input" =~ ^[A-Za-z]: ]]; then
    if command -v fsutil.exe >/dev/null 2>&1; then
      fsutil.exe reparsepoint query "$win_p" >/dev/null 2>&1
      return $?
    fi
    if command -v fsutil >/dev/null 2>&1; then
      fsutil reparsepoint query "$win_p" >/dev/null 2>&1
      return $?
    fi
  fi
  [ -L "$posix_p" ]
}

is_linked_package() {
  local pkg="$1"
  local npm_root
  npm_root="$(npm root -g 2>/dev/null)"
  [ -n "$npm_root" ] && is_symlink_or_junction "$npm_root/$pkg" && return 0
  is_symlink_or_junction "$HOME/.bun/install/global/node_modules/$pkg" && return 0
  return 1
}

is_from_other_feed() {
  local pkg="$1" scope cfg
  case "$pkg" in
    @*/*) scope="${pkg%%/*}" ;;
    *) return 1 ;;
  esac
  cfg="$(npm config get "$scope:registry" 2>/dev/null)"
  if [ -z "$cfg" ] || [ "$cfg" = "undefined" ]; then
    return 1
  fi
  case "${cfg%/}" in
    https://registry.npmjs.org) return 1 ;;
    *) return 0 ;;
  esac
}

ensure_npm_package() {
  local pkg="$1"
  local registry_flag="--@uipath:registry=https://registry.npmjs.org/"

  if is_linked_package "$pkg" || is_from_other_feed "$pkg"; then
    return
  fi

  if npm ls -g "$pkg" --depth=0 >/dev/null 2>&1 \
    && [ -z "$(npm outdated -g "$pkg" $registry_flag 2>/dev/null)" ]; then
    return
  fi

  local output
  if ! output="$(npm install -g $registry_flag "$pkg" 2>&1)"; then
    echo "Failed to install $pkg:" >&2
    echo "$output" >&2
    echo "Please run manually: npm install -g $registry_flag $pkg" >&2
    exit 2
  fi
}

ensure_uipath_skills() {
  local output
  if ! output="$(uip skills install --agent codex 2>&1)"; then
    echo "Failed to install UiPath Codex skills:" >&2
    echo "$output" >&2
    echo "Please run manually: uip skills install --agent codex" >&2
    exit 2
  fi
}

ensure_npm
ensure_npm_package @uipath/cli
ensure_uipath_skills
