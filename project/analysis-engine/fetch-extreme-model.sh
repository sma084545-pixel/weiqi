#!/bin/sh
# Fixed official model only. No caller-provided URL/model/engine settings.
set -eu
DEST="${1:-/opt/katago/model.bin.gz}"
MODEL_URL='https://media.katagotraining.org/uploaded/networks/models/kata1/kata1-tf2-b10c384-s2941M-d5872M.bin.gz'
MODEL_SHA='8015d49bdf45854c94e5f9e22b2b70e8738d3e56a6edca730e5b82509998a5b5'
mkdir -p "$(dirname "$DEST")"
TMP="$(mktemp "${DEST}.download.XXXXXX")"
trap 'rm -f "$TMP"' EXIT HUP INT TERM
curl --fail --location --retry 3 --retry-delay 2 --connect-timeout 20 --max-time 900 --proto '=https' --tlsv1.2 "$MODEL_URL" --output "$TMP"
if command -v sha256sum >/dev/null 2>&1; then ACTUAL=$(sha256sum "$TMP" | cut -d ' ' -f 1); else ACTUAL=$(shasum -a 256 "$TMP" | cut -d ' ' -f 1); fi
[ "$ACTUAL" = "$MODEL_SHA" ] || { echo 'Model SHA-256 mismatch; refusing model.' >&2; exit 1; }
gzip -t "$TMP"
chmod 644 "$TMP"
mv "$TMP" "$DEST"
echo "Verified pinned official compact strong tf2 model for free-only deployment: $MODEL_SHA"
