#!/bin/sh
set -eu
# Reproduce a clean install without deleting the current working copy.
project_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
verify_dir=$(mktemp -d "${TMPDIR:-/tmp}/go-club-clean.XXXXXX")
node - "$project_root" "$verify_dir" <<'JS'
const fs=require('node:fs');const path=require('node:path');
const [src,dest]=process.argv.slice(2);fs.cpSync(src,dest,{recursive:true,filter:p=>!['node_modules','dist','dist-engine','.git','output'].some(x=>path.relative(src,p).split(path.sep).includes(x))});
JS
cd "$verify_dir"
pnpm install --frozen-lockfile
pnpm check
printf '\nClean verification directory: %s\n' "$verify_dir"
