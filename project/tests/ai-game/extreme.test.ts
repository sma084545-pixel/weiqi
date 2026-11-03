// @vitest-environment jsdom
import {describe,it,expect,vi,afterEach} from 'vitest';
import {act,createElement} from 'react';
import {createRoot} from 'react-dom/client';
import {KataGoEngine} from '../../server/analysis/engine';
import {createAnalysisServer} from '../../server/analysis/http';
import {AI_DIFFICULTIES,EXTREME_MODEL,makeAiMoveRequest,type AiMoveResponse} from '../../src/core/analysis/ai-contract';
import {emptyAiMatch,startAiGame,DEFAULT_AI_OPTIONS} from '../../src/features/ai-game/model';
import {aiSessionJson,parseAiSession} from '../../src/features/ai-game/storage';
import {aiServiceOrigin} from '../../src/features/ai-game/config';
import {validateAiMoveResponse} from '../../src/features/ai-game/client';
import {useAiOpponent} from '../../src/features/ai-game/useAiOpponent';
import {useKataGoReview} from '../../src/features/katago-review/useKataGoReview';
import {rulesEngine} from '../../src/core/rules';

const game=()=>{const r=startAiGame(emptyAiMatch());if(!r.ok)throw Error();return r.value.game!;};
const reply=(id:string,difficulty:'standard'|'extreme'='extreme'):AiMoveResponse=>({schemaVersion:1,positionId:id,requestId:'explicit-test-double',aiColor:'B',difficulty,move:{type:'place',at:{row:0,col:0}},engine:{name:'KataGo',version:'1.18.1',model:difficulty==='extreme'?EXTREME_MODEL.name:'test-base-model',backend:'Eigen CPU',maxVisits:64},visits:16,elapsedMs:2});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllEnvs();vi.unstubAllGlobals();vi.useRealTimers();});

describe('extreme is a pinned separate model, never an automatic fallback',()=>{
 it('only extreme uses the separately configured validated origin',()=>{
  vi.stubEnv('VITE_KATAGO_API_ORIGIN','https://base.example');
  for(const d of ['relaxed','standard','challenge'] as const)expect(aiServiceOrigin(d,'https://strong.example','https://site.example')).toBe('https://base.example');
  expect(aiServiceOrigin('extreme','','https://site.example')).toBeNull();
  expect(aiServiceOrigin('extreme','https://strong.example','https://site.example')).toBe('https://strong.example');
  for(const u of ['https://user:password@strong.example','https://strong.example/path','https://strong.example/?x=1','http://127.0.0.1:4211'])expect(aiServiceOrigin('extreme',u,'https://site.example')).toBeNull();
  expect(aiServiceOrigin('extreme','http://127.0.0.1:4211','http://localhost:4212')).toBe('http://127.0.0.1:4211');
 });
 it('rejects a legal move if extreme was answered by the wrong model/version',()=>{
  const g=game(),req=makeAiMoveRequest(g,'W','extreme','test-position');expect(validateAiMoveResponse(reply(req.positionId),req,g).move.type).toBe('place');
  for(const patch of [{model:'g170-b6c96-s175395328-d26788732'},{version:'unexpected'}])expect(()=>validateAiMoveResponse({...reply(req.positionId),engine:{...reply(req.positionId).engine,...patch}},req,g)).toThrow('校验');
 });
 it('round trips the new difficulty without changing old options/history',()=>{
  const m=startAiGame(emptyAiMatch());if(!m.ok)throw Error();
  for(const difficulty of Object.keys(AI_DIFFICULTIES) as (keyof typeof AI_DIFFICULTIES)[]){const options={...DEFAULT_AI_OPTIONS,difficulty};const s=aiSessionJson(m.value,options),r=parseAiSession(s);expect(r.ok).toBe(true);if(r.ok){expect(r.options).toEqual(options);expect(r.match?.game).toEqual(m.value.game);}}
 });
 it('HTTP advertises actual model, rejects mismatched levels before invoking the engine and caps time server-side',async()=>{
  const g=game(),req=makeAiMoveRequest(g,'W','extreme','test-http');
  for(const strong of [false,true]){
   const e=new KataGoEngine({executable:'not-started-unit-fixture',args:[],version:'1.18.1',model:strong?EXTREME_MODEL.name:'base-model-fixture',maxVisits:64,maxQueue:1,timeoutMs:1000,startupTimeoutMs:1000});
   vi.spyOn(e,'health').mockReturnValue({...e.health(),ready:true,status:'ready'});
   const compute=vi.spyOn(e,'analyze').mockImplementation(async p=>({schemaVersion:1,requestId:'test-http-reply',positionId:p.request.positionId,perspective:'B',toPlay:'B',blackWinrate:.6,blackScoreLead:1,visits:16,elapsedMs:2,engine:{name:'KataGo',version:'1.18.1',model:e.options.model,backend:'Eigen CPU',maxVisits:Number(p.query.maxVisits)},candidates:[{order:0,move:{type:'place',at:{row:0,col:0}},visits:16,blackWinrate:.6,blackScoreLead:1,pv:[{type:'place',at:{row:0,col:0}}]}]}));
   const s=createAnalysisServer(e,'https://site.example');await new Promise<void>(r=>s.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${(s.address() as {port:number}).port}`;
   try{
    const health=await(await fetch(url+'/readyz')).json();expect(health.aiDifficulties).toEqual(strong?['extreme']:['relaxed','standard','challenge']);
    const result=await fetch(url+'/api/ai-move',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(req)});
    expect(result.status).toBe(strong?200:409);const data=await result.json();
    if(strong){expect(data.engine.model).toBe(EXTREME_MODEL.name);expect(data.candidates).toBeUndefined();expect(data.blackWinrate).toBeUndefined();expect(compute.mock.calls[0][0].query).toMatchObject({maxVisits:64,overrideSettings:{maxTime:30}});
     const wrong=await fetch(url+'/api/ai-move',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...req,difficulty:'challenge'})});expect(wrong.status).toBe(409);expect(compute).toHaveBeenCalledTimes(1);
    }else{expect(data.error.code).toBe('MODEL_UNAVAILABLE');expect(compute).not.toHaveBeenCalled();}
   }finally{s.closeAllConnections();await new Promise<void>(r=>s.close(()=>r()));}
  }
 });
 it('switching from extreme to standard cancels the old model request and ignores its late result',async()=>{
  vi.useFakeTimers();vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);vi.stubEnv('VITE_KATAGO_API_ORIGIN','https://base.example');vi.stubEnv('VITE_KATAGO_EXTREME_API_ORIGIN','https://strong.example');
  const node=document.createElement('div');document.body.append(node);const root=createRoot(node),g=game(),commit=vi.fn();const waiting:{req:any;signal:AbortSignal;finish:(r:Response)=>void;url:unknown}[]=[];
  vi.stubGlobal('fetch',vi.fn((url,init)=>new Promise<Response>(finish=>waiting.push({req:JSON.parse(init.body),signal:init.signal,finish,url}))));
  function Harness({difficulty}:{difficulty:'standard'|'extreme'}){useAiOpponent(g,{humanColor:'W',difficulty},true,commit);return null;}
  try{
   await act(async()=>root.render(createElement(Harness,{difficulty:'extreme'})));await act(async()=>vi.advanceTimersByTimeAsync(181));expect(waiting[0].url).toBe('https://strong.example/api/ai-move');
   await act(async()=>root.render(createElement(Harness,{difficulty:'standard'})));await act(async()=>vi.advanceTimersByTimeAsync(181));expect(waiting[0].signal.aborted).toBe(true);expect(waiting[1].url).toBe('https://base.example/api/ai-move');
   await act(async()=>waiting[0].finish(new Response(JSON.stringify(reply(waiting[0].req.positionId)))));expect(commit).not.toHaveBeenCalled();
   await act(async()=>waiting[1].finish(new Response(JSON.stringify(reply(waiting[1].req.positionId,'standard')))));expect(commit).toHaveBeenCalledTimes(1);
  }finally{await act(async()=>root.unmount());node.remove();}
 });
 it('finished extreme review rejects a base-model response and keeps the game unchanged',async()=>{
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);let g=game();const ended=rulesEngine.resign(g,'B');if(!ended.ok)throw Error();g=ended.value.nextState;const before=JSON.stringify(g),node=document.createElement('div');document.body.append(node);const root=createRoot(node);let view:ReturnType<typeof useKataGoReview>|undefined;
  vi.stubGlobal('fetch',vi.fn(async(_u,init)=>{const q=JSON.parse(init.body);return new Response(JSON.stringify({schemaVersion:1,positionId:q.positionId,requestId:'test-review',perspective:'B',toPlay:'B',blackWinrate:.6,blackScoreLead:1,visits:1,elapsedMs:1,engine:{name:'KataGo',version:'1.18.1',model:'wrong-small-model',backend:'Eigen CPU',maxVisits:64},candidates:[{order:0,move:{type:'place',at:{row:0,col:0}},visits:1,blackWinrate:.6,blackScoreLead:1,pv:[{type:'place',at:{row:0,col:0}}]}]}));}));
  function Harness(){view=useKataGoReview(g,0,true,'https://strong.example',EXTREME_MODEL.name);return null;}
  try{await act(async()=>root.render(createElement(Harness)));await act(async()=>view!.analyze());expect(view?.phase).toBe('error');expect(view?.result).toBeUndefined();expect(view?.message).toContain('模型');expect(JSON.stringify(g)).toBe(before);}finally{await act(async()=>root.unmount());node.remove();}
 });
});
