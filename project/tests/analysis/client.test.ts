// @vitest-environment jsdom
import {act,createElement} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import type {GameState} from '../../src/core/content.generated';
import {makeReviewRequest,type ReviewAnalysisRequest,type ReviewAnalysisResponse} from '../../src/core/analysis/contract';
import {createFullGameMatch,startFullGame,playAt,resignGame} from '../../src/features/full-game/model';
import {AnalysisClientError,requestReviewAnalysis,validateAnalysisResponse} from '../../src/features/katago-review/client';
import {analysisOrigin} from '../../src/features/katago-review/config';
import {useKataGoReview} from '../../src/features/katago-review/useKataGoReview';

function finishedGame():GameState {
  const start=startFullGame(createFullGameMatch({size:5,komi:0,kind:'empty',handicapStones:[]}));if(!start.ok)throw Error('fixture start');
  const play=playAt(start.value,{row:2,col:2});if(!play.ok)throw Error('fixture play');
  const end=resignGame(play.value);if(!end.ok||!end.value.game)throw Error('fixture end');return end.value.game;
}
const response=(positionId='test-position',toPlay:'B'|'W'='W'):ReviewAnalysisResponse=>({schemaVersion:1,requestId:'test-request',positionId,perspective:'B',toPlay,
  blackWinrate:.62,blackScoreLead:2.5,visits:8,elapsedMs:1200,engine:{name:'KataGo',version:'test-fixture',model:'TEST-ONLY-NOT-ENGINE',backend:'Eigen CPU',maxVisits:8},
  candidates:[{order:0,move:{type:'place',at:{row:0,col:0}},visits:8,blackWinrate:.61,blackScoreLead:2,pv:[{type:'place',at:{row:0,col:0}},{type:'pass'}]}]});
const fetchStub=(fn:(input:RequestInfo|URL,init?:RequestInit)=>Promise<Response>)=>fn as typeof fetch;

describe('postgame analysis client contract (synthetic responses, not engine accuracy evidence)',()=>{
  afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();vi.useRealTimers();});
  it('accepts only a fixed HTTPS origin or an explicit local-development loopback',()=>{
    expect(analysisOrigin('https://analysis.example/','https://sma084545-pixel.github.io')).toBe('https://analysis.example');
    for(const origin of ['https://user:secret@analysis.example','https://analysis.example/path','https://analysis.example?key=x','http://analysis.example','http://127.0.0.1:4209','*'])expect(analysisOrigin(origin,'https://sma084545-pixel.github.io')).toBeNull();
    expect(analysisOrigin('http://127.0.0.1:4209','http://localhost:4188')).toBe('http://127.0.0.1:4209');
    expect(analysisOrigin('','https://sma084545-pixel.github.io')).toBeNull();
  });
  it('preserves black perspective and rejects stale identity, wrong player and non-finite data',()=>{
    expect(validateAnalysisResponse(response(),'test-position',5,'W').blackWinrate).toBe(.62);
    for(const changed of [{positionId:'old-position'},{perspective:'W'},{toPlay:'B'},{blackWinrate:1.01},{blackScoreLead:Infinity}])expect(()=>validateAnalysisResponse({...response(),...changed},'test-position',5,'W')).toThrow(AnalysisClientError);
    expect(()=>validateAnalysisResponse({...response(),candidates:[{...response().candidates[0],move:{type:'place',at:{row:5,col:0}}}]},'test-position',5,'W')).toThrow();
  });
  it('only serializes setup and effective events after a completed game, with pass kept separate',async()=>{
    const game=finishedGame(),request=makeReviewRequest(game,1,'test-position');
    expect(Object.keys(request.game).sort()).toEqual(['events','komi','setup']);expect('undoStack' in request.game).toBe(false);
    expect(()=>makeReviewRequest({...game,phase:'playing'},1,'x')).toThrow('GAME_NOT_FINISHED');
    expect(()=>makeReviewRequest(game,99,'x')).toThrow('INVALID_REVIEW_INDEX');
    let sent:RequestInit|undefined;
    const value=await requestReviewAnalysis('https://analysis.example',request,'W',new AbortController().signal,fetchStub(async(_url,init)=>{sent=init;return new Response(JSON.stringify(response()));}));
    expect(value.candidates[0].pv[1]).toEqual({type:'pass'});expect(JSON.parse(sent!.body as string)).toEqual(request);expect(sent?.credentials).toBe('omit');
  });
  it('reports initialization, busy and malformed service responses without using remote HTML',async()=>{
    const request=makeReviewRequest(finishedGame(),1,'test-position');
    for(const [code,status] of [['NOT_READY',503],['BUSY',429],['RATE_LIMITED',429]] as const){
      await expect(requestReviewAnalysis('https://analysis.example',request,'W',new AbortController().signal,fetchStub(async()=>new Response(JSON.stringify({error:{code,message:'<script>untrusted</script>'}}),{status})))).rejects.toMatchObject({code});
    }
    await expect(requestReviewAnalysis('https://analysis.example',request,'W',new AbortController().signal,fetchStub(async()=>new Response('<html>starting</html>',{status:502})))).rejects.toMatchObject({code:'NETWORK'});
  });
  it('does not accept a completed response after its caller has cancelled',async()=>{
    const controller=new AbortController(),request=makeReviewRequest(finishedGame(),1,'test-position');
    const task=requestReviewAnalysis('https://analysis.example',request,'W',controller.signal,fetchStub(async()=>{controller.abort();return new Response(JSON.stringify(response()));}));
    await expect(task).rejects.toMatchObject({name:'AbortError'});
  });
  it('bounds waiting time and aborts the outstanding fetch',async()=>{
    vi.useFakeTimers();let observed:AbortSignal|undefined;
    const task=requestReviewAnalysis('https://analysis.example',makeReviewRequest(finishedGame(),1,'test-position'),'W',new AbortController().signal,fetchStub(async(_url,init)=>{
      observed=init?.signal as AbortSignal;
      return new Promise((_resolve,reject)=>observed!.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true}));
    }));
    const caught=task.catch(error=>error);await vi.advanceTimersByTimeAsync(100_001);
    expect(observed?.aborted).toBe(true);expect(await caught).toMatchObject({code:'TIMEOUT'});
  });
});

describe('postgame analysis hook cancellation',()=>{
  let root:Root,node:HTMLDivElement;
  beforeEach(()=>{
    vi.stubEnv('VITE_KATAGO_API_ORIGIN','https://analysis.example');
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);node=document.createElement('div');document.body.append(node);root=createRoot(node);
  });
  afterEach(async()=>{await act(async()=>root.unmount());node.remove();vi.unstubAllEnvs();vi.unstubAllGlobals();});
  it('is manual, prevents repeated clicks, cancels on review jumps, and discards late data',async()=>{
    const game=finishedGame();let view:ReturnType<typeof useKataGoReview>|undefined,finish:((response:Response)=>void)|undefined,signal:AbortSignal|undefined,body:ReviewAnalysisRequest|undefined;
    const fetcher=vi.fn(fetchStub(async(_url,init)=>{signal=init?.signal as AbortSignal;body=JSON.parse(init!.body as string);return new Promise(resolve=>{finish=resolve;});}));vi.stubGlobal('fetch',fetcher);
    function Harness({index}:{index:number}){view=useKataGoReview(game,index,true);return null;}
    await act(async()=>root.render(createElement(Harness,{index:1})));expect(fetcher).not.toHaveBeenCalled();
    await act(async()=>{void view!.analyze();void view!.analyze();});expect(fetcher).toHaveBeenCalledTimes(1);expect(view!.phase).toBe('loading');
    await act(async()=>root.render(createElement(Harness,{index:0})));expect(signal?.aborted).toBe(true);expect(view!.result).toBeUndefined();expect(view!.markers).toEqual([]);
    await act(async()=>finish!(new Response(JSON.stringify(response(body!.positionId,'W')))));expect(view!.result).toBeUndefined();expect(view!.phase).toBe('idle');
  });
  it('hides analysis as soon as undo returns the game to playing',async()=>{
    const game=finishedGame();let view:ReturnType<typeof useKataGoReview>|undefined;
    function Harness({state}:{state:GameState}){view=useKataGoReview(state,1,true);return null;}
    await act(async()=>root.render(createElement(Harness,{state:game})));expect(view!.allowed).toBe(true);
    await act(async()=>root.render(createElement(Harness,{state:{...game,phase:'playing'}})));expect(view!.allowed).toBe(false);expect(view!.markers).toEqual([]);
  });
});
