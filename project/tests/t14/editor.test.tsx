// @vitest-environment jsdom
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,describe,expect,it} from 'vitest';
import {TeacherEditor} from '../../src/features/teacher-editor/TeacherEditor';

(globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
let root:ReturnType<typeof createRoot>|undefined,host:HTMLDivElement;
const render=()=>{host=document.createElement('div');document.body.append(host);root=createRoot(host);act(()=>root!.render(<TeacherEditor/>));};
const click=(label:string)=>{const button=[...host.querySelectorAll('button')].find(item=>item.textContent?.includes(label));if(!button)throw new Error(`missing ${label}`);act(()=>button.click());};
beforeEach(()=>{localStorage.clear();render();});
afterEach(()=>{if(root)act(()=>root?.unmount());root=undefined;document.body.innerHTML='';localStorage.clear();});

describe('T14 teacher editor UI boundaries',()=>{
  it('labels the local workspace and four non-formal templates',()=>{
    expect(host.textContent).toContain('这里不是账号权限区');
    expect(host.querySelectorAll('.template-row button')).toHaveLength(4);
    expect(host.textContent).toContain('TEMPLATE-LIB-001 · 不计入正式题');
  });

  it('uses the actual T10 preview and returns to the same unsaved draft without answer leakage',()=>{
    click('数气模板');
    const title=host.querySelector('input[value="数气模板"]') as HTMLInputElement;expect(title).toBeTruthy();
    act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(title,'我改过的数气草稿');title.dispatchEvent(new Event('input',{bubbles:true}));});
    click('切换到学生预览');
    expect(host.textContent).toContain('这是 T10 真实播放器');
    expect(host.textContent).not.toContain('solutionChecked');expect(host.textContent).not.toContain('humanReviewed');
    click('返回同一草稿继续编辑');
    expect((host.querySelector('input[value="我改过的数气草稿"]') as HTMLInputElement)).toBeTruthy();
  });

  it('opens official content read-only and requires a deliberate copy or revision',()=>{
    const select=host.querySelector('.official-row select') as HTMLSelectElement;
    act(()=>{select.value='LIB-001';select.dispatchEvent(new Event('change',{bubbles:true}));});
    expect(host.textContent).toContain('正式题只读视图');
    expect((host.querySelector('input[required]') as HTMLInputElement).disabled).toBe(true);
    expect(host.textContent).toContain('另存为副本');expect(host.textContent).toContain('明确创建新 revision');
  });
});
