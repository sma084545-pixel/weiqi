#!/usr/bin/env python3
"""Verify this UI extension preserves the released rules, content, materials and lock."""
from pathlib import Path
import hashlib,json,sys
root=Path(__file__).resolve().parents[1]
base=json.loads((root/'docs/history/provenance/FREE_PLAY-RELEASE_MANIFEST.json').read_text())
prefixes=('src/core/rules/','content/','schemas/','materials/','handoff/')
exact={'src/core/content.generated.d.ts','docs/RULES.md','docs/CONTENT_SCHEMA.md','docs/PROJECT_CONTRACT.md','pnpm-lock.yaml'}
selected=[item for item in base['files'] if item['path'].startswith(prefixes) or item['path'] in exact]
failures=[]
for item in selected:
    path=root/item['path']
    actual=hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() else None
    if actual!=item['sha256']:failures.append({'path':item['path'],'expected':item['sha256'],'actual':actual})
package=json.loads((root/'package.json').read_text())
assert package['dependencies']=={'ajv':'8.20.0','react':'19.2.8','react-dom':'19.2.8'}
report={'schemaVersion':1,'id':'HISTORY-PRESERVATION','revision':1,'rulesetId':'GO-CLUB-AREA-1','baseVersion':base['resultVersion'],'resultVersion':'0.19.0-history.1','status':'failed' if failures else 'passed','checkedFiles':len(selected),'files':[item['path'] for item in selected],'failures':failures,'humanReviewed':None}
(root/'docs/history/checks/preservation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'status':report['status'],'checkedFiles':len(selected),'failures':failures},ensure_ascii=False))
sys.exit(1 if failures else 0)
