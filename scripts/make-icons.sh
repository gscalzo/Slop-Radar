#!/usr/bin/env bash
#
# Regenerates icons/icon-*.png from icons/icon.svg.
#
# The PNGs are committed, so this is only needed when the artwork changes —
# a build must never depend on a converter being installed locally.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FULL="$ROOT/icons/icon.svg"      # 48px and up
SMALL="$ROOT/icons/icon-small.svg" # 16px and 32px: fewer shapes, or it turns to mush

if ! command -v rsvg-convert >/dev/null 2>&1; then
  echo "needs rsvg-convert (brew install librsvg)" >&2
  exit 1
fi

for size in 16 32; do
  rsvg-convert -w "$size" -h "$size" "$SMALL" -o "$ROOT/icons/icon-$size.png"
  echo "  icons/icon-$size.png (simplified)"
done

for size in 48 128; do
  rsvg-convert -w "$size" -h "$size" "$FULL" -o "$ROOT/icons/icon-$size.png"
  echo "  icons/icon-$size.png"
done
