#!/usr/bin/env python3
"""Re-run shipped material checks, retaining historical outputs byte for byte."""
from pathlib import Path
import importlib.util,json,os,subprocess,sys,hashlib
R=Path(__file__).resolve().parents[1];Q=R/'docs/t24/checks/materials';Q.mkdir(parents=True,exist_ok=True)
runtime=Path(os.environ.get('T24_RUNTIME','/Users/maxiao/.cache/codex-runtimes/codex-primary-runtime/dependencies'))
node=runtime/'node/bin/node';py=runtime/'python/bin/python3';env=dict(os.environ);env['PATH']=str(runtime/'node/bin')+':'+env['PATH']
jobs=[('T18',[py,'materials/demo-board/verify_assets.py'],'materials/demo-board'),('T19',[py,'materials/pair-boards/tools/verify_geometry.py'],'materials/pair-boards'),('T20-rules',[node,'materials/rule-cards/source/verify-demos.mjs'],'materials/rule-cards'),('T20-print',[py,'materials/rule-cards/source/verify-print.py'],'materials/rule-cards'),('T22-content',[node,'materials/micro-lessons/source/verify-content.mjs'],'materials/micro-lessons'),('T22-native',[py,'materials/micro-lessons/source/verify-delivery.py'],'materials/micro-lessons')]
results=[]
for name,cmd,directory in jobs:
    original={p:p.read_bytes() for p in (R/directory).rglob('*') if p.is_file()}
    result=subprocess.run(list(map(str,cmd)),cwd=R,env=env,capture_output=True,text=True)
    (Q/(name+'.log')).write_text(result.stdout+'\n'+result.stderr)
    changed=[]
    for p in (R/directory).rglob('*'):
        if p.is_file() and (p not in original or p.read_bytes()!=original[p]):
            changed.append(str(p.relative_to(R)))
            if p.suffix=='.json':(Q/(name+'-'+p.name)).write_bytes(p.read_bytes())
    # Only validation scripts' generated outputs are restored, never sources.
    for p,data in original.items():
        if p.read_bytes()!=data:p.write_bytes(data)
    results.append(dict(name=name,command=list(map(str,cmd)),exitCode=result.returncode,changedOutputCopiedThenRestored=changed))
    print(name,result.returncode,flush=True)
    assert result.returncode==0,name
name='T21-current-outputs';file=R/'materials/challenge-cards/source/build_cards.py'
spec=importlib.util.spec_from_file_location('t21',file);module=importlib.util.module_from_spec(spec);sys.modules['t21']=module;spec.loader.exec_module(module)
old=(R/'materials/challenge-cards/validation/automated-checks.json').read_bytes()
try:
    _,puzzles,pedagogy=module.verify_freeze()
    index=json.loads((R/'materials/challenge-cards/CARD_INDEX.json').read_text())['items']
    pages=json.loads((R/'materials/challenge-cards/validation/page-map.json').read_text())['teacherPages']
    checks=module.validate_outputs(puzzles,index,pages)
    (Q/(name+'.json')).write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n')
finally:(R/'materials/challenge-cards/validation/automated-checks.json').write_bytes(old)
results.append(dict(name=name,command='verify_freeze + validate_outputs in shipped build_cards.py (no build)',checks=checks['checkCount'],exitCode=0))
print(name,checks['checkCount'],flush=True)
(Q/'commands.json').write_text(json.dumps(dict(schemaVersion=1,id='T24-MATERIALS-REGRESSION',revision=1,rulesetId='GO-CLUB-AREA-1',results=results,humanReviewed=None,physicalTests=None),ensure_ascii=False,indent=2)+'\n')
