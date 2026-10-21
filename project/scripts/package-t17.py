"""Package the verified T17 project and deployable static site without node_modules."""
from pathlib import Path
import argparse, hashlib, json, shutil, zipfile

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('output', type=Path)
args = parser.parse_args()
out = args.output.resolve()
out.mkdir(parents=True, exist_ok=True)
if root == out or root in out.parents:
    raise SystemExit('Output must be outside project root')

package = json.loads((root / 'package.json').read_text())
if package['version'] != '0.17.0':
    raise SystemExit('T17 package version must be 0.17.0')

excluded = {'node_modules', '.git', '.DS_Store', '__pycache__', 'tmp'}
excluded_prefixes = {('output', 'playwright', 'results'), ('output', 'playwright', 'report')}


def included(path: Path) -> bool:
    parts = path.relative_to(root).parts
    return not set(parts) & excluded and not any(parts[:len(prefix)] == prefix for prefix in excluded_prefixes)


def files():
    return sorted(path for path in root.rglob('*') if path.is_file() and included(path))


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


required = [
    'dist/index.html', 'dist/sw.js', 'dist/offline.html', 'dist/offline-assets.json',
    'dist/content/formal-content-v1.json', 'dist/materials/t13/territory-counting-card.md',
    'dist/materials/t17/CAS-evidence-template.md', 'schemas/t17-evidence.schema.json',
    'src/features/evidence/EvidencePage.tsx', 'tests/browser/t17.spec.ts',
    'content/t17/development/TEST-T17-three-replies.json', 'output/pdf/T17-empty-report.pdf',
    'output/pdf/T17-development-report.pdf', 'docs/t17/input-manifest.json',
    'output/validation/T17/change-manifest.json',
    'dist-engine/go-club-rules.mjs', 'content/t09/bundle.json', 'content/t14/templates.json',
    'handoff/CONTENT_FREEZE.json', 'handoff/FREEZE_B.md', 'handoff/T15.md', 'handoff/T17.md',
    'docs/t17/ACCEPTANCE.md', 'docs/t17/CHANGED_FILES.md', 'docs/t17/USAGE.md',
    'docs/t17/MODEL_AND_PRIVACY.md', 'output/validation/T17/command-report.json',
]
for name in required:
    if not (root / name).is_file():
        raise SystemExit('Missing required artifact: ' + name)

report = json.loads((root / 'output/validation/T17/command-report.json').read_text())
if report.get('overallStatus') != 'passed':
    raise SystemExit('T17 command report is not passed')

manifest = {
    'schemaVersion': 1,
    'id': 'RELEASE-T17-001',
    'revision': 1,
    'rulesetId': 'GO-CLUB-AREA-1',
    'kind': 'ProjectRelease',
    'taskId': 'T17',
    'baseVersion': 'T16 0.16.0',
    'resultVersion': '0.17.0',
    'status': 'complete',
    'freezeId': 'GO-CLUB-FREEZE-B-20260919-01',
    'schemaSha256': digest(root / 'schemas/content.schema.json'),
    'lockfileSha256': digest(root / 'pnpm-lock.yaml'),
    'untested': report['untested'],
    'files': [
        {'path': str(path.relative_to(root)), 'sha256': digest(path), 'bytes': path.stat().st_size}
        for path in files() if path.name != 'release-manifest.json'
    ],
}
(root / 'release-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')

full = out / 'go-club-T17-0.17.0-full.zip'
site = out / 'go-club-T17-0.17.0-site.zip'
for target in (full, site):
    if target.exists():
        raise SystemExit('Refusing to overwrite ' + str(target))

with zipfile.ZipFile(full, 'w', zipfile.ZIP_DEFLATED) as archive:
    for path in files():
        archive.write(path, 'go-club/' + str(path.relative_to(root)))

with zipfile.ZipFile(site, 'w', zipfile.ZIP_DEFLATED) as archive:
    for path in sorted((root / 'dist').rglob('*')):
        if path.is_file():
            archive.write(path, str(path.relative_to(root / 'dist')))

checks = []
for target in (full, site):
    with zipfile.ZipFile(target) as archive:
        if archive.testzip() is not None:
            raise SystemExit('Archive CRC failed: ' + target.name)
        if any('/node_modules/' in name or name.startswith('node_modules/') for name in archive.namelist()):
            raise SystemExit('node_modules leaked')
    checks.append({
        'file': target.name,
        'sha256': digest(target),
        'bytes': target.stat().st_size,
        'crc': 'passed',
    })

with zipfile.ZipFile(full) as archive:
    for item in manifest['files']:
        archived = archive.read('go-club/' + item['path'])
        if hashlib.sha256(archived).hexdigest() != item['sha256']:
            raise SystemExit('Archive hash mismatch: ' + item['path'])

(out / 'SHA256SUMS.txt').write_text(
    ''.join(f"{item['sha256']}  {item['file']}\n" for item in checks)
)
(out / 'delivery-manifest.json').write_text(json.dumps({
    'schemaVersion': 1,
    'id': 'DELIVERY-T17-001',
    'revision': 1,
    'rulesetId': 'GO-CLUB-AREA-1',
    'kind': 'DeliveryManifest',
    'taskId': 'T17',
    'baseVersion': 'T16 0.16.0',
    'resultVersion': '0.17.0',
    'freezeId': 'GO-CLUB-FREEZE-B-20260919-01',
    'archives': checks,
    'archiveIntegrity': 'passed',
    'sourceFileHashes': 'passed',
    'untested': report['untested'],
}, ensure_ascii=False, indent=2) + '\n')

for name in [
    'handoff/T17.md', 'docs/t17/ACCEPTANCE.md', 'docs/t17/CHANGED_FILES.md',
    'docs/t17/USAGE.md', 'docs/t17/MODEL_AND_PRIVACY.md',
    'output/validation/T17/command-report.json', 'output/validation/T17/change-manifest.json',
]:
    shutil.copy2(root / name, out / Path(name).name)

print(json.dumps({'files': len(files()), 'archives': checks, 'integrity': 'passed'}, ensure_ascii=False))

