#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
OUT_DIR="$ROOT_DIR/qa/rendered"
PYTHON_BIN=${PYTHON_BIN:-/Users/maxiao/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3}
PDFTOPPM_BIN=${PDFTOPPM_BIN:-/Users/maxiao/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/override/pdftoppm}

mkdir -p "$OUT_DIR"

"$PDFTOPPM_BIN" -png -r 120 "$ROOT_DIR/board-9x9-450mm-1to1.pdf" "$OUT_DIR/board-1to1"
"$PDFTOPPM_BIN" -png -r 120 "$ROOT_DIR/board-9x9-a4-tiled.pdf" "$OUT_DIR/tiles-color"
"$PDFTOPPM_BIN" -gray -png -r 120 "$ROOT_DIR/board-9x9-a4-tiled.pdf" "$OUT_DIR/tiles-gray"
"$PDFTOPPM_BIN" -png -r 120 "$ROOT_DIR/pieces-markers-a4.pdf" "$OUT_DIR/pieces-color"
"$PDFTOPPM_BIN" -gray -png -r 120 "$ROOT_DIR/pieces-markers-a4.pdf" "$OUT_DIR/pieces-gray"
"$PDFTOPPM_BIN" -png -r 120 "$ROOT_DIR/teaching-flows-a3.pdf" "$OUT_DIR/teaching"
"$PDFTOPPM_BIN" -png -r 120 "$ROOT_DIR/assembly-guide.pdf" "$OUT_DIR/guide"

"$PYTHON_BIN" "$ROOT_DIR/make_contact_sheets.py"
