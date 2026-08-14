#!/usr/bin/env bash
#
# Build and zip the extension into the artifact you upload to the Chrome Web
# Store: slop-radar-<version>.zip, containing manifest.json at the top level.
#
# A .zip is the only packaging format worth producing. A self-signed .crx is a
# dead end outside Linux — Chrome stopped honouring local CRX installs on
# Windows (Chrome 33) and macOS (Chrome 44), so on those platforms an off-store
# extension can only arrive via enterprise policy or Load unpacked. See the
# "Distribution" section of the README.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VERSION="$(node -p "require('./manifest.json').version")"
OUT="$ROOT/slop-radar-$VERSION.zip"

npm run build

rm -f "$OUT"
(cd dist && zip -qr "$OUT" .)

echo "==> $OUT"
unzip -l "$OUT" | tail -n +4 | head -10
cat <<EOF

Upload at https://chrome.google.com/webstore/devconsole (one-time \$5 developer
registration). Publish it "Unlisted" to share by link without a public listing.
A Web Store install works in Arc, Brave and Edge too — they all consume it.
EOF
