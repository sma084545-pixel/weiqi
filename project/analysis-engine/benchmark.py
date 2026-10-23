#!/usr/bin/env python3
"""Real engine-only smoke/performance evidence. Does not simulate engine results.
Run: python3 analysis-engine/benchmark.py --engine /path/katago --model /path/model.bin.gz --output evidence-directory
Host measurements are not Render measurements; this script records the host explicitly.
"""
import argparse, json, os, pathlib, platform, queue, subprocess, threading, time

RULES = {"ko":"POSITIONAL","scoring":"AREA","suicide":False,"tax":"NONE","hasButton":False,"whiteHandicapBonus":"0","friendlyPassOk":True}

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--engine',required=True);ap.add_argument('--model',required=True);ap.add_argument('--output',required=True);a=ap.parse_args()
    out=pathlib.Path(a.output);out.mkdir(parents=True,exist_ok=True)
    config=pathlib.Path(__file__).resolve().with_name('analysis.cfg')
    started=time.monotonic();p=subprocess.Popen([a.engine,'analysis','-config',str(config),'-model',a.model,'-quit-without-waiting'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,bufsize=1)
    responses=queue.Queue();stderr=[];raw=[];rss=[];stop=threading.Event()
    def read_stdout():
        for line in p.stdout:
            raw.append(line);responses.put(json.loads(line))
    def read_stderr():
        for line in p.stderr:
            stderr.append(line)
    def sample():
        while not stop.wait(.05):
            try:
                x=subprocess.check_output(['ps','-o','rss=','-p',str(p.pid)],text=True).strip()
                if x:rss.append(int(x)*1024)
            except (subprocess.CalledProcessError,ValueError):pass
    for f in [read_stdout,read_stderr,sample]:threading.Thread(target=f,daemon=True).start()
    def send(x):p.stdin.write(json.dumps(x,separators=(',',':'))+'\n');p.stdin.flush()
    def get(ident,limit=60):
        deadline=time.monotonic()+limit
        while True:
            x=responses.get(timeout=max(.001,deadline-time.monotonic()))
            if x.get('id')!=ident:raise AssertionError('Unexpected response: '+json.dumps(x))
            if 'warning' in x:raise AssertionError('Engine changed/warned about input rules: '+json.dumps(x))
            if 'error' in x:raise AssertionError('Engine error: '+json.dumps(x))
            if not x.get('isDuringSearch',False):return x
    report={'evidenceType':'real-native-engine (NOT Docker/Render)','host':{'system':platform.system(),'release':platform.release(),'machine':platform.machine(),'cpuCount':os.cpu_count()},'config':config.read_text(),'engine':os.path.realpath(a.engine),'model':os.path.basename(a.model),'rules':RULES,'queries':[]}
    try:
        send({'id':'version','action':'query_version'});report['version']=get('version');report['startupToVersionSeconds']=round(time.monotonic()-started,4)
        send({'id':'model','action':'query_models'});report['models']=get('model')
        for size in [5,9,13,19]:
            moves= {'5':[['B','C3'],['W','B3'],['B','D3'],['W','C2']], '9':[['B','D4'],['W','F6'],['B','D6'],['W','F4']], '13':[['B','D4'],['W','K10'],['B','D10'],['W','K4']], '19':[['B','D4'],['W','Q16'],['B','D16'],['W','Q4']]}[str(size)]
            for kind in ['empty','history','setup-pass']:
                ident=str(size)+'-'+kind;q={'id':ident,'moves':moves if kind=='history' else ([['W','pass']] if kind=='setup-pass' else []),'initialStones':[['B','A'+str(size)]] if kind=='setup-pass' else [],'initialPlayer':'W' if kind=='setup-pass' else 'B','rules':RULES,'komi':0,'boardXSize':size,'boardYSize':size,'maxVisits':64,'includeOwnership':False}
                t=time.monotonic();send(q);r=get(ident);elapsed=time.monotonic()-t
                assert r.get('moveInfos'),'No real candidates returned'
                assert r['rootInfo']['currentPlayer']== ('B' if kind!='setup-pass' else 'B')
                columns='ABCDEFGHJKLMNOPQRST';occupied={m[1] for m in q['moves']+q['initialStones'] if m[1]!='pass'}
                for m in r['moveInfos']:
                    loc=m['move'];assert loc=='pass' or (loc[0] in columns[:size] and 1<=int(loc[1:])<=size and loc not in occupied),loc
                    assert 0<=m['winrate']<=1
                report['queries'].append({'query':q,'elapsedSeconds':round(elapsed,4),'rootInfo':r['rootInfo'],'bestCandidate':r['moveInfos'][0],'candidateCount':len(r['moveInfos'])})
        # Official asynchronous termination: ack != proof search finished.
        q={'id':'cancel-search','moves':[],'initialPlayer':'B','rules':RULES,'komi':0,'boardXSize':19,'boardYSize':19,'maxVisits':100000000}
        send(q);time.sleep(.05);t=time.monotonic();send({'id':'cancel-action','action':'terminate','terminateId':'cancel-search'})
        finished={}
        while len(finished)<2:
            x=responses.get(timeout=10);finished[x['id']]=x
        assert 'cancel-search' in finished and not finished['cancel-search']['isDuringSearch']
        report['cancellation']={'elapsedUntilOriginalFinalSeconds':round(time.monotonic()-t,4),'responses':finished}
        report['status']='passed'
    finally:
        p.stdin.close()
        try:p.wait(timeout=5)
        except subprocess.TimeoutExpired:p.kill();p.wait(timeout=5)
        stop.set();report['sampledPeakRssBytes']=max(rss) if rss else None;report['rssMethod']='ps RSS sampled every 50ms; may miss very short peaks; engine only, excludes HTTP process'
        report['exitCode']=p.returncode
        (out/'benchmark.json').write_text(json.dumps(report,indent=2)+'\n');(out/'engine-stderr.log').write_text(''.join(stderr));(out/'engine-stdout.jsonl').write_text(''.join(raw))
    print(json.dumps({k:report[k] for k in ['status','startupToVersionSeconds','sampledPeakRssBytes','exitCode']},indent=2))
if __name__=='__main__':main()
