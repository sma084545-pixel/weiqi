"""Package the verified T11 project and static site without node_modules."""
from pathlib import Path
import argparse, hashlib, json, zipfile

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('output', type=Path)
args = parser.parse_args()
out = args.output.resolve(); out.mkdir(parents=True, exist_ok=True)
if root == out or root in out.parents: raise SystemExit('Output must be outside project root')
package = json.loads((root / 'package.json').read_text())
if package['version'] != '0.11.0': raise SystemExit('T11 package version must be 0.11.0')

excluded = {'node_modules', '.git', '.DS_Store', '__pycache__'}
excluded_prefixes = {('output','playwright','results'), ('output','playwright','report')}
def included(path):
    parts = path.relative_to(root).parts
    return not set(parts) & excluded and not any(parts[:len(p)] == p for p in excluded_prefixes)
def files(): return sorted(p for p in root.rglob('*') if p.is_file() and included(p))
def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest()

required = ['dist/index.html','dist-engine/go-club-rules.mjs','content/t09/bundle.json','handoff/MERGE_A.md','handoff/T09.md','handoff/T10.md','handoff/T11.md','docs/t11/ACCEPTANCE.md','output/validation/T11/command-report.json']
for name in required:
    if not (root/name).is_file(): raise SystemExit('Missing required artifact: '+name)
report=json.loads((root/'output/validation/T11/command-report.json').read_text())
if report.get('overallStatus')!='passed': raise SystemExit('T11 command report is not passed')

manifest={'schemaVersion':1,'id':'RELEASE-T11-001','revision':1,'rulesetId':'GO-CLUB-AREA-1','kind':'ProjectRelease','taskId':'T11','baseVersion':'0.10.0','resultVersion':'0.11.0','status':'complete','schemaSha256':digest(root/'schemas/content.schema.json'),'lockfileSha256':digest(root/'pnpm-lock.yaml'),'untested':report['untested'],'files':[{'path':str(p.relative_to(root)),'sha256':digest(p),'bytes':p.stat().st_size} for p in files() if p.name!='release-manifest.json']}
(root/'release-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')

full=out/'go-club-T11-0.11.0-full.zip'
site=out/'go-club-T11-0.11.0-site.zip'
for target in (full,site):
    if target.exists(): raise SystemExit('Refusing to overwrite '+str(target))
with zipfile.ZipFile(full,'w',zipfile.ZIP_DEFLATED) as z:
    for p in files(): z.write(p,'go-club/'+str(p.relative_to(root)))
with zipfile.ZipFile(site,'w',zipfile.ZIP_DEFLATED) as z:
    for p in sorted((root/'dist').rglob('*')):
        if p.is_file(): z.write(p,str(p.relative_to(root/'dist')))

checks=[]
for target in (full,site):
    with zipfile.ZipFile(target) as z:
        if z.testzip() is not None: raise SystemExit('Archive CRC failed: '+target.name)
        if any('/node_modules/' in n for n in z.namelist()): raise SystemExit('node_modules leaked')
    checks.append({'file':target.name,'sha256':digest(target),'bytes':target.stat().st_size,'crc':'passed'})
with zipfile.ZipFile(full) as z:
    for item in manifest['files']:
        if hashlib.sha256(z.read('go-club/'+item['path'])).hexdigest()!=item['sha256']: raise SystemExit('Archive hash mismatch: '+item['path'])

(out/'SHA256SUMS.txt').write_text(''.join(f"{x['sha256']}  {x['file']}\n" for x in checks))
(out/'delivery-manifest.json').write_text(json.dumps({'schemaVersion':1,'id':'DELIVERY-T11-001','revision':1,'rulesetId':'GO-CLUB-AREA-1','kind':'DeliveryManifest','taskId':'T11','baseVersion':'0.10.0','resultVersion':'0.11.0','archives':checks,'archiveIntegrity':'passed','sourceFileHashes':'passed','untested':report['untested']},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'files':len(files()),'archives':checks,'integrity':'passed'},ensure_ascii=False))
