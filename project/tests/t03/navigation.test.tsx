// @vitest-environment jsdom
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {LearningHubApp} from '../../src/features/learning-hub/LearningHub';
import {moduleRegistry} from '../../src/features/learning-hub/registry';
import {LEARNING_PROGRESS_KEY} from '../../src/features/learning-hub/progress';

(globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
let root:ReturnType<typeof createRoot>|undefined;
let host:HTMLDivElement;

function renderAt(hash:string){
  history.replaceState(null,'',hash);
  host=document.createElement('div');document.body.append(host);root=createRoot(host);
  act(()=>root!.render(<LearningHubApp/>));
}
function go(hash:string){act(()=>{history.replaceState(null,'',hash);window.dispatchEvent(new HashChangeEvent('hashchange'));});}
function text(){return host.textContent??'';}

beforeEach(()=>{localStorage.clear();vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{callback(0);return 1;});vi.stubGlobal('scrollTo',vi.fn());});
afterEach(()=>{if(root)act(()=>root?.unmount());root=undefined;document.body.innerHTML='';localStorage.clear();vi.unstubAllGlobals();});

describe('T03 navigation and recovery',()=>{
  it('starts at the three honest entrances, finds 气, and returns to the route',()=>{
    renderAt('#/home');
    expect(text()).toContain('我第一次接触围棋');expect(text()).toContain('我想找个伙伴玩');expect(text()).toContain('我想尝试一道题');
    expect(host.querySelector('a[href="#/learn/liberties"]')?.textContent).toContain('开始学习');
    expect(host.querySelector('a[href="#/play/free"]')?.textContent).toContain('双人对弈');
    go('#/route/STAGE-01');
    expect(host.querySelector('h1')?.textContent).toContain('从交叉点开始');
    expect(text()).toContain('连接与气');
    expect(host.querySelector('[aria-label*="第1口气"]')).not.toBeNull();
    expect(host.querySelector('a[href="#/learn/liberties"]')?.textContent).toContain('进入气实验室');
    expect([...host.querySelectorAll<HTMLAnchorElement>('a[href="#/route"]')].some(link=>link.textContent?.includes('返回学习路线'))).toBe(true);
    go('#/route');expect(host.querySelector('h1')?.textContent).toBe('十二课学习路线');
  });
  it('lets an experienced member open stage 5 directly without a prerequisite gate',()=>{
    renderAt('#/route/STAGE-05');
    expect(host.querySelector('h1')?.textContent).toContain('眼与基础死活');
    expect(text()).toContain('已有经验');
    expect(host.querySelector('[disabled]')).toBeNull();
  });
  it('renders every published link as a resolvable installed route',()=>{
    renderAt('#/home');
    const routes=[...host.querySelectorAll<HTMLAnchorElement>('a[href^="#/"]')].map(link=>link.getAttribute('href')!);
    expect(routes.length).toBeGreaterThan(8);
    for(const route of routes)expect(moduleRegistry.resolve(route),route).toMatchObject({ok:true});
  });
  it('shows recovery for unknown routes and keeps the old puzzle address usable',()=>{
    renderAt('#/missing');expect(text()).toContain('没有找到这个页面');expect(host.querySelector('a[href="#/route"]')).not.toBeNull();
    go('#/challenge/try-one');expect(text()).toContain('互动挑战题');expect(text()).toContain('30道正式题可用');
  });
  it('records recent location, restores it after remount, and clears progress without content',()=>{
    localStorage.setItem('go-club:v1:DEV-LIB-001','content-stays');
    renderAt('#/route/STAGE-05');
    const saved=JSON.parse(localStorage.getItem(LEARNING_PROGRESS_KEY)!);
    expect(saved.recentModuleId).toBe('stage-05-guide');expect(saved.visitedModuleIds).toContain('stage-05-guide');
    act(()=>root?.unmount());root=undefined;document.body.innerHTML='';
    renderAt('#/home');expect(text()).toContain('继续上次：眼与基础死活');
    const clearButton=[...host.querySelectorAll('button')].find(button=>button.textContent==='清除本机进度')!;
    act(()=>clearButton.click());
    const confirm=[...host.querySelectorAll('button')].find(button=>button.textContent==='确认清除')!;
    act(()=>confirm.click());
    expect(localStorage.getItem(LEARNING_PROGRESS_KEY)).toBeNull();
    expect(localStorage.getItem('go-club:v1:DEV-LIB-001')).toBe('content-stays');
    expect(text()).toContain('打开任一阶段后');
  });
});
