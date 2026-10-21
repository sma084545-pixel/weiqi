from pathlib import Path
import subprocess,os,json,io
from PIL import Image
from pypdf import PdfReader,PdfWriter
ROOT=Path(__file__).resolve().parents[1];bin=Path(os.environ['CODEX_PRIMARY_RUNTIME'])/'dependencies/bin/override';results=[]
files=sorted((ROOT/'output').glob('T22_*_r1.pdf'))
assert len(files)==7,(len(files),files)
for f in files:
 r=PdfReader(f);w=PdfWriter();w.clone_document_from_reader(r);w.add_metadata({'/schemaVersion':'1','/id':f.stem,'/revision':'1','/rulesetId':'GO-CLUB-AREA-1','/freezeId':'GO-CLUB-FREEZE-B-20260919-01','/baseVersion':'0.15.1'})
 with f.open('wb') as fp:w.write(fp)
 dest=ROOT/'qa/pdf-render'/f.stem;dest.mkdir(parents=True,exist_ok=True)
 for i in range(1,len(r.pages)+1):
  data=subprocess.run([str(bin/'pdftoppm'),'-f',str(i),'-l',str(i),'-singlefile','-png','-r','96',str(f)],check=True,capture_output=True).stdout
  Image.open(io.BytesIO(data)).load()
  label=f'page-{i:02}.png' if len(r.pages)>9 else f'page-{i}.png'
  (dest/label).write_bytes(data)
 expected=25 if 'All' in f.name else 5
 assert len(r.pages)==expected
 results.append({'file':str(f.relative_to(ROOT)),'pages':len(r.pages),'rendered':len(list(dest.glob('*.png'))),'pageSizePoints':[float(r.pages[0].mediabox.width),float(r.pages[0].mediabox.height)],'status':'passed'})
(ROOT/'qa/pdf-checks.json').write_text(json.dumps({'schemaVersion':1,'id':'T22-PDF-CHECKS','revision':1,'rulesetId':'GO-CLUB-AREA-1','results':results},indent=2))
print(json.dumps(results))
