// @vitest-environment jsdom
import React,{act,StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import type {GameState} from '../../src/core/content.generated';
import {rulesEngine} from '../../src/core/rules';
import {ReviewActions} from '../../src/features/game-review/ReviewActions';
import {useWholeGameReview} from '../../src/features/game-review/useWholeGameReview';
import {openReviewRecord} from '../../src/features/game-review/storage';
import type {ReviewAnalyzer} from '../../src/features/game-review/analysis';

(globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
let root:ReturnType<typeof createRoot>|null=null;
const value=<T,>(r:{ok:true;value:T}|{ok:false;error:unknown}):T=>{if(!r.ok)throw Error(JSON.stringify(r));return r.value;};
function source(){let g=value(rulesEngine.startGame({schemaVersion:1,id:'POS-review-ui',revision:1,rulesetId:'GO-CLUB-AREA-1',kind:'Position',size:9,stones:[],toPlay:'B',historyPolicy:'fresh-setup',history:null},{mode:'full-game',komi:0,gameId:'REVIEW-UI'}));for(const [r,c] of [[8,8],[0,1],[0,0],[1,0]])g=value(rulesEngine.tryMove(g,{type:'place',color:g.toPlay,at:{row:r,col:c}})).nextState;return value(rulesEngine.resign(g,g.toPlay)).nextState;}
beforeEach(()=>{vi.useFakeTimers();localStorage.clear();vi.stubGlobal('requestAnimationFrame',(fn:FrameRequestCallback)=>setTimeout(()=>fn(0),16));vi.stubGlobal('cancelAnimationFrame',clearTimeout);HTMLElement.prototype.scrollIntoView=vi.fn();HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};});
afterEach(()=>{act(()=>root?.unmount());root=null;document.body.innerHTML='';vi.useRealTimers();vi.unstubAllEnvs();vi.unstubAllGlobals();});
function mount(node:React.ReactNode){const host=document.createElement('div');document.body.append(host);root=createRoot(host);act(()=>root!.render(<StrictMode>{node}</StrictMode>));}
const tick=async(n=300)=>{await act(async()=>{await vi.advanceTimersByTimeAsync(n);});};
function button(text:string){const b=[...document.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent===text);if(!b)throw Error('Missing '+text);return b;}
const click=(s:string)=>act(()=>button(s).click());
const node=()=>document.querySelector<HTMLElement>('[data-testid="guided-play"]')!;
describe('reusable original review and branch UI',()=>{
  it('keeps original immutable, begins guided branch at exact index, responds, undoes and returns with cursor',async()=>{
    const g=source(),text=JSON.stringify(g),stop=vi.fn();localStorage.setItem('go-club:full-game:ai:v1','original-sentinel');
    mount(<ReviewActions game={g} index={2} humanColor="B" title="原谱" onOpen={stop}/>);act(()=>{button('从这里继续').click();button('从这里继续').click();});expect(stop).toHaveBeenCalledTimes(1);expect(document.querySelectorAll('dialog.review-workspace')).toHaveLength(1);
    click('辅助下棋继续');await tick(50);expect(node().dataset.moveCount).toBe('2');expect(node().dataset.turn).toBe('B');
    act(()=>document.querySelector<HTMLButtonElement>('.guided-board-panel [data-row="4"][data-col="4"]')!.click());await tick(700);expect(node().dataset.moveCount).toBe('4');
    click('保留分支，返回原局第 2 步');click('回到当前分支');await tick(50);expect(node().dataset.moveCount).toBe('4');
    click('撤回最近回合');await tick(50);expect(node().dataset.moveCount).toBe('2');click('撤回一手');await tick(50);expect(node().dataset.moveCount).toBe('2');
    expect(JSON.stringify(g)).toBe(text);expect(localStorage.getItem('go-club:full-game:ai:v1')).toBe('original-sentinel');click('保留分支，返回原局第 2 步');expect(document.querySelector('.review-content .game-timeline')?.getAttribute('data-history-index')).toBe('2');click('返回原复盘（第 2 步）');expect(document.querySelector('dialog.review-workspace')?.hasAttribute('open')).toBe(false);expect(JSON.stringify(g)).toBe(text);
    click('从这里继续');expect(document.body.textContent).toContain('本局已保存的独立分支（1）');click('恢复这条分支');await tick(50);expect(node().dataset.moveCount).toBe('2');
  });
  it('whole review finds a risk; retry opens the position BEFORE that hand',async()=>{
    mount(<ReviewActions game={source()} index={5} humanColor="B" title="联机原谱" finishedOnly/>);click('AI 复盘');await tick(300);expect(document.body.textContent).toContain('这块棋可被下一手合法提走');const moment=document.querySelector('[data-moment-index="3"]')!;
    act(()=>[...moment.querySelectorAll('button')].find(b=>b.textContent==='重新尝试（回到落子前）')!.click());expect(document.querySelector('.review-content .game-timeline')?.getAttribute('data-history-index')).toBe('2');click('辅助下棋继续');await tick(50);expect(node().dataset.moveCount).toBe('2');expect(document.querySelector<HTMLButtonElement>('.guided-board-panel [data-row="0"][data-col="0"]')?.dataset.stone).toBe('empty');
  });
  it('preserves original human colour; lets AI start, remote error does not change turn or silently fall back',async()=>{
    vi.stubEnv('VITE_KATAGO_API_ORIGIN','https://katago.example.com');const fetcher=vi.fn(async()=>new Response(JSON.stringify({error:{code:'BUSY'}}),{status:503}));vi.stubGlobal('fetch',fetcher);
    const g=source(),text=JSON.stringify(g);mount(<ReviewActions game={g} index={2} humanColor="W" title="AI 原谱"/>);click('从这里继续');click('自由继续');await tick(300);const ai=document.querySelector<HTMLElement>('[data-testid="ai-game"]')!;expect(ai.dataset.turn).toBe('B');expect(ai.dataset.moveCount).toBe('2');expect(fetcher).toHaveBeenCalledTimes(1);expect(document.body.textContent).toContain('正在忙');await tick(5000);expect(fetcher).toHaveBeenCalledTimes(1);click('返回原复盘（第 2 步）');expect(JSON.stringify(g)).toBe(text);
  });
  it('closing cancels a pending AI reply; late result never edits source',async()=>{
    vi.stubEnv('VITE_KATAGO_API_ORIGIN','https://katago.example.com');let requestSignal:AbortSignal|undefined;const fetcher=vi.fn((_u:unknown,init:RequestInit)=>{requestSignal=init.signal as AbortSignal;return new Promise<Response>(()=>{});});vi.stubGlobal('fetch',fetcher);
    const g=source();mount(<ReviewActions game={g} index={2} humanColor="W" title="原谱"/>);click('从这里继续');click('自由继续');await tick(220);expect(requestSignal?.aborted).toBe(false);click('返回原复盘（第 2 步）');expect(requestSignal?.aborted).toBe(true);expect(g.moves).toHaveLength(5);
  });
  it('unfinished online game cannot expose post-game analysis',()=>{const g=source().undoStack[1];const original=source();mount(<ReviewActions game={{...original,...g,undoStack:original.undoStack.slice(0,1),redoStack:[]}} index={1} humanColor="B" title="联机" finishedOnly/>);expect(document.querySelector('.review-launcher')).toBeNull();});
});
describe('whole review cancellation and actual-engine seam',()=>{
  it('failed engine keeps local evidence and does not endlessly retry',async()=>{
    const analyzer:ReviewAnalyzer={analyze:vi.fn(async()=>{throw Error('测试：服务繁忙');})},record=openReviewRecord(localStorage,source(),'B','开发测试',5);
    function Probe(){const s=useWholeGameReview(record,localStorage,'https://katago.example.com',true,analyzer);return <p data-phase={s.phase}>{s.report?.moments.length}:{s.message}</p>;}
    mount(<Probe/>);await tick(300);expect(document.querySelector('[data-phase="error"]')).not.toBeNull();expect(document.body.textContent).toContain('基础复盘与续下仍可使用');await tick(5000);expect(analyzer.analyze).toHaveBeenCalledTimes(1);
  });
});
