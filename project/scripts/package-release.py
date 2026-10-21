"""Package current source, built site and T01 rules library; preserve prior releases."""
from pathlib import Path
import hashlib,json,zipfile,argparse
root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('output',type=Path);args=parser.parse_args()
out=args.output.resolve();out.mkdir(parents=True,exist_ok=True)
if root==out or root in out.parents:raise SystemExit('Output must be outside project root')
version=json.loads((root/'package.json').read_text())['version']
if version!='0.2.0':raise SystemExit('Update task packaging metadata explicitly for a new release')
task='T01';base='0.1.0'
meta=dict(schemaVersion=1,id='RELEASE-T01-001',revision=1,rulesetId='GO-CLUB-AREA-1')
exclude={'node_modules','.git','.DS_Store','__pycache__'}
def files():return sorted(p for p in root.rglob('*')if p.is_file() and not set(p.relative_to(root).parts)&exclude)
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
for name in ['dist/index.html','dist-engine/go-club-rules.mjs','dist-engine/types/rules/index.d.ts','dist-engine/THIRD_PARTY_NOTICES.md','handoff/T01.md','output/validation/T01/command-report.json']:
 if not (root/name).is_file():raise SystemExit('Missing required artifact: '+name)
commands=json.loads((root/'output/validation/T01/command-report.json').read_text())['commands']
if len(commands)!=3 or any(c.get('exitCode',0)!=0 or c.get('status','passed')!='passed'for c in commands):raise SystemExit('Final command verification did not pass')
baseline=json.loads((root/'docs/t01/input-manifest.json').read_text())['baselineFiles']
for name in ['schemas/content.schema.json','src/core/content.generated.d.ts','pnpm-lock.yaml','handoff/T00.md','src/components/Board.tsx','src/features/home/Home.tsx']:
 if digest(root/name)!=baseline[name]:raise SystemExit('Unexpected shared baseline change: '+name)
change_path=root/'docs/t01/CHANGED_FILES.md'
all_names=sorted(set(str(p.relative_to(root))for p in files())|{'docs/CHANGED_FILES.md','docs/t01/CHANGED_FILES.md','release-manifest.json'})
header=lambda id,rev:f'---\nschemaVersion: 1\nid: {id}\nrevision: {rev}\nrulesetId: GO-CLUB-AREA-1\n---\n\n'
(root/'docs/CHANGED_FILES.md').write_text(header('DOC-CHANGED-FILES',2)+'# 0.2.0完整项目文件清单\n\nT01具体差异见t01/CHANGED_FILES.md；T00历史新增清单保存在0.1.0归档。以下是完整当前工程，不等于所有功能均已实现。\n\n'+''.join(f'- `{n}`\n'for n in all_names))
changes=[]
for name in all_names:
 if name not in baseline:changes.append(('新增',name))
 elif name in {'docs/t01/CHANGED_FILES.md','release-manifest.json'} or (root/name).exists()and digest(root/name)!=baseline[name]:changes.append(('修改',name))
for name in baseline:
 if not (root/name).exists():changes.append(('删除',name))
change_path.write_text(header('DOC-T01-CHANGED-FILES',1)+'# T01逐文件变更\n\nbaseVersion=0.1.0；resultVersion=0.2.0。对照输入清单的原始SHA-256；构建物/报告也列出。完整文件哈希在release-manifest.json。来源、schema、锁、原T00交接及UI组件保留。\n\n| 变更 | 相对路径 |\n|---|---|\n'+''.join(f'| {kind} | `{name}` |\n'for kind,name in changes))
manifest={**meta,'kind':'ProjectRelease','taskId':task,'baseVersion':base,'resultVersion':version,'status':'complete-engine-scope','inheritedUnverified':['T00 real browser/360/768/1280; see handoff/T00.md'],'files':[{'path':str(p.relative_to(root)),'sha256':digest(p),'bytes':p.stat().st_size}for p in files()if p.name!='release-manifest.json']}
(root/'release-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
archives=[]
for kind,source in [('full',root),('site',root/'dist'),('engine',root/'dist-engine')]:
 archive=out/f'go-club-{task}-{version}-{kind}.zip'
 if archive.exists():raise SystemExit('Refusing to overwrite existing release '+str(archive))
 with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED)as z:
  for p in files()if kind=='full' else sorted(source.rglob('*')):
   if p.is_file():z.write(p,'go-club/'+str(p.relative_to(root))if kind=='full'else str(p.relative_to(source)))
  if kind=='site':z.writestr('README.md',header('DOC-SITE-HANDOFF',2)+'# 围棋社 0.2.0 首页成品\n\n首页仍为坐标示意；没有对弈界面。规则引擎另见同批engine包及full包。T00浏览器实屏验收未完成。用本机HTTP服务打开：`python3 -m http.server 8080 --bind 127.0.0.1`。完整检查记录见源码包handoff/T01.md。\n')
 with zipfile.ZipFile(archive)as z:
  assert z.testzip()is None
  if kind=='full':
   for f in manifest['files']:assert hashlib.sha256(z.read('go-club/'+f['path'])).hexdigest()==f['sha256']
 archives.append({'file':archive.name,'sha256':digest(archive),'bytes':archive.stat().st_size})
(out/'SHA256SUMS.txt').write_text(''.join(f"{a['sha256']}  {a['file']}\n"for a in archives))
(out/'delivery-manifest.json').write_text(json.dumps({**meta,'id':'DELIVERY-T01-001','kind':'DeliveryManifest','taskId':task,'baseVersion':base,'resultVersion':version,'status':'complete-engine-scope','archives':archives,'archiveIntegrity':'passed','sourceFileHashes':'passed','inheritedUnverified':manifest['inheritedUnverified']},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'files':len(files()),'changes':len(changes),'archives':archives,'integrity':'passed'},ensure_ascii=False))
