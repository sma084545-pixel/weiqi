#!/bin/sh
# Fixed official model only. No caller-provided URL/model/engine settings.
set -eu
DEST="${1:-/opt/katago/model.bin.gz}"
MODEL_URL='https://media.katagotraining.org/uploaded/networks/models/kata1/kata1-tf3-b10c512-s3203M-d5937M.bin.gz'
MODEL_SHA='c04db4a503721d948bb720324f3cbdac6088cc9eb243632f020e4b6846f58995'
mkdir -p "$(dirname "$DEST")"
TMP="$(mktemp "${DEST}.download.XXXXXX")"
trap 'rm -f "$TMP"' EXIT HUP INT TERM
curl --fail --location --retry 3 --retry-delay 2 --connect-timeout 20 --max-time 900 --proto '=https' --tlsv1.2 "$MODEL_URL" --output "$TMP"
if command -v sha256sum >/dev/null 2>&1; then ACTUAL=$(sha256sum "$TMP" | cut -d ' ' -f 1); else ACTUAL=$(shasum -a 256 "$TMP" | cut -d ' ' -f 1); fi
[ "$ACTUAL" = "$MODEL_SHA" ] || { echo 'Model SHA-256 mismatch; refusing model.' >&2; exit 1; }
gzip -t "$TMP"
chmod 644 "$TMP"
mv "$TMP" "$DEST"
echo "Verified pinned official compact strong tf3 model for free-only deployment: $MODEL_SHA"
