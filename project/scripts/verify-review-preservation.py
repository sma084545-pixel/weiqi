"""Compare the increment against the sealed latest baseline, including editable materials."""
from pathlib import Path
import json,hashlib,zipfile,argparse
p=argparse.ArgumentParser();p.add_argument('--base',required=True);a=p.parse_args()
r=Path(__file__).resolve().parents[1];base=Path(a.base).resolve()
sha=lambda b:hashlib.sha256(b).hexdigest()
assert sha(base.read_bytes())=='a5a0ccd4f3aa68a07af11502a6e4e014ac546c4a169ef9e10d2b7c465c2c4599'
allowed={'src/core/version.ts','src/features/full-game/FullGame.tsx','src/features/ai-game/AiGame.tsx','src/features/online-game/OnlineGame.tsx',*{'src/features/guided-play/'+n for n in ['types.ts','model.ts','useGuidedPlay.ts','GuidedPlay.tsx','storage.ts']}}
protected=[]
with zipfile.ZipFile(base) as z:
    for name in z.namelist():
        if not name.startswith('go-club/') or name.endswith('/'):continue
        rel=name[8:]
        if rel in allowed:continue
        if rel.startswith(('content/','materials/','src/','server/','analysis-engine/','docs/t24/','docs/advanced-courses/')) or rel in {'pnpm-lock.yaml','schemas/content.schema.json','schemas/ai-session.schema.json'}:
            path=r/rel;assert path.is_file(),('missing protected file',rel)
            digest=sha(z.read(name));assert sha(path.read_bytes())==digest,('changed protected file',rel)
            protected.append({'path':rel,'sha256':digest})
    previous=json.loads(z.read('go-club/package.json'));current=json.loads((r/'package.json').read_text())
    for field in ['dependencies','devDependencies','packageManager']:assert previous[field]==current[field]
    assert z.read('go-club/deploy/github-pages.json')==(r/'deploy/github-pages.json').read_bytes()
puzzles=[json.loads(x.read_text()) for x in (r/'content/puzzles').glob('*.json')]
endgames=[json.loads(x.read_text()) for x in (r/'content/endgames').glob('END-*.json')]
assert len(puzzles)==30 and len(endgames)==6
assert all(x['schemaVersion']==1 and x['rulesetId']=='GO-CLUB-AREA-1' and x['revision']==1 for x in puzzles+endgames)
report={'schemaVersion':1,'id':'REVIEW-BASELINE-PRESERVATION','revision':1,'rulesetId':'GO-CLUB-AREA-1','status':'passed','baseVersion':'0.26.2-pages.1','baseArchiveSha256':sha(base.read_bytes()),'resultVersion':current['version']+'-pages.1','verifiedProtectedFiles':len(protected),'formalPuzzles':len(puzzles),'endgames':len(endgames),'dependencies':'unchanged','lockfile':'byte-identical','services':'all three existing origins unchanged; no new server or fee','files':protected,'humanReviewed':None}
(r/'docs/game-review/checks/preservation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='files'},ensure_ascii=False))
