// @vitest-environment jsdom
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,describe,expect,it} from 'vitest';
import {AVAILABLE_PUZZLES,inspectPuzzle} from '../../src/features/puzzle-runner/catalog';
import {PuzzleRunner} from '../../src/features/puzzle-runner/PuzzleRunner';

(globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
let root:ReturnType<typeof createRoot>|undefined,host:HTMLDivElement;
const render=(catalog=AVAILABLE_PUZZLES)=>{host=document.createElement('div');document.body.append(host);root=createRoot(host);act(()=>root!.render(<PuzzleRunner catalog={catalog}/>));};
beforeEach(()=>localStorage.clear());
afterEach(()=>{if(root)act(()=>root?.unmount());root=undefined;document.body.innerHTML='';localStorage.clear();});

describe('T10 puzzle runner content boundaries',()=>{
  it('renders a recovery message for an unpublished puzzle instead of crashing',()=>{
    const base=AVAILABLE_PUZZLES[0].puzzle;const item=inspectPuzzle({...base,id:'UNVERIFIED-UI',validation:{...base.validation,solutionChecked:{...base.validation.solutionChecked!,status:'failed'}}})!;render([item]);
    expect(host.textContent).toContain('尚未通过发布检查');expect(host.textContent).toContain('没有符合筛选条件的题目');
  });
  it('does not render the answer, closed hint text, or internal validation fields before submission',()=>{
    render();const card=[...host.querySelectorAll('.puzzle-card')].find(node=>node.textContent?.includes('LIB-001'))!;const button=card.querySelector('button')!;act(()=>button.click());
    const text=host.textContent??'';expect(text).not.toContain('气为 E6 D5 F5 E4');expect(text).not.toContain('沿线找上下左右相邻的空点');expect(text).not.toContain('solutionChecked');expect(text).not.toContain('humanReviewed');
  });
});
