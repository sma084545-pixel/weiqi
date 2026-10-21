#!/usr/bin/env python3
"""Compare rules, frozen content/materials, historical handoffs and shared boards to verified 0.19."""
from pathlib import Path
import hashlib,json,sys
root=Path(__file__).resolve().parents[1]
base=json.loads((root/'docs/online/provenance/HISTORY-RELEASE_MANIFEST.json').read_text())
prefixes=('src/core/rules/','content/','schemas/','materials/','handoff/','docs/history/')
exact={'src/core/content.generated.d.ts','docs/RULES.md','docs/CONTENT_SCHEMA.md','src/components/Board.tsx','src/components/Board.css','src/components/GameTimeline.tsx','src/components/GameTimeline.css','src/core/game-history.ts'}
selected=[item for item in base['files'] if item['path'].startswith(prefixes) or item['path'] in exact]
failures=[]
for item in selected:
 p=root/item['path'];actual=hashlib.sha256(p.read_bytes()).hexdigest() if p.is_file() else None
 if actual!=item['sha256']:failures.append({'path':item['path'],'expected':item['sha256'],'actual':actual})
report={'schemaVersion':1,'id':'ONLINE-PRESERVATION','revision':1,'rulesetId':'GO-CLUB-AREA-1','baseVersion':base['resultVersion'],'resultVersion':'0.20.0-online.1','status':'failed' if failures else 'passed','checkedFiles':len(selected),'files':[x['path'] for x in selected],'failures':failures,'humanReviewed':None}
(root/'docs/online/checks/preservation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'status':report['status'],'checkedFiles':len(selected),'failures':failures},ensure_ascii=False));sys.exit(1 if failures else 0)
