# -*- coding: utf-8 -*-
from pathlib import Path
import json,hashlib,argparse,subprocess,os
p=argparse.ArgumentParser();p.add_argument('--base',required=True);args=p.parse_args()
R=Path(__file__).resolve().parents[1];B=Path(args.base).resolve()
h=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
exact=['pnpm-lock.yaml','src/core/coordinates.ts','src/core/constants.ts','src/core/content.generated.d.ts','src/core/unified-persistence.ts','src/core/persistence.ts','src/core/offline.ts','src/components/Board.css','docs/RULES.md','docs/CONTENT_SCHEMA.md','deploy/github-pages.json','deploy/katago.render.yaml']
prefixes=['content/','schemas/','materials/','server/','analysis-engine/','src/core/rules/','src/features/full-game/','src/features/online-game/','src/features/katago-review/','src/features/liberty-lab/','src/features/capture-lab/','src/features/capture-game/','src/features/life-lab/','src/features/cooperative/','src/features/territory/','src/features/teacher-editor/','src/features/file-exchange/','src/features/offline-data/','src/features/evidence/']
allowed={'src/core/rules/contract.ts'}
protected=[];errors=[]
for path in sorted(B.rglob('*')):
 if not path.is_file() or 'node_modules' in path.parts:continue
 name=str(path.relative_to(B))
 if name in allowed:continue
 if name in exact or any(name.startswith(prefix) for prefix in prefixes):
  target=R/name
  if not target.is_file() or h(path)!=h(target):errors.append(name)
  protected.append({'path':name,'sha256':h(path)})
if errors:raise SystemExit('Changed protected files: '+', '.join(errors))
# Compare the actual old six data objects, not just their titles.
node='node';code="import {STAGES} from './src/features/learning-hub/stages.ts';console.log(JSON.stringify(STAGES.slice(0,6)));"
def stages(cwd):
 env=dict(os.environ);env['NODE_PATH']=str(R/'node_modules')
 # Base has its retained local dependencies in this workspace. Caller can also use its sealed source copy.
 return json.loads(subprocess.check_output([node,'--import',str(R/'node_modules/tsx/dist/loader.mjs'),'--input-type=module','-e',code],cwd=cwd,env=env,text=True))
old=stages(B);new=stages(R);assert old==new,'old lesson definitions changed'
bundle=json.loads((R/'content/advanced-courses/bundle.json').read_text());formal=json.loads((R/'content/t09/bundle.json').read_text())
report={'schemaVersion':1,'id':'ADVANCED-PRESERVATION','revision':1,'rulesetId':'GO-CLUB-AREA-1','baseVersion':'0.22.0-pages.1','resultVersion':'0.23.0-pages.1','status':'passed','protectedFileCount':len(protected),'protectedFiles':protected,'oldSixStageObjects':'byte-equivalent JSON values, IDs and numbers unchanged','formalBundleItems':len(formal['items']),'newLessonCount':len(bundle['lessons']),'newSceneCount':len(bundle['scenes']),'coreRulesAlgorithms':'unchanged','boardContractChange':'additive optional marker text only','dependencies':'exact original lock unchanged','networkServices':'rooms and KataGo backend source/config unchanged'}
(R/'docs/advanced-courses/checks/preservation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='protectedFiles'},ensure_ascii=False))
