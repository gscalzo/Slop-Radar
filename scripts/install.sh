#!/usr/bin/env bash
#
# Build Slop Radar and load it into Chrome.
#
#   ./scripts/install.sh            build, then launch Chrome with the extension loaded
#   ./scripts/install.sh --build    build only, then print manual install instructions
#   ./scripts/install.sh --clean    discard the dev profile before launching
#
# Chrome cannot side-load an unpacked extension into your everyday profile from
# the command line — that would be an obvious malware vector. So this launches a
# separate Chrome profile (.chrome-profile/) with the extension pre-loaded. Your
# normal browser, its extensions, and its cookies are untouched; you will need to
# log into LinkedIn once in that window. To install into your everyday profile
# instead, run with --build and follow the printed steps.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="$ROOT/dist"
PROFILE="$ROOT/.chrome-profile"
FEED_URL="https://www.linkedin.com/feed/"

BUILD_ONLY=false
for arg in "$@"; do
  case "$arg" in
    --build) BUILD_ONLY=true ;;
    --clean) rm -rf "$PROFILE" ;;
    -h | --help)
      sed -n '2,15p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "unknown option: $arg (try --help)" >&2
      exit 2
      ;;
  esac
done

find_chrome() {
  local candidates=(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    "/Applications/Chromium.app/Contents/MacOS/Chromium"
  )
  for path in "${candidates[@]}"; do
    [[ -x "$path" ]] && printf '%s' "$path" && return 0
  done
  for name in google-chrome google-chrome-stable chromium chromium-browser; do
    if command -v "$name" >/dev/null 2>&1; then
      command -v "$name"
      return 0
    fi
  done
  return 1
}

manual_instructions() {
  cat <<EOF

To install into your everyday Chrome profile:

  1. open chrome://extensions
  2. turn on "Developer mode" (top right)
  3. click "Load unpacked" and choose:

       $DIST

  4. open $FEED_URL

Set your model and API key from the extension's Options page. Without a key it
still runs, marking every verdict as a pattern-only estimate (≈).
EOF
}

cd "$ROOT"

if [[ ! -d node_modules ]]; then
  echo "==> installing dependencies"
  npm ci
fi

echo "==> building"
npm run build

if [[ "$BUILD_ONLY" == true ]]; then
  echo "==> built: $DIST"
  manual_instructions
  exit 0
fi

if ! CHROME="$(find_chrome)"; then
  echo "==> built: $DIST"
  echo "!! Could not find Chrome or Chromium — install manually." >&2
  manual_instructions
  exit 1
fi

echo "==> launching $(basename "$CHROME") with the extension loaded"
echo "    profile: $PROFILE (throwaway — delete it or pass --clean to reset)"

# --load-extension only applies at startup, and only to this dedicated profile.
"$CHROME" \
  --user-data-dir="$PROFILE" \
  --load-extension="$DIST" \
  --no-first-run \
  --no-default-browser-check \
  "$FEED_URL" \
  >/dev/null 2>&1 &

echo "==> Chrome is starting. Log into LinkedIn in that window if prompted."
manual_instructions
