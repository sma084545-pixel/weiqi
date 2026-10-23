// Real HTTP + real engine smoke. No mock model/results; useful in Docker and Render.
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
const base=process.env.KATAGO_TEST_ORIGIN??'http://127.0.0.1:4207';
const pageOrigin=process.env.KATAGO_TEST_PAGE_ORIGIN??'https://sma084545-pixel.github.io';
const start=Date.now();let health;
for(let i=0;i<90;i++){
 try{const r=await fetch(base+'/readyz');health=await r.json();if(r.ok&&health.ready)break;}catch{}
 await new Promise(resolve=>setTimeout(resolve,1000));
}
assert.equal(health?.ready,true,'real KataGo not ready');
const report={testKind:'real-engine-http',location:process.env.KATAGO_TEST_LOCATION??'native-local',at:new Date().toISOString(),base,health,readyWaitMs:Date.now()-start,checks:[]};
const pre=await fetch(base+'/api/analyze',{method:'OPTIONS',headers:{Origin:pageOrigin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'}});
assert.equal(pre.status,204);assert.equal(pre.headers.get('Access-Control-Allow-Origin'),pageOrigin);report.checks.push({name:'exact-origin-preflight',status:'passed'});
const foreign=await fetch(base+'/readyz',{headers:{Origin:'https://not-allowed.github.io'}});assert.equal(foreign.status,403);report.checks.push({name:'foreign-origin-denied',status:'passed'});
for(const size of [5,9,13,19]){
 const setup={schemaVersion:1,id:`DEV-REAL-${size}`,revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'Position',size,stones:[],toPlay:'B',historyPolicy:'fresh-setup',history:null};
 let events=[{type:'place',color:'B',at:{row:0,col:0}},{type:'resign',color:'W'}],reviewIndex=1;
 if(size===9){setup.stones=[{row:0,col:0,color:'B'},{row:8,col:8,color:'B'}];setup.toPlay='W';events=[{type:'pass',color:'W'},{type:'resign',color:'B'}];}
 if(size===13){events=[{type:'place',color:'B',at:{row:0,col:0}},{type:'pass',color:'W'},{type:'pass',color:'B'},{type:'resume',requestedBy:'B'},{type:'place',color:'W',at:{row:12,col:12}},{type:'resign',color:'B'}];reviewIndex=5;}
 const payload={schemaVersion:1,positionId:`real-${size}`,reviewIndex,game:{setup,komi:0,events}};
 const t=Date.now(),response=await fetch(base+'/api/analyze',{method:'POST',headers:{'Content-Type':'application/json',Origin:pageOrigin},body:JSON.stringify(payload)}),body=await response.json();
 assert.equal(response.status,200,JSON.stringify(body));assert.equal(body.positionId,payload.positionId);assert.equal(body.engine.name,'KataGo');assert.equal(body.engine.version,'1.18.1');assert.equal(body.perspective,'B');assert.ok(body.candidates.length>0);assert.ok(body.visits>0&&body.visits<=64);assert.ok(body.blackWinrate>=0&&body.blackWinrate<=1);assert.ok(Number.isFinite(body.blackScoreLead));
 for(const item of body.candidates)if(item.move.type==='place'){const {row,col}=item.move.at;assert.ok(row>=0&&row<size&&col>=0&&col<size);if(size!==9)assert.notDeepEqual({row,col},{row:0,col:0});}
 report.checks.push({name:`${size}-board-history${size===9?'-setup-pass':size===13?'-dispute-resume':''}`,status:'passed',httpMs:Date.now()-t,result:body});
}
const unfinished={schemaVersion:1,positionId:'unfinished',reviewIndex:0,game:{setup:{schemaVersion:1,id:'DEV-UNFINISHED',revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'Position',size:5,stones:[],toPlay:'B',historyPolicy:'fresh-setup',history:null},komi:0,events:[]}};
const rejected=await fetch(base+'/api/analyze',{method:'POST',headers:{'Content-Type':'application/json',Origin:pageOrigin},body:JSON.stringify(unfinished)});assert.equal(rejected.status,409);report.checks.push({name:'unfinished-game-denied',status:'passed'});
const output=process.env.KATAGO_TEST_REPORT??'docs/katago/checks/real-http-smoke.json';await mkdir(output.slice(0,output.lastIndexOf('/'))||'.',{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:'passed',report:output,checks:report.checks.length,location:report.location}));
