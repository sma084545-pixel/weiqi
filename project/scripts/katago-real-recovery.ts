import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {writeFileSync} from 'node:fs';
import {KataGoEngine} from '../server/analysis/engine';
import {prepareAnalysis} from '../server/analysis/position';
if(!process.env.KATAGO_PATH||!process.env.KATAGO_MODEL)throw Error('Set real KATAGO_PATH and KATAGO_MODEL for this test.');
const events:unknown[]=[],e=new KataGoEngine({executable:process.env.KATAGO_PATH,args:['analysis','-config',resolve('analysis-engine/analysis.cfg'),'-model',process.env.KATAGO_MODEL,'-quit-without-waiting'],version:'1.18.1',model:'g170-b6c96-s175395328-d26788732',maxVisits:64,maxQueue:2,timeoutMs:10_000,startupTimeoutMs:20_000,restartDelayMs:100,log:(name,data)=>events.push({name,...data})});
const wait=async(condition:()=>boolean)=>{for(let i=0;i<200;i++){if(condition())return;await new Promise(r=>setTimeout(r,50));}throw Error('recovery condition timeout');};
const prepared=prepareAnalysis({schemaVersion:1,positionId:'DEV-REAL-RECOVERY',reviewIndex:0,game:{setup:{schemaVersion:1,id:'DEV-RECOVERY',revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'Position',size:19,stones:[],toPlay:'B',historyPolicy:'fresh-setup',history:null},komi:0,events:[{type:'resign',color:'B'}]}});
try{
 e.start();await wait(()=>e.health().ready);
 const a=e.analyze(prepared).catch(x=>x),b=e.analyze(prepared).catch(x=>x);
 const child=(e as unknown as {child:{pid:number;kill:(s:string)=>void}}).child;child.kill('SIGKILL');
 assert.equal((await a).code,'ENGINE_FAILED');assert.equal((await b).code,'ENGINE_FAILED');await wait(()=>e.health().ready);
 const result=await e.analyze(prepared);assert.equal(result.engine.version,'1.18.1');assert.ok(result.visits>0);
 const controller=new AbortController(),cancel=e.analyze(prepared,controller.signal).catch(x=>x);controller.abort();assert.equal((await cancel).code,'CANCELLED');await wait(()=>e.health().active===0);
 const lastPid=(e as unknown as {child:{pid:number}}).child.pid;await e.stop();let alive=true;try{process.kill(lastPid,0);}catch{alive=false;}assert.equal(alive,false);
 writeFileSync('docs/katago/checks/native-real-recovery.json',JSON.stringify({testKind:'real-engine-process-failure-and-recovery',platform:process.platform,status:'passed',events,recoveredAnalysis:result,originalPid:child.pid,lastPid,childStopped:!alive,humanReviewed:null},null,2)+'\n');console.log('PASS: actual KataGo kill, pending failure, restart, real analysis, cancellation and clean stop.');
}finally{await e.stop();}
