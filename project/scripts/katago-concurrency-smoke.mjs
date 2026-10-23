// Real engine bounded-queue probe. Four requests once; no keepalive or continuous traffic.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.KATAGO_TEST_ORIGIN??'http://127.0.0.1:4207';
const origin=process.env.KATAGO_TEST_PAGE_ORIGIN??'http://127.0.0.1:4210';
const request=id=>({schemaVersion:1,positionId:`queue-${id}`,reviewIndex:1,game:{setup:{schemaVersion:1,id:'DEV-REAL-QUEUE',revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'Position',size:19,stones:[],toPlay:'B',historyPolicy:'fresh-setup',history:null},komi:0,events:[{type:'place',color:'B',at:{row:0,col:0}},{type:'resign',color:'W'}]}});
const start=Date.now(),samples=[];
const jobs=Array.from({length:4},(_,index)=>fetch(base+'/api/analyze',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(request(index))}).then(async response=>({index,httpStatus:response.status,wallMs:Date.now()-start,body:await response.json()})));
const timer=setInterval(()=>{void fetch(base+'/healthz').then(r=>r.json()).then(h=>samples.push({atMs:Date.now()-start,active:h.active,queued:h.queued}));},50);
const results=await Promise.all(jobs);clearInterval(timer);
assert.equal(results.filter(r=>r.httpStatus===200).length,3);assert.equal(results.filter(r=>r.body.error?.code==='BUSY').length,1);assert.ok(samples.every(s=>s.active<=1&&s.queued<=2));
const output=process.env.KATAGO_TEST_REPORT??'docs/katago/checks/native-concurrency.json';await mkdir(output.slice(0,output.lastIndexOf('/')),{recursive:true});await writeFile(output,JSON.stringify({testKind:'real-engine-small-concurrency',location:process.env.KATAGO_TEST_LOCATION??'native-local',at:new Date().toISOString(),status:'passed',results,samples},null,2)+'\n');console.log(JSON.stringify({status:'passed',output,results:results.map(({index,httpStatus,wallMs})=>({index,httpStatus,wallMs}))}));
