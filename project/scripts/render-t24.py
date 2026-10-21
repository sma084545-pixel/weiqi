#!/usr/bin/env python3
"""Render every delivered PDF and freshly convert editable Office sources.
Raster-identical pages share a visual review representative; all mappings retained.
QA dependencies: pypdfium2, Pillow, pypdf and canonical render_docx.py.
"""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import pypdfium2 as pdfium
import hashlib,json,os,subprocess,sys,concurrent.futures
R=Path(__file__).resolve().parents[1];Q=R/'docs/t24/checks';D=Q/'rendered';D.mkdir(exist_ok=True)
runtime=Path(os.environ.get('T24_RUNTIME','/Users/maxiao/.cache/codex-runtimes/codex-primary-runtime/dependencies'))
bin=runtime/'bin/override';py=runtime/'python/bin/python3'
config=Q/'fontconfig.xml';config.write_text(f'<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><dir>{R}/materials/micro-lessons/assets/fonts</dir><cachedir>{Q}/font-cache</cachedir></fontconfig>')
env=dict(os.environ);env['FONTCONFIG_FILE']=str(config);env['PATH']=str(bin)+':'+str(runtime/'bin/fallback')+':'+env['PATH']
reuse_office='--reuse-office' in sys.argv
commands=json.loads((Q/'render-report.json').read_text())['commands'] if reuse_office else []
def run(cmd):
    result=subprocess.run(list(map(str,cmd)),env=env,capture_output=True,text=True)
    row=dict(command=list(map(str,cmd)),exitCode=result.returncode,stdout=result.stdout,stderr=result.stderr);commands.append(row)
    assert result.returncode==0,row
    return row
ppts=sorted(list((R/'materials').rglob('*.pptx'))+list((R/'content/print').glob('*.pptx')))
for n,f in enumerate([] if reuse_office else ppts):
    out=D/'pptx'/f.stem;out.mkdir(parents=True,exist_ok=True)
    run([bin/'soffice',f'-env:UserInstallation=file://{D}/lo-{n}','--headless','--convert-to','pdf','--outdir',out,f])
    assert (out/(f.stem+'.pdf')).exists(),f
    print('PPTX',f.name,flush=True)
docs=sorted((R/'materials/facilitator-kit/output').glob('*.docx'))
renderer=Path(os.environ.get('T24_DOCX_RENDERER','/Users/maxiao/.codex/plugins/cache/openai-primary-runtime/documents/26.1007.11041/skills/documents/render_docx.py'))
def office(f):
    out=D/'docx'/f.stem;out.mkdir(parents=True,exist_ok=True)
    run([py,renderer,f,'--output_dir',out,'--emit_pdf','--dpi','120'])
    return f.name
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    for name in pool.map(office,[] if reuse_office else docs):print('DOCX',name,flush=True)
pdfs=sorted(list((R/'materials').rglob('*.pdf'))+list((R/'content/print').glob('*.pdf')))+sorted(D.rglob('*.pdf'))
pages=[];unique={}
for n,f in enumerate(pdfs):
    pdf=pdfium.PdfDocument(str(f));label=str(f.relative_to(R));source_sha=hashlib.sha256(f.read_bytes()).hexdigest();dest=D/'pdf'/f'file-{n:03}';dest.mkdir(parents=True,exist_ok=True)
    for i in range(len(pdf)):
        p=pdf[i];bitmap=p.render(scale=120/72);im=bitmap.to_pil().convert('RGB')
        digest=hashlib.sha256(str(im.size).encode()+im.tobytes()).hexdigest()
        if digest not in unique:
            path=dest/f'page-{i+1:03}.jpg';im.save(path,quality=88)
            unique[digest]=dict(source=label,page=i+1,image=str(path.relative_to(R)),rasterSha256=digest)
        representative=unique[digest]
        pages.append(dict(source=label,sourceSha256=source_sha,page=i+1,width=im.width,height=im.height,rasterSha256=digest,reviewRepresentative=representative['image']))
        p.close();bitmap.close()
    pdf.close()
    print('PDF',n+1,len(pdfs),label,flush=True)
font=ImageFont.load_default(size=16)
sheets=[];u=list(unique.values())
for start in range(0,len(u),4):
    group=u[start:start+4];sheet=Image.new('RGB',(1720,2500),'#d7d9d8');draw=ImageDraw.Draw(sheet)
    for j,item in enumerate(group):
        im=Image.open(R/item['image']);im.thumbnail((830,1190));x=10+(j%2)*860+(830-im.width)//2;y=45+(j//2)*1250
        sheet.paste(im,(x,y));draw.text((10+(j%2)*860,10+(j//2)*1250),f"{start+j+1:03} | {Path(item['source']).name} | p{item['page']}",font=font,fill='black')
    name=f'sheet-{start//4+1:03}.jpg';sheet.save(D/name,quality=90);sheets.append(dict(image=str((D/name).relative_to(R)),pages=group))
result=dict(schemaVersion=1,id='T24-ALL-PAGE-RENDERS',revision=1,rulesetId='GO-CLUB-AREA-1',status='rendered-awaiting-visual-review',dpi=120,commands=commands,pdfCount=len(pdfs),renderedPages=len(pages),uniqueRasterPages=len(u),sheets=sheets,pages=pages,humanTeachingReviewed=None)
(Q/'render-report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:result[k] for k in ['pdfCount','renderedPages','uniqueRasterPages']}),flush=True)
