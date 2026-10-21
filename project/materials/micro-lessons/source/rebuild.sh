#!/usr/bin/env bash
set -euo pipefail
TASK_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPRO_ROOT="$TASK_ROOT/build/reproduction"
if [ -e "$REPRO_ROOT" ]; then
  echo "Reproduction directory already exists; move it aside before rebuilding." >&2
  exit 1
fi
mkdir -p "$REPRO_ROOT/source" "$REPRO_ROOT/build" "$REPRO_ROOT/output" "$REPRO_ROOT/qa"
cp -R "$TASK_ROOT/assets" "$REPRO_ROOT/"
cp "$TASK_ROOT/source/"*.mjs "$TASK_ROOT/source/"*.py "$TASK_ROOT/source/lessons.json" "$TASK_ROOT/source/diagrams.json" "$REPRO_ROOT/source/"
export RUNTIME_NODE="$CODEX_PRIMARY_RUNTIME_NODE"
export RUNTIME_NODE_MODULES="$CODEX_PRIMARY_RUNTIME_NODE_MODULES"
export RUNTIME_PYTHON="$CODEX_PRIMARY_RUNTIME_PYTHON"
export RUNTIME_BIN_DIR="$CODEX_PRIMARY_RUNTIME/dependencies/bin/override"
export FONTCONFIG_FILE="$REPRO_ROOT/build/fontconfig.xml"
cat > "$FONTCONFIG_FILE" <<XML
<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><include ignore_missing="yes">/etc/fonts/fonts.conf</include><dir>$REPRO_ROOT/assets/fonts</dir><cachedir>$REPRO_ROOT/build/fonts-cache</cachedir></fontconfig>
XML
# All delivery scripts resolve their task root from materials/micro-lessons.
mkdir -p "$REPRO_ROOT/run/materials"
ln -s "$REPRO_ROOT" "$REPRO_ROOT/run/materials/micro-lessons"
cd "$REPRO_ROOT/run"
"$RUNTIME_NODE" "$REPRO_ROOT/source/verify-content.mjs"
"$RUNTIME_NODE" "$REPRO_ROOT/source/build-lessons.mjs" "$REPRO_ROOT"
"$RUNTIME_PYTHON" "$REPRO_ROOT/source/build-teacher-summary.py"
"$RUNTIME_BIN_DIR/soffice" -env:UserInstallation="file://$REPRO_ROOT/build/lo-profile" --headless --convert-to pdf --outdir "$REPRO_ROOT/output" "$REPRO_ROOT/output/"*.pptx > "$REPRO_ROOT/qa/viewer-open-and-pdf.log" 2>&1
"$RUNTIME_PYTHON" "$REPRO_ROOT/source/render-pdfs.py"
"$RUNTIME_PYTHON" "$REPRO_ROOT/source/verify-delivery.py"
printf '%s\n' "$REPRO_ROOT/output"
