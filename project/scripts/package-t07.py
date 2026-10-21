"""Package the tested T07 same-screen capture game without overwriting prior releases."""
from pathlib import Path
import argparse, hashlib, json, zipfile

root=Path(__file__).resolve().parents[1]
baseline=root.parent/'go-club-t06-0912'
parser=argparse.ArgumentParser();parser.add_argument('output',type=Path);args=parser.parse_args()
out=args.output.resolve();out.mkdir(parents=True,exist_ok=True)
if root==out or root in out.parents:raise SystemExit('Output must be outside project root')
version=json.loads((root/'package.json').read_text())['version']
if version!='0.8.0':raise SystemExit('Update T07 packaging metadata explicitly for a new release')

excluded={'node_modules','.git','.DS_Store','__pycache__'}
excluded_prefixes={('output','playwright','results'),('output','playwright','report')}
def included(path:Path)->bool:
    parts=path.relative_to(root).parts
    return not set(parts)&excluded and not path.name.startswith('.t07-') and not any(parts[:len(prefix)]==prefix for prefix in excluded_prefixes)
def files():return sorted(path for path in root.rglob('*') if path.is_file() and included(path))
def digest(path:Path):return hashlib.sha256(path.read_bytes()).hexdigest()
def header(identifier:str,revision:int):return f'---\nschemaVersion: 1\nid: {identifier}\nrevision: {revision}\nrulesetId: GO-CLUB-AREA-1\n---\n\n'

required=['dist/index.html','dist-engine/go-club-rules.mjs','handoff/T07.md','docs/t07/ACCEPTANCE.md','docs/t07/design-concept.png','output/validation/T07/command-report.json']
for name in required:
    if not (root/name).is_file():raise SystemExit('Missing required artifact: '+name)
report=json.loads((root/'output/validation/T07/command-report.json').read_text())
if any(item.get('status')!='passed' or item.get('exitCode',0)!=0 for item in report['commands']):raise SystemExit('Final verification report contains a failure')

current={str(path.relative_to(root)):path for path in files() if path.name not in {'release-manifest.json'}}
base={str(path.relative_to(baseline)):path for path in baseline.rglob('*') if path.is_file() and not path.name.startswith('.t06-') and not set(path.relative_to(baseline).parts)&excluded and not any(path.relative_to(baseline).parts[:len(prefix)]==prefix for prefix in excluded_prefixes)} if baseline.is_dir() else {}
changed=sorted(set(name for name,path in current.items() if name not in base or digest(path)!=digest(base[name]))|{'docs/t07/CHANGED_FILES.md','docs/CHANGED_FILES.md','release-manifest.json'})
removed=sorted(name for name in base if name not in current and name!='release-manifest.json')
(root/'docs/t07/CHANGED_FILES.md').write_text(header('DOC-T07-CHANGED-FILES',1)+'# T07 逐文件变更\n\nbaseVersion=0.7.0；resultVersion=0.8.0。以下由基线与当前文件SHA-256比较生成；完整项目哈希见 `release-manifest.json`。`dist`和浏览器截图属于可复现成品/证据。\n\n'+''.join(f'- `{name}`\n' for name in changed)+(('\n移除：\n'+''.join(f'- `{name}`\n' for name in removed)) if removed else '\n移除：无。\n'))

all_names=sorted(str(path.relative_to(root)) for path in files())
(root/'docs/CHANGED_FILES.md').write_text(header('DOC-CHANGED-FILES',8)+'# 0.8.0 完整项目文件清单\n\nT07差异见 `t07/CHANGED_FILES.md`。以下是完整当前工程，不等于T08–T24均已实现。\n\n'+''.join(f'- `{name}`\n' for name in all_names))

untested=report['untested']
manifest={
 'schemaVersion':1,'id':'RELEASE-T07-001','revision':1,'rulesetId':'GO-CLUB-AREA-1','kind':'ProjectRelease','taskId':'T07',
 'baseVersion':'0.7.0','resultVersion':version,'status':'complete-capture-game-scope','sourceBaseline':'work/go-club-t06-0912',
 'schemaSha256':digest(root/'schemas/content.schema.json'),'lockfileSha256':digest(root/'pnpm-lock.yaml'),'untested':untested,
 'files':[{'path':str(path.relative_to(root)),'sha256':digest(path),'bytes':path.stat().st_size} for path in files() if path.name!='release-manifest.json']
}
(root/'release-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')

archives=[]
for kind,source in [('full',root),('site',root/'dist')]:
    archive=out/f'go-club-T07-{version}-{kind}.zip'
    if archive.exists():raise SystemExit('Refusing to overwrite existing release '+str(archive))
    with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as bundle:
        candidates=files() if kind=='full' else sorted(path for path in source.rglob('*') if path.is_file())
        for path in candidates:
            arcname='go-club/'+str(path.relative_to(root)) if kind=='full' else str(path.relative_to(source))
            bundle.write(path,arcname)
        if kind=='site':bundle.writestr('README.md',header('DOC-T07-SITE',1)+'# 围棋社 T07 同屏双人吃子小游戏成品\n\n用本机HTTP服务打开本目录，例如 `python3 -m http.server 8080 --bind 127.0.0.1`。从学习入口的“我想找个伙伴玩”进入；默认9路，可选5路。完整源码、测试、规则边界和未测项见full包。\n')
    with zipfile.ZipFile(archive) as bundle:
        if bundle.testzip() is not None:raise SystemExit('Archive CRC failed: '+str(archive))
        if kind=='full':
            for item in manifest['files']:
                if hashlib.sha256(bundle.read('go-club/'+item['path'])).hexdigest()!=item['sha256']:raise SystemExit('Archive hash mismatch: '+item['path'])
    archives.append({'file':archive.name,'sha256':digest(archive),'bytes':archive.stat().st_size})
(out/'SHA256SUMS.txt').write_text(''.join(f"{item['sha256']}  {item['file']}\n" for item in archives))
(out/'delivery-manifest.json').write_text(json.dumps({'schemaVersion':1,'id':'DELIVERY-T07-001','revision':1,'rulesetId':'GO-CLUB-AREA-1','kind':'DeliveryManifest','taskId':'T07','baseVersion':'0.7.0','resultVersion':version,'status':'complete-capture-game-scope','archives':archives,'archiveIntegrity':'passed','sourceFileHashes':'passed','untested':untested},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'files':len(files()),'changed':len(changed),'removed':removed,'archives':archives,'integrity':'passed'},ensure_ascii=False))
