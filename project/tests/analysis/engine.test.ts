import {afterEach,describe,expect,it} from 'vitest';
import {fileURLToPath} from 'node:url';
import {KataGoEngine} from '../../server/analysis/engine';
import {createAnalysisServer,MAX_BODY_BYTES} from '../../server/analysis/http';
import {prepareAnalysis} from '../../server/analysis/position';
const pending:KataGoEngine[]=[];
const wait=async(fn:()=>boolean)=>{for(let i=0;i<150;i++){if(fn())return;await new Promise(r=>setTimeout(r,10));}throw Error('condition timeout');};
function body(){return {schemaVersion:1,positionId:'test-process',reviewIndex:0,game:{setup:{schemaVersion:1,id:'DEV-TRANSPORT',revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'Position',size:5,stones:[],toPlay:'B',historyPolicy:'fresh-setup',history:null},komi:0,events:[{type:'resign',color:'B'}]}};}
async function start(extra:Record<string,unknown>={}){const e=new KataGoEngine({executable:process.execPath,args:[fileURLToPath(new URL('./process-fixture.mjs',import.meta.url))],version:'1.18.1',model:'test-model',maxVisits:64,maxQueue:2,timeoutMs:1000,startupTimeoutMs:1000,restartDelayMs:10,cancelGraceMs:120,...extra});pending.push(e);e.start();await wait(()=>e.health().ready);return e;}
afterEach(async()=>{await Promise.all(pending.splice(0).map(e=>e.stop()));});
describe('bounded process transport (explicit development test double)',()=>{
 it('matches unique ids, serializes at most1 active plus2 waiting, rejects overflow',async()=>{
   const e=await start(),p=prepareAnalysis(body());const jobs=[e.analyze(p),e.analyze(p),e.analyze(p)];await expect(e.analyze(p)).rejects.toMatchObject({code:'BUSY'});expect(e.health()).toMatchObject({active:1,queued:2});
   const results=await Promise.all(jobs);expect(new Set(results.map(x=>x.requestId)).size).toBe(3);expect(e.health()).toMatchObject({active:0,queued:0});
 });
 it('cancellation ack does not release slot before original final; queued cancel removes only that job',async()=>{
   const e=await start(),p=prepareAnalysis(body()),a=new AbortController(),b=new AbortController();const one=e.analyze(p,a.signal),two=e.analyze(p,b.signal);const oneError=one.catch(x=>x),twoError=two.catch(x=>x);b.abort();expect((await twoError).code).toBe('CANCELLED');expect(e.health().queued).toBe(0);
   a.abort();expect((await oneError).code).toBe('CANCELLED');expect(e.health().active).toBe(1);await wait(()=>e.health().active===0);expect(e.health().ready).toBe(true);
 });
 it('engine exit fails all pending then recovers without orphan process',async()=>{
   const e=await start(),d=body();d.game.komi=99;const failed=e.analyze(prepareAnalysis(d)).catch(x=>x);const queued=e.analyze(prepareAnalysis(body())).catch(x=>x);expect((await failed).code).toBe('ENGINE_FAILED');expect((await queued).code).toBe('ENGINE_FAILED');await wait(()=>e.health().ready);expect((await e.analyze(prepareAnalysis(body()))).perspective).toBe('B');
 });
 it('hard timeout terminates compute; unresponsive cancel restarts process',async()=>{
   const fixture=fileURLToPath(new URL('./process-fixture.mjs',import.meta.url));const e=await start({args:[fixture,'ignore-cancel'],timeoutMs:20,cancelGraceMs:20});await expect(e.analyze(prepareAnalysis(body()))).rejects.toMatchObject({code:'TIMEOUT'});await wait(()=>e.health().status==='restarting');await wait(()=>e.health().ready);expect(e.health().active).toBe(0);
 });
 it('HTTP CORS, strict body/params, caps, not-finished, per-client rate and isolated health',async()=>{
   const e=await start(),s=createAnalysisServer(e,'https://sma084545-pixel.github.io',{ratePerMinute:4,globalPerMinute:10});await new Promise<void>(r=>s.listen(0,'127.0.0.1',r));const addr=s.address() as any,base=`http://127.0.0.1:${addr.port}`;
   try{
    const pre=await fetch(base+'/api/analyze',{method:'OPTIONS',headers:{Origin:'https://sma084545-pixel.github.io','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'}});expect(pre.status).toBe(204);expect(pre.headers.get('Access-Control-Allow-Origin')).toBe('https://sma084545-pixel.github.io');
    const foreign=await fetch(base+'/readyz',{headers:{Origin:'https://other.github.io'}});expect(foreign.status).toBe(403);
    const post=(d:unknown)=>fetch(base+'/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});
    expect((await post({...body(),maxVisits:1e9})).status).toBe(400);
    expect((await post({...body(),positionId:'x'.repeat(MAX_BODY_BYTES)})).status).toBe(413);
    const unfinished=body();unfinished.game.events=[];expect((await post(unfinished)).status).toBe(409);
    const ok=await post(body());expect(ok.status).toBe(200);expect((await ok.json()).engine.name).toBe('KataGo');
    const limited=await post(body());expect(limited.status).toBe(429);expect(limited.headers.get('Retry-After')).toBe('60');expect((await fetch(base+'/healthz')).status).toBe(200);
   }finally{s.closeAllConnections();await new Promise<void>(r=>s.close(()=>r()));}
 });
});
