#!/usr/bin/env python3
"""Verify actual BLACK/WHITE output sign/complement on both players to move.
One deterministic raw NN evaluation per query; no simulated probabilities.
"""
import argparse,json,pathlib,subprocess,tempfile
RULES={"ko":"POSITIONAL","scoring":"AREA","suicide":False,"tax":"NONE","hasButton":False,"whiteHandicapBonus":"0","friendlyPassOk":True}
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--engine',required=True);ap.add_argument('--model',required=True);ap.add_argument('--output',required=True);a=ap.parse_args()
 out=pathlib.Path(a.output);out.mkdir(parents=True,exist_ok=True)
 base=pathlib.Path(__file__).with_name('analysis.cfg').read_text().replace('nnRandomize = true','nnRandomize = false')
 queries=[{'id':'B-to-play','initialStones':[['B','D4'],['W','F6']],'initialPlayer':'B','moves':[],'rules':RULES,'komi':6.5,'boardXSize':9,'boardYSize':9,'maxVisits':1},{'id':'W-to-play','initialStones':[['B','D4']],'initialPlayer':'W','moves':[],'rules':RULES,'komi':0,'boardXSize':9,'boardYSize':9,'maxVisits':1}]
 results={}
 with tempfile.TemporaryDirectory() as td:
  for perspective in ['BLACK','WHITE']:
   cfg=pathlib.Path(td)/'analysis.cfg';cfg.write_text(base.replace('reportAnalysisWinratesAs = BLACK','reportAnalysisWinratesAs = '+perspective))
   # EOF intentionally drains these queued analyses; do NOT quit-without-waiting here.
   p=subprocess.run([a.engine,'analysis','-config',str(cfg),'-model',a.model],input=''.join(json.dumps(q)+'\n' for q in queries),capture_output=True,text=True,timeout=60)
   assert p.returncode==0,p.stderr
   rows=[json.loads(s) for s in p.stdout.splitlines()];assert len(rows)==len(queries),rows
   assert all('error' not in r and 'warning' not in r for r in rows)
   results[perspective]={r['id']:r for r in rows}
   (out/(perspective.lower()+'-stdout.jsonl')).write_text(p.stdout);(out/(perspective.lower()+'-stderr.log')).write_text(p.stderr)
 for q in queries:
  b=results['BLACK'][q['id']]['rootInfo'];w=results['WHITE'][q['id']]['rootInfo'];assert b['currentPlayer']==w['currentPlayer']==q['initialPlayer']
  assert abs(b['winrate']+w['winrate']-1)<1e-6,(b,w)
  assert abs(b['scoreLead']+w['scoreLead'])<1e-5,(b,w)
 (out/'perspective-check.json').write_text(json.dumps({'status':'passed','queries':queries,'results':results,'assertions':['BLACK and WHITE winrates sum to1 (tolerance1e-6)','BLACK and WHITE scoreLead signs invert (tolerance1e-5)','currentPlayer remains requested B/W rather than changing perspective']},indent=2)+'\n')
 print('Actual engine perspective check passed for both B/W to play')
if __name__=='__main__':main()
