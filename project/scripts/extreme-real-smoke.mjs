// REAL pinned strong-model HTTP checks; no mocked inference or synthetic move selection.
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {rulesEngine as rules} from '../dist-engine/go-club-rules.mjs';
const model='kata1-tf3-b10c512-s3203M-d5937M';
const base=process.env.KATAGO_TEST_ORIGIN??'http://127.0.0.1:4211',origin=process.env.KATAGO_TEST_PAGE_ORIGIN??'https://sma084545-pixel.github.io';
const output=process.env.EXTREME_TEST_REPORT??'docs/extreme-ai/checks/real-http.json';const checks=[],started=Date.now();let health;
for(let i=0;i<180;i++){try{const r=await fetch(base+'/readyz');health=await r.json();if(r.ok&&health.ready)break;}catch{}await new Promise(r=>setTimeout(r,1000));}
assert.equal(health?.ready,true);assert.equal(health.model,model);assert.deepEqual(health.aiDifficulties,['extreme']);const before=health;
const take=r=>{assert.equal(r.ok,true,JSON.stringify(r));return r.value;};
const pos=(size,stones=[],toPlay='B')=>({schemaVersion:1,id:'TEST-EXTREME-'+size,revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'Position',size,stones,toPlay,historyPolicy:'fresh-setup',history:null});
const start=p=>take(rules.startGame(p,{mode:'full-game',gameId:'TEST-EXTREME',komi:0}));
const body=(g,id)=>({schemaVersion:1,positionId:id,aiColor:g.toPlay,difficulty:'extreme',game:{setup:g.setup,komi:g.komi,events:g.moves}});
// Retry only the developer test after a measured 429, at most twice. The product never auto-retries.
async function post(payload,path='/api/ai-move'){
 for(let n=0;n<3;n++){
  const at=Date.now(),r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:typeof payload==='string'?payload:JSON.stringify(payload),signal:AbortSignal.timeout(100_000)});const value=await r.json();
  if(r.status!==429||n===2)return {status:r.status,value,httpMs:Date.now()-at};
  checks.push({name:'observed-bounded-rate-limit',status:'passed',code:value.error?.code,retryAfter:r.headers.get('Retry-After')});await new Promise(r=>setTimeout(r,61_000));
 }
}
for(const o of [origin,'http://127.0.0.1:4190','http://localhost:4190']){const r=await fetch(base+'/api/ai-move',{method:'OPTIONS',headers:{Origin:o,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'}});assert.equal(r.status,204);assert.equal(r.headers.get('Access-Control-Allow-Origin'),o);}
assert.equal((await fetch(base+'/readyz',{headers:{Origin:'https://other.github.io'}})).status,403);checks.push({name:'exact-public-local-cors-and-rejection',status:'passed'});
let forced;
for(const size of [5,9,13,19]){
 const stones=[];if(size===5)for(let row=0;row<5;row++)for(let col=0;col<5;col++)if(!(row===1&&(col===1||col===3)))stones.push({row,col,color:'B'});
 if(size===13)stones.push({row:3,col:3,color:'B'},{row:9,col:9,color:'B'});
 let g=start(pos(size,stones,size===5||size===13?'W':'B'));
 if(size===19){g=take(rules.tryMove(g,{type:'place',color:'B',at:{row:3,col:3}})).nextState;g=take(rules.applyPass(g,'W')).nextState;g=take(rules.undo(g));g=take(rules.tryMove(g,{type:'place',color:'W',at:{row:15,col:15}})).nextState;assert.equal(g.redoStack.length,0);}
 const result=await post(body(g,'extreme-real-'+size));assert.equal(result.status,200,JSON.stringify(result.value));const v=result.value;assert.equal(v.engine.model,model);assert.equal(v.engine.version,'1.18.1');assert.equal(v.engine.maxVisits,64);assert.equal(v.difficulty,'extreme');assert.equal(v.aiColor,g.toPlay);assert.equal(v.positionId,'extreme-real-'+size);assert.ok(v.visits>0&&v.visits<=64);
 for(const hidden of ['candidates','blackWinrate','blackScoreLead','pv'])assert.equal(hidden in v,false);
 const next=take(v.move.type==='pass'?rules.applyPass(g,g.toPlay):rules.tryMove(g,{type:'place',color:g.toPlay,at:v.move.at})).nextState;
 if(size===5){assert.deepEqual(v.move,{type:'pass'});forced=next;}
 checks.push({name:'real-pinned-model-legal-'+size,status:'passed',size,httpMs:result.httpMs,result:v});console.log(JSON.stringify({size,httpMs:result.httpMs,visits:v.visits}));
}
// Independent 5x5 expectation: 23 live black stones plus two surrounded empties = black25, white0.
let end=take(rules.applyPass(forced,'B')).nextState;assert.equal(end.phase,'scoring');end=take(rules.confirmScore(end,{deadStones:[],neutralPoints:[],confirmedBy:['B','W']}));assert.equal(end.result.score.blackTotal,25);assert.equal(end.result.score.whiteTotal,0);
const review=await post({schemaVersion:1,positionId:'extreme-final-review',game:{setup:end.setup,komi:0,events:end.moves},reviewIndex:0},'/api/analyze');assert.equal(review.status,200,JSON.stringify(review.value));assert.equal(review.value.engine.model,model);assert.equal(review.value.perspective,'B');checks.push({name:'manual-confirmation-25-0-and-real-strong-review',status:'passed',httpMs:review.httpMs,result:review.value});
const basic=body(start(pos(9)),'bad');
for(const [name,payload,expected] of [['reject-small-model-difficulty',{...basic,difficulty:'challenge'},409],['reject-client-budget',{...basic,maxVisits:100000},400],['reject-oversize',' '.repeat(256001),413]]){const r=await post(payload);assert.equal(r.status,expected,JSON.stringify(r.value));checks.push({name,status:'passed',httpStatus:r.status,error:r.value.error.code});}
const after=await(await fetch(base+'/readyz')).json();assert.equal(after.active,0);assert.equal(after.queued,0);assert.equal(after.ready,true);
const report={schemaVersion:1,id:'EXTREME-REAL-HTTP',revision:1,rulesetId:'GO-CLUB-AREA-1',status:'passed',location:process.env.KATAGO_TEST_LOCATION??'native-real-Eigen-CPU-not-Render',at:new Date().toISOString(),totalMs:Date.now()-started,healthBefore:before,healthAfter:after,checks,humanReviewed:null};await mkdir(output.slice(0,output.lastIndexOf('/')),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:'passed',checks:checks.length,output}));
