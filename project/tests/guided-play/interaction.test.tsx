// @vitest-environment jsdom
import React,{act,StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import {GuidedPlay} from '../../src/features/guided-play/GuidedPlay';
import {useTeachingAnalysis} from '../../src/features/guided-play/useTeachingAnalysis';
import {analyzeTeachingPosition} from '../../src/features/guided-play/analyzer';
import {startGuidedSession} from '../../src/features/guided-play/model';
import {createGuidedPlayStore,GUIDED_SESSION_KEY} from '../../src/features/guided-play/storage';
import {DEFAULT_GUIDED_OPTIONS,FOCUS,type GuidedSession,type PositionAnalyzer,type TeachingAnalysis} from '../../src/features/guided-play/types';
import {playAt} from '../../src/features/full-game/model';
import {rulesEngine} from '../../src/core/rules';
import type {GameState} from '../../src/core/content.generated';
(globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
let root:ReturnType<typeof createRoot>|null=null;
beforeEach(()=>{
  vi.useFakeTimers();localStorage.clear();
  vi.stubGlobal('requestAnimationFrame',(fn:FrameRequestCallback)=>setTimeout(()=>fn(0),16));vi.stubGlobal('cancelAnimationFrame',clearTimeout);
  HTMLElement.prototype.scrollIntoView=vi.fn();
  HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};
});
afterEach(()=>{act(()=>root?.unmount());root=null;document.body.innerHTML='';vi.useRealTimers();vi.unstubAllEnvs();vi.unstubAllGlobals();});
function mount(node:React.ReactNode=<GuidedPlay/>){const host=document.createElement('div');document.body.append(host);root=createRoot(host);act(()=>root!.render(<StrictMode>{node}</StrictMode>));return host;}
const tick=async(n=40)=>{await act(async()=>{await vi.advanceTimersByTimeAsync(n);});};
function button(text:string){const b=[...document.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent===text);if(!b)throw Error(`Missing button ${text}`);return b;}
function click(text:string){act(()=>button(text).click());}
const cell=(row:number,col:number)=>document.querySelector<HTMLButtonElement>(`.guided-board-panel [data-row="${row}"][data-col="${col}"]`)!;
function move(s:GuidedSession,row:number,col:number):GuidedSession{const r=playAt(s.match,{row,col});if(!r.ok)throw Error(JSON.stringify(r));return {...s,match:r.value};}
const gameNode=()=>document.querySelector<HTMLElement>('[data-testid="guided-play"]')!;
function start(){click('开始第一盘辅助对局');click('开始辅助对局');}
describe('real component and controller state transitions',()=>{
  it('first-use → four explicit hint stages → user move → local reply → two passes → report, with no scores during play',async()=>{
    mount();expect(document.querySelectorAll('.guided-onboarding li')).toHaveLength(3);start();await tick();
    expect(gameNode().dataset.moveCount).toBe('0');expect(document.querySelectorAll('[data-marker-kind="candidate"]')).toHaveLength(0);
    click('Hint · 给我一个思考方向');expect(document.querySelector('[data-hint-level]')?.getAttribute('data-hint-level')).toBe('1');expect(document.querySelectorAll('[data-marker-kind="candidate"]')).toHaveLength(0);
    click('再给一点：观察区域');expect(document.querySelectorAll('[data-marker-kind="candidate"]')).toHaveLength(9);
    click('再给一点：候选 A / B / C');expect(document.querySelectorAll('[data-marker-kind="candidate"]')).toHaveLength(3);expect(button('再给一点：候选 A / B / C').disabled).toBe(true);
    expect(document.querySelector('[data-marker-text="试"]')).toBeNull();click('我还需要帮助：显示建议点');expect(document.querySelectorAll('[data-marker-text="试"]')).toHaveLength(1);
    act(()=>cell(2,2).click());expect(gameNode().dataset.moveCount).toBe('1');expect(document.querySelectorAll('[data-marker-kind="candidate"]')).toHaveLength(0);await tick(550);expect(gameNode().dataset.moveCount).toBe('2');expect(gameNode().dataset.turn).toBe('B');
    expect(document.body.textContent).not.toMatch(/黑方胜率|预计领先|胜率损失|Best move/);
    click('停一手');await tick(550);expect(gameNode().dataset.phase).toBe('scoring');click('已人工核对黑方清单');click('已人工核对白方同一清单并结束');await tick();expect(gameNode().dataset.phase).toBe('finished');expect(document.body.textContent).toContain('本局学习报告');expect(document.body.textContent).toContain('主动展开提示 4 次');
    const saved=JSON.parse(localStorage.getItem(GUIDED_SESSION_KEY)!);const count=saved.game.moves.length;await tick(5000);expect(JSON.parse(localStorage.getItem(GUIDED_SESSION_KEY)!).game.moves).toHaveLength(count);
    click('重新尝试这个局面');await tick();expect(gameNode().dataset.phase).toBe('playing');expect(gameNode().dataset.moveCount).toBe('0');expect([...Array(localStorage.length)].map((_,i)=>localStorage.key(i)).some(k=>k?.includes('guided-archive:'))).toBe(true);
    click('返回原局报告，保留当前变化');await tick();expect(gameNode().dataset.phase).toBe('finished');expect(document.body.textContent).toContain('刚才的变化也已单独保存');
  });
  it('level1 asks before legal self-atari, permits the choice, holds reply for feedback, then undo removes old hints',async()=>{
    let s=startGuidedSession({...DEFAULT_GUIDED_OPTIONS,level:1},'GUIDED-prewarn');s=move(move(s,8,8),0,1);createGuidedPlayStore(localStorage).save(s);mount();await tick();
    act(()=>cell(0,0).click());expect(gameNode().dataset.moveCount).toBe('2');expect(document.body.textContent).toContain('棋局还没有改变');click('我还是要下这里');expect(gameNode().dataset.moveCount).toBe('3');expect(document.querySelector('[data-feedback-kind="danger"]')).not.toBeNull();await tick(1000);expect(gameNode().dataset.moveCount).toBe('3');
    click('看看更好的思路');await tick();expect(gameNode().dataset.teachingPhase).toBe('HISTORY');expect(cell(0,0).dataset.stone).toBe('empty');expect(cell(0,0).getAttribute('aria-disabled')).toBe('true');
    click('悔棋并重试');await tick();expect(gameNode().dataset.moveCount).toBe('2');expect(gameNode().dataset.turn).toBe('B');expect(document.querySelector('[data-hint-level]')?.getAttribute('data-hint-level')).toBe('0');expect(document.querySelector('.guided-precheck')).toBeNull();
  });
  it('captures receive a concrete explanation; legal quiet moves do not pause every turn',async()=>{
    let s=startGuidedSession(DEFAULT_GUIDED_OPTIONS,'GUIDED-capture');s=move(move(s,0,1),0,0);createGuidedPlayStore(localStorage).save(s);mount();await tick();act(()=>cell(1,0).click());expect(document.body.textContent).toContain('实际提走了 1 颗棋');expect(gameNode().dataset.teachingPhase).toBe('USER_MOVE_FEEDBACK');await tick(1000);expect(gameNode().dataset.moveCount).toBe('3');click('继续下，让对手回应');await tick(550);expect(gameNode().dataset.moveCount).toBe('4');expect(cell(0,0).dataset.stone).toBe('empty');
  });
  it('one physical click handler cannot apply two moves; route unmount cancels a queued local reply',async()=>{
    mount();start();await tick();act(()=>{cell(2,2).click();cell(2,3).click();});expect(gameNode().dataset.moveCount).toBe('1');act(()=>root?.unmount());root=null;await tick(1000);expect(JSON.parse(localStorage.getItem(GUIDED_SESSION_KEY)!).game.moves).toHaveLength(1);
  });
  it('refresh restores the full path but never resumes an opponent without the user',async()=>{
    let s=startGuidedSession(DEFAULT_GUIDED_OPTIONS,'GUIDED-refresh');s=move(s,2,2);createGuidedPlayStore(localStorage).save(s);mount();await tick(3000);expect(gameNode().dataset.moveCount).toBe('1');expect(document.body.textContent).toContain('对手暂停');click('继续 / 重试对手落子');await tick(550);expect(gameNode().dataset.moveCount).toBe('2');
  });
  it('failed remote reply leaves the game and selected opponent intact, no automatic fallback or retry',async()=>{
    vi.stubEnv('VITE_KATAGO_API_ORIGIN','https://katago.example.com');const fetcher=vi.fn(async()=>new Response(JSON.stringify({error:{code:'BUSY'}}),{status:503}));vi.stubGlobal('fetch',fetcher);
    let s=startGuidedSession({...DEFAULT_GUIDED_OPTIONS,opponent:'katago'},'GUIDED-failed');s=move(s,2,2);createGuidedPlayStore(localStorage).save(s);mount();click('继续 / 重试对手落子');await tick(200);expect(gameNode().dataset.moveCount).toBe('1');expect(document.body.textContent).toContain('AI 服务正在忙');expect(document.body.textContent).toContain('对手暂未落子，可重试');expect(gameNode().dataset.opponent).toBe('katago');await tick(10000);expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('AI captures are explained from the actual transition, not an invented intention',async()=>{
    let s=startGuidedSession(DEFAULT_GUIDED_OPTIONS,'GUIDED-ai-explanation');s=move(move(move(s,0,0),0,1),8,8);createGuidedPlayStore(localStorage).save(s);mount();click('继续 / 重试对手落子');await tick(550);expect(gameNode().dataset.moveCount).toBe('4');expect(document.body.textContent).toContain('对手刚提走 1 颗棋');expect(cell(0,0).dataset.stone).toBe('empty');
  });
  it('late real-client response after undo cannot place a stone on the new path',async()=>{
    vi.stubEnv('VITE_KATAGO_API_ORIGIN','https://katago.example.com');let request:any,resolve!:(r:Response)=>void;
    vi.stubGlobal('fetch',vi.fn((_url,init)=>{request=JSON.parse(init!.body as string);return new Promise<Response>(r=>{resolve=r;});}));
    let s=startGuidedSession({...DEFAULT_GUIDED_OPTIONS,opponent:'katago'},'GUIDED-late');s=move(s,2,2);createGuidedPlayStore(localStorage).save(s);mount();click('继续 / 重试对手落子');await tick(200);click('撤回一手');expect(gameNode().dataset.moveCount).toBe('0');
    await act(async()=>{resolve(new Response(JSON.stringify({schemaVersion:1,positionId:request.positionId,requestId:'unit-late',aiColor:'W',difficulty:'standard',move:{type:'place',at:{row:6,col:6}},visits:24,elapsedMs:10,engine:{name:'KataGo',version:'1.18.1',model:'unit-double',backend:'Eigen CPU',maxVisits:24}}),{status:200}));});await tick(1000);expect(gameNode().dataset.moveCount).toBe('0');expect(cell(6,6).dataset.stone).toBe('empty');
  });
  it('level3 does not pause for a positive capture observation',async()=>{
    let s=startGuidedSession({...DEFAULT_GUIDED_OPTIONS,level:3},'GUIDED-level-three');s=move(move(s,0,1),0,0);createGuidedPlayStore(localStorage).save(s);mount();await tick();act(()=>cell(1,0).click());expect(document.querySelector('[data-feedback-kind="good"]')).toBeNull();await tick(550);expect(gameNode().dataset.moveCount).toBe('4');
  });
  it('a corrupt stored session does not white-screen or overwrite the record on opening',async()=>{
    localStorage.setItem(GUIDED_SESSION_KEY,'{broken');mount();await tick();expect(document.body.textContent).toContain('未通过版本');expect(localStorage.getItem(GUIDED_SESSION_KEY)).toBe('{broken');expect(document.querySelector('.guided-onboarding')).not.toBeNull();
  });
});
describe('replaceable, cancellation-safe analysis seam',()=>{
  let current:ReturnType<typeof useTeachingAnalysis>;
  function Probe({game,provider,enabled=true}:{game:GameState;provider:PositionAnalyzer;enabled?:boolean}){current=useTeachingAnalysis(game,FOCUS.auto,enabled,provider);return <p>{current.phase}:{current.value?.question}</p>;}
  const initial=()=>startGuidedSession(DEFAULT_GUIDED_OPTIONS,'GUIDED-analysis').match.game!;
  it('a late result for an undone/new position cannot overwrite the current result',async()=>{
    const a=initial(),m=rulesEngine.tryMove(a,{type:'place',color:'B',at:{row:2,col:2}});if(!m.ok)throw Error();const b=m.value.nextState;
    const resolve=new Map<GameState,(a:TeachingAnalysis)=>void>();const provider:PositionAnalyzer={analyzePosition:g=>new Promise(r=>resolve.set(g,r))};mount(<Probe game={a} provider={provider}/>);await tick();act(()=>root!.render(<StrictMode><Probe game={b} provider={provider}/></StrictMode>));await tick();
    await act(async()=>{resolve.get(b)!(analyzeTeachingPosition(b,FOCUS.auto));});expect(current!.value?.positionKey).toBe(analyzeTeachingPosition(b,FOCUS.auto).positionKey);
    await act(async()=>{resolve.get(a)!(analyzeTeachingPosition(a,FOCUS.auto));});expect(current!.value?.positionKey).toBe(analyzeTeachingPosition(b,FOCUS.auto).positionKey);
  });
  it('empty/malformed result and provider failure are recoverable; no game mutation',async()=>{
    const g=initial(),text=JSON.stringify(g),provider:PositionAnalyzer={analyzePosition:async()=>null as unknown as TeachingAnalysis};mount(<Probe game={g} provider={provider}/>);await tick();expect(current!.phase).toBe('error');expect(JSON.stringify(g)).toBe(text);
    act(()=>root!.render(<StrictMode><Probe game={g} provider={{analyzePosition:async()=>{throw Error('failed');}}}/></StrictMode>));await tick();expect(current!.phase).toBe('error');expect(current!.message).toContain('棋局没有改变');
  });
  it('a valid empty candidate list stays honest and disabling analysis clears disclosure immediately',async()=>{
    const g=initial(),provider:PositionAnalyzer={analyzePosition:async()=>({...analyzeTeachingPosition(g,FOCUS.auto),candidates:[],recommended:null,region:[]})};mount(<Probe game={g} provider={provider}/>);await tick();expect(current!.phase).toBe('ready');expect(current!.value?.candidates).toEqual([]);
    act(()=>root!.render(<StrictMode><Probe game={g} provider={provider} enabled={false}/></StrictMode>));expect(current!.value).toBeNull();
  });
});
