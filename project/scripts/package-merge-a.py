"""Package the verified MERGE_A project without overwriting an existing delivery."""
from pathlib import Path
import argparse
import hashlib
import json
import zipfile

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('output', type=Path)
args = parser.parse_args()
out = args.output.resolve()
out.mkdir(parents=True, exist_ok=True)
if root == out or root in out.parents:
    raise SystemExit('Output must be outside project root')

package = json.loads((root / 'package.json').read_text())
if package['version'] != '0.9.1':
    raise SystemExit('MERGE_A package version must be 0.9.1')

excluded = {'node_modules', '.git', '.DS_Store', '__pycache__'}
excluded_prefixes = {('output', 'playwright', 'results'), ('output', 'playwright', 'report')}

def included(path: Path) -> bool:
    parts = path.relative_to(root).parts
    return not set(parts) & excluded and not any(parts[:len(prefix)] == prefix for prefix in excluded_prefixes)

def files():
    return sorted(path for path in root.rglob('*') if path.is_file() and included(path))

def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

required = [
    'dist/index.html',
    'dist-engine/go-club-rules.mjs',
    'content/t09/bundle.json',
    'content/t09/FILE_MANIFEST.json',
    'content/validation/results.json',
    'handoff/T08.md',
    'handoff/T09.md',
    'handoff/MERGE_A.md',
    'docs/merge-a/MERGE_LIST.md',
    'output/validation/MERGE_A/command-report.json',
]
for name in required:
    if not (root / name).is_file():
        raise SystemExit('Missing required artifact: ' + name)

report = json.loads((root / 'output/validation/MERGE_A/command-report.json').read_text())
if report.get('overallStatus') != 'passed':
    raise SystemExit('MERGE_A command report is not passed')

manifest = {
    'schemaVersion': 1,
    'id': 'RELEASE-MERGE-A-001',
    'revision': 1,
    'rulesetId': 'GO-CLUB-AREA-1',
    'kind': 'ProjectRelease',
    'taskId': 'MERGE_A',
    'baseVersion': '0.9.0',
    'contentInputVersion': '0.2.0-t09.1',
    'resultVersion': '0.9.1',
    'status': 'complete-content-merge',
    'baseArchiveSha256': report['inputs']['t08ArchiveSha256'],
    'contentArchiveSha256': report['inputs']['t09ArchiveSha256'],
    'schemaSha256': digest(root / 'schemas/content.schema.json'),
    'lockfileSha256': digest(root / 'pnpm-lock.yaml'),
    'untested': report['untested'],
    'files': [
        {'path': str(path.relative_to(root)), 'sha256': digest(path), 'bytes': path.stat().st_size}
        for path in files() if path.name != 'release-manifest.json'
    ],
}
(root / 'release-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')

archive = out / 'go-club-MERGE_A-0.9.1-full.zip'
if archive.exists():
    raise SystemExit('Refusing to overwrite existing release ' + str(archive))
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as bundle:
    for path in files():
        bundle.write(path, 'go-club/' + str(path.relative_to(root)))

with zipfile.ZipFile(archive) as bundle:
    if bundle.testzip() is not None:
        raise SystemExit('Archive CRC failed')
    archived = set(bundle.namelist())
    if any('/node_modules/' in name or name.endswith('/node_modules') for name in archived):
        raise SystemExit('node_modules leaked into archive')
    for item in manifest['files']:
        if hashlib.sha256(bundle.read('go-club/' + item['path'])).hexdigest() != item['sha256']:
            raise SystemExit('Archive hash mismatch: ' + item['path'])

archive_info = {'file': archive.name, 'sha256': digest(archive), 'bytes': archive.stat().st_size}
(out / 'SHA256SUMS.txt').write_text(f"{archive_info['sha256']}  {archive_info['file']}\n")
(out / 'delivery-manifest.json').write_text(json.dumps({
    'schemaVersion': 1,
    'id': 'DELIVERY-MERGE-A-001',
    'revision': 1,
    'rulesetId': 'GO-CLUB-AREA-1',
    'kind': 'DeliveryManifest',
    'taskId': 'MERGE_A',
    'baseVersion': '0.9.0',
    'contentInputVersion': '0.2.0-t09.1',
    'resultVersion': '0.9.1',
    'archive': archive_info,
    'archiveIntegrity': 'passed',
    'sourceFileHashes': 'passed',
    'untested': report['untested'],
}, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'files': len(files()), 'archive': archive_info, 'integrity': 'passed'}, ensure_ascii=False))
