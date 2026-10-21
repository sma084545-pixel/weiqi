from pathlib import Path
from pypdf import PdfReader
import json,xml.etree.ElementTree as ET
R=Path(__file__).resolve().parents[1]
m=json.loads((R/'data/card-manifest.json').read_text()); checks=[]
def check(name,condition):
 assert condition,name
 checks.append({'name':name,'status':'PASS'})
for c in m['cards']:
 p=PdfReader(R/c['pdf']);check(c['id']+' single page',len(p.pages)==1)
 page=p.pages[0];w=float(page.mediabox.width)*25.4/72;h=float(page.mediabox.height)*25.4/72
 check(c['id']+' actual dimensions',abs(w-c['widthMm'])<.001 and abs(h-c['heightMm'])<.001)
 text=page.extract_text();check(c['id']+' identity',c['id'] in text and 'GO-CLUB-AREA-1' in text)
 fonts=page['/Resources']['/Font'].get_object();embedded=[]
 for f in fonts.values():
  f=f.get_object()
  if '/FontDescriptor' in f:
   fd=f['/FontDescriptor'].get_object();embedded.append('/FontFile2' in fd or '/FontFile3' in fd)
 check(c['id']+' embedded used CJK font',any(embedded))
 svg=ET.parse(R/c['editable']).getroot();check(c['id']+' editable real-size SVG',svg.attrib['width']==f"{c['widthMm']}mm" and len(list(svg))>10)
for name,count,w,h in [('PRINT-A4-landscape-short-edge',6,297,210),('PRINT-A4-portrait-long-edge-mini',2,210,297)]:
 p=PdfReader(R/'pdf'/f'{name}.pdf');check(name+' page count',len(p.pages)==count)
 for i,page in enumerate(p.pages):
  check(name+f' page {i+1} A4',abs(float(page.mediabox.width)*25.4/72-w)<.001 and abs(float(page.mediabox.height)*25.4/72-h)<.001)
  idx=i if count==6 else i+6
  check(name+f' page {i+1} paired ID count',page.extract_text().count(m['cards'][idx]['id'])==(2 if count==6 else 4))
# SVG imposition: preserve nested vectors and editable text, bottom-origin PDF slots converted to SVG top-origin.
for name,key,w,h in [('PRINT-A4-landscape-short-edge','A4landscape',297,210),('PRINT-A4-portrait-long-edge-mini','A4portraitMini',210,297)]:
 for page in m[key]:
  parts=[]
  for nm,(x,y) in zip(page['cards'],page['slotsMm']):
   c=next(v for v in m['cards'] if v['pdf']==f'pdf/{nm}.pdf')
   elem=ET.parse(R/c['editable']).getroot();elem.set('x',str(x));elem.set('y',str(h-y-c['heightMm']));elem.set('width',str(c['widthMm']));elem.set('height',str(c['heightMm']));parts.append(ET.tostring(elem,encoding='unicode'))
  rid=f'T20-{name}-{page["page"]:02}'
  (R/'source'/f'{name}-{page["page"]:02}.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}mm" height="{h}mm" viewBox="0 0 {w} {h}"><metadata>schemaVersion=1; id={rid}; revision=1; rulesetId=GO-CLUB-AREA-1</metadata>'+''.join(parts)+'</svg>')
check('full diagrams contain only B/W sparse stones and row/col',all(all(s['color'] in ['B','W'] and 0<=s['row']<5 and 0<=s['col']<5 for s in d['position']['stones']) for d in json.loads((R/'data/diagram-index.json').read_text())['demos'].values()))
(R/'validation/print-checks.json').write_text(json.dumps({'schemaVersion':1,'id':'T20-PRINT-CHECKS','revision':1,'rulesetId':'GO-CLUB-AREA-1','checks':checks},ensure_ascii=False,indent=2)+'\n')
print(len(checks),'print/data geometry checks PASS; imposed SVG sources written')
