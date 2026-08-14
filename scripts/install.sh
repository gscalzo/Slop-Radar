#!/usr/bin/env bash
#
# Build Slop Radar and install it into a Chromium-based browser.
#
#   ./scripts/install.sh                  auto-detect a browser and install
#   ./scripts/install.sh --browser arc    pick one: arc | chrome | chromium | brave | edge
#   ./scripts/install.sh --build          build only, then print the manual steps
#   ./scripts/install.sh --clean          reset the throwaway profile first
#
# Two install paths, because browsers differ:
#
#   Chrome, Chromium, Brave and Edge honour --load-extension, so the script
#   launches a throwaway profile (.chrome-profile/) with the extension already
#   loaded. Your everyday profile, extensions and cookies are untouched.
#
#   Arc accepts those flags and silently ignores them (verified against Arc
#   1.158: it always uses its own profile). There the script builds, copies the
#   dist path to your clipboard, and opens Arc's extensions page for a one-time
#   "Load unpacked" — which then persists across restarts.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="$ROOT/dist"
PROFILE="$ROOT/.chrome-profile"
FEED_URL="https://www.linkedin.com/feed/"
ORDER=(arc chrome chromium brave edge)

BROWSER=""
BUILD_ONLY=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --browser)
      BROWSER="${2:-}"
      shift 2
      ;;
    --build)
      BUILD_ONLY=true
      shift
      ;;
    --clean)
      rm -rf "$PROFILE"
      shift
      ;;
    -h | --help)
      sed -n '3,19p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "unknown option: $1 (try --help)" >&2
      exit 2
      ;;
  esac
done

mac_app() {
  case "$1" in
    arc) echo "/Applications/Arc.app" ;;
    chrome) echo "/Applications/Google Chrome.app" ;;
    chromium) echo "/Applications/Chromium.app" ;;
    brave) echo "/Applications/Brave Browser.app" ;;
    edge) echo "/Applications/Microsoft Edge.app" ;;
  esac
}

linux_bins() {
  case "$1" in
    chrome) echo "google-chrome google-chrome-stable" ;;
    chromium) echo "chromium chromium-browser" ;;
    brave) echo "brave-browser brave" ;;
    edge) echo "microsoft-edge microsoft-edge-stable" ;;
    *) echo "" ;;
  esac
}

# Arc is the only one here that ignores --load-extension.
uses_flags() { [[ "$1" != arc ]]; }

# Prints "<key>\t<app-or-binary>" for the first installed browser, or fails.
locate_browser() {
  local keys=("$@")
  for key in "${keys[@]}"; do
    if [[ "$OSTYPE" == darwin* ]]; then
      local app
      app="$(mac_app "$key")"
      if [[ -n "$app" && -d "$app" ]]; then
        printf '%s\t%s' "$key" "$app"
        return 0
      fi
    else
      for bin in $(linux_bins "$key"); do
        if command -v "$bin" >/dev/null 2>&1; then
          printf '%s\t%s' "$key" "$(command -v "$bin")"
          return 0
        fi
      done
    fi
  done
  return 1
}

manual_steps() {
  local where="$1"
  cat <<EOF

Manual install (persists across restarts):

  1. open $where
  2. turn on "Developer mode" (top right)
  3. click "Load unpacked" and choose:

       $DIST

  4. open $FEED_URL

Set your model and API key from the extension's Options page. Without a key it
still runs, marking every verdict as a pattern-only estimate (≈).
After a code change: npm run build, then hit reload on the Slop Radar card.
EOF
}

# Arc and friends: build, hand over the path, open the extensions page.
install_manual() {
  local app="$1"
  local name clipboard=""
  name="$(basename "$app" .app)"
  if printf '%s' "$DIST" | pbcopy 2>/dev/null; then
    clipboard=" — already on your clipboard, so press Cmd+Shift+G and paste"
  fi
  echo "==> $name ignores --load-extension, so this is a one-time manual step"
  open -a "$app" "chrome://extensions" 2>/dev/null || open -a "$app" 2>/dev/null || true
  cat <<EOF

  1. In the Extensions page now open in $name, turn on "Developer mode"
  2. Click "Load unpacked"
  3. Choose this folder$clipboard:

       $DIST

  4. Open $FEED_URL

Set your model and API key from the extension's Options page. Without a key it
still runs, marking every verdict as a pattern-only estimate (≈).
After a code change: npm run build, then hit reload on the Slop Radar card.
EOF
}

# Chrome and friends: launch a throwaway profile with the extension preloaded.
install_with_flags() {
  local app="$1" bin="$app"
  if [[ "$OSTYPE" == darwin* ]]; then
    bin="$app/Contents/MacOS/$(basename "$app" .app)"
  fi
  echo "==> launching $(basename "$bin") with the extension loaded"
  echo "    profile: $PROFILE (throwaway — delete it or pass --clean to reset)"
  "$bin" \
    --user-data-dir="$PROFILE" \
    --load-extension="$DIST" \
    --no-first-run \
    --no-default-browser-check \
    "$FEED_URL" \
    >/dev/null 2>&1 &
  echo "==> starting. Log into LinkedIn in that window if prompted."
  manual_steps "your everyday browser's extensions page"
}

cd "$ROOT"

if [[ ! -d node_modules ]]; then
  echo "==> installing dependencies"
  npm ci
fi

echo "==> building"
npm run build
echo "==> built: $DIST"

if [[ "$BUILD_ONLY" == true ]]; then
  manual_steps "chrome://extensions (or arc://extensions in Arc)"
  exit 0
fi

if [[ -n "$BROWSER" ]]; then
  ORDER=("$BROWSER")
fi

if ! FOUND="$(locate_browser "${ORDER[@]}")"; then
  echo "!! No supported browser found (${ORDER[*]})." >&2
  manual_steps "chrome://extensions"
  exit 1
fi

KEY="${FOUND%%$'\t'*}"
TARGET="${FOUND#*$'\t'}"

if uses_flags "$KEY"; then
  install_with_flags "$TARGET"
else
  install_manual "$TARGET"
fi
