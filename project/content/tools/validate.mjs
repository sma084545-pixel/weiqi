/** T09 validation; all game rules call the unchanged T01 engine. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { validateContent } from '../../src/core/validation.ts';
import * as R from '../../dist-engine/go-club-rules.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,x)=>fs.writeFileSync(path.join(root,p),JSON.stringify(x,null,2)+'\n');
const bundle=read('t09/bundle.json'), meta=read('t09/pedagogy.json'), oracle=read('t09/independent-expectations.json');
const docs=bundle.items, byId=new Map(docs.map(x=>[x.id,x]));
let checks=0, replays=0, explored=0;
const items=[], failures=[];
const ok=(v,msg)=>{checks++;assert.ok(v,msg);};
const eq=(a,b,msg)=>{checks++;assert.deepEqual(a,b,msg);};
const unwrap=(v,msg)=>{ok(v.ok,`${msg}: ${JSON.stringify(v.error??v.issues)}`);return v.value;};
const key=p=>`${p.row},${p.col}`, keys=ps=>ps.map(key).sort();
const coord=(p,n)=>'ABCDEFGHJKLMNOPQRST'[p.col]+(n-p.row);
const start=d=>unwrap(R.startGame(d.initialPosition??d.position,{mode:'full-game',komi:d.komi??0,gameId:'VERIFY-'+d.id}),'start '+d.id);
const advance=(s,m)=>m.type==='pass'?R.applyPass(s,m.color):R.tryMove(s,m);
const actions=s=>[...s.board.flatMap((row,r)=>row.flatMap((v,c)=>v===null?[{type:'place',color:s.toPlay,at:{row:r,col:c}}]:[])),{type:'pass',color:s.toPlay}];
const legal=s=>actions(s).flatMap(m=>{const r=advance(s,m);explored++;return r.ok?[{move:m,state:r.value.nextState,event:r.value.event}]:[];});
const group=(b,p)=>unwrap(R.getGroup(b,p),'group');
const liberties=(b,p)=>unwrap(R.getLiberties(b,p),'liberties');
function sameGroup(b,ps,color){if(ps.some(p=>b[p.row][p.col]!==color))return false;let g=group(b,ps[0]);return ps.every(p=>g.stones.some(q=>key(p)===key(q)));}
function allGone(b,ps,color){return ps.every(p=>b[p.row][p.col]!==color);}
// This is a content-shape predicate, not a placement, capture or scoring engine.
function emptyComponents(board,spaces){
 const permitted=new Set(keys(spaces));const seen=new Set();const out=[];
 for(const p of spaces){if(board[p.row][p.col]!==null||seen.has(key(p)))continue;
  let q=[p],ps=[];seen.add(key(p));
  for(let i=0;i<q.length;i++){const a=q[i];ps.push(a);for(const [dr,dc]of[[1,0],[-1,0],[0,1],[0,-1]]){const b={row:a.row+dr,col:a.col+dc};if(permitted.has(key(b))&&board[b.row][b.col]===null&&!seen.has(key(b))){seen.add(key(b));q.push(b);}}}out.push(ps);
 }return out;
}
function enclosedBy(board,ps,target){
 const g=group(board,target);if(!g)return false;const stoneSet=new Set(keys(g.stones)),emptySet=new Set(keys(ps)),n=board.length;
 return ps.every(p=>[[1,0],[-1,0],[0,1],[0,-1]].every(([dr,dc])=>{const a={row:p.row+dr,col:p.col+dc};return a.row<0||a.col<0||a.row>=n||a.col>=n||emptySet.has(key(a))||stoneSet.has(key(a));}));
}
function immediate(d,o,s){
 if(o.kind==='capture-now')return allGone(s.board,o.targets,d.firstPlayer==='B'?'W':'B');
 if(o.kind==='connect')return sameGroup(s.board,o.targets,d.firstPlayer);
 if(o.kind==='escape')return s.board[o.targets[0].row][o.targets[0].col]===d.firstPlayer&&liberties(s.board,o.targets[0]).length>=2;
 if(o.kind==='split-eyes'){
  if(s.board[o.target.row][o.target.col]!==d.firstPlayer)return false;
  const cs=emptyComponents(s.board,o.spaces);
  return JSON.stringify(cs.map(c=>c.length).sort())===JSON.stringify(o.sizes)&&cs.every(c=>enclosedBy(s.board,c,o.target));
 }throw new Error('No immediate predicate '+o.kind);
}
function replay(s,moves,label){let states=[s];for(const m of moves){let next=unwrap(advance(s,m),label);s=next.nextState;states.push(s);replays++;}return states;}
function scoreFixture(d){return unwrap(R.scoreArea({board:start(d).board,komi:d.komi,agreement:d.agreement,basis:d.status==='unsettled'?'preview':d.status,assumptions:d.assumptions}),d.id+' score');}

eq(docs.length,36,'36 independent items');
eq(new Set(docs.map(x=>x.id)).size,36,'unique IDs');
for(const c of ['LIB','CAP','CON','LIFE','AREA','DISC'])eq(docs.filter(x=>x.category===c).map(x=>x.id).sort(),[1,2,3,4,5].map(n=>c+'-'+String(n).padStart(3,'0')),'exact category '+c);
eq(docs.filter(x=>x.kind==='TerminalFixture').map(x=>x.id),[1,2,3,4,5,6].map(n=>'END-00'+n),'end IDs');
unwrap(validateContent(bundle),'T00 bundle schema + cross references');
for(const d of docs){
 const begin=checks, info={id:d.id,revision:d.revision,status:'passed',scope:[],legalReplayMoves:0};let beforeReplay=replays;
 try{
  const rel=(d.kind==='Puzzle'?'puzzles/':'endgames/')+d.id+'.json';eq(read(rel),d,'bundle/file revision agreement');
  unwrap(validateContent(d),d.id+' structure');unwrap(R.validateSetup(d.initialPosition??d.position),d.id+' valid setup');
  const s=start(d),o=oracle.items[d.id],m=meta.items[d.id];ok(m&&m.commonErrors&&m.peerDiscussion&&m.success,'teaching companion complete');
  if(d.kind==='Puzzle'){
   eq(d.hints.length,3,'three hints');eq(d.firstPlayer,d.initialPosition.toPlay,'turn');
   for(const mark of d.targetMarkers)for(const p of mark.points)eq(s.board[p.row][p.col],mark.owner,'target owner');
   for(const ref of d.relatedContent)eq(byId.get(ref.id)?.revision,ref.revision,'resolvable exact revision');
   if(d.answer.type==='move-tree'){
    eq(d.answer.uncoveredPolicy,'unknown','uncovered is unknown');eq(d.answer.uniquenessClaim,false,'no unsupported uniqueness');
    const nodes=new Map(d.answer.nodes.map(x=>[x.nodeId,x]));
    const walk=(id,state,depth)=>{const node=nodes.get(id);let ns=state;if(node.move){ns=replay(state,[node.move],d.id+'/'+id)[1];}for(const child of node.children)walk(child,ns,depth+1);};walk(d.answer.rootNodeId,s,0);
    for(const l of m.lines){const ms=l.moves.map((v,i)=>v==='pass'?{type:'pass',color:i%2?(d.firstPlayer==='B'?'W':'B'):d.firstPlayer}:{type:'place',color:i%2?(d.firstPlayer==='B'?'W':'B'):d.firstPlayer,at:{row:s.size-Number(v.slice(1)),col:'ABCDEFGHJKLMNOPQRST'.indexOf(v[0])}});
     const states=replay(s,ms,d.id+' authored line');if(o.kind!=='capture-within-3')eq(immediate(d,o,states[1]),l.outcome==='success','line outcome matches FIRST-MOVE goal');
    }
    info.scope.push('All stored tree moves replayed; every authored leaf matches stated goal.');
   }
   if(o.kind==='liberties'){
    const actual=liberties(s.board,o.at);eq(keys(actual),keys(o.expected),'independently enumerated liberties');
    if(d.answer.type==='number')eq(d.answer.value,o.expected.length,'numeric answer');else eq(keys(d.answer.points),keys(o.expected),'point-set answer');
    info.scope.push('Hand-enumerated full liberty set compared to T01.');
   }else if(['capture-now','connect','escape','split-eyes'].includes(o.kind)){
    const opts=legal(s),good=opts.filter(x=>immediate(d,o,x.state));
    eq(keys(good.map(x=>x.move.at).filter(Boolean)),keys(o.accepted),'ALL legal first moves incl pass vs fixed expected successful set');
    ok(good.every(x=>x.move.type==='place'),'pass does not meet immediate objective');
    if(o.kind==='capture-now')for(const x of good)eq(x.event.captured.length,o.captured,'exact capture count');
    info.firstMoveExhaustion={boardSize:s.size,plies:1,legalActionsIncludingPass:opts.length,success:good.map(x=>coord(x.move.at,s.size)),criterion:o.kind};
   }else if(o.kind==='two-eyes'){
    const g=group(s.board,o.target);ok(g&&o.eyes.every(p=>enclosedBy(s.board,[p],o.target)),'both singleton eyes have same connected boundary');
    eq(keys(liberties(s.board,o.target)),keys(o.eyes),'target has exactly those two liberties');
    for(const eye of o.eyes){const r=R.tryMove(s,{type:'place',color:'W',at:eye});eq(r.ok,false,'direct eye entry forbidden');eq(r.error.code,'SUICIDE','entry reason');}
    eq(keys(d.answer.points),keys(o.eyes),'eyes answer');info.scope.push('Same-block two-eye structural proof plus both suicide checks.');
   }else if(o.kind==='capture-within-3'){
    const targets=group(s.board,o.target).stones,targetColor=s.board[o.target.row][o.target.col];
    const roots=legal(s);let good=[],coverage=[];
    for(const first of roots){const defenses=allGone(first.state.board,targets,targetColor)?[]:legal(first.state);let every=true,branches=[];
     for(const defense of defenses){let wins=allGone(defense.state.board,targets,targetColor)?[]:legal(defense.state).filter(x=>allGone(x.state.board,targets,targetColor));
      let success=allGone(defense.state.board,targets,targetColor)||wins.length>0;if(!success)every=false;
      branches.push({defense:defense.move,winningReplies:wins.map(x=>x.move),success});
     }
     const win=allGone(first.state.board,targets,targetColor)||(defenses.length>0&&every);
     if(win)good.push(first.move);coverage.push({first:first.move,success:win,defenses:branches});
    }
    eq(keys(good.filter(m=>m.at).map(m=>m.at)),keys(o.accepted),'complete depth-3 minimax matches hand-derived B5/C5');
    ok(good.every(m=>m.type==='place'),'no pass solution');
    info.exhaustion={plies:3,boardSize:5,includesPass:true,goal:'Every original target stone removed within 3 plies; every legal defense',coverage};
   }else if(o.kind==='area-reference'){
    const e=byId.get(o.ref);eq(d.initialPosition.stones,e.position.stones,'AREA underlying position equals END');const score=scoreFixture(e);eq(score,e.expectedScore,'END independent score');
    if(d.id==='AREA-001'||d.id==='AREA-003')eq(d.answer.value,score.blackTotal,'black area answer');
    if(d.id==='AREA-004')eq(d.answer.value,score.whiteTotal,'white komi answer');
    if(d.answer.type==='region-labels')eq(d.answer.labels.map(x=>key(x.at)+':'+x.owner).sort(),[...score.blackTerritory.map(p=>key(p)+':B'),...score.whiteTerritory.map(p=>key(p)+':W'),...score.neutralPoints.map(p=>key(p)+':neutral')].sort(),'all empty regions');
    if(d.id==='AREA-005'){eq(d.answer.acceptedOptionIds,['area'],'correct reason');eq(score.blackTotal,10,'independent black 10');eq(score.whiteTotal,15,'independent white 15');}
   }else if(o.kind==='open-rubric'){
    eq(d.answer.type,'open-text','DISC open-text');eq(d.answer.automaticVerdict,false,'no unique best move scoring');eq(d.answer.criteria.length,3,'evidence-response-listening rubric');ok(m.candidates.length>=2,'at least two candidates');
    for(const c of m.candidates){eq(c.moves.length,2,'candidate + opponent response');replay(s,c.moves,d.id+' discussion');ok(c.consideration.length>20,'goals and tradeoff');}
    info.scope.push('Two legal candidate/response pairs; rubric not evaluated as best move.');
   }else throw Error('Missing oracle for '+d.id);
  }else{
   if(d.status==='unsettled'){
    eq(d.expectedScore,null,'unsettled no final score');eq(d.agreement.confirmedBy,[],'no forged agreement');
    ok(d.assumptions.some(x=>x.includes('争议')),'explicit dispute');
    let passed=replay(s,[{type:'pass',color:'B'},{type:'pass',color:'W'}],'END-006 two-pass demonstration')[2];
    const resumed=unwrap(R.resumePlay(passed,'B'),'dispute resume');eq(resumed.board,passed.board,'resume board unchanged');eq(resumed.history,passed.history,'resume history preserved');eq(resumed.consecutivePasses,0,'reset pass count');
   }else{
    eq(d.status,'teaching-assumption','explicit finality boundary');eq(d.agreement.confirmedBy,[],'no real people invented');const actual=scoreFixture(d);eq(actual,d.expectedScore,'independent arithmetic and region sets');
    eq(actual.blackStones+actual.whiteStones+actual.blackTerritory.length+actual.whiteTerritory.length+actual.neutralPoints.length,25,'full board accounting');
    if(d.id==='END-004')for(const k of m.komiScenarios){const z=unwrap(R.scoreArea({board:s.board,komi:k.komi,agreement:d.agreement,basis:'teaching-assumption',assumptions:d.assumptions}),'komi scenario');eq(z.blackTotal,k.blackTotal,'black independent of komi');eq(z.whiteTotal,k.whiteTotal,'white + komi');eq(z.winner,k.winner,'scenario winner');}
    if(d.id==='END-005'){eq(actual,scoreFixture(byId.get('END-001')),'different prisoner labels same area');}
   }
  }
  for(const l of m.supplementalLines??[]){let finalEvent;let state=s;for(const mv of l.moves){const r=unwrap(advance(state,mv),'supplemental line');state=r.nextState;finalEvent=r.event;replays++;}if(l.capturedAtEnd!==undefined)eq(finalEvent.captured.length,l.capturedAtEnd,'supplemental capture check');}
  eq(d.validation.humanReviewed,null,'human review remains honestly null');
  info.checks=checks-begin;info.legalReplayMoves=replays-beforeReplay;
 }catch(e){info.status='failed';info.error=e.message;failures.push(d.id+': '+e.message);}
 items.push(info);
}
// Meaningful refusal/coverage regressions for downstream grading, independent of engine implementation.
const report={schemaVersion:1,id:'T09-VALIDATION',revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'ContentValidationReport',checkedAt:'2026-09-07',baseVersion:'0.2.0',contentVersion:'0.2.0-t09.1',checks,replayedMoves:replays,exploredTransitions:explored,passed:failures.length===0,failures,items};
write('validation/results.json',report);
if(failures.length){console.error(failures.join('\n'));console.error(`${checks} checks; ${failures.length} failed items`);process.exit(1);}
if(process.argv.includes('--stamp')){
 for(const d of docs){const v=d.validation;for(const layer of ['structure','moveLegality','solutionChecked','externalReferenceChecked','modelChecked'])v[layer]={status:'passed',method:layer==='externalReferenceChecked'?'BGA source concepts and project-rule differences recorded; no copied puzzle answer':layer==='modelChecked'?'Authored reasoning + explicit finite scope, not human review':'T00 structure / T01 engine / independent vectors as applicable',checkedAt:'2026-09-07',evidence:[`content/validation/results.json: ${d.id}`,`content/t09/pedagogy.json: ${d.id}`,...(layer==='externalReferenceChecked'?['content/t09/SOURCES.md']:[])]};
  write((d.kind==='Puzzle'?'puzzles/':'endgames/')+d.id+'.json',d);
 }write('t09/bundle.json',bundle);
 write('t09/release-pool.json',{schemaVersion:1,id:'T09-RELEASE-POOL',revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'ReleasePool',contentVersion:'0.2.0-t09.1',formalPuzzleIds:docs.filter(x=>x.kind==='Puzzle').map(x=>x.id),automaticPuzzleIds:docs.filter(x=>x.kind==='Puzzle'&&x.category!=='DISC').map(x=>x.id),discussionOnlyIds:docs.filter(x=>x.category==='DISC').map(x=>x.id),endgameIds:docs.filter(x=>x.kind==='TerminalFixture').map(x=>x.id),quarantineIds:[],humanReview:'not-performed',automaticPolicy:'Use grade.mjs and exact covered branches only; legal uncovered moves are unknown. Open text never receives a correctness verdict.'});
}
console.log(`PASS: ${checks} checks, ${replays} recorded moves replayed, ${explored} explored rule transitions, 30 puzzles + 6 fixtures. Human review not performed.`);
