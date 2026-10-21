// @vitest-environment jsdom
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {StepPlayer} from '../../src/features/capture-lab/StepPlayer';
import type {CaptureFrame} from '../../src/features/capture-lab/frames';
const board=Array.from({length:5},()=>Array(5).fill(null));
const frames=['place','inspect-opponent','remove','inspect-self'].map((id,index)=>({id,title:String(index),explanation:'',board,markers:[]})) as CaptureFrame[];
let host:HTMLDivElement,root:ReturnType<typeof createRoot>;
beforeEach(()=>{vi.useFakeTimers();host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(()=>{act(()=>root.unmount());document.body.innerHTML='';vi.useRealTimers();});
function render(props:Partial<React.ComponentProps<typeof StepPlayer>>={}){const complete=props.onComplete??vi.fn(),change=props.onStepChange??vi.fn();act(()=>root.render(<StepPlayer frames={frames} step={0} onStepChange={change} playing onPlayingChange={vi.fn()} reducedMotion={false} onComplete={complete} intervalMs={100} {...props}/>));return {complete,change};}
describe('T05 StepPlayer timer control',()=>{
  it('advances once and cancels scheduled work when unmounted',()=>{const {change}=render();act(()=>vi.advanceTimersByTime(100));expect(change).toHaveBeenCalledTimes(1);act(()=>root.unmount());act(()=>vi.runAllTimers());expect(change).toHaveBeenCalledTimes(1);});
  it('does not schedule while paused',()=>{const {change}=render({playing:false});act(()=>vi.runAllTimers());expect(change).not.toHaveBeenCalled();});
  it('jumps to the final frame for reduced motion',()=>{const {change}=render({reducedMotion:true});expect(change).toHaveBeenCalledWith(3);});
  it('completes a final frame once across rerenders',()=>{const complete=vi.fn();act(()=>root.render(<StepPlayer frames={frames} step={3} onStepChange={vi.fn()} playing={false} onPlayingChange={vi.fn()} reducedMotion={false} onComplete={complete}/>));act(()=>root.render(<StepPlayer frames={frames} step={3} onStepChange={vi.fn()} playing={false} onPlayingChange={vi.fn()} reducedMotion={false} onComplete={complete}/>));expect(complete).toHaveBeenCalledTimes(1);});
});

