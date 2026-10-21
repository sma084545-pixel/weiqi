"""Package the tested T05 capture lab without overwriting prior releases."""
from pathlib import Path
import argparse, hashlib, json, zipfile

root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('output',type=Path);args=parser.parse_args()
out=args.output.resolve();out.mkdir(parents=True,exist_ok=True)
if root==out or root in out.parents:raise SystemExit('Output must be outside project root')
version=json.loads((root/'package.json').read_text())['version']
if version!='0.6.0':raise SystemExit('Update T05 packaging metadata explicitly for a new release')

excluded={'node_modules','.git','.DS_Store','__pycache__'}
excluded_prefixes={('output','playwright','results'),('output','playwright','report')}
def included(path:Path)->bool:
    parts=path.relative_to(root).parts
    return not set(parts)&excluded and not path.name.startswith('.t05-') and not any(parts[:len(prefix)]==prefix for prefix in excluded_prefixes)
def files():return sorted(path for path in root.rglob('*') if path.is_file() and included(path))
def digest(path:Path):return hashlib.sha256(path.read_bytes()).hexdigest()
def header(identifier:str,revision:int):return f'---\nschemaVersion: 1\nid: {identifier}\nrevision: {revision}\nrulesetId: GO-CLUB-AREA-1\n---\n\n'

required=['dist/index.html','dist-engine/go-club-rules.mjs','handoff/T05.md','docs/t05/ACCEPTANCE.md','output/validation/T05/command-report.json']
for name in required:
    if not (root/name).is_file():raise SystemExit('Missing required artifact: '+name)
report=json.loads((root/'output/validation/T05/command-report.json').read_text())
if any(item.get('status')!='passed' or item.get('exitCode',0)!=0 for item in report['commands']):raise SystemExit('Final verification report contains a failure')

changed=[
 'CHANGELOG.md','README.md','SOURCES.md','docs/CHANGED_FILES.md','docs/CONTENT_SCHEMA.md','docs/INTERFACES.md','docs/PROJECT_CONTRACT.md','docs/STYLE_GUIDE.md','docs/requirements-matrix.md','index.html','package.json','release-manifest.json',
 'content/t05/capture-demos.json','src/core/constants.ts','src/core/rules/contract.ts','src/features/liberty-lab/LibertyLab.tsx',
 'src/features/learning-hub/LearningHub.tsx','src/features/learning-hub/registry.ts','src/features/learning-hub/stages.ts','src/features/capture-lab/CaptureLab.css','src/features/capture-lab/CaptureLab.tsx','src/features/capture-lab/StepPlayer.tsx','src/features/capture-lab/demos.ts','src/features/capture-lab/evaluation.ts','src/features/capture-lab/frames.ts',
 'docs/t03/LEARNING_HUB_USAGE.md','docs/t03/MODULE_REGISTRY.md','docs/t04/LIBERTY_LAB_USAGE.md','docs/t04/REQUIREMENT_TRACE.md','docs/t05/ACCEPTANCE.md','docs/t05/CAPTURE_LAB_USAGE.md','docs/t05/EXPECTED_RESULTS.md','docs/t05/FIDELITY_LEDGER.md','docs/t05/RULE_TRACE.md','docs/t05/design-concept.png',
 'tests/browser/t05.spec.ts','tests/fixtures/t05-capture-expected.json','tests/t03/registry.test.ts','tests/t05/capture-lab.test.tsx','tests/t05/demos.test.ts','tests/t05/evaluation.test.ts','tests/t05/frames.test.ts','tests/t05/step-player.test.tsx',
 'scripts/package-t05.py','scripts/validate-content.ts','handoff/T05.md','output/validation/content-report.json','output/validation/T05/command-report.json'
]
for prefix in ['dist','dist-engine','output/playwright/t05']:
    changed.extend(str(path.relative_to(root)) for path in (root/prefix).rglob('*') if path.is_file())
changed=sorted(set(changed))
missing=[name for name in changed if name not in {'docs/CHANGED_FILES.md','docs/t05/CHANGED_FILES.md','release-manifest.json'} and not (root/name).is_file()]
if missing:raise SystemExit('Changed file list has missing paths: '+', '.join(missing))
(root/'docs/t05/CHANGED_FILES.md').write_text(header('DOC-T05-CHANGED-FILES',1)+'# T05 逐文件变更\n\nbaseVersion=0.5.0；resultVersion=0.6.0。以下只列 T05 新增或修改；完整项目哈希见 `release-manifest.json`。独立 T18 材料及 T00–T04 历史成果被继承但不属于本次变更。\n\n'+''.join(f'- `{name}`\n' for name in changed))

all_names=sorted(str(path.relative_to(root)) for path in files())
(root/'docs/CHANGED_FILES.md').write_text(header('DOC-CHANGED-FILES',6)+'# 0.6.0 完整项目文件清单\n\nT05 差异见 `t05/CHANGED_FILES.md`。以下是完整当前工程，不等于 T06–T24 均已实现。\n\n'+''.join(f'- `{name}`\n' for name in all_names))
manifest={
 'schemaVersion':1,'id':'RELEASE-T05-001','revision':1,'rulesetId':'GO-CLUB-AREA-1','kind':'ProjectRelease','taskId':'T05',
 'baseVersion':'0.5.0','resultVersion':version,'status':'complete-capture-lab-scope',
 'untested':['physical phones/tablets/projector','Safari/Firefox','VoiceOver/TalkBack/JAWS','human teacher review','physical board classroom use','school implementation'],
 'files':[{'path':str(path.relative_to(root)),'sha256':digest(path),'bytes':path.stat().st_size} for path in files() if path.name!='release-manifest.json']
}
(root/'release-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')

archives=[]
for kind,source in [('full',root),('site',root/'dist')]:
    archive=out/f'go-club-T05-{version}-{kind}.zip'
    if archive.exists():raise SystemExit('Refusing to overwrite existing release '+str(archive))
    with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as bundle:
        candidates=files() if kind=='full' else sorted(path for path in source.rglob('*') if path.is_file())
        for path in candidates:
            arcname='go-club/'+str(path.relative_to(root)) if kind=='full' else str(path.relative_to(source))
            bundle.write(path,arcname)
        if kind=='site':bundle.writestr('README.md',header('DOC-T05-SITE',1)+'# 围棋社 T05 提子实验室成品\n\n用本机 HTTP 服务打开本目录，例如 `python3 -m http.server 8080 --bind 127.0.0.1`。从学习路线第 2 阶段进入提子实验室；当前完成 6 个开发演示、预测与四步播放，吃子小游戏和正式题库仍按页面状态显示。完整源码、测试和限制见 full 包。\n')
    with zipfile.ZipFile(archive) as bundle:
        if bundle.testzip() is not None:raise SystemExit('Archive CRC failed: '+str(archive))
        if kind=='full':
            for item in manifest['files']:
                if hashlib.sha256(bundle.read('go-club/'+item['path'])).hexdigest()!=item['sha256']:raise SystemExit('Archive hash mismatch: '+item['path'])
    archives.append({'file':archive.name,'sha256':digest(archive),'bytes':archive.stat().st_size})
(out/'SHA256SUMS.txt').write_text(''.join(f"{item['sha256']}  {item['file']}\n" for item in archives))
(out/'delivery-manifest.json').write_text(json.dumps({'schemaVersion':1,'id':'DELIVERY-T05-001','revision':1,'rulesetId':'GO-CLUB-AREA-1','kind':'DeliveryManifest','taskId':'T05','baseVersion':'0.5.0','resultVersion':version,'status':'complete-capture-lab-scope','archives':archives,'archiveIntegrity':'passed','sourceFileHashes':'passed','untested':manifest['untested']},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'files':len(files()),'archives':archives,'integrity':'passed'},ensure_ascii=False))
