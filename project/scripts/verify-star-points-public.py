"""Compare every public Pages payload with the tested build, using decoded HTTP bodies."""
from pathlib import Path
import argparse,concurrent.futures,hashlib,json,subprocess,tempfile
from datetime import datetime
from zoneinfo import ZoneInfo
p=argparse.ArgumentParser();p.add_argument('--output',default='docs/star-points/checks/public-assets.json');a=p.parse_args()
r=Path(__file__).resolve().parents[1];base='https://sma084545-pixel.github.io/weiqi/';names=sorted(str(x.relative_to(r/'dist')) for x in (r/'dist').rglob('*') if x.is_file())
with tempfile.TemporaryDirectory(prefix='weiqi-public-') as folder:
    def check(name):
        target=Path(folder)/name;target.parent.mkdir(parents=True,exist_ok=True)
        result=subprocess.run(['curl','--compressed','--retry','2','--retry-all-errors','--connect-timeout','15','--max-time','45','-fsSL',base+name,'-o',str(target)],capture_output=True,text=True)
        assert result.returncode==0,(name,result.stderr[-1500:]);data=target.read_bytes();assert data==(r/'dist'/name).read_bytes(),('public payload mismatch',name)
        return {'path':name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:files=list(pool.map(check,names))
version=json.loads((r/'dist/version.json').read_text());report={'schemaVersion':1,'id':'BOARD-STARS-PUBLIC-ASSETS','revision':1,'rulesetId':'GO-CLUB-AREA-1','status':'passed','programVersion':version['programVersion'],'site':base,'checkedAt':datetime.now(ZoneInfo('Asia/Shanghai')).isoformat(),'runtimeCommit':'3c629928af0011df02de6fcebd3c165c768b01fa','files':files,'method':'curl --compressed, bounded retries, then exact bytes and SHA-256','initialFailures':'Initial urllib batches ended with IncompleteRead, no incomplete body was accepted; original-site browser tests passed separately.'}
out=r/a.output;out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'status':'passed','files':len(files),'programVersion':version['programVersion']}))
