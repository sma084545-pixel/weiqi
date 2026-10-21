"""Package the tested T02 source and static demo without overwriting prior releases."""
from pathlib import Path
import argparse, hashlib, json, zipfile

root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('output',type=Path);args=parser.parse_args()
out=args.output.resolve();out.mkdir(parents=True,exist_ok=True)
if root==out or root in out.parents:raise SystemExit('Output must be outside project root')
version=json.loads((root/'package.json').read_text())['version']
if version!='0.3.0':raise SystemExit('Update T02 packaging metadata explicitly for a new release')

excluded={'node_modules','.git','.DS_Store','__pycache__'}
excluded_prefixes={('output','playwright','results'),('output','playwright','report')}
def included(path:Path)->bool:
    parts=path.relative_to(root).parts
    return not set(parts)&excluded and not any(parts[:len(prefix)]==prefix for prefix in excluded_prefixes)
def files():return sorted(path for path in root.rglob('*') if path.is_file() and included(path))
def digest(path:Path):return hashlib.sha256(path.read_bytes()).hexdigest()
def header(identifier:str,revision:int):return f'---\nschemaVersion: 1\nid: {identifier}\nrevision: {revision}\nrulesetId: GO-CLUB-AREA-1\n---\n\n'

required=['dist/index.html','dist-engine/go-club-rules.mjs','handoff/T02.md','docs/t02/ACCEPTANCE.md','output/validation/T02/command-report.json']
for name in required:
    if not (root/name).is_file():raise SystemExit('Missing required artifact: '+name)
report=json.loads((root/'output/validation/T02/command-report.json').read_text())
if any(item.get('status')!='passed' or item.get('exitCode',0)!=0 for item in report['commands']):raise SystemExit('Final verification report contains a failure')

changed=[
 'CHANGELOG.md','README.md','SOURCES.md','docs/ACCEPTANCE.md','docs/INTERFACES.md','docs/PROJECT_CONTRACT.md','docs/STYLE_GUIDE.md','docs/requirements-matrix.md','index.html','package.json','playwright.config.ts',
 'src/components/Board.css','src/components/Board.tsx','src/components/board.types.ts','src/core/constants.ts','src/core/rules/contract.ts','src/features/home/Home.tsx','src/styles.css',
 'tests/board.test.tsx','tests/browser/t00.spec.ts','tests/browser/t02.spec.ts','docs/t02/ACCEPTANCE.md','docs/t02/BOARD_USAGE.md','docs/t02/DESIGN_SPEC.md',
 'docs/t02/EXPECTED_GEOMETRY.md','docs/t02/FIDELITY_LEDGER.md','docs/t02/REQUIREMENT_TRACE.md','docs/t02/design-concept.png','docs/t02/input-manifest.json',
 'handoff/T02.md','output/playwright/t02/1280-markers-grayscale.png','output/playwright/t02/1280-select.png','output/playwright/t02/360-19-scroll.png',
 'output/playwright/t02/360-select.png','output/playwright/t02/768-select.png','output/validation/T02/command-report.json','scripts/package-t02.py'
]
missing=[name for name in changed if not (root/name).is_file()]
if missing:raise SystemExit('Changed file list has missing paths: '+', '.join(missing))
(root/'docs/t02/CHANGED_FILES.md').write_text(header('DOC-T02-CHANGED-FILES',1)+'# T02逐文件变更\n\nbaseVersion=0.2.0；resultVersion=0.3.0。以下仅列T02修改或新增；完整项目哈希见`release-manifest.json`。T18材料文件被继承但不属于T02变更。\n\n'+''.join(f'- `{name}`\n' for name in changed))

all_names=sorted(str(path.relative_to(root)) for path in files())
(root/'docs/CHANGED_FILES.md').write_text(header('DOC-CHANGED-FILES',3)+'# 0.3.0完整项目文件清单\n\nT02差异见`t02/CHANGED_FILES.md`。以下是完整当前工程，不等于T03–T24均已实现。\n\n'+''.join(f'- `{name}`\n' for name in all_names))
manifest={
 'schemaVersion':1,'id':'RELEASE-T02-001','revision':1,'rulesetId':'GO-CLUB-AREA-1','kind':'ProjectRelease','taskId':'T02',
 'baseVersion':'0.2.0','resultVersion':version,'status':'complete-board-scope',
 'untested':['physical phones/tablets/projector','Safari/Firefox','VoiceOver/TalkBack/JAWS','school implementation'],
 'files':[{'path':str(path.relative_to(root)),'sha256':digest(path),'bytes':path.stat().st_size} for path in files() if path.name!='release-manifest.json']
}
(root/'release-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')

archives=[]
for kind,source in [('full',root),('site',root/'dist')]:
    archive=out/f'go-club-T02-{version}-{kind}.zip'
    if archive.exists():raise SystemExit('Refusing to overwrite existing release '+str(archive))
    with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as bundle:
        candidates=files() if kind=='full' else sorted(path for path in source.rglob('*') if path.is_file())
        for path in candidates:
            arcname='go-club/'+str(path.relative_to(root)) if kind=='full' else str(path.relative_to(source))
            bundle.write(path,arcname)
        if kind=='site':bundle.writestr('README.md',header('DOC-T02-SITE',1)+'# 围棋社T02互动棋盘成品\n\n用本机HTTP服务打开本目录，例如`python3 -m http.server 8080 --bind 127.0.0.1`。四个示例是组件验证，不是正式课程。完整源码、测试和限制见full包。\n')
    with zipfile.ZipFile(archive) as bundle:
        if bundle.testzip() is not None:raise SystemExit('Archive CRC failed: '+str(archive))
        if kind=='full':
            for item in manifest['files']:
                if hashlib.sha256(bundle.read('go-club/'+item['path'])).hexdigest()!=item['sha256']:raise SystemExit('Archive hash mismatch: '+item['path'])
    archives.append({'file':archive.name,'sha256':digest(archive),'bytes':archive.stat().st_size})
(out/'SHA256SUMS.txt').write_text(''.join(f"{item['sha256']}  {item['file']}\n" for item in archives))
(out/'delivery-manifest.json').write_text(json.dumps({'schemaVersion':1,'id':'DELIVERY-T02-001','revision':1,'rulesetId':'GO-CLUB-AREA-1','kind':'DeliveryManifest','taskId':'T02','baseVersion':'0.2.0','resultVersion':version,'status':'complete-board-scope','archives':archives,'archiveIntegrity':'passed','sourceFileHashes':'passed','untested':manifest['untested']},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'files':len(files()),'archives':archives,'integrity':'passed'},ensure_ascii=False))
