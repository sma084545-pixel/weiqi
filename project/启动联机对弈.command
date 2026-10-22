#!/bin/sh
set -eu
cd "$(dirname "$0")"
if command -v node >/dev/null 2>&1; then
  exec node dist-server/server.mjs
fi
codex_node="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
if [ -x "$codex_node" ]; then
  exec "$codex_node" dist-server/server.mjs
fi
printf '%s\n' '需要先安装 Node.js 22.22.2+ 或 24.15+，再重新打开。按回车关闭。'
read -r answer
