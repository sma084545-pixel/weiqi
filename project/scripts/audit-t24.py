#!/usr/bin/env python3
"""Read-only cross-media release audit. Requires pypdf and lxml for QA only."""
from pathlib import Path
from collections import Counter
from lxml import etree as E
from pypdf import PdfReader
import hashlib,json,re,zipfile

R=Path(__file__).resolve().parents[1]
OUT=R/'docs/t24/checks';OUT.mkdir(parents=True,exist_ok=True)
RULES='GO-CLUB-AREA-1';FREEZE='GO-CLUB-FREEZE-B-20260919-01'
checks=[]
def load(p):return json.loads((R/p).read_text())
def sha(p):return hashlib.sha256((R/p).read_bytes()).hexdigest()
def check(name,ok,evidence=None):checks.append(dict(name=name,status='passed' if ok else 'failed',evidence=evidence))
def norm(v):return re.sub(r'\s+','',v)
def stones(p):return {(s['row'],s['col'],s['color']) for s in p['stones']}
def svg(p):return E.fromstring((R/p).read_bytes())
ns={'s':'http://www.w3.org/2000/svg','p':'http://schemas.openxmlformats.org/presentationml/2006/main','a':'http://schemas.openxmlformats.org/drawingml/2006/main'}
bundle=load('content/t09/bundle.json');freeze=load('handoff/CONTENT_FREEZE.json')
puzzles={p['id']:p for p in bundle['items'] if p['kind']=='Puzzle'}
ends={p['id']:p for p in bundle['items'] if p['kind']=='TerminalFixture'}
check('30 formal puzzles, six categories five each',len(puzzles)==30 and Counter(p['category'] for p in puzzles.values())==Counter(dict.fromkeys(['LIB','CAP','CON','LIFE','AREA','DISC'],5)))
check('6 terminal fixtures',len(ends)==6)
check('freeze unchanged',freeze['freezeId']==FREEZE)
check('bundle identity',bundle['schemaVersion']==1 and bundle['rulesetId']==RULES)
tasks=[]
for i in range(24):
    p=f'handoff/T{i:02}.md';exists=(R/p).is_file();check(p,exists)
    if exists:
        text=(R/p).read_text();version=re.search(r'resultVersion["`]*\s*[:=]\s*["`]?([^\n"`]+)',text)
        tasks.append(dict(taskId=f'T{i:02}',handoff=p,resultVersion=version[1].strip() if version else 'see handoff',sha256=sha(p)))
for p in ['handoff/MERGE_A.md','handoff/MERGE_C.md','handoff/CONTENT_FREEZE.json']:
    check('prerequisite '+p,(R/p).is_file())
index={x['id']:x for x in load('materials/challenge-cards/CARD_INDEX.json')['items']}
slides=load('materials/micro-lessons/source/lessons.json')['lessons']
check('five micro lessons / 25 unique primary slides',len(slides)==5 and all(len(l['slides'])==5 for l in slides))
diagram=load('materials/micro-lessons/source/diagrams.json')['diagrams']
refs=load('materials/micro-lessons/assets/source-index.json')['files']
for ref in refs:
    check('PPT frozen source '+ref['id'],sha(ref['originalPath'])==ref['sha256']==sha('materials/micro-lessons/'+ref['localPath']))
mapping=[]
front=PdfReader(R/'materials/challenge-cards/output/T21_challenge_cards_front_A4.pdf')
back=PdfReader(R/'materials/challenge-cards/output/T21_challenge_cards_back_A4.pdf')
teacher=PdfReader(R/'materials/challenge-cards/output/T21_teacher_answer_book.pdf')
reader=(R/'content/print/T09_答案册.md').read_text()
for id,p in {**puzzles,**ends}.items():
    path=f'content/{"puzzles" if id in puzzles else "endgames"}/{id}.json';a=f'content/artwork/{id}.svg'
    check(id+' exact source/bundle',load(path)==p)
    check(id+' identity',p['schemaVersion']==1 and p['rulesetId']==RULES and p['revision']==1 and not p['developmentOnly'])
    pos=p.get('initialPosition',p.get('position'));root=svg(a)
    meta=json.loads(root.find('s:metadata',ns).text)
    check(id+' diagram identity',meta['contentRef']==dict(id=id,revision=p['revision']) and meta['rulesetId']==RULES)
    circles=[n for n in root.findall('.//s:circle',ns) if 'data-row' in n.attrib]
    # T09 vectors use data-stone; inspect declared color independently of display fill.
    color=lambda n:n.get('data-color') or n.get('data-stone') or ('B' if n.get('fill') in ['#111','#111111','#151B1D','#172a32'] else 'W')
    got={(int(n.get('data-row')),int(n.get('data-col')),color(n)) for n in circles}
    check(id+' diagram stones',got==stones(pos),dict(source=len(pos['stones']),vector=len(got)))
    check(id+' real N horizontal and N vertical lines',len(root.findall('.//s:line',ns))==2*pos['size'])
    check(id+' reading answer present',id in reader)
    refs_to=[]
    for l in slides:
        for page,s in enumerate(l['slides'],1):
            for d in s.get('diagrams',[]):
                entry=diagram[d['key']]
                if entry['sourceId']==id:refs_to.append(dict(lessonId=l['id'],slide=page,diagramKey=d['key'],nodePath=entry['nodePath']))
    row=dict(id=id,revision=p['revision'],kind=p['kind'],source=path,sourceSha256=sha(path),diagram=a,diagramSha256=sha(a),readingAnswer='content/print/T09_答案册.md',microLessonReferences=refs_to,validation=p['validation'],humanReviewed=p['validation'].get('humanReviewed'))
    if id in puzzles:
        idx=index[id];s=f'materials/challenge-cards/editable/front/{id}-front.svg';b=f'materials/challenge-cards/editable/back/{id}-back.svg'
        check(id+' card revision',idx['revision']==p['revision'])
        check(id+' frozen card source',load(f'materials/challenge-cards/frozen-input/puzzles/{id}.json')==p)
        sr=svg(s);got={(int(n.get('data-row')),int(n.get('data-col')),n.get('data-color')) for n in sr.findall('.//s:circle',ns) if 'data-row' in n.attrib}
        check(id+' editable card coordinates',got==stones(pos))
        sm=json.loads(sr.find('s:metadata',ns).text);check(id+' editable card identity',sm['contentRef']==dict(id=id,revision=p['revision']))
        check(id+' prompt in correct card PDF page',norm(p['prompt']) in norm(front.pages[idx['frontPdfPage']-1].extract_text()))
        check(id+' correct card back',id in back.pages[idx['backPdfPage']-1].extract_text())
        check(id+' teacher answer page',norm(p['prompt']) in norm(teacher.pages[idx['teacherPage']-1].extract_text()))
        check(id+' turn and target match source',p['firstPlayer']==pos['toPlay'] and all(stones(pos) & {(q['row'],q['col'],m['owner'])} for m in p['targetMarkers'] for q in m['points']))
        row.update(cardFront=s,cardBack=b,frontPdfPage=idx['frontPdfPage'],backPdfPage=idx['backPdfPage'],teacherAnswerPage=idx['teacherPage'])
    else:row.update(terminalStatus=p['status'],expectedScore=p['expectedScore'])
    mapping.append(row)
for key,d in diagram.items():
    if d['sourcePath']=='local-original-empty':
        check('explicit original empty teaching board '+key,d['sourceId'].startswith('T22-EMPTY-') and not d['position']['stones'] and d['position']['size'] in [5,9])
        continue
    source={**puzzles,**ends}.get(d['sourceId']) or load('materials/micro-lessons/'+d['sourcePath'])
    check('PPT diagram source identity '+key,d['sourceRevision']==source['revision'])
    if not d['nodePath']:
        check('PPT initial board '+key,d['position']==source.get('initialPosition',source.get('position',source)))
all_ppt=[]
for f in sorted(list((R/'materials').rglob('*.pptx'))+list((R/'content/print').glob('*.pptx'))):
    with zipfile.ZipFile(f) as z:
        names=sorted(n for n in z.namelist() if re.fullmatch(r'ppt/slides/slide\d+.xml',n))
        notes=[n for n in z.namelist() if re.fullmatch(r'ppt/notesSlides/notesSlide\d+.xml',n)]
        all_ppt.append(dict(path=str(f.relative_to(R)),slides=len(names),notes=len(notes),sha256=sha(f.relative_to(R))))
        if 'micro-lessons' in str(f):
            check(f.name+' notes for every slide',len(notes)==len(names))
            check(f.name+' core editable vectors',not any(n.startswith('ppt/media/') for n in z.namelist()))
            for n in names:
                x=E.fromstring(z.read(n));check(f.name+' '+n+' native text',bool(x.findall('.//a:t',ns)))
pdfs=[]
for f in sorted(list((R/'materials').rglob('*.pdf'))+list((R/'content/print').glob('*.pdf'))):
    pdf=PdfReader(f);pdfs.append(dict(path=str(f.relative_to(R)),pages=len(pdf.pages),pageSizesMm=[[round(float(p.mediabox.width)*25.4/72,2),round(float(p.mediabox.height)*25.4/72,2)] for p in pdf.pages],sha256=sha(f.relative_to(R))))
kit=load('materials/facilitator-kit/source/kit.json')
check('six activities sum to45',len(kit['sessions'])==6 and all(sum(q['minutes'] for q in s['timeline'])==45 for s in kit['sessions']))
check('all three participant paths',all(len(s['paths'])==3 for s in kit['sessions']))
check('every session has no-screen route',all(s['noscreen'] for s in kit['sessions']))
check('empty forms are not activity data',all(f['values']=={} and not f['submitted'] for f in load('materials/facilitator-kit/source/empty-forms.json')['forms']))
sourcefiles=list((R/'src').rglob('*.ts'))+list((R/'src').rglob('*.tsx'))+list((R/'public').rglob('*.js'))
secrets=[];network=[];localwrites=[]
for f in sourcefiles:
    text=f.read_text()
    if re.search(r'\b(?:sk-[A-Za-z0-9]{30,}|AKIA[A-Z0-9]{16}|-----BEGIN (?:RSA |EC )?PRIVATE KEY-----)',text):secrets.append(str(f.relative_to(R)))
    for match in re.finditer(r'\b(?:fetch|XMLHttpRequest|sendBeacon)\s*\([^)]*',text):network.append(dict(file=str(f.relative_to(R)),snippet=match[0][:150]))
    if re.search(r'localStorage\.(?:setItem|removeItem)',text):localwrites.append(str(f.relative_to(R)))
check('no recognizable embedded secrets',not secrets,secrets)
check('no remote core fetch targets',not any(re.search(r'https?://',x['snippet']) for x in network),network)
check('localStorage cleanup confined to unified migration adapter',all(p=='src/core/unified-persistence.ts' for p in localwrites),localwrites)
result=dict(schemaVersion=1,id='T24-CROSS-MEDIA-AUDIT',revision=1,rulesetId=RULES,freezeId=FREEZE,status='passed' if all(c['status']=='passed' for c in checks) else 'failed',checks=checks,passed=sum(c['status']=='passed' for c in checks),failed=sum(c['status']=='failed' for c in checks),taskInputs=tasks,formalContents=mapping,pdfInventory=pdfs,pptxInventory=all_ppt,networkReview=network,humanReviewed=None,physicalTests=None)
(OUT/'cross-media-audit.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:result[k] for k in ['status','passed','failed']}));print('PDF',len(pdfs),sum(x['pages'] for x in pdfs),'PPTX',len(all_ppt),sum(x['slides'] for x in all_ppt))
for c in checks:
    if c['status']=='failed':print('FAIL',c['name'],c['evidence'])
raise SystemExit(bool(result['failed']))
