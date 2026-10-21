"""Cross-check the release pool and evidence. Does not generate Go answers."""
import json, hashlib
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
read = lambda name: json.loads((ROOT/name).read_text())
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
bundle = read('content/t09/bundle.json')
pool = read('content/t09/release-pool.json')
results = read('content/validation/results.json')
oracle = read('content/t09/independent-expectations.json')['items']
pedagogy = read('content/t09/pedagogy.json')['items']
expected = [f'{c}-{n:03}' for c in ['LIB','CAP','CON','LIFE','AREA','DISC'] for n in range(1,6)]
ends = [f'END-{n:03}' for n in range(1,7)]
assert pool['formalPuzzleIds'] == expected and pool['endgameIds'] == ends
assert len(bundle['items']) == 36 and len({x['id'] for x in bundle['items']}) == 36
assert results['passed'] and not results['failures']
items = []
for d in bundle['items']:
    folder = 'puzzles' if d['kind']=='Puzzle' else 'endgames'
    assert read(f'content/{folder}/{d["id"]}.json') == d
    assert d['revision']==1 and d['schemaVersion']==1 and d['rulesetId']=='GO-CLUB-AREA-1'
    assert not d.get('developmentOnly') and not d['id'].startswith(('TEST','TEMPLATE','DEMO'))
    assert d['validation']['humanReviewed'] is None
    for field in ['structure','moveLegality','solutionChecked']:
        assert d['validation'][field]['status']=='passed'
        for evidence in d['validation'][field]['evidence']:
            assert (ROOT/evidence.split(': ')[0]).is_file()
    assert d['id'] in pedagogy
    report = next(x for x in results['items'] if x['id']==d['id'])
    assert report['status']=='passed' and report['revision']==d['revision']
    if d['kind']=='Puzzle':
        assert d['id'] in oracle
        assert d['firstPlayer']==d['initialPosition']['toPlay']
        mode = 'discussion-only' if d['category']=='DISC' else 'verified-covered-scope'
        if mode=='discussion-only': assert d['answer']['automaticVerdict'] is False
    else:
        mode = d['status']
        assert d['agreement']['confirmedBy']==[]
        if d['id']=='END-006': assert d['status']=='unsettled' and d['expectedScore'] is None
        else: assert d['status']=='teaching-assumption' and d['expectedScore'] is not None
    items.append({'id':d['id'],'revision':d['revision'],'kind':d['kind'],'mode':mode,
                  'status':'passed','humanReviewed':None,'checks':report['checks'],
                  'solutionScope':oracle[d['id']]['kind'] if d['id'] in oracle else mode})
# T11 reviewed the existing LIFE identities; it did not revise their content.
t15 = read('docs/freeze-b/input-T15-release-manifest.json')
baseline = {x['path']:x['sha256'] for x in t15['files']}
protected = ['content/puzzles/','content/endgames/','content/artwork/','content/print/',
             'content/t09/','content/tools/','schemas/','src/core/','src/features/','src/components/']
checked = [p for p in baseline if p.startswith(tuple(protected)) or p in ['pnpm-lock.yaml','docs/RULES.md','docs/TERMINOLOGY.md']]
changes = [p for p in checked if sha(ROOT/p)!=baseline[p]]
assert not changes, changes
report = {'schemaVersion':1,'id':'FREEZE-B-CONTENT-AUDIT','revision':1,'rulesetId':'GO-CLUB-AREA-1',
          'checkedAt':'2026-09-19','formalPuzzles':30,'terminals':6,'items':items,
          'protectedT15Files':len(checked),'changedProtectedFiles':changes,
          'excludedPrefixes':['TEST','TEMPLATE','DEMO','DEV','RULE-DEMO-T20'],
          'status':'passed','humanReviewed':None}
(ROOT/'docs/freeze-b/evidence/content-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(f'PASS: 36 formal identities/evidence; {len(checked)} protected T15 files unchanged; no development pool contamination.')
