// @vitest-environment jsdom
import {describe,it,expect,vi,beforeEach,afterEach} from 'vitest';
import {act,createElement,StrictMode} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {startAiGame,emptyAiMatch,DEFAULT_AI_OPTIONS} from '../../src/features/ai-game/model';
import {useAiOpponent} from '../../src/features/ai-game/useAiOpponent';
import {makeAiMoveRequest,type AiMoveResponse} from '../../src/core/analysis/ai-contract';
import {requestAiMove,validateAiMoveResponse} from '../../src/features/ai-game/client';

const initial=()=>{const r=startAiGame(emptyAiMatch());if(!r.ok)throw Error();return r.value.game!;};
const response=(id:string):AiMoveResponse=>({schemaVersion:1,positionId:id,requestId:'test-only',aiColor:'B',difficulty:'standard',move:{type:'place',at:{row:2,col:2}},engine:{name:'KataGo',version:'1.18.1',model:'explicit-test-double',backend:'Eigen CPU',maxVisits:24},visits:24,elapsedMs:10});
describe('AI client rejects mismatches, illegal moves and failures',()=>{
  afterEach(()=>vi.useRealTimers());
  it('binds position, colour and difficulty, rechecks legality, accepts separate pass',()=>{
    const g=initial(),req=makeAiMoveRequest(g,'W','standard','position');expect(validateAiMoveResponse(response('position'),req,g).move.type).toBe('place');
    for(const patch of [{positionId:'old'},{aiColor:'W'},{difficulty:'challenge'},{move:{type:'place',at:{row:19,col:0}}},{visits:NaN}])expect(()=>validateAiMoveResponse({...response('position'),...patch},req,g)).toThrow();
    expect(validateAiMoveResponse({...response('position'),move:{type:'pass'}},req,g).move).toEqual({type:'pass'});
  });
  it('handles not-ready, busy, rate limit, unsupported backend and untrusted messages',async()=>{
    const g=initial(),req=makeAiMoveRequest(g,'W','standard','position');
    for(const [code,status] of [['NOT_READY',503],['BUSY',429],['RATE_LIMITED',429]] as const){const task=requestAiMove('https://analysis.example',req,g,new AbortController().signal,async()=>new Response(JSON.stringify({error:{code,message:'<script>fake</script>'}}),{status}));await expect(task).rejects.toMatchObject({code});}
    await expect(requestAiMove('https://analysis.example',req,g,new AbortController().signal,async()=>new Response('',{status:404}))).rejects.toThrow('正在更新');
  });
  it('explicit cancellation discards a response even when network ignores abort',async()=>{
    const g=initial(),controller=new AbortController(),req=makeAiMoveRequest(g,'W','standard','position');
    await expect(requestAiMove('https://analysis.example',req,g,controller.signal,async()=>{controller.abort();return new Response(JSON.stringify(response('position')));})).rejects.toMatchObject({name:'AbortError'});
  });
  it('hard client timeout aborts HTTP rather than starting an automatic retry',async()=>{
    vi.useFakeTimers();let signal:AbortSignal|undefined;const g=initial();const task=requestAiMove('https://analysis.example',makeAiMoveRequest(g,'W','standard','position'),g,new AbortController().signal,async(_url,init)=>{signal=init?.signal as AbortSignal;return new Promise((_r,reject)=>signal!.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError'))));}).catch(e=>e);
    await vi.advanceTimersByTimeAsync(100_001);expect(signal?.aborted).toBe(true);expect(await task).toMatchObject({code:'TIMEOUT'});
  });
});

describe('AI async lifecycle matches current game only',()=>{
  let root:Root,node:HTMLDivElement;
  beforeEach(()=>{vi.useFakeTimers();vi.stubEnv('VITE_KATAGO_API_ORIGIN','https://analysis.example');vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);node=document.createElement('div');document.body.append(node);root=createRoot(node);});
  afterEach(async()=>{await act(async()=>root.unmount());node.remove();vi.useRealTimers();vi.unstubAllGlobals();vi.unstubAllEnvs();});
  it('StrictMode makes one request; disabled/history view cancels and cannot commit late move',async()=>{
    const game=initial(),options={...DEFAULT_AI_OPTIONS,humanColor:'W' as const},commit=vi.fn();let finish:((r:Response)=>void)|undefined,requestId='',signal:AbortSignal|undefined;
    const fetcher=vi.fn(async(_u:unknown,init:RequestInit)=>{requestId=JSON.parse(init.body as string).positionId;signal=init.signal as AbortSignal;return new Promise<Response>(resolve=>{finish=resolve;});});vi.stubGlobal('fetch',fetcher);
    function Harness({enabled}:{enabled:boolean}){useAiOpponent(game,options,enabled,commit);return null;}
    await act(async()=>root.render(createElement(StrictMode,null,createElement(Harness,{enabled:true}))));await act(async()=>vi.advanceTimersByTimeAsync(181));expect(fetcher).toHaveBeenCalledTimes(1);
    await act(async()=>root.render(createElement(StrictMode,null,createElement(Harness,{enabled:false}))));expect(signal?.aborted).toBe(true);
    await act(async()=>finish!(new Response(JSON.stringify(response(requestId)))));expect(commit).not.toHaveBeenCalled();
  });
  it('unmount cancels queued opponent; errors require explicit retry',async()=>{
    const game=initial(),options={...DEFAULT_AI_OPTIONS,humanColor:'W' as const},commit=vi.fn();let view:ReturnType<typeof useAiOpponent>|undefined;
    const fetcher=vi.fn(async()=>new Response(JSON.stringify({error:{code:'BUSY'}}),{status:429}));vi.stubGlobal('fetch',fetcher);
    function Harness(){view=useAiOpponent(game,options,true,commit);return null;}
    await act(async()=>root.render(createElement(Harness)));await act(async()=>vi.advanceTimersByTimeAsync(181));expect(view!.phase).toBe('error');await act(async()=>vi.advanceTimersByTimeAsync(50_000));expect(fetcher).toHaveBeenCalledTimes(1);
    await act(async()=>view!.retry());await act(async()=>vi.advanceTimersByTimeAsync(181));expect(fetcher).toHaveBeenCalledTimes(2);expect(commit).not.toHaveBeenCalled();
  });
});
