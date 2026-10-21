// @vitest-environment jsdom
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {CooperativeChallenge} from '../../src/features/cooperative/CooperativeChallenge';

(globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
let root:ReturnType<typeof createRoot>|undefined,host:HTMLDivElement;
const button=(name:string)=>[...host.querySelectorAll('button')].find(item=>item.textContent?.trim()===name)!;
const buttonContaining=(name:string)=>[...host.querySelectorAll('button')].find(item=>item.textContent?.includes(name))!;
const enter=(element:HTMLTextAreaElement,value:string)=>{const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value')?.set;if(!setter)throw new Error('textarea setter missing');act(()=>{setter.call(element,value);element.dispatchEvent(new Event('input',{bubbles:true}));});};
beforeEach(()=>{localStorage.clear();vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()}));vi.stubGlobal('scrollTo',vi.fn());host=document.createElement('div');document.body.append(host);root=createRoot(host);act(()=>root!.render(<CooperativeChallenge/>));});
afterEach(()=>{if(root)act(()=>root?.unmount());document.body.innerHTML='';localStorage.clear();vi.unstubAllGlobals();});

describe('T12 cooperative challenge UI boundaries',()=>{
  it('starts with all five DISC IDs, an honest empty state, and no leaked author reference',()=>{
    for(const id of ['DISC-001','DISC-002','DISC-003','DISC-004','DISC-005'])expect(button(id)).toBeTruthy();
    expect(host.textContent).toContain('还没有保存的讨论记录');expect(host.textContent).toContain('程序只检查有没有填写');expect(host.textContent).not.toContain('E5 立即把两子连通');expect(host.textContent).toContain('不是官方双人围棋');
  });

  it('role swap keeps the controlled fields and changes only the two roles',()=>{
    const goal=host.querySelector<HTMLTextAreaElement>('#coop-goal')!;enter(goal,'先连接目标');
    expect(host.textContent).toContain('伙伴 A提出计划');act(()=>button('交换角色').click());expect(host.textContent).toContain('伙伴 B提出计划');expect(host.querySelector<HTMLTextAreaElement>('#coop-goal')!.value).toBe('先连接目标');
  });

  it('switching activities clears the prior draft and shows the exact local-task ID',()=>{
    act(()=>buttonContaining('救出指定目标棋').click());expect(host.textContent).toContain('CON-003');expect(host.textContent).toContain('不等于整盘好棋');
    act(()=>buttonContaining('接续解释下一手').click());expect(host.textContent).toContain('CON-001');expect(host.textContent).toContain('不证明棋块永远安全');expect(host.querySelector<HTMLTextAreaElement>('#coop-goal')!.value).toBe('');
  });
});
