#!/bin/sh
# Fixed official model only. No caller-provided URL/model/engine settings.
set -eu
DEST="${1:-/opt/katago/model.bin.gz}"
MODEL_URL='https://katagoarchive.org/g170/neuralnets/g170-b6c96-s175395328-d26788732.bin.gz'
MODEL_SHA='f57fddf4672364d385d6ab177364ab819810d1123e229cb2649c4f337a2160b1'
mkdir -p "$(dirname "$DEST")"
TMP="$(mktemp "${DEST}.download.XXXXXX")"
trap 'rm -f "$TMP"' EXIT HUP INT TERM
curl --fail --location --retry 3 --retry-delay 2 --connect-timeout 20 --max-time 300 --proto '=https' --tlsv1.2 "$MODEL_URL" --output "$TMP"
if command -v sha256sum >/dev/null 2>&1; then ACTUAL=$(sha256sum "$TMP" | cut -d ' ' -f 1); else ACTUAL=$(shasum -a 256 "$TMP" | cut -d ' ' -f 1); fi
[ "$ACTUAL" = "$MODEL_SHA" ] || { echo 'Model SHA-256 mismatch; refusing model.' >&2; exit 1; }
gzip -t "$TMP"
chmod 644 "$TMP"
mv "$TMP" "$DEST"
echo "Verified official g170 b6c96 model: $MODEL_SHA"
