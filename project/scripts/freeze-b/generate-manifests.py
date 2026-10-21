"""Generate FREEZE_B content lock, change list, and 0.15.1 release manifest."""
from pathlib import Path
import json, hashlib

ROOT = Path(__file__).resolve().parents[2]
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
read = lambda p: json.loads((ROOT/p).read_text())
def meta(path):
    p=ROOT/path
    return {'path':path,'sha256':sha(p),'bytes':p.stat().st_size}
def files_under(path):
    return [p.relative_to(ROOT).as_posix() for p in sorted((ROOT/path).rglob('*')) if p.is_file()]

pool=read('content/t09/release-pool.json')
bundle=read('content/t09/bundle.json')
result=read('content/validation/results.json')
result_by={x['id']:x for x in result['items']}
formal=[]
for ident in pool['formalPuzzleIds']+pool['endgameIds']:
    kind='puzzles' if ident in pool['formalPuzzleIds'] else 'endgames'
    data=read(f'content/{kind}/{ident}.json')
    status={k:data['validation'][k]['status'] for k in ['structure','moveLegality','solutionChecked','externalReferenceChecked','modelChecked']}
    item={'id':ident,'revision':data['revision'],'path':f'content/{kind}/{ident}.json',
          'sha256':sha(ROOT/f'content/{kind}/{ident}.json'),
          'diagram':meta(f'content/artwork/{ident}.svg'),
          'validation':status,'humanReviewed':data['validation']['humanReviewed'],
          'checkCount':result_by[ident]['checks']}
    if data['kind']=='Puzzle':
        item['category']=data['category']
        item['grading']='discussion-only' if ident in pool['discussionOnlyIds'] else 'verified-covered-scope'
    else:
        item['status']=data['status']; item['finalScoreAvailable']=data['expectedScore'] is not None
    formal.append(item)

include=[]
for folder in ['content/puzzles','content/endgames','content/artwork','content/t09','content/print',
               'content/tools','content/validation','schemas','dist-engine','src/core','materials/rule-cards']:
    include += files_under(folder)
include += [
 'README.md','SOURCES.md','package.json','pnpm-lock.yaml',
 'docs/PROJECT_CONTRACT.md','docs/RULES.md','docs/CURRICULUM.md','docs/TERMINOLOGY.md',
 'docs/CONTENT_SCHEMA.md','docs/INTERFACES.md','docs/requirements-matrix.md',
 'docs/t11/LIFE_CONTENT_CHANGE_RECORD.md','docs/t11/TEACHING_CORRECTNESS_REVIEW.md',
 'handoff/T09.md','handoff/T11.md','handoff/T20.md','handoff/FREEZE_B.md',
 'scripts/verify-content-freeze.mjs',
]
include += files_under('docs/freeze-b') + files_under('scripts/freeze-b')
exclude={'handoff/CONTENT_FREEZE.json','docs/freeze-b/CHANGED_FILES.json','release-manifest.json'}
include=sorted(set(include)-exclude)
for p in include: assert (ROOT/p).is_file(), p

manifest={
 'schemaVersion':1,'id':'CONTENT-FREEZE-B-20260919-01','revision':1,
 'kind':'ContentFreeze','freezeId':'GO-CLUB-FREEZE-B-20260919-01',
 'taskId':'FREEZE_B','baseVersion':'T15 0.15.0','mainVersion':'0.15.1',
 'formalContentVersion':'0.2.0-t09.1','rulesetId':'GO-CLUB-AREA-1',
 'frozenAt':'2026-09-19','status':'complete-file-lock','schemaMajor':1,
 'schema':meta('schemas/content.schema.json'),
 'engine':meta('dist-engine/go-club-rules.mjs'),
 'bundle':meta('content/t09/bundle.json'),
 'puzzles':[x for x in formal if 'category' in x],
 'terminals':[x for x in formal if 'category' not in x],
 'ruleCardPositions':[{'id':read(p)['id'],'revision':read(p)['revision'],'path':p,'sha256':sha(ROOT/p)}
   for p in sorted(files_under('materials/rule-cards/data')) if Path(p).name.startswith('RULE-DEMO-T20-')],
 'validation':{
  'content':{'status':'passed','checks':result['checks'],'recordedMoves':result['replayedMoves'],
             'exploredRuleTransitions':result['exploredTransitions'],'evidence':'content/validation/results.json'},
  'exports':{'status':'passed','checks':28243,'svg':36,'pdfPages':54,'pptSlides':36,'notes':36,
             'evidence':'content/validation/export-check.json'},
  't20Engine':{'status':'passed','checks':9,'evidence':'docs/freeze-b/evidence/t20-engine-checks.json'},
  't20Print':{'status':'passed','checks':59,'evidence':'docs/freeze-b/evidence/t20-print-checks.json'},
  'mainUnit':{'status':'passed','testFiles':41,'tests':341,'evidence':'docs/freeze-b/evidence/check-02.log'},
  'browser':{'status':'passed','tests':120,'browser':'Chromium','evidence':'docs/freeze-b/evidence/browser-check.log'},
  'pdfRenderReview':{'status':'passed-digital-assistant-review','pages':70,
                     'evidence':'docs/freeze-b/evidence/visual-review.json'},
 },
 'classification':{
  'formal':'Exactly the 30 puzzle IDs and 6 terminal IDs listed here.',
  'developmentExcluded':['T14 TEMPLATE-*','T15 TEST-*','T04/T05 DEMO-*','T08 DEV-*'],
  'materialsOnly':'RULE-DEMO-T20-* are nine Positions for rule cards, not formal puzzles.',
 },
 'humanReviewed':None,
 'blockers':[],
 'untested':['human Go teacher review','real classroom/student feedback','physical printing and cut registration',
             'physical phone/tablet/projector','Safari and Firefox','VoiceOver/TalkBack/JAWS','native Office/Keynote'],
 'invalidationPolicy':'Any change to a formal puzzle/terminal, its revision, answer, conditions, diagram, bundle, rules/schema, evidence, or frozen T20 material invalidates this freezeId. Revise in mainline, synchronize consumers, rerun validation, and issue a new freezeId.',
 'selfHashPolicy':'This manifest is excluded from its own files list. Archive-level SHA-256 is recorded outside archives in the delivery SHA256SUMS.txt.',
 'files':[meta(p) for p in include],
}
assert len(manifest['puzzles'])==30 and len(manifest['terminals'])==6
assert len(manifest['ruleCardPositions'])==9
(ROOT/'handoff/CONTENT_FREEZE.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')

base=read('docs/freeze-b/input-T15-release-manifest.json')
before={x['path']:x['sha256'] for x in base['files']}
current=[]
for p in sorted(ROOT.rglob('*')):
    if not p.is_file() or p.is_symlink(): continue
    rel=p.relative_to(ROOT).as_posix()
    if rel.startswith(('node_modules/','.git/','output/playwright/freeze-b-results/')):continue
    current.append(rel)
after={p:sha(ROOT/p) for p in current}
changed=[p for p in before if p in after and before[p]!=after[p]]
assert set(changed)=={'README.md','CHANGELOG.md','package.json'}, changed
changes={'taskId':'FREEZE_B','baseVersion':'0.15.0','resultVersion':'0.15.1',
         'modified':changed,'added':sorted(set(after)-set(before)),
         'removed':sorted(set(before)-set(after)),'protectedFormalContentChanged':False}
(ROOT/'docs/freeze-b/CHANGED_FILES.json').write_text(json.dumps(changes,ensure_ascii=False,indent=2)+'\n')

# Recompute current file set now that the two generated records exist.
release_files=[]
for p in sorted(ROOT.rglob('*')):
    if not p.is_file() or p.is_symlink():continue
    rel=p.relative_to(ROOT).as_posix()
    if rel.startswith(('node_modules/','.git/','output/playwright/freeze-b-results/')) or rel=='release-manifest.json':continue
    release_files.append(meta(rel))
release={'schemaVersion':1,'id':'RELEASE-FREEZE-B-001','revision':1,'rulesetId':'GO-CLUB-AREA-1',
         'kind':'ProjectRelease','taskId':'FREEZE_B','baseVersion':'0.15.0','resultVersion':'0.15.1',
         'freezeId':manifest['freezeId'],'status':'complete-file-lock','files':release_files,
         'selfHashPolicy':'release-manifest.json excluded from its own file list; delivery hashes cover archives.'}
(ROOT/'release-manifest.json').write_text(json.dumps(release,ensure_ascii=False,indent=2)+'\n')
print(f'Wrote freeze: {len(manifest["files"])} locked files; release: {len(release_files)} files; {len(changes["added"])} added, {len(changed)} modified.')
