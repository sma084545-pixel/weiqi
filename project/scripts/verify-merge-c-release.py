#!/usr/bin/env python3
"""Read-only verification of the MERGE_C payload and original T17 baseline."""
from pathlib import Path
import hashlib, json, re

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'MERGE_C_RELEASE_MANIFEST.json').read_text())
assert manifest['rulesetId'] == 'GO-CLUB-AREA-1'
assert manifest['schemaVersion'] == 1
assert manifest['resultVersion'] == '0.17.0-merge-c.1'
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
for f in manifest['files']:
    p = root / f['path']
    assert p.is_file(), f['path']
    assert p.stat().st_size == f['bytes'], f['path']
    assert sha(p) == f['sha256'], f['path']
baseline = json.loads((root / 'docs/merge-c/checks/baseline-preservation.json').read_text())
for f in baseline['checks']:
    assert sha(root / f['path']) == f['baseSha256'], f['path']
freeze = json.loads((root / 'handoff/CONTENT_FREEZE.json').read_text())
assert len(freeze['puzzles']) == 30
assert len(list((root / 'content/endgames').glob('*.json'))) == 6
for f in freeze['puzzles']:
    d = json.loads((root / f['path']).read_text())
    assert (d['id'], d['revision']) == (f['id'], f['revision'])
    assert sha(root / f['path']) == f['sha256']
catalog = root / 'docs/merge-c/RESOURCE_CATALOG.md'
links = re.findall(r'\]\(([^)]+)\)', catalog.read_text())
for link in links:
    assert (catalog.parent / link.split('#')[0]).resolve().is_file(), link
print(json.dumps(dict(status='passed', payloadFiles=len(manifest['files']),
                     baselineFiles=len(baseline['checks']), puzzles=30,
                     endgames=6, catalogLinks=len(links))))
