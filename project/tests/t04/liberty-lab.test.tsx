// @vitest-environment jsdom
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,describe,expect,it} from 'vitest';
import {LibertyLab} from '../../src/features/liberty-lab/LibertyLab';

(globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
let root:ReturnType<typeof createRoot>|undefined;
let host:HTMLDivElement;

function render(){host=document.createElement('div');document.body.append(host);root=createRoot(host);act(()=>root!.render(<LibertyLab/>));}
const byText=(selector:string,text:string)=>[...host.querySelectorAll<HTMLElement>(selector)].find(element=>element.textContent?.includes(text))!;
const click=(element:Element)=>act(()=>{(element as HTMLElement).click();});
const write=(input:HTMLInputElement,value:string)=>act(()=>{const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!;setter.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));});

beforeEach(render);
afterEach(()=>{if(root)act(()=>root?.unmount());root=undefined;document.body.innerHTML='';});

describe('T04 liberty lab interaction',()=>{
  it('keeps the prediction answer out of visible and accessible output until valid submit',()=>{
    click(byText('label','先猜气数再验证'));
    expect(host.querySelectorAll('[data-marker-kind="liberty"]')).toHaveLength(0);
    expect(host.textContent).not.toContain('核对结果：共有');
    expect(host.textContent).not.toContain('中央单子四周的四个');
    expect([...host.querySelectorAll('[aria-label]')].map(node=>node.getAttribute('aria-label')).join(' ')).not.toContain('核对后的气');
    const input=host.querySelector<HTMLInputElement>('#liberty-prediction')!;write(input,'4');click(byText('button','提交预测并验证'));
    expect(host.querySelectorAll('[data-marker-kind="liberty"]')).toHaveLength(4);
    expect(host.textContent).toContain('核对结果：共有 4 口气');
  });

  it('reports wrong circle selections and hides the revealed hint for retry',()=>{
    click(byText('label','圈出全部气'));
    click(host.querySelector('[data-row="0"][data-col="0"]')!);
    click(byText('button','提交圈选并核对'));
    expect(host.textContent).toContain('漏选：C4');expect(host.textContent).toContain('误选：A5');
    expect(host.querySelectorAll('[data-marker-kind="liberty"]')).toHaveLength(4);
    click(byText('button','隐藏提示后重试'));
    expect(host.querySelectorAll('[data-marker-kind="liberty"]')).toHaveLength(0);
    expect(host.textContent).not.toContain('漏选：C4');
  });

  it('selects a whole connected block, explains empty clicks, and resets on demo change',()=>{
    click(byText('button','04相连两子'));
    expect(host.querySelectorAll('[data-marker-kind="group"]')).toHaveLength(2);
    click(byText('label','自由观察'));click(host.querySelector('[data-row="0"][data-col="0"]')!);
    expect(host.textContent).toContain('A5 是空点');
    click(byText('label','先猜气数再验证'));const input=host.querySelector<HTMLInputElement>('#liberty-prediction')!;write(input,'6');
    click(byText('button','02棋盘边缘'));
    expect(host.querySelector<HTMLInputElement>('#liberty-prediction')?.value).toBe('');
    expect(host.querySelectorAll('[data-marker-kind="liberty"]')).toHaveLength(0);
  });

  it('reveals the physical partner task only after a correct assessed response',()=>{
    expect(host.textContent).not.toContain('和伙伴在实体棋盘继续');
    click(byText('label','先猜气数再验证'));const input=host.querySelector<HTMLInputElement>('#liberty-prediction')!;write(input,'4');click(byText('button','提交预测并验证'));
    expect(host.textContent).toContain('和伙伴在实体棋盘继续');
    expect(host.querySelector('a[href="#/learn/captures"]')).not.toBeNull();
  });
});
