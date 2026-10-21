#!/usr/bin/env python3
"""Read-only material audit; reports/renderings go to docs/merge-c/checks."""
from pathlib import Path
import json, hashlib, re, zipfile, xml.etree.ElementTree as ET
import fitz
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/merge-c/checks'
OUT.mkdir(parents=True, exist_ok=True)
def load(p): return json.loads((ROOT/p).read_text())
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
checks=[]
def check(name, condition, detail=''):
    checks.append(dict(check=name,status='passed' if condition else 'failed',detail=detail))
def dump(name,data): (OUT/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')

freeze=load('handoff/CONTENT_FREEZE.json')
formal=freeze['puzzles']
check('30 formal puzzles',len(formal)==30)
for f in formal:
    check('frozen '+f['id'], sha(ROOT/f['path'])==f['sha256'])
    d=load(f['path']);check('identity '+f['id'],d['revision']==f['revision'] and d['rulesetId']=='GO-CLUB-AREA-1' and d['schemaVersion']==1)
    check('T21 snapshot '+f['id'],sha(ROOT/'materials/challenge-cards/frozen-input/puzzles'/Path(f['path']).name)==f['sha256'])
for path in ['bundle.json','pedagogy.json']:
    check('T21 snapshot '+path,sha(ROOT/'materials/challenge-cards/frozen-input'/path)==sha(ROOT/'content/t09'/path))
check('T21 freeze copy',sha(ROOT/'materials/challenge-cards/frozen-input/CONTENT_FREEZE.json')==sha(ROOT/'handoff/CONTENT_FREEZE.json'))
for f in load('materials/micro-lessons/assets/source-index.json')['files']:
    check('T22 source '+f['id'],sha(ROOT/f['originalPath'])==f['sha256']==sha(ROOT/'materials/micro-lessons'/f['localPath']))
    d=load(f['originalPath']);check('T22 revision '+f['id'],d['id']==f['id'] and d['revision']==f['revision'])

for manifest in ['materials/demo-board/artifact-manifest.json','materials/pair-boards/FILE_MANIFEST.json','materials/rule-cards/FILE_MANIFEST.json','materials/challenge-cards/validation/PACKAGE_PAYLOAD_MANIFEST.json','materials/micro-lessons/FILE_MANIFEST.json']:
    data=load(manifest)
    files=data.get('files',data.get('artifacts',[]))
    check('manifest nonempty '+manifest,bool(files))
    for f in files:
        p=ROOT/f['path'];check('manifest '+f['path'],p.is_file() and sha(p)==f['sha256'] and p.stat().st_size==f['bytes'])

dirs=['demo-board','pair-boards','rule-cards','challenge-cards','micro-lessons']
pdfs=[]; pages=[]
for section in dirs:
    for p in sorted((ROOT/'materials'/section).rglob('*.pdf')):
        doc=fitz.open(p); rel=p.relative_to(ROOT).as_posix()
        item=dict(path=rel,pages=len(doc),pageSizesMm=[],links=[])
        for i,page in enumerate(doc):
            item['pageSizesMm'].append([round(page.rect.width*25.4/72,2),round(page.rect.height*25.4/72,2)])
            links=page.get_links();item['links']+=links
            for link in links:
                if link['kind']==fitz.LINK_GOTO:check(f'{rel} internal link {i+1}',0<=link['page']<len(doc))
            pix=page.get_pixmap(matrix=fitz.Matrix(1.35,1.35),alpha=False)
            name=f'{section}-{p.stem}-{i+1:02}.png';dest=OUT/'rendered'/name;dest.parent.mkdir(exist_ok=True)
            pix.save(dest);pages.append(dict(pdf=rel,page=i+1,image='rendered/'+name))
        pdfs.append(item)

cards=load('materials/challenge-cards/CARD_INDEX.json')['items']
for row in cards:
    ref=next(f for f in formal if f['id']==row['id'])
    check('card revision '+row['id'],ref['revision']==row['revision'])
    check('duplex pairing '+row['id'],row['frontPdfPage']==row['backPdfPage'] and row['frontPosition']==row['backPosition'])
    for key,file in [('frontPdfPage','T21_challenge_cards_front_A4.pdf'),('backPdfPage','T21_challenge_cards_back_A4.pdf'),('teacherPage','T21_teacher_answer_book.pdf')]:
        doc=fitz.open(ROOT/'materials/challenge-cards/output'/file)
        check(f'{row["id"]} {key}',1<=row[key]<=len(doc) and row['id'] in doc[row[key]-1].get_text())

ns={'a':'http://schemas.openxmlformats.org/drawingml/2006/main'}
decks=[]
for p in sorted((ROOT/'materials/micro-lessons/output').glob('*.pptx')):
    with zipfile.ZipFile(p) as z:
        slides=sorted(n for n in z.namelist() if re.fullmatch(r'ppt/slides/slide\d+\.xml',n))
        notes=[n for n in z.namelist() if re.fullmatch(r'ppt/notesSlides/notesSlide\d+\.xml',n)]
        expected=25 if 'All_25' in p.name else 5
        check(p.name+' count and notes',len(slides)==len(notes)==expected)
        check(p.name+' native boards',not any(n.startswith('ppt/media/') for n in z.namelist()))
        check(p.name+' ZIP CRC',z.testzip() is None)
        for n in notes:check(p.name+' '+n,len(''.join(ET.fromstring(z.read(n)).itertext()))>100)
        decks.append(dict(path=p.relative_to(ROOT).as_posix(),slides=len(slides),notes=len(notes)))
check('six editable decks',len(decks)==6)

# Page contact sheets supplement individual renders; review is recorded separately.
for section in dirs:
    group=[p for p in pages if p['pdf'].startswith('materials/'+section+'/')]
    for offset in range(0,len(group),12):
        sheet=Image.new('RGB',(1440,4*540),'#ddd');draw=ImageDraw.Draw(sheet)
        for j,pg in enumerate(group[offset:offset+12]):
            im=Image.open(OUT/pg['image']);im.thumbnail((470,510));x=(j%3)*480;y=(j//3)*540
            sheet.paste(im,(x+(480-im.width)//2,y+23));draw.text((x+3,y+4),Path(pg['pdf']).name[:48]+f' p{pg["page"]}',fill='black')
        sheet.save(OUT/f'contact-{section}-{offset//12+1:02}.jpg',quality=88)

dump('material-audit.json',dict(schemaVersion=1,id='MERGE-C-MATERIAL-AUDIT',revision=1,rulesetId='GO-CLUB-AREA-1',checks=checks,pdfs=pdfs,decks=decks,renderedPages=pages))
bad=[x for x in checks if x['status']=='failed']
print(json.dumps(dict(checks=len(checks),failures=bad,pdfs=len(pdfs),pages=len(pages),decks=len(decks)),ensure_ascii=False))
raise SystemExit(bool(bad))
