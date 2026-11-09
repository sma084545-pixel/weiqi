"""Verify a display-only increment against the sealed 0.27.1 archive."""
from pathlib import Path
import argparse,hashlib,json,zipfile
p=argparse.ArgumentParser();p.add_argument('--base',required=True);a=p.parse_args()
r=Path(__file__).resolve().parents[1];base=Path(a.base).resolve()
sha=lambda b:hashlib.sha256(b).hexdigest()
assert sha(base.read_bytes())=='1a9d48034e1ebf6000c7e52fb448052155d97a8aae8af0f27def305c43368328'
allowed={'src/components/Board.tsx','src/components/Board.css','src/features/file-exchange/graphics.ts','src/core/version.ts'}
protected=[]
with zipfile.ZipFile(base) as z:
    for name in z.namelist():
        if not name.startswith('go-club/') or name.endswith('/'):continue
        rel=name[8:]
        if rel not in allowed and (rel.startswith(('src/','server/','analysis-engine/','content/','materials/','schemas/','deploy/')) or rel=='pnpm-lock.yaml'):
            path=r/rel;assert path.is_file(),('missing',rel)
            digest=sha(z.read(name));assert sha(path.read_bytes())==digest,('unexpected change',rel)
            protected.append({'path':rel,'sha256':digest})
    old=json.loads(z.read('go-club/package.json'));current=json.loads((r/'package.json').read_text())
    for field in ['dependencies','devDependencies','packageManager']:assert old[field]==current[field],field
report={'schemaVersion':1,'id':'BOARD-STARS-PRESERVATION','revision':1,'rulesetId':'GO-CLUB-AREA-1','status':'passed','baseVersion':'0.27.1-pages.1','resultVersion':current['version']+'-pages.1','verifiedProtectedFiles':len(protected),'sourceChangesAllowed':sorted(allowed),'newSource':'src/core/board-star-points.ts','rulesSchemasContentMaterialsDependenciesServices':'byte-identical','files':protected}
out=r/'docs/star-points/checks/preservation.json';out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='files'},ensure_ascii=False))
