#!/usr/bin/env python3
"""Run the canonical DOCX renderer with the existing Chinese font directory."""
from pathlib import Path
import subprocess, os, json, concurrent.futures
from pypdf import PdfReader, PdfWriter

K=Path(__file__).resolve().parents[1]
runtime=Path('/Users/maxiao/.cache/codex-runtimes/codex-primary-runtime/dependencies')
py=runtime/'python/bin/python3'
renderer=Path('/Users/maxiao/.codex/plugins/cache/openai-primary-runtime/documents/26.1007.11041/skills/documents/render_docx.py')
cache=K/'validation/font-cache';cache.mkdir(exist_ok=True)
config=K/'validation/fontconfig.xml'
config.write_text(f'<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><dir>{K.parent}/micro-lessons/assets/fonts</dir><cachedir>{cache}</cachedir></fontconfig>')
env=dict(os.environ);env['FONTCONFIG_FILE']=str(config)
models=json.loads((K/'source/page-model.json').read_text())['documents']
def run(d):
    name=d['name'];folder=K/'validation/rendered'/name;folder.mkdir(exist_ok=True)
    for f in folder.glob('page-*.png'):f.unlink()
    command=[str(py),str(renderer),str(K/'output'/(name+'.docx')),'--output_dir',str(folder),'--emit_pdf','--dpi','140']
    log=K/'validation'/(name+'-render.log')
    with log.open('w') as f:r=subprocess.run(command,env=env,stdout=f,stderr=subprocess.STDOUT)
    if r.returncode:return dict(name=name,exitCode=r.returncode,command=command,log=log.name)
    src=folder/(name+'.pdf');reader=PdfReader(src);writer=PdfWriter();writer.append(reader)
    writer.add_metadata({'/Title':d['pages'][0]['title'],'/SchemaVersion':'1','/StableId':d['id'],'/Revision':'1','/RulesetId':'GO-CLUB-AREA-1','/ResultVersion':'0.17.0-plus-t23.1'})
    with (K/'output'/(name+'.pdf')).open('wb') as f:writer.write(f)
    return dict(name=name,exitCode=0,command=command,log=log.name,pages=len(reader.pages),expectedPages=len(d['pages']))
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    rows=list(pool.map(run,models))
(K/'validation/render-commands.json').write_text(json.dumps(dict(schemaVersion=1,id='T23-RENDER-COMMANDS',revision=1,rulesetId='GO-CLUB-AREA-1',commands=rows),indent=2)+'\n')
for row in rows:print(row['name'],row['exitCode'],row.get('pages'),row.get('expectedPages'),flush=True)
assert all(x['exitCode']==0 for x in rows)
