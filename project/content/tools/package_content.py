#!/usr/bin/env python3
"""Package only new T09 paths, preserving every byte from the explicit T01 base."""
from pathlib import Path
import argparse, hashlib, json, zipfile, shutil

def sha(data): return hashlib.sha256(data).hexdigest()
def identity(i,kind): return dict(schemaVersion=1,id=i,revision=1,rulesetId='GO-CLUB-AREA-1',kind=kind)
parser=argparse.ArgumentParser()
parser.add_argument('--base',required=True,type=Path)
parser.add_argument('--output',required=True,type=Path)
args=parser.parse_args()
root=Path(__file__).resolve().parents[2]
base=json.loads((root/'content/t09/input-manifest.json').read_text())
if sha(args.base.read_bytes())!=base['baseArchiveSha256']: raise SystemExit('Unexpected base archive hash.')
with zipfile.ZipFile(args.base) as z:
 baseline={str(Path(n).relative_to('go-club')):z.read(n) for n in z.namelist() if not n.endswith('/')}
for name,data in baseline.items():
 if not (root/name).is_file() or (root/name).read_bytes()!=data: raise SystemExit('Baseline differs: '+name)
manifest_path='content/t09/FILE_MANIFEST.json'
changed_path='content/t09/CHANGED_FILES.md'
def included(p):
 n=p.relative_to(root).as_posix()
 return p.is_file() and not p.is_symlink() and n not in baseline and not any(x in p.parts for x in ['__pycache__','node_modules','ppt-build']) and p.name!='.DS_Store' and not any(n.startswith('content/validation/rendered/'+d+'/') for d in ['slides','slides-final','slides-release'])
files=sorted({p.relative_to(root).as_posix() for p in (root/'content').rglob('*') if included(p)}|{'handoff/T09.md',changed_path,manifest_path})
text='---\nschemaVersion: 1\nid: T09-CHANGED-FILES\nrevision: 1\nrulesetId: GO-CLUB-AREA-1\n---\n\n# T09 新增文件清单\n\nbaseVersion=0.2.0；resultVersion=0.2.0-t09.1。下列文件全部新增；原 T01 的 134 个文件无修改。只选择合并这些路径。中间演示稿、旧渲染和本机依赖不入包。\n\n'
text+='\n'.join('- `'+p+'`' for p in files)+'\n'
(root/changed_path).write_text(text)
manifest={**identity('T09-FILE-MANIFEST','FileManifest'),'baseVersion':'0.2.0','resultVersion':'0.2.0-t09.1','baseArchiveSha256':base['baseArchiveSha256'],'originalFilesUnchanged':len(baseline),'fileCountIncludingManifest':len(files),'selfHashPolicy':'Manifest excluded from its own file list; package SHA256SUMS covers archive and manifest.','files':[{'path':p,'bytes':(root/p).stat().st_size,'sha256':sha((root/p).read_bytes())} for p in files if p!=manifest_path]}
(root/manifest_path).write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
out=args.output.resolve();out.mkdir(parents=True,exist_ok=True)
archives={
 'T09_完整内容增量包_0.2.0-t09.1.zip':{f't09-content/{p}':(root/p).read_bytes() for p in files},
 'go-club-T09-0.2.0-t09.1-T01-reproduction.zip':{**{f'go-club/{p}':d for p,d in baseline.items()},**{f'go-club/{p}':(root/p).read_bytes() for p in files}}
}
for name,entries in archives.items():
 with zipfile.ZipFile(out/name,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
  for path,data in sorted(entries.items()):
   item=zipfile.ZipInfo(path,(2026,9,7,0,0,0));item.compress_type=zipfile.ZIP_DEFLATED;item.external_attr=0o100644<<16
   z.writestr(item,data)
 with zipfile.ZipFile(out/name) as z:
  assert z.testzip() is None
  for path,data in entries.items(): assert z.read(path)==data
for name in ['T09_挑战卡_A4.pdf','T09_答案册.pdf','T09_教学演示_r1.pptx']:shutil.copy2(root/'content/print'/name,out/name)
shutil.copy2(root/'handoff/T09.md',out/'T09_交接说明.md')
shutil.copy2(root/manifest_path,out/'FILE_MANIFEST.json')
print(json.dumps({'passed':True,'taskFiles':len(files),'originalFilesUnchanged':len(baseline),'archives':list(archives),'output':str(out)},ensure_ascii=False))
