// @vitest-environment jsdom
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,expect,it} from 'vitest';
import type {GameState} from '../../src/core/content.generated';
import {GameTimeline,useGameHistory} from '../../src/components/GameTimeline';
import {undo} from '../../src/core/rules';
import {game,place,value} from '../t01/helpers';
(globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
let root:ReturnType<typeof createRoot>,host:HTMLDivElement;
function Harness({state}:{state:GameState}){
  const history=useGameHistory(state);
  return <><GameTimeline max={history.max} value={history.index} onChange={history.goTo} title={history.frame!.title}/><span data-testid="turn">{history.frame?.toPlay}</span></>;
}
const render=(state:GameState)=>act(()=>root.render(<Harness state={state}/>));
const click=(label:string)=>act(()=>[...host.querySelectorAll('button')].find(button=>button.textContent===label)!.click());
const slider=()=>host.querySelector('input')!;
beforeEach(()=>{host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(()=>{act(()=>root.unmount());host.remove();});
it('starts current and supports backward, forward, start and latest without modifying a game',()=>{
  const state=place(place(game(5),0,0),4,4),before=JSON.stringify(state);render(state);
  expect(slider().value).toBe('2');click('回退到上一步');expect(slider().value).toBe('1');
  expect(host.querySelector('[data-testid=turn]')?.textContent).toBe('W');
  click('回到开局');expect(slider().value).toBe('0');click('前进一步');expect(slider().value).toBe('1');
  click('返回当前局面继续');expect(slider().value).toBe('2');expect(JSON.stringify(state)).toBe(before);
});
it('resets the cursor immediately after undo, new branch or loading a different same-revision game',()=>{
  const state=place(place(game(5),0,0),4,4);render(state);click('回到开局');
  const back=value(undo(state));render(back);expect(slider().value).toBe('1');
  render(place(back,3,3));expect(slider().value).toBe('2');
  render(game(9));expect(slider().value).toBe('0');expect(slider().disabled).toBe(true);
});
it('an input event updates before pointer release; label, bounds and value text remain readable',()=>{
  render(place(place(game(5),0,0),4,4));const input=slider();
  act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'1');input.dispatchEvent(new Event('input',{bubbles:true}));});
  expect(input.value).toBe('1');expect(input.min).toBe('0');expect(input.max).toBe('2');
  expect(input.getAttribute('aria-valuetext')).toContain('黑方落子 A5');
  expect(host.querySelector('label')?.htmlFor).toBe(input.id);
});
