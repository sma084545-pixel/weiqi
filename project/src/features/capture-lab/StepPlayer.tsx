import {useEffect,useRef} from 'react';
export interface StepFrame {id:string;title:string}

export interface StepPlayerProps {
  frames:readonly StepFrame[];
  step:number;
  onStepChange:(step:number)=>void;
  playing:boolean;
  onPlayingChange:(playing:boolean)=>void;
  reducedMotion:boolean;
  onComplete:()=>void;
  intervalMs?:number;
  title?:string;
  description?:string;
  playLabel?:string;
}

export function StepPlayer({frames,step,onStepChange,playing,onPlayingChange,reducedMotion,onComplete,intervalMs=900,title='演示程序：提子的四个步骤',description='暂停和回看只改变显示帧，不会再落一手。',playLabel='播放演示'}:StepPlayerProps){
  const completed=useRef(false);
  const last=frames.length-1;
  useEffect(()=>{completed.current=false;},[frames]);
  useEffect(()=>{
    if(step!==last||completed.current)return;
    completed.current=true;onPlayingChange(false);onComplete();
  },[last,onComplete,onPlayingChange,step]);
  useEffect(()=>{
    if(!playing||step>=last)return;
    if(reducedMotion){onStepChange(last);return;}
    const timer=window.setTimeout(()=>onStepChange(Math.min(last,step+1)),intervalMs);
    return ()=>window.clearTimeout(timer);
  },[intervalMs,last,onStepChange,playing,reducedMotion,step]);
  if(!frames.length)return null;
  return <section className="capture-player" aria-labelledby="capture-player-title">
    <div className="player-heading"><div><h2 id="capture-player-title">{title}</h2><p>{description}</p></div><strong aria-live="polite">第 {step+1} / {frames.length} 步</strong></div>
    <ol className="step-track" style={{gridTemplateColumns:`repeat(${Math.min(frames.length,5)},1fr)`}}>{frames.map((frame,index)=><li key={frame.id} className={index===step?'current':index<step?'done':''} aria-current={index===step?'step':undefined}><span>{index+1}</span><strong>{frame.title}</strong></li>)}</ol>
    <div className="player-controls">
      <button type="button" onClick={()=>onStepChange(Math.max(0,step-1))} disabled={step===0}>上一步</button>
      <button type="button" className="play-button" onClick={()=>onPlayingChange(!playing)} disabled={step===last}>{playing?'暂停播放':playLabel}</button>
      <button type="button" onClick={()=>onStepChange(Math.min(last,step+1))} disabled={step===last}>下一步</button>
      <button type="button" onClick={()=>onStepChange(last)} disabled={step===last}>直接完成</button>
    </div>
  </section>;
}
