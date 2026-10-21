// @vitest-environment jsdom
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {CaptureLab} from '../../src/features/capture-lab/CaptureLab';
(globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
let host:HTMLDivElement,root:ReturnType<typeof createRoot>;
const byText=(selector:string,text:string)=>[...host.querySelectorAll<HTMLElement>(selector)].find(node=>node.textContent?.includes(text))!;
const click=(element:Element)=>act(()=>{(element as HTMLElement).click();});
beforeEach(()=>{vi.useFakeTimers();host=document.createElement('div');document.body.append(host);root=createRoot(host);act(()=>root.render(<CaptureLab/>));});
afterEach(()=>{act(()=>root.unmount());document.body.innerHTML='';vi.useRealTimers();});
describe('T05 CaptureLab controller',()=>{
  it('selects a legal candidate, requires a prediction, and locks the board during playback',()=>{click(byText('button','使用建议点 D3'));expect(host.textContent).toContain('D3 合法');click(byText('button','验证我的预测并播放'));expect(host.textContent).toContain('请先选择至少一颗目标棋');click(host.querySelector('.prediction-targets input')!);click(byText('button','验证我的预测并播放'));expect(host.querySelector('.capture-workspace')?.textContent).toContain('落子');expect(host.querySelector('[role="gridcell"]')?.getAttribute('aria-disabled')).toBe('true');});
  it('accepts an explicit no-capture prediction and reaches the exact final state',()=>{click(byText('button','04不会提子'));click(byText('button','使用建议点 C2'));click(host.querySelector('.none-choice input')!);click(host.querySelector('.reduce-control input')!);click(byText('button','验证我的预测并播放'));expect(host.textContent).toContain('预测一致');expect(host.textContent).toContain('实际被提（0 颗）无');expect(host.querySelector('.capture-lab-page')?.getAttribute('data-committed')).toBe('true');});
  it('shows suicide reason, keeps the initial board, then accepts capture-first',()=>{click(byText('button','06两种角点'));const before=[...host.querySelectorAll('[data-stone]')].map(node=>node.getAttribute('data-stone')).join('');click(byText('button','先试自杀点 E1'));expect(host.textContent).toContain('提子处理后己方棋块仍无气');expect([...host.querySelectorAll('[data-stone]')].map(node=>node.getAttribute('data-stone')).join('')).toBe(before);click(byText('button','使用建议点 A5'));expect(host.textContent).toContain('A5 合法');});
  it('reset and demo change cancel pending playback callbacks',()=>{click(byText('button','使用建议点 D3'));click(host.querySelector('.prediction-targets input')!);click(byText('button','验证我的预测并播放'));click(byText('button','重置当前演示'));act(()=>vi.runAllTimers());expect(host.querySelector('.capture-player')).toBeNull();expect(host.querySelector('.capture-lab-page')?.getAttribute('data-committed')).toBeNull();});
});
