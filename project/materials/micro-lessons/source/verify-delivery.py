from pathlib import Path
from lxml import etree as E
from PIL import Image,ImageChops
import numpy as np
import json,zipfile,re,hashlib
R=Path(__file__).resolve().parents[1];NS={'p':'http://schemas.openxmlformats.org/presentationml/2006/main','a':'http://schemas.openxmlformats.org/drawingml/2006/main'}
index=json.loads((R/'assets/source-index.json').read_text())
for ref in index['files']:
 f=R/ref['localPath'];assert hashlib.sha256(f.read_bytes()).hexdigest()==ref['sha256']
 d=json.loads(f.read_text());assert d['id']==ref['id'] and d['revision']==ref['revision'] and d['rulesetId']=='GO-CLUB-AREA-1'
assert hashlib.sha256((R/'assets/frozen/dist-engine/go-club-rules.mjs').read_bytes()).hexdigest()=='028ff1a53af96bc8aa44b2b603ba80ada31b8517c89aeff11088db6683e108b7'
spec=json.loads((R/'source/lessons.json').read_text());slides=[s for l in spec['lessons'] for s in l['slides']];manifest=json.loads((R/'source/rendered-board-manifest.json').read_text())['boards'];results=[]
assert len(spec['lessons'])==5 and all(len(l['slides'])==5 for l in spec['lessons']) and len(slides)==25
notes=[];textseq=[]
def spmap(z,i):
 d=E.fromstring(z.read(f'ppt/slides/slide{i}.xml'));return {s.find('./p:nvSpPr/p:cNvPr',NS).get('name'):s for s in d.findall('.//p:sp',NS)}
def pos(s):
 x=s.find('./p:spPr/a:xfrm',NS);a=x.find('a:off',NS);b=x.find('a:ext',NS);return [float(a.get('x'))/9525,float(a.get('y'))/9525,float(b.get('cx'))/9525,float(b.get('cy'))/9525]
def tx(s):return ''.join(s.xpath('.//a:t/text()',namespaces=NS))
for kind in range(6):
 name='T22_All_25_r1' if not kind else f'T22_MicroLesson_0{kind}_r1'
 z=zipfile.ZipFile(R/'output'/f'{name}.pptx');count=25 if not kind else 5
 actual=len([n for n in z.namelist() if re.fullmatch(r'ppt/slides/slide\d+.xml',n)]);assert count==actual
 assert not any(n.startswith('ppt/media/') for n in z.namelist()),'Core slide image found'
 for i in range(1,count+1):
  g=i if not kind else (kind-1)*5+i;sm=spmap(z,i);sp=slides[g-1]
  ns=E.fromstring(z.read(f'ppt/notesSlides/notesSlide{i}.xml'));n='\n'.join(ns.xpath('.//a:t/text()',namespaces=NS));assert sp['id'] in n
  for field in ['中文短讲稿','关键英文术语','向成员提问','预期回答或误解','怎样回应','转入下一步','schemaVersion','revision','rulesetId']:assert field in n
  seq={k:tx(v) for k,v in sm.items() if v.find('p:txBody',NS) is not None}
  if not kind:notes.append(n);textseq.append(seq)
  else:assert n==notes[g-1],(kind,i,'notes mismatch');assert seq==textseq[g-1],(kind,i,'text mismatch')
  for name2,s in sm.items():
   if name2=='title' or name2.startswith('body-') or name2 in ['comparison-body','process-note'] or name2.startswith('process-'):
    sizes=[float(v)/100 for v in s.xpath('.//a:rPr/@sz',namespaces=NS)];assert sizes and min(sizes)>=24,(g,name2,sizes)
  for b in (b for b in manifest if b['globalSlide']==g):
   prefix=b['name'];actualstones={k for k in sm if k.startswith(prefix+'-stone-')};expected={f'{prefix}-stone-{q["color"]}-r{q["row"]}c{q["col"]}' for q in b['stones']};assert expected==actualstones
   for q in b['stones']:
    k=f'{prefix}-stone-{q["color"]}-r{q["row"]}c{q["col"]}';x,y,w,h=pos(sm[k]);assert abs(x+w/2-(b['x']+q['col']*b['spacing']))<.02 and abs(y+h/2-(b['y']+q['row']*b['spacing']))<.02
   assert len([k for k in sm if k.startswith(prefix+'-grid-')])==2*b['size']
   for t in b['targetPoints']:assert f'{prefix}-target-r{t["row"]}c{t["col"]}' in sm
   for t in b['liberties']:assert f'{prefix}-liberty-r{t["row"]}c{t["col"]}' in sm
  results.append({'file':f'output/{name}.pptx','slide':i,'combinedSlide':g,'notes':'passed','nativeBoardCoordinates':'passed','primaryFontAtLeast24pt':'passed','noRasterCore':'passed'})
pdfpairs=[]
for kind in range(1,6):
 for i in range(1,6):
  g=(kind-1)*5+i
  a=Image.open(R/f'qa/pdf-render/T22_All_25_r1/page-{g:02}.png').convert('RGB');b=Image.open(R/f'qa/pdf-render/T22_MicroLesson_0{kind}_r1/page-{i}.png').convert('RGB');assert a.size==b.size
  delta=np.asarray(ImageChops.difference(a,b));changed=int(np.any(delta,axis=2).sum());ratio=changed/(a.width*a.height);mae=float(delta.mean());maximum=int(delta.max())
  # Same native positions/text, with small PDF font-edge antialiasing differences.
  assert ratio<=0.0005 and mae<=0.005 and maximum<=64,(kind,i,changed,mae,maximum)
  pdfpairs.append({'lesson':kind,'slide':i,'combinedSlide':g,'identical':changed==0,'changedPixels':changed,'fraction':ratio,'meanAbsoluteDelta':mae,'maxDelta':maximum,'status':'passed'})
for f in (R/'qa/pdf-render').rglob('*.png'):Image.open(f).load()
(R/'qa/delivery-checks.json').write_text(json.dumps({'schemaVersion':1,'id':'T22-DELIVERY-CHECKS','revision':1,'rulesetId':'GO-CLUB-AREA-1','status':'passed','slidesValidated':50,'combinedNotes':25,'diagramsPerUniqueDeck':len(manifest),'individualPdfPageComparisons':pdfpairs,'pdfImagesDecoded':55,'results':results},indent=2));print(json.dumps({'status':'passed','slides':50,'notes':50,'uniqueBoards':len(manifest),'pdfPairs':25,'pixelIdentical':sum(p['identical'] for p in pdfpairs),'allRenderedPages':55}))
