from pathlib import Path
from pypdf import PdfReader
from lxml import etree as E
import json,zipfile,hashlib,copy,re
K=Path(__file__).resolve().parents[1];R=K.parents[1];D=json.loads((K/'source/kit.json').read_text());M=json.loads((K/'source/page-model.json').read_text());F=json.loads((K/'source/empty-forms.json').read_text());REF=json.loads((K/'source/resource-map.json').read_text());B=json.loads((R/'content/t09/bundle.json').read_text());C=json.loads((R/'docs/merge-c/RESOURCE_CATALOG.json').read_text());P={p['id']:p for p in [x for x in B['items'] if x['kind']=='Puzzle']};checks=[]
def check(label,value):
 checks.append({'label':label,'status':'passed' if value else 'failed'});assert value,label
expected=[[3,8,23,8,3],[3,6,26,7,3],[3,6,12,17,4,3],[3,6,14,15,4,3],[3,3,17,16,3,3],[3,4,13,18,4,3]]
def errors(d):
 out=[]
 for i,s in enumerate(d['sessions']):
  if sum(x['minutes'] for x in s['timeline'])!=45:out.append('TIME')
  for id in s['puzzles']:
   if id not in P:out.append('ID')
  for l in s['lessons']:
   if any(p not in range(1,6) for p in l['pages']):out.append('SLIDE_PAGE')
 return out
check('six sessions / independent 45 minute expectations',len(D['sessions'])==6 and not errors(D))
for i,s in enumerate(D['sessions']):
 check(s['id']+' timing vector', [x['minutes'] for x in s['timeline']]==expected[i]);check(s['id']+' three paths',len(s['paths'])==3)
 for f in ['goal','layout','opening','noscreen','ending','safeguard']:check(s['id']+' '+f,bool(s[f]))
 for id in s['puzzles']:check(id+' revision1',P[id]['revision']==1)
for code in ['TIME','ID','SLIDE_PAGE']:
 x=copy.deepcopy(D)
 if code=='TIME':x['sessions'][0]['timeline'][0]['minutes']=2
 if code=='ID':x['sessions'][0]['puzzles'][0]='MISSING-999'
 if code=='SLIDE_PAGE':x['sessions'][0]['lessons'][0]['pages']=[6]
 check('negative independent expectation '+code,code in errors(x))
for d in M['documents']:
 f=K/'output'/ (d['name']+'.pdf');pdf=PdfReader(f)
 check(d['name']+' pages',len(pdf.pages)==len(d['pages']));check(d['name']+' Chinese visible text',len(pdf.pages[0].extract_text())>100)
 check(d['name']+' identity',pdf.metadata.get('/StableId')==d['id'] and pdf.metadata.get('/RulesetId')==D['rulesetId'])
 for p in pdf.pages:check(d['name']+' A4 geometry',abs(float(p.mediabox.width)-595.276)<1 and abs(float(p.mediabox.height)-841.89)<1)
 with zipfile.ZipFile(K/'output'/(d['name']+'.docx')) as z:
  props=E.fromstring(z.read('docProps/custom.xml'));vals={x.get('name'):x[0].text for x in props};check(d['name']+' editable identity',vals['id']==d['id'] and vals['schemaVersion']=='1')
  styles=E.fromstring(z.read('word/styles.xml'));check(d['name']+' clean titles',not styles.xpath('.//w:pBdr',namespaces={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}))
 check(d['name']+' all pages rendered',len(list((K/'validation/rendered'/d['name']).glob('page-*.png')))==len(pdf.pages))
for f in F['forms']:check(f['id']+' empty and unsubmitted',f['values']=={} and f['submitted'] is False)
for r in REF['paperResources']:
 file=R/r['path'];check(r['code']+' file',file.exists());mx=max(map(int,re.findall(r'\d+',r['pages'])));check(r['code']+' actual pages',len(PdfReader(file).pages)>=mx)
for r in REF['slides']:
 with zipfile.ZipFile(R/r['pptx']) as z:check(r['pptx']+' 5 editable slides',len([n for n in z.namelist() if re.fullmatch(r'ppt/slides/slide\d+.xml',n)])==5)
reg=(R/'src/features/entry/registry.ts').read_text() if (R/'src/features/entry/registry.ts').exists() else '\n'.join(p.read_text() for p in (R/'src').rglob('*registry*.ts'))
for r in REF['modules']:check(r['id']+' installed',r['id'] in reg and r['route'].lstrip('#') in reg)
svg=E.fromstring((K/'output/T23_board_5x5_A4.svg').read_bytes());lines=svg.xpath('.//*[local-name()="g"]/*[local-name()="line"]');check('5 horizontal 5 vertical lines',len(lines)==10 and sum(x.get('x1')==x.get('x2') for x in lines)==5)
check('formal pool preserved 30',len(P)==30);check('six terminal fixtures',len([x for x in B['items'] if x['kind']=='TerminalFixture'])==6)
base=json.loads((K/'source/input-manifest.json').read_text())
with zipfile.ZipFile(base['baseArchive']) as z:
 for n in z.namelist():
  if n.endswith('/'):continue
  rel=n.removeprefix('go-club/');check('base intact '+rel,(R/rel).is_file() and hashlib.sha256((R/rel).read_bytes()).digest()==hashlib.sha256(z.read(n)).digest())
report={'schemaVersion':1,'id':'T23-VALIDATION','revision':1,'rulesetId':D['rulesetId'],'taskId':'T23','checks':checks,'passed':len(checks),'failed':0,'humanReviewed':None,'physicalTest':None,'classroomTest':None}
(K/'validation/check-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print('PASS',len(checks),'checks; physical / human / classroom not tested')
