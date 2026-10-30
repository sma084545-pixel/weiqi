import {describe,it,expect,afterEach} from 'vitest';
import {fileURLToPath} from 'node:url';
import {KataGoEngine} from '../../server/analysis/engine';
import {createAnalysisServer} from '../../server/analysis/http';
import {prepareAiMove,selectAiMove} from '../../server/analysis/ai';
import {prepareAnalysis} from '../../server/analysis/position';
import type {ReviewAnalysisResponse} from '../../src/core/analysis/contract';

const body=(difficulty='standard',size=5):any=>({schemaVersion:1,positionId:'ai-contract',aiColor:'B',difficulty,game:{setup:{schemaVersion:1,id:'DEV-AI-API',revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'Position',size,stones:[],toPlay:'B',historyPolicy:'fresh-setup',history:null},komi:0,events:[]}});
describe('AI endpoint validates history and limits without changing ordinary review',()=>{
  it.each([['relaxed',8],['standard',24],['challenge',64]] as const)('%s uses server fixed %s budget', (difficulty,budget)=>{const {prepared}=prepareAiMove(body(difficulty));expect(prepared.query.maxVisits).toBe(budget);expect(prepared.query.includeOwnership).toBe(false);expect(prepared.state.phase).toBe('playing');expect(prepareAiMove(body(difficulty),4).prepared.query.maxVisits).toBe(4);});
  it.each([5,9,13,19])('%s board actual coordinates, komi and initial placement',size=>{
    const b=body('standard',size);b.game.setup.toPlay='W';b.aiColor='W';b.game.setup.stones=[{row:0,col:0,color:'B'}];b.game.komi=6.5;
    const p=prepareAiMove(b).prepared;expect(p.query.initialStones).toEqual([['B',`A${size}`]]);expect(p.query.initialPlayer).toBe('W');expect(p.query.moves).toEqual([]);expect(p.query.komi).toBe(6.5);
  });
  it('preserves real passes and current path; never appends a fake resignation',()=>{const b=body();b.aiColor='W';b.game.events=[{type:'pass',color:'B'}];expect(prepareAiMove(b).prepared.query.moves).toEqual([['B','pass']]);expect(b.game.events).toHaveLength(1);expect(()=>prepareAnalysis({...b,reviewIndex:1})).toThrow();});
  it.each(['level','override','wrong-turn','suicide','finished','occupied','bad-size'])('rejects %s',kind=>{
    const b=body();if(kind==='level')b.difficulty='1dan';if(kind==='override')b.maxVisits=1e9;if(kind==='wrong-turn')b.aiColor='W';if(kind==='bad-size')b.game.setup.size=7;
    if(kind==='finished')b.game.events=[{type:'resign',color:'B'}];
    if(kind==='occupied')b.game.events=[{type:'place',color:'B',at:{row:0,col:0}},{type:'place',color:'W',at:{row:0,col:0}}];
    if(kind==='suicide'){b.game.setup.stones=[{row:0,col:1,color:'W'},{row:1,col:0,color:'W'}];b.game.events=[{type:'place',color:'B',at:{row:0,col:0}}];}
    expect(()=>prepareAiMove(b)).toThrow();
  });
  it('does not expose review values and relaxed variation stays among close engine candidates for either colour',()=>{
    const b=body('relaxed'),candidate=(col:number,score:number,visits=16)=>({order:col,move:{type:'place' as const,at:{row:2,col}},blackWinrate:.6,blackScoreLead:score,visits,pv:[]});
    const analysis:ReviewAnalysisResponse={schemaVersion:1,requestId:'server-id',positionId:b.positionId,perspective:'B',toPlay:'B',blackWinrate:.6,blackScoreLead:5,visits:8,elapsedMs:2,engine:{name:'KataGo',version:'1.18.1',model:'development-fixture',backend:'Eigen CPU',maxVisits:8},candidates:[candidate(1,5),candidate(2,4),candidate(3,-20)]};
    const chosen=selectAiMove(analysis,b,()=>.99);expect(chosen.move).toEqual({type:'place',at:{row:2,col:2}});expect('blackWinrate' in chosen).toBe(false);expect('candidates' in chosen).toBe(false);
    b.aiColor='W';const white={...analysis,toPlay:'W' as const,candidates:[candidate(1,-5),candidate(2,-4),candidate(3,20)]};expect(selectAiMove(white,b,()=>.99).move).toEqual({type:'place',at:{row:2,col:2}});
    expect(selectAiMove({...analysis,candidates:[{...candidate(1,0),move:{type:'pass'}}]},body('relaxed'),()=>.99).move.type).toBe('pass');
  });
});

const engines:KataGoEngine[]=[];
afterEach(async()=>{await Promise.all(engines.splice(0).map(e=>e.stop()));});
describe('AI HTTP transport with explicit development engine fixture',()=>{
  it('real HTTP route, exact-origin CORS, separate review gate, budgets, limits and ready capabilities',async()=>{
    const e=new KataGoEngine({executable:process.execPath,args:[fileURLToPath(new URL('../analysis/process-fixture.mjs',import.meta.url))],version:'1.18.1',model:'test-model',maxVisits:64,maxQueue:2,timeoutMs:2000,startupTimeoutMs:2000});engines.push(e);e.start();
    for(let i=0;i<100&&!e.health().ready;i++)await new Promise(r=>setTimeout(r,10));expect(e.health().ready).toBe(true);
    const server=createAnalysisServer(e,'https://sma084545-pixel.github.io',{aiRatePerMinute:3,globalPerMinute:8});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const addr=server.address() as {port:number},url=`http://127.0.0.1:${addr.port}`;
    try{
      const pre=await fetch(url+'/api/ai-move',{method:'OPTIONS',headers:{Origin:'https://sma084545-pixel.github.io','Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type'}});expect(pre.status).toBe(204);expect(pre.headers.get('Access-Control-Allow-Origin')).toBe('https://sma084545-pixel.github.io');
      expect((await (await fetch(url+'/healthz')).json()).features).toContain('ai-move');
      const post=(d:unknown,path='/api/ai-move')=>fetch(url+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});
      expect((await post({...body(),game:{...body().game,events:[]},reviewIndex:0,aiColor:undefined,difficulty:undefined},'/api/analyze')).status).toBe(409);
      for(const difficulty of ['relaxed','standard','challenge']){const res=await post(body(difficulty)),data=await res.json();expect(res.status).toBe(200);expect(data.engine.name).toBe('KataGo');expect(data.engine.maxVisits).toBe(({relaxed:8,standard:24,challenge:64} as any)[difficulty]);expect('candidates' in data).toBe(false);expect('blackScoreLead' in data).toBe(false);}
      expect((await post(body())).status).toBe(429);
      const forbidden=await fetch(url+'/api/ai-move',{method:'POST',headers:{Origin:'https://other.github.io','Content-Type':'application/json'},body:JSON.stringify(body())});expect(forbidden.status).toBe(403);
    }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
  });
});
