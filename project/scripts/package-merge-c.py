#!/usr/bin/env python3
"""Package the complete integrated project; no dependencies or machine caches."""
from pathlib import Path
import hashlib, json, sys, zipfile

root = Path(__file__).resolve().parents[1]
dest = Path(sys.argv[1]).resolve()
dest.mkdir(parents=True, exist_ok=True)
excluded = {'node_modules', '__pycache__', '.git', '.DS_Store', '.pytest_cache'}
manifest_name = 'MERGE_C_RELEASE_MANIFEST.json'
files = sorted(p for p in root.rglob('*') if p.is_file() and
               not any(part in excluded for part in p.relative_to(root).parts) and
               p.name != manifest_name)
sha = lambda data: hashlib.sha256(data).hexdigest()
manifest = dict(schemaVersion=1, id='MERGE-C-RELEASE', revision=1,
                rulesetId='GO-CLUB-AREA-1', taskId='MERGE_C',
                baseVersion='T17 0.17.0', resultVersion='0.17.0-merge-c.1',
                programVersion='0.17.0',
                note='Self excluded to avoid circular hashing. release-manifest.json is historical T17 provenance.',
                files=[dict(path=p.relative_to(root).as_posix(), bytes=p.stat().st_size,
                            sha256=sha(p.read_bytes())) for p in files])
(root / manifest_name).write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
archive = dest / 'go-club-MERGE_C-0.17.0-merge-c.1-full.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as z:
    for p in files + [root / manifest_name]:
        z.write(p, 'go-club/'+p.relative_to(root).as_posix())
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    assert not any('node_modules' in n.split('/') for n in z.namelist())
(dest / 'SHA256SUMS.txt').write_text(sha(archive.read_bytes())+'  '+archive.name+'\n', encoding='utf-8')
print(json.dumps(dict(archive=str(archive), sha256=sha(archive.read_bytes()),
                     files=len(files)+1, bytes=archive.stat().st_size, crc='passed')))
