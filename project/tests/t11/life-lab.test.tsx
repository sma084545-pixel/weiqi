// @vitest-environment jsdom
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {LifeLab} from '../../src/features/life-lab/LifeLab';

(globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
let root:ReturnType<typeof createRoot>|undefined,host:HTMLDivElement;
const button=(name:string)=>[...host.querySelectorAll('button')].find(item=>item.textContent?.trim()===name)!;
beforeEach(()=>{localStorage.clear();vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()}));host=document.createElement('div');document.body.append(host);root=createRoot(host);act(()=>root!.render(<LifeLab/>));});
afterEach(()=>{if(root)act(()=>root?.unmount());document.body.innerHTML='';localStorage.clear();vi.unstubAllGlobals();});

describe('T11 life lesson UI boundaries',()=>{
  it('starts with a guess, a selectable candidate, turn and target labels',()=>{
    expect(host.textContent).toContain('白方能否合法落在 C3');expect(host.textContent).toContain('当前轮次：白方');expect(host.textContent).toContain('目标：黑方标记棋块');
    expect(button('验证这一步').disabled).toBe(true);
    const legal=host.querySelector<HTMLInputElement>('input[type="radio"]')!;act(()=>legal.click());
    const candidate=host.querySelector<HTMLButtonElement>('[data-row="2"][data-col="2"]')!;act(()=>candidate.click());
    expect(button('验证这一步').disabled).toBe(false);act(()=>button('验证这一步').click());
    expect(host.textContent).toContain('提走 3 子');expect(host.textContent).toContain('只说明 C3 在此局面是假眼');
  });

  it('does not expose a second formal answer and reuses the filtered T10 runner',()=>{
    expect(host.textContent).toContain('不复制答案');expect(host.textContent).not.toContain('solutionChecked');
    act(()=>button('LIFE-003修订 1').click());
    expect(host.textContent).toContain('LIFE-003 · 修订 1');expect(host.textContent).toContain('分层提示');
    expect(host.textContent).not.toContain('黑 B5 接上 B4');
  });

  it('states the finite evidence boundary and seki exception',()=>{
    const text=host.textContent??'';expect(text).toContain('最多白黑白三手');expect(text).toContain('没有两眼不自动等于死亡');expect(text).toContain('双活');expect(text).toContain('人类教师复核仍为空');
  });
});
