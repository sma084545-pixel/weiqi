#!/usr/bin/env python3
from pathlib import Path
import json,hashlib,zipfile,sys
archive=Path(sys.argv[1]);dest=Path(sys.argv[2]);report=Path(sys.argv[3]);report.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 assert all(n.startswith('go-club/') and '..' not in Path(n).parts and 'node_modules' not in Path(n).parts for n in z.namelist())
 z.extractall(dest)
R=dest/'go-club';m=json.loads((R/'RELEASE_MANIFEST.json').read_text());assert m['resultVersion']=='0.17.1-t24.1'
for item in m['files']:assert hashlib.sha256((R/item['path']).read_bytes()).hexdigest()==item['sha256'],item['path']
for line in (R/'SHA256SUMS.txt').read_text().splitlines():
 digest,path=line.split('  ',1);assert hashlib.sha256((R/path).read_bytes()).hexdigest()==digest,path
files=[p for p in R.rglob('*') if p.is_file()];assert len(files)==m['fileCount']
items=json.loads((R/'content/t09/bundle.json').read_text())['items'];counts={k:sum(x['kind']==k for x in items) for k in ['Puzzle','TerminalFixture']};assert counts=={'Puzzle':30,'TerminalFixture':6}
assert all(x['revision']==1 and x['schemaVersion']==1 and x['rulesetId']=='GO-CLUB-AREA-1' for x in items)
for f in ['package.json','pnpm-lock.yaml','dist/index.html','src/core/rules/engine.ts','schemas/content.schema.json','handoff/T24.md','materials/micro-lessons/output/T22_All_25_r1.pptx','materials/facilitator-kit/output/T23_facilitator_manual.docx']:
 assert (R/f).is_file(),f
assert all((R/f'handoff/T{i:02}.md').is_file() for i in range(24))
result=dict(schemaVersion=1,id='T24-ARCHIVE-CHECK',revision=1,rulesetId='GO-CLUB-AREA-1',resultVersion=m['resultVersion'],status='passed',archive=str(archive),archiveSha256=hashlib.sha256(archive.read_bytes()).hexdigest(),extractedTo=str(R),crc='passed',fileSha='passed',checksumList='passed',fileCount=len(files),counts=counts,allPrerequisiteHandoffs=True,noNodeModules=True,humanReviewed=None)
report.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result,ensure_ascii=False))
