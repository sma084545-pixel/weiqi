// Real KataGo HTTP opponent checks. All move legality is checked by the shared rules engine.
// Fixed coordinates and the forced-pass expectation are independently stated, not inferred from AI output.
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {rulesEngine as rules} from '../dist-engine/go-club-rules.mjs';
const base=process.env.KATAGO_TEST_ORIGIN??'http://127.0.0.1:4207';
const origin=process.env.KATAGO_TEST_PAGE_ORIGIN??'https://sma084545-pixel.github.io';
const output=process.env.AI_TEST_REPORT??'docs/ai-play/checks/real-http.json';
const checks=[],started=Date.now();let health;
for(let i=0;i<90;i++){
  try{const r=await fetch(base+'/readyz');health=await r.json();if(r.ok&&health.ready)break;}catch{}
  await new Promise(resolve=>setTimeout(resolve,1000));
}
assert.equal(health?.ready,true,'real engine not ready');assert.ok(health.features?.includes('ai-move'),'backend needs AI endpoint deployment');const readyWaitMs=Date.now()-started;
const position=(size,stones=[],toPlay='B')=>({schemaVersion:1,id:`DEV-AI-REAL-${size}`,revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'Position',size,stones,toPlay,historyPolicy:'fresh-setup',history:null});
const value=r=>{assert.equal(r.ok,true,JSON.stringify(r));return r.value;};
const start=(setup,komi=0)=>value(rules.startGame(setup,{gameId:'DEV-AI-REAL',mode:'full-game',komi}));
const place=(g,row,col)=>value(rules.tryMove(g,{type:'place',color:g.toPlay,at:{row,col}})).nextState;
const pre=await fetch(base+'/api/ai-move',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'}});
assert.equal(pre.status,204);assert.equal(pre.headers.get('Access-Control-Allow-Origin'),origin);
checks.push({name:'exact-origin-ai-preflight',status:'passed'});
for(const local of ['http://127.0.0.1:4190','http://localhost:4190']){
  const res=await fetch(base+'/api/ai-move',{method:'OPTIONS',headers:{Origin:local,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'}});assert.equal(res.status,204);assert.equal(res.headers.get('Access-Control-Allow-Origin'),local);
}
assert.equal((await fetch(base+'/readyz',{headers:{Origin:'http://127.0.0.1:4191'}})).status,403);
checks.push({name:'exact-local-app-origins-only',status:'passed'});
const payload=(game,difficulty,id)=>({schemaVersion:1,positionId:id,aiColor:game.toPlay,difficulty,game:{setup:game.setup,komi:game.komi,events:game.moves}});
const request=async(g,difficulty,name)=>{
  const req=payload(g,difficulty,name),at=Date.now();
  const r=await fetch(base+'/api/ai-move',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(req),signal:AbortSignal.timeout(100_000)}),body=await r.json();
  assert.equal(r.status,200,JSON.stringify(body));assert.equal(body.positionId,req.positionId);assert.equal(body.aiColor,g.toPlay);assert.equal(body.difficulty,difficulty);
  assert.equal(body.engine.name,'KataGo');assert.equal(body.engine.version,'1.18.1');assert.ok(body.visits>0&&body.visits<=body.engine.maxVisits);assert.equal(body.engine.maxVisits,({relaxed:8,standard:24,challenge:64})[difficulty]);
  for(const hidden of ['candidates','blackWinrate','blackScoreLead','pv'])assert.equal(hidden in body,false,'no ongoing-game evaluation leak');
  const trial=body.move.type==='pass'?rules.applyPass(g,g.toPlay):rules.tryMove(g,{type:'place',color:g.toPlay,at:body.move.at});
  const next=value(trial).nextState;assert.equal(next.moves.length,g.moves.length+1);
  checks.push({name,status:'passed',size:g.size,toPlay:g.toPlay,difficulty,httpMs:Date.now()-at,result:body});return {next,body};
};
await request(start(position(5)),'relaxed','relaxed-black-5');
await request(place(start(position(9)),0,0),'standard','standard-white-9');
await request(start(position(13)),'challenge','challenge-black-13');
await request(start(position(19,[{row:3,col:3,color:'B'},{row:15,col:15,color:'B'}],'W'),6.5),'standard','white-handicap-19');
await request(value(rules.applyPass(start(position(5)),'B')).nextState,'standard','real-pass-history');
let branch=place(place(start(position(9)),0,0),8,8);branch=value(rules.undo(branch));branch=place(branch,8,0);
assert.equal(branch.redoStack.length,0);await request(branch,'standard','undo-new-branch-history');
// 23 connected black stones have exactly two independent liberties B4/D4.
// White cannot play at either point: no capture occurs, and the new white stone has no liberty.
const stones=[];for(let row=0;row<5;row++)for(let col=0;col<5;col++)if(!(row===1&&(col===1||col===3)))stones.push({row,col,color:'B'});
const forced=await request(start(position(5,stones,'W')),'challenge','only-legal-move-pass');assert.deepEqual(forced.body.move,{type:'pass'});
const scoring=value(rules.applyPass(forced.next,'B')).nextState;assert.equal(scoring.phase,'scoring');
checks.push({name:'forced-pass-then-human-pass-enters-confirmation',status:'passed',expected:'manual confirmation, not automatic death judgement'});
await Promise.all([request(start(position(9)),'relaxed','parallel-one'),request(start(position(13)),'relaxed','parallel-two')]);
for(const [name,body,status] of [
  ['wrong-turn',{...payload(start(position(5)),'standard','bad-turn'),aiColor:'W'},409],
  ['client-cannot-set-search-budget',{...payload(start(position(5)),'standard','bad-budget'),maxVisits:9999},400],
  ['bounded-body',' '.repeat(256001),413],
]){
  const res=await fetch(base+'/api/ai-move',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:typeof body==='string'?body:JSON.stringify(body)});
  assert.equal(res.status,status,await res.text());checks.push({name,status:'passed',httpStatus:status});
}
const after=await (await fetch(base+'/readyz')).json();assert.equal(after.ready,true);assert.equal(after.active,0);assert.equal(after.queued,0);
const report={schemaVersion:1,id:'AI-REAL-HTTP-CHECK',revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'DeveloperValidationReport',testKind:'real-engine-http-no-mocked-moves',location:process.env.KATAGO_TEST_LOCATION??'native-local',at:new Date().toISOString(),base,readyWaitMs,totalMs:Date.now()-started,healthBefore:health,healthAfter:after,checks,humanReviewed:null};
await mkdir(output.slice(0,output.lastIndexOf('/'))||'.',{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:'passed',checks:checks.length,report:output,health:after}));
