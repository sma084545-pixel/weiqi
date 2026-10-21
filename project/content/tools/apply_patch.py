#!/usr/bin/env python3
"""Safely apply only the manifest-listed T09 files to an explicit compatible base."""
import argparse,hashlib,json,shutil
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('--target',required=True,type=Path);parser.add_argument('--dry-run',action='store_true');args=parser.parse_args()
source=Path(__file__).resolve().parents[2];target=args.target.resolve()
manifest=json.loads((source/'content/t09/FILE_MANIFEST.json').read_text());base=json.loads((source/'content/t09/input-manifest.json').read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
if source==target:raise SystemExit('Source and target must differ. Extract the content package separately.')
for name in ['schemas/content.schema.json','dist-engine/go-club-rules.mjs']:
 if not (target/name).is_file() or sha(target/name)!=base['compatibilityFingerprints'][name]:raise SystemExit('Compatibility fingerprint differs: '+name+'. Revalidate the new base with the mainline first; nothing written.')
files=[]
for entry in manifest['files']:
 name=entry['path'];rel=Path(name)
 if rel.is_absolute() or '..' in rel.parts or not (name.startswith('content/') or name=='handoff/T09.md'):raise SystemExit('Out-of-scope manifest path: '+name)
 src=source/rel;dst=target/rel
 if not src.is_file() or sha(src)!=entry['sha256']:raise SystemExit('Source hash mismatch: '+name)
 if dst.exists() and (not dst.is_file() or sha(dst)!=entry['sha256']):raise SystemExit('Conflicting target content: '+name+'. Nothing written.')
 if target not in dst.resolve().parents:raise SystemExit('Target path escapes project: '+name)
 files.append((src,dst))
# Manifest identity is verified by the package SHA256SUMS and includes every other shipped task file.
mf=Path('content/t09/FILE_MANIFEST.json');dst=target/mf
if dst.exists() and sha(dst)!=sha(source/mf):raise SystemExit('Conflicting FILE_MANIFEST.json; nothing written.')
if target not in dst.resolve().parents:raise SystemExit('Manifest destination escapes target.')
files.append((source/mf,dst))
if args.dry_run:print(f'DRY RUN PASSED: {len(files)} task files; compatible T01 engine/schema; no conflicting existing files.')
else:
 for src,dst in files:dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dst)
 print(f'APPLIED: {len(files)} task files. Run node --import tsx content/tools/validate.mjs and node content/tools/test-grade.mjs in the target.')
