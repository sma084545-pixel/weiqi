from pathlib import Path
import json,hashlib,shutil
ROOT=Path(__file__).resolve().parents[1]; BASE=ROOT/'build/inputs/full/go-club'; OTHER=ROOT/'build/inputs/content/go-club-content-freeze-b'
freeze=json.loads((BASE/'handoff/CONTENT_FREEZE.json').read_text())
records=[]
def walk(o):
 if isinstance(o,dict):
  if 'path' in o and 'sha256' in o:
   f=BASE/o['path']; got=hashlib.sha256(f.read_bytes()).hexdigest() if f.is_file() else None
   records.append({'path':o['path'],'expected':o['sha256'],'actual':got,'passed':got==o['sha256']})
  for v in o.values():walk(v)
 elif isinstance(o,list):
  for v in o:walk(v)
walk(freeze)
assert records and all(r['passed'] for r in records)
assert (BASE/'handoff/CONTENT_FREEZE.json').read_bytes()==(OTHER/'handoff/CONTENT_FREEZE.json').read_bytes()
qa=ROOT/'qa';qa.mkdir(exist_ok=True)
(qa/'freeze-lock-check.json').write_text(json.dumps({'schemaVersion':1,'id':'T22-FREEZE-CHECK','revision':1,'rulesetId':'GO-CLUB-AREA-1','freezeId':freeze['freezeId'],'recordsChecked':len(records),'uniquePaths':len(set(r['path'] for r in records)),'identicalArchivesFreeze':True,'failures':[],'records':records},indent=2))
lessons=json.loads((ROOT/'source/lessons.json').read_text());keys={d['key'].split('-SUCCESS')[0].split('-CUT')[0] for l in lessons['lessons'] for s in l['slides'] for d in s['diagrams'] if not d['key'].startswith('T22-EMPTY')}
keys.update(['CAP-002','CON-002','LIFE-003','LIFE-005','END-001'])
files=[]
for key in sorted(keys):
 if key.startswith('RULE-DEMO'):f=BASE/'materials/rule-cards/data'/f'{key}.json'
 elif key.startswith('END-'):f=BASE/'content/endgames'/f'{key}.json'
 else:f=BASE/'content/puzzles'/f'{key}.json'
 assert f.is_file(),f
 dest=ROOT/'assets/frozen'/f.relative_to(BASE);dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(f,dest)
 obj=json.loads(f.read_text());assert obj['id']==key and obj['revision']==1 and obj['rulesetId']=='GO-CLUB-AREA-1'
 files.append({'id':key,'revision':obj['revision'],'originalPath':str(f.relative_to(BASE)),'localPath':str(dest.relative_to(ROOT)),'sha256':hashlib.sha256(f.read_bytes()).hexdigest()})
for f in ['handoff/CONTENT_FREEZE.json','handoff/FREEZE_B.md','handoff/T00.md','handoff/T11.md','handoff/T15.md','handoff/T20.md','docs/RULES.md','docs/TERMINOLOGY.md','docs/CURRICULUM.md','schemas/content.schema.json','dist-engine/go-club-rules.mjs']:
 dest=ROOT/'assets/frozen'/f;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(BASE/f,dest)
(ROOT/'assets/source-index.json').write_text(json.dumps({'schemaVersion':1,'id':'T22-FROZEN-SOURCE-INDEX','revision':1,'rulesetId':'GO-CLUB-AREA-1','freezeId':freeze['freezeId'],'files':files},ensure_ascii=False,indent=2))
print(json.dumps({'freezeRecords':len(records),'sourceFiles':len(files),'status':'passed'}))
