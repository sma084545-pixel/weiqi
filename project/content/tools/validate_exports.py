#!/usr/bin/env python3
"""Compare exported diagram coordinates and notes with released JSON."""
import json,math,zipfile,xml.etree.ElementTree as ET
from pathlib import Path
import pdfplumber
from pypdf import PdfReader
ROOT=Path(__file__).resolve().parents[1]
docs=json.loads((ROOT/'t09/bundle.json').read_text())['items']
ns={'s':'http://www.w3.org/2000/svg','p':'http://schemas.openxmlformats.org/presentationml/2006/main','a':'http://schemas.openxmlformats.org/drawingml/2006/main'}
checks=0
def ck(v,message):
 global checks;checks+=1
 if not v:raise AssertionError(message)
def cp(d):return d.get('initialPosition',d.get('position'))
for d in docs:
 e=ET.parse(ROOT/'artwork'/f"{d['id']}.svg").getroot();p=cp(d)
 ck(e.find('s:metadata',ns) is not None,d['id']+' SVG metadata')
 observed=sorted((int(c.get('data-row')),int(c.get('data-col')),c.get('data-color')) for c in e.findall('s:circle',ns))
 expected=sorted((s['row'],s['col'],s['color']) for s in p['stones'])
 ck(observed==expected,d['id']+' SVG stones')
 for circle in e.findall('s:circle',ns):
  r=int(circle.get('data-row'));c=int(circle.get('data-col'));step=470/(p['size']-1)
  ck(abs(float(circle.get('cx'))-(65+c*step))<.0001 and abs(float(circle.get('cy'))-(100+r*step))<.0001,d['id']+' SVG point mapping')
 ck('row=0' in ''.join(e.itertext()),d['id']+' direction')
for filename,kind,total in [('T09_答案册.pdf','answer',36),('T09_挑战卡_A4.pdf','cards',18)]:
 with pdfplumber.open(ROOT/'print'/filename) as pdf:
  ck(len(pdf.pages)==total,filename+' page count')
  for i,page in enumerate(pdf.pages):
   ck(abs(page.width-595.2756)<.1 and abs(page.height-841.8898)<.1,'A4 actual size')
   group=[docs[i]] if kind=='answer' else docs[2*i:2*i+2]
   txt=page.extract_text()
   for d in group:ck(d['id'] in txt,d['id']+' page mapping');ck('r1' in txt,d['id']+' revision')
   for ch in page.chars:ck(ch['x0']>=15 and ch['x1']<=page.width-15 and ch['top']>=10 and ch['bottom']<=page.height-10,'PDF visible char bounds')
   expected=[]
   for half,d in enumerate(group):
    p=cp(d)
    left,bottom,width=(28,506,240) if kind=='answer' else (27,808-half*410-320,218)
    step=(width-46)/(p['size']-1);ox=left+23;oy=bottom+width-23
    expected += [(round(ox+s['col']*step,2),round(oy-s['row']*step,2),s['color']) for s in p['stones']]
   actual=[(round((c['x0']+c['x1'])/2,2),round((c['y0']+c['y1'])/2,2),'W' if c['non_stroking_color']==(1,1,1) else 'B') for c in page.curves if c['fill']]
   ck(sorted(actual)==sorted(expected),filename+f' page {i+1} ALL stone centers/colors')

ppt=ROOT/'print/T09_教学演示_r1.pptx'
with zipfile.ZipFile(ppt) as z:
 slides=[name for name in z.namelist() if name.startswith('ppt/slides/slide') and name.endswith('.xml')]
 ck(len(slides)==36,'36 PPT slides')
 for i,d in enumerate(docs,1):
  e=ET.fromstring(z.read(f'ppt/slides/slide{i}.xml'));notes=ET.fromstring(z.read(f'ppt/notesSlides/notesSlide{i}.xml'));t=''.join(notes.itertext())
  for phrase in [d['id'],'revision=1','三层提示','答案与解释','成功标准','同伴讨论','来源','完整坐标']:ck(phrase in t,d['id']+' notes '+phrase)
  stones=[]
  for shape in e.findall('.//p:sp',ns):
   name=shape.find('p:nvSpPr/p:cNvPr',ns).get('name','')
   if name.startswith('stone-'):
    _,c,r,col=name.split('-');stones.append((int(r),int(col),c));off=shape.find('p:spPr/a:xfrm/a:off',ns);ext=shape.find('p:spPr/a:xfrm/a:ext',ns)
    x=(int(off.get('x'))+int(ext.get('cx'))/2)/9525;y=(int(off.get('y'))+int(ext.get('cy'))/2)/9525
    step=390/(cp(d)['size']-1)
    ck(abs(x-(91+int(col)*step))<.01 and abs(y-(210+int(r)*step))<.01,d['id']+' PPT diagram geometry')
  ck(sorted(stones)==sorted((s['row'],s['col'],s['color']) for s in cp(d)['stones']),d['id']+' PPT editable stone set')
  if d['category']=='DISC' if 'category' in d else False:ck('开放量规' in t,d['id']+' discussion rubric in notes')
report=dict(schemaVersion=1,id='T09-EXPORT-CHECK',revision=1,rulesetId='GO-CLUB-AREA-1',kind='ExportVerification',passed=True,checks=checks,svg=36,pdfPages=54,pptSlides=36,notes=36,scope='All exported stone positions/colors, SVG direction, PDF sizes/text bounds, PPT editable stone objects and required notes. Visual review recorded separately.')
(ROOT/'validation/export-check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(f'PASS: {checks} export checks; 36 SVGs, 54 PDF pages, 36 PPT slides and notes.')
