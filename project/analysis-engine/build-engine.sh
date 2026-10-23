#!/bin/sh
# Portable CPU build, fixed versions, no host-specific -march=native/AVX/GPU.
# Requires cmake >=3.18.2, C++14 compiler, zlib development headers, curl, tar.
set -eu
DEST="${1:-/opt/katago}"
BUILD_JOBS="${KATAGO_BUILD_JOBS:-2}"
case "$BUILD_JOBS" in 1|2|3|4) ;; *) echo 'KATAGO_BUILD_JOBS must be 1..4' >&2; exit 1;; esac
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT HUP INT TERM
fetch() {
  curl --fail --location --retry 3 --retry-delay 2 --connect-timeout 20 --max-time 300 --proto '=https' --tlsv1.2 "$1" --output "$2"
  if command -v sha256sum >/dev/null 2>&1; then ACTUAL=$(sha256sum "$2" | cut -d ' ' -f 1); else ACTUAL=$(shasum -a 256 "$2" | cut -d ' ' -f 1); fi
  [ "$ACTUAL" = "$3" ] || { echo "SHA-256 mismatch for $2" >&2; exit 1; }
}
fetch 'https://codeload.github.com/lightvector/KataGo/tar.gz/refs/tags/v1.18.1' "$TMP/katago.tar.gz" '011a205c60c22f83008ba92d31f91196640f620edbfc2f09af79ef3f3311750c'
fetch 'https://gitlab.com/libeigen/eigen/-/archive/3.4.0/eigen-3.4.0.tar.gz' "$TMP/eigen.tar.gz" '8586084f71f9bde545ee7fa6d00288b264a2b7ac3607b974e54d13e7162c1c72'
tar -xzf "$TMP/katago.tar.gz" -C "$TMP"
tar -xzf "$TMP/eigen.tar.gz" -C "$TMP"
cmake -S "$TMP/KataGo-1.18.1/cpp" -B "$TMP/build" -DUSE_BACKEND=EIGEN -DUSE_AVX2=0 -DEIGEN3_INCLUDE_DIRS="$TMP/eigen-3.4.0" -DNO_GIT_REVISION=1 -DBUILD_DISTRIBUTED=0 -DKATAGO_AUTO_FETCH_DEPS=OFF -DCMAKE_BUILD_TYPE=Release
cmake --build "$TMP/build" --parallel "$BUILD_JOBS"
mkdir -p "$DEST"
cp "$TMP/build/katago" "$DEST/katago"
chmod 755 "$DEST/katago"
# Retain exact sources and all bundled per-file notices for redistributions.
mkdir -p "$DEST/notices"
cp "$TMP/KataGo-1.18.1/LICENSE" "$DEST/notices/KataGo-LICENSE.txt"
cp "$TMP/KataGo-1.18.1/CONTRIBUTORS" "$DEST/notices/KataGo-CONTRIBUTORS.txt"
cp -R "$TMP/KataGo-1.18.1/cpp/external" "$DEST/notices/katago-external-source"
cp "$TMP/KataGo-1.18.1/cpp/core/sha2.cpp" "$DEST/notices/sha2.cpp"
cp "$TMP/eigen-3.4.0/"COPYING* "$DEST/notices/"
"$DEST/katago" version
